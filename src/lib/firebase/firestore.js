import {
  collection, doc, setDoc, addDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp,
  updateDoc, deleteDoc, arrayUnion, arrayRemove, limit
} from 'firebase/firestore';
import { db } from './firebase';
import {
  generateAESKey, encryptAESKeyForUser, decryptAESKey,
  encryptMessage, decryptMessage, importPublicKey
} from '../crypto/crypto';
import { getPublicKey } from './auth';
import { getPrivateKey } from '../crypto/crypto';
import { v4 as uuidv4 } from 'uuid';

// ─── Conversations ────────────────────────────────────────────────────────────

export async function createDM(currentUid, otherUid) {
  const q = query(
    collection(db, 'conversations'),
    where('type', '==', 'dm'),
    where('members', 'array-contains', currentUid)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    if (d.data().members.includes(otherUid)) return d.id;
  }

  const aesKey        = await generateAESKey();
  const encryptedKeys = {};
  for (const uid of [currentUid, otherUid]) {
    try {
      const pubB64 = await getPublicKey(uid);
      if (pubB64) {
        const pubKey = await importPublicKey(pubB64);
        encryptedKeys[uid] = await encryptAESKeyForUser(aesKey, pubKey);
      }
    } catch {}
  }

  const ref = doc(collection(db, 'conversations'));
  await setDoc(ref, {
    type: 'dm', members: [currentUid, otherUid], encryptedKeys,
    createdAt: serverTimestamp(), lastMessage: null,
    lastActivity: serverTimestamp(), messageExpiry: null,
  });
  return ref.id;
}

export async function createGroup(currentUid, name, memberUids) {
  const allMembers    = [currentUid, ...memberUids];
  const aesKey        = await generateAESKey();
  const encryptedKeys = {};

  for (const uid of allMembers) {
    try {
      const pubB64 = await getPublicKey(uid);
      if (pubB64) {
        const pubKey = await importPublicKey(pubB64);
        encryptedKeys[uid] = await encryptAESKeyForUser(aesKey, pubKey);
      }
    } catch(err) { console.warn('Key encrypt failed for', uid); }
  }

  const ref = doc(collection(db, 'conversations'));
  await setDoc(ref, {
    type: 'group', name, icon: null,
    members: allMembers, ownerId: currentUid, encryptedKeys,
    createdAt: serverTimestamp(), lastMessage: null,
    lastActivity: serverTimestamp(), messageExpiry: null,
    channels: [
      { id: uuidv4(), name: 'general', type: 'text' },
      { id: uuidv4(), name: 'General', type: 'voice' },
    ],
  });
  return ref.id;
}

export async function addMemberToGroup(convId, newUid, currentUid) {
  const convRef  = doc(db, 'conversations', convId);
  const convSnap = await getDoc(convRef);
  const conv     = convSnap.data();
  try {
    const privKey   = await getPrivateKey(currentUid);
    const aesKey    = await decryptAESKey(conv.encryptedKeys[currentUid], privKey);
    const newPubB64 = await getPublicKey(newUid);
    const newPubKey = await importPublicKey(newPubB64);
    const newEncKey = await encryptAESKeyForUser(aesKey, newPubKey);
    await updateDoc(convRef, { members: arrayUnion(newUid), [`encryptedKeys.${newUid}`]: newEncKey });
  } catch {
    await updateDoc(convRef, { members: arrayUnion(newUid) });
  }
}

export function listenConversations(uid, callback) {
  const q = query(
    collection(db, 'conversations'),
    where('members', 'array-contains', uid),
    orderBy('lastActivity', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function setMessageExpiry(convId, expiry, uid, ownerId) {
  const conv = await getDoc(doc(db, 'conversations', convId));
  const data = conv.data();
  if (data.type === 'group' && uid !== ownerId) return;
  await updateDoc(doc(db, 'conversations', convId), { messageExpiry: expiry });
}

// ─── Messages ─────────────────────────────────────────────────────────────────
// For group channels: effectiveId = groupId_channelId
// We store messages in a top-level 'channelMessages' collection for channels
// and in conversations/{convId}/messages for DMs

export async function sendMessage(effectiveId, senderId, content, type = 'text', meta = {}) {
  // Determine if this is a channel message (contains underscore pattern groupId_channelId)
  const isChannel = effectiveId.includes('_');
  const baseConvId = isChannel ? effectiveId.split('_')[0] : effectiveId;

  // Get encryption key from the base conversation
  let encrypted = null;
  try {
    const convRef  = doc(db, 'conversations', baseConvId);
    const convSnap = await getDoc(convRef);
    const conv     = convSnap.data();
    const privKey  = await getPrivateKey(senderId);
    const encKey   = conv?.encryptedKeys?.[senderId];
    if (privKey && encKey) {
      const aesKey = await decryptAESKey(encKey, privKey);
      if (type === 'text') {
        encrypted = await encryptMessage(content, aesKey);
      } else {
        encrypted = await encryptMessage(JSON.stringify({ url: content, ...meta }), aesKey);
      }
    }
  } catch(err) {
    console.warn('Encryption failed:', err);
  }

  // Get expiry from base conversation
  let expiresAt = null;
  try {
    const convSnap = await getDoc(doc(db, 'conversations', baseConvId));
    const expiry   = convSnap.data()?.messageExpiry;
    if (expiry) expiresAt = computeExpiry(expiry);
  } catch {}

  const msgData = {
    senderId, type,
    iv:         encrypted?.iv         || null,
    ciphertext: encrypted?.ciphertext || null,
    plaintext:  encrypted ? null : content,
    timestamp:  serverTimestamp(),
    readBy:     [senderId],
    expiresAt,
    deleted:    false,
    reactions:  {},
    replyTo:    meta.replyTo || null,
  };

  // Store in appropriate collection
  if (isChannel) {
    await addDoc(collection(db, 'channelMessages', effectiveId, 'messages'), msgData);
  } else {
    await addDoc(collection(db, 'conversations', effectiveId, 'messages'), msgData);
    await updateDoc(doc(db, 'conversations', effectiveId), {
      lastMessage:  type === 'text' ? '🔒 Encrypted message' : `📎 ${type}`,
      lastActivity: serverTimestamp(),
    });
  }
}

export function listenMessages(effectiveId, uid, callback) {
  const isChannel  = effectiveId.includes('_');
  const baseConvId = isChannel ? effectiveId.split('_')[0] : effectiveId;

  const msgCollection = isChannel
    ? collection(db, 'channelMessages', effectiveId, 'messages')
    : collection(db, 'conversations', effectiveId, 'messages');

  const q = query(msgCollection, orderBy('timestamp', 'asc'), limit(100));

  return onSnapshot(q, async snap => {
    // Get AES key from base conversation
   let aesKey = null;
    try {
      const privKey  = await getPrivateKey(uid);
      const convSnap = await getDoc(doc(db, 'conversations', baseConvId));
      const convData = convSnap.data();
      const encKey   = convData?.encryptedKeys?.[uid];
      if (privKey && encKey) {
        try {
          aesKey = await decryptAESKey(encKey, privKey);
        } catch {
          console.warn('AES key mismatch — attempting auto-repair...');
          try {
            const members = convData?.members || [];
            const otherMembers = members.filter(m => m !== uid);
            for (const memberId of otherMembers) {
              const memberEncKey  = convData?.encryptedKeys?.[memberId];
              const memberPrivKey = await getPrivateKey(memberId).catch(() => null);
              if (memberPrivKey && memberEncKey) {
                const recoveredAesKey = await decryptAESKey(memberEncKey, memberPrivKey);
                const myPubKeySnap    = await getDoc(doc(db, 'publicKeys', uid));
                if (myPubKeySnap.exists()) {
                  const myPubKey  = myPubKeySnap.data().key;
                  const newEncKey = await encryptAESKeyForUser(recoveredAesKey, myPubKey);
                  await updateDoc(doc(db, 'conversations', baseConvId), {
                    [`encryptedKeys.${uid}`]: newEncKey
                  });
                  aesKey = recoveredAesKey;
                  console.log('Auto-repair successful!');
                }
                break;
              }
            }
          } catch(repairErr) {
            console.warn('Auto-repair failed:', repairErr);
          }
        }
      }
    } catch(err) {
      console.warn('Could not load AES key:', err);
    }

    const messages = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (data.deleted) { messages.push({ id: d.id, ...data, content: null }); continue; }

      if (data.iv && data.ciphertext && aesKey) {
        try {
          const content = await decryptMessage({ iv: data.iv, ciphertext: data.ciphertext }, aesKey);
          messages.push({ id: d.id, ...data, content });
        } catch {
          messages.push({ id: d.id, ...data, content: data.plaintext || '[decryption failed]' });
        }
      } else {
        messages.push({ id: d.id, ...data, content: data.plaintext || data.content || '' });
      }
    }
    callback(messages);

    // Mark as read
    for (const d of snap.docs) {
      const data = d.data();
      if (!data.readBy?.includes(uid)) {
        try {
          await updateDoc(d.ref, { readBy: arrayUnion(uid) });
          if (!isChannel) {
            const convSnap = await getDoc(doc(db, 'conversations', effectiveId));
            if (convSnap.data()?.messageExpiry === 'after_view') await deleteDoc(d.ref);
          }
        } catch {}
      }
    }
  });
}

export async function deleteMessage(effectiveId, msgId) {
  const isChannel = effectiveId.includes('_');
  const msgRef = isChannel
    ? doc(db, 'channelMessages', effectiveId, 'messages', msgId)
    : doc(db, 'conversations', effectiveId, 'messages', msgId);
  await updateDoc(msgRef, { deleted: true, ciphertext: '', iv: '', plaintext: '' });
}

export async function addReaction(effectiveId, msgId, uid, emoji) {
  const isChannel = effectiveId.includes('_');
  const msgRef = isChannel
    ? doc(db, 'channelMessages', effectiveId, 'messages', msgId)
    : doc(db, 'conversations', effectiveId, 'messages', msgId);
  await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(uid) });
}

function computeExpiry(expiry) {
  const now = Date.now();
  const map = { '1min': 60000, '10min': 600000, '1hr': 3600000, '1day': 86400000 };
  if (map[expiry]) return new Date(now + map[expiry]);
  if (typeof expiry === 'number') return new Date(now + expiry);
  return null;
}

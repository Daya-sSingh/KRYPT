import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { ChatMessage, ExpiryPolicy, MessageType } from '../types';
import { decryptText, encryptText } from '../crypto/aes';
import { getChannelAesKey } from '../crypto/channelKeys';
import { getMemberPublicKeys } from './users';

interface MessagePayload {
  text?: string;
  gifUrl?: string;
  fileName?: string;
  fileUrl?: string;
  mime?: string;
}

function expiryMs(policy: ExpiryPolicy): number | null {
  const map: Record<ExpiryPolicy, number | null> = {
    never: null,
    view: null,
    '1m': 60_000,
    '10m': 600_000,
    '1h': 3_600_000,
    '1d': 86_400_000,
  };
  return map[policy];
}

export async function sendEncryptedMessage(
  serverId: string,
  channelId: string,
  senderId: string,
  memberIds: string[],
  type: MessageType,
  payload: MessagePayload,
  expiry: ExpiryPolicy,
) {
  const publicKeys = await getMemberPublicKeys(memberIds);
  const aesKey = await getChannelAesKey(serverId, channelId, publicKeys, senderId);
  const body = JSON.stringify({ type, ...payload });
  const ciphertext = await encryptText(aesKey, body);

  const ms = expiryMs(expiry);
  const expiresAt = ms ? Date.now() + ms : null;

  await addDoc(collection(db, 'servers', serverId, 'channels', channelId, 'messages'), {
    ciphertext,
    senderId,
    type,
    createdAt: Date.now(),
    expiresAt,
    readBy: [senderId],
  });
}

export function subscribeMessages(
  serverId: string,
  channelId: string,
  myUid: string,
  memberIds: string[],
  expiry: ExpiryPolicy,
  cb: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'servers', serverId, 'channels', channelId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  let aesKey: CryptoKey | null = null;

  return onSnapshot(q, async (snap) => {
    if (!aesKey) {
      const publicKeys = await getMemberPublicKeys(memberIds);
      aesKey = await getChannelAesKey(serverId, channelId, publicKeys, myUid);
    }

    const messages: ChatMessage[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      if (data.expiresAt && data.expiresAt < Date.now()) {
        deleteDoc(d.ref).catch(() => {});
        continue;
      }

      try {
        const plain = await decryptText(aesKey!, data.ciphertext as string);
        const parsed = JSON.parse(plain) as MessagePayload & { type: MessageType };
        messages.push({
          id: d.id,
          senderId: data.senderId,
          type: parsed.type ?? data.type,
          plaintext: parsed.text ?? '',
          gifUrl: parsed.gifUrl,
          fileName: parsed.fileName,
          fileUrl: parsed.fileUrl,
          mime: parsed.mime,
          createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? Date.now(),
        });

        if (expiry === 'view' && !data.readBy?.includes(myUid) && data.senderId !== myUid) {
          await updateDoc(d.ref, { readBy: [...(data.readBy ?? []), myUid] });
          await deleteDoc(d.ref);
        }
      } catch {
        messages.push({
          id: d.id,
          senderId: data.senderId,
          type: 'text',
          plaintext: '[Unable to decrypt]',
          createdAt: Date.now(),
        });
      }
    }

    cb(messages);
  });
}

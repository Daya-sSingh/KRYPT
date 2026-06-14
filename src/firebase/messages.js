import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, deleteDoc, doc,
  updateDoc, where, getDocs, limit, startAfter
} from 'firebase/firestore'
import { db } from './config'
import { encryptMessage, decryptMessage } from '../crypto/keys'
import { getSessionKey } from '../crypto/session'

const PAGE_SIZE = 50

// Send an encrypted message
export async function sendMessage({ conversationId, text, senderId, members, type = 'text', fileData = null, gifUrl = null }) {
  let messageData = {
    senderId,
    type,
    timestamp: serverTimestamp(),
    read: false,
    reactions: {}
  }

  if (type === 'text' && text) {
    const sessionKey = await getSessionKey(conversationId, senderId, members)
    const { ciphertext, iv } = await encryptMessage(text, sessionKey)
    messageData.ciphertext = ciphertext
    messageData.iv = iv
  } else if (type === 'gif') {
    messageData.gifUrl = gifUrl
  } else if (type === 'file' || type === 'image') {
    messageData.fileData = fileData // { url, name, size, mimeType, iv }
  }

  await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData)
}

// Subscribe to messages (real-time, decrypted)
export function subscribeToMessages(conversationId, currentUid, members, callback) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(PAGE_SIZE)
  )

  return onSnapshot(q, async (snap) => {
    const sessionKey = await getSessionKey(conversationId, currentUid, members).catch(() => null)
    const messages = await Promise.all(snap.docs.map(async d => {
      const data = d.data()
      let text = ''
      if (data.type === 'text' && data.ciphertext && sessionKey) {
        try {
          text = await decryptMessage(data.ciphertext, data.iv, sessionKey)
        } catch {
          text = '[Decryption failed]'
        }
      }
      return { id: d.id, ...data, text }
    }))
    callback(messages)
    // Check expiry
    checkExpiry(snap.docs, conversationId)
  })
}

// Check and delete expired messages
async function checkExpiry(docs, conversationId) {
  const now = Date.now()
  for (const d of docs) {
    const data = d.data()
    if (data.expiresAt && data.expiresAt.toMillis() < now) {
      await deleteDoc(doc(db, 'conversations', conversationId, 'messages', d.id))
    }
  }
}

// Mark message as read (triggers expiry for "after viewing")
export async function markAsRead(conversationId, messageId, expiryMs) {
  const ref = doc(db, 'conversations', conversationId, 'messages', messageId)
  const update = { read: true }
  if (expiryMs === 'view') {
    await deleteDoc(ref)
    return
  }
  if (expiryMs) {
    update.expiresAt = new Date(Date.now() + expiryMs)
  }
  await updateDoc(ref, update)
}

// Delete a message
export async function deleteMessage(conversationId, messageId) {
  await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId))
}

// Add reaction
export async function addReaction(conversationId, messageId, emoji, uid) {
  const ref = doc(db, 'conversations', conversationId, 'messages', messageId)
  await updateDoc(ref, { [`reactions.${emoji}.${uid}`]: true })
}

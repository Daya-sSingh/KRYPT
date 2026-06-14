import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getPrivateKey } from '../firebase/auth'
import {
  generateSessionKey,
  encryptSessionKey,
  decryptSessionKey,
  importPublicKey
} from './keys'

// In-memory cache of decrypted session keys
const sessionKeyCache = new Map()

// Get or create session key for a conversation
export async function getSessionKey(conversationId, currentUid, memberUids) {
  if (sessionKeyCache.has(conversationId)) {
    return sessionKeyCache.get(conversationId)
  }

  const convRef = doc(db, 'conversations', conversationId)
  const convSnap = await getDoc(convRef)

  const privateKey = await getPrivateKey(currentUid)
  if (!privateKey) throw new Error('No private key found for user')

  if (convSnap.exists() && convSnap.data().encryptedKeys?.[currentUid]) {
    // Decrypt existing session key
    const encryptedKey = convSnap.data().encryptedKeys[currentUid]
    const sessionKey = await decryptSessionKey(encryptedKey, privateKey)
    sessionKeyCache.set(conversationId, sessionKey)
    return sessionKey
  }

  // Generate new session key and encrypt for all members
  const sessionKey = await generateSessionKey()
  const encryptedKeys = {}

  for (const uid of memberUids) {
    const userSnap = await getDoc(doc(db, 'users', uid))
    if (!userSnap.exists()) continue
    const publicKey = await importPublicKey(userSnap.data().publicKey)
    encryptedKeys[uid] = await encryptSessionKey(sessionKey, publicKey)
  }

  await setDoc(convRef, { encryptedKeys }, { merge: true })
  sessionKeyCache.set(conversationId, sessionKey)
  return sessionKey
}

// Add a new member to an existing conversation (re-encrypt session key for them)
export async function addMemberToConversation(conversationId, newUid, currentUid) {
  const sessionKey = await getSessionKey(conversationId, currentUid, [currentUid])

  const userSnap = await getDoc(doc(db, 'users', newUid))
  if (!userSnap.exists()) throw new Error('User not found')

  const publicKey = await importPublicKey(userSnap.data().publicKey)
  const encryptedKey = await encryptSessionKey(sessionKey, publicKey)

  const convRef = doc(db, 'conversations', conversationId)
  await updateDoc(convRef, {
    [`encryptedKeys.${newUid}`]: encryptedKey,
    members: [...(await getDoc(convRef)).data().members, newUid]
  })
}

export function clearSessionKeyCache() {
  sessionKeyCache.clear()
}

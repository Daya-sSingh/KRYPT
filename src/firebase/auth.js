import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'
import { generateKeyPair, exportPublicKey } from '../crypto/keys'

const ACTION_CODE_SETTINGS = {
  url: window.location.origin + '/auth/callback',
  handleCodeInApp: true
}

// Create user profile in Firestore + generate E2E keys
async function createUserProfile(user, displayName) {
  const { publicKey, privateKey } = await generateKeyPair()
  const exportedPublicKey = await exportPublicKey(publicKey)

  // Store private key in IndexedDB (never leaves device)
  await storePrivateKey(user.uid, privateKey)

  // Store public key + profile in Firestore (no sensitive data)
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    displayName: displayName || user.displayName || user.email.split('@')[0],
    email: user.email,
    photoURL: user.photoURL || null,
    publicKey: exportedPublicKey,
    createdAt: serverTimestamp(),
    status: 'online',
    settings: {
      theme: { primary: '#39ff6a', background: '#0a0a0a' },
      notifications: true,
      messageExpiry: null,
      inputVolume: 100,
      outputVolume: 100,
      micEnabled: true,
      headphonesEnabled: true
    }
  }, { merge: true })
}

// Store private key in IndexedDB
async function storePrivateKey(uid, privateKey) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('krypt-keys', 1)
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('keys')
    }
    request.onsuccess = (e) => {
      const db = e.target.result
      const tx = db.transaction('keys', 'readwrite')
      tx.objectStore('keys').put(privateKey, uid)
      tx.oncomplete = resolve
      tx.onerror = reject
    }
    request.onerror = reject
  })
}

// Get private key from IndexedDB
export async function getPrivateKey(uid) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('krypt-keys', 1)
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('keys')
    }
    request.onsuccess = (e) => {
      const db = e.target.result
      const tx = db.transaction('keys', 'readonly')
      const req = tx.objectStore('keys').get(uid)
      req.onsuccess = () => resolve(req.result)
      req.onerror = reject
    }
    request.onerror = reject
  })
}

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await createUserProfile(cred.user, displayName)
  return cred.user
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserProfile(cred.user)
  return cred.user
}

export async function sendPasswordlessLink(email) {
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS)
  localStorage.setItem('krypt-email', email)
}

export async function completePasswordlessLogin() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return null
  const email = localStorage.getItem('krypt-email') || window.prompt('Please enter your email')
  const cred = await signInWithEmailLink(auth, email, window.location.href)
  localStorage.removeItem('krypt-email')
  await ensureUserProfile(cred.user)
  return cred.user
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  await ensureUserProfile(cred.user)
  return cred.user
}

async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await createUserProfile(user, user.displayName)
  }
}

export async function logout() {
  await signOut(auth)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

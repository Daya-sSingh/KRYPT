// Web Crypto API - E2E encryption layer
// RSA-OAEP for key exchange, AES-GCM for message encryption

// Generate RSA key pair for a user (called once on registration)
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  )
  return keyPair
}

// Export public key to store in Firestore
export async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey('spki', publicKey)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

// Import a public key from Firestore (base64 string)
export async function importPublicKey(base64Key) {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'spki',
    binary,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
}

// Import private key from IndexedDB (CryptoKey object, already usable)
export async function importPrivateKey(privateKey) {
  // Private key is stored as CryptoKey in IndexedDB directly
  return privateKey
}

// Generate AES session key for a conversation
export async function generateSessionKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypt AES session key with a user's RSA public key
export async function encryptSessionKey(sessionKey, publicKey) {
  const exported = await crypto.subtle.exportKey('raw', sessionKey)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    exported
  )
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

// Decrypt AES session key with user's RSA private key
export async function decryptSessionKey(encryptedKey, privateKey) {
  const binary = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    binary
  )
  return crypto.subtle.importKey(
    'raw',
    decrypted,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt a message string with AES session key
export async function encryptMessage(plaintext, sessionKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    encoded
  )
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  }
}

// Decrypt a message with AES session key
export async function decryptMessage(ciphertext, iv, sessionKey) {
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sessionKey,
    ciphertextBytes
  )
  return new TextDecoder().decode(decrypted)
}

// Encrypt a file (ArrayBuffer) with AES session key
export async function encryptFile(arrayBuffer, sessionKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    arrayBuffer
  )
  return {
    encryptedBuffer: ciphertext,
    iv: btoa(String.fromCharCode(...iv))
  }
}

// Decrypt a file buffer with AES session key
export async function decryptFile(encryptedBuffer, iv, sessionKey) {
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sessionKey,
    encryptedBuffer
  )
}

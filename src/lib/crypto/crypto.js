/**
 * Krypt — E2E Encryption Layer
 * Uses Web Crypto API (built into all modern browsers)
 * RSA-OAEP for key exchange, AES-GCM for message encryption
 * Private keys NEVER leave the device — stored in IndexedDB
 */

import { openDB } from 'idb';

const DB_NAME  = 'krypt-keys';
const DB_STORE = 'privateKeys';
const DB_VER   = 1;

// ─── IndexedDB for private key storage ───────────────────────────────────────

async function getKeyDB() {
  return openDB(DB_NAME, DB_VER, {
    upgrade(db) {
      db.createObjectStore(DB_STORE);
    },
  });
}

async function storePrivateKey(userId, privateKey) {
  const db  = await getKeyDB();
  const exp = await crypto.subtle.exportKey('pkcs8', privateKey);
  await db.put(DB_STORE, exp, userId);
}

async function loadPrivateKey(userId) {
  const db   = await getKeyDB();
  const pkcs8 = await db.get(DB_STORE, userId);
  if (!pkcs8) return null;
  return crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

// ─── RSA Key Pair Generation ──────────────────────────────────────────────────

export async function generateKeyPair() {
  return crypto.subtle.generateKey(
    {
      name:           'RSA-OAEP',
      modulusLength:  2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash:           'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportPublicKey(publicKey) {
  const spki   = await crypto.subtle.exportKey('spki', publicKey);
  const bytes  = new Uint8Array(spki);
  return btoa(String.fromCharCode(...bytes));
}

export async function importPublicKey(base64) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    'spki', bytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

// ─── AES Session Key ──────────────────────────────────────────────────────────

export async function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAESKeyForUser(aesKey, recipientPublicKey) {
  const raw       = await crypto.subtle.exportKey('raw', aesKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    raw
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export async function decryptAESKey(encryptedBase64, privateKey) {
  const binary    = atob(encryptedBase64);
  const bytes     = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const raw       = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    bytes.buffer
  );
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Message Encryption ───────────────────────────────────────────────────────

export async function encryptMessage(plaintext, aesKey) {
  const iv      = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoded
  );
  return {
    iv:         btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipher))),
  };
}

export async function decryptMessage({ iv: ivBase64, ciphertext }, aesKey) {
  const ivBin  = atob(ivBase64);
  const iv     = new Uint8Array(ivBin.length);
  for (let i = 0; i < ivBin.length; i++) iv[i] = ivBin.charCodeAt(i);

  const ctBin  = atob(ciphertext);
  const ct     = new Uint8Array(ctBin.length);
  for (let i = 0; i < ctBin.length; i++) ct[i] = ctBin.charCodeAt(i);

  const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  return new TextDecoder().decode(plain);
}

// ─── File Encryption ──────────────────────────────────────────────────────────

export async function encryptFile(arrayBuffer, aesKey) {
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    arrayBuffer
  );
  return { iv, ciphertext: cipher };
}

export async function decryptFile({ iv, ciphertext }, aesKey) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
}

// ─── Key Initialization ───────────────────────────────────────────────────────

/**
 * Called on first login.
 * Generates RSA key pair, stores private key in IndexedDB,
 * returns public key (base64) to store in Firestore.
 */
export async function initUserKeys(userId) {
  const existing = await loadPrivateKey(userId);
  if (existing) return null; // already initialized

  const { publicKey, privateKey } = await generateKeyPair();
  await storePrivateKey(userId, privateKey);
  return exportPublicKey(publicKey);
}

/**
 * Get this user's private key from IndexedDB
 */
export async function getPrivateKey(userId) {
  return loadPrivateKey(userId);
}

/**
 * Check if user has keys initialized
 */
export async function hasKeys(userId) {
  const key = await loadPrivateKey(userId);
  return key !== null;
}


async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function exportEncryptedPrivateKey(userId, password) {
  const db    = await getKeyDB();
  const pkcs8 = await db.get(DB_STORE, userId);
  if (!pkcs8) throw new Error('No private key found on this device');
  const salt      = crypto.getRandomValues(new Uint8Array(16));
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const aesKey    = await deriveKeyFromPassword(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, pkcs8);
  const out = new Uint8Array(16 + 12 + encrypted.byteLength);
  out.set(salt, 0);
  out.set(iv, 16);
  out.set(new Uint8Array(encrypted), 28);
  return btoa(String.fromCharCode(...out));
}

export async function importEncryptedPrivateKey(userId, password, base64Blob) {
  const raw  = Uint8Array.from(atob(base64Blob), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv   = raw.slice(16, 28);
  const ct   = raw.slice(28);
  const aesKey = await deriveKeyFromPassword(password, salt);
  let pkcs8;
  try {
    pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  } catch {
    throw new Error('Wrong password');
  }
  await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['decrypt']
  );
  const db = await getKeyDB();
  await db.put(DB_STORE, pkcs8, userId);
}


async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function exportEncryptedPrivateKey(userId, password) {
  const db    = await getKeyDB();
  const pkcs8 = await db.get(DB_STORE, userId);
  if (!pkcs8) throw new Error('No private key found on this device');
  const salt      = crypto.getRandomValues(new Uint8Array(16));
  const iv        = crypto.getRandomValues(new Uint8Array(12));
  const aesKey    = await deriveKeyFromPassword(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, pkcs8);
  const out = new Uint8Array(16 + 12 + encrypted.byteLength);
  out.set(salt, 0);
  out.set(iv, 16);
  out.set(new Uint8Array(encrypted), 28);
  return btoa(String.fromCharCode(...out));
}

export async function importEncryptedPrivateKey(userId, password, base64Blob) {
  const raw  = Uint8Array.from(atob(base64Blob), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv   = raw.slice(16, 28);
  const ct   = raw.slice(28);
  const aesKey = await deriveKeyFromPassword(password, salt);
  let pkcs8;
  try {
    pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  } catch {
    throw new Error('Wrong password');
  }
  await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['decrypt']
  );
  const db = await getKeyDB();
  await db.put(DB_STORE, pkcs8, userId);
}

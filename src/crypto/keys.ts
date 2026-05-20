const DB_NAME = 'krypt-crypto-v2';
const STORE = 'keys';
const KEY_ID = 'identity';

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
  });
}

export async function getOrCreateKeyPair(): Promise<CryptoKeyPair> {
  const db = await openDb();
  const stored = await new Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey } | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    },
  );

  if (stored) {
    const [publicKey, privateKey] = await Promise.all([
      crypto.subtle.importKey('jwk', stored.publicJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']),
      crypto.subtle.importKey('jwk', stored.privateJwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']),
    ]);
    return { publicKey, privateKey };
  }

  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ publicJwk, privateJwk }, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return pair;
}

export async function exportPublicKeySpki(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPublicKeyFromSpki(spkiB64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(spkiB64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', raw, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
}

export async function wrapKeyForUser(aesKey: CryptoKey, recipientPublicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', aesKey);
  const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientPublicKey, raw);
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

export async function unwrapKeyForUser(wrappedB64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const wrapped = Uint8Array.from(atob(wrappedB64), (c) => c.charCodeAt(0));
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, wrapped);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

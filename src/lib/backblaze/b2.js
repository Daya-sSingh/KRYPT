import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(file, aesKey, onProgress) {
  const buffer = await file.arrayBuffer();
  let uploadBuffer = buffer;
  let iv = null;

  // Encrypt if we have a key
  if (aesKey) {
    try {
      const { encryptFile } = await import('../crypto/crypto.js');
      const result = await encryptFile(buffer, aesKey);
      uploadBuffer = result.ciphertext;
      iv = result.iv;
    } catch(err) {
      console.warn('Encryption failed, uploading unencrypted:', err);
    }
  }

  const fileName = `${uuidv4()}.enc`;

  // Simulate progress start
  if (onProgress) onProgress(0.05);

  // Convert to base64 to send through Netlify function (avoids CORS)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(uploadBuffer)));

  if (onProgress) onProgress(0.2);

  const res = await fetch('/.netlify/functions/b2-upload', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      fileData: base64,
      fileName,
      mimeType: 'application/octet-stream',
    }),
  });

  if (onProgress) onProgress(0.9);

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Upload failed: ' + err);
  }

  await res.json();
  if (onProgress) onProgress(1);

  return {
    fileName,
    iv:       iv ? new Uint8Array(iv) : null,
    mimeType: file.type,
    size:     file.size,
    name:     file.name,
  };
}

export async function downloadFile(fileName, iv, aesKey) {
  const res = await fetch('/.netlify/functions/b2-download-url', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fileName }),
  });
  const { url }   = await res.json();
  const response  = await fetch(url);
  const encrypted = await response.arrayBuffer();

  if (aesKey && iv) {
    const { decryptFile } = await import('../crypto/crypto.js');
    const ivArray = iv instanceof Uint8Array ? iv : new Uint8Array(iv);
    return decryptFile({ iv: ivArray, ciphertext: encrypted }, aesKey);
  }
  return encrypted;
}

export function triggerDownload(arrayBuffer, fileName, mimeType) {
  const blob = new Blob([arrayBuffer], { type: mimeType || 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

export function createObjectURL(arrayBuffer, mimeType) {
  return URL.createObjectURL(new Blob([arrayBuffer], { type: mimeType }));
}

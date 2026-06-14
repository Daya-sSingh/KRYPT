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

  // Get upload URL from Netlify function
  const urlRes = await fetch('/.netlify/functions/b2-upload-url', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fileName: `${uuidv4()}.enc` }),
  });

  if (!urlRes.ok) {
    const err = await urlRes.text();
    throw new Error('Failed to get upload URL: ' + err);
  }

  const { uploadUrl, authToken, fileName } = await urlRes.json();

  if (!uploadUrl || !authToken) {
    throw new Error('Invalid upload URL response');
  }

  // Upload the blob
  const blob = new Blob([uploadBuffer]);
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', authToken);
    xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(fileName));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('X-Bz-Content-Sha1', 'do_not_verify');
    xhr.setRequestHeader('Content-Length', blob.size.toString());
    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(blob);
  });

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

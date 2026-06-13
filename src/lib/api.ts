const API = '/.netlify/functions';

async function apiFetch(path: string, body: object) {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Upload service error (${res.status})`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || 'Invalid server response');
  }
}

export async function getLiveKitToken(room: string, identity: string, name: string): Promise<string> {
  const data = await apiFetch('livekit-token', { room, identity, name });
  return data.token as string;
}

/** Upload encrypted bytes through Netlify (avoids B2 CORS / network errors in browser). */
export async function uploadEncryptedFile(
  fileName: string,
  contentType: string,
  data: ArrayBuffer,
): Promise<{ key: string }> {
  const bytes = new Uint8Array(data);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  return apiFetch('b2-upload', { fileName, contentType, data: b64 });
}

export async function getB2DownloadUrl(key: string): Promise<string> {
  const data = await apiFetch('b2-presign', { key, download: true });
  return data.downloadUrl as string;
}

export async function getLiveKitToken(room: string, identity: string, name: string): Promise<string> {
  const res = await fetch('/.netlify/functions/livekit-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, identity, name }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.token as string;
}

export async function getB2UploadUrl(fileName: string, contentType: string): Promise<{ uploadUrl: string; key: string }> {
  const res = await fetch('/.netlify/functions/b2-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getB2DownloadUrl(key: string): Promise<string> {
  const res = await fetch('/.netlify/functions/b2-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, download: true }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.downloadUrl as string;
}

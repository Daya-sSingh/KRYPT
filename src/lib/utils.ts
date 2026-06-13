export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

export async function saveGifFromUrl(url: string, fileName = 'krypt-gif.gif') {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download GIF');
  const blob = await res.blob();
  triggerDownload(blob, fileName);
}

export async function saveGifFromBlob(blob: Blob, fileName = 'krypt-gif.gif') {
  triggerDownload(blob, fileName);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function channelKey(serverId: string, channelId: string) {
  return `${serverId}_${channelId}`;
}

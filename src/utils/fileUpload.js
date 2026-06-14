import { encryptFile, decryptFile } from '../crypto/keys'
import { getSessionKey } from '../crypto/session'

const B2_ENDPOINT = import.meta.env.VITE_B2_ENDPOINT
const B2_BUCKET = import.meta.env.VITE_B2_BUCKET_NAME

// Upload a file: encrypt then send to B2 via Netlify proxy function
export async function uploadFile({ file, conversationId, senderId, members }) {
  const sessionKey = await getSessionKey(conversationId, senderId, members)

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()

  // Encrypt
  const { encryptedBuffer, iv } = await encryptFile(arrayBuffer, sessionKey)

  // Get upload auth from Netlify function (keeps B2 keys server-side)
  const authRes = await fetch('/.netlify/functions/b2-upload-auth')
  const { uploadUrl, authToken } = await authRes.json()

  // Generate unique filename
  const filename = `${conversationId}/${Date.now()}-${crypto.randomUUID()}`

  // Upload encrypted blob directly to B2
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': authToken,
      'X-Bz-File-Name': encodeURIComponent(filename),
      'Content-Type': 'application/octet-stream',
      'X-Bz-Content-Sha1': 'do_not_verify',
      'Content-Length': encryptedBuffer.byteLength
    },
    body: encryptedBuffer
  })

  if (!uploadRes.ok) throw new Error('Upload failed')
  const uploadData = await uploadRes.json()

  return {
    url: `${B2_ENDPOINT}/file/${B2_BUCKET}/${filename}`,
    fileId: uploadData.fileId,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    iv // needed for decryption
  }
}

// Download and decrypt a file
export async function downloadFile({ url, iv, name, mimeType, conversationId, currentUid, members }) {
  const sessionKey = await getSessionKey(conversationId, currentUid, members)

  // Download encrypted blob via Netlify proxy (keeps B2 auth server-side)
  const proxyUrl = `/.netlify/functions/b2-download?url=${encodeURIComponent(url)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error('Download failed')

  const encryptedBuffer = await res.arrayBuffer()
  const decryptedBuffer = await decryptFile(encryptedBuffer, iv, sessionKey)

  // Trigger browser download
  const blob = new Blob([decryptedBuffer], { type: mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

// Get a temporary signed URL for preview (images)
export async function getPreviewUrl(url, iv, mimeType, conversationId, currentUid, members) {
  const sessionKey = await getSessionKey(conversationId, currentUid, members)
  const proxyUrl = `/.netlify/functions/b2-download?url=${encodeURIComponent(url)}`
  const res = await fetch(proxyUrl)
  const encryptedBuffer = await res.arrayBuffer()
  const decryptedBuffer = await decryptFile(encryptedBuffer, iv, sessionKey)
  const blob = new Blob([decryptedBuffer], { type: mimeType })
  return URL.createObjectURL(blob)
}

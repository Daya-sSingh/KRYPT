// netlify/functions/b2-upload-auth.js
// Serverless function: gets a B2 upload URL using secret keys (never exposed to browser)

exports.handler = async () => {
  const keyId = process.env.B2_KEY_ID
  const appKey = process.env.B2_APPLICATION_KEY
  const bucketId = process.env.B2_BUCKET_ID

  try {
    // Authorize account
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64')
      }
    })
    const auth = await authRes.json()

    // Get upload URL
    const uploadRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId })
    })
    const upload = await uploadRes.json()

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        uploadUrl: upload.uploadUrl,
        authToken: upload.authorizationToken
      })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

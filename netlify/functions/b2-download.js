// netlify/functions/b2-download.js
// Proxies B2 downloads so the auth token stays server-side

exports.handler = async (event) => {
  const fileUrl = decodeURIComponent(event.queryStringParameters?.url || '')
  if (!fileUrl) return { statusCode: 400, body: 'Missing url' }

  const keyId = process.env.B2_KEY_ID
  const appKey = process.env.B2_APPLICATION_KEY

  try {
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64')
      }
    })
    const auth = await authRes.json()

    const fileRes = await fetch(fileUrl, {
      headers: { Authorization: auth.authorizationToken }
    })

    if (!fileRes.ok) return { statusCode: fileRes.status, body: 'Download failed' }

    const buffer = await fileRes.arrayBuffer()
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    }
  } catch (err) {
    return { statusCode: 500, body: err.message }
  }
}

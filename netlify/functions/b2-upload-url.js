exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const KEY_ID   = process.env.B2_KEY_ID;
  const APP_KEY  = process.env.B2_APP_KEY;
  const BUCKET_ID = process.env.REACT_APP_B2_BUCKET_ID || process.env.VITE_B2_BUCKET_ID;

  try {
    const authString = Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64');
    const authRes    = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${authString}` },
    });

    if (!authRes.ok) {
      const err = await authRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'B2 auth failed: ' + err }) };
    }

    const authData  = await authRes.json();
    const uploadRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method:  'POST',
      headers: { Authorization: authData.authorizationToken, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bucketId: BUCKET_ID }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Get upload URL failed: ' + err }) };
    }

    const uploadData = await uploadRes.json();
    const body       = JSON.parse(event.body || '{}');
    const fileName   = body.fileName || `${Date.now()}.enc`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl: uploadData.uploadUrl,
        authToken: uploadData.authorizationToken,
        fileName,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

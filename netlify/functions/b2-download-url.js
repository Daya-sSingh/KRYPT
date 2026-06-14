exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const KEY_ID    = process.env.B2_KEY_ID;
  const APP_KEY   = process.env.B2_APP_KEY;
  const BUCKET_ID = process.env.REACT_APP_B2_BUCKET_ID || process.env.VITE_B2_BUCKET_ID;
  const BUCKET    = process.env.REACT_APP_B2_BUCKET_NAME || process.env.VITE_B2_BUCKET_NAME;

  try {
    const { fileName } = JSON.parse(event.body || '{}');
    const authString   = Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64');
    const authRes      = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${authString}` },
    });
    const authData = await authRes.json();

    const dlAuthRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_download_authorization`, {
      method:  'POST',
      headers: { Authorization: authData.authorizationToken, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bucketId: BUCKET_ID, fileNamePrefix: fileName, validDurationInSeconds: 3600 }),
    });
    const dlAuthData = await dlAuthRes.json();
    const url = `${authData.downloadUrl}/file/${BUCKET}/${fileName}?Authorization=${dlAuthData.authorizationToken}`;

    return { statusCode: 200, headers, body: JSON.stringify({ url }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

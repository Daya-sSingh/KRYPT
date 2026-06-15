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
  const BUCKET_ID = process.env.VITE_B2_BUCKET_ID || process.env.REACT_APP_B2_BUCKET_ID;

  try {
    const authString = Buffer.from(`${KEY_ID}:${APP_KEY}`).toString('base64');
    const authRes    = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${authString}` },
    });
    if (!authRes.ok) throw new Error('B2 auth failed: ' + await authRes.text());
    const authData = await authRes.json();

    const urlRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method:  'POST',
      headers: { Authorization: authData.authorizationToken, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bucketId: BUCKET_ID }),
    });
    if (!urlRes.ok) throw new Error('Get upload URL failed: ' + await urlRes.text());
    const urlData = await urlRes.json();

    const { fileData, fileName, mimeType } = JSON.parse(event.body);
    const buffer = Buffer.from(fileData, 'base64');

    const uploadRes = await fetch(urlData.uploadUrl, {
      method:  'POST',
      headers: {
        Authorization:       urlData.authorizationToken,
        'X-Bz-File-Name':    encodeURIComponent(fileName),
        'Content-Type':      mimeType || 'application/octet-stream',
        'X-Bz-Content-Sha1': 'do_not_verify',
        'Content-Length':    buffer.length,
      },
      body: buffer,
    });

    if (!uploadRes.ok) throw new Error('B2 upload failed: ' + await uploadRes.text());
    const uploadData = await uploadRes.json();

    return { statusCode: 200, headers, body: JSON.stringify({ fileName, fileId: uploadData.fileId }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

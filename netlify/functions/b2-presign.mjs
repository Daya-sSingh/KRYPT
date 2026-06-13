import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function client() {
  return new S3Client({
    region: 'us-east-005',
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APP_KEY,
    },
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method not allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const bucket = process.env.B2_BUCKET_NAME;
    if (!bucket) {
      return { statusCode: 500, headers: cors, body: 'B2 not configured' };
    }

    const s3 = client();

    if (body.download && body.key) {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: body.key });
      const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl }),
      };
    }

    if (body.data) {
      const key = `uploads/${Date.now()}-${body.fileName || 'file'}`;
      const buffer = Buffer.from(body.data, 'base64');
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: body.contentType || 'application/octet-stream',
        }),
      );
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      };
    }

    const key = `uploads/${Date.now()}-${body.fileName || 'file'}`;
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType || 'application/octet-stream',
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 600 });

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadUrl, key }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: String(e.message || e) };
  }
}

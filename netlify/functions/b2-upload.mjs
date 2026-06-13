import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { b2Config } from './_env.mjs';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method not allowed' };
  }

  try {
    const { fileName, contentType, data } = JSON.parse(event.body || '{}');
    if (!data) {
      return { statusCode: 400, headers: cors, body: 'Missing file data' };
    }

    const { bucket, endpoint, keyId, appKey } = b2Config();
    if (!bucket || !endpoint || !keyId || !appKey) {
      return { statusCode: 500, headers: cors, body: 'B2 storage not configured on server' };
    }

    const key = `uploads/${Date.now()}-${fileName || 'file'}`;
    const buffer = Buffer.from(data, 'base64');

    const s3 = new S3Client({
      region: 'us-east-005',
      endpoint: `https://${endpoint}`,
      credentials: { accessKeyId: keyId, secretAccessKey: appKey },
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
      }),
    );

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: String(e.message || e) };
  }
}

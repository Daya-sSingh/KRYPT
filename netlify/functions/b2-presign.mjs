import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
    const body = JSON.parse(event.body || '{}');
    const { bucket, endpoint, keyId, appKey } = b2Config();
    if (!bucket || !endpoint || !keyId || !appKey) {
      return { statusCode: 500, headers: cors, body: 'B2 not configured' };
    }

    const s3 = new S3Client({
      region: 'us-east-005',
      endpoint: `https://${endpoint}`,
      credentials: { accessKeyId: keyId, secretAccessKey: appKey },
    });

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

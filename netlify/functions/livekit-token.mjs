import { AccessToken } from 'livekit-server-sdk';

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
    const { room, identity, name } = JSON.parse(event.body || '{}');
    if (!room || !identity) {
      return { statusCode: 400, body: 'room and identity required' };
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return { statusCode: 500, body: 'LiveKit not configured' };
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity,
    });
    token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await token.toJwt() }),
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: String(e.message || e) };
  }
}

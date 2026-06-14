const { AccessToken } = require('livekit-server-sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const API_KEY    = process.env.LIVEKIT_API_KEY;
  const API_SECRET = process.env.LIVEKIT_API_SECRET;
  try {
    const { roomName, participantName, participantId } = JSON.parse(event.body);
    const token = new AccessToken(API_KEY, API_SECRET, {
      identity: participantId,
      name:     participantName,
      ttl:      '4h',
    });
    token.addGrant({
      roomJoin: true, room: roomName,
      canPublish: true, canSubscribe: true,
      canPublishData: true, canUpdateOwnMetadata: true,
    });
    return { statusCode: 200, body: JSON.stringify({ token: await token.toJwt() }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

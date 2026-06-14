const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize admin SDK with service account from env
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };

  try {
    if (event.httpMethod === 'POST') {
      // Logged-in device requests a QR session token
      const { uid } = JSON.parse(event.body);
      const token   = uuidv4();
      const expires = Date.now() + 60_000; // 60 seconds

      await db.collection('qrSessions').doc(token).set({
        uid, token, expires, used: false, status: 'pending',
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token, expires }),
      };
    }

    if (event.httpMethod === 'GET') {
      // New device polls to check if QR was scanned and get custom token
      const token   = event.queryStringParameters?.token;
      const snap    = await db.collection('qrSessions').doc(token).get();

      if (!snap.exists) return { statusCode:404, headers, body: JSON.stringify({ error:'Session not found' }) };

      const session = snap.data();

      if (Date.now() > session.expires) {
        await snap.ref.delete();
        return { statusCode:410, headers, body: JSON.stringify({ error:'Session expired' }) };
      }

      if (session.status === 'approved' && !session.used) {
        const customToken = await admin.auth().createCustomToken(session.uid);
        await snap.ref.update({ used: true });
        return { statusCode:200, headers, body: JSON.stringify({ customToken, status:'approved' }) };
      }

      return { statusCode:200, headers, body: JSON.stringify({ status: session.status }) };
    }
  } catch (err) {
    return { statusCode:500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

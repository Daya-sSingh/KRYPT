const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };

  try {
    const { token, uid } = JSON.parse(event.body);
    const snap  = await db.collection('qrSessions').doc(token).get();
    if (!snap.exists) return { statusCode:404, headers, body: JSON.stringify({ error:'Session not found' }) };

    const session = snap.data();
    if (Date.now() > session.expires) return { statusCode:410, headers, body: JSON.stringify({ error:'Expired' }) };
    if (session.uid !== uid) return { statusCode:403, headers, body: JSON.stringify({ error:'Forbidden' }) };

    await snap.ref.update({ status: 'approved' });
    return { statusCode:200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode:500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

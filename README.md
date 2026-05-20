# Krypt

End-to-end encrypted Discord-style web chat. React + Firebase + LiveKit + Backblaze B2.

## Features

- E2E encrypted messages (Web Crypto RSA + AES)
- Servers, text channels, voice channels
- GIF picker (Giphy), encrypted file uploads (B2)
- Group voice/video (LiveKit), DM calls (WebRTC)
- Screen sharing at native resolution
- Settings: theme colors, mic/speakers, volume up to 500%, message expiry
- Auth: email/password, magic link, Google

## Local setup

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

For uploads and group calls locally, run Netlify dev in another terminal:

```bash
npm install -g netlify-cli
cd netlify/functions && npm install && cd ../..
netlify dev
```

Then open the URL Netlify prints (usually http://localhost:8888).

## Deploy (GitHub + Netlify)

1. Push to GitHub — **never commit `.env`**
2. Import repo in Netlify
3. Add all variables from `.env.example` in Netlify env settings
4. Deploy `firestore.rules` and `database.rules.json` in Firebase Console
5. Add your `*.netlify.app` domain to Firebase Auth authorized domains

## Firebase setup

- **Firestore** — production mode, deploy rules from `firestore.rules`
- **Realtime Database** — deploy rules from `database.rules.json`
- **Auth** — enable Email/Password (+ email link), Google

## Project structure

```
src/crypto/       E2E encryption
src/firebase/     Firestore, RTDB, auth helpers
src/components/   UI (layout, chat, calls, settings)
netlify/functions livekit-token, b2-presign
```

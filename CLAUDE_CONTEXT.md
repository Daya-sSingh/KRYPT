# Krypt — E2E encrypted chat (from Claude export)

**App name:** Krypt  
**Users:** ~2–50 people  
**Hosting:** Netlify (+ serverless functions for B2/LiveKit secrets)

## Features

- E2E encrypted text messages (Web Crypto: RSA + AES; private keys in IndexedDB)
- DMs and group chats (Discord-like layout)
- Message expiry per DM/group (after view, 1m, 10m, 1h, 1d, custom)
- Voice/video: WebRTC P2P for DMs; **LiveKit** SFU for group calls (no max size)
- Screen share via `getDisplayMedia()` (full screen / window / tab)
- Encrypted file + photo uploads → **Backblaze B2**
- GIF picker → **Giphy** (not encrypted; public URLs only)
- Auth: email/password, passwordless email link, Google Sign-In
- Firestore for messages/metadata; Realtime Database for presence/typing
- Default theme green/black; user-customizable in settings
- Call settings: mic, headphones, **500%** per-user volume cap
- Stream quality: native monitor resolution (no artificial downscale)

## Build order (from Claude)

1. Project setup + env + folder structure  
2. Crypto layer  
3. Firebase auth + profiles  
4. Chat (Firestore, groups, expiry)  
5. Files/photos (B2, encrypted)  
6. Giphy picker  
7. Calls (WebRTC + LiveKit)  
8. Screen share  
9. PWA  
10. Netlify deploy + serverless proxies  

## Credentials

Store in `.env` (see `.env.example`). Never commit `.env`.  
B2 and LiveKit secrets should only be used in Netlify functions in production.

## Logo

Option C: grave squircle, green outline around full grave including base lip.

## Note on export

Claude’s generated code blocks were not included in the data export (“block not supported”). Building starts fresh from this spec.

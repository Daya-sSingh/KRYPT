/** Server-side env — supports both B2_* and VITE_B2_* (Netlify may only have VITE_ vars). */
export function b2Config() {
  return {
    bucket: process.env.B2_BUCKET_NAME || process.env.VITE_B2_BUCKET_NAME,
    endpoint: process.env.B2_ENDPOINT || process.env.VITE_B2_ENDPOINT,
    keyId: process.env.B2_KEY_ID,
    appKey: process.env.B2_APP_KEY,
  };
}

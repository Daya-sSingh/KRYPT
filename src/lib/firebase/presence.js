import { ref, set, onValue, onDisconnect, serverTimestamp, off } from 'firebase/database';
import { rtdb } from './firebase';

// ─── Presence ─────────────────────────────────────────────────────────────────

export function initPresence(uid) {
  const presRef    = ref(rtdb, `presence/${uid}`);
  const connRef    = ref(rtdb, '.info/connected');

  onValue(connRef, snap => {
    if (!snap.val()) return;
    // When disconnected, set offline
    onDisconnect(presRef).set({ online: false, lastSeen: serverTimestamp() });
    // Set online now
    set(presRef, { online: true, lastSeen: serverTimestamp() });
  });

  return () => {
    set(presRef, { online: false, lastSeen: serverTimestamp() });
    off(connRef);
  };
}

export function listenPresence(uid, callback) {
  const presRef = ref(rtdb, `presence/${uid}`);
  onValue(presRef, snap => callback(snap.val()));
  return () => off(presRef);
}

export function listenMultiPresence(uids, callback) {
  const listeners = {};
  const state     = {};

  for (const uid of uids) {
    const presRef = ref(rtdb, `presence/${uid}`);
    listeners[uid] = onValue(presRef, snap => {
      state[uid] = snap.val();
      callback({ ...state });
    });
  }

  return () => {
    for (const uid of uids) {
      off(ref(rtdb, `presence/${uid}`));
    }
  };
}

// ─── Typing Indicators ────────────────────────────────────────────────────────

export function setTyping(convId, uid, isTyping) {
  const typRef = ref(rtdb, `typing/${convId}/${uid}`);
  if (isTyping) {
    set(typRef, { typing: true, timestamp: Date.now() });
    onDisconnect(typRef).remove();
  } else {
    set(typRef, null);
  }
}

export function listenTyping(convId, currentUid, callback) {
  const typRef = ref(rtdb, `typing/${convId}`);
  onValue(typRef, snap => {
    const data  = snap.val() || {};
    const typers = Object.entries(data)
      .filter(([uid, v]) => uid !== currentUid && v?.typing && Date.now() - v.timestamp < 5000)
      .map(([uid]) => uid);
    callback(typers);
  });
  return () => off(typRef);
}

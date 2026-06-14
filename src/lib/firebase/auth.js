import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, serverTimestamp,
  collection, query, where, getDocs, limit,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { initUserKeys, getPrivateKey } from '../crypto/crypto';

const ACTION_CODE_SETTINGS = {
  url:             window.location.origin + '/auth/email-callback',
  handleCodeInApp: true,
};

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserProfile(cred.user);
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function sendMagicLink(email) {
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
  localStorage.setItem('krypt_email_link', email);
}

export async function completeMagicLink(url) {
  if (!isSignInWithEmailLink(auth, url)) throw new Error('Invalid link');
  let email = localStorage.getItem('krypt_email_link');
  if (!email) email = window.prompt('Please enter your email to confirm:');
  const cred = await signInWithEmailLink(auth, email, url);
  localStorage.removeItem('krypt_email_link');
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred     = await signInWithPopup(auth, provider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

async function createUserProfile(user) {
  const userRef   = doc(db, 'users', user.uid);
  const pubKeyB64 = await initUserKeys(user.uid);

  await setDoc(userRef, {
    uid:              user.uid,
    displayName:      user.displayName || 'Krypt User',
    displayNameLower: (user.displayName || 'krypt user').toLowerCase(),
    email:            user.email,
    photoURL:         user.photoURL || null,
    bio:              '',
    status:           'online',
    customStatus:     '',
    createdAt:        serverTimestamp(),
    settings: {
      theme:            'green',
      inputVolume:      100,
      outputVolume:     100,
      micMuted:         false,
      deafened:         false,
      notifications:    true,
      noiseSuppression: true,
      echoCancellation: true,
      autoGain:         true,
      pushToTalk:       false,
      videoPreview:     true,
      mirrorVideo:      true,
      notifPreview:     false,
      notifSound:       true,
    },
  }, { merge: true });

  if (pubKeyB64) {
    await setDoc(doc(db, 'publicKeys', user.uid), {
      key:       pubKeyB64,
      updatedAt: serverTimestamp(),
    });
  }
}

async function ensureUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) {
    await createUserProfile(user);
  } else {
    // Clean up any duplicate profiles with same email but different uid
    await cleanupDuplicateProfiles(user.email, user.uid);

    const pubKeyB64 = await initUserKeys(user.uid);
    if (pubKeyB64) {
      await setDoc(doc(db, 'publicKeys', user.uid), {
        key:       pubKeyB64,
        updatedAt: serverTimestamp(),
      });
    }
    await setDoc(userRef, { status: 'online' }, { merge: true });
  }
}

// Remove stale profiles with same email (from deleted/recreated accounts)
async function cleanupDuplicateProfiles(email, currentUid) {
  try {
    const q    = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    const stale = snap.docs.filter(d => d.id !== currentUid);
    await Promise.all(stale.map(d => deleteDoc(d.ref)));
  } catch {}
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  if (data.displayName) {
    data.displayNameLower = data.displayName.toLowerCase();
  }
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function getPublicKey(uid) {
  const snap = await getDoc(doc(db, 'publicKeys', uid));
  return snap.exists() ? snap.data().key : null;
}

export async function searchUsers(searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return [];
  const term = searchTerm.toLowerCase().trim();

  const nameQ = query(
    collection(db, 'users'),
    where('displayNameLower', '>=', term),
    where('displayNameLower', '<=', term + '\uf8ff'),
    limit(10)
  );
  const emailQ = query(
    collection(db, 'users'),
    where('email', '>=', term),
    where('email', '<=', term + '\uf8ff'),
    limit(10)
  );

  const [nameSnap, emailSnap] = await Promise.all([getDocs(nameQ), getDocs(emailQ)]);
  const results = new Map();
  [...nameSnap.docs, ...emailSnap.docs].forEach(d => results.set(d.id, d.data()));
  return Array.from(results.values());
}

export async function sendFriendRequest(fromUid, toUid) {
  const reqRef = doc(db, 'friendRequests', `${fromUid}_${toUid}`);
  await setDoc(reqRef, {
    from:      fromUid,
    to:        toUid,
    status:    'pending',
    createdAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(fromUid, toUid) {
  const reqRef = doc(db, 'friendRequests', `${fromUid}_${toUid}`);
  await setDoc(reqRef, { status: 'accepted' }, { merge: true });
  await setDoc(doc(db, 'users', toUid),   { friends: { [fromUid]: true } }, { merge: true });
  await setDoc(doc(db, 'users', fromUid), { friends: { [toUid]: true } },   { merge: true });
}

export async function getFriendRequests(uid) {
  const q    = query(collection(db, 'friendRequests'), where('to', '==', uid), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './config';
import { DEFAULT_SETTINGS, type UserProfile, type UserSettings } from '../types';
import { exportPublicKeySpki, getOrCreateKeyPair } from '../crypto/keys';

export async function ensureUserProfile(authUser: User): Promise<UserProfile> {
  const ref = doc(db, 'users', authUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { uid: authUser.uid, ...snap.data() } as UserProfile;
  }

  const pair = await getOrCreateKeyPair();
  const publicKey = await exportPublicKeySpki(pair.publicKey);

  const profile: UserProfile = {
    uid: authUser.uid,
    email: authUser.email ?? '',
    displayName: authUser.displayName ?? authUser.email?.split('@')[0] ?? 'User',
    publicKey,
    settings: { ...DEFAULT_SETTINGS },
  };

  await setDoc(ref, profile);
  return profile;
}

export async function updateUserSettings(uid: string, patch: Partial<UserSettings>) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = (snap.data()?.settings as UserSettings) ?? DEFAULT_SETTINGS;
  await updateDoc(ref, { settings: { ...current, ...patch } });
}

export async function getMemberPublicKeys(memberIds: string[]): Promise<Record<string, string>> {
  const keys: Record<string, string> = {};
  await Promise.all(
    memberIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) keys[uid] = (snap.data() as UserProfile).publicKey;
    }),
  );
  return keys;
}

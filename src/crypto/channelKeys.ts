import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateAesKey } from './aes';
import {
  exportPublicKeySpki,
  getOrCreateKeyPair,
  importPublicKeyFromSpki,
  unwrapKeyForUser,
  wrapKeyForUser,
} from './keys';

const channelKeyPath = (serverId: string, channelId: string) =>
  doc(db, 'servers', serverId, 'channelKeys', channelId);

export async function getChannelAesKey(
  serverId: string,
  channelId: string,
  memberPublicKeys: Record<string, string>,
  myUid: string,
): Promise<CryptoKey> {
  const pair = await getOrCreateKeyPair();
  const ref = channelKeyPath(serverId, channelId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const wrapped = snap.data().wrapped as Record<string, string>;
    const mine = wrapped[myUid];
    if (mine) return unwrapKeyForUser(mine, pair.privateKey);
  }

  const aesKey = await generateAesKey();
  const wrapped: Record<string, string> = {};

  for (const [uid, spki] of Object.entries(memberPublicKeys)) {
    const pub = await importPublicKeyFromSpki(spki);
    wrapped[uid] = await wrapKeyForUser(aesKey, pub);
  }

  if (!wrapped[myUid]) {
    const mySpki = await exportPublicKeySpki(pair.publicKey);
    const pub = await importPublicKeyFromSpki(mySpki);
    wrapped[myUid] = await wrapKeyForUser(aesKey, pub);
  }

  await setDoc(ref, { wrapped, updatedAt: Date.now() });
  return aesKey;
}

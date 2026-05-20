import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';

export async function createCallOffer(serverId: string, channelId: string, fromUid: string, offer: RTCSessionDescriptionInit) {
  const ref = doc(db, 'calls', `${serverId}_${channelId}`);
  await setDoc(ref, { offer, fromUid, answer: null, candidates: {} });
}

export async function setCallAnswer(serverId: string, channelId: string, answer: RTCSessionDescriptionInit) {
  await setDoc(doc(db, 'calls', `${serverId}_${channelId}`), { answer }, { merge: true });
}

export async function addIceCandidate(
  serverId: string,
  channelId: string,
  uid: string,
  candidate: RTCIceCandidateInit,
) {
  const ref = doc(db, 'calls', `${serverId}_${channelId}`);
  await setDoc(ref, { [`candidates.${uid}`]: candidate }, { merge: true });
}

export function subscribeCall(
  serverId: string,
  channelId: string,
  handlers: {
    onOffer?: (offer: RTCSessionDescriptionInit, fromUid: string) => void;
    onAnswer?: (answer: RTCSessionDescriptionInit) => void;
    onCandidate?: (uid: string, c: RTCIceCandidateInit) => void;
  },
) {
  return onSnapshot(doc(db, 'calls', `${serverId}_${channelId}`), (snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.offer && d.fromUid) handlers.onOffer?.(d.offer, d.fromUid);
    if (d.answer) handlers.onAnswer?.(d.answer);
    if (d.candidates) {
      Object.entries(d.candidates as Record<string, RTCIceCandidateInit>).forEach(([uid, c]) => {
        handlers.onCandidate?.(uid, c);
      });
    }
  });
}

export async function clearCall(serverId: string, channelId: string) {
  await deleteDoc(doc(db, 'calls', `${serverId}_${channelId}`)).catch(() => {});
}

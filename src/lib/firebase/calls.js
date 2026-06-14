import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Create an incoming call notification in Firestore
export async function initiateCall(callerId, callerName, callerPhoto, recipientUid, convId, callType) {
  const callRef = doc(db, 'incomingCalls', recipientUid);
  await setDoc(callRef, {
    callerId,
    callerName,
    callerPhoto:  callerPhoto || null,
    convId,
    callType,
    status:       'ringing',
    createdAt:    serverTimestamp(),
  });
}

export async function cancelCall(recipientUid) {
  await deleteDoc(doc(db, 'incomingCalls', recipientUid));
}

export async function acceptCall(uid) {
  await deleteDoc(doc(db, 'incomingCalls', uid));
}

export async function declineCall(uid) {
  await deleteDoc(doc(db, 'incomingCalls', uid));
}

export function listenIncomingCall(uid, callback) {
  return onSnapshot(doc(db, 'incomingCalls', uid), snap => {
    callback(snap.exists() ? snap.data() : null);
  });
}

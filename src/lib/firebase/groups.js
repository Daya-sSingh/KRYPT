import { doc, deleteDoc, updateDoc, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function leaveGroup(convId, uid) {
  const convRef = doc(db, 'conversations', convId);
  await updateDoc(convRef, {
    members: arrayRemove(uid),
    [`encryptedKeys.${uid}`]: null,
  });
}

export async function deleteGroup(convId) {
  // Delete all messages first
  const msgsSnap = await getDocs(collection(db, 'conversations', convId, 'messages'));
  await Promise.all(msgsSnap.docs.map(d => deleteDoc(d.ref)));
  // Delete the conversation
  await deleteDoc(doc(db, 'conversations', convId));
}

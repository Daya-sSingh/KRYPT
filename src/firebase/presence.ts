import { onDisconnect, ref, set, onValue, type Unsubscribe } from 'firebase/database';
import { rtdb } from './config';

export async function setUserOnline(uid: string) {
  const userRef = ref(rtdb, `presence/${uid}`);
  await set(userRef, { online: true, lastSeen: Date.now() });
  onDisconnect(userRef).set({ online: false, lastSeen: Date.now() });
}

export function subscribePresence(
  memberIds: string[],
  cb: (online: Record<string, boolean>) => void,
): Unsubscribe {
  const online: Record<string, boolean> = {};
  const unsubs: Unsubscribe[] = [];

  memberIds.forEach((uid) => {
    unsubs.push(
      onValue(ref(rtdb, `presence/${uid}`), (snap) => {
        online[uid] = !!snap.val()?.online;
        cb({ ...online });
      }),
    );
  });

  return () => unsubs.forEach((u) => u());
}

export async function setTyping(uid: string, channelPath: string, typing: boolean) {
  await set(ref(rtdb, `typing/${channelPath}/${uid}`), typing ? true : null);
}

import { onDisconnect, onValue, ref, set, type Unsubscribe } from 'firebase/database';
import { rtdb } from './config';

export function callRoomPath(serverId: string, channelId: string) {
  return `callParticipants/${serverId}_${channelId}`;
}

export async function joinCallPresence(serverId: string, channelId: string, uid: string) {
  const path = `${callRoomPath(serverId, channelId)}/${uid}`;
  const r = ref(rtdb, path);
  await set(r, { joinedAt: Date.now() });
  onDisconnect(r).remove();
}

export async function leaveCallPresence(serverId: string, channelId: string, uid: string) {
  await set(ref(rtdb, `${callRoomPath(serverId, channelId)}/${uid}`), null);
}

export function subscribeCallParticipants(
  serverId: string,
  channelId: string,
  cb: (uids: string[]) => void,
): Unsubscribe {
  return onValue(ref(rtdb, callRoomPath(serverId, channelId)), (snap) => {
    const val = snap.val() || {};
    cb(Object.keys(val));
  });
}

export function subscribeAllCallParticipants(
  rooms: { serverId: string; channelId: string }[],
  cb: (inCall: Record<string, boolean>) => void,
): Unsubscribe {
  const state: Record<string, boolean> = {};
  const unsubs = rooms.map(({ serverId, channelId }) =>
    subscribeCallParticipants(serverId, channelId, (uids) => {
      Object.keys(state).forEach((k) => {
        if (k.startsWith(`${serverId}_${channelId}_`)) delete state[k];
      });
      uids.forEach((uid) => {
        state[`${serverId}_${channelId}_${uid}`] = true;
      });
      cb({ ...state });
    }),
  );
  return () => unsubs.forEach((u) => u());
}

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { Channel, Server } from '../types';

export async function ensureDefaultServer(uid: string): Promise<string> {
  const q = query(collection(db, 'servers'), where('memberIds', 'array-contains', uid));
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;

  const serverRef = await addDoc(collection(db, 'servers'), {
    name: 'Home',
    ownerId: uid,
    memberIds: [uid],
    createdAt: Date.now(),
  });

  await addDoc(collection(db, 'servers', serverRef.id, 'channels'), {
    name: 'general',
    type: 'text',
    createdAt: Date.now(),
  });

  await addDoc(collection(db, 'servers', serverRef.id, 'channels'), {
    name: 'Voice Lounge',
    type: 'voice',
    createdAt: Date.now(),
  });

  return serverRef.id;
}

export function subscribeServers(uid: string, cb: (servers: Server[]) => void): Unsubscribe {
  const q = query(collection(db, 'servers'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => {
    const servers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Server));
    servers.sort((a, b) => a.createdAt - b.createdAt);
    cb(servers);
  });
}

export function subscribeChannels(serverId: string, cb: (channels: Channel[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'servers', serverId, 'channels'), (snap) => {
    const channels = snap.docs.map((d) => ({
      id: d.id,
      serverId,
      ...d.data(),
    })) as Channel[];
    channels.sort((a, b) => a.createdAt - b.createdAt);
    cb(channels);
  });
}

export async function createServer(uid: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'servers'), {
    name,
    ownerId: uid,
    memberIds: [uid],
    createdAt: Date.now(),
  });

  await addDoc(collection(db, 'servers', ref.id, 'channels'), {
    name: 'general',
    type: 'text',
    createdAt: Date.now(),
  });

  return ref.id;
}

export async function createChannel(serverId: string, name: string, type: 'text' | 'voice') {
  await addDoc(collection(db, 'servers', serverId, 'channels'), {
    name,
    type,
    createdAt: Date.now(),
  });
}

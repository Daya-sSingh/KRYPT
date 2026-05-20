export type ChannelType = 'text' | 'voice';
export type MessageType = 'text' | 'file' | 'gif';
export type ExpiryPolicy = 'never' | 'view' | '1m' | '10m' | '1h' | '1d';

export interface UserSettings {
  accent: string;
  bgPrimary: string;
  bgSecondary: string;
  messageExpiry: ExpiryPolicy;
  audioInputId: string;
  audioOutputId: string;
  userVolume: number;
  streamMaxQuality: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  publicKey: string;
  settings: UserSettings;
}

export interface Server {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: ChannelType;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  type: MessageType;
  plaintext: string;
  createdAt: number;
  gifUrl?: string;
  fileName?: string;
  fileUrl?: string;
  mime?: string;
}

export interface CallState {
  mode: 'dm' | 'group' | null;
  channelId: string;
  serverId: string;
  withUserId?: string;
  video: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  accent: '#1db954',
  bgPrimary: '#111214',
  bgSecondary: '#1a1b1e',
  messageExpiry: 'never',
  audioInputId: '',
  audioOutputId: '',
  userVolume: 100,
  streamMaxQuality: true,
};

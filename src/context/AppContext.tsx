import { BootScreen } from '../components/BootScreen';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { CallState, Channel, Server, UserProfile } from '../types';
import { ensureUserProfile } from '../firebase/users';
import { ensureDefaultServer, subscribeChannels, subscribeServers } from '../firebase/servers';
import { setUserOnline } from '../firebase/presence';

interface AppContextValue {
  user: User;
  profile: UserProfile;
  servers: Server[];
  channels: Channel[];
  selectedServerId: string | null;
  selectedChannelId: string | null;
  call: CallState;
  settingsOpen: boolean;
  setSelectedServerId: (id: string) => void;
  setSelectedChannelId: (id: string) => void;
  setCall: (call: CallState) => void;
  setSettingsOpen: (open: boolean) => void;
  refreshProfile: () => Promise<void>;
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ user, children }: { user: User; children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [call, setCall] = useState<CallState>({ mode: null, channelId: '', serverId: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    const p = await ensureUserProfile(user);
    setProfile(p);
    document.documentElement.style.setProperty('--accent', p.settings.accent);
    document.documentElement.style.setProperty('--bg-primary', p.settings.bgPrimary);
    document.documentElement.style.setProperty('--bg-secondary', p.settings.bgSecondary);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshProfile();
      await ensureDefaultServer(user.uid);
      await setUserOnline(user.uid);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [user, refreshProfile]);

  useEffect(() => {
    return subscribeServers(user.uid, (s) => {
      setServers(s);
      if (!selectedServerId && s.length) setSelectedServerId(s[0].id);
    });
  }, [user.uid, selectedServerId]);

  useEffect(() => {
    if (!selectedServerId) return;
    return subscribeChannels(selectedServerId, (c) => {
      setChannels(c);
      const text = c.find((ch) => ch.type === 'text');
      if (!selectedChannelId && text) setSelectedChannelId(text.id);
    });
  }, [selectedServerId, selectedChannelId]);

  const value = useMemo(
    () =>
      profile
        ? {
            user,
            profile,
            servers,
            channels,
            selectedServerId,
            selectedChannelId,
            call,
            settingsOpen,
            setSelectedServerId,
            setSelectedChannelId,
            setCall,
            setSettingsOpen,
            refreshProfile,
            ready,
          }
        : null,
    [
      user,
      profile,
      servers,
      channels,
      selectedServerId,
      selectedChannelId,
      call,
      settingsOpen,
      refreshProfile,
      ready,
    ],
  );

  if (!value || !ready) {
    return <BootScreen status="Securing your session…" />;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

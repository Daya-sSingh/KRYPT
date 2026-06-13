import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { CallState, Channel, MessageToast, Server, UserProfile } from '../types';
import { ensureUserProfile } from '../firebase/users';
import { ensureDefaultServer, subscribeChannels, subscribeServers } from '../firebase/servers';
import { setUserOnline } from '../firebase/presence';
import { subscribeMessages } from '../firebase/messages';
import { channelKey } from '../lib/utils';
import { BootScreen } from '../components/BootScreen';

interface AppContextValue {
  user: User;
  profile: UserProfile;
  servers: Server[];
  channels: Channel[];
  channelsByServer: Record<string, Channel[]>;
  selectedServerId: string | null;
  selectedChannelId: string | null;
  call: CallState;
  settingsOpen: boolean;
  unreadCounts: Record<string, number>;
  unreadSenders: Record<string, Record<string, number>>;
  toasts: MessageToast[];
  setSelectedServerId: (id: string) => void;
  setSelectedChannelId: (id: string) => void;
  setCall: (call: CallState | ((prev: CallState) => CallState)) => void;
  setSettingsOpen: (open: boolean) => void;
  markChannelRead: (serverId: string, channelId: string) => void;
  dismissToast: (id: string) => void;
  goToChannel: (serverId: string, channelId: string) => void;
  refreshProfile: () => Promise<void>;
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ user, children }: { user: User; children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsByServer, setChannelsByServer] = useState<Record<string, Channel[]>>({});
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [call, setCall] = useState<CallState>({
    mode: null,
    channelId: '',
    serverId: '',
    video: false,
    minimized: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [unreadSenders, setUnreadSenders] = useState<Record<string, Record<string, number>>>({});
  const [toasts, setToasts] = useState<MessageToast[]>([]);
  const seenMessages = useRef<Set<string>>(new Set());
  const channelInitialized = useRef<Set<string>>(new Set());
  const selectedRef = useRef({ serverId: null as string | null, channelId: null as string | null });

  useEffect(() => {
    selectedRef.current = { serverId: selectedServerId, channelId: selectedChannelId };
  }, [selectedServerId, selectedChannelId]);

  const refreshProfile = useCallback(async () => {
    const p = await ensureUserProfile(user);
    setProfile(p);
    document.documentElement.style.setProperty('--accent', p.settings.accent);
    document.documentElement.style.setProperty('--bg-primary', p.settings.bgPrimary);
    document.documentElement.style.setProperty('--bg-secondary', p.settings.bgSecondary);
  }, [user]);

  const markChannelRead = useCallback((serverId: string, channelId: string) => {
    const key = channelKey(serverId, channelId);
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setUnreadSenders((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const goToChannel = useCallback((serverId: string, channelId: string) => {
    setSelectedServerId(serverId);
    setSelectedChannelId(channelId);
    markChannelRead(serverId, channelId);
  }, [markChannelRead]);

  const handleNewMessage = useCallback(
    (serverId: string, channelId: string, channelName: string, senderId: string, preview: string) => {
      const key = channelKey(serverId, channelId);
      const { serverId: selS, channelId: selC } = selectedRef.current;
      if (selS === serverId && selC === channelId) return;

      setUnreadCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      setUnreadSenders((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), [senderId]: ((prev[key] || {})[senderId] || 0) + 1 },
      }));

      const toast: MessageToast = {
        id: `${key}-${Date.now()}`,
        serverId,
        channelId,
        channelName,
        senderId,
        preview: preview.slice(0, 80),
      };
      setToasts((prev) => [...prev.slice(-4), toast]);
      setTimeout(() => dismissToast(toast.id), 8000);
    },
    [dismissToast],
  );

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
      setChannelsByServer((prev) => ({ ...prev, [selectedServerId]: c }));
      const text = c.find((ch) => ch.type === 'text');
      if (!selectedChannelId && text) setSelectedChannelId(text.id);
    });
  }, [selectedServerId, selectedChannelId]);

  useEffect(() => {
    if (!ready) return;
    const unsubs = servers.map((server) =>
      subscribeChannels(server.id, (c) => {
        setChannelsByServer((prev) => ({ ...prev, [server.id]: c }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [servers, ready]);

  useEffect(() => {
    if (!profile || !ready) return;
    const unsubs: (() => void)[] = [];

    Object.entries(channelsByServer).forEach(([serverId, chs]) => {
      const server = servers.find((s) => s.id === serverId);
      if (!server) return;

      chs.filter((c) => c.type === 'text').forEach((ch) => {
        const unsub = subscribeMessages(
          serverId,
          ch.id,
          user.uid,
          server.memberIds,
          profile.settings.messageExpiry,
          (msgs) => {
            const key = channelKey(serverId, ch.id);
            if (!channelInitialized.current.has(key)) {
              msgs.forEach((m) => seenMessages.current.add(`${serverId}_${ch.id}_${m.id}`));
              channelInitialized.current.add(key);
              return;
            }

            msgs.forEach((m) => {
              const seenId = `${serverId}_${ch.id}_${m.id}`;
              if (seenMessages.current.has(seenId)) return;
              seenMessages.current.add(seenId);
              if (m.senderId === user.uid) return;

              const preview =
                m.type === 'gif' ? 'Sent a GIF' :
                m.type === 'file' ? `Sent ${m.fileName || 'a file'}` :
                m.plaintext;

              handleNewMessage(serverId, ch.id, ch.name, m.senderId, preview);
            });
          },
        );
        unsubs.push(unsub);
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [channelsByServer, servers, profile, ready, user.uid, handleNewMessage]);

  useEffect(() => {
    if (selectedServerId && selectedChannelId) {
      markChannelRead(selectedServerId, selectedChannelId);
    }
  }, [selectedServerId, selectedChannelId, markChannelRead]);

  const value = useMemo(
    () =>
      profile
        ? {
            user,
            profile,
            servers,
            channels,
            channelsByServer,
            selectedServerId,
            selectedChannelId,
            call,
            settingsOpen,
            unreadCounts,
            unreadSenders,
            toasts,
            setSelectedServerId,
            setSelectedChannelId,
            setCall,
            setSettingsOpen,
            markChannelRead,
            dismissToast,
            goToChannel,
            refreshProfile,
            ready,
          }
        : null,
    [
      user,
      profile,
      servers,
      channels,
      channelsByServer,
      selectedServerId,
      selectedChannelId,
      call,
      settingsOpen,
      unreadCounts,
      unreadSenders,
      toasts,
      markChannelRead,
      dismissToast,
      goToChannel,
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

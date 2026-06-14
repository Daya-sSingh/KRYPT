import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  userProfile: null,
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),

  // Navigation - Discord-like
  activeServerId: null,       // group id or 'dms'
  activeChannelId: null,      // channel id within group
  activeDmId: null,           // dm conversation id
  setActiveServer: (id) => set({ activeServerId: id, activeChannelId: null }),
  setActiveChannel: (id) => set({ activeChannelId: id }),
  setActiveDm: (id) => set({ activeDmId: id, activeServerId: 'dms' }),

  // UI state
  showMembersList: true,
  showSettings: false,
  settingsPage: 'appearance',
  setShowMembersList: (v) => set({ showMembersList: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  setSettingsPage: (page) => set({ settingsPage: page, showSettings: true }),

  // Call state
  activeCall: null,           // { conversationId, type: 'voice'|'video', isScreen }
  setActiveCall: (call) => set({ activeCall: call }),
  endCall: () => set({ activeCall: null }),

  // Theme (loaded from user settings)
  theme: {
    primary: '#39ff6a',
    background: '#0a0a0a',
    surface: '#111111',
    surface2: '#1a1a1a',
    surface3: '#222222',
    text: '#ffffff',
    textMuted: '#888888',
    border: '#2a2a2a'
  },
  setTheme: (theme) => set({ theme }),

  // Audio settings
  micEnabled: true,
  headphonesEnabled: true,
  inputVolume: 100,
  outputVolume: 100,
  toggleMic: () => set(s => ({ micEnabled: !s.micEnabled })),
  toggleHeadphones: () => set(s => ({ headphonesEnabled: !s.headphonesEnabled })),
  setInputVolume: (v) => set({ inputVolume: v }),
  setOutputVolume: (v) => set({ outputVolume: v }),
}))

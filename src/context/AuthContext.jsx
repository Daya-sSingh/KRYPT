import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuth, getUserProfile, updateUserProfile } from '../lib/firebase/auth';
import { initPresence } from '../lib/firebase/presence';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuth(async firebaseUser => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getUserProfile(firebaseUser.uid);
          setProfile(prof);
          initPresence(firebaseUser.uid);
        } catch(err) {
          console.error('Profile load error:', err);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function refreshProfile() {
    if (!user) return;
    const prof = await getUserProfile(user.uid);
    setProfile(prof);
  }

  async function updateSettings(settings) {
    if (!user) return;
    await updateUserProfile(user.uid, { settings: { ...profile?.settings, ...settings } });
    await refreshProfile();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

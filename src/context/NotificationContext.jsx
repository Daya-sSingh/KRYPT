import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { listenConversations } from '../lib/firebase/firestore';
import { getUserProfile } from '../lib/firebase/auth';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase/firebase';

const NotifContext = createContext(null);

export function NotificationProvider({ children, activeConvId }) {
  const { user }            = useAuth();
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState({});
  const lastMsgIds          = useRef({});
  const mountedAt           = useRef(Date.now());

  function removeToast(id) { setToasts(t => t.filter(n => n.id !== id)); }

  function addToast(toast) {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-2), { ...toast, id }]);
    setTimeout(() => removeToast(id), 5000);
  }

  function markRead(convId) {
    setUnread(u => { const n = { ...u }; delete n[convId]; return n; });
  }

  useEffect(() => {
    if (!user) return;
    let convUnsubs = [];
    const convUnsub = listenConversations(user.uid, convs => {
      convUnsubs.forEach(u => u());
      convUnsubs = [];
      const dmConvs = convs.filter(c => c.type === 'dm' || c.type === 'group');
      dmConvs.forEach(conv => {
        const q = query(collection(db, 'conversations', conv.id, 'messages'), orderBy('timestamp', 'desc'), limit(1));
        const unsub = onSnapshot(q, async snap => {
          if (snap.empty) return;
          const msg  = snap.docs[0];
          const data = msg.data();
          if (data.senderId === user.uid) return;
          if (!data.timestamp) return;
          const msgTime = data.timestamp?.toMillis?.() || 0;
          if (msgTime < mountedAt.current) return;
          if (lastMsgIds.current[conv.id] === msg.id) return;
          lastMsgIds.current[conv.id] = msg.id;
          if (activeConvId === conv.id) return;
          setUnread(u => ({ ...u, [conv.id]: (u[conv.id] || 0) + 1 }));
          let senderName = 'Someone', senderPhoto = null;
          try {
            const prof = await getUserProfile(data.senderId);
            senderName  = prof?.displayName || 'Someone';
            senderPhoto = prof?.photoURL || null;
          } catch {}
          const preview = data.type === 'gif' ? '🎬 GIF'
            : data.type === 'image' ? '🖼 Image'
            : data.type === 'file' ? `📎 ${data.fileName || 'File'}`
            : data.plaintext ? (data.plaintext.length > 60 ? data.plaintext.slice(0, 60) + '...' : data.plaintext)
            : '💬 New message';
          addToast({ senderName, senderPhoto, preview, convId: conv.id });
        });
        convUnsubs.push(unsub);
      });
    });
    return () => { convUnsub(); convUnsubs.forEach(u => u()); };
  }, [user?.uid, activeConvId]);

  return (
    <NotifContext.Provider value={{ unread, markRead, toasts, removeToast }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}

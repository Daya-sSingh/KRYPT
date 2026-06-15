import React from 'react';
import { useNotifications } from '../../context/NotificationContext';

export default function MessageToasts({ onNavigate }) {
  const { toasts, removeToast } = useNotifications();
  if (!toasts.length) return null;

  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:998, display:'flex', flexDirection:'column', gap:8, maxWidth:320 }}>
      {toasts.map(toast => (
        <div key={toast.id}
          onClick={() => { onNavigate(toast.convId); removeToast(toast.id); }}
          style={{ background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.5)', animation:'slideInRight 0.2s ease-out', position:'relative' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--accent)', fontSize:14, flexShrink:0 }}>
            {toast.senderPhoto
              ? <img src={toast.senderPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : toast.senderName?.slice(0,1).toUpperCase()
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, color:'var(--text)', fontSize:13, marginBottom:2 }}>{toast.senderName}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{toast.preview}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); removeToast(toast.id); }}
            style={{ background:'none', border:'none', color:'var(--text-faint)', cursor:'pointer', fontSize:14, padding:'0 2px', flexShrink:0, lineHeight:1 }}>✕</button>
        </div>
      ))}
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../lib/firebase/auth';

export default function UserPanel({ onOpenSettings }) {
  const { user, profile, updateSettings } = useAuth();
  const [micMuted,  setMicMuted]  = useState(profile?.settings?.micMuted  ?? false);
  const [deafened,  setDeafened]  = useState(profile?.settings?.deafened  ?? false);
  const streamRef   = useRef(null);
  const audioCtxRef = useRef(null);

  // Sync with profile settings
  useEffect(() => {
    setMicMuted(profile?.settings?.micMuted ?? false);
    setDeafened(profile?.settings?.deafened ?? false);
  }, [profile?.settings?.micMuted, profile?.settings?.deafened]);

  async function toggleMic() {
    const next = !micMuted;
    setMicMuted(next);
    await updateSettings({ micMuted: next });

    // Actually mute/unmute the mic by stopping/starting the audio track
    try {
      if (next) {
        // Mute — stop any active mic tracks
        if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
        }
      } else {
        // Unmute — re-enable tracks
        if (streamRef.current) {
          streamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
        }
      }
    } catch {}
  }

  async function toggleDeafen() {
    const next = !deafened;
    setDeafened(next);
    // Deafening also mutes mic
    if (next && !micMuted) {
      setMicMuted(true);
      await updateSettings({ deafened: next, micMuted: true });
    } else if (!next) {
      await updateSettings({ deafened: next });
    } else {
      await updateSettings({ deafened: next });
    }
  }

  const statusColor = deafened ? 'var(--dnd)' : micMuted ? 'var(--idle)' : 'var(--online)';
  const statusText  = deafened ? '🔕 Deafened' : micMuted ? '🔇 Muted' : 'Online';

  return (
    <div style={{ height:52, background:'var(--sidebar)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 8px', gap:4, flexShrink:0 }}>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, minWidth:0, padding:'0 4px', borderRadius:6, cursor:'pointer' }} onClick={onOpenSettings}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'var(--accent)' }}>
            {profile?.photoURL
              ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : profile?.displayName?.slice(0,1).toUpperCase()
            }
          </div>
          <div style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background: statusColor, border:'2px solid var(--sidebar)' }} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {profile?.displayName || user?.email}
          </div>
          <div style={{ fontSize:11, color:'var(--text-faint)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {statusText}
          </div>
        </div>
      </div>

      <IconButton active={!micMuted} danger={micMuted} title={micMuted ? 'Unmute' : 'Mute'} onClick={toggleMic} icon={micMuted ? <MicOffIcon /> : <MicIcon />} />
      <IconButton active={!deafened} danger={deafened} title={deafened ? 'Undeafen' : 'Deafen'} onClick={toggleDeafen} icon={deafened ? <HeadphoneOffIcon /> : <HeadphoneIcon />} />
      <IconButton title="Settings" onClick={onOpenSettings} icon={<SettingsIcon />} />
    </div>
  );
}

function IconButton({ onClick, title, icon, active = true, danger = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:32, height:32, border:'none', borderRadius:6, background: hov?'var(--surface)':'transparent', color: danger?'var(--danger)':active?'var(--text-muted)':'var(--text-faint)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.1s ease', flexShrink:0 }}>
      {icon}
    </button>
  );
}

function MicIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>; }
function MicOffIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>; }
function HeadphoneIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h1v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-2v8h1c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg>; }
function HeadphoneOffIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 9.48V9c0-3.87-3.13-7-7-7-1.6 0-3.07.54-4.25 1.43L8.1 4.78C9.01 4.29 10.03 4 11.1 4 14.41 4 17.1 6.69 17.1 10v.48L18 9.48zM21 19.73L3.27 2 2 3.27l4.61 4.61C5.31 9.35 4.6 11.1 4.6 13H3c-.55 0-1 .45-1 1v4c0 1.1.9 2 2 2h2v-7h1.6c.1-1.46.58-2.81 1.35-3.95L20.73 21 21 19.73z"/></svg>; }
function SettingsIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>; }

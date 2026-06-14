import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useParticipants,
  ControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';

const LK_URL = import.meta.env.VITE_LIVEKIT_URL;

export default function VideoCall({ convId, group, callType, onEnd }) {
  const { user, profile } = useAuth();
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!convId || !user) return;
    let cancelled = false;
    async function fetchToken() {
      setLoading(true); setError(null);
      try {
        const res = await fetch('/.netlify/functions/livekit-token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            roomName:        convId,
            participantName: profile?.displayName || user.email,
            participantId:   user.uid,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setToken(data.token);
      } catch(err) {
        if (!cancelled) setError('Failed to connect: ' + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchToken();
    return () => { cancelled = true; };
  }, [convId, user?.uid]);

  function handleEnd() { setToken(null); onEnd(); }

  if (loading) return (
    <div style={overlay}>
      <div className="spinner"/>
      <span style={{ color:'var(--text-muted)', fontSize:13 }}>Connecting...</span>
    </div>
  );

  if (error) return (
    <div style={overlay}>
      <span style={{ color:'var(--danger)' }}>{error}</span>
      <div style={{ display:'flex', gap:8 }}>
        <button className="krypt-button-ghost" onClick={handleEnd}>Cancel</button>
        <button className="krypt-button" onClick={() => { setError(null); setLoading(true); }}>Retry</button>
      </div>
    </div>
  );

  if (!token || !LK_URL) return (
    <div style={overlay}>
      <span style={{ color:'var(--danger)' }}>LiveKit not configured</span>
      <button className="krypt-button-ghost" onClick={handleEnd}>Close</button>
    </div>
  );

  return (
    <div style={{ height: callType === 'audio' ? 90 : 400, background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0, overflow:'hidden' }}>
      <LiveKitRoom
        serverUrl={LK_URL}
        token={token}
        connect={true}
        video={callType === 'video'}
        audio={true}
        onDisconnected={handleEnd}
        style={{ height:'100%' }}
      >
        <RoomAudioRenderer />
        {callType === 'audio' ? (
          <AudioCallView onEnd={handleEnd} />
        ) : (
          <VideoCallView onEnd={handleEnd} />
        )}
      </LiveKitRoom>
    </div>
  );
}

function AudioCallView({ onEnd }) {
  const participants = useParticipants();
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume]         = useState(100);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 16px', gap:12 }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--online)', animation:'pulse 2s infinite', flexShrink:0 }} />
        <span style={{ color:'var(--accent)', fontWeight:600, fontSize:13 }}>Voice Connected</span>
        <div style={{ display:'flex', gap:6, alignItems:'center', overflow:'hidden' }}>
          {participants.map(p => (
            <div key={p.identity} title={p.name || p.identity}
              style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface)', border:`2px solid ${p.isSpeaking?'var(--accent)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'var(--accent)', flexShrink:0, transition:'border-color 0.15s' }}>
              {p.name?.slice(0,1).toUpperCase() || '?'}
            </div>
          ))}
        </div>
      </div>
      <CallControls onEnd={onEnd} showVolume={showVolume} setShowVolume={setShowVolume} volume={volume} setVolume={setVolume} participants={participants} showCamera={false} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function VideoCallView({ onEnd }) {
  const participants = useParticipants();
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume]         = useState(100);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Video grid */}
      <div style={{ flex:1, overflow:'hidden', background:'#000', position:'relative', minHeight:0 }}>
        <VideoConference />
      </div>
      <CallControls onEnd={onEnd} showVolume={showVolume} setShowVolume={setShowVolume} volume={volume} setVolume={setVolume} participants={participants} showCamera={true} />
    </div>
  );
}

function CallControls({ onEnd, showVolume, setShowVolume, volume, setVolume, participants, showCamera }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'6px 16px', borderTop:'1px solid var(--border)', background:'var(--panel)', flexShrink:0, flexWrap:'wrap', position:'relative' }}>
      <ControlBar
        controls={{ microphone:true, camera:showCamera, screenShare:true, leave:false }}
        style={{ background:'transparent', border:'none' }}
      />
      <button onClick={()=>setShowVolume(v=>!v)} title="Adjust volumes"
        style={{ width:34, height:34, border:`1px solid ${showVolume?'var(--accent)':'var(--border)'}`, borderRadius:8, background:'var(--elevated)', color: showVolume?'var(--accent)':'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <VolumeIcon />
      </button>
      <button onClick={onEnd}
        style={{ padding:'6px 14px', background:'var(--danger)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
        <PhoneEndIcon /> End
      </button>

      {showVolume && (
        <div style={{ position:'absolute', bottom:52, right:16, background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:12, padding:16, minWidth:260, zIndex:50, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:12 }}>
            Volume — up to <span style={{ color:'var(--accent)' }}>500%</span>
          </div>
          {participants.filter(p=>!p.isLocal).map(p=>(
            <div key={p.identity} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{p.name||p.identity}</span>
                <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>{volume}%</span>
              </div>
              <input type="range" min={0} max={500} step={5} value={volume}
                onChange={e=>setVolume(Number(e.target.value))}
                style={{ width:'100%', accentColor:'var(--accent)' }} />
            </div>
          ))}
          {participants.filter(p=>!p.isLocal).length===0 && (
            <div style={{ fontSize:12, color:'var(--text-faint)' }}>No other participants yet</div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-faint)', marginTop:4 }}>
            <span>0%</span><span>100%</span><span>200%</span><span>300%</span><span>500%</span>
          </div>
        </div>
      )}
    </div>
  );
}

const overlay = { height:90, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0 };
function VolumeIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>; }
function PhoneEndIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>; }

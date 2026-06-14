import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listenIncomingCall, acceptCall, declineCall } from '../../lib/firebase/calls';

export default function IncomingCallListener({ onAccept }) {
  const { user } = useAuth();
  const [call, setCall] = useState(null);

  useEffect(() => {
    if (!user) return;
    return listenIncomingCall(user.uid, incomingCall => {
      if (incomingCall?.status === 'ringing') {
        setCall(incomingCall);
        // Auto-cancel after 30 seconds
        setTimeout(() => setCall(null), 30000);
      } else {
        setCall(null);
      }
    });
  }, [user?.uid]);

  if (!call) return null;

  async function handleAccept() {
    await acceptCall(user.uid);
    onAccept(call.convId, call.callType);
    setCall(null);
  }

  async function handleDecline() {
    await declineCall(user.uid);
    setCall(null);
  }

  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:1000, background:'var(--elevated)', border:'1px solid var(--accent)', borderRadius:16, padding:20, width:300, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', animation:'slideUp 0.2s ease-out' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'var(--accent)', flexShrink:0, border:'2px solid var(--accent)' }}>
          {call.callerPhoto
            ? <img src={call.callerPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : call.callerName?.slice(0,1).toUpperCase()
          }
        </div>
        <div>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:15 }}>{call.callerName}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
            Incoming {call.callType === 'video' ? 'video' : call.callType === 'screen' ? 'screen share' : 'voice'} call...
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={handleDecline}
          style={{ flex:1, padding:'10px', background:'var(--danger)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>
          Decline
        </button>
        <button onClick={handleAccept}
          style={{ flex:1, padding:'10px', background:'var(--accent)', border:'none', borderRadius:10, color:'#000', fontWeight:700, cursor:'pointer', fontSize:14 }}>
          Accept
        </button>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

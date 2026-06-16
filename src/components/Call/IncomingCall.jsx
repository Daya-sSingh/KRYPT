import React from 'react';
import { useCall } from '../../context/CallContext';

export default function IncomingCallNotification() {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useCall();
  if (!incomingCall) return null;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:1000, background:'var(--elevated)', border:'1px solid var(--accent)', borderRadius:16, padding:20, width:300, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', animation:'slideUp 0.2s ease-out' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:20, color:'var(--accent)', flexShrink:0, border:'2px solid var(--accent)' }}>
          {incomingCall.callerPhoto ? <img src={incomingCall.callerPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : incomingCall.callerName?.slice(0,1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight:700, color:'var(--text)', fontSize:15 }}>{incomingCall.callerName}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Incoming {incomingCall.callType === 'video' ? 'video' : incomingCall.callType === 'screen' ? 'screen share' : 'voice'} call...</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={declineIncomingCall} style={{ flex:1, padding:'10px', background:'var(--danger)', border:'none', borderRadius:10, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>Decline</button>
        <button onClick={acceptIncomingCall} style={{ flex:1, padding:'10px', background:'var(--accent)', border:'none', borderRadius:10, color:'#000', fontWeight:700, cursor:'pointer', fontSize:14 }}>Accept</button>
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

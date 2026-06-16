import React, { useState } from 'react';
import ServerSidebar from './ServerSidebar';
import ChannelSidebar from './ChannelSidebar';
import ChatArea from '../Chat/ChatArea';
import MembersSidebar from './MembersSidebar';
import UserPanel from './UserPanel';
import SettingsModal from '../Settings/SettingsModal';
import { useCall } from '../../context/CallContext';
import { NotificationProvider, useNotifications } from '../../context/NotificationContext';
import IncomingCallNotification from '../Call/IncomingCall';
import MessageToasts from '../UI/MessageToasts';

function AppLayoutInner() {
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [activeConvId,  setActiveConvId]  = useState(null);
  const [activeGroup,   setActiveGroup]   = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showMembers,   setShowMembers]   = useState(true);
  const { inCall, callConvId, callType, endCall, startCall } = useCall();
  const { markRead } = useNotifications();

  function handleSelectDM(id) {
    setActiveConvId(id);
    setActiveChannel(null);
    markRead(id);
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <ServerSidebar
        onSelectGroup={g => { setActiveGroup(g); setActiveConvId(null); setActiveChannel(null); }}
        onSelectDMs={() => { setActiveGroup(null); setActiveConvId(null); setActiveChannel(null); }}
        activeGroup={activeGroup}
      />
      <ChannelSidebar
        group={activeGroup}
        activeConvId={activeConvId}
        activeChannel={activeChannel}
        onSelectDM={handleSelectDM}
        onSelectChannel={ch => { setActiveChannel(ch); setActiveConvId(null); }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <ChatArea
          convId={activeConvId}
          group={activeGroup}
          channel={activeChannel}
          onToggleMembers={() => setShowMembers(v=>!v)}
          showMembers={showMembers}
          inCall={inCall && callConvId === activeConvId}
          setInCall={(v) => { if (!v) endCall(); }}
          callConvId={callConvId}
          callType={callType}
          setCallType={() => {}}
          setCallConvId={() => {}}
          onStartCall={(convId, type) => startCall(convId, type)}
        />
      </div>
      {showMembers && (activeGroup || activeConvId) && (
        <MembersSidebar group={activeGroup} convId={activeConvId} />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {inCall && callConvId && callConvId !== activeConvId && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:999, background:'var(--elevated)', border:'1px solid #ffffff33', borderRadius:12, padding:'10px 20px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.5)' }}
          onClick={() => handleSelectDM(callConvId)}>
          <span style={{ fontSize:18 }}>📞</span>
          <span style={{ color:'#fff', fontWeight:600, fontSize:14 }}>Call in progress — click to return</span>
          <button onClick={e => { e.stopPropagation(); endCall(); }}
            style={{ marginLeft:8, background:'var(--danger)', border:'none', borderRadius:8, color:'#fff', fontWeight:700, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>
            End
          </button>
        </div>
      )}
      <IncomingCallNotification />
      <MessageToasts onNavigate={handleSelectDM} />
    </div>
  );
}

export default function AppLayout() {
  const [activeConvId] = useState(null);
  return (
    <NotificationProvider activeConvId={activeConvId}>
      <AppLayoutInner />
    </NotificationProvider>
  );
}

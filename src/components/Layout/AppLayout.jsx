import React, { useState } from 'react';
import ServerSidebar from './ServerSidebar';
import ChannelSidebar from './ChannelSidebar';
import ChatArea from '../Chat/ChatArea';
import MembersSidebar from './MembersSidebar';
import UserPanel from './UserPanel';
import SettingsModal from '../Settings/SettingsModal';
import IncomingCallListener from '../Call/IncomingCall';

export default function AppLayout() {
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [activeConvId,  setActiveConvId]  = useState(null);
  const [activeGroup,   setActiveGroup]   = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showMembers,   setShowMembers]   = useState(true);
  const [inCall,        setInCall]        = useState(false);
  const [callConvId,    setCallConvId]    = useState(null);
  const [callType,      setCallType]      = useState(null);

  function handleAcceptCall(convId, type) {
    setActiveConvId(convId);
    setCallConvId(convId);
    setCallType(type);
    setInCall(true);
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      <ServerSidebar
        onSelectGroup={g => { setActiveGroup(g); setActiveConvId(null); setActiveChannel(null); setInCall(false); }}
        onSelectDMs={() => { setActiveGroup(null); setActiveConvId(null); setActiveChannel(null); setInCall(false); }}
        activeGroup={activeGroup}
      />
      <ChannelSidebar
        group={activeGroup}
        activeConvId={activeConvId}
        activeChannel={activeChannel}
        onSelectDM={id => { setActiveConvId(id); setActiveChannel(null); setInCall(false); }}
        onSelectChannel={ch => { setActiveChannel(ch); setActiveConvId(null); setInCall(false); }}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <ChatArea
          convId={activeConvId}
          group={activeGroup}
          channel={activeChannel}
          onToggleMembers={() => setShowMembers(v=>!v)}
          showMembers={showMembers}
          inCall={inCall}
          setInCall={setInCall}
          callConvId={callConvId}
          callType={callType}
          setCallType={setCallType}
          setCallConvId={setCallConvId}
        />
      </div>
      {showMembers && (activeGroup || activeConvId) && (
        <MembersSidebar group={activeGroup} convId={activeConvId} />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* Global incoming call listener */}
      <IncomingCallListener onAccept={handleAcceptCall} />
    </div>
  );
}

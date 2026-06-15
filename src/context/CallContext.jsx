import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { listenIncomingCall, acceptCall, declineCall } from '../lib/firebase/calls';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { user } = useAuth();
  const [inCall,       setInCall]       = useState(false);
  const [callConvId,   setCallConvId]   = useState(null);
  const [callType,     setCallType]     = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!user) return;
    return listenIncomingCall(user.uid, call => {
      if (call?.status === 'ringing') {
        setIncomingCall(call);
        setTimeout(() => setIncomingCall(null), 30000);
      } else {
        setIncomingCall(null);
      }
    });
  }, [user?.uid]);

  function startCall(convId, type) {
    setCallConvId(convId);
    setCallType(type);
    setInCall(true);
  }

  async function acceptIncomingCall() {
    if (!incomingCall) return;
    await acceptCall(user.uid);
    startCall(incomingCall.convId, incomingCall.callType);
    setIncomingCall(null);
  }

  async function declineIncomingCall() {
    if (!incomingCall) return;
    await declineCall(user.uid);
    setIncomingCall(null);
  }

  function endCall() {
    setInCall(false);
    setCallConvId(null);
    setCallType(null);
  }

  return (
    <CallContext.Provider value={{ inCall, callConvId, callType, incomingCall, startCall, endCall, acceptIncomingCall, declineIncomingCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listenMessages, sendMessage, addReaction, deleteMessage } from '../../lib/firebase/firestore';
import { setTyping, listenTyping } from '../../lib/firebase/presence';
import { getUserProfile } from '../../lib/firebase/auth';
import { initiateCall, cancelCall } from '../../lib/firebase/calls';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebase';
import MessageInput from './MessageInput';
import Message from './Message';
import VideoCall from '../Call/VideoCall';

export default function ChatArea({ convId, group, channel, onToggleMembers, showMembers, inCall, setInCall, callConvId, callType, setCallType, setCallConvId }) {
  const { user, profile } = useAuth();
  const [messages,  setMessages]  = useState([]);
  const [typers,    setTypers]    = useState([]);
  const [typerNames,setTyperNames]= useState({});
  const [calling,   setCalling]   = useState(false);
  const bottomRef = useRef(null);

  const effectiveId = channel
    ? `${group?.id}_${channel?.id}`
    : convId || null;

  useEffect(() => {
    if (!effectiveId || !user) return;
    setMessages([]);
    const unsub  = listenMessages(effectiveId, user.uid, msgs => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
    });
    const unsubT = listenTyping(effectiveId, user.uid, async uids => {
      setTypers(uids);
      for (const uid of uids) {
        if (!typerNames[uid]) {
          const prof = await getUserProfile(uid);
          setTyperNames(n => ({ ...n, [uid]: prof?.displayName || 'Someone' }));
        }
      }
    });
    return () => { unsub(); unsubT(); };
  }, [effectiveId, user?.uid]);

  async function handleSend(content, type='text', meta={}) {
    if (!effectiveId || !content) return;
    await sendMessage(effectiveId, user.uid, content, type, meta);
    setTyping(effectiveId, user.uid, false);
  }

  async function handleStartCall(type) {
    if (!effectiveId) return;
    setCallType(type);
    setCallConvId(effectiveId);
    setInCall(true);
    setCalling(true);
    try {
      const baseConvId = effectiveId.includes('_') ? effectiveId.split('_')[0] : effectiveId;
      const convSnap   = await getDoc(doc(db, 'conversations', baseConvId));
      const members    = convSnap.data()?.members || [];
      await Promise.all(
        members.filter(uid => uid !== user.uid).map(uid =>
          initiateCall(user.uid, profile?.displayName || 'Someone', profile?.photoURL || null, uid, effectiveId, type)
        )
      );
    } catch(err) { console.error('Call notify failed:', err); }
    setTimeout(() => setCalling(false), 30000);
  }

  function handleEndCall() {
    setCallType(null); setCallConvId(null); setInCall(false); setCalling(false);
  }

  const isVoiceChannel = channel?.type === 'voice';
  const title = channel
    ? `${channel.type==='voice'?'🔊':'#'} ${channel.name}`
    : convId ? 'Direct Message' : 'Select a conversation';
  const showCall = inCall && callConvId === effectiveId;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg)', overflow:'hidden' }}>
      <div style={{ height:48, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid var(--border)', gap:12, flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:15, color:'var(--text)', flex:1 }}>{title}</span>
        {effectiveId && !isVoiceChannel && (
          <div style={{ display:'flex', gap:4 }}>
            {[['Voice Call','audio',PhoneIcon],['Video Call','video',VideoIcon],['Screen Share','screen',ScreenIcon]].map(([t,ct,Icon])=>(
              <TopBtn key={ct} title={t} onClick={()=>handleStartCall(ct)}><Icon /></TopBtn>
            ))}
            <TopBtn title={showMembers?'Hide Members':'Show Members'} onClick={onToggleMembers}><PeopleIcon /></TopBtn>
          </div>
        )}
      </div>

      {calling && !showCall && (
        <div style={{ padding:'8px 16px', background:'rgba(57,255,106,0.08)', borderBottom:'1px solid var(--accent)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', animation:'callpulse 1s infinite' }} />
          <span style={{ fontSize:13, color:'var(--accent)', fontWeight:600 }}>Calling...</span>
          <button onClick={handleEndCall} style={{ marginLeft:'auto', background:'var(--danger)', border:'none', borderRadius:6, color:'#fff', padding:'4px 10px', fontSize:12, cursor:'pointer', fontWeight:600 }}>Cancel</button>
          <style>{`@keyframes callpulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
        </div>
      )}

      {showCall && <VideoCall convId={callConvId} group={group} callType={callType} onEnd={handleEndCall} />}

      {!isVoiceChannel && effectiveId && (
        <div style={{ flex:1, overflowY:'auto', padding:'16px 0', display:'flex', flexDirection:'column' }}>
          {messages.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, color:'var(--text-faint)', gap:8 }}>
              <div style={{ fontSize:48 }}>🔒</div>
              <div style={{ fontSize:14 }}>End-to-end encrypted. Send the first message!</div>
            </div>
          )}
          {messages.map((msg,i) => (
            <Message key={msg.id} message={msg} prevMessage={messages[i-1]} currentUid={user.uid}
              onReact={emoji=>addReaction(effectiveId,msg.id,user.uid,emoji)}
              onDelete={()=>deleteMessage(effectiveId,msg.id)} />
          ))}
          {typers.length > 0 && (
            <div style={{ padding:'0 16px 4px', fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 }}>
              <TypingDots />
              <span>{typers.map(u=>typerNames[u]||'...').join(', ')}{typers.length===1?' is typing...':' are typing...'}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {!effectiveId && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:48 }}>💬</div>
          <div style={{ fontSize:14 }}>Select a conversation to start chatting</div>
        </div>
      )}

      {isVoiceChannel && !showCall && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'var(--text-faint)' }}>
          <div style={{ fontSize:48 }}>🔊</div>
          <div style={{ fontSize:16, color:'var(--text-muted)', fontWeight:600 }}>{channel.name}</div>
          <button className="krypt-button" onClick={()=>handleStartCall('audio')}>Join Channel</button>
        </div>
      )}

      {!isVoiceChannel && effectiveId && (
        <MessageInput convId={effectiveId} onSend={handleSend}
          onTyping={t=>setTyping(effectiveId,user.uid,t)}
          placeholder={channel?`Message #${channel.name}`:'Send an encrypted message...'} />
      )}
    </div>
  );
}

function TopBtn({ title, onClick, children }) {
  const [hov,setHov]=useState(false);
  return <button onClick={onClick} title={title} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{ width:32,height:32,border:'none',borderRadius:6,background:hov?'var(--surface)':'transparent',color:'var(--text-muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.1s ease' }}>{children}</button>;
}
function TypingDots() {
  return <div style={{ display:'flex',gap:3,alignItems:'center' }}>{[0,1,2].map(i=><div key={i} style={{ width:4,height:4,borderRadius:'50%',background:'var(--text-muted)',animation:`tdot 1.2s ${i*0.2}s infinite` }}/>)}<style>{`@keyframes tdot{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style></div>;
}
function PhoneIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>; }
function VideoIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>; }
function ScreenIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>; }
function PeopleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>; }

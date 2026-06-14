import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../lib/firebase/auth';
import { listenMultiPresence } from '../../lib/firebase/presence';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebase';

export default function MembersSidebar({ group, convId }) {
  const { user } = useAuth();
  const [members,         setMembers]         = useState([]);
  const [presence,        setPresence]        = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (!group && !convId) return;
    let unsubPresence = () => {};

    if (group?.id) {
      const unsub = onSnapshot(doc(db, 'conversations', group.id), async snap => {
        if (!snap.exists()) return;
        const uids     = snap.data()?.members || [];
        const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
        const valid    = profiles.filter(Boolean);
        setMembers(valid);
        if (valid.length > 0) {
          unsubPresence();
          unsubPresence = listenMultiPresence(valid.map(m => m.uid), setPresence);
        }
      });
      return () => { unsub(); unsubPresence(); };
    } else if (convId) {
      getDoc(doc(db, 'conversations', convId)).then(async snap => {
        const uids     = snap.data()?.members || [];
        const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
        const valid    = profiles.filter(Boolean);
        setMembers(valid);
        if (valid.length > 0) {
          unsubPresence = listenMultiPresence(valid.map(m => m.uid), setPresence);
        }
      });
      return () => unsubPresence();
    }
  }, [group?.id, convId]);

  const online  = members.filter(m => presence[m.uid]?.online);
  const offline = members.filter(m => !presence[m.uid]?.online);

  return (
    <div style={{ width:240, background:'var(--panel)', borderLeft:'1px solid var(--border)', overflowY:'auto', padding:'16px 8px', flexShrink:0 }}>
      {online.length > 0 && (
        <>
          <SectionLabel label={`Online — ${online.length}`} />
          {online.map(m => <MemberRow key={m.uid} profile={m} online onViewProfile={() => setSelectedProfile(m)} />)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <SectionLabel label={`Offline — ${offline.length}`} />
          {offline.map(m => <MemberRow key={m.uid} profile={m} online={false} onViewProfile={() => setSelectedProfile(m)} />)}
        </>
      )}
      {selectedProfile && <ProfilePopup profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
    </div>
  );
}

function ProfilePopup({ profile, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, width:320, overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,0.6)' }} onClick={e=>e.stopPropagation()}>
        {/* Clean banner — no gradient that covers pfp */}
        <div style={{ height:60, background:'var(--surface)', position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.4)', border:'none', borderRadius:'50%', width:28, height:28, color:'var(--text)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        {/* Avatar sits below banner — not covered by it */}
        <div style={{ padding:'0 16px', marginTop:-32, marginBottom:8 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', border:'4px solid var(--panel)', overflow:'hidden', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:24, color:'var(--accent)' }}>
            {profile.photoURL
              ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : profile.displayName?.slice(0,1).toUpperCase()
            }
          </div>
        </div>
        <div style={{ padding:'0 16px 20px' }}>
          <div style={{ fontWeight:700, fontSize:18, color:'var(--text)' }}>{profile.displayName}</div>
          <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:12 }}>{profile.email}</div>
          {profile.bio
            ? <div style={{ background:'var(--surface)', borderRadius:8, padding:'10px 12px', fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>{profile.bio}</div>
            : <div style={{ fontSize:13, color:'var(--text-faint)', fontStyle:'italic' }}>No bio set.</div>
          }
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'8px 8px 4px' }}>{label}</div>;
}

function MemberRow({ profile, online, onViewProfile }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onViewProfile}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px', borderRadius:6, cursor:'pointer', background: hov?'var(--surface)':'transparent', opacity: online?1:0.5, transition:'all 0.1s ease' }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--elevated)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'var(--accent)' }}>
          {profile.photoURL
            ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : profile.displayName?.slice(0,1).toUpperCase()
          }
        </div>
        <div style={{ position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background: online?'var(--online)':'var(--offline)', border:'2px solid var(--panel)' }} />
      </div>
      <span style={{ fontSize:14, color:'var(--text-muted)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile.displayName}</span>
    </div>
  );
}

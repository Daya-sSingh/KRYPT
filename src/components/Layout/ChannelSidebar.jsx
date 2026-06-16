import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listenConversations, createDM } from '../../lib/firebase/firestore';
import { getUserProfile, searchUsers, getFriendRequests, acceptFriendRequest } from '../../lib/firebase/auth';
import { updateDoc, doc, arrayRemove } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebase';
import UserPanel from './UserPanel';
import { useNotifications } from '../../context/NotificationContext';
import { useCall } from '../../context/CallContext';

export default function ChannelSidebar({ group, activeConvId, activeChannel, onSelectDM, onSelectChannel, onOpenSettings }) {
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { callConvId } = useCall();
  const [dms, setDms]                   = useState([]);
  const [dmProfiles, setDmProfiles]     = useState({});
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [requests, setRequests]         = useState([]);
  const [showAddMembers, setShowAddMembers] = useState(false); // for adding to existing group
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberResults, setAddMemberResults] = useState([]);

  useEffect(() => {
    if (!user || group) return;
    return listenConversations(user.uid, convs => {
      const dmList = convs.filter(c => c.type === 'dm');
      setDms(dmList);
      dmList.forEach(async dm => {
        const otherId = dm.members.find(m => m !== user.uid);
        if (otherId) {
          const prof = await getUserProfile(otherId);
          setDmProfiles(p => ({ ...p, [otherId]: prof }));
        }
      });
    });
  }, [user, group]);

  useEffect(() => {
    if (!user) return;
    getFriendRequests(user.uid).then(setRequests);
  }, [user]);

  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchUsers(searchTerm);
      setSearchResults(r.filter(u => u.uid !== user.uid));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!addMemberSearch.trim()) { setAddMemberResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchUsers(addMemberSearch);
      const existing = group?.members || [];
      setAddMemberResults(r.filter(u => u.uid !== user.uid && !existing.includes(u.uid)));
    }, 300);
    return () => clearTimeout(t);
  }, [addMemberSearch, group]);

  async function handleAccept(fromUid) {
    await acceptFriendRequest(fromUid, user.uid);
    const convId = await createDM(user.uid, fromUid);
    onSelectDM(convId);
    setRequests(r => r.filter(req => req.from !== fromUid));
  }

  async function handleStartDM(otherUid) {
    const convId = await createDM(user.uid, otherUid);
    onSelectDM(convId);
    setShowAddFriend(false);
    setSearchTerm('');
    setSearchResults([]);
  }

  async function handleRemoveDM(dmId) {
    // Remove current user from the DM conversation
    await updateDoc(doc(db, 'conversations', dmId), {
      members: arrayRemove(user.uid),
    });
  }

  async function handleAddToGroup(memberUid) {
    if (!group?.id) return;
    const { addMemberToGroup } = await import('../../lib/firebase/firestore.js');
    await addMemberToGroup(group.id, memberUid, user.uid);
    setAddMemberSearch('');
    setAddMemberResults([]);
    setShowAddMembers(false);
  }

  return (
    <div style={{ width:240, background:'var(--panel)', display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)', flexShrink:0 }}>
      {/* Header */}
      <div style={{ height:48, display:'flex', alignItems:'center', padding:'0 12px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:15, color:'var(--text)', flexShrink:0, gap:8 }}>
        <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{group ? group.name : 'Direct Messages'}</span>
        {!group && (
          <button onClick={()=>setShowAddFriend(v=>!v)} title="Find or add someone"
            style={{ background:'none', border:'none', cursor:'pointer', color: showAddFriend?'var(--accent)':'var(--text-muted)', fontSize:22, padding:'0 2px', lineHeight:1, flexShrink:0 }}>+</button>
        )}
        {group && group.ownerId === user.uid && (
          <button onClick={()=>setShowAddMembers(v=>!v)} title="Add members"
            style={{ background:'none', border:'none', cursor:'pointer', color: showAddMembers?'var(--accent)':'var(--text-muted)', fontSize:22, padding:'0 2px', lineHeight:1, flexShrink:0 }}>+</button>
        )}
      </div>

      {/* Add friend panel */}
      {!group && showAddFriend && (
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
          <input className="krypt-input" placeholder="Search by name or email..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} autoFocus style={{ fontSize:13 }} />
          {searchResults.length > 0 && (
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
              {searchResults.map(u => (
                <div key={u.uid} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--elevated)', borderRadius:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--accent)', fontSize:12, flexShrink:0, overflow:'hidden' }}>
                    {u.photoURL ? <img src={u.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : u.displayName?.slice(0,1).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'var(--text)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.displayName}</div>
                    <div style={{ fontSize:11, color:'var(--text-faint)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.email}</div>
                  </div>
                  <button onClick={()=>handleStartDM(u.uid)}
                    style={{ background:'var(--accent)', border:'none', borderRadius:6, color:'#000', fontSize:11, fontWeight:700, padding:'4px 8px', cursor:'pointer', flexShrink:0 }}>
                    Message
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchTerm.length > 1 && searchResults.length === 0 && (
            <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:6, textAlign:'center' }}>No users found</div>
          )}
        </div>
      )}

      {/* Add members to existing group panel */}
      {group && showAddMembers && (
        <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Add Members</div>
          <input className="krypt-input" placeholder="Search by name or email..." value={addMemberSearch} onChange={e=>setAddMemberSearch(e.target.value)} autoFocus style={{ fontSize:13 }} />
          {addMemberResults.length > 0 && (
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
              {addMemberResults.map(u => (
                <div key={u.uid} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:'var(--elevated)', borderRadius:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--accent)', fontSize:12, flexShrink:0, overflow:'hidden' }}>
                    {u.photoURL ? <img src={u.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : u.displayName?.slice(0,1).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:'var(--text)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.displayName}</div>
                  </div>
                  <button onClick={()=>handleAddToGroup(u.uid)}
                    style={{ background:'var(--accent)', border:'none', borderRadius:6, color:'#000', fontSize:11, fontWeight:700, padding:'4px 8px', cursor:'pointer', flexShrink:0 }}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
          {addMemberSearch.length > 1 && addMemberResults.length === 0 && (
            <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:6, textAlign:'center' }}>No users found</div>
          )}
        </div>
      )}

      {/* Friend requests */}
      {!group && requests.length > 0 && (
        <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Friend Requests</div>
          {requests.map(req => (
            <FriendRequestRow key={req.from} req={req} onAccept={()=>handleAccept(req.from)} />
          ))}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {group ? (
          <>
            <SectionHeader label="Text Channels" />
            {group.channels?.filter(c=>c.type==='text').map(ch=>(
              <ChannelRow key={ch.id} channel={ch} active={activeChannel?.id===ch.id} onClick={()=>onSelectChannel(ch)} type="text" />
            ))}
            <SectionHeader label="Voice Channels" />
            {group.channels?.filter(c=>c.type==='voice').map(ch=>(
              <ChannelRow key={ch.id} channel={ch} active={activeChannel?.id===ch.id} onClick={()=>onSelectChannel(ch)} type="voice" />
            ))}
          </>
        ) : (
          <>
            <div style={{ padding:'8px 12px 4px', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Direct Messages</div>
            {dms.map(dm => {
              const otherId = dm.members.find(m=>m!==user.uid);
              const prof = dmProfiles[otherId];
              return (
                <DMRow key={dm.id} profile={prof} active={activeConvId===dm.id}
                  onClick={()=>onSelectDM(dm.id)}
                  onRemove={()=>handleRemoveDM(dm.id)}
                  unreadCount={unread[dm.id] || 0}
                  inCall={callConvId === dm.id}
                />
              );
            })}
            {dms.length === 0 && (
              <div style={{ padding:'16px 12px', fontSize:13, color:'var(--text-faint)', textAlign:'center', lineHeight:1.5 }}>
                No messages yet.<br/>Click + to find someone.
              </div>
            )}
          </>
        )}
      </div>

      <UserPanel onOpenSettings={onOpenSettings} />
    </div>
  );
}

function FriendRequestRow({ req, onAccept }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { getUserProfile(req.from).then(setProfile); }, [req.from]);
  if (!profile) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--accent)', fontSize:12, flexShrink:0 }}>
        {profile.displayName?.slice(0,1).toUpperCase()}
      </div>
      <div style={{ flex:1, fontSize:13, color:'var(--text)', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.displayName}</div>
      <button onClick={onAccept} style={{ background:'var(--accent)', border:'none', borderRadius:6, color:'#000', fontSize:11, fontWeight:700, padding:'4px 8px', cursor:'pointer', flexShrink:0 }}>Accept</button>
    </div>
  );
}

function SectionHeader({ label }) {
  return <div style={{ padding:'16px 8px 4px 16px', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</div>;
}

function ChannelRow({ channel, active, onClick, type }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px 4px 16px', marginInline:8, borderRadius:6, cursor:'pointer', background: active?'var(--elevated)':hov?'var(--surface)':'transparent', color: active?'var(--text)':'var(--text-muted)', transition:'all 0.1s ease' }}>
      <span style={{ fontSize:16, opacity:0.7 }}>{type==='voice'?'🔊':'#'}</span>
      <span style={{ fontSize:14, fontWeight: active?600:400 }}>{channel.name}</span>
    </div>
  );
}

function DMRow({ profile, active, onClick, onRemove, unreadCount, inCall }) {
  const [hov, setHov] = useState(false);
  if (!profile) return null;
  const hasUnread = unreadCount > 0;
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px', marginInline:8, borderRadius:6, cursor:'pointer', background: active?'var(--elevated)':hov?'var(--surface)':'transparent', transition:'all 0.1s ease', position:'relative',
        outline: hasUnread ? '1.5px solid var(--danger)' : inCall ? '1.5px solid #ffffff66' : 'none',
      }}>
      <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--accent)',
            boxShadow: inCall ? '0 0 0 2px #fff' : 'none',
          }}>
            {profile.photoURL ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : profile.displayName?.slice(0,1).toUpperCase()}
          </div>
          {/* Presence/unread dot */}
          <div style={{
            position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%',
            background: hasUnread ? 'var(--danger)' : inCall ? '#ffffff' : profile.status==='online' ? 'var(--online)' : 'var(--offline)',
            border:'2px solid var(--panel)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {hasUnread && unreadCount > 0 && (
              <span style={{ position:'absolute', top:-8, right:-8, minWidth:16, height:16, borderRadius:8, background:'var(--danger)', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', border:'2px solid var(--panel)' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight: active||hasUnread?600:400, color: active||hasUnread?'var(--text)':'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile.displayName}</div>
        </div>
        {/* Phone icon when in call */}
        {inCall && <span style={{ fontSize:13, flexShrink:0 }}>📞</span>}
      </div>
      {hov && (
        <button
          onClick={e=>{ e.stopPropagation(); onRemove(); }}
          title="Remove conversation"
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', fontSize:14, padding:'2px 4px', borderRadius:4, flexShrink:0, lineHeight:1 }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--danger)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--text-faint)'}
        >✕</button>
      )}
    </div>
  );
}

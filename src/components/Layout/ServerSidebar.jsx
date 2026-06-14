import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listenConversations, createGroup } from '../../lib/firebase/firestore';
import { searchUsers } from '../../lib/firebase/auth';
import { leaveGroup, deleteGroup } from '../../lib/firebase/groups';

const ICON_SIZE = 48;

export default function ServerSidebar({ onSelectGroup, onSelectDMs, activeGroup }) {
  const { user, profile } = useAuth();
  const [groups,   setGroups]   = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [search,   setSearch]   = useState('');
  const [results,  setResults]  = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [ctxMenu,  setCtxMenu]  = useState(null); // { groupId, x, y, isOwner }
  const [confirming, setConfirming] = useState(null); // 'leave' | 'delete'

  useEffect(() => {
    if (!user) return;
    return listenConversations(user.uid, convs => {
      setGroups(convs.filter(c => c.type === 'group'));
    });
  }, [user]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await searchUsers(search);
      setResults(r.filter(u => u.uid !== user.uid && !selected.find(s => s.uid === u.uid)));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [ctxMenu]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const memberUids = selected.map(s => s.uid);
      await createGroup(user.uid, newName.trim(), memberUids);
      setNewName(''); setCreating(false); setSelected([]); setSearch(''); setResults([]);
    } catch(err) {
      alert('Failed to create group: ' + err.message);
    }
    setLoading(false);
  }

  function addMember(u) { setSelected(s => [...s, u]); setSearch(''); setResults([]); }
  function removeMember(uid) { setSelected(s => s.filter(m => m.uid !== uid)); }

  function handleRightClick(e, group) {
    e.preventDefault();
    setCtxMenu({
      groupId:  group.id,
      group,
      x:        e.clientX,
      y:        e.clientY,
      isOwner:  group.ownerId === user.uid,
    });
  }

  async function handleLeave() {
    if (!ctxMenu) return;
    setCtxMenu(null);
    await leaveGroup(ctxMenu.groupId, user.uid);
    if (activeGroup?.id === ctxMenu.groupId) onSelectDMs();
  }

  async function handleDelete() {
    if (!ctxMenu) return;
    setCtxMenu(null);
    await deleteGroup(ctxMenu.groupId);
    if (activeGroup?.id === ctxMenu.groupId) onSelectDMs();
  }

  return (
    <div style={{ width:72, background:'var(--sidebar)', display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0', gap:8, overflowY:'auto', borderRight:'1px solid var(--border)', flexShrink:0 }}>
      <ServerIcon label="Direct Messages" active={!activeGroup} onClick={onSelectDMs} isHome
        content={<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>}
      />
      <Divider />

      {groups.map(g => (
        <ServerIcon key={g.id} label={g.name} active={activeGroup?.id === g.id}
          onClick={() => onSelectGroup(g)}
          onRightClick={e => handleRightClick(e, g)}
          content={<span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{g.name.slice(0,2).toUpperCase()}</span>}
        />
      ))}

      <ServerIcon label="Create Group" onClick={() => setCreating(true)} isAdd
        content={<span style={{ fontSize:28, fontWeight:300, color:'var(--accent)', lineHeight:1 }}>+</span>}
      />
      <div style={{ flex:1 }} />
      <Divider />
      <div title={profile?.displayName} style={{ width:ICON_SIZE, height:ICON_SIZE, borderRadius:'50%', overflow:'hidden', cursor:'pointer', border:'2px solid var(--accent)', flexShrink:0 }} onClick={onSelectDMs}>
        {profile?.photoURL
          ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ width:'100%', height:'100%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'var(--accent)' }}>
              {profile?.displayName?.slice(0,1).toUpperCase()}
            </div>
        }
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div style={{ position:'fixed', top:ctxMenu.y, left:ctxMenu.x, background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:8, padding:4, zIndex:1000, minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding:'4px 8px 6px', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {ctxMenu.group.name}
          </div>
          {ctxMenu.isOwner ? (
            <CtxItem label="🗑️ Delete Group" danger onClick={() => { setConfirming('delete'); }} />
          ) : (
            <CtxItem label="🚪 Leave Group" danger onClick={() => { setConfirming('leave'); }} />
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {confirming && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:24, width:340, display:'flex', flexDirection:'column', gap:16 }}>
            <h3 style={{ color:'var(--text)', margin:0 }}>
              {confirming === 'delete' ? 'Delete Group?' : 'Leave Group?'}
            </h3>
            <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>
              {confirming === 'delete'
                ? 'This will permanently delete the group and all messages. This cannot be undone.'
                : 'You will leave this group and lose access to its messages.'}
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="krypt-button-ghost" onClick={() => { setConfirming(null); setCtxMenu(null); }}>Cancel</button>
              <button onClick={() => { setConfirming(null); confirming === 'delete' ? handleDelete() : handleLeave(); }}
                style={{ padding:'10px 20px', background:'var(--danger)', border:'none', borderRadius:6, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
                {confirming === 'delete' ? 'Delete' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {creating && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:420, display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ color:'var(--text)', margin:0, fontSize:18 }}>Create a Group</h2>
            <div>
              <label style={labelSt}>Group Name</label>
              <input className="krypt-input" placeholder="My group..." value={newName} onChange={e=>setNewName(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={labelSt}>Add Members (optional)</label>
              <input className="krypt-input" placeholder="Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} />
              {results.length > 0 && (
                <div style={{ background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:8, marginTop:4, overflow:'hidden', maxHeight:180, overflowY:'auto' }}>
                  {results.map(u => (
                    <div key={u.uid} onClick={() => addMember(u)}
                      style={{ padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--accent)', fontSize:13, flexShrink:0 }}>
                        {u.displayName?.slice(0,1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{u.displayName}</div>
                        <div style={{ fontSize:11, color:'var(--text-faint)' }}>{u.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selected.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {selected.map(m => (
                  <div key={m.uid} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'var(--accent-glow)', border:'1px solid var(--accent)', borderRadius:20, fontSize:13, color:'var(--accent)' }}>
                    {m.displayName}
                    <span onClick={() => removeMember(m.uid)} style={{ cursor:'pointer', opacity:0.7 }}>✕</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="krypt-button-ghost" onClick={() => { setCreating(false); setSelected([]); setNewName(''); setSearch(''); }}>Cancel</button>
              <button className="krypt-button" onClick={handleCreate} disabled={!newName.trim() || loading}>
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CtxItem({ label, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:'8px 12px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500, color: danger?'var(--danger)':'var(--text)', background: hov?(danger?'rgba(255,68,68,0.1)':'var(--surface)'):'transparent', transition:'all 0.1s ease' }}>
      {label}
    </div>
  );
}

function ServerIcon({ label, active, onClick, onRightClick, content, isHome, isAdd }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position:'relative', width:ICON_SIZE }}>
      {active && <div style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)', width:4, height:32, background:'var(--accent)', borderRadius:'0 4px 4px 0' }} />}
      {hov && !active && <div style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)', width:4, height:16, background:'var(--text)', borderRadius:'0 4px 4px 0' }} />}
      <div
        onClick={onClick}
        onContextMenu={onRightClick}
        onMouseEnter={()=>setHov(true)}
        onMouseLeave={()=>setHov(false)}
        title={label}
        style={{ width:ICON_SIZE, height:ICON_SIZE, borderRadius: active||hov?'16px':'50%', background: isHome&&(active||hov)?'var(--accent)':'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s ease', border: active?'2px solid var(--accent)':'2px solid transparent', color: isHome&&(active||hov)?'#000':'var(--text-muted)', overflow:'hidden', flexShrink:0 }}>
        {content}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ width:32, height:2, background:'var(--border)', borderRadius:1, flexShrink:0 }} />;
}

const labelSt = { display:'block', fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 };

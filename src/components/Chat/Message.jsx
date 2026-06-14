import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../../lib/firebase/auth';
import { format, isToday, isYesterday } from 'date-fns';

export default function Message({ message, prevMessage, currentUid, onReact, onDelete }) {
  const [author,   setAuthor]   = useState(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (message.senderId) getUserProfile(message.senderId).then(setAuthor);
  }, [message.senderId]);

  if (message.deleted) {
    return (
      <div style={{ padding:'2px 16px', color:'var(--text-faint)', fontStyle:'italic', fontSize:13 }}>
        🗑️ This message was deleted.
      </div>
    );
  }

  const isOwn          = message.senderId === currentUid;
  const prevSameSender = prevMessage?.senderId === message.senderId &&
    prevMessage?.timestamp?.seconds &&
    message.timestamp?.seconds - prevMessage.timestamp.seconds < 300;

  const ts      = message.timestamp?.toDate?.() || new Date();
  const timeStr = format(ts, 'HH:mm');
  const dateStr = isToday(ts) ? 'Today' : isYesterday(ts) ? 'Yesterday' : format(ts, 'MMM d, yyyy');

  let content  = message.content;
  let fileData = null;
  if (message.type !== 'text' && message.type !== 'gif') {
    try { fileData = JSON.parse(content); content = null; } catch {}
  }

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ padding: prevSameSender ? '1px 16px' : '8px 16px 1px', display:'flex', gap:12, position:'relative', background: hovering ? 'rgba(255,255,255,0.02)' : 'transparent', transition:'background 0.1s ease' }}
    >
      <div style={{ width:40, flexShrink:0, paddingTop: prevSameSender ? 0 : 2 }}>
        {!prevSameSender && (
          <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, color:'var(--accent)' }}>
            {author?.photoURL
              ? <img src={author.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : author?.displayName?.slice(0,1).toUpperCase() || '?'
            }
          </div>
        )}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        {!prevSameSender && (
          <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:2 }}>
            <span style={{ fontWeight:600, fontSize:14, color: isOwn ? 'var(--accent)' : 'var(--text)' }}>
              {author?.displayName || 'Unknown'}
            </span>
            <span style={{ fontSize:11, color:'var(--text-faint)' }}>{dateStr} at {timeStr}</span>
          </div>
        )}

        {/* Text */}
        {message.type === 'text' && content && (
          <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.5, wordBreak:'break-word' }}>{content}</div>
        )}

        {/* GIF — render actual image not just text */}
        {message.type === 'gif' && content && (
          <div style={{ marginTop:4 }}>
            <img
              src={content}
              alt="GIF"
              style={{ maxWidth:320, maxHeight:280, borderRadius:8, display:'block', cursor:'pointer' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
            />
            <div style={{ display:'none', fontSize:13, color:'var(--text-muted)', padding:'8px 12px', background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' }}>
              GIF failed to load
            </div>
          </div>
        )}

        {/* Image */}
        {message.type === 'image' && fileData && (
          <div style={{ marginTop:4 }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>📎 {fileData.name}</div>
            <div style={{ fontSize:11, color:'var(--text-faint)', fontStyle:'italic' }}>🔒 Encrypted image</div>
          </div>
        )}

        {/* File */}
        {message.type === 'file' && fileData && (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, maxWidth:320, marginTop:4 }}>
            <span style={{ fontSize:28 }}>📄</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{fileData.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{formatBytes(fileData.size)} · 🔒 Encrypted</div>
            </div>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
            {Object.entries(message.reactions).map(([emoji, uids]) => (
              <button key={emoji} onClick={() => onReact(emoji)}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:12, background: uids.includes(currentUid)?'var(--accent-glow)':'var(--surface)', border:`1px solid ${uids.includes(currentUid)?'var(--accent)':'var(--border)'}`, cursor:'pointer', fontSize:13, color:'var(--text)' }}>
                {emoji} <span style={{ fontSize:11, color:'var(--text-muted)' }}>{uids.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovering && (
        <div style={{ position:'absolute', right:16, top:-16, display:'flex', gap:2, background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'2px 4px', boxShadow:'0 4px 12px rgba(0,0,0,0.4)', zIndex:10 }}>
          {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
            <button key={emoji} onClick={() => onReact(emoji)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'4px', borderRadius:4 }}
              onMouseEnter={e=>e.target.style.transform='scale(1.3)'}
              onMouseLeave={e=>e.target.style.transform='scale(1)'}
            >{emoji}</button>
          ))}
          {isOwn && (
            <button onClick={onDelete} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, padding:'4px 6px', borderRadius:4, color:'var(--danger)' }} title="Delete">🗑️</button>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GiphyFetch } from '@giphy/js-fetch-api';
import EmojiPicker from 'emoji-picker-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebase';
import { decryptAESKey } from '../../lib/crypto/crypto';
import { getPrivateKey } from '../../lib/crypto/crypto';

const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY;
const GIF_CATEGORIES = [
  { id: 'happy',     label: '😄 Happy',     query: 'happy' },
  { id: 'sad',       label: '😢 Sad',       query: 'sad' },
  { id: 'funny',     label: '😂 Funny',     query: 'funny' },
  { id: 'love',      label: '❤️ Love',      query: 'love' },
  { id: 'angry',     label: '😡 Angry',     query: 'angry' },
  { id: 'celebrate', label: '🎉 Celebrate', query: 'celebrate' },
  { id: 'trending',  label: '🔥 Trending',  query: null },
];

function useFavouriteGifs() {
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('krypt_fav_gifs') || '[]'); } catch { return []; }
  });
  function toggleFav(gif) {
    setFavs(prev => {
      const exists = prev.find(g => g.id === gif.id);
      const next = exists ? prev.filter(g => g.id !== gif.id) : [{ id: gif.id, url: gif.images.original.url, preview: gif.images.fixed_height_small?.url || gif.images.original.url }, ...prev].slice(0, 50);
      localStorage.setItem('krypt_fav_gifs', JSON.stringify(next));
      return next;
    });
  }
  function isFav(gifId) { return favs.some(g => g.id === gifId); }
  return { favs, toggleFav, isFav };
}

function GifGrid({ gifs, onSelect, onFav, isFav }) {
  const [hovered, setHovered] = useState(null);
  if (!gifs.length) return <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>No GIFs found</div>;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:4 }}>
      {gifs.map(gif => (
        <div key={gif.id} style={{ position:'relative', borderRadius:6, overflow:'hidden', cursor:'pointer', aspectRatio:'16/9', background:'var(--surface)' }}
          onMouseEnter={() => setHovered(gif.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelect(gif.images.original.url)}>
          <img src={gif.images.fixed_height_small?.url || gif.images.original.url} alt={gif.title}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          {hovered === gif.id && (
            <button
              onClick={e => { e.stopPropagation(); onFav(gif); }}
              title={isFav(gif.id) ? 'Remove from favourites' : 'Add to favourites'}
              style={{ position:'absolute', top:4, left:4, background:'rgba(0,0,0,0.7)', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, padding:'3px 6px', color: isFav(gif.id) ? '#ff4444' : '#fff', lineHeight:1 }}>
              {isFav(gif.id) ? '♥' : '♡'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function GifMenu({ onSelect, onClose }) {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('trending');
  const [gifs,     setGifs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const { favs, toggleFav, isFav } = useFavouriteGifs();
  const [gf] = useState(() => GIPHY_KEY ? new GiphyFetch(GIPHY_KEY) : null);

  useEffect(() => {
    if (!gf) return;
    if (category === 'favourites') return;
    setLoading(true);
    const cat = GIF_CATEGORIES.find(c => c.id === category);
    const promise = search
      ? gf.search(search, { limit: 12 })
      : cat?.query ? gf.search(cat.query, { limit: 12 }) : gf.trending({ limit: 12 });
    promise.then(res => { setGifs(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, [gf, category, search]);

  const displayedGifs = category === 'favourites' ? null : gifs;

  return (
    <div style={{ position:'fixed', bottom:80, right:24, zIndex:200, background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:14, width:340, maxHeight:480, display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', overflow:'hidden' }}>
      {/* Search */}
      <div style={{ padding:'10px 10px 6px' }}>
        <input className="krypt-input" placeholder="Search GIFs..." value={search}
          onChange={e => { setSearch(e.target.value); setCategory('trending'); }}
          autoFocus style={{ fontSize:13, width:'100%', boxSizing:'border-box' }} />
      </div>

      {/* Category rows — 2 per row */}
      <div style={{ padding:'0 10px 6px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
        <button onClick={() => { setCategory('favourites'); setSearch(''); }}
          style={{ ...catBtn, background: category==='favourites' ? 'var(--accent)' : 'var(--surface)', color: category==='favourites' ? '#000' : 'var(--text-muted)' }}>
          ⭐ Favourites
        </button>
        {GIF_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => { setCategory(cat.id); setSearch(''); }}
            style={{ ...catBtn, background: category===cat.id ? 'var(--accent)' : 'var(--surface)', color: category===cat.id ? '#000' : 'var(--text-muted)' }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* GIF grid */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 10px 10px' }}>
        {category === 'favourites' ? (
          favs.length === 0
            ? <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>No favourites yet.<br/>Hover a GIF and click ♡ to save it.</div>
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:4 }}>
                {favs.map(gif => (
                  <div key={gif.id} style={{ position:'relative', borderRadius:6, overflow:'hidden', cursor:'pointer', aspectRatio:'16/9', background:'var(--surface)' }}
                    onClick={() => onSelect(gif.url)}>
                    <img src={gif.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(gif); }}
                      style={{ position:'absolute', top:4, left:4, background:'rgba(0,0,0,0.7)', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, padding:'3px 6px', color:'#ff4444', lineHeight:1 }}>♥</button>
                  </div>
                ))}
              </div>
        ) : loading ? (
          <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>Loading...</div>
        ) : (
          <GifGrid gifs={displayedGifs || []} onSelect={onSelect} onFav={toggleFav} isFav={isFav} />
        )}
      </div>
      <div style={{ padding:'4px 10px 8px', fontSize:10, color:'var(--text-faint)', textAlign:'right' }}>Powered by GIPHY</div>
    </div>
  );
}

const catBtn = { border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, padding:'5px 8px', textAlign:'left', transition:'all 0.1s' };

export default function MessageInput({ convId, onSend, onTyping, placeholder }) {
  const { user } = useAuth();
  const [text, setText]           = useState('');
  const [showGiphy, setShowGiphy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProg, setUploadProg] = useState(0);
  const fileRef     = useRef();
  const typingTimer = useRef(null);

  function handleTextChange(e) {
    setText(e.target.value);
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2000);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
  }

  function handleSendText() {
    if (!text.trim()) return;
    onSend(text.trim(), 'text');
    setText('');
    onTyping(false);
    clearTimeout(typingTimer.current);
  }

  async function handleGifSelect(url) {
    await onSend(url, 'gif');
    setShowGiphy(false);
  }

  function handleEmojiSelect(d) { setText(t => t + d.emoji); setShowEmoji(false); }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('File too large. Maximum size is 50MB.'); fileRef.current.value = ''; return; }

    setUploading(true); setUploadProg(0);
    try {
      let aesKey = null;
      try {
        const convSnap = await getDoc(doc(db, 'conversations', convId));
        const conv     = convSnap.data();
        const privKey  = await getPrivateKey(user.uid);
        if (privKey && conv?.encryptedKeys?.[user.uid]) {
          aesKey = await decryptAESKey(conv.encryptedKeys[user.uid], privKey);
        }
      } catch(err) {
        console.warn('Could not get encryption key, uploading without encryption');
      }
      const { uploadFile } = await import('../../lib/backblaze/b2.js');
      const isImage = file.type.startsWith('image/');
      const result  = await uploadFile(file, aesKey, p => setUploadProg(Math.round(p * 100)));
      await onSend(result.fileName, isImage ? 'image' : 'file', {
        name: result.name, size: result.size, mimeType: result.mimeType,
        iv:   aesKey ? Array.from(result.iv) : null,
      });
    } catch(err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false); setUploadProg(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div style={{ padding:'0 16px 16px', position:'relative' }}>
      {/* GIF menu — bottom right */}
      {showGiphy && <GifMenu onSelect={handleGifSelect} onClose={() => setShowGiphy(false)} />}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ position:'absolute', bottom:'100%', right:16, marginBottom:8, zIndex:200 }}>
          <EmojiPicker onEmojiClick={handleEmojiSelect} theme="dark" width={300} height={380} />
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginBottom:8, padding:'8px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, background:'var(--border)', borderRadius:4, height:4, overflow:'hidden' }}>
            <div style={{ width:`${uploadProg}%`, height:'100%', background:'var(--accent)', transition:'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{uploadProg}%</span>
        </div>
      )}

      {/* Input row */}
      <div style={{ display:'flex', alignItems:'flex-end', background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', minHeight:44 }}>
        <button onClick={()=>fileRef.current?.click()} disabled={uploading} title="Attach file or photo" style={ib}><PlusIcon /></button>
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xls,.xlsx" />
        <textarea value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
          placeholder={placeholder} rows={1}
          style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:14, padding:'12px 8px', fontFamily:'DM Sans, sans-serif', resize:'none', lineHeight:1.5, maxHeight:200, overflowY:'auto' }}
          onInput={e=>{ e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,200)+'px'; }} />
        <button onClick={()=>{ setShowGiphy(v=>!v); setShowEmoji(false); }} title="GIF"
          style={{ ...ib, color:showGiphy?'var(--accent)':'var(--text-muted)' }}><GifIcon /></button>
        <button onClick={()=>{ setShowEmoji(v=>!v); setShowGiphy(false); }} title="Emoji"
          style={{ ...ib, color:showEmoji?'var(--accent)':'var(--text-muted)' }}><EmojiIcon /></button>
        <button onClick={handleSendText} disabled={!text.trim()||uploading} title="Send"
          style={{ ...ib, padding:'12px 14px 12px 10px', color:text.trim()?'var(--accent)':'var(--text-faint)' }}><SendIcon /></button>
      </div>
    </div>
  );
}

const ib = { background:'none', border:'none', cursor:'pointer', padding:'12px 10px', display:'flex', alignItems:'center', justifyContent:'center' };
function PlusIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>; }
function GifIcon()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 9H13v6h-1.5zM9 9H6c-.6 0-1 .5-1 1v4c0 .5.4 1 1 1h3c.6 0 1-.5 1-1v-2H8.5v1.5h-2v-3H10V10c0-.5-.4-1-1-1zm10 1.5V9h-4.5v6H16v-2h2v-1.5h-2v-1z"/></svg>; }
function EmojiIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>; }
function SendIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>; }

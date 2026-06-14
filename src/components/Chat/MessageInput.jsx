import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import EmojiPicker from 'emoji-picker-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebase';
import { decryptAESKey } from '../../lib/crypto/crypto';
import { getPrivateKey } from '../../lib/crypto/crypto';

const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY;

export default function MessageInput({ convId, onSend, onTyping, placeholder }) {
  const { user } = useAuth();
  const [text, setText]           = useState('');
  const [showGiphy, setShowGiphy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProg, setUploadProg] = useState(0);
  const [gf, setGf]               = useState(null);
  const [giphyError, setGiphyError] = useState(false);
  const fileRef     = useRef();
  const typingTimer = useRef(null);

  useEffect(() => {
    if (GIPHY_KEY) {
      setGf(new GiphyFetch(GIPHY_KEY));
    }
  }, []);

  const fetchGifs = useCallback((offset) => {
    if (!gf) return Promise.resolve({ data: [] });
    return gifSearch
      ? gf.search(gifSearch, { offset, limit: 10 })
      : gf.trending({ offset, limit: 10 });
  }, [gf, gifSearch]);

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

  async function handleGifSelect(gif) {
    await onSend(gif.images.original.url, 'gif');
    setShowGiphy(false); setGifSearch('');
  }

  function handleEmojiSelect(d) { setText(t => t + d.emoji); setShowEmoji(false); }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size — max 50MB
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB.');
      fileRef.current.value = '';
      return;
    }

    setUploading(true); setUploadProg(0);
    try {
      // Get AES key for encryption
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
        name:     result.name,
        size:     result.size,
        mimeType: result.mimeType,
        iv:       aesKey ? Array.from(result.iv) : null,
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
      {/* GIF picker */}
      {showGiphy && (
        <div style={{ position:'absolute', bottom:'100%', left:16, right:16, marginBottom:8, background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:12, padding:12, zIndex:100, maxHeight:400, overflow:'hidden', display:'flex', flexDirection:'column', gap:8 }}>
          <input className="krypt-input" placeholder="Search GIFs..." value={gifSearch} onChange={e=>{setGifSearch(e.target.value); setGiphyError(false);}} autoFocus style={{ fontSize:13 }} />
          <div style={{ overflowY:'auto', flex:1 }}>
            {!gf ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--text-faint)', fontSize:13 }}>
                Giphy API key not configured
              </div>
            ) : giphyError ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--danger)', fontSize:13 }}>
                Failed to load GIFs. <span style={{ color:'var(--accent)', cursor:'pointer' }} onClick={()=>setGiphyError(false)}>Try again</span>
              </div>
            ) : (
              <Grid
                width={Math.min(560, window.innerWidth - 80)}
                columns={3}
                fetchGifs={fetchGifs}
                key={gifSearch}
                onGifClick={(gif, e) => { e.preventDefault(); handleGifSelect(gif); }}
                onFailure={() => setGiphyError(true)}
                hideAttribution={false}
              />
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--text-faint)', textAlign:'right' }}>Powered by GIPHY</div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ position:'absolute', bottom:'100%', right:16, marginBottom:8, zIndex:100 }}>
          <EmojiPicker onEmojiClick={handleEmojiSelect} theme="dark" width={300} height={380} />
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginBottom:8, padding:'8px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, background:'var(--border)', borderRadius:4, height:4, overflow:'hidden' }}>
            <div style={{ width:`${uploadProg}%`, height:'100%', background:'var(--accent)', transition:'width 0.2s ease' }} />
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

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

// Lightweight QR code renderer using canvas (no extra library needed)
// We use a tiny inline QR generator approach via a data URL API
export default function QRCode({ onSuccess }) {
  const { user } = useAuth();
  const [token,    setToken]    = useState(null);
  const [status,   setStatus]   = useState('loading'); // loading | ready | scanned | approved | expired
  const [qrUrl,    setQrUrl]    = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const pollRef   = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    requestToken();
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, []);

  async function requestToken() {
    setStatus('loading'); setTimeLeft(60);
    try {
      const res  = await fetch('/.netlify/functions/qr-auth', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ uid: 'pending' }), // will be replaced when logged-in device generates
      });
      const data = await res.json();
      setToken(data.token);

      // Build QR URL — encodes the token into a deep link
      const deepLink = `${window.location.origin}/auth/qr-scan?token=${data.token}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}&bgcolor=0a0a0a&color=39ff6a&margin=10`);
      setStatus('ready');

      // Countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); setStatus('expired'); clearInterval(pollRef.current); return 0; }
          return t - 1;
        });
      }, 1000);

      // Poll for approval
      pollRef.current = setInterval(async () => {
        try {
          const pollRes  = await fetch(`/.netlify/functions/qr-auth?token=${data.token}`);
          const pollData = await pollRes.json();
          if (pollRes.status === 410) { setStatus('expired'); clearInterval(pollRef.current); clearInterval(timerRef.current); return; }
          if (pollData.status === 'approved' && pollData.customToken) {
            setStatus('approved');
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
            onSuccess(pollData.customToken);
          } else if (pollData.status === 'scanned') {
            setStatus('scanned');
          }
        } catch {}
      }, 1500);
    } catch (err) {
      setStatus('expired');
    }
  }

  return (
    <div style={{ textAlign:'center', padding:'8px 0' }}>
      {status === 'loading' && (
        <div style={{ padding:40, color:'var(--text-muted)', fontSize:14 }}>
          <div className="spinner" style={{ margin:'0 auto 12px' }} />
          Generating QR code...
        </div>
      )}

      {(status === 'ready' || status === 'scanned') && (
        <>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:16 }}>
            Scan with a device that's already logged in to Krypt
          </p>
          <div style={{ display:'inline-block', padding:12, background:'var(--surface)', border:'2px solid var(--accent)', borderRadius:12, marginBottom:12 }}>
            <img src={qrUrl} alt="QR Code" width={200} height={200} style={{ display:'block', borderRadius:6 }} />
          </div>
          {status === 'scanned' && (
            <div style={{ background:'rgba(57,255,106,0.1)', border:'1px solid var(--accent)', borderRadius:8, padding:'10px 14px', marginBottom:8, fontSize:13, color:'var(--accent)' }}>
              ✅ QR scanned — approve on your other device
            </div>
          )}
          <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:12 }}>
            Expires in <span style={{ color: timeLeft < 15 ? 'var(--danger)' : 'var(--accent)', fontWeight:700 }}>{timeLeft}s</span>
          </div>
          {/* Progress bar */}
          <div style={{ height:3, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'var(--accent)', width:`${(timeLeft/60)*100}%`, transition:'width 1s linear' }} />
          </div>
        </>
      )}

      {status === 'expired' && (
        <div style={{ padding:'20px 0', display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
          <div style={{ fontSize:36 }}>⏱️</div>
          <div style={{ color:'var(--text-muted)', fontSize:14 }}>QR code expired</div>
          <button className="krypt-button" onClick={requestToken}>Generate New QR</button>
        </div>
      )}

      {status === 'approved' && (
        <div style={{ padding:'20px 0', display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
          <div style={{ fontSize:36 }}>✅</div>
          <div style={{ color:'var(--accent)', fontWeight:600 }}>Approved! Signing you in...</div>
          <div className="spinner" style={{ margin:'8px auto 0' }} />
        </div>
      )}
    </div>
  );
}

// Separate component shown on the LOGGED-IN device at /auth/qr-scan?token=xxx
export function QRApprove() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | approving | approved | error

  async function handleApprove() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token || !user) return;
    setStatus('approving');
    try {
      const res = await fetch('/.netlify/functions/qr-approve', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ token, uid: user.uid }),
      });
      const data = await res.json();
      setStatus(data.success ? 'approved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:32, maxWidth:360, width:'100%', textAlign:'center' }}>
        {!user ? (
          <div style={{ color:'var(--text-muted)' }}>You need to be logged in to approve a QR login.</div>
        ) : status === 'idle' ? (
          <>
            <div style={{ fontSize:36, marginBottom:12 }}>📱</div>
            <h2 style={{ color:'var(--text)', marginBottom:8 }}>QR Login Request</h2>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:20 }}>
              Someone is trying to sign in to Krypt using a QR code. Approve to let them in as <strong style={{ color:'var(--accent)' }}>{user.displayName || user.email}</strong>.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button className="krypt-button-ghost" onClick={() => window.close()} style={{ flex:1 }}>Deny</button>
              <button className="krypt-button" onClick={handleApprove} style={{ flex:1 }}>Approve</button>
            </div>
          </>
        ) : status === 'approving' ? (
          <div style={{ color:'var(--text-muted)' }}><div className="spinner" style={{ margin:'0 auto 12px' }} />Approving...</div>
        ) : status === 'approved' ? (
          <div style={{ color:'var(--accent)', fontWeight:600 }}>✅ Approved! The other device is now signing in.</div>
        ) : (
          <div style={{ color:'var(--danger)' }}>Something went wrong. The QR code may have expired.</div>
        )}
      </div>
    </div>
  );
}

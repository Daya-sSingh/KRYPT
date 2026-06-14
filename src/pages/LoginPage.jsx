import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginWithEmail, loginWithGoogle, sendMagicLink, completeMagicLink } from '../lib/firebase/auth';
import { signInWithCustomToken, isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '../lib/firebase/firebase';
import QRCode from '../components/Auth/QRCode';

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab,       setTab]      = useState('email'); // email | magic | google | qr
  const [email,     setEmail]    = useState('');
  const [password,  setPassword] = useState('');
  const [error,     setError]    = useState('');
  const [loading,   setLoading]  = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // Handle magic link callback
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      completeMagicLink(window.location.href)
        .then(() => navigate('/app'))
        .catch(err => setError(err.message));
    }
  }, []);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/app');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await sendMagicLink(email);
      setMagicSent(true);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError(''); setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/app');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  }

  async function handleQRSuccess(customToken) {
    try {
      await signInWithCustomToken(auth, customToken);
      navigate('/app');
    } catch (err) {
      setError('QR login failed. Please try again.');
    }
  }

  return (
    <div style={{
      height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', padding:16,
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🔒</div>
          <h1 style={{ color:'var(--accent)', fontSize:32, fontWeight:700, letterSpacing:4, margin:0 }}>KRYPT</h1>
          <p style={{ color:'var(--text-faint)', fontSize:13, marginTop:6 }}>End-to-end encrypted messaging</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:28 }}>
          {/* Tab selector */}
          <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--surface)', borderRadius:10, padding:4 }}>
            {[['email','Password'],['magic','Magic Link'],['qr','QR Code']].map(([t,label]) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex:1, padding:'7px 4px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background: tab===t?'var(--elevated)':'transparent', color: tab===t?'var(--text)':'var(--text-muted)', transition:'all 0.15s ease' }}>
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background:'rgba(255,68,68,0.1)', border:'1px solid var(--danger)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--danger)' }}>
              {error}
            </div>
          )}

          {/* Email + Password */}
          {tab === 'email' && (
            <form onSubmit={handleEmailLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input className="krypt-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input className="krypt-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button className="krypt-button" type="submit" disabled={loading} style={{ marginTop:4, width:'100%' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Magic link */}
          {tab === 'magic' && !magicSent && (
            <form onSubmit={handleMagicLink} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input className="krypt-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
              <button className="krypt-button" type="submit" disabled={loading} style={{ width:'100%' }}>
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
          {tab === 'magic' && magicSent && (
            <div style={{ textAlign:'center', padding:'16px 0', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ fontSize:40 }}>📬</div>
              <div style={{ color:'var(--text)', fontWeight:600 }}>Check your email</div>
              <div style={{ color:'var(--text-muted)', fontSize:13 }}>
                We sent a magic link to <strong>{email}</strong>. Click it to sign in instantly.
              </div>
              <button className="krypt-button-ghost" onClick={() => { setMagicSent(false); setEmail(''); }} style={{ marginTop:8 }}>
                Use a different email
              </button>
            </div>
          )}

          {/* QR Code login */}
          {tab === 'qr' && <QRCode onSuccess={handleQRSuccess} />}

          {/* Google */}
          <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
              <span style={{ fontSize:12, color:'var(--text-faint)' }}>or</span>
              <div style={{ flex:1, height:1, background:'var(--border)' }} />
            </div>
            <button onClick={handleGoogle} disabled={loading}
              style={{ width:'100%', padding:'10px 20px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface)', color:'var(--text)', cursor:'pointer', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 0.15s ease' }}>
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--text-faint)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' };

function friendlyError(code) {
  const map = {
    'auth/wrong-password':       'Incorrect password.',
    'auth/user-not-found':       'No account with that email.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmail, loginWithGoogle } from '../lib/firebase/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await registerWithEmail(email, password, displayName);
      navigate('/app');
    } catch (err) {
      const map = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email':        'Invalid email address.',
        'auth/weak-password':        'Password is too weak.',
      };
      setError(map[err.code] || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setLoading(true);
    try { await loginWithGoogle(); navigate('/app'); }
    catch (err) { setError('Google sign-in failed.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:16 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🔒</div>
          <h1 style={{ color:'var(--accent)', fontSize:32, fontWeight:700, letterSpacing:4, margin:0 }}>KRYPT</h1>
          <p style={{ color:'var(--text-faint)', fontSize:13, marginTop:6 }}>Create your encrypted account</p>
        </div>

        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:28 }}>
          {error && (
            <div style={{ background:'rgba(255,68,68,0.1)', border:'1px solid var(--danger)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={labelStyle}>Display Name</label>
              <input className="krypt-input" type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" required autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input className="krypt-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input className="krypt-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 8 characters" required />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input className="krypt-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            <button className="krypt-button" type="submit" disabled={loading} style={{ marginTop:4, width:'100%' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:8, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
            <span style={{ fontSize:12, color:'var(--text-faint)' }}>or</span>
            <div style={{ flex:1, height:1, background:'var(--border)' }} />
          </div>
          <button onClick={handleGoogle} disabled={loading}
            style={{ width:'100%', padding:'10px 20px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface)', color:'var(--text)', cursor:'pointer', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <GoogleIcon /> Continue with Google
          </button>

          <p style={{ fontSize:12, color:'var(--text-faint)', textAlign:'center', marginTop:16, lineHeight:1.5 }}>
            By creating an account, your messages are automatically end-to-end encrypted. Krypt cannot read your messages.
          </p>
        </div>

        <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--text-faint)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = { display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' };

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

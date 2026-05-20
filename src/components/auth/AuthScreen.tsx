import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth } from '../../firebase/config';
import './AuthScreen.css';

type Mode = 'login' | 'signup' | 'magic';

const actionCodeSettings = {
  url: window.location.origin,
  handleCodeInApp: true,
};

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const stored = window.localStorage.getItem('kryptEmailForSignIn');
    if (!stored) return;
    signInWithEmailLink(auth, stored, window.location.href)
      .then(() => {
        window.localStorage.removeItem('kryptEmailForSignIn');
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      if (mode === 'magic') {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('kryptEmailForSignIn', email);
        setInfo('Check your email for the sign-in link.');
        return;
      }
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    }
  }

  async function google() {
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img
          src="/logo-wordmark.png"
          alt="KRYPT — end-to-end encrypted"
          className="auth-wordmark"
        />
        <form onSubmit={submit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== 'magic' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}
          {error && <p className="auth-error">{error}</p>}
          {info && <p className="auth-info">{info}</p>}
          <button type="submit" className="btn-accent">
            {mode === 'login' && 'Log in'}
            {mode === 'signup' && 'Sign up'}
            {mode === 'magic' && 'Send magic link'}
          </button>
        </form>
        <button type="button" className="btn-google" onClick={google}>
          Continue with Google
        </button>
        <div className="auth-links">
          {mode !== 'login' && <button type="button" onClick={() => setMode('login')}>Log in</button>}
          {mode !== 'signup' && <button type="button" onClick={() => setMode('signup')}>Sign up</button>}
          {mode !== 'magic' && <button type="button" onClick={() => setMode('magic')}>Email link</button>}
        </div>
      </div>
    </div>
  );
}

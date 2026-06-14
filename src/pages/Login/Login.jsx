import { useState } from 'react'
import {
  registerWithEmail,
  loginWithEmail,
  sendPasswordlessLink,
  loginWithGoogle
} from '../../firebase/auth'
import styles from './Login.module.css'

export default function Login() {
  const [mode, setMode] = useState('login') // login | register | magic
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await loginWithEmail(email, password)
      else if (mode === 'register') await registerWithEmail(email, password, displayName)
      else if (mode === 'magic') {
        await sendPasswordlessLink(email)
        setMagicSent(true)
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(.*\)/, '').trim())
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try { await loginWithGoogle() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#080808"/>
            <path d="M24 8C24 8 31 8 34.5 11.5C37.5 14.5 38 17.5 38 20L38 38L10 38L10 20C10 17.5 10.5 14.5 13.5 11.5C17 8 24 8 24 8Z" fill="#606060" stroke="#39ff6a" strokeWidth="1.5"/>
            <path d="M24 11C24 11 30 11 33 14C35.5 16.5 36 19 36 21L36 36L12 36L12 21C12 19 12.5 16.5 15 14C18 11 24 11 24 11Z" fill="#585858" stroke="#39ff6a" strokeWidth="1.2"/>
            <text x="24" y="27" textAnchor="middle" fill="#d8d8d8" fontSize="7" fontWeight="500" letterSpacing="1" fontFamily="DM Sans, sans-serif">KRYPT</text>
            <rect x="8" y="36" width="32" height="4" rx="1.5" fill="#4a4a4a" stroke="#39ff6a" strokeWidth="1.2"/>
          </svg>
          <span className={styles.logoText}>Krypt</span>
        </div>

        <h1 className={styles.title}>
          {mode === 'login' && 'Welcome back'}
          {mode === 'register' && 'Create account'}
          {mode === 'magic' && 'Magic link'}
        </h1>
        <p className={styles.sub}>
          {mode === 'login' && 'Sign in to your encrypted workspace'}
          {mode === 'register' && 'Join the encrypted network'}
          {mode === 'magic' && 'We\'ll email you a sign-in link'}
        </p>

        {magicSent ? (
          <div className={styles.magicSent}>
            <span>✉️</span>
            <p>Check your email for a sign-in link. You can close this tab.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {mode === 'register' && (
              <div className={styles.field}>
                <label>Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div className={styles.field}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {mode !== 'magic' && (
              <div className={styles.field}>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : (
                mode === 'login' ? 'Sign in' :
                mode === 'register' ? 'Create account' : 'Send magic link'
              )}
            </button>
          </form>
        )}

        <div className={styles.divider}><span>or</span></div>

        <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div className={styles.links}>
          {mode === 'login' && <>
            <button onClick={() => setMode('register')}>Create account</button>
            <span>·</span>
            <button onClick={() => setMode('magic')}>Magic link</button>
          </>}
          {mode === 'register' && <button onClick={() => setMode('login')}>Already have an account?</button>}
          {mode === 'magic' && <button onClick={() => setMode('login')}>Back to sign in</button>}
        </div>
      </div>
    </div>
  )
}

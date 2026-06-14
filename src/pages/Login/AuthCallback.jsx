import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { completePasswordlessLogin } from '../../firebase/auth'

export default function AuthCallback() {
  const [status, setStatus] = useState('Signing you in...')
  const navigate = useNavigate()

  useEffect(() => {
    completePasswordlessLogin()
      .then((user) => {
        if (user) navigate('/')
        else navigate('/login')
      })
      .catch((err) => {
        setStatus('Sign-in failed: ' + err.message)
        setTimeout(() => navigate('/login'), 3000)
      })
  }, [])

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--font-sans)', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 32, height: 32, border: '2px solid var(--border-bright)',
        borderTop: '2px solid var(--primary)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{status}</p>
    </div>
  )
}

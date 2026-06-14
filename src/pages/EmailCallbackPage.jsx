import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeMagicLink } from '../lib/firebase/auth';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '../lib/firebase/firebase';
import { QRApprove } from '../components/Auth/QRCode';
import { useAuth } from '../context/AuthContext';

export default function EmailCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [error, setError] = useState('');

  const isQR = searchParams.get('token');

  useEffect(() => {
    if (isQR) return; // Handled by QRApprove component

    if (isSignInWithEmailLink(auth, window.location.href)) {
      completeMagicLink(window.location.href)
        .then(() => navigate('/app'))
        .catch(err => setError('Magic link failed or expired. Please request a new one.'));
    } else {
      navigate('/login');
    }
  }, []);

  if (isQR) return <QRApprove />;

  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
        {error ? (
          <>
            <div style={{ fontSize:36 }}>❌</div>
            <div style={{ color:'var(--danger)' }}>{error}</div>
            <button className="krypt-button" onClick={() => navigate('/login')}>Back to Login</button>
          </>
        ) : (
          <>
            <div className="spinner" />
            <div style={{ color:'var(--text-muted)', fontSize:14 }}>Signing you in...</div>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CallProvider } from './context/CallContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailCallbackPage from './pages/EmailCallbackPage';
import AppLayout from './components/Layout/AppLayout';
import './styles/globals.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0a', gap:24 }}>
      <img src="/logo-wordmark.png" alt="KRYPT" style={{ maxWidth:280, width:'88vw' }} />
      <div className="spinner"/>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/app" replace /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"               element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register"            element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/auth/email-callback" element={<EmailCallbackPage />} />
            <Route path="/app/*"               element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="*"                    element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

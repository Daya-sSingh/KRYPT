import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { logout, updateUserProfile } from '../../lib/firebase/auth';
import { useNavigate } from 'react-router-dom';
import ImageCropper from '../UI/ImageCropper';

const SECTIONS = [
  { id:'account',       label:'My Account',      icon:'👤', group:'User Settings' },
  { id:'profile',       label:'Profile',          icon:'✏️', group:'User Settings' },
  { id:'privacy',       label:'Privacy & Safety', icon:'🔒', group:'User Settings' },
  { id:'audio',         label:'Voice & Video',    icon:'🎙️', group:'App Settings' },
  { id:'notifications', label:'Notifications',    icon:'🔔', group:'App Settings' },
  { id:'appearance',    label:'Appearance',       icon:'🎨', group:'App Settings' },
  { id:'advanced',      label:'Advanced',         icon:'⚙️', group:'App Settings' },
];

export default function SettingsModal({ onClose }) {
  const { user, profile, updateSettings, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account');
  const [settings, setSettings] = useState({ ...(profile?.settings || {}) });
  const [inputDevices,  setInputDevices]  = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [micLevel,      setMicLevel]      = useState(0);
  const micTestRef  = useRef(null);
  const analyserRef = useRef(null);
  const animRef     = useRef(null);

  useEffect(() => {
    loadDevices();
    return () => stopMicTest();
  }, []);

  useEffect(() => {
    if (profile?.settings) setSettings({ ...profile.settings });
  }, [profile]);

  async function loadDevices() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(devices.filter(d => d.kind === 'audioinput'));
      setOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
    } catch {}
  }

  async function startMicTest() {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      micTestRef.current  = stream;
      const data = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(data);
        setMicLevel(Math.min(100, data.reduce((a,b)=>a+b,0) / data.length * 2));
        animRef.current = requestAnimationFrame(tick);
      }
      tick();
    } catch {}
  }

  function stopMicTest() {
    cancelAnimationFrame(animRef.current);
    micTestRef.current?.getTracks().forEach(t => t.stop());
    micTestRef.current  = null;
    analyserRef.current = null;
    setMicLevel(0);
  }

  async function saveSetting(key, val) {
    const next = { ...settings, [key]: val };
    setSettings(next);
    await updateSettings(next);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const groups = [...new Set(SECTIONS.map(s => s.group))];

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', background:'rgba(0,0,0,0.85)' }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ display:'flex', width:'100%', height:'100%', maxWidth:900, margin:'auto', background:'var(--bg)', borderRadius:12, overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ width:220, background:'var(--panel)', padding:'16px 8px', overflowY:'auto', flexShrink:0 }}>
          {groups.map(group => (
            <div key={group} style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'8px 8px 4px' }}>{group}</div>
              {SECTIONS.filter(s=>s.group===group).map(s=>(
                <button key={s.id} onClick={()=>setActiveSection(s.id)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:6, border:'none', cursor:'pointer', background: activeSection===s.id?'var(--elevated)':'transparent', color: activeSection===s.id?'var(--text)':'var(--text-muted)', textAlign:'left', fontSize:14, transition:'all 0.1s ease' }}>
                  <span>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
            </div>
          ))}
          <div style={{ height:1, background:'var(--border)', margin:'8px 0' }} />
          <button onClick={handleLogout}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:6, border:'none', cursor:'pointer', background:'transparent', color:'var(--danger)', textAlign:'left', fontSize:14 }}>
            <span>🚪</span><span>Log Out</span>
          </button>
        </div>

        <div style={{ flex:1, padding:'24px 32px', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ color:'var(--text)', margin:0, fontSize:18, fontWeight:700 }}>
              {SECTIONS.find(s=>s.id===activeSection)?.label}
            </h2>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20 }}>✕</button>
          </div>

          {activeSection==='account'       && <AccountSection user={user} profile={profile} refreshProfile={refreshProfile} />}
          {activeSection==='profile'       && <ProfileSection user={user} profile={profile} refreshProfile={refreshProfile} />}
          {activeSection==='audio'         && <AudioSection settings={settings} saveSetting={saveSetting} inputDevices={inputDevices} outputDevices={outputDevices} micLevel={micLevel} onStartMicTest={startMicTest} onStopMicTest={stopMicTest} />}
          {activeSection==='appearance'    && <AppearanceSection theme={theme} setTheme={setTheme} />}
          {activeSection==='privacy'       && <PrivacySection />}
          {activeSection==='notifications' && <NotificationsSection settings={settings} saveSetting={saveSetting} />}
          {activeSection==='advanced'      && <AdvancedSection />}
        </div>
      </div>
    </div>
  );
}

function AccountSection({ user, profile, refreshProfile }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateUserProfile(user.uid, { displayName });
    await refreshProfile();
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Card>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--surface)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:24, color:'var(--accent)', border:'2px solid var(--accent)' }}>
            {profile?.photoURL ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : profile?.displayName?.slice(0,1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{profile?.displayName}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>
        <label style={labelSt}>Display Name</label>
        <div style={{ display:'flex', gap:8 }}>
          <input className="krypt-input" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your display name" onKeyDown={e=>e.key==='Enter'&&handleSave()} />
          <button className="krypt-button" onClick={handleSave} disabled={saving} style={{ flexShrink:0, padding:'10px 16px' }}>
            {saved?'✓ Saved':saving?'...':'Save'}
          </button>
        </div>
      </Card>
      <Card>
        <Row label="Email">{user?.email}</Row>
        <Row label="User ID"><code style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{user?.uid?.slice(0,16)}...</code></Row>
      </Card>
    </div>
  );
}

function ProfileSection({ user, profile, refreshProfile }) {
  const [bio,        setBio]        = useState(profile?.bio || '');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [cropSrc,    setCropSrc]    = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef();

  async function handleSaveBio() {
    setSaving(true);
    await updateUserProfile(user.uid, { bio });
    await refreshProfile();
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleCropped(blob, dataUrl) {
    setCropSrc(null);
    setUploading(true);
    try {
      await updateUserProfile(user.uid, { photoURL: dataUrl });
      await refreshProfile();
    } catch(err) {
      console.error('Photo upload failed:', err);
      alert('Failed to save photo.');
    }
    setUploading(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCropped} onCancel={()=>setCropSrc(null)} />}

      <Card title="Profile Picture">
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--elevated)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:28, color:'var(--accent)', border:'2px solid var(--border)', flexShrink:0 }}>
            {profile?.photoURL ? <img src={profile.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : profile?.displayName?.slice(0,1).toUpperCase()}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button className="krypt-button" onClick={()=>fileRef.current?.click()} disabled={uploading} style={{ padding:'8px 16px', fontSize:13 }}>
              {uploading ? 'Saving...' : 'Upload Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
            <div style={{ fontSize:12, color:'var(--text-faint)' }}>JPG, PNG, GIF · You can crop after selecting</div>
          </div>
        </div>
      </Card>

      <Card title="Bio">
        <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Tell people a bit about yourself..." maxLength={190}
          style={{ width:'100%', background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)', padding:'10px 14px', fontFamily:'DM Sans, sans-serif', fontSize:14, resize:'vertical', minHeight:80, outline:'none', lineHeight:1.5 }} />
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-faint)' }}>{bio.length}/190</span>
          <button className="krypt-button" onClick={handleSaveBio} disabled={saving} style={{ padding:'8px 16px', fontSize:13 }}>
            {saved?'✓ Saved':saving?'...':'Save Bio'}
          </button>
        </div>
      </Card>
    </div>
  );
}

function AudioSection({ settings, saveSetting, inputDevices, outputDevices, micLevel, onStartMicTest, onStopMicTest }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Card title="Input Device">
        <label style={labelSt}>Microphone</label>
        <select value={settings.inputDevice||''} onChange={e=>saveSetting('inputDevice',e.target.value)} style={selectSt}>
          <option value="">Default</option>
          {inputDevices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||`Mic ${d.deviceId.slice(0,8)}`}</option>)}
        </select>
        <label style={{ ...labelSt, marginTop:12 }}>Input Volume</label>
        <VolumeSlider value={settings.inputVolume??100} max={200} onChange={v=>saveSetting('inputVolume',v)} />
        <label style={{ ...labelSt, marginTop:12 }}>Mic Test</label>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${micLevel}%`, background:'var(--accent)', borderRadius:4, transition:'width 0.05s' }} />
          </div>
          <button className="krypt-button-ghost" onClick={micLevel>0?onStopMicTest:onStartMicTest} style={{ fontSize:12, padding:'6px 12px', flexShrink:0 }}>
            {micLevel>0?'Stop':'Test Mic'}
          </button>
        </div>
      </Card>
      <Card title="Output Device">
        <label style={labelSt}>Headphones / Speaker</label>
        <select value={settings.outputDevice||''} onChange={e=>saveSetting('outputDevice',e.target.value)} style={selectSt}>
          <option value="">Default</option>
          {outputDevices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||`Speaker ${d.deviceId.slice(0,8)}`}</option>)}
        </select>
        <label style={{ ...labelSt, marginTop:12 }}>Output Volume</label>
        <VolumeSlider value={settings.outputVolume??100} max={200} onChange={v=>saveSetting('outputVolume',v)} />
      </Card>
      <Card title="Per-User Call Volume">
        <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 12px' }}>Boost individual users up to <strong style={{ color:'var(--accent)' }}>500%</strong> in calls.</p>
        <VolumeSlider value={settings.userVolume??100} max={500} onChange={v=>saveSetting('userVolume',v)} showMarkers />
      </Card>
      <Card title="Voice Processing">
        <Toggle label="Noise Suppression"  value={settings.noiseSuppression??true}  onChange={v=>saveSetting('noiseSuppression',v)} />
        <Toggle label="Echo Cancellation"  value={settings.echoCancellation??true}  onChange={v=>saveSetting('echoCancellation',v)} />
        <Toggle label="Auto Gain Control"  value={settings.autoGain??true}          onChange={v=>saveSetting('autoGain',v)} />
        <Toggle label="Push to Talk"       value={settings.pushToTalk??false}       onChange={v=>saveSetting('pushToTalk',v)} />
      </Card>
      <Card title="Video">
        <Toggle label="Preview video before joining" value={settings.videoPreview??true}  onChange={v=>saveSetting('videoPreview',v)} />
        <Toggle label="Mirror my video"              value={settings.mirrorVideo??true}   onChange={v=>saveSetting('mirrorVideo',v)} />
      </Card>
    </div>
  );
}

function AppearanceSection({ theme, setTheme }) {
  const themes = [
    { id:'green',  label:'Krypt Green', color:'#39ff6a' },
    { id:'purple', label:'Purple',      color:'#a855f7' },
    { id:'blue',   label:'Blue',        color:'#3b82f6' },
    { id:'red',    label:'Red',         color:'#ef4444' },
    { id:'orange', label:'Orange',      color:'#f97316' },
    { id:'white',  label:'Light Mode',  color:'#111111' },
  ];
  return (
    <Card title="Accent Color">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:8 }}>
        {themes.map(t=>(
          <button key={t.id} onClick={()=>setTheme(t.id)}
            style={{ padding:'12px 8px', borderRadius:10, border:`2px solid ${theme===t.id?t.color:'var(--border)'}`, background: theme===t.id?`${t.color}22`:'var(--surface)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all 0.15s ease' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:t.color }} />
            <span style={{ fontSize:12, color: theme===t.id?t.color:'var(--text-muted)', fontWeight: theme===t.id?700:400 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function PrivacySection() {
  const { user } = useAuth();
  const [backupPassword,  setBackupPassword]  = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupStatus,    setBackupStatus]    = useState(null);
  const [restoreStatus,   setRestoreStatus]   = useState(null);
  const [backupExists,    setBackupExists]    = useState(false);
  const [backupError,     setBackupError]     = useState('');
  const [restoreError,    setRestoreError]    = useState('');

  useEffect(() => {
    if (user?.uid) hasKeyBackup(user.uid).then(setBackupExists);
  }, [user]);

  async function handleSaveBackup() {
    if (!backupPassword || backupPassword.length < 8) {
      setBackupError('Password must be at least 8 characters'); return;
    }
    setBackupError('');
    setBackupStatus('saving');
    try {
      await saveKeyBackup(user.uid, backupPassword);
      setBackupStatus('saved');
      setBackupExists(true);
      setBackupPassword('');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch(e) {
      setBackupError(e.message || 'Backup failed');
      setBackupStatus('error');
    }
  }

  async function handleRestore() {
    if (!restorePassword) { setRestoreError('Enter your backup password'); return; }
    setRestoreError('');
    setRestoreStatus('restoring');
    try {
      await restoreKeyBackup(user.uid, restorePassword);
      setRestoreStatus('restored');
      setRestorePassword('');
      setTimeout(() => setRestoreStatus(null), 3000);
    } catch(e) {
      setRestoreError(e.message === 'Wrong password' ? 'Wrong password — try again' : e.message || 'Restore failed');
      setRestoreStatus('error');
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Card title="End-to-End Encryption">
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', background:'rgba(57,255,106,0.05)', border:'1px solid var(--accent)', borderRadius:8 }}>
          <span style={{ fontSize:20 }}>🔒</span>
          <div>
            <div style={{ fontWeight:600, color:'var(--accent)', fontSize:14 }}>Your messages are encrypted</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, lineHeight:1.5 }}>All messages are end-to-end encrypted. Your private key is generated on this device and never leaves it unprotected. Krypt cannot read your conversations.</div>
          </div>
        </div>
      </Card>
      <Card title="Key Backup">
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
          Back up your encryption key with a password. If you log in on a new device, you can restore it to access your messages.
          {backupExists && <span style={{ marginLeft:6, color:'var(--accent)', fontWeight:600 }}>✓ Backup exists</span>}
        </div>
        <label style={labelSt}>Backup Password</label>
        <div style={{ display:'flex', gap:8 }}>
          <input className="krypt-input" type="password" value={backupPassword} onChange={e => setBackupPassword(e.target.value)} placeholder="Min 8 characters" onKeyDown={e => e.key === 'Enter' && handleSaveBackup()} />
          <button className="krypt-button" onClick={handleSaveBackup} disabled={backupStatus === 'saving'} style={{ flexShrink:0, padding:'10px 16px' }}>
            {backupStatus === 'saving' ? '...' : backupStatus === 'saved' ? '✓ Saved' : backupExists ? 'Update' : 'Save'}
          </button>
        </div>
        {backupError && <div style={{ fontSize:12, color:'var(--danger)', marginTop:6 }}>{backupError}</div>}
      </Card>
      <Card title="Restore Key on This Device">
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
          On a new device? Restore your encryption key from your backup to decrypt your messages.
        </div>
        <label style={labelSt}>Backup Password</label>
        <div style={{ display:'flex', gap:8 }}>
          <input className="krypt-input" type="password" value={restorePassword} onChange={e => setRestorePassword(e.target.value)} placeholder="Enter your backup password" onKeyDown={e => e.key === 'Enter' && handleRestore()} />
          <button className="krypt-button" onClick={handleRestore} disabled={restoreStatus === 'restoring'} style={{ flexShrink:0, padding:'10px 16px' }}>
            {restoreStatus === 'restoring' ? '...' : restoreStatus === 'restored' ? '✓ Restored' : 'Restore'}
          </button>
        </div>
        {restoreError && <div style={{ fontSize:12, color:'var(--danger)', marginTop:6 }}>{restoreError}</div>}
        {restoreStatus === 'restored' && <div style={{ fontSize:12, color:'var(--accent)', marginTop:6 }}>✓ Key restored! Reload the page to decrypt your messages.</div>}
      </Card>
    </div>
  );
}
function NotificationsSection({ settings, saveSetting }) {
  return (
    <Card title="Notifications">
      <Toggle label="Enable notifications"             value={settings.notifications??true}  onChange={v=>saveSetting('notifications',v)} />
      <Toggle label="Message preview in notifications" value={settings.notifPreview??false}  onChange={v=>saveSetting('notifPreview',v)} />
      <Toggle label="Notification sounds"              value={settings.notifSound??true}     onChange={v=>saveSetting('notifSound',v)} />
    </Card>
  );
}

function AdvancedSection() {
  return (
    <Card title="Advanced">
      <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
        <p>Krypt stores your private encryption keys in your browser's <strong>IndexedDB</strong> — not cookies. Clearing cookies won't affect your keys. Only clearing your browser's site data or IndexedDB directly would delete them.</p>
        <p style={{ marginTop:8 }}>If you clear your keys you'll lose access to old encrypted messages. Log in on all your devices before clearing browser data.</p>
      </div>
    </Card>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:16 }}>
      {title && <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>{title}</div>}
      {children}
    </div>
  );
}
function Row({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize:13, color:'var(--text)' }}>{children}</span>
    </div>
  );
}
function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:14, color:'var(--text)' }}>{label}</span>
      <div onClick={()=>onChange(!value)} style={{ width:44, height:24, borderRadius:12, background: value?'var(--accent)':'var(--border)', cursor:'pointer', position:'relative', transition:'background 0.2s ease', flexShrink:0 }}>
        <div style={{ position:'absolute', top:4, left: value?24:4, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s ease', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}
function VolumeSlider({ value, max, onChange, showMarkers }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <input type="range" min={0} max={max} step={5} value={value} onChange={e=>onChange(Number(e.target.value))} style={{ flex:1, accentColor:'var(--accent)' }} />
        <span style={{ minWidth:44, textAlign:'right', fontWeight:700, color:'var(--accent)', fontSize:13 }}>{value}%</span>
      </div>
      {showMarkers && <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-faint)', marginTop:2 }}><span>0%</span><span>100%</span><span>200%</span><span>300%</span><span>500%</span></div>}
    </div>
  );
}
const labelSt  = { display:'block', fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' };
const selectSt = { width:'100%', background:'var(--elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)', padding:'8px 10px', fontSize:13, cursor:'pointer', outline:'none' };

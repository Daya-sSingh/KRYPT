import { useEffect, useRef, useState } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { rtdb } from '../../firebase/config'
import { useStore } from '../../store'
import { logout } from '../../firebase/auth'
import styles from './UserBar.module.css'

export default function UserBar() {
  const {
    user, userProfile,
    micEnabled, headphonesEnabled,
    inputVolume, outputVolume,
    toggleMic, toggleHeadphones,
    setInputVolume, setOutputVolume,
    setShowSettings, setSettingsPage
  } = useStore()

  const [showVolume, setShowVolume] = useState(null) // 'input' | 'output' | null

  // Set presence in Realtime Database
  useEffect(() => {
    if (!user) return
    const presenceRef = ref(rtdb, `presence/${user.uid}`)
    set(presenceRef, { online: true, lastSeen: Date.now() })
    return () => set(presenceRef, { online: false, lastSeen: Date.now() })
  }, [user])

  function openSettings() {
    setSettingsPage('appearance')
    setShowSettings(true)
  }

  return (
    <div className={styles.bar}>
      <div className={styles.userInfo} onClick={openSettings}>
        <div className={styles.avatar}>
          {userProfile?.photoURL
            ? <img src={userProfile.photoURL} alt="" />
            : <span>{userProfile?.displayName?.[0]?.toUpperCase()}</span>
          }
          <span className={styles.onlineDot} />
        </div>
        <div className={styles.names}>
          <span className={styles.name}>{userProfile?.displayName}</span>
          <span className={styles.tag}>Online</span>
        </div>
      </div>

      <div className={styles.controls}>
        {/* Mic */}
        <div className={styles.volumeWrap}>
          <button
            className={`${styles.ctrl} ${!micEnabled ? styles.muted : ''}`}
            onClick={toggleMic}
            onContextMenu={e => { e.preventDefault(); setShowVolume(showVolume === 'input' ? null : 'input') }}
            title={micEnabled ? 'Mute mic (right-click for volume)' : 'Unmute mic'}
          >
            {micEnabled
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4zm-2 13.93V17h4v-2.07A6.001 6.001 0 0118 9h-2a4 4 0 01-8 0H6a6.001 6.001 0 014 5.93zM11 19h2v2h-2z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M3 3l18 18M9 9v3a3 3 0 004.12 2.76M15 9.34V5a3 3 0 00-5.94-.6"/></svg>
            }
          </button>
          {showVolume === 'input' && (
            <div className={styles.volumePopup}>
              <span>Mic Volume</span>
              <input type="range" min="0" max="500" value={inputVolume}
                onChange={e => setInputVolume(Number(e.target.value))} />
              <span>{inputVolume}%</span>
            </div>
          )}
        </div>

        {/* Headphones/deafen */}
        <div className={styles.volumeWrap}>
          <button
            className={`${styles.ctrl} ${!headphonesEnabled ? styles.muted : ''}`}
            onClick={toggleHeadphones}
            onContextMenu={e => { e.preventDefault(); setShowVolume(showVolume === 'output' ? null : 'output') }}
            title={headphonesEnabled ? 'Deafen (right-click for volume)' : 'Undeafen'}
          >
            {headphonesEnabled
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12a9 9 0 1118 0v2a3 3 0 01-3 3h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1v-1a7 7 0 10-14 0v1h1a1 1 0 011 1v3a1 1 0 01-1 1H4a3 3 0 01-3-3v-2z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3l18 18M3 12a9 9 0 0114.83-6.83M21 12a9 9 0 01-3 6.68V12a3 3 0 00-3-3h-1a1 1 0 00-1 1v3a1 1 0 001 1h1"/></svg>
            }
          </button>
          {showVolume === 'output' && (
            <div className={styles.volumePopup}>
              <span>Output Volume</span>
              <input type="range" min="0" max="500" value={outputVolume}
                onChange={e => setOutputVolume(Number(e.target.value))} />
              <span>{outputVolume}%</span>
            </div>
          )}
        </div>

        {/* Settings */}
        <button className={styles.ctrl} onClick={openSettings} title="User Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

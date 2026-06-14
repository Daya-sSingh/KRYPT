import { useStore } from '../../store'
import styles from './ChatHeader.module.css'

export default function ChatHeader({ conversation, conversationId, members }) {
  const { setActiveCall, setShowMembersList, showMembersList, activeServerId } = useStore()

  const name = conversation?.type === 'dm'
    ? 'Direct Message'
    : conversation?.name || 'Loading...'

  function startCall(type) {
    setActiveCall({ conversationId, type, members })
  }

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <span className={styles.icon}>
          {activeServerId === 'dms'
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            : <span style={{fontSize:16,color:'var(--text-dim)'}}>#</span>
          }
        </span>
        <span className={styles.name}>{name}</span>
        <span className={styles.encrypted}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          E2E Encrypted
        </span>
      </div>

      <div className={styles.actions}>
        {/* Voice call */}
        <button className={styles.btn} onClick={() => startCall('voice')} title="Start Voice Call">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        </button>

        {/* Video call */}
        <button className={styles.btn} onClick={() => startCall('video')} title="Start Video Call">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
        </button>

        {/* Screen share */}
        <button className={styles.btn} onClick={() => startCall('screen')} title="Share Screen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4a2 2 0 00-2 2v11a2 2 0 002 2h7v2H8v2h8v-2h-3v-2h7a2 2 0 002-2V5a2 2 0 00-2-2zm0 13H4V5h16v11z"/></svg>
        </button>

        {/* Members list toggle */}
        <button
          className={`${styles.btn} ${showMembersList ? styles.active : ''}`}
          onClick={() => setShowMembersList(!showMembersList)}
          title="Toggle Members"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 2a3 3 0 000-6M23 21v-2a4 4 0 00-3-3.87"/></svg>
        </button>
      </div>
    </div>
  )
}

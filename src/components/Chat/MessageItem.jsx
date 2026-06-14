import { useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { getPreviewUrl, downloadFile } from '../../utils/fileUpload'
import { useStore } from '../../store'
import styles from './MessageItem.module.css'

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday ' + format(date, 'h:mm a')
  return format(date, 'MMM d, h:mm a')
}

function shouldGroup(msg, prev) {
  if (!prev) return false
  if (msg.senderId !== prev.senderId) return false
  if (!msg.timestamp || !prev.timestamp) return false
  const a = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date()
  const b = prev.timestamp.toDate ? prev.timestamp.toDate() : new Date()
  return (a - b) < 5 * 60 * 1000 // within 5 min = group
}

export default function MessageItem({ message, prevMessage, currentUid, conversationId, members, onDelete, onReact }) {
  const { user } = useStore()
  const [showActions, setShowActions] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const isOwn = message.senderId === currentUid
  const grouped = shouldGroup(message, prevMessage)

  async function loadPreview() {
    if (previewUrl || !message.fileData) return
    const url = await getPreviewUrl(
      message.fileData.url, message.fileData.iv,
      message.fileData.mimeType, conversationId, currentUid, members
    )
    setPreviewUrl(url)
  }

  return (
    <div
      className={`${styles.row} ${grouped ? styles.grouped : ''} ${isOwn ? styles.own : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!grouped && (
        <div className={styles.avatar}>
          <span>{message.senderName?.[0]?.toUpperCase() || '?'}</span>
        </div>
      )}
      {grouped && <div className={styles.avatarSpacer} />}

      <div className={styles.content}>
        {!grouped && (
          <div className={styles.meta}>
            <span className={styles.name}>{message.senderName || 'Unknown'}</span>
            <span className={styles.time}>{formatTime(message.timestamp)}</span>
          </div>
        )}

        {message.type === 'text' && (
          <p className={styles.text}>{message.text}</p>
        )}

        {message.type === 'gif' && (
          <img
            src={message.gifUrl}
            alt="GIF"
            className={styles.gif}
            loading="lazy"
          />
        )}

        {message.type === 'image' && (
          <div className={styles.imageWrap} onMouseEnter={loadPreview}>
            {previewUrl
              ? <img src={previewUrl} alt={message.fileData?.name} className={styles.image} />
              : <div className={styles.imagePlaceholder} onClick={loadPreview}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                  <span>{message.fileData?.name}</span>
                </div>
            }
          </div>
        )}

        {message.type === 'file' && (
          <div
            className={styles.file}
            onClick={() => downloadFile({ ...message.fileData, conversationId, currentUid, members })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>
            <div>
              <p>{message.fileData?.name}</p>
              <span>{(message.fileData?.size / 1024).toFixed(1)} KB</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-4-4h3V4h2v8h3l-4 4zM4 20h16v2H4z"/></svg>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={styles.reactions}>
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button key={emoji} className={styles.reaction} onClick={() => onReact(emoji)}>
                {emoji} {Object.keys(users).length}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className={styles.actions}>
          {['👍','❤️','😂','😮'].map(e => (
            <button key={e} className={styles.actionBtn} onClick={() => onReact(e)}>{e}</button>
          ))}
          {isOwn && (
            <button className={`${styles.actionBtn} ${styles.delete}`} onClick={onDelete} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

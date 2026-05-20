import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { sendEncryptedMessage, subscribeMessages } from '../../firebase/messages';
import { encryptBytes } from '../../crypto/aes';
import { getChannelAesKey } from '../../crypto/channelKeys';
import { getMemberPublicKeys } from '../../firebase/users';
import { getB2DownloadUrl, getB2UploadUrl } from '../../lib/api';
import { GifPicker } from '../chat/GifPicker';
import type { ChatMessage } from '../../types';
import './ChatArea.css';

export function ChatArea() {
  const { user, profile, servers, channels, selectedServerId, selectedChannelId } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [gifOpen, setGifOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const server = servers.find((s) => s.id === selectedServerId);
  const channel = channels.find((c) => c.id === selectedChannelId);

  useEffect(() => {
    if (!selectedServerId || !selectedChannelId || !server) return;
    return subscribeMessages(
      selectedServerId,
      selectedChannelId,
      user.uid,
      server.memberIds,
      profile.settings.messageExpiry,
      setMessages,
    );
  }, [selectedServerId, selectedChannelId, server, user.uid, profile.settings.messageExpiry]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!server || !channel || channel.type !== 'text') {
    return (
      <div className="chat-area empty">
        <p>Select a text channel to chat.</p>
      </div>
    );
  }

  async function sendText(text: string) {
    if (!text.trim() || !selectedServerId || !selectedChannelId) return;
    setSending(true);
    try {
      await sendEncryptedMessage(
        selectedServerId,
        selectedChannelId,
        user.uid,
        server.memberIds,
        'text',
        { text: text.trim() },
        profile.settings.messageExpiry,
      );
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  async function sendGif(url: string) {
    setGifOpen(false);
    await sendEncryptedMessage(
      selectedServerId!,
      selectedChannelId!,
      user.uid,
      server!.memberIds,
      'gif',
      { gifUrl: url, text: '' },
      profile.settings.messageExpiry,
    );
  }

  async function uploadFile(file: File) {
    setSending(true);
    try {
      const publicKeys = await getMemberPublicKeys(server!.memberIds);
      const aesKey = await getChannelAesKey(
        selectedServerId!,
        selectedChannelId!,
        publicKeys,
        user.uid,
      );
      const encrypted = await encryptBytes(aesKey, await file.arrayBuffer());
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const encName = `${Date.now()}-${file.name}.enc`;

      const { uploadUrl, key } = await getB2UploadUrl(encName, 'application/octet-stream');
      await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'application/octet-stream' } });

      await sendEncryptedMessage(
        selectedServerId!,
        selectedChannelId!,
        user.uid,
        server!.memberIds,
        'file',
        { fileName: file.name, fileUrl: key, mime: file.type, text: file.name },
        profile.settings.messageExpiry,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-area">
      <div className="messages">
        <div className="welcome-banner">
          <h2>Welcome to #{channel.name}</h2>
          <p>Messages are encrypted on your device. Server only stores ciphertext.</p>
        </div>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.senderId === user.uid} />
        ))}
        <div ref={bottomRef} />
      </div>

      {gifOpen && <GifPicker onSelect={sendGif} onClose={() => setGifOpen(false)} />}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          sendText(draft);
        }}
      >
        <label className="composer-btn" title="Upload file">
          +
          <input
            type="file"
            hidden
            accept="image/*,audio/*,video/*,.pdf,.zip"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <button type="button" className="composer-btn" onClick={() => setGifOpen((o) => !o)}>GIF</button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message #${channel.name}`}
          disabled={sending}
        />
        <button type="submit" className="composer-btn send" disabled={!draft.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const [fileLink, setFileLink] = useState<string | null>(null);

  useEffect(() => {
    if (message.type === 'file' && message.fileUrl) {
      getB2DownloadUrl(message.fileUrl).then(setFileLink).catch(() => {});
    }
  }, [message]);

  return (
    <div className={`message ${isOwn ? 'own' : ''}`}>
      <div className="message-body">
        {message.type === 'gif' && message.gifUrl && (
          <img src={message.gifUrl} alt="GIF" className="msg-gif" />
        )}
        {message.type === 'file' && (
          <p>
            📎 {message.fileName}{' '}
            {fileLink && (
              <a href={fileLink} target="_blank" rel="noreferrer">
                Download (encrypted)
              </a>
            )}
          </p>
        )}
        {message.plaintext && <p>{message.plaintext}</p>}
      </div>
    </div>
  );
}

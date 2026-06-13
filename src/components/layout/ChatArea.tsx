import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { sendEncryptedMessage, subscribeMessages } from '../../firebase/messages';
import { encryptBytes, decryptBytes } from '../../crypto/aes';
import { getChannelAesKey } from '../../crypto/channelKeys';
import { getMemberPublicKeys } from '../../firebase/users';
import { getB2DownloadUrl, uploadEncryptedFile } from '../../lib/api';
import { isGifFile, saveGifFromBlob, saveGifFromUrl } from '../../lib/utils';
import { GifPicker } from '../chat/GifPicker';
import type { ChatMessage } from '../../types';
import './ChatArea.css';

export function ChatArea() {
  const { user, profile, servers, channels, selectedServerId, selectedChannelId } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [gifOpen, setGifOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
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
    setUploadError('');
    try {
      const publicKeys = await getMemberPublicKeys(server!.memberIds);
      const aesKey = await getChannelAesKey(
        selectedServerId!,
        selectedChannelId!,
        publicKeys,
        user.uid,
      );
      const encrypted = await encryptBytes(aesKey, await file.arrayBuffer());
      const encName = `${Date.now()}-${file.name}.enc`;

      const { key } = await uploadEncryptedFile(encName, 'application/octet-stream', encrypted);

      const isGif = isGifFile(file);

      await sendEncryptedMessage(
        selectedServerId!,
        selectedChannelId!,
        user.uid,
        server!.memberIds,
        isGif ? 'gif' : 'file',
        {
          fileName: file.name,
          fileUrl: key,
          mime: file.type,
          text: isGif ? '' : file.name,
          gifUrl: isGif ? `b2://${key}` : undefined,
        },
        profile.settings.messageExpiry,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(
        msg.includes('Failed to fetch') || msg.includes('network')
          ? 'File upload failed — check Netlify env vars (B2 keys) and redeploy.'
          : msg,
      );
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
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.senderId === user.uid}
            serverId={selectedServerId!}
            channelId={selectedChannelId!}
            memberIds={server.memberIds}
            myUid={user.uid}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {uploadError && <p className="upload-error">{uploadError}</p>}
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
            accept="image/*,audio/*,video/*,.gif,.pdf,.zip"
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

function MessageBubble({
  message,
  isOwn,
  serverId,
  channelId,
  memberIds,
  myUid,
}: {
  message: ChatMessage;
  isOwn: boolean;
  serverId: string;
  channelId: string;
  memberIds: string[];
  myUid: string;
}) {
  const [fileLink, setFileLink] = useState<string | null>(null);
  const [gifBlobUrl, setGifBlobUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isUploadedGif =
    message.type === 'gif' && message.fileUrl && message.gifUrl?.startsWith('b2://');
  const isGiphyGif = message.type === 'gif' && message.gifUrl && !message.gifUrl.startsWith('b2://');

  useEffect(() => {
    let revoked: string | null = null;

    async function loadFile() {
      if (message.type !== 'file' && !isUploadedGif) return;
      if (!message.fileUrl) return;
      try {
        const url = await getB2DownloadUrl(message.fileUrl);
        if (isUploadedGif) {
          const res = await fetch(url);
          const encBuf = await res.arrayBuffer();
          const publicKeys = await getMemberPublicKeys(memberIds);
          const aesKey = await getChannelAesKey(serverId, channelId, publicKeys, myUid);
          const dec = await decryptBytes(aesKey, encBuf);
          const blob = new Blob([dec], { type: 'image/gif' });
          const objUrl = URL.createObjectURL(blob);
          revoked = objUrl;
          setGifBlobUrl(objUrl);
        } else {
          setFileLink(url);
        }
      } catch {
        setFileLink(null);
      }
    }

    loadFile();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [message.id, message.fileUrl, isUploadedGif, serverId, channelId, memberIds, myUid, message.type]);

  async function saveGif() {
    setSaving(true);
    try {
      if (isGiphyGif && message.gifUrl) {
        await saveGifFromUrl(message.gifUrl, message.fileName || 'krypt-gif.gif');
      } else if (gifBlobUrl) {
        const res = await fetch(gifBlobUrl);
        await saveGifFromBlob(await res.blob(), message.fileName || 'krypt-gif.gif');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not save GIF');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`message ${isOwn ? 'own' : ''}`}>
      <div className="message-body">
        {isGiphyGif && message.gifUrl && (
          <>
            <img src={message.gifUrl} alt="GIF" className="msg-gif" />
            <button type="button" className="save-gif-btn" onClick={saveGif} disabled={saving}>
              {saving ? 'Saving…' : 'Save GIF'}
            </button>
          </>
        )}
        {isUploadedGif && gifBlobUrl && (
          <>
            <img src={gifBlobUrl} alt="GIF" className="msg-gif" />
            <button type="button" className="save-gif-btn" onClick={saveGif} disabled={saving}>
              {saving ? 'Saving…' : 'Save GIF'}
            </button>
          </>
        )}
        {message.type === 'file' && !isUploadedGif && (
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

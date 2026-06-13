import { useApp } from '../../context/AppContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { createChannel } from '../../firebase/servers';
import { channelKey } from '../../lib/utils';
import './ChannelList.css';

export function ChannelList() {
  const {
    user,
    profile,
    servers,
    channels,
    selectedServerId,
    selectedChannelId,
    setSelectedChannelId,
    setCall,
    call,
    setSettingsOpen,
    unreadCounts,
  } = useApp();

  const server = servers.find((s) => s.id === selectedServerId);
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  async function addChannel(type: 'text' | 'voice') {
    if (!selectedServerId) return;
    const name = prompt(type === 'text' ? 'Channel name?' : 'Voice channel name?');
    if (!name) return;
    await createChannel(selectedServerId, name.replace(/\s+/g, '-').toLowerCase(), type);
  }

  function joinVoice(chId: string) {
    if (call.mode && call.serverId === selectedServerId && call.channelId === chId) return;
    setCall({
      mode: 'group',
      serverId: selectedServerId!,
      channelId: chId,
      video: true,
      minimized: false,
    });
  }

  return (
    <aside className="channel-panel">
      <header className="channel-header">
        <span>{server?.name ?? 'Krypt'}</span>
      </header>

      <div className="channel-section">
        <div className="section-row">
          <p className="section-label">TEXT CHANNELS</p>
          <button type="button" className="section-add" onClick={() => addChannel('text')}>+</button>
        </div>
        {textChannels.map((ch) => {
          const key = channelKey(selectedServerId!, ch.id);
          const unread = unreadCounts[key] || 0;
          return (
            <button
              key={ch.id}
              type="button"
              className={[
                'channel-item',
                selectedChannelId === ch.id ? 'active' : '',
                unread > 0 ? 'has-unread' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setSelectedChannelId(ch.id)}
            >
              <span># {ch.name}</span>
              {unread > 0 && (
                <span className="channel-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="channel-section">
        <div className="section-row">
          <p className="section-label">VOICE CHANNELS</p>
          <button type="button" className="section-add" onClick={() => addChannel('voice')}>+</button>
        </div>
        {voiceChannels.map((ch) => {
          const inThisCall =
            call.mode && call.serverId === selectedServerId && call.channelId === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              className={`channel-item voice ${inThisCall ? 'in-call' : ''}`}
              onClick={() => joinVoice(ch.id)}
            >
              {inThisCall ? '📞' : '🔊'} {ch.name}
            </button>
          );
        })}
      </div>

      <footer className="user-panel">
        <div className="user-avatar">{(profile.displayName || user.email || '?')[0].toUpperCase()}</div>
        <div className="user-meta">
          <strong>{profile.displayName}</strong>
          <span>{user.email}</span>
        </div>
        <button type="button" className="icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>⚙</button>
        <button type="button" className="icon-btn" title="Log out" onClick={() => signOut(auth)}>⎋</button>
      </footer>
    </aside>
  );
}

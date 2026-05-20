import { useApp } from '../../context/AppContext';
import { ServerRail } from './ServerRail';
import { ChannelList } from './ChannelList';
import { ChatArea } from './ChatArea';
import { MembersPanel } from './MembersPanel';
import { SettingsModal } from '../settings/SettingsModal';
import { CallOverlay } from '../call/CallOverlay';
import './AppShell.css';

export function AppShell() {
  const { channels, selectedChannelId, setCall, selectedServerId } = useApp();
  const channel = channels.find((c) => c.id === selectedChannelId);

  return (
    <div className="app-shell">
      <ServerRail />
      <ChannelList />
      <main className="chat-main">
        <header className="chat-header">
          <h2>{channel ? (channel.type === 'text' ? `# ${channel.name}` : channel.name) : 'Krypt'}</h2>
          <div className="chat-header-actions">
            <button
              type="button"
              title="Voice call"
              onClick={() =>
                channel &&
                setCall({
                  mode: 'dm',
                  serverId: selectedServerId!,
                  channelId: channel.id,
                  video: false,
                })
              }
            >
              📞
            </button>
            <button
              type="button"
              title="Video call"
              onClick={() =>
                channel &&
                setCall({
                  mode: 'dm',
                  serverId: selectedServerId!,
                  channelId: channel.id,
                  video: true,
                })
              }
            >
              📹
            </button>
          </div>
        </header>
        <ChatArea />
      </main>
      <MembersPanel />
      <SettingsModal />
      <CallOverlay />
    </div>
  );
}

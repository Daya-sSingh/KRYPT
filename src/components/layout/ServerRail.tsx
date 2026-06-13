import { useState } from 'react';
import { auth } from '../../firebase/config';
import { useApp } from '../../context/AppContext';
import { createServer } from '../../firebase/servers';
import { channelKey } from '../../lib/utils';
import './ServerRail.css';

export function ServerRail() {
  const { servers, selectedServerId, setSelectedServerId, unreadCounts, channelsByServer } = useApp();
  const [adding, setAdding] = useState(false);

  function serverUnread(serverId: string) {
    const chs = channelsByServer[serverId] || [];
    return chs.reduce((sum, ch) => sum + (unreadCounts[channelKey(serverId, ch.id)] || 0), 0);
  }

  async function addServer() {
    const name = prompt('Server name?');
    if (!name) return;
    setAdding(true);
    try {
      const id = await createServer(auth.currentUser!.uid, name);
      setSelectedServerId(id);
    } finally {
      setAdding(false);
    }
  }

  return (
    <aside className="server-rail" aria-label="Servers">
      <img src="/icon.png" alt="Krypt" className="rail-logo" title="Krypt" />
      <div className="rail-divider" />
      {servers.map((s) => {
        const unread = serverUnread(s.id);
        return (
          <button
            key={s.id}
            type="button"
            className={[
              'rail-pill',
              selectedServerId === s.id ? 'active' : '',
              unread > 0 ? 'has-unread' : '',
            ].filter(Boolean).join(' ')}
            title={s.name}
            onClick={() => setSelectedServerId(s.id)}
          >
            {s.name[0].toUpperCase()}
            {unread > 0 && <span className="rail-badge">{unread > 99 ? '99+' : unread}</span>}
          </button>
        );
      })}
      <button type="button" className="rail-pill add" title="Add server" onClick={addServer} disabled={adding}>
        +
      </button>
    </aside>
  );
}

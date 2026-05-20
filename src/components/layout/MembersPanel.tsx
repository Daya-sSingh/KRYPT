import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { subscribePresence } from '../../firebase/presence';
import './MembersPanel.css';

export function MembersPanel() {
  const { servers, selectedServerId, profile } = useApp();
  const [online, setOnline] = useState<Record<string, boolean>>({});

  const server = servers.find((s) => s.id === selectedServerId);

  useEffect(() => {
    if (!server) return;
    return subscribePresence(server.memberIds, setOnline);
  }, [server]);

  if (!server) return null;

  return (
    <aside className="members-panel">
      <header>Members — {server.memberIds.length}</header>
      <ul>
        {server.memberIds.map((uid) => (
          <li key={uid} className={online[uid] ? 'member online' : 'member'}>
            {uid === profile.uid ? profile.displayName : uid.slice(0, 8)}
          </li>
        ))}
      </ul>
    </aside>
  );
}

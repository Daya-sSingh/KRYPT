import { useState } from 'react';
import { auth } from '../../firebase/config';
import { useApp } from '../../context/AppContext';
import { createServer } from '../../firebase/servers';
import './ServerRail.css';

export function ServerRail() {
  const { servers, selectedServerId, setSelectedServerId } = useApp();
  const [adding, setAdding] = useState(false);

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
      {servers.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`rail-pill ${selectedServerId === s.id ? 'active' : ''}`}
          title={s.name}
          onClick={() => setSelectedServerId(s.id)}
        >
          {s.name[0].toUpperCase()}
        </button>
      ))}
      <button type="button" className="rail-pill add" title="Add server" onClick={addServer} disabled={adding}>
        +
      </button>
    </aside>
  );
}

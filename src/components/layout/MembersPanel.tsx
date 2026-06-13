import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { subscribePresence } from '../../firebase/presence';
import { subscribeCallParticipants } from '../../firebase/callPresence';
import { channelKey } from '../../lib/utils';
import './MembersPanel.css';

export function MembersPanel() {
  const { servers, selectedServerId, selectedChannelId, profile, call, unreadSenders } = useApp();
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [inCall, setInCall] = useState<string[]>([]);

  const server = servers.find((s) => s.id === selectedServerId);
  const unreadKey = selectedServerId && selectedChannelId
    ? channelKey(selectedServerId, selectedChannelId)
    : '';
  const channelUnread = unreadSenders[unreadKey] || {};

  useEffect(() => {
    if (!server) return;
    return subscribePresence(server.memberIds, setOnline);
  }, [server]);

  useEffect(() => {
    if (!call.mode || !call.serverId || !call.channelId) {
      setInCall([]);
      return;
    }
    return subscribeCallParticipants(call.serverId, call.channelId, setInCall);
  }, [call.mode, call.serverId, call.channelId]);

  if (!server) return null;

  return (
    <aside className="members-panel">
      <header>Members — {server.memberIds.length}</header>
      <ul>
        {server.memberIds.map((uid) => {
          const onCall = inCall.includes(uid);
          const unreadFrom = channelUnread[uid] || 0;
          const hasUnread = unreadFrom > 0;
          const displayName = uid === profile.uid ? profile.displayName : uid.slice(0, 8);

          return (
            <li
              key={uid}
              className={[
                'member',
                onCall ? 'on-call' : online[uid] ? 'online' : '',
                hasUnread ? 'has-unread' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="member-avatar-wrap">
                <span className="member-avatar">{displayName[0].toUpperCase()}</span>
                {onCall ? (
                  <span className="member-badge call" title="In call">📞</span>
                ) : hasUnread ? (
                  <span className="member-badge unread" title="Unread messages">{unreadFrom}</span>
                ) : online[uid] ? (
                  <span className="member-badge online-dot" />
                ) : null}
              </span>
              <span className="member-name">{displayName}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

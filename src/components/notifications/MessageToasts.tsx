import { useApp } from '../../context/AppContext';
import './MessageToasts.css';

export function MessageToasts() {
  const { toasts, dismissToast, goToChannel } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="message-toasts">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className="message-toast"
          onClick={() => {
            goToChannel(t.serverId, t.channelId);
            dismissToast(t.id);
          }}
        >
          <span className="toast-channel">#{t.channelName}</span>
          <span className="toast-preview">{t.preview}</span>
          <span className="toast-action">Open</span>
        </button>
      ))}
    </div>
  );
}

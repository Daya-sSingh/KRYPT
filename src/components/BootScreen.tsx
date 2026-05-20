import './BootScreen.css';

interface BootScreenProps {
  status?: string;
}

/** Loading screen — KRYPT wordmark + tagline (shown on app open). */
export function BootScreen({ status = 'Loading…' }: BootScreenProps) {
  return (
    <div className="boot-screen" role="status" aria-live="polite" aria-busy="true">
      <img
        src="/logo-wordmark.png"
        alt="KRYPT — end-to-end encrypted"
        className="boot-wordmark"
        width={320}
        height={120}
      />
      <p className="boot-status">{status}</p>
      <div className="boot-spinner" aria-hidden="true" />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { updateUserSettings } from '../../firebase/users';
import type { ExpiryPolicy, UserSettings } from '../../types';
import './SettingsModal.css';

export function SettingsModal() {
  const { profile, settingsOpen, setSettingsOpen, refreshProfile } = useApp();
  const [settings, setSettings] = useState<UserSettings>(profile.settings);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    setSettings(profile.settings);
  }, [profile.settings]);

  useEffect(() => {
    if (!settingsOpen) return;
    navigator.mediaDevices.enumerateDevices().then(setDevices);
  }, [settingsOpen]);

  if (!settingsOpen) return null;

  async function save() {
    await updateUserSettings(profile.uid, settings);
    await refreshProfile();
    setSettingsOpen(false);
  }

  return (
    <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={() => setSettingsOpen(false)}>✕</button>
        </header>

        <section>
          <h3>Appearance</h3>
          <label>
            Accent color
            <input
              type="color"
              value={settings.accent}
              onChange={(e) => setSettings({ ...settings, accent: e.target.value })}
            />
          </label>
          <label>
            Background
            <input
              type="color"
              value={settings.bgPrimary}
              onChange={(e) => setSettings({ ...settings, bgPrimary: e.target.value })}
            />
          </label>
        </section>

        <section>
          <h3>Voice &amp; Video</h3>
          <label>
            Microphone
            <select
              value={settings.audioInputId}
              onChange={(e) => setSettings({ ...settings, audioInputId: e.target.value })}
            >
              <option value="">Default</option>
              {devices.filter((d) => d.kind === 'audioinput').map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mic'}</option>
              ))}
            </select>
          </label>
          <label>
            Headphones / speakers
            <select
              value={settings.audioOutputId}
              onChange={(e) => setSettings({ ...settings, audioOutputId: e.target.value })}
            >
              <option value="">Default</option>
              {devices.filter((d) => d.kind === 'audiooutput').map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Output'}</option>
              ))}
            </select>
          </label>
          <label>
            User volume (max 500%)
            <input
              type="range"
              min={0}
              max={500}
              value={settings.userVolume}
              onChange={(e) => setSettings({ ...settings, userVolume: Number(e.target.value) })}
            />
            <span>{settings.userVolume}%</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.streamMaxQuality}
              onChange={(e) => setSettings({ ...settings, streamMaxQuality: e.target.checked })}
            />
            Stream at native screen resolution
          </label>
        </section>

        <section>
          <h3>Privacy</h3>
          <label>
            Default message expiry
            <select
              value={settings.messageExpiry}
              onChange={(e) => setSettings({ ...settings, messageExpiry: e.target.value as ExpiryPolicy })}
            >
              <option value="never">Never</option>
              <option value="view">After viewing</option>
              <option value="1m">1 minute</option>
              <option value="10m">10 minutes</option>
              <option value="1h">1 hour</option>
              <option value="1d">1 day</option>
            </select>
          </label>
        </section>

        <footer>
          <button type="button" className="btn-secondary" onClick={() => setSettingsOpen(false)}>Cancel</button>
          <button type="button" className="btn-accent" onClick={save}>Save</button>
        </footer>
      </div>
    </div>
  );
}

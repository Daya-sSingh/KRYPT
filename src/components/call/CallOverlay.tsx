import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
} from 'livekit-client';
import { useApp } from '../../context/AppContext';
import { getLiveKitToken } from '../../lib/api';
import { joinCallPresence, leaveCallPresence } from '../../firebase/callPresence';
import './CallOverlay.css';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function CallOverlay() {
  const { user, profile, call, setCall, channels, selectedServerId, selectedChannelId } = useApp();
  const [status, setStatus] = useState('Connecting…');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionKeyRef = useRef<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const callChannel = channels.find((c) => c.id === call.channelId);
  const isGroup = call.mode === 'group' || callChannel?.type === 'voice';
  const onCallView =
    call.mode &&
    selectedServerId === call.serverId &&
    selectedChannelId === call.channelId;

  useEffect(() => {
    if (!call.mode) return;
    if (!onCallView) {
      setCall((prev) => (prev.minimized ? prev : { ...prev, minimized: true }));
    }
  }, [call.mode, onCallView, selectedServerId, selectedChannelId, setCall]);

  useEffect(() => {
    if (!call.mode) {
      const prev = sessionKeyRef.current;
      if (prev) {
        const [mode, serverId, channelId] = prev.split('|');
        leaveCallPresence(serverId, channelId, user.uid).catch(() => {});
      }
      sessionKeyRef.current = null;
      roomRef.current?.disconnect();
      roomRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      return;
    }

    const sessionKey = `${call.mode}|${call.serverId}|${call.channelId}`;
    if (sessionKeyRef.current === sessionKey) return;

    sessionKeyRef.current = sessionKey;
    let cancelled = false;

    async function startGroup() {
      try {
        const roomName = `${call.serverId}-${call.channelId}`;
        const token = await getLiveKitToken(roomName, user.uid, profileRef.current.displayName);
        if (cancelled) return;

        const room = new Room({ adaptiveStream: false, dynacast: false });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
          }
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            el.volume = Math.min(profileRef.current.settings.userVolume / 100, 5);
          }
        });

        const url = import.meta.env.VITE_LIVEKIT_URL;
        if (!url) throw new Error('VITE_LIVEKIT_URL not set');
        await room.connect(url, token);
        if (cancelled) return;

        await joinCallPresence(call.serverId, call.channelId, user.uid);

        const tracks = await createLocalTracks({
          audio: profileRef.current.settings.audioInputId
            ? { deviceId: profileRef.current.settings.audioInputId }
            : true,
          video: call.video,
        });

        for (const t of tracks) await room.localParticipant.publishTrack(t);
        if (call.video && localVideoRef.current) {
          const vt = tracks.find((t) => t.kind === Track.Kind.Video);
          if (vt) vt.attach(localVideoRef.current);
        }

        setStatus('Connected');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Call failed');
      }
    }

    async function startDm() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: profileRef.current.settings.audioInputId
            ? { deviceId: { exact: profileRef.current.settings.audioInputId } }
            : true,
          video: call.video,
        });
        if (cancelled) return;

        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(STUN);
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = ev.streams[0];
          }
          const el = document.createElement('audio');
          el.srcObject = ev.streams[0];
          el.volume = Math.min(profileRef.current.settings.userVolume / 100, 5);
          el.autoplay = true;
          document.body.appendChild(el);
        };

        await joinCallPresence(call.serverId, call.channelId, user.uid);
        setStatus('In call');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Call failed');
      }
    }

    if (isGroup) startGroup();
    else startDm();

    return () => {
      cancelled = true;
    };
  }, [call.mode, call.serverId, call.channelId, call.video, isGroup, user.uid]);

  async function shareScreen() {
    try {
      if (roomRef.current) {
        await roomRef.current.localParticipant.setScreenShareEnabled(true, {
          audio: true,
          resolution: profile.settings.streamMaxQuality
            ? { width: screen.width, height: screen.height }
            : undefined,
        });
        return;
      }

      const display = await navigator.mediaDevices.getDisplayMedia({
        video: profile.settings.streamMaxQuality
          ? { width: { ideal: screen.width }, height: { ideal: screen.height } }
          : true,
        audio: true,
      });

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        const [track] = display.getVideoTracks();
        if (sender && track) await sender.replaceTrack(track);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = display;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Screen share failed');
    }
  }

  function endCall() {
    if (call.serverId && call.channelId) {
      leaveCallPresence(call.serverId, call.channelId, user.uid).catch(() => {});
    }
    roomRef.current?.disconnect();
    roomRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    sessionKeyRef.current = null;
    setCall({ mode: null, channelId: '', serverId: '', video: false, minimized: false });
  }

  if (!call.mode) return null;

  if (call.minimized) {
    return (
      <div className="call-bar">
        <span className="call-bar-status">📞 {isGroup ? 'Group call' : 'Call'} — {status}</span>
        <div className="call-bar-actions">
          <button
            type="button"
            onClick={() => setCall((prev) => ({ ...prev, minimized: false }))}
          >
            Expand
          </button>
          <button type="button" onClick={shareScreen}>Share</button>
          <button type="button" className="danger" onClick={endCall}>Leave</button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-overlay">
      <header>
        <span>{isGroup ? 'Group call' : 'Direct call'} — {status}</span>
        <div>
          <button type="button" onClick={() => setCall((prev) => ({ ...prev, minimized: true }))}>
            Minimize
          </button>
          <button type="button" onClick={endCall}>Leave</button>
        </div>
      </header>
      <div className="call-videos">
        <video ref={localVideoRef} autoPlay muted playsInline className="local" />
        <video ref={remoteVideoRef} autoPlay playsInline className="remote" />
      </div>
      <footer>
        <button type="button" onClick={shareScreen}>Share screen</button>
        <button type="button" onClick={endCall} className="danger">Disconnect</button>
      </footer>
    </div>
  );
}

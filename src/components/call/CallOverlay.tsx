import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
} from 'livekit-client';
import { useApp } from '../../context/AppContext';
import { getLiveKitToken } from '../../lib/api';
import './CallOverlay.css';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function CallOverlay() {
  const { user, profile, call, setCall, channels, selectedServerId } = useApp();
  const [status, setStatus] = useState('Connecting…');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const channel = channels.find((c) => c.id === call.channelId);
  const isVoiceChannel = channel?.type === 'voice';
  const isGroup = call.mode === 'group' || isVoiceChannel;

  useEffect(() => {
    if (!call.mode) return;

    let stopped = false;

    async function startGroup() {
      try {
        const roomName = `${call.serverId}-${call.channelId}`;
        const token = await getLiveKitToken(roomName, user.uid, profile.displayName);
        const room = new Room({
          adaptiveStream: false,
          dynacast: false,
        });
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current);
          }
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLAudioElement;
            el.volume = Math.min(profile.settings.userVolume / 100, 5);
          }
        });

        const url = import.meta.env.VITE_LIVEKIT_URL;
        if (!url) throw new Error('VITE_LIVEKIT_URL not set');
        await room.connect(url, token);

        const tracks = await createLocalTracks({
          audio: profile.settings.audioInputId
            ? { deviceId: profile.settings.audioInputId }
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
          audio: profile.settings.audioInputId
            ? { deviceId: { exact: profile.settings.audioInputId } }
            : true,
          video: call.video,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(STUN);
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = ev.streams[0];
            const audio = ev.streams[0].getAudioTracks()[0];
            if (audio) {
              const el = document.createElement('audio');
              el.srcObject = ev.streams[0];
              el.volume = Math.min(profile.settings.userVolume / 100, 5);
              el.autoplay = true;
              document.body.appendChild(el);
            }
          }
        };

        setStatus('DM call active (invite peer via same channel)');
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Call failed');
      }
    }

    if (isGroup) startGroup();
    else startDm();

    return () => {
      stopped = true;
      roomRef.current?.disconnect();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [call, user.uid, profile, isGroup]);

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
    roomRef.current?.disconnect();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setCall({ mode: null, channelId: '', serverId: '' });
  }

  if (!call.mode) return null;

  return (
    <div className="call-overlay">
      <header>
        <span>{isGroup ? 'Group call' : 'Direct call'} — {status}</span>
        <button type="button" onClick={endCall}>Leave</button>
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

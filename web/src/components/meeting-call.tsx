"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { Loader2, Mic, MicOff, MonitorUp, NotebookPen, PhoneOff, Users, Video, VideoOff, X } from "lucide-react";
import { getSocket } from "@/lib/socket";

// The video call for a meeting. Sound and picture go straight from browser to browser (WebRTC);
// the WorkNest server only introduces people to each other over the existing socket.

interface PeerInfo {
  peerId: string;
  userId: string;
  name: string;
}

interface RemotePeer extends PeerInfo {
  stream: MediaStream;
  audio: boolean;
  video: boolean;
  screen: boolean;
  connected: boolean;
}

interface Signal {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface PeerLink {
  pc: RTCPeerConnection;
  /** Network candidates that arrived before the other side's description did. */
  pending: RTCIceCandidateInit[];
  audio?: RTCRtpSender;
  video?: RTCRtpSender;
}

interface JoinReply {
  error?: string;
  self?: PeerInfo;
  peers?: PeerInfo[];
}

const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

export function MeetingCall({ meetingId, title, notes, onClose }: { meetingId: string; title: string; notes?: ReactNode; onClose: () => void }) {
  const [phase, setPhase] = useState<"starting" | "live" | "error">("starting");
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [self, setSelf] = useState<PeerInfo | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [mic, setMic] = useState(false);
  const [camera, setCamera] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const links = useRef(new Map<string, PeerLink>());
  const tracks = useRef<{ audio: MediaStreamTrack | null; camera: MediaStreamTrack | null; screen: MediaStreamTrack | null }>({ audio: null, camera: null, screen: null });
  const shared = useRef({ audio: false, video: false, screen: false });

  /** Push whatever we are currently sending (mic, camera or screen) to everyone, and tell them what it is. */
  const publish = useCallback(() => {
    const t = tracks.current;
    const video = t.screen ?? t.camera;
    shared.current = { audio: !!t.audio?.enabled, video: !!video, screen: !!t.screen };
    setMic(shared.current.audio);
    setCamera(!!t.camera);
    setSharing(!!t.screen);
    setPreview(video ? new MediaStream([video]) : null);
    for (const link of links.current.values()) {
      void link.audio?.replaceTrack(t.audio).catch(() => {});
      void link.video?.replaceTrack(video).catch(() => {});
    }
    getSocket().emit("call:state", shared.current);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const all = links.current;
    const mine = tracks.current;
    let cancelled = false;

    const patch = (peerId: string, change: Partial<RemotePeer>) => setPeers((list) => list.map((p) => (p.peerId === peerId ? { ...p, ...change } : p)));

    function drop(peerId: string) {
      const link = all.get(peerId);
      if (link) {
        link.pc.onicecandidate = link.pc.ontrack = link.pc.onconnectionstatechange = link.pc.onnegotiationneeded = null;
        link.pc.close();
        all.delete(peerId);
      }
      setPeers((list) => list.filter((p) => p.peerId !== peerId));
    }

    // Whoever joins later makes the offer, so two people never offer to each other at once.
    function connect(peer: PeerInfo, initiator: boolean) {
      drop(peer.peerId);
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const link: PeerLink = { pc, pending: [] };
      all.set(peer.peerId, link);
      const stream = new MediaStream();
      setPeers((list) => [...list, { ...peer, stream, audio: false, video: false, screen: false, connected: false }]);

      const send = (data: Signal) => socket.emit("call:signal", { to: peer.peerId, data });
      pc.onicecandidate = (e) => e.candidate && send({ candidate: e.candidate.toJSON() });
      pc.ontrack = (e) => {
        if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
      };
      pc.onconnectionstatechange = () => {
        patch(peer.peerId, { connected: pc.connectionState === "connected" });
        if (pc.connectionState === "failed" && initiator) pc.restartIce();
      };
      pc.onnegotiationneeded = async () => {
        if (!initiator) return;
        try {
          await pc.setLocalDescription();
          if (pc.localDescription) send({ description: pc.localDescription.toJSON() });
        } catch (err) {
          console.warn("call: could not make an offer", err);
        }
      };
      if (initiator) {
        // One audio and one video line, always. Camera, mute and screen share only swap what flows through them.
        link.audio = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
        link.video = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
        void link.audio.replaceTrack(mine.audio);
        void link.video.replaceTrack(mine.screen ?? mine.camera);
      }
    }

    async function onSignal({ from, data }: { from: string; data: Signal }) {
      const link = all.get(from);
      if (!link || !data) return;
      const { pc } = link;
      try {
        if (data.description) {
          await pc.setRemoteDescription(data.description);
          for (const c of link.pending.splice(0)) await pc.addIceCandidate(c);
          if (data.description.type !== "offer") return;
          if (!link.audio) {
            for (const tr of pc.getTransceivers()) {
              tr.direction = "sendrecv";
              if (tr.receiver.track.kind === "audio") link.audio = tr.sender;
              else link.video = tr.sender;
            }
            await link.audio?.replaceTrack(mine.audio);
            await link.video?.replaceTrack(mine.screen ?? mine.camera);
          }
          await pc.setLocalDescription();
          if (pc.localDescription) socket.emit("call:signal", { to: from, data: { description: pc.localDescription.toJSON() } });
        } else if (data.candidate) {
          if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
          else link.pending.push(data.candidate);
        }
      } catch (err) {
        console.warn("call: signalling problem", err);
      }
    }

    function join() {
      for (const id of [...all.keys()]) drop(id);
      socket.timeout(15000).emit("call:join", meetingId, (err: Error | null, res?: JoinReply) => {
        if (cancelled) return;
        if (err || !res?.self) {
          setProblem(res?.error ?? "Could not reach WorkNest. Check your connection and try again.");
          setPhase("error");
          return;
        }
        setSelf(res.self);
        setPhase("live");
        for (const peer of res.peers ?? []) connect(peer, true);
        socket.emit("call:state", shared.current);
      });
    }

    const onPeerJoined = (peer: PeerInfo) => {
      connect(peer, false);
      // The newcomer has no idea who is muted yet.
      socket.emit("call:state", shared.current);
    };
    const onPeerLeft = ({ peerId }: { peerId: string }) => drop(peerId);
    const onState = ({ peerId, ...s }: { peerId: string; audio: boolean; video: boolean; screen: boolean }) => patch(peerId, s);

    socket.on("call:peer-joined", onPeerJoined);
    socket.on("call:peer-left", onPeerLeft);
    socket.on("call:state", onState);
    socket.on("call:signal", onSignal);
    // After a dropped connection the server has forgotten us, so start over.
    socket.on("connect", join);

    (async () => {
      const media = navigator.mediaDevices;
      let stream: MediaStream | null = null;
      if (media?.getUserMedia) {
        const audio = { echoCancellation: true, noiseSuppression: true };
        stream = await media.getUserMedia({ audio, video: { width: { ideal: 1280 }, height: { ideal: 720 } } }).catch(() => media.getUserMedia({ audio }).catch(() => null));
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      mine.audio = stream?.getAudioTracks()[0] ?? null;
      mine.camera = stream?.getVideoTracks()[0] ?? null;
      if (!mine.audio) setNotice("Your browser did not give WorkNest the microphone, so others cannot hear you. Allow it in the address bar, then press the mic button.");
      else if (!mine.camera) setNotice("No camera was found or allowed, so you joined with sound only.");
      publish();
      if (socket.connected) join();
    })();

    return () => {
      cancelled = true;
      socket.off("call:peer-joined", onPeerJoined);
      socket.off("call:peer-left", onPeerLeft);
      socket.off("call:state", onState);
      socket.off("call:signal", onSignal);
      socket.off("connect", join);
      socket.emit("call:leave");
      for (const id of [...all.keys()]) drop(id);
      for (const key of ["audio", "camera", "screen"] as const) {
        mine[key]?.stop();
        mine[key] = null;
      }
    };
  }, [meetingId, publish]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (phase !== "live") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  async function toggleMic() {
    const t = tracks.current;
    if (t.audio) t.audio.enabled = !t.audio.enabled;
    else {
      const stream = await navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).catch(() => null);
      if (!stream) return setNotice("The microphone is blocked. Allow it for this site in the address bar and try again.");
      t.audio = stream.getAudioTracks()[0];
      setNotice(null);
    }
    publish();
  }

  async function toggleCamera() {
    const t = tracks.current;
    if (t.camera) {
      // Stopped rather than paused, so the camera light actually goes off.
      t.camera.stop();
      t.camera = null;
    } else {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } }).catch(() => null);
      if (!stream) return setNotice("The camera is blocked or in use by another app. Allow it for this site and try again.");
      t.camera = stream.getVideoTracks()[0];
      setNotice(null);
    }
    publish();
  }

  async function toggleScreen() {
    const t = tracks.current;
    if (t.screen) {
      t.screen.stop();
      t.screen = null;
    } else {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true }).catch(() => null);
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      // Fires when sharing is stopped from the browser's own bar.
      track.onended = () => {
        if (tracks.current.screen === track) tracks.current.screen = null;
        publish();
      };
      t.screen = track;
    }
    publish();
  }

  if (typeof document === "undefined") return null;

  const count = peers.length + 1;
  const canShare = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-[80] flex flex-col bg-[#0b0d14] text-white" role="dialog" aria-label={`Call: ${title}`}>
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="flex items-center gap-2 text-xs text-white/50">
            {phase === "live" ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-400" /> {clock(seconds)}
                <Users className="ml-2 size-3.5" /> <span data-testid="call-count">{count}</span> in the call
              </>
            ) : (
              "WorkNest call"
            )}
          </p>
        </div>
        <span className="hidden text-xs text-white/40 sm:block">Direct between browsers. Nothing is recorded.</span>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
          {phase === "error" ? (
            <div className="m-auto max-w-sm text-center">
              <p className="text-lg font-semibold">Could not join the call</p>
              <p className="mt-2 text-sm text-white/60">{problem}</p>
              <button onClick={onClose} className="mt-5 h-10 rounded-xl bg-white px-5 text-sm font-semibold text-[#0b0d14]">
                Close
              </button>
            </div>
          ) : (
            <div className={clsx("grid min-h-0 flex-1 auto-rows-fr gap-3", count === 1 ? "grid-cols-1" : count <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-3")}>
              <Tile you name={self?.name ?? "You"} stream={preview} audio={mic} video={!!preview} screen={sharing} connected={phase === "live"} />
              {peers.map((p) => (
                <Tile key={p.peerId} name={p.name} stream={p.stream} audio={p.audio} video={p.video} screen={p.screen} connected={p.connected} />
              ))}
            </div>
          )}
          {phase === "live" && count === 1 && <p className="mt-3 text-center text-sm text-white/50">You are the only one here. The others join from this meeting&apos;s page.</p>}
          {notice && (
            <p className="mx-auto mt-3 flex max-w-xl items-start gap-2 rounded-xl bg-amber-400/15 px-3.5 py-2 text-sm text-amber-100">
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice(null)} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </p>
          )}
        </div>

        {showNotes && notes && (
          <aside className="absolute inset-y-0 right-0 z-10 flex w-full max-w-sm flex-col border-l border-white/10 bg-white text-ink lg:static">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Meeting notes</p>
              <button onClick={() => setShowNotes(false)} aria-label="Close notes" className="text-muted hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{notes}</div>
          </aside>
        )}
      </div>

      <footer className="flex items-center justify-center gap-2.5 border-t border-white/10 px-4 py-3.5 sm:gap-3">
        <Control label={mic ? "Mute" : "Unmute"} on={mic} onClick={toggleMic} disabled={phase !== "live"}>
          {mic ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </Control>
        <Control label={camera ? "Turn camera off" : "Turn camera on"} on={camera} onClick={toggleCamera} disabled={phase !== "live"}>
          {camera ? <Video className="size-5" /> : <VideoOff className="size-5" />}
        </Control>
        {canShare && (
          <Control label={sharing ? "Stop sharing" : "Share your screen"} on={!sharing} highlight={sharing} onClick={toggleScreen} disabled={phase !== "live"}>
            <MonitorUp className="size-5" />
          </Control>
        )}
        {notes && (
          <Control label="Notes" on={!showNotes} highlight={showNotes} onClick={() => setShowNotes((v) => !v)}>
            <NotebookPen className="size-5" />
          </Control>
        )}
        <button onClick={onClose} className="ml-2 inline-flex h-12 items-center gap-2 rounded-full bg-red-500 px-5 text-sm font-semibold transition-colors hover:bg-red-600">
          <PhoneOff className="size-5" /> Leave
        </button>
      </footer>
    </motion.div>,
    document.body,
  );
}

function Control({ label, on, highlight, disabled, onClick, children }: { label: string; on: boolean; highlight?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx("flex size-12 items-center justify-center rounded-full transition-colors disabled:opacity-40", highlight ? "bg-brand text-white" : on ? "bg-white/10 hover:bg-white/20" : "bg-white text-[#0b0d14]")}
    >
      {children}
    </button>
  );
}

function Tile({ name, stream, you, audio, video, screen, connected }: { name: string; stream: MediaStream | null; you?: boolean; audio: boolean; video: boolean; screen: boolean; connected: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [stream]);

  return (
    <div data-testid={you ? "call-self" : "call-peer"} className="relative min-h-40 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
      {/* Always mounted: for other people this element is also what plays their sound. */}
      <video ref={ref} autoPlay playsInline muted={you} className={clsx("absolute inset-0 size-full bg-black", screen ? "object-contain" : "object-cover", you && !screen && "-scale-x-100", !video && "opacity-0")} />
      {!video && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-brand-gradient text-2xl font-semibold">{initials(name)}</span>
        </div>
      )}
      {!you && !connected && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-sm text-white/80">
          <Loader2 className="size-4 animate-spin" /> Connecting…
        </div>
      )}
      <div className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium backdrop-blur">
        {!audio && <MicOff className="size-3.5 shrink-0 text-red-400" />}
        <span className="truncate">
          {name}
          {you && " (you)"}
          {screen && " · screen"}
        </span>
      </div>
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

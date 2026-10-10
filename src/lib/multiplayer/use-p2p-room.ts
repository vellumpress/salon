/**
 * React binding for P2PRoom. Identity and room id are captured once on mount
 * (useState initializers) so re-renders never tear down the mesh: the P2PRoom
 * instance lives exactly as long as the component that mounted it, and
 * changing `room`/`name` requires a remount (key the component on them).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PeerInfo } from "./p2p";
import { keepSitIdentity } from "./sit-logic";
import { RealtimeSitRoom, type SitLink, type SitMeta } from "./realtime-room";

export interface UseP2PRoomOptions {
  room?: string;
  name?: string;
  /** False skips the Realtime channel (tests and offline shells). */
  enabled?: boolean;
  /** Bump to rejoin the same room after a quiet line. */
  attempt?: number;
}

export interface P2PRoomHandle {
  selfId: string;
  room: string;
  peers: PeerInfo[];
  joined: boolean;
  /** Realtime channel failed to open. */
  unavailable: boolean;
  /** live, retrying, or quiet after repeated drops. */
  link: SitLink;
  setMeta: (meta: SitMeta) => void;
  broadcast: (data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  onMessage: (
    fn: (from: string, data: unknown, channel: "state" | "reliable") => void,
  ) => () => void;
}

function defaultRoom(): string {
  if (typeof window === "undefined") return "room-ssr";
  return `room-${window.location.hostname.split(".")[0]}`.slice(0, 64);
}

function sitSelfId(room: string): string {
  const fresh = () => `p-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof window === "undefined") return fresh();
  const key = `tbr-sit-self:${room}`;
  try {
    const kept = keepSitIdentity(window.sessionStorage.getItem(key));
    if (kept) return kept;
    const id = fresh();
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return fresh();
  }
}

export function useP2PRoom(options: UseP2PRoomOptions = {}): P2PRoomHandle {
  const enabled = options.enabled !== false;
  const attempt = options.attempt ?? 0;
  const [room] = useState(() => options.room ?? defaultRoom());
  const [selfId] = useState(() => sitSelfId(options.room ?? defaultRoom()));
  const [name] = useState(() => options.name ?? "");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const [unavailable, setUnavailable] = useState(!enabled);
  const [link, setLink] = useState<SitLink>(enabled ? "reconnecting" : "offline");
  const roomRef = useRef<RealtimeSitRoom | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
    if (!enabled) return;
    setUnavailable(false);
    setJoined(false);
    const p2p = new RealtimeSitRoom({
      room,
      selfId,
      name,
      onPeersChanged: setPeers,
      onMessage: (from, data, channel) => {
        for (const fn of listeners.current) fn(from, data, channel);
      },
      onConnected: () => setJoined(true),
      onUnavailable: () => setUnavailable(true),
      onStatus: (status) => {
        setLink(status);
        if (status !== "live") setJoined(false);
      },
    });
    roomRef.current = p2p;
    p2p.join();
    return () => {
      roomRef.current = null;
      p2p.close();
    };
  }, [enabled, room, selfId, name, attempt]);

  const setMeta = useCallback((meta: SitMeta) => roomRef.current?.setMeta(meta), []);
  const broadcast = useCallback((data: unknown) => roomRef.current?.broadcast(data), []);
  const send = useCallback(
    (data: unknown, peerId?: string) => roomRef.current?.send(data, peerId),
    [],
  );
  const onMessage = useCallback(
    (fn: (from: string, data: unknown, channel: "state" | "reliable") => void) => {
      listeners.current.add(fn);
      return () => {
        listeners.current.delete(fn);
      };
    },
    [],
  );

  return { selfId, room, peers, joined, unavailable, link, setMeta, broadcast, send, onMessage };
}

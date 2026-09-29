/**
 * React binding for P2PRoom. Identity and room id are captured once on mount
 * (useState initializers) so re-renders never tear down the mesh: the P2PRoom
 * instance lives exactly as long as the component that mounted it, and
 * changing `room`/`name` requires a remount (key the component on them).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PeerInfo } from "./p2p";
import { RealtimeSitRoom } from "./realtime-room";

export interface UseP2PRoomOptions {
  room?: string;
  name?: string;
  /** False skips the Realtime channel (tests and offline shells). */
  enabled?: boolean;
}

export interface P2PRoomHandle {
  selfId: string;
  room: string;
  peers: PeerInfo[];
  joined: boolean;
  /** Realtime channel failed to open. */
  unavailable: boolean;
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

export function useP2PRoom(options: UseP2PRoomOptions = {}): P2PRoomHandle {
  const enabled = options.enabled !== false;
  const [selfId] = useState(() => `p-${Math.random().toString(36).slice(2, 10)}`);
  const [room] = useState(() => options.room ?? defaultRoom());
  const [name] = useState(() => options.name ?? selfId);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const [unavailable, setUnavailable] = useState(!enabled);
  const roomRef = useRef<RealtimeSitRoom | null>(null);
  const listeners = useRef(
    new Set<(from: string, data: unknown, channel: "state" | "reliable") => void>(),
  );

  useEffect(() => {
    if (!enabled) return;
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
    });
    roomRef.current = p2p;
    p2p.join();
    return () => {
      roomRef.current = null;
      p2p.close();
    };
  }, [enabled, room, selfId, name]);

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

  return { selfId, room, peers, joined, unavailable, broadcast, send, onMessage };
}

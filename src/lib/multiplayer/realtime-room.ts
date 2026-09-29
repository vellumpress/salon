/**
 * One Supabase Realtime channel per sitting room.
 * Presence is who is here. Broadcast carries position and chat.
 * No /api/rtc poll and no server function.
 */
import { getSupabase } from "@/lib/supabase";
import type { PeerInfo } from "./p2p";

export interface RealtimeRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
  onUnavailable?: () => void;
}

type PresenceRow = { id?: string; name?: string };

export class RealtimeSitRoom {
  private channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
  private peers = new Map<string, PeerInfo>();
  private closed = false;

  constructor(private readonly opts: RealtimeRoomOptions) {}

  join() {
    const channel = getSupabase().channel(`sit:${this.opts.room}`.slice(0, 80), {
      config: {
        broadcast: { self: false },
        presence: { key: this.opts.selfId },
      },
    });
    this.channel = channel;
    channel
      .on("broadcast", { event: "msg" }, ({ payload }) => {
        if (this.closed || !payload || typeof payload !== "object") return;
        const body = payload as { from?: unknown; to?: unknown; data?: unknown };
        const from = typeof body.from === "string" ? body.from : "";
        if (!from || from === this.opts.selfId) return;
        if (typeof body.to === "string" && body.to && body.to !== this.opts.selfId) return;
        this.opts.onMessage?.(from, body.data, "reliable");
      })
      .on("presence", { event: "sync" }, () => this.syncPresence())
      .on("presence", { event: "join" }, () => this.syncPresence())
      .on("presence", { event: "leave" }, () => this.syncPresence())
      .subscribe((status) => {
        if (this.closed) return;
        if (status === "SUBSCRIBED") {
          void channel.track({ id: this.opts.selfId, name: this.opts.name ?? "" });
          this.opts.onConnected?.();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.opts.onUnavailable?.();
        }
      });
  }

  close() {
    this.closed = true;
    const channel = this.channel;
    this.channel = null;
    this.peers.clear();
    if (channel) void getSupabase().removeChannel(channel);
  }

  broadcast(data: unknown) {
    this.send(data);
  }

  send(data: unknown, peerId?: string) {
    if (!this.channel || this.closed) return;
    void this.channel.send({
      type: "broadcast",
      event: "msg",
      payload: { from: this.opts.selfId, to: peerId ?? null, data },
    });
  }

  peerList(): PeerInfo[] {
    return [...this.peers.values()].map((peer) => ({ ...peer }));
  }

  private syncPresence() {
    const state = this.channel?.presenceState<PresenceRow>() ?? {};
    const next = new Map<string, PeerInfo>();
    for (const [key, rows] of Object.entries(state)) {
      const row = Array.isArray(rows) ? rows[0] : undefined;
      const id = typeof row?.id === "string" && row.id ? row.id : key;
      if (!id || id === this.opts.selfId) continue;
      next.set(id, {
        id,
        name: typeof row?.name === "string" ? row.name : "",
        connectionState: "connected",
        candidateType: null,
        rttMs: null,
      });
    }
    this.peers = next;
    this.opts.onPeersChanged?.(this.peerList());
  }
}

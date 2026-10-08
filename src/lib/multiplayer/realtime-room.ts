/**
 * One sitting room.
 * Production uses a Supabase Realtime channel: presence is who is here,
 * broadcast carries position and chat. Dev tests can point the room at a
 * loopback mirror (`window.__TBR_SIT_MIRROR`) so two browsers share a bus
 * without the hosted project. A dropped channel retries; leaving removes it.
 */
import { getSupabase } from "@/lib/supabase";
import { reconnectDelay } from "./sit-logic";
import type { PeerInfo } from "./p2p";

export interface SitMeta {
  name?: string;
  breath?: number;
  place?: string;
  workId?: string;
}

export type SitLink = "live" | "reconnecting" | "offline";

export interface RealtimeRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onMessage?: (from: string, data: unknown, channel: "state" | "reliable") => void;
  onConnected?: () => void;
  onUnavailable?: () => void;
  onStatus?: (status: SitLink) => void;
}

type PresenceRow = {
  id?: string;
  name?: string;
  breath?: number;
  place?: string;
  workId?: string;
};

type MirrorEvent = {
  id: number;
  from: string;
  to?: string | null;
  data?: unknown;
};

const MIRROR_RE = /^http:\/\/127\.0\.0\.1:\d{2,5}$/;

function mirrorBase(): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const value = (window as { __TBR_SIT_MIRROR?: unknown }).__TBR_SIT_MIRROR;
  return typeof value === "string" && MIRROR_RE.test(value) ? value : null;
}

export class RealtimeSitRoom {
  private channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
  private peers = new Map<string, PeerInfo>();
  private closed = false;
  private live = false;
  private attempt = 0;
  private retryTimer: number | null = null;
  private mirrorTimer: number | null = null;
  private mirrorCursor = 0;
  private mirror: string | null = null;
  private meta: SitMeta = {};

  constructor(private readonly opts: RealtimeRoomOptions) {
    this.meta = { name: opts.name ?? "" };
  }

  join() {
    if (this.closed) return;
    const mirror = mirrorBase();
    if (mirror) {
      this.mirror = mirror;
      this.startMirror();
      this.watchLink();
      return;
    }
    this.openChannel();
    this.watchLink();
  }

  private watchLink() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", this.onOnline);
    window.addEventListener("offline", this.onOffline);
    document.addEventListener("visibilitychange", this.onVisible);
  }

  close() {
    this.closed = true;
    this.live = false;
    if (this.retryTimer != null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.mirrorTimer != null) window.clearTimeout(this.mirrorTimer);
    this.mirrorTimer = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onOnline);
      window.removeEventListener("offline", this.onOffline);
      document.removeEventListener("visibilitychange", this.onVisible);
    }
    if (this.mirror) void this.postMirror({ op: "bye" });
    const channel = this.channel;
    this.channel = null;
    this.peers.clear();
    if (channel) void getSupabase().removeChannel(channel);
  }

  setMeta(meta: SitMeta) {
    this.meta = { ...this.meta, ...meta };
    if (this.mirror) {
      void this.postMirror({ op: "track" });
      return;
    }
    if (this.live && this.channel) void this.channel.track(this.presencePayload());
  }

  broadcast(data: unknown) {
    this.send(data);
  }

  send(data: unknown, peerId?: string) {
    if (this.closed) return;
    if (this.mirror) {
      void this.postMirror({ op: "msg", data, to: peerId ?? null });
      return;
    }
    if (!this.channel || !this.live) return;
    void this.channel.send({
      type: "broadcast",
      event: "msg",
      payload: { from: this.opts.selfId, to: peerId ?? null, data },
    });
  }

  peerList(): PeerInfo[] {
    return [...this.peers.values()].map((peer) => ({ ...peer }));
  }

  private presencePayload() {
    return {
      id: this.opts.selfId,
      name: this.meta.name ?? "",
      breath: Number(this.meta.breath) || 0,
      place: (this.meta.place ?? "").slice(0, 80),
      workId: (this.meta.workId ?? "").slice(0, 80),
    };
  }

  private onOnline = () => {
    if (this.closed || this.live) return;
    this.attempt = 0;
    if (this.mirror) {
      void this.pullMirror();
      return;
    }
    void this.reopen();
  };

  private onOffline = () => {
    if (this.closed) return;
    this.live = false;
    this.peers.clear();
    this.opts.onPeersChanged?.(this.peerList());
    this.opts.onStatus?.("offline");
  };

  private browserOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  private onVisible = () => {
    if (this.closed || document.hidden) return;
    if (!this.live) {
      this.attempt = 0;
      void this.reopen();
      return;
    }
    if (this.channel) void this.channel.track(this.presencePayload());
  };

  private openChannel() {
    if (this.closed || this.mirror) return;
    const channel = getSupabase().channel(`sit:${this.opts.room}`.slice(0, 80), {
      config: {
        broadcast: { self: false },
        presence: { key: this.opts.selfId },
      },
    });
    this.channel = channel;
    channel
      .on("broadcast", { event: "msg" }, ({ payload }) => {
        if (this.closed || this.channel !== channel || !payload || typeof payload !== "object") return;
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
        if (this.closed || this.channel !== channel) return;
        if (status === "SUBSCRIBED") {
          this.attempt = 0;
          this.live = true;
          void channel.track(this.presencePayload());
          this.opts.onConnected?.();
          this.opts.onStatus?.("live");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.live = false;
          this.opts.onStatus?.(this.attempt >= 6 ? "offline" : "reconnecting");
          this.scheduleRetry();
        }
      });
  }

  private scheduleRetry() {
    if (this.closed || this.retryTimer != null) return;
    const delay = reconnectDelay(this.attempt);
    this.attempt += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      void this.reopen();
    }, delay);
  }

  private async reopen() {
    if (this.closed || this.mirror) return;
    const channel = this.channel;
    this.channel = null;
    this.live = false;
    if (channel) {
      try {
        await getSupabase().removeChannel(channel);
      } catch {
        /* already gone */
      }
    }
    if (!this.closed) this.openChannel();
  }

  private syncPresence() {
    const state = this.channel?.presenceState<PresenceRow>() ?? {};
    const next = new Map<string, PeerInfo>();
    for (const [key, rows] of Object.entries(state)) {
      const row = Array.isArray(rows) ? rows[0] : undefined;
      const id = typeof row?.id === "string" && row.id ? row.id : key;
      if (!id || id === this.opts.selfId) continue;
      next.set(id, peerFromPresence(id, row));
    }
    this.peers = next;
    this.opts.onPeersChanged?.(this.peerList());
  }

  private startMirror() {
    this.live = false;
    this.opts.onStatus?.("reconnecting");
    void this.postMirror({ op: "track" }).then((ok) => {
      if (this.closed || ok) return;
      // A missed handshake is a dropped line, not a room that does not exist.
      this.opts.onStatus?.("offline");
    });
    const poll = () => {
      if (this.closed || !this.mirror) return;
      void this.pullMirror().finally(() => {
        if (this.closed) return;
        this.mirrorTimer = window.setTimeout(poll, 200);
      });
    };
    poll();
  }

  private async postMirror(body: { op: "track" | "msg" | "bye"; data?: unknown; to?: string | null }) {
    if (!this.mirror || this.browserOffline()) return false;
    try {
      const response = await fetch(`${this.mirror}/sit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room: this.opts.room,
          selfId: this.opts.selfId,
          op: body.op,
          to: body.to ?? null,
          data: body.data,
          presence: this.presencePayload(),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async pullMirror() {
    if (!this.mirror) return;
    if (this.browserOffline()) {
      if (this.live) {
        this.live = false;
        this.opts.onStatus?.("offline");
      }
      return;
    }
    try {
      const url = `${this.mirror}/sit?room=${encodeURIComponent(this.opts.room)}&self=${encodeURIComponent(this.opts.selfId)}&cursor=${this.mirrorCursor}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("mirror");
      if (this.closed || this.browserOffline()) {
        this.live = false;
        this.opts.onStatus?.("offline");
        return;
      }
      const payload = (await response.json()) as {
        cursor?: number;
        presence?: PresenceRow[];
        messages?: MirrorEvent[];
      };
      if (!this.live) {
        this.live = true;
        this.opts.onConnected?.();
        this.opts.onStatus?.("live");
      }
      this.mirrorCursor = Number(payload.cursor) || this.mirrorCursor;
      const next = new Map<string, PeerInfo>();
      for (const row of payload.presence ?? []) {
        const id = typeof row.id === "string" ? row.id : "";
        if (!id || id === this.opts.selfId) continue;
        next.set(id, peerFromPresence(id, row));
      }
      this.peers = next;
      this.opts.onPeersChanged?.(this.peerList());
      for (const message of payload.messages ?? []) {
        if (!message.from || message.from === this.opts.selfId) continue;
        if (message.to && message.to !== this.opts.selfId) continue;
        this.opts.onMessage?.(message.from, message.data, "reliable");
      }
    } catch {
      if (this.live) {
        this.live = false;
        this.opts.onStatus?.("offline");
      }
    }
  }
}

function peerFromPresence(id: string, row: PresenceRow | undefined): PeerInfo {
  return {
    id,
    name: typeof row?.name === "string" ? row.name : "",
    connectionState: "connected",
    candidateType: null,
    rttMs: null,
    breath: Number(row?.breath) || 0,
    place: typeof row?.place === "string" ? row.place : "",
    workId: typeof row?.workId === "string" ? row.workId : "",
  };
}

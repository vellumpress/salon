/**
 * WebRTC signaling. Neon when DATABASE_URL is set; an in-memory relay
 * otherwise — including Vite, so a first sitting is not stalled by PGLite.
 * Only rendezvous traffic passes through here; sitting chat then flows
 * peer-to-peer.
 */
import { z } from "zod";
import type { PeerRow, RtcPollResponse, SignalKind, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, {
    message: "payload too large",
  }),
});
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

const PEER_TTL_MS = 30_000;
const SIGNAL_TTL_MS = 60_000;

type Store = {
  touch: (room: string, peer: string, name: string) => Promise<void>;
  roster: (room: string) => Promise<PeerRow[]>;
  inbox: (room: string, peer: string, since: number) => Promise<SignalRow[]>;
  signal: (room: string, to: string, from: string, kind: SignalKind, payload: unknown) => Promise<void>;
  leave: (room: string, peer: string) => Promise<void>;
};

function wantsDatabase() {
  const url = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
  return Boolean(url && url.trim());
}

type MemPeer = { room: string; id: string; name: string; lastSeen: number };
type MemSig = {
  id: number;
  room: string;
  to: string;
  from: string;
  kind: SignalKind;
  payload: unknown;
  at: number;
};

const memRef = globalThis as typeof globalThis & {
  __rtcMem__?: { peers: Map<string, MemPeer>; signals: MemSig[]; nextId: number };
};

function memory(): Store {
  memRef.__rtcMem__ ??= { peers: new Map(), signals: [], nextId: 1 };
  const mem = memRef.__rtcMem__;
  const key = (room: string, peer: string) => `${room}::${peer}`;
  function prune() {
    const now = Date.now();
    for (const [id, peer] of mem.peers) {
      if (now - peer.lastSeen > PEER_TTL_MS) mem.peers.delete(id);
    }
    mem.signals = mem.signals.filter((row) => now - row.at <= SIGNAL_TTL_MS);
  }
  return {
    async touch(room, peer, name) {
      prune();
      mem.peers.set(key(room, peer), { room, id: peer, name, lastSeen: Date.now() });
    },
    async roster(room) {
      prune();
      return [...mem.peers.values()]
        .filter((peer) => peer.room === room)
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 32)
        .map((peer) => ({ id: peer.id, name: peer.name }));
    },
    async inbox(room, peer, since) {
      prune();
      return mem.signals
        .filter((row) => row.room === room && row.to === peer && row.id > since)
        .sort((a, b) => a.id - b.id)
        .slice(0, 200)
        .map((row) => ({ id: row.id, from: row.from, kind: row.kind, payload: row.payload }));
    },
    async signal(room, to, from, kind, payload) {
      prune();
      const id = mem.nextId++;
      mem.signals.push({ id, room, to, from, kind, payload, at: Date.now() });
    },
    async leave(room, peer) {
      mem.peers.delete(key(room, peer));
    },
  };
}

const sqlRef = globalThis as typeof globalThis & {
  __rtcSchemaPromise__?: Promise<void>;
  __rtcSqlStore__?: Store;
};

async function sqlStore(): Promise<Store> {
  if (sqlRef.__rtcSqlStore__) return sqlRef.__rtcSqlStore__;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  sqlRef.__rtcSchemaPromise__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_peers (
         room TEXT NOT NULL,
         peer_id TEXT NOT NULL,
         name TEXT NOT NULL DEFAULT '',
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (room, peer_id)
       )`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS webrtc_signals (
         id BIGSERIAL PRIMARY KEY,
         room TEXT NOT NULL,
         to_peer TEXT NOT NULL,
         from_peer TEXT NOT NULL,
         kind TEXT NOT NULL,
         payload JSONB NOT NULL,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS webrtc_signals_inbox
         ON webrtc_signals (room, to_peer, id)`,
    );
  })().catch((err) => {
    sqlRef.__rtcSchemaPromise__ = undefined;
    throw err;
  });
  await sqlRef.__rtcSchemaPromise__;

  const store: Store = {
    async touch(room, peer, name) {
      if (Math.random() < 0.02) {
        await Promise.all([
          sql.query(`DELETE FROM webrtc_signals WHERE created_at < now() - make_interval(secs => $1)`, [60]),
          sql.query(`DELETE FROM webrtc_peers WHERE last_seen < now() - make_interval(secs => $1)`, [30]),
        ]);
      }
      await sql.query(
        `INSERT INTO webrtc_peers (room, peer_id, name, last_seen)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (room, peer_id)
         DO UPDATE SET last_seen = now(), name = EXCLUDED.name`,
        [room, peer, name],
      );
    },
    async roster(room) {
      const rows = await sql.query<{ peer_id: string; name: string }>(
        `SELECT peer_id, name FROM webrtc_peers
         WHERE room = $1 AND last_seen > now() - make_interval(secs => $2)
         ORDER BY peer_id LIMIT 32`,
        [room, 30],
      );
      return rows.map((row) => ({ id: row.peer_id, name: row.name }));
    },
    async inbox(room, peer, since) {
      const rows = await sql.query<{
        id: number;
        from_peer: string;
        kind: SignalRow["kind"];
        payload: unknown;
      }>(
        `SELECT id, from_peer, kind, payload FROM webrtc_signals
         WHERE room = $1 AND to_peer = $2 AND id > $3
         ORDER BY id LIMIT 200`,
        [room, peer, since],
      );
      return rows.map((row) => ({
        id: row.id,
        from: row.from_peer,
        kind: row.kind,
        payload: row.payload,
      }));
    },
    async signal(room, to, from, kind, payload) {
      await sql.query(
        `INSERT INTO webrtc_signals (room, to_peer, from_peer, kind, payload)
         VALUES ($1, $2, $3, $4, $5)`,
        [room, to, from, kind, JSON.stringify(payload)],
      );
    },
    async leave(room, peer) {
      await sql.query(`DELETE FROM webrtc_peers WHERE room = $1 AND peer_id = $2`, [room, peer]);
    },
  };
  sqlRef.__rtcSqlStore__ = store;
  return store;
}

async function store(): Promise<Store> {
  if (!wantsDatabase()) return memory();
  try {
    return await sqlStore();
  } catch (error) {
    console.error("[rtc] database signaling unavailable, using memory:", error);
    return memory();
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function handleGet(url: URL): Promise<Response> {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
    });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since } = parsed.data;
  const rtc = await store();
  await rtc.touch(room, peer, name);
  const body: RtcPollResponse = {
    peers: await rtc.roster(room),
    signals: await rtc.inbox(room, peer, since),
  };
  return json(body);
}

async function handlePost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  const rtc = await store();
  if (msg.op === "signal") await rtc.signal(msg.room, msg.to, msg.from, msg.kind, msg.payload);
  else await rtc.leave(msg.room, msg.peer);
  return json({ ok: true });
}

export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") return await handleGet(new URL(request.url));
    if (request.method === "POST") return await handlePost(request);
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}

import { shelfWork } from "./catalog/shelf.ts";
import { asSittingMinutes, sitLabel, type SittingMinutes } from "./sitting.ts";
import { clipLine, decodeShare, encodeShare, makeShortId } from "./share-codec.ts";
import { publicUrl } from "./site.ts";
import { formatHandle, normalizeHandle } from "./social.ts";

export type SitRsvp = "yes" | "later";

export type SitKeep = {
  handle: string;
  name: string;
  breathId: string;
  line: string;
  at: number;
  keptAt: number;
};

export type SitGuest = {
  handle: string;
  name: string;
  status: SitRsvp;
  at: number;
};

export type HostedSit = {
  id: string;
  hostHandle: string;
  hostName: string;
  workId: string;
  workTitle: string;
  author: string;
  minutes: number;
  createdAt: number;
  invitees: string[];
  rsvps: SitGuest[];
  keeps: SitKeep[];
  endedAt: number | null;
};

type SitWire = {
  v: 1;
  k: "sit";
  id: string;
  h: string;
  n?: string;
  w: string;
  m: number;
  t: number;
  i?: string[];
  r?: { h: string; n?: string; s: SitRsvp; a: number }[];
  g?: { h: string; n?: string; b: string; l: string; i: number; k: number }[];
  e?: number;
};

export function hostedSitPath(sit: HostedSit): string {
  return `/sit/${encodeURIComponent(encodeHostedSit(sit))}`;
}

export function hostedSitUrl(sit: HostedSit): string {
  return publicUrl(hostedSitPath(sit));
}

export function encodeHostedSit(sit: HostedSit): string {
  const wire: SitWire = {
    v: 1,
    k: "sit",
    id: sit.id,
    h: sit.hostHandle,
    n: sit.hostName || undefined,
    w: sit.workId,
    m: sit.minutes,
    t: sit.createdAt,
    i: sit.invitees.length ? sit.invitees.slice(0, 12) : undefined,
    r: sit.rsvps.slice(0, 16).map((row) => ({
      h: row.handle,
      n: row.name || undefined,
      s: row.status,
      a: row.at,
    })),
    g: sit.keeps.slice(0, 8).map((row) => ({
      h: row.handle,
      n: row.name || undefined,
      b: row.breathId,
      l: clipLine(row.line, 140),
      i: row.at,
      k: row.keptAt,
    })),
    e: sit.endedAt ?? undefined,
  };
  return encodeShare(wire);
}

export function decodeHostedSit(token: string): HostedSit | null {
  const wire = decodeShare<SitWire>(token);
  if (!wire || wire.v !== 1 || wire.k !== "sit") return null;
  const hostHandle = normalizeHandle(wire.h ?? "");
  const workId = (wire.w ?? "").trim();
  const id = (wire.id ?? "").trim();
  if (!hostHandle || !workId || !id) return null;
  const work = shelfWork(workId);
  return {
    id: id.slice(0, 16),
    hostHandle,
    hostName: (wire.n ?? "").trim() || formatHandle(hostHandle),
    workId,
    workTitle: work?.title ?? workId,
    author: work?.author ?? "",
    minutes: asSittingMinutes(wire.m, 20),
    createdAt: typeof wire.t === "number" ? wire.t : Date.now(),
    invitees: (wire.i ?? []).map(normalizeHandle).filter((h) => h.length >= 2).slice(0, 12),
    rsvps: (wire.r ?? []).map((row) => ({
      handle: normalizeHandle(row.h),
      name: (row.n ?? "").trim() || formatHandle(row.h),
      status: row.s === "later" ? "later" : "yes",
      at: row.a,
    })),
    keeps: (wire.g ?? []).map((row) => ({
      handle: normalizeHandle(row.h),
      name: (row.n ?? "").trim() || formatHandle(row.h),
      breathId: row.b,
      line: clipLine(row.l, 180),
      at: row.i,
      keptAt: row.k,
    })),
    endedAt: typeof wire.e === "number" ? wire.e : null,
  };
}

export function createHostedSit(input: {
  hostHandle: string;
  hostName?: string;
  workId: string;
  minutes: number;
  invitees?: string[];
  createdAt?: number;
}): HostedSit | null {
  const hostHandle = normalizeHandle(input.hostHandle);
  const workId = input.workId.trim();
  if (!hostHandle || !workId) return null;
  const work = shelfWork(workId);
  const invitees = [...new Set((input.invitees ?? []).map(normalizeHandle).filter((h) => h.length >= 2 && h !== hostHandle))];
  return {
    id: makeShortId("hs"),
    hostHandle,
    hostName: (input.hostName ?? "").trim() || formatHandle(hostHandle),
    workId,
    workTitle: work?.title ?? workId,
    author: work?.author ?? "",
    minutes: asSittingMinutes(input.minutes, 20),
    createdAt: input.createdAt ?? Date.now(),
    invitees,
    rsvps: [],
    keeps: [],
    endedAt: null,
  };
}

export function sitWindowMs(sit: HostedSit): number {
  if (sit.minutes <= 0) return 3 * 60 * 60 * 1000;
  return sit.minutes * 60 * 1000 + 20 * 60 * 1000;
}

export function sitPhase(
  sit: HostedSit,
  now = Date.now(),
): "invite" | "live" | "ghost" {
  if (sit.endedAt) return "ghost";
  const close = sit.createdAt + sitWindowMs(sit);
  if (now < sit.createdAt - 2 * 60 * 1000) return "invite";
  if (now > close) return "ghost";
  return "live";
}

export function isSitGhost(sit: HostedSit, now = Date.now()): boolean {
  return sitPhase(sit, now) === "ghost";
}

export function rsvpHostedSit(
  sit: HostedSit,
  guest: { handle: string; name?: string; status: SitRsvp },
  at = Date.now(),
): HostedSit {
  const handle = normalizeHandle(guest.handle);
  if (!handle) return sit;
  const next: SitGuest = {
    handle,
    name: (guest.name ?? "").trim() || formatHandle(handle),
    status: guest.status,
    at,
  };
  const rsvps = sit.rsvps.some((row) => row.handle === handle)
    ? sit.rsvps.map((row) => (row.handle === handle ? next : row))
    : [...sit.rsvps, next];
  const invitees = sit.invitees.includes(handle) ? sit.invitees : [...sit.invitees, handle];
  return { ...sit, rsvps, invitees };
}

export function addSitKeep(
  sit: HostedSit,
  keep: Omit<SitKeep, "keptAt"> & { keptAt?: number },
): HostedSit {
  const handle = normalizeHandle(keep.handle);
  const line = clipLine(keep.line, 180);
  if (!handle || !keep.breathId || !line) return sit;
  const row: SitKeep = {
    handle,
    name: (keep.name ?? "").trim() || formatHandle(handle),
    breathId: keep.breathId,
    line,
    at: keep.at,
    keptAt: keep.keptAt ?? Date.now(),
  };
  const key = `${row.handle}:${row.breathId}`;
  const keeps = sit.keeps.some((item) => `${item.handle}:${item.breathId}` === key)
    ? sit.keeps.map((item) => (`${item.handle}:${item.breathId}` === key ? row : item))
    : [...sit.keeps, row].slice(-24);
  return { ...sit, keeps };
}

export function mergeHostedSit(local: HostedSit | undefined, incoming: HostedSit): HostedSit {
  if (!local || local.id !== incoming.id) return incoming;
  const rsvps = new Map(local.rsvps.map((row) => [row.handle, row]));
  for (const row of incoming.rsvps) {
    const prior = rsvps.get(row.handle);
    if (!prior || row.at >= prior.at) rsvps.set(row.handle, row);
  }
  const keeps = new Map(local.keeps.map((row) => [`${row.handle}:${row.breathId}`, row]));
  for (const row of incoming.keeps) {
    keeps.set(`${row.handle}:${row.breathId}`, row);
  }
  const invitees = [...new Set([...local.invitees, ...incoming.invitees, ...rsvps.keys()])];
  return {
    ...local,
    hostName: incoming.hostName || local.hostName,
    workTitle: incoming.workTitle || local.workTitle,
    author: incoming.author || local.author,
    invitees,
    rsvps: [...rsvps.values()],
    keeps: [...keeps.values()].sort((a, b) => a.keptAt - b.keptAt),
    endedAt: incoming.endedAt ?? local.endedAt,
  };
}

export function sitInvolves(sit: HostedSit, handle: string): boolean {
  const me = normalizeHandle(handle);
  if (!me) return false;
  return sit.hostHandle === me || sit.invitees.includes(me) || sit.rsvps.some((row) => row.handle === me);
}

export function sitDurationLabel(minutes: number): string {
  return sitLabel(minutes as SittingMinutes);
}

export function ghostKeeps(sit: HostedSit): SitKeep[] {
  return [...sit.keeps].sort((a, b) => a.keptAt - b.keptAt);
}

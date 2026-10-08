export type SitLine = {
  id: string;
  from: string;
  text: string;
  at: number;
};

/** Short words the room can send without typing. */
export const SIT_REACTIONS = ["yes", "hmm", "oh", "again"] as const;

export type SitReaction = (typeof SIT_REACTIONS)[number];

const SELF_ID = /^p-[a-z0-9]{6,12}$/;

export function chatLineId(from: string, at: number) {
  return `${from}-${at}`;
}

export function mergeSitLines(prev: SitLine[], incoming: SitLine[], cap = 16): SitLine[] {
  const seen = new Set<string>();
  const next: SitLine[] = [];
  for (const line of [...prev, ...incoming]) {
    const text = line.text.trim().slice(0, 280);
    const from = line.from.trim();
    if (!text || !from) continue;
    const at = Number.isFinite(line.at) ? line.at : 0;
    const id = line.id || chatLineId(from, at);
    if (seen.has(id)) continue;
    seen.add(id);
    next.push({ id, from, text, at });
  }
  next.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return next.slice(-cap);
}

export function isLivePeer(connectionState: string) {
  return connectionState === "connected";
}

/** Offline wins over a seat that has not dropped yet. */
export function sitStatusLabel(
  link: "live" | "reconnecting" | "offline",
  joined: boolean,
  present: number,
): "" | "offline" | "reconnecting" | "waiting" {
  if (link === "offline") return "offline";
  if (present > 0) return "";
  if (link === "reconnecting" || !joined) return "reconnecting";
  return "waiting";
}

/** How far the other reader is from this page. Empty when they are beside you. */
export function gapLabel(selfBreath: number, peerBreath: number): string {
  if (!Number.isFinite(selfBreath) || !Number.isFinite(peerBreath)) return "";
  const delta = Math.round(peerBreath) - Math.round(selfBreath);
  if (Math.abs(delta) < 2) return "";
  if (delta >= 8) return "well ahead";
  if (delta >= 2) return "a few lines ahead";
  if (delta <= -8) return "well behind";
  return "a few lines behind";
}

export function peerAside(input: {
  selfPlace: string;
  selfWorkId: string;
  peerPlace: string;
  peerWorkId: string;
  selfBreath: number;
  peerBreath: number;
}): string {
  if (input.peerWorkId && input.selfWorkId && input.peerWorkId !== input.selfWorkId) {
    return "on another book";
  }
  const gap = gapLabel(input.selfBreath, input.peerBreath);
  if (gap) return gap;
  const peerPlace = input.peerPlace.trim();
  const selfPlace = input.selfPlace.trim();
  if (peerPlace && selfPlace && peerPlace !== selfPlace) return `at ${peerPlace}`;
  return "";
}

export function reconnectDelay(attempt: number): number {
  const step = Math.max(0, Math.min(8, Math.floor(attempt)));
  return Math.min(8000, 400 * 2 ** step);
}

export function keepSitIdentity(existing: string | null | undefined): string {
  if (existing && SELF_ID.test(existing)) return existing;
  return "";
}

/** Lexicographically smallest id among people already in the room sends history. */
export function shouldSyncNewcomer(selfId: string, incumbents: readonly string[]): boolean {
  const ids = [selfId, ...incumbents].filter(Boolean).sort();
  return ids[0] === selfId;
}

export type SitLine = {
  id: string;
  from: string;
  text: string;
  at: number;
};

/** Words a reader can leave on the sentence in front of them. */
export const SIT_REACTIONS = ["love", "?", "lol", "wow"] as const;

export type SitReaction = (typeof SIT_REACTIONS)[number];

/**
 * The previous four words. A mark already in a room still shows the word
 * that was left, so an old "oh" does not vanish or turn into a new one.
 */
export const LEGACY_REACTIONS = ["yes", "hmm", "oh", "again"] as const;

export type LegacyReaction = (typeof LEGACY_REACTIONS)[number];

export type MarginWord = SitReaction | LegacyReaction;

/** A short word left in the margin of one sentence. One per person per sentence. */
export type MarginMark = {
  id: string;
  from: string;
  word: MarginWord;
  breath: number;
  at: number;
  /** Handle sent with the mark, when the reader had one. */
  name?: string;
};

export function isSitReaction(text: string): text is SitReaction {
  return (SIT_REACTIONS as readonly string[]).includes(text);
}

export function isLegacyReaction(text: string): text is LegacyReaction {
  return (LEGACY_REACTIONS as readonly string[]).includes(text);
}

export function isMarginWord(text: string): text is MarginWord {
  return isSitReaction(text) || isLegacyReaction(text);
}

function cleanMarginName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 40) : "";
}

export function marginMarkFromChat(input: {
  from: string;
  text: string;
  at: number;
  breath?: number;
  id?: string;
  name?: string;
}): MarginMark | null {
  const word = input.text.trim();
  if (!isMarginWord(word)) return null;
  if (typeof input.breath !== "number" || !Number.isFinite(input.breath) || input.breath < 0) return null;
  const from = input.from.trim();
  if (!from) return null;
  const breath = Math.floor(input.breath);
  const at = Number.isFinite(input.at) ? input.at : 0;
  const name = cleanMarginName(input.name);
  return {
    id: input.id || `${from}-${breath}`,
    from,
    word,
    breath,
    at,
    ...(name ? { name } : {}),
  };
}

/** Latest word from each person on each sentence. */
export function mergeMarginMarks(prev: MarginMark[], incoming: MarginMark[], cap = 32): MarginMark[] {
  const byKey = new Map<string, MarginMark>();
  for (const mark of [...prev, ...incoming]) {
    const word = typeof mark.word === "string" ? mark.word.trim() : "";
    if (!isMarginWord(word)) continue;
    if (!Number.isFinite(mark.breath) || mark.breath < 0) continue;
    const from = mark.from.trim();
    if (!from) continue;
    const breath = Math.floor(mark.breath);
    const at = Number.isFinite(mark.at) ? mark.at : 0;
    const key = `${from}:${breath}`;
    const kept = byKey.get(key);
    if (kept && kept.at > at) continue;
    const name = cleanMarginName(mark.name) || (kept ? cleanMarginName(kept.name) : "");
    byKey.set(key, {
      id: mark.id || `${key}-${at}`,
      from,
      word,
      breath,
      at,
      ...(name ? { name } : {}),
    });
  }
  return [...byKey.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(-cap);
}

export function marksOnSentence(marks: MarginMark[], breath: number): MarginMark[] {
  if (!Number.isFinite(breath)) return [];
  const index = Math.floor(breath);
  return marks.filter((mark) => mark.breath === index);
}

/**
 * Beside the sentence while it is on screen. Once the reader has moved on
 * and that sentence is gone, the mark says how far back it sits.
 * A sentence still ahead, and not on screen, waits.
 */
export function marginPlace(
  markBreath: number,
  viewerBreath: number,
  onScreen: readonly number[],
): "beside" | "passed" | "waiting" {
  const breath = Math.floor(markBreath);
  const viewer = Math.floor(viewerBreath);
  if (!Number.isFinite(breath) || !Number.isFinite(viewer)) return "waiting";
  if (onScreen.some((item) => Math.floor(item) === breath)) return "beside";
  if (breath < viewer) return "passed";
  return "waiting";
}

/** "lol, a sentence back" — the word, then how far the reader has moved on. */
export function passedReactionNote(word: string, sentencesBack: number): string {
  const clean = word.trim();
  const back = Math.floor(sentencesBack);
  if (!clean || !Number.isFinite(back) || back <= 0) return clean;
  const gap = back === 1 ? "a sentence back" : `${back} sentences back`;
  return `${clean}, ${gap}`;
}

/** Chat stays for typed lines. A margin mark with the same id is not a second copy. */
export function chatWithoutMargin(lines: SitLine[], marks: MarginMark[]): SitLine[] {
  if (marks.length === 0) return lines;
  const ids = new Set(marks.map((mark) => mark.id));
  return lines.filter((line) => !ids.has(line.id));
}

/** "you" for this reader. Everyone else keeps the name that arrived with the mark. */
export function marginReaderName(input: { from: string; selfId: string; name?: string }): string {
  if (input.from && input.from === input.selfId) return "you";
  const named = cleanMarginName(input.name);
  return named || "them";
}

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

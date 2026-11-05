/**
 * Shared marks on a Read Together passage.
 * Underlines, pins, pulses, emoji, and today's shared count stay on the
 * sentence. Nothing here is a freehand stroke.
 */

export const MARGIN_EMOJI = ["💛", "✨", "👀", "🌙"] as const;

export type MarginEmoji = (typeof MARGIN_EMOJI)[number];

/** How long a reaction glow stays on the sentence. */
export const PULSE_MS = 3200;

export const READ_CAP = 120;
export const MARK_CAP = 48;

export type PaceCue = "" | "waiting" | "caught-up";

export type Underline = {
  id: string;
  from: string;
  breath: number;
  at: number;
  on: boolean;
};

export type PassagePin = {
  id: string;
  from: string;
  breath: number;
  at: number;
  place: string;
  on: boolean;
};

export type ReactionPulse = {
  id: string;
  from: string;
  breath: number;
  at: number;
};

export type PassageEmoji = {
  id: string;
  from: string;
  breath: number;
  at: number;
  /** Empty clears the one emoji on that passage. */
  emoji: MarginEmoji | "";
};

export type ReadLedger = {
  from: string;
  day: string;
  at: number;
  breaths: number[];
};

function cleanId(value: unknown) {
  if (typeof value !== "string") return "";
  const id = value.trim();
  if (!id || id.length > 80) return "";
  return id;
}

function cleanFrom(value: unknown) {
  if (typeof value !== "string") return "";
  const from = value.trim();
  if (!from || from.length > 40) return "";
  return from;
}

function cleanBreath(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
  return Math.floor(value);
}

function cleanAt(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function cleanPlace(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function isMarginEmoji(value: string): value is MarginEmoji {
  return (MARGIN_EMOJI as readonly string[]).includes(value);
}

export function cleanUnderline(input: unknown, from: string): Underline | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<Underline>;
  const id = cleanId(raw.id);
  const who = cleanFrom(from);
  const breath = cleanBreath(raw.breath);
  if (!id || !who || breath === null || typeof raw.on !== "boolean") return null;
  return { id, from: who, breath, at: cleanAt(raw.at), on: raw.on };
}

export function cleanPin(input: unknown, from: string): PassagePin | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<PassagePin>;
  const id = cleanId(raw.id);
  const who = cleanFrom(from);
  const breath = cleanBreath(raw.breath);
  if (!id || !who || breath === null || typeof raw.on !== "boolean") return null;
  return { id, from: who, breath, at: cleanAt(raw.at), place: cleanPlace(raw.place), on: raw.on };
}

export function cleanPulse(input: unknown, from: string): ReactionPulse | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<ReactionPulse>;
  const id = cleanId(raw.id);
  const who = cleanFrom(from);
  const breath = cleanBreath(raw.breath);
  if (!id || !who || breath === null) return null;
  return { id, from: who, breath, at: cleanAt(raw.at) };
}

export function cleanEmoji(input: unknown, from: string): PassageEmoji | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<PassageEmoji>;
  const id = cleanId(raw.id);
  const who = cleanFrom(from);
  const breath = cleanBreath(raw.breath);
  if (!id || !who || breath === null || typeof raw.emoji !== "string") return null;
  const emoji = raw.emoji === "" ? "" : isMarginEmoji(raw.emoji) ? raw.emoji : null;
  if (emoji === null) return null;
  return { id, from: who, breath, at: cleanAt(raw.at), emoji };
}

export function cleanLedger(input: unknown, from: string): ReadLedger | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<ReadLedger>;
  const who = cleanFrom(from);
  const day = typeof raw.day === "string" ? raw.day.trim() : "";
  if (!who || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (!Array.isArray(raw.breaths)) return null;
  const breaths: number[] = [];
  const seen = new Set<number>();
  for (const item of raw.breaths) {
    const breath = cleanBreath(item);
    if (breath === null || seen.has(breath)) continue;
    seen.add(breath);
    breaths.push(breath);
    if (breaths.length >= READ_CAP) break;
  }
  breaths.sort((a, b) => a - b);
  return { from: who, day, at: cleanAt(raw.at), breaths };
}

function latestBy<T extends { at: number; id: string }>(prev: T | undefined, next: T) {
  if (!prev) return next;
  if (next.at > prev.at) return next;
  if (next.at < prev.at) return prev;
  return next.id >= prev.id ? next : prev;
}

export function mergeUnderlines(prev: readonly Underline[], incoming: readonly unknown[], from = ""): Underline[] {
  const byKey = new Map<string, Underline>();
  for (const item of prev) {
    if (!item.on) continue;
    byKey.set(`${item.from}:${item.breath}`, item);
  }
  for (const item of incoming) {
    const mark = cleanUnderline(item, from || (item && typeof item === "object" ? String((item as Underline).from ?? "") : ""));
    if (!mark) continue;
    const key = `${mark.from}:${mark.breath}`;
    const kept = latestBy(byKey.get(key), mark);
    if (!kept.on) byKey.delete(key);
    else byKey.set(key, kept);
  }
  return [...byKey.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-MARK_CAP);
}

export function mergePins(prev: readonly PassagePin[], incoming: readonly unknown[], from = ""): PassagePin[] {
  const byKey = new Map<string, PassagePin>();
  for (const item of prev) {
    if (!item.on) continue;
    byKey.set(`${item.from}:${item.breath}`, item);
  }
  for (const item of incoming) {
    const pin = cleanPin(item, from || (item && typeof item === "object" ? String((item as PassagePin).from ?? "") : ""));
    if (!pin) continue;
    const key = `${pin.from}:${pin.breath}`;
    const kept = latestBy(byKey.get(key), pin);
    if (!kept.on) byKey.delete(key);
    else byKey.set(key, kept);
  }
  return [...byKey.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-MARK_CAP);
}

export function mergeEmoji(prev: readonly PassageEmoji[], incoming: readonly unknown[], from = ""): PassageEmoji[] {
  const byBreath = new Map<number, PassageEmoji>();
  for (const item of prev) {
    if (!item.emoji) continue;
    byBreath.set(item.breath, item);
  }
  for (const item of incoming) {
    const mark = cleanEmoji(item, from || (item && typeof item === "object" ? String((item as PassageEmoji).from ?? "") : ""));
    if (!mark) continue;
    const kept = latestBy(byBreath.get(mark.breath), mark);
    if (!kept.emoji) byBreath.delete(mark.breath);
    else byBreath.set(mark.breath, kept);
  }
  return [...byBreath.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-MARK_CAP);
}

export function mergePulses(prev: readonly ReactionPulse[], incoming: readonly unknown[], now: number, from = ""): ReactionPulse[] {
  const byId = new Map<string, ReactionPulse>();
  for (const item of [...prev, ...incoming]) {
    const pulse = cleanPulse(item, from || (item && typeof item === "object" ? String((item as ReactionPulse).from ?? "") : ""));
    if (!pulse || !pulseFresh(pulse, now)) continue;
    byId.set(pulse.id, pulse);
  }
  return [...byId.values()]
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
    .slice(-24);
}

export function mergeLedger(prev: ReadLedger | undefined, incoming: unknown, from: string): ReadLedger | undefined {
  const next = cleanLedger(incoming, from);
  if (!next) return prev;
  if (prev && prev.at > next.at) return prev;
  return next;
}

export function underlinesOn(marks: readonly Underline[], breath: number) {
  if (!Number.isFinite(breath)) return [];
  const index = Math.floor(breath);
  return marks.filter((mark) => mark.on && mark.breath === index);
}

export function pinsOn(pins: readonly PassagePin[], breath: number) {
  if (!Number.isFinite(breath)) return [];
  const index = Math.floor(breath);
  return pins.filter((pin) => pin.on && pin.breath === index);
}

export function emojiOn(marks: readonly PassageEmoji[], breath: number): PassageEmoji | null {
  if (!Number.isFinite(breath)) return null;
  const index = Math.floor(breath);
  return marks.find((mark) => mark.breath === index && mark.emoji) ?? null;
}

export function pulseFresh(pulse: ReactionPulse, now: number, hold = PULSE_MS) {
  const age = now - pulse.at;
  return age < hold && age > -5000;
}

export function pulsesOn(pulses: readonly ReactionPulse[], breath: number, now: number) {
  if (!Number.isFinite(breath)) return [];
  const index = Math.floor(breath);
  return pulses.filter((pulse) => pulse.breath === index && pulseFresh(pulse, now));
}

/** Newest pin that is not the line you are already on. Another reader wins a tie. */
export function jumpTarget(pins: readonly PassagePin[], selfId: string, breath: number): PassagePin | null {
  if (!Number.isFinite(breath)) return null;
  const here = Math.floor(breath);
  const open = pins.filter((pin) => pin.on && pin.breath !== here);
  const others = open.filter((pin) => pin.from !== selfId);
  const pool = others.length > 0 ? others : open;
  const sorted = [...pool].sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));
  return sorted[0] ?? null;
}

/**
 * Quiet company. Caught up on the same line. Waiting here when you have
 * moved on and someone with you has not. Empty when you are the one behind,
 * or when you are reading alone.
 */
export function paceCue(selfBreath: number, peerBreaths: readonly number[]): PaceCue {
  if (!Number.isFinite(selfBreath)) return "";
  const peers = peerBreaths.filter((breath) => Number.isFinite(breath));
  if (peers.length === 0) return "";
  const self = Math.floor(selfBreath);
  const floors = peers.map((breath) => Math.floor(breath));
  if (floors.every((breath) => breath === self)) return "caught-up";
  if (floors.some((breath) => breath < self)) return "waiting";
  return "";
}

export function paceLabel(cue: PaceCue) {
  if (cue === "caught-up") return "Caught up";
  if (cue === "waiting") return "Waiting here";
  return "";
}

/** The line you leave by moving forward counts as finished. A jump does not fill the gap. */
export function noteFinished(breaths: readonly number[], left: number, arrived: number) {
  const from = cleanBreath(left);
  const to = cleanBreath(arrived);
  if (from === null || to === null || to <= from) return [...breaths];
  const next = new Set<number>();
  for (const breath of breaths) {
    const clean = cleanBreath(breath);
    if (clean !== null) next.add(clean);
  }
  next.add(from);
  return [...next].sort((a, b) => a - b).slice(-READ_CAP);
}

/** Passages present in every ledger for this day. One reader is not a "we". */
export function sharedFinished(day: string, self: ReadLedger | undefined, peers: readonly ReadLedger[]): number {
  if (!self || self.day !== day || peers.length === 0) return 0;
  const today = peers.filter((ledger) => ledger.day === day);
  if (today.length === 0) return 0;
  let shared = new Set(self.breaths);
  for (const ledger of today) {
    const theirs = new Set(ledger.breaths);
    shared = new Set([...shared].filter((breath) => theirs.has(breath)));
  }
  return shared.size;
}

export function scoreLabel(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "We read this far";
  const n = Math.floor(count);
  return n === 1 ? "We read 1 today" : `We read ${n} today`;
}

export function nextUnderline(current: readonly Underline[], from: string, breath: number, at: number, id: string): Underline | null {
  const index = cleanBreath(breath);
  const who = cleanFrom(from);
  if (index === null || !who) return null;
  const on = !current.some((mark) => mark.from === who && mark.breath === index && mark.on);
  return { id, from: who, breath: index, at, on };
}

export function nextPin(
  current: readonly PassagePin[],
  from: string,
  breath: number,
  at: number,
  id: string,
  place: string,
): PassagePin | null {
  const index = cleanBreath(breath);
  const who = cleanFrom(from);
  if (index === null || !who) return null;
  const on = !current.some((pin) => pin.from === who && pin.breath === index && pin.on);
  return { id, from: who, breath: index, at, place: cleanPlace(place), on };
}

export function nextEmoji(
  current: readonly PassageEmoji[],
  from: string,
  breath: number,
  emoji: string,
  at: number,
  id: string,
): PassageEmoji | null {
  const index = cleanBreath(breath);
  const who = cleanFrom(from);
  if (index === null || !who || !isMarginEmoji(emoji)) return null;
  const existing = emojiOn(current, index);
  return { id, from: who, breath: index, at, emoji: existing?.emoji === emoji ? "" : emoji };
}

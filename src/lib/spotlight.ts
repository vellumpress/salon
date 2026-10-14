import { tapSpans, type DisplayKind } from "./display-blocks.ts";
import { PHONE_LINE_PX } from "./display-blocks.ts";

/**
 * The lit passage is about two or three rendered lines.
 * A third of a line of slack keeps a sentence that barely wraps from
 * being cut, and from swallowing the sentence after it.
 */
export const SPOTLIGHT_MIN_LINES = 2;
export const SPOTLIGHT_MAX_LINES = 3;
export const SPOTLIGHT_LINE_SLOP = 0.34;

export type MeasureFn = (sample: string) => number;

export type SpotlightBreath = { index: number; text: string };

export type SpotlightPart = { index: number; start: number; end: number };

/**
 * One tap.
 * `index` / `cursor` are the sentence progress lands on: the first sentence
 * of the group, or the sentence a long window belongs to.
 * `window` is 0 unless that sentence is taller than three lines.
 */
export type SpotlightGroup = {
  index: number;
  cursor: number;
  window: number;
  endIndex: number;
  /** Exclusive sentence end in the last breath. */
  endCursor: number;
  parts: SpotlightPart[];
  /** The characters the focus paints, in order. */
  sample: string;
};

export type SpotlightPlace = { index: number; cursor: number; window: number };

type Atom = {
  index: number;
  sentence: number;
  start: number;
  end: number;
  text: string;
};

export function spotlightLineCap(linePx: number) {
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  return line * SPOTLIGHT_MAX_LINES + line * SPOTLIGHT_LINE_SLOP;
}

function heightOf(sample: string, measure: MeasureFn) {
  const measured = measure(sample);
  return measured > 0 ? measured : 0;
}

/**
 * Lines a slice occupies.
 * Inside a paragraph the slice continues the lines above it. Measured on its
 * own, rounding can add a line. The taller of the two is the one that has to fit.
 */
function flowLines(text: string, start: number, end: number, measure: MeasureFn, linePx: number) {
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  const slice = text.slice(start, Math.max(start, end));
  const alone = sampleLines(slice, measure, linePx);
  const before = start > 0 ? heightOf(text.slice(0, start), measure) : 0;
  const after = heightOf(text.slice(0, Math.max(start, end)), measure);
  const incremental = !(after > 0) && end > start ? (slice.length > 0 ? 1 : 0) : Math.max(0, (after - before) / line);
  return Math.max(incremental, alone);
}

function sampleLines(sample: string, measure: MeasureFn, linePx: number) {
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  const height = heightOf(sample, measure);
  if (!(height > 0)) return sample.trim() ? 1 : 0;
  return height / line;
}

function fits(lines: number, limitPx: number, linePx: number) {
  if (lines > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP) return false;
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  return lines * line <= limitPx + 0.5;
}

function wordPieces(text: string) {
  const parts: { start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    while (i < text.length && /\s/u.test(text[i] ?? "")) i += 1;
    while (i < text.length && !/\s/u.test(text[i] ?? "")) i += 1;
    if (i === start) break;
    parts.push({ start, end: i });
  }
  return parts;
}

function atomsOf(breath: SpotlightBreath, kind: DisplayKind): Atom[] {
  const text = breath.text ?? "";
  if (!text || kind === "verse") {
    return [{ index: breath.index, sentence: 0, start: 0, end: text.length, text }];
  }
  const spans = tapSpans(text);
  if (spans.length <= 1) {
    return [{ index: breath.index, sentence: 0, start: 0, end: text.length, text }];
  }
  return spans.map((span, sentence) => ({
    index: breath.index,
    sentence,
    start: span.start,
    end: span.end,
    text: text.slice(span.start, span.end),
  }));
}

function sampleOf(atoms: readonly Atom[], kind: DisplayKind) {
  if (atoms.length === 0) return "";
  if (atoms.length === 1) return atoms[0]!.text;
  const same = atoms.every((atom) => atom.index === atoms[0]!.index);
  if (same) return atoms.map((atom) => atom.text).join("");
  const pieces = atoms.map((atom) => atom.text.replace(/\s+/g, " ").trim()).filter(Boolean);
  return kind === "verse" ? pieces.join("\n") : pieces.join(" ");
}

function partsOf(atoms: readonly Atom[]): SpotlightPart[] {
  const parts: SpotlightPart[] = [];
  for (const atom of atoms) {
    const prev = parts[parts.length - 1];
    if (prev && prev.index === atom.index) prev.end = atom.end;
    else parts.push({ index: atom.index, start: atom.start, end: atom.end });
  }
  return parts;
}

function groupFrom(atoms: readonly Atom[], window: number, kind: DisplayKind): SpotlightGroup {
  const first = atoms[0]!;
  const last = atoms[atoms.length - 1]!;
  return {
    index: first.index,
    cursor: first.sentence,
    window,
    endIndex: last.index,
    endCursor: last.sentence + 1,
    parts: partsOf(atoms),
    sample: sampleOf(atoms, kind),
  };
}

function atomLines(atom: Atom, breathText: string, measure: MeasureFn, linePx: number) {
  return flowLines(breathText, atom.start, atom.end, measure, linePx);
}

/**
 * Lines the lit passage occupies.
 * Sentences in one breath share a line. Sentences in different breaths are
 * separate blocks, so they stack even when a joined paragraph would wrap tighter.
 */
function mergedLines(
  atoms: readonly Atom[],
  texts: Map<number, string>,
  measure: MeasureFn,
  linePx: number,
  _kind: DisplayKind,
) {
  if (atoms.length === 0) return 0;
  const line = linePx > 0 ? linePx : PHONE_LINE_PX;
  let height = 0;
  let i = 0;
  while (i < atoms.length) {
    const index = atoms[i]!.index;
    let j = i + 1;
    while (j < atoms.length && atoms[j]!.index === index) j += 1;
    const text = texts.get(index) ?? "";
    const start = atoms[i]!.start;
    const end = atoms[j - 1]!.end;
    height += flowLines(text, start, end, measure, linePx) * line;
    i = j;
  }
  return height / line;
}

/**
 * Lines of a slice on its own. A window never lays out the paragraph above it.
 * Word windows stay on whitespace. A single word stays whole.
 * A last window shorter than two lines borrows a word from the window above
 * when both can still sit inside three lines.
 */
function windowLines(breathText: string, start: number, end: number, measure: MeasureFn, linePx: number) {
  return sampleLines(breathText.slice(start, Math.max(start, end)), measure, linePx);
}

function windowAtom(
  atom: Atom,
  breathText: string,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
): SpotlightGroup[] {
  const words = wordPieces(atom.text);
  if (words.length <= 1) return [groupFrom([atom], 0, kind)];
  const probeCount = Math.min(words.length, 24);
  const probeLines = windowLines(
    breathText,
    atom.start + words[0]!.start,
    atom.start + words[probeCount - 1]!.end,
    measure,
    linePx,
  );
  const budget = Math.max(6, Math.round((probeCount * SPOTLIGHT_MAX_LINES) / Math.max(probeLines, 0.8)));
  const fitEnd = (from: number, cap: number) => {
    let low = from + 1;
    let high = Math.max(low, cap);
    let best = low;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const lines = windowLines(
        breathText,
        atom.start + words[from]!.start,
        atom.start + words[mid - 1]!.end,
        measure,
        linePx,
      );
      if (fits(lines, limitPx, linePx)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  };
  const cuts: { from: number; to: number }[] = [];
  let i = 0;
  while (i < words.length) {
    let cap = Math.min(words.length, i + budget);
    let j = fitEnd(i, cap);
    const lines = windowLines(
      breathText,
      atom.start + words[i]!.start,
      atom.start + words[j - 1]!.end,
      measure,
      linePx,
    );
    if (lines < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP && j < words.length) {
      cap = Math.min(words.length, j + budget);
      j = fitEnd(i, cap);
    }
    cuts.push({ from: i, to: j });
    i = j;
  }
  while (cuts.length >= 2) {
    const last = cuts[cuts.length - 1]!;
    const prev = cuts[cuts.length - 2]!;
    const lastLines = windowLines(
      breathText,
      atom.start + words[last.from]!.start,
      atom.start + words[last.to - 1]!.end,
      measure,
      linePx,
    );
    if (lastLines >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP) break;
    if (prev.to - prev.from <= 1) break;
    const prevNext = { from: prev.from, to: prev.to - 1 };
    const lastNext = { from: last.from - 1, to: last.to };
    const prevLines = windowLines(
      breathText,
      atom.start + words[prevNext.from]!.start,
      atom.start + words[prevNext.to - 1]!.end,
      measure,
      linePx,
    );
    const movedLines = windowLines(
      breathText,
      atom.start + words[lastNext.from]!.start,
      atom.start + words[lastNext.to - 1]!.end,
      measure,
      linePx,
    );
    if (prevLines < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP) break;
    if (!fits(movedLines, limitPx, linePx)) break;
    prev.to -= 1;
    last.from -= 1;
  }
  return cuts.map((cut, window) => {
    const start = atom.start + words[cut.from]!.start;
    const end = atom.start + words[cut.to - 1]!.end;
    const piece: Atom = {
      index: atom.index,
      sentence: atom.sentence,
      start,
      end,
      text: breathText.slice(start, end),
    };
    return groupFrom([piece], window, kind);
  });
}

/**
 * Groups for one scene, in reading order.
 * Short sentences merge until the passage is about two or three lines.
 * A sentence taller than that is stepped through in word windows.
 * The caller does not pass breaths from two scenes.
 */
export function spotlightGroups(
  breaths: readonly SpotlightBreath[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind = "prose",
): SpotlightGroup[] {
  const heights = new Map<string, number>();
  const raw = measure;
  measure = (sample) => {
    const hit = heights.get(sample);
    if (hit !== undefined) return hit;
    const value = raw(sample);
    heights.set(sample, value);
    return value;
  };
  const texts = new Map<number, string>();
  const atoms: Atom[] = [];
  for (const breath of breaths) {
    texts.set(breath.index, breath.text ?? "");
    atoms.push(...atomsOf(breath, kind));
  }
  if (atoms.length === 0) {
    return [
      {
        index: breaths[0]?.index ?? 0,
        cursor: 0,
        window: 0,
        endIndex: breaths[0]?.index ?? 0,
        endCursor: 1,
        parts: [],
        sample: "",
      },
    ];
  }
  const cap = limitPx > 0 ? limitPx : Number.POSITIVE_INFINITY;
  const groups: SpotlightGroup[] = [];
  let i = 0;
  while (i < atoms.length) {
    const atom = atoms[i]!;
    const breathText = texts.get(atom.index) ?? "";
    const alone = atomLines(atom, breathText, measure, linePx);
    const words = wordPieces(atom.text);
    if (!fits(alone, cap, linePx) && words.length > 1) {
      groups.push(...windowAtom(atom, breathText, measure, cap, linePx, kind));
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < atoms.length) {
      const next = atoms[j]!;
      const nextText = texts.get(next.index) ?? "";
      const nextLines = atomLines(next, nextText, measure, linePx);
      if (!fits(nextLines, cap, linePx) && wordPieces(next.text).length > 1) break;
      const lines = mergedLines(atoms.slice(i, j + 1), texts, measure, linePx, kind);
      if (fits(lines, cap, linePx)) {
        j += 1;
        continue;
      }
      // A fragment shorter than two lines may take the next whole sentence
      // when that still fits in a third of the screen. It does not take another.
      const have = mergedLines(atoms.slice(i, j), texts, measure, linePx, kind);
      const line = linePx > 0 ? linePx : PHONE_LINE_PX;
      const under = have < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP;
      if (under && lines * line <= cap + 0.5) j += 1;
      break;
    }
    groups.push(groupFrom(atoms.slice(i, j), 0, kind));
    i = j;
  }
  return groups;
}

/** The group a saved sentence belongs to. A window matches exactly, otherwise the first. */
export function locateSpotlight(
  groups: readonly SpotlightGroup[],
  index: number,
  cursor: number,
  window = 0,
): number {
  if (groups.length === 0) return 0;
  const exact = groups.findIndex(
    (group) => group.index === index && group.cursor === cursor && group.window === window,
  );
  if (exact >= 0) return exact;
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i]!;
    if (index < group.index || index > group.endIndex) continue;
    if (index === group.index && cursor < group.cursor) continue;
    if (index === group.endIndex && cursor >= group.endCursor) continue;
    if (group.endIndex === group.index && group.endCursor === group.cursor + 1 && group.window !== window) {
      const sameSentence = groups.some(
        (other) =>
          other.index === group.index &&
          other.cursor === group.cursor &&
          other.window === window &&
          other.endCursor === group.cursor + 1,
      );
      if (sameSentence) continue;
      if (window !== 0 && group.window !== 0) continue;
    }
    return i;
  }
  let best = 0;
  for (let i = 0; i < groups.length; i += 1) {
    if (groups[i]!.index <= index) best = i;
  }
  return best;
}

export function placeOf(group: SpotlightGroup): SpotlightPlace {
  return { index: group.index, cursor: group.cursor, window: group.window };
}

export function spotlightKey(place: SpotlightPlace) {
  return `${place.index}:${place.cursor}:${place.window}`;
}

/**
 * One group forward or back.
 * `groupsAt` returns the scene that contains that breath.
 * Off the first group of a scene, the previous scene opens on its last group.
 */
export function stepSpotlight(input: {
  place: SpotlightPlace;
  delta: 1 | -1;
  groupsAt: (breathIndex: number) => readonly SpotlightGroup[];
  breathCount: number;
}): SpotlightPlace | "start" | "end" {
  const groups = input.groupsAt(input.place.index);
  if (groups.length === 0) {
    if (input.delta < 0) return input.place.index <= 0 ? "start" : { index: input.place.index - 1, cursor: 0, window: 0 };
    return input.place.index + 1 >= input.breathCount ? "end" : { index: input.place.index + 1, cursor: 0, window: 0 };
  }
  const at = locateSpotlight(groups, input.place.index, input.place.cursor, input.place.window);
  if (input.delta > 0) {
    if (at + 1 < groups.length) return placeOf(groups[at + 1]!);
    const last = groups[at] ?? groups[groups.length - 1]!;
    const nextIndex = last.endIndex + 1;
    if (nextIndex >= input.breathCount) return "end";
    const next = input.groupsAt(nextIndex);
    const first = next.find((group) => group.index >= nextIndex) ?? next[0];
    return first ? placeOf(first) : "end";
  }
  if (at > 0) return placeOf(groups[at - 1]!);
  const first = groups[0]!;
  const prevIndex = first.index - 1;
  if (prevIndex < 0) return "start";
  const prev = input.groupsAt(prevIndex);
  for (let i = prev.length - 1; i >= 0; i -= 1) {
    const group = prev[i]!;
    if (group.endIndex <= prevIndex) return placeOf(group);
  }
  const last = prev[prev.length - 1];
  return last ? placeOf(last) : "start";
}

export function repeatSpotlight(
  place: SpotlightPlace,
  delta: 1 | -1,
  steps: number,
  groupsAt: (breathIndex: number) => readonly SpotlightGroup[],
  breathCount: number,
): SpotlightPlace | "start" | "end" {
  let current = place;
  const n = Math.max(0, Math.floor(steps));
  for (let i = 0; i < n; i += 1) {
    const moved = stepSpotlight({ place: current, delta, groupsAt, breathCount });
    if (moved === "start" || moved === "end") return moved;
    current = moved;
  }
  return current;
}

export type SpotlightRole = "past" | "focus" | "ahead";

export type SpotlightMark = { text: string; role: SpotlightRole };

/**
 * Pieces of each display block, split into what was read, the lit passage,
 * and what is still ahead. A play's repeated speaker stays on the first piece.
 * The pieces of a block join back to the block.
 */
export function markSpotlight(
  text: string,
  blocks: readonly { text: string }[],
  range: { start: number; end: number },
  kind: DisplayKind = "prose",
): SpotlightMark[][] {
  if (blocks.length === 0) return [];
  const speaker = kind === "speech" ? blocks[0]?.text.match(/^([^:]{1,80}): /)?.[1] : undefined;
  const prefix = speaker ? `${speaker}: ` : "";
  const raws = blocks.map((block, index) => {
    if (index > 0 && prefix && block.text.startsWith(prefix)) return block.text.slice(prefix.length);
    return block.text;
  });
  if (raws.join("") !== text) {
    return blocks.map((block) => [{ text: block.text, role: "focus" }]);
  }
  const focusStart = Math.max(0, Math.min(text.length, range.start));
  const focusEnd = Math.max(focusStart, Math.min(text.length, range.end));
  let offset = 0;
  return raws.map((raw, index) => {
    const start = offset;
    const end = offset + raw.length;
    offset = end;
    const cuts = [start, end];
    if (focusStart > start && focusStart < end) cuts.push(focusStart);
    if (focusEnd > start && focusEnd < end) cuts.push(focusEnd);
    cuts.sort((a, b) => a - b);
    const marks: SpotlightMark[] = [];
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const from = cuts[i]!;
      const to = cuts[i + 1]!;
      if (to <= from) continue;
      const role: SpotlightRole = to <= focusStart ? "past" : from >= focusEnd ? "ahead" : "focus";
      marks.push({ text: text.slice(from, to), role });
    }
    if (marks.length === 0) marks.push({ text: raw, role: "focus" });
    const first = marks[0];
    if (index > 0 && prefix && first) marks[0] = { text: prefix + first.text, role: first.role };
    return marks;
  });
}

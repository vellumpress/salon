import {
  displayLinePx,
  measureDisplaySample,
  measureFocusRows,
  measureStyledHeight,
  PHONE_LINE_PX,
  resolveDisplayBlocks,
  tapSpans,
  type DisplayKind,
  type DisplayMetrics,
} from "./display-blocks.ts";
import { isSectionBreak } from "./emphasized-text.ts";
import { sentenceSpans } from "./sentences.ts";

/**
 * The lit passage is two to four rendered lines.
 * A third of a line of slack keeps a sentence that barely wraps from
 * being cut, and from swallowing the sentence after it.
 * Whole sentences are kept whenever they land in that window. A sentence
 * taller than four lines breaks at the most natural internal pause.
 * A row counter, when the reader supplies one, also refuses a fifth painted
 * row: the next sentence stays out, and a sentence that still paints five
 * or six rows breaks at a semicolon, dash, or comma.
 * A window under two rows is rebalanced with its neighbours: the short
 * sentence moves back when the previous window has room, otherwise the long
 * neighbour breaks at a semicolon, dash, or comma. A lone one-row window
 * folds into the window just before it, and never across a scene, a poem,
 * or a chapter. A window that still has no earlier window inside that
 * boundary is set with its scene title, or on two lines, so the page never
 * keeps a one-row window.
 */
export const SPOTLIGHT_MIN_LINES = 2;
export const SPOTLIGHT_MAX_LINES = 4;
export const SPOTLIGHT_LINE_SLOP = 0.34;

export type MeasureFn = (sample: string) => number;

/**
 * Painted rows of one slice inside its breath.
 * The same characters can paint another row when they continue a line,
 * or when a display block boundary falls inside the slice.
 * Counts are non-decreasing as `end` grows.
 */
export type CountRows = (breathText: string, start: number, end: number) => number;

export type SpotlightBreath = { index: number; text: string };

export type SpotlightPart = { index: number; start: number; end: number };

/**
 * One tap.
 * `index` / `cursor` are the sentence progress lands on: the first sentence
 * of the group, or the sentence a long window belongs to.
 * `window` is 0 unless that sentence is taller than four lines.
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
  /**
   * Window of a sentence whose opening already lit with the previous group.
   * The continuation is window 1, 2, … so the opening stays window 0.
   */
  windowBase?: number;
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
  const resolved = window > 0 ? window : (first.windowBase ?? 0);
  return {
    index: first.index,
    cursor: first.sentence,
    window: resolved,
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
 * A break is always after a word. A single word stays whole.
 */
function windowLines(breathText: string, start: number, end: number, measure: MeasureFn, linePx: number) {
  return sampleLines(breathText.slice(start, Math.max(start, end)), measure, linePx);
}

function minWindowLines() {
  return SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP;
}

function maxWindowLines() {
  return SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP;
}

/** Under two lines: one short line, which may cross a paragraph to find company. */
function isShortLine(lines: number) {
  return lines < minWindowLines();
}

/** A whole breath that still paints as one line. */
function breathIsShort(
  breath: SpotlightBreath,
  measure: MeasureFn,
  linePx: number,
  kind: DisplayKind,
  countRows?: CountRows,
) {
  const atoms = atomsOf(breath, kind);
  const texts = new Map([[breath.index, breath.text ?? ""]]);
  if (isShortLine(mergedLines(atoms, texts, measure, linePx, kind))) return true;
  if (!countRows) return false;
  return coveredRows(atoms, texts, countRows) < SPOTLIGHT_MIN_LINES;
}

function rowsFit(countRows: CountRows | undefined, text: string, start: number, end: number) {
  if (!countRows) return true;
  return countRows(text, start, end) <= SPOTLIGHT_MAX_LINES;
}

/** Rows of a passage. Separate breaths stack, so their rows add. */
function coveredRows(atoms: readonly Atom[], texts: Map<number, string>, countRows: CountRows) {
  let rows = 0;
  let i = 0;
  while (i < atoms.length) {
    const index = atoms[i]!.index;
    const start = atoms[i]!.start;
    let end = atoms[i]!.end;
    let j = i + 1;
    while (j < atoms.length && atoms[j]!.index === index) {
      end = atoms[j]!.end;
      j += 1;
    }
    rows += countRows(texts.get(index) ?? "", start, end);
    if (rows > SPOTLIGHT_MAX_LINES) return rows;
    i = j;
  }
  return rows;
}

function skipSpace(text: string, index: number) {
  let i = index;
  while (i < text.length && /\s/u.test(text[i] ?? "")) i += 1;
  return i;
}

function addBreak(found: Map<number, number>, end: number, rank: number, length: number) {
  if (end <= 0 || end >= length) return;
  const prev = found.get(end);
  if (prev === undefined || rank < prev) found.set(end, rank);
}

const COMMA_CONJUNCTION =
  /^(?:and|but|or|nor|for|yet|so|because|although|though|while|whereas|if|when|unless|until|since|before|after)\b/iu;

/**
 * Internal pauses, best rank first.
 * -1  a sentence end the tap kept inside one quotation
 *  0  semicolon, colon, em dash, or a line break
 *  1  a comma before a conjunction
 *  2  any other comma
 *  3  a word boundary
 * The cut sits on the first character of the next piece, so the pause
 * and the space after it stay with the earlier piece.
 */
function breakCandidates(text: string): { end: number; rank: number }[] {
  const found = new Map<number, number>();
  const inner = sentenceSpans(text, "in-quotes");
  if (inner.length > 1) {
    for (const span of inner) addBreak(found, span.end, -1, text.length);
  }
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] ?? "";
    if (ch === ";" || ch === "\n") {
      addBreak(found, skipSpace(text, i + 1), 0, text.length);
      continue;
    }
    if (ch === ":") {
      const prev = i > 0 ? text[i - 1]! : "";
      const next = i + 1 < text.length ? text[i + 1]! : "";
      if (/\d/u.test(prev) && /\d/u.test(next)) continue;
      addBreak(found, skipSpace(text, i + 1), 0, text.length);
      continue;
    }
    if (ch === "\u2014" || ch === "\u2013") {
      addBreak(found, skipSpace(text, i + 1), 0, text.length);
      continue;
    }
    if (ch === "-" && text[i + 1] === "-") {
      let j = i + 2;
      while (text[j] === "-") j += 1;
      addBreak(found, skipSpace(text, j), 0, text.length);
      i = j - 1;
    }
  }
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ",") continue;
    const after = skipSpace(text, i + 1);
    if (after >= text.length) continue;
    const rank = COMMA_CONJUNCTION.test(text.slice(after)) ? 1 : 2;
    addBreak(found, after, rank, text.length);
  }
  const words = wordPieces(text);
  for (let i = 0; i < words.length - 1; i += 1) {
    const next = words[i + 1]!;
    let at = next.start;
    while (at < next.end && /\s/u.test(text[at] ?? "")) at += 1;
    addBreak(found, at, 3, text.length);
  }
  const list: { end: number; rank: number }[] = [];
  for (const [end, rank] of found) list.push({ end, rank });
  list.sort((a, b) => a.end - b.end);
  return list;
}

function wordCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/u).length;
}

function targetLines(total: number) {
  const pieces = Math.max(1, Math.ceil(total / SPOTLIGHT_MAX_LINES));
  return total / pieces;
}

type ScoredCut = { end: number; rank: number; remnant: number; balance: number };

function scoreCut(
  breathText: string,
  from: number,
  end: number,
  cut: number,
  rank: number,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  target: number,
  countRows?: CountRows,
): ScoredCut | null {
  if (cut <= from || cut >= end) return null;
  const piece = windowLines(breathText, from, cut, measure, linePx);
  if (piece < minWindowLines() || piece > maxWindowLines()) return null;
  if (!fits(piece, limitPx, linePx)) return null;
  if (!rowsFit(countRows, breathText, from, cut)) return null;
  const rest = windowLines(breathText, cut, end, measure, linePx);
  const restWords = wordCount(breathText.slice(cut, end));
  const restPieces = rest <= maxWindowLines() ? 1 : Math.ceil(rest / SPOTLIGHT_MAX_LINES);
  const tail = restPieces <= 1 ? rest : rest / restPieces;
  const remnant = (restWords > 0 && restWords < 4) || tail < minWindowLines() ? 1 : 0;
  return { end: cut, rank, remnant, balance: Math.abs(piece - target) };
}

function betterCut(a: ScoredCut, b: ScoredCut) {
  if (a.remnant !== b.remnant) return a.remnant - b.remnant;
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.balance !== b.balance) return a.balance - b.balance;
  return b.end - a.end;
}

function bestCut(scored: ScoredCut[]) {
  let best = scored[0]!;
  for (let i = 1; i < scored.length; i += 1) {
    const next = scored[i]!;
    if (betterCut(next, best) < 0) best = next;
  }
  return best;
}

/** Word cuts whose slice lands in the two-to-four line window. */
function wordCutsInWindow(
  breathText: string,
  from: number,
  wordCuts: readonly number[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  countRows?: CountRows,
) {
  if (wordCuts.length === 0) return [];
  let low = 0;
  let high = wordCuts.length - 1;
  let left = wordCuts.length;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (lines >= minWindowLines()) {
      left = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  low = left;
  high = wordCuts.length - 1;
  let right = left - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (
      lines <= maxWindowLines() &&
      fits(lines, limitPx, linePx) &&
      rowsFit(countRows, breathText, from, wordCuts[mid]!)
    ) {
      right = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (right < left) return [];
  return wordCuts.slice(left, right + 1);
}

/** The longest word cut that still fits, or the first word when nothing does. */
function longestWordFit(
  breathText: string,
  from: number,
  wordCuts: readonly number[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  absEnd: number,
  countRows?: CountRows,
) {
  let best = -1;
  let low = 0;
  let high = wordCuts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = windowLines(breathText, from, wordCuts[mid]!, measure, linePx);
    if (fits(lines, limitPx, linePx) && rowsFit(countRows, breathText, from, wordCuts[mid]!)) {
      best = wordCuts[mid]!;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (best > from) return best;
  return wordCuts[0] ?? absEnd;
}

function pickCut(
  breathText: string,
  from: number,
  absEnd: number,
  local: readonly { end: number; rank: number }[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  countRows?: CountRows,
) {
  const total = windowLines(breathText, from, absEnd, measure, linePx);
  const target = targetLines(total);
  const punct = local.filter((cand) => cand.rank < 3);
  const punctScored: ScoredCut[] = [];
  for (const cand of punct) {
    const scored = scoreCut(
      breathText,
      from,
      absEnd,
      cand.end,
      cand.rank,
      measure,
      limitPx,
      linePx,
      target,
      countRows,
    );
    if (scored) punctScored.push(scored);
  }
  const goodPunct = punctScored.filter((scored) => scored.remnant === 0);
  if (goodPunct.length > 0) return bestCut(goodPunct).end;
  // A comma, dash, or semicolon still beats a cut between words, even when
  // the pause sits under two lines. The latest pause that stays inside four
  // lines wins, so a sentence is not sliced mid-clause to look even.
  if (punctScored.length > 0) return bestCut(punctScored).end;
  const shortPunct: ScoredCut[] = [];
  for (const cand of punct) {
    if (cand.end <= from || cand.end >= absEnd) continue;
    const piece = windowLines(breathText, from, cand.end, measure, linePx);
    if (!(piece > 0.4) || piece > maxWindowLines()) continue;
    if (!fits(piece, limitPx, linePx)) continue;
    if (!rowsFit(countRows, breathText, from, cand.end)) continue;
    const rest = windowLines(breathText, cand.end, absEnd, measure, linePx);
    const restWords = wordCount(breathText.slice(cand.end, absEnd));
    const remnant = rest <= maxWindowLines() && restWords > 0 && restWords < 4 ? 1 : 0;
    shortPunct.push({
      end: cand.end,
      rank: cand.rank,
      remnant,
      balance: Math.abs(piece - maxWindowLines()),
    });
  }
  const shortGood = shortPunct.filter((scored) => scored.remnant === 0);
  if (shortGood.length > 0) return bestCut(shortGood).end;
  if (shortPunct.length > 0) return bestCut(shortPunct).end;
  const wordEnds = local.filter((cand) => cand.rank === 3).map((cand) => cand.end);
  const wordCuts = wordCutsInWindow(breathText, from, wordEnds, measure, limitPx, linePx, countRows);
  const wordScored: ScoredCut[] = [];
  for (const cut of wordCuts) {
    const scored = scoreCut(breathText, from, absEnd, cut, 3, measure, limitPx, linePx, target, countRows);
    if (scored) wordScored.push(scored);
  }
  const all = punctScored.concat(wordScored);
  if (all.length > 0) return bestCut(all).end;
  // A pause shorter than two lines still beats a fifth painted row.
  if (countRows) {
    const relaxed: ScoredCut[] = [];
    for (const cand of punct) {
      if (cand.end <= from || cand.end >= absEnd) continue;
      if (!rowsFit(countRows, breathText, from, cand.end)) continue;
      const piece = windowLines(breathText, from, cand.end, measure, linePx);
      if (piece > maxWindowLines() || !fits(piece, limitPx, linePx)) continue;
      relaxed.push({ end: cand.end, rank: cand.rank, remnant: 0, balance: Math.abs(piece - target) });
    }
    if (relaxed.length > 0) return bestCut(relaxed).end;
  }
  return longestWordFit(breathText, from, wordEnds, measure, limitPx, linePx, absEnd, countRows);
}

/**
 * Move the last cut earlier when it would leave a one-line or few-word tail
 * and some earlier pause keeps both pieces inside the window.
 */
function balanceTail(
  cuts: number[],
  breathText: string,
  absStart: number,
  cands: readonly { end: number; rank: number }[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  countRows?: CountRows,
) {
  if (cuts.length < 2) return;
  const lastEnd = cuts[cuts.length - 1]!;
  const prevEnd = cuts[cuts.length - 2]!;
  const prevStart = cuts.length >= 3 ? cuts[cuts.length - 3]! : absStart;
  const lastLines = windowLines(breathText, prevEnd, lastEnd, measure, linePx);
  const lastWords = wordCount(breathText.slice(prevEnd, lastEnd));
  if (lastLines >= minWindowLines() && lastWords >= 4) return;
  let best: ScoredCut | null = null;
  for (const cand of cands) {
    // A one-line tail folds at a semicolon, dash, or comma. A word boundary
    // would put the break in the middle of a clause.
    if (cand.rank >= 3) continue;
    if (cand.end <= prevStart || cand.end >= prevEnd) continue;
    const piece = windowLines(breathText, prevStart, cand.end, measure, linePx);
    const rest = windowLines(breathText, cand.end, lastEnd, measure, linePx);
    if (piece < minWindowLines() || piece > maxWindowLines()) continue;
    if (!fits(piece, limitPx, linePx) || !fits(rest, limitPx, linePx)) continue;
    if (!rowsFit(countRows, breathText, prevStart, cand.end)) continue;
    if (!rowsFit(countRows, breathText, cand.end, lastEnd)) continue;
    if (rest < minWindowLines()) continue;
    const restWords = wordCount(breathText.slice(cand.end, lastEnd));
    if (restWords < 4) continue;
    const scored: ScoredCut = {
      end: cand.end,
      rank: cand.rank,
      remnant: 0,
      balance: Math.abs(piece - rest),
    };
    if (!best || betterCut(scored, best) < 0) best = scored;
  }
  if (best) cuts[cuts.length - 2] = best.end;
}

/**
 * A sentence taller than four lines, cut at the best pause inside the window.
 * Pieces stay between two and four lines when a pause allows it.
 * Nothing is cut inside a word, and the slices join back to the sentence.
 */
function splitAtom(
  atom: Atom,
  breathText: string,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
  maxWindows?: number,
  countRows?: CountRows,
): SpotlightGroup[] {
  const words = wordPieces(atom.text);
  if (words.length <= 1) return [groupFrom([atom], 0, kind)];
  const absStart = atom.start;
  const absEnd = atom.end;
  const cands = breakCandidates(atom.text).map((cand) => ({
    end: atom.start + cand.end,
    rank: cand.rank,
  }));
  const cuts: number[] = [];
  let from = absStart;
  while (from < absEnd) {
    const restLines = windowLines(breathText, from, absEnd, measure, linePx);
    if (fits(restLines, limitPx, linePx) && rowsFit(countRows, breathText, from, absEnd)) {
      cuts.push(absEnd);
      break;
    }
    const local = cands.filter((cand) => cand.end > from && cand.end < absEnd);
    let chosen =
      local.length > 0 ? pickCut(breathText, from, absEnd, local, measure, limitPx, linePx, countRows) : absEnd;
    if (chosen <= from || chosen >= absEnd) {
      cuts.push(absEnd);
      break;
    }
    cuts.push(chosen);
    from = chosen;
  }
  if (cuts.length === 0 || cuts[cuts.length - 1] !== absEnd) cuts.push(absEnd);
  if (cuts[cuts.length - 1] === absEnd) {
    balanceTail(cuts, breathText, absStart, cands, measure, limitPx, linePx, countRows);
  }
  const spans: { start: number; end: number }[] = [];
  {
    let cursor = absStart;
    for (const end of cuts) {
      if (end > cursor) spans.push({ start: cursor, end });
      cursor = end;
    }
  }
  // A one-row piece folds into the clause beside it when the join stays
  // inside four lines. The tail folds back first. A head folds forward.
  let folded = true;
  while (folded) {
    folded = false;
    for (let i = 0; i < spans.length; i += 1) {
      const span = spans[i]!;
      if (windowLines(breathText, span.start, span.end, measure, linePx) >= minWindowLines()) continue;
      const prev = i > 0 ? spans[i - 1] : undefined;
      if (
        prev &&
        fits(windowLines(breathText, prev.start, span.end, measure, linePx), limitPx, linePx) &&
        rowsFit(countRows, breathText, prev.start, span.end)
      ) {
        spans.splice(i - 1, 2, { start: prev.start, end: span.end });
        folded = true;
        break;
      }
      const next = spans[i + 1];
      if (
        next &&
        fits(windowLines(breathText, span.start, next.end, measure, linePx), limitPx, linePx) &&
        rowsFit(countRows, breathText, span.start, next.end)
      ) {
        spans.splice(i, 2, { start: span.start, end: next.end });
        folded = true;
        break;
      }
    }
  }
  // A one-row piece that cannot fold without passing four lines is recut
  // with its neighbour at a semicolon, dash, or comma, three-and-two or
  // two-and-two. The recut runs on the whole sentence, so a lazy query
  // numbers the windows the same way.
  let recut = true;
  while (recut) {
    recut = false;
    for (let i = 0; i < spans.length; i += 1) {
      const span = spans[i]!;
      if (windowLines(breathText, span.start, span.end, measure, linePx) >= minWindowLines()) continue;
      const neighborAt = i > 0 ? i - 1 : i + 1 < spans.length ? i + 1 : -1;
      if (neighborAt < 0) break;
      const neighbor = spans[neighborAt]!;
      const from = Math.min(span.start, neighbor.start);
      const to = Math.max(span.end, neighbor.end);
      let best: { end: number; plan: number; rank: number } | null = null;
      for (const cand of cands) {
        if (cand.rank >= 3) continue;
        if (cand.end <= from || cand.end >= to) continue;
        const leftLines = windowLines(breathText, from, cand.end, measure, linePx);
        const rightLines = windowLines(breathText, cand.end, to, measure, linePx);
        if (leftLines < minWindowLines() || rightLines < minWindowLines()) continue;
        if (leftLines > maxWindowLines() || rightLines > maxWindowLines()) continue;
        if (!fits(leftLines, limitPx, linePx) || !fits(rightLines, limitPx, linePx)) continue;
        if (!rowsFit(countRows, breathText, from, cand.end) || !rowsFit(countRows, breathText, cand.end, to)) continue;
        let plan = 5;
        if (leftLines >= 2.5 && leftLines < 3.6 && rightLines < 2.6) plan = 0;
        else if (leftLines < 2.6 && rightLines < 2.6) plan = 1;
        else if (leftLines < 2.6 && rightLines >= 2.5 && rightLines < 3.6) plan = 2;
        if (!best || plan < best.plan || (plan === best.plan && cand.rank < best.rank)) {
          best = { end: cand.end, plan, rank: cand.rank };
        }
      }
      if (!best) continue;
      const left = { start: from, end: best.end };
      const right = { start: best.end, end: to };
      const at = Math.min(i, neighborAt);
      spans.splice(at, 2, left, right);
      recut = true;
      break;
    }
  }
  const base = atom.windowBase ?? 0;
  // Folding happens on the whole sentence first, so a lazy query that only
  // keeps the window on screen still numbers those windows the same way.
  const shown = maxWindows && maxWindows > 0 ? spans.slice(0, maxWindows) : spans;
  return shown.map((span, window) => {
    const piece: Atom = {
      index: atom.index,
      sentence: atom.sentence,
      start: span.start,
      end: span.end,
      text: breathText.slice(span.start, span.end),
    };
    return groupFrom([piece], base + window, kind);
  });
}

/**
 * A stop is a breath a passage may include and must not continue past.
 * Sit ends and ritual ends are stops. Sentences inside the stop still merge.
 */
function crossesStop(fromIndex: number, toIndex: number, stops: ReadonlySet<number> | undefined) {
  if (!stops || stops.size === 0 || toIndex <= fromIndex) return false;
  for (const stop of stops) {
    if (fromIndex <= stop && toIndex > stop) return true;
  }
  return false;
}

/** A cut is a character end inside one breath. The next sentence stays out. */
function crossesCut(from: Atom, to: Atom, cuts: ReadonlyMap<number, number> | undefined) {
  if (!cuts || from.index !== to.index) return false;
  const cut = cuts.get(from.index);
  if (cut === undefined) return false;
  return from.start < cut && to.start >= cut;
}

export type SpotlightEdge = "around" | "first" | "last";

export type SpotlightQuery = {
  cursor?: number;
  window?: number;
  edge?: SpotlightEdge;
  /** Groups to keep after the one on screen. A tap needs the next one. */
  after?: number;
};

type GroupBound = {
  edge: SpotlightEdge;
  index: number;
  cursor: number;
  window: number;
  after: number;
};

function atomIsTall(
  atom: Atom,
  breathText: string,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  countRows?: CountRows,
) {
  if (wordPieces(atom.text).length <= 1) return false;
  if (!fits(atomLines(atom, breathText, measure, linePx), limitPx, linePx)) return true;
  return !rowsFit(countRows, breathText, atom.start, atom.end);
}

/**
 * Where a group that contains `focus` can start.
 * A tall sentence is split on its own and does not pull the next paragraph,
 * so the walk stops at that sentence. A short tail after it stays in the
 * slice: the tail joins the tall sentence's last window when that window
 * is present, and joins the next paragraph when the window was dropped.
 * A run of short lines can still cross paragraphs.
 */
function groupOrigin(
  breaths: readonly SpotlightBreath[],
  focus: number,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
  stops?: ReadonlySet<number>,
  countRows?: CountRows,
  retreat = true,
): { index: number; sentence: number } {
  const focusPos = breaths.findIndex((breath) => breath.index === focus);
  if (focusPos <= 0) return { index: breaths[focusPos]?.index ?? focus, sentence: 0 };
  let pos = focusPos;
  while (pos > 0) {
    const prev = breaths[pos - 1]!;
    const here = breaths[pos]!;
    if (crossesStop(prev.index, here.index, stops)) break;
    const prevAtoms = atomsOf(prev, kind);
    const breathText = prev.text ?? "";
    let lastTall = -1;
    for (let i = 0; i < prevAtoms.length; i += 1) {
      if (atomIsTall(prevAtoms[i]!, breathText, measure, limitPx, linePx, countRows)) lastTall = i;
    }
    if (lastTall >= 0) {
      const tail = prevAtoms.slice(lastTall + 1);
      if (tail.length === 0) break;
      const texts = new Map([[prev.index, breathText]]);
      if (!isShortLine(mergedLines(tail, texts, measure, linePx, kind))) break;
      return { index: prev.index, sentence: prevAtoms[lastTall]!.sentence };
    }
    const texts = new Map([[prev.index, breathText]]);
    if (!isShortLine(mergedLines(prevAtoms, texts, measure, linePx, kind))) break;
    pos -= 1;
  }
  // A one-line sentence can move back into the previous window. Opening has
  // to see that window, once, or the passage on screen would not match the chapter.
  const here = breaths[pos]!;
  if (
    retreat &&
    pos > 0 &&
    breathIsShort(here, measure, linePx, kind, countRows) &&
    !crossesStop(breaths[pos - 1]!.index, here.index, stops)
  ) {
    return groupOrigin(
      breaths,
      breaths[pos - 1]!.index,
      measure,
      limitPx,
      linePx,
      kind,
      stops,
      countRows,
      false,
    );
  }
  return { index: here.index, sentence: 0 };
}

function groupCovers(group: SpotlightGroup, place: SpotlightPlace) {
  if (place.index < group.index || place.index > group.endIndex) return false;
  if (place.index === group.index && place.cursor < group.cursor) return false;
  if (place.index === group.endIndex && place.cursor >= group.endCursor) return false;
  if (group.index === group.endIndex && group.cursor === place.cursor && group.window !== place.window) {
    return false;
  }
  // A group that starts on an earlier sentence may borrow the opening of its
  // last sentence. A later window of that sentence is a different passage.
  if (
    place.window !== 0 &&
    place.index === group.endIndex &&
    place.cursor + 1 === group.endCursor &&
    !(group.index === place.index && group.cursor === place.cursor && group.window === place.window)
  ) {
    return false;
  }
  return true;
}

function boundSatisfied(groups: readonly SpotlightGroup[], bound: GroupBound) {
  if (bound.edge === "first") return groups.length >= 1;
  if (bound.edge === "last") return false;
  const coverAt = groups.findIndex((group) => groupCovers(group, bound));
  if (coverAt < 0) return false;
  return groups.length > coverAt + bound.after;
}

/** A sentence that finishes before the place on screen. Its last window is a left tap away. */
function atomPrecedesPlace(atom: Atom, bound: GroupBound) {
  if (atom.index < bound.index) return true;
  if (atom.index > bound.index) return false;
  return atom.sentence < bound.cursor;
}

function windowsStillNeeded(groups: readonly SpotlightGroup[], bound: GroupBound | undefined, atom: Atom) {
  if (!bound || bound.edge === "last") return undefined;
  // The cap is for the sentence on screen: that window, plus one step.
  // A sentence that already ended has to be cut through to its last window.
  // Two windows would drop the third and fourth, and one left tap would land
  // on the second.
  if (atomPrecedesPlace(atom, bound)) return undefined;
  if (bound.edge === "first") return Math.max(1, 1 + bound.after);
  const coverAt = groups.findIndex((group) => groupCovers(group, bound));
  if (coverAt < 0) return bound.window + bound.after + 1;
  const need = bound.after - (groups.length - (coverAt + 1));
  return need > 0 ? need : undefined;
}

/**
 * Groups for one stretch of breaths, in reading order.
 * Short sentences in one paragraph merge until the next sentence would pass
 * four lines. A one-line sentence may take the next paragraph when that still
 * fits; a longer passage stops at the paragraph. Chapter scope is the caller's:
 * the reader passes one scene. `stops` refuse the breath after a sit or a
 * ritual, including that short-line exception. `cuts` refuse the sentence
 * after a sit that ends inside a longer breath. A sentence taller than four
 * lines is split at an internal pause. With `countRows`, a window that would
 * paint a fifth row stops at the sentence before it, and a single sentence
 * that still paints five or six rows breaks at a semicolon, dash, or comma.
 * A window that would close under two rows moves back into the previous
 * window when that still fits, or takes a clause of the next sentence at a
 * semicolon, dash, or comma. A lone one-row window folds into the window
 * just before it. The fold stays inside this scene, so it never crosses a
 * scene, poem, or chapter, and it never crosses a sit stop or a cut. If the
 * fold would pass four rows, the two windows split three-and-two, or
 * two-and-two when that is the cut that fits. `bound` stops once the passage
 * on screen, and one step past it, is known.
 */
function groupBreaths(
  breaths: readonly SpotlightBreath[],
  measureIn: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind,
  stops: ReadonlySet<number> | undefined,
  cuts: ReadonlyMap<number, number> | undefined,
  countRows: CountRows | undefined,
  bound: GroupBound | undefined,
  originSentence = 0,
): SpotlightGroup[] {
  const heights = new Map<string, number>();
  const measure: MeasureFn = (sample) => {
    const hit = heights.get(sample);
    if (hit !== undefined) return hit;
    const value = measureIn(sample);
    heights.set(sample, value);
    return value;
  };
  const rowCaches = new Map<string, Map<string, number>>();
  const rows: CountRows | undefined = countRows
    ? (text, start, end) => {
        let byText = rowCaches.get(text);
        if (!byText) {
          byText = new Map();
          rowCaches.set(text, byText);
        }
        const key = `${start}:${end}`;
        const hit = byText.get(key);
        if (hit !== undefined) return hit;
        const value = countRows(text, start, end);
        byText.set(key, value);
        return value;
      }
    : undefined;
  const texts = new Map<number, string>();
  const atoms: Atom[] = [];
  breaths.forEach((breath, breathAt) => {
    texts.set(breath.index, breath.text ?? "");
    const made = atomsOf(breath, kind);
    if (breathAt === 0 && originSentence > 0) {
      atoms.push(...made.filter((atom) => atom.sentence >= originSentence));
      return;
    }
    atoms.push(...made);
  });
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
  const packed: Atom[][] = [];

  function withinCap(slice: readonly Atom[]) {
    const lines = mergedLines(slice, texts, measure, linePx, kind);
    if (!fits(lines, cap, linePx)) return false;
    if (rows && coveredRows(slice, texts, rows) > SPOTLIGHT_MAX_LINES) return false;
    return true;
  }

  function tooShort(slice: readonly Atom[]) {
    if (slice.length === 0) return false;
    if (isShortLine(mergedLines(slice, texts, measure, linePx, kind))) return true;
    if (rows && coveredRows(slice, texts, rows) < SPOTLIGHT_MIN_LINES) return true;
    return false;
  }

  function canAttach(prev: readonly Atom[], next: readonly Atom[]) {
    const from = prev[prev.length - 1];
    const to = next[0];
    if (!from || !to) return false;
    if (crossesStop(from.index, to.index, stops)) return false;
    if (crossesCut(from, to, cuts)) return false;
    return true;
  }

  /** The slice finishes a sit or ritual, so it may stay on one row. */
  function endsAtStop(slice: readonly Atom[]) {
    const last = slice[slice.length - 1];
    if (!last || !stops?.has(last.index)) return false;
    const text = texts.get(last.index) ?? "";
    const boundary = cuts?.get(last.index) ?? text.length;
    if (last.end < boundary) return false;
    return !slice.some((atom) => atom.index > last.index || (atom.index === last.index && atom.end > boundary));
  }

  function pieceOf(atom: Atom, start: number, end: number): Atom {
    const text = texts.get(atom.index) ?? "";
    return {
      index: atom.index,
      sentence: atom.sentence,
      start,
      end,
      text: text.slice(start, end),
    };
  }

  /**
   * A prefix of `next` that brings `head` into two to four rows.
   * Only a semicolon, dash, or comma. A sentence that already fits in four
   * lines stays whole, and a cut never falls between words.
   */
  function takeClause(head: readonly Atom[], next: Atom): { prefix: Atom; rest: Atom } | null {
    if (next.end - next.start < 2) return null;
    const breathText = texts.get(next.index) ?? "";
    if (!atomIsTall(next, breathText, measure, cap, linePx, rows)) return null;
    const local = breakCandidates(next.text);
    const consider = (relEnd: number, rank: number): ScoredCut | null => {
      const abs = next.start + relEnd;
      if (abs <= next.start || abs >= next.end) return null;
      const prefix = pieceOf(next, next.start, abs);
      const rest = pieceOf(next, abs, next.end);
      const combined = head.concat(prefix);
      if (!withinCap(combined) || tooShort(combined)) return null;
      const restShort = tooShort([rest]);
      const restTall = atomIsTall(rest, breathText, measure, cap, linePx, rows);
      const restWords = wordCount(rest.text);
      const remnant = (restShort && !restTall) || (restWords > 0 && restWords < 4 && !restTall) ? 1 : 0;
      const lines = mergedLines(combined, texts, measure, linePx, kind);
      return { end: abs, rank, remnant, balance: Math.abs(lines - 3) };
    };
    let best: ScoredCut | null = null;
    for (const cand of local) {
      if (cand.rank >= 3) continue;
      const scored = consider(cand.end, cand.rank);
      if (scored && (!best || betterCut(scored, best) < 0)) best = scored;
    }
    if (!best) return null;
    const rest = pieceOf(next, best.end, next.end);
    rest.windowBase = (next.windowBase ?? 0) + 1;
    return { prefix: pieceOf(next, next.start, best.end), rest };
  }

  function pushSlice(slice: Atom[]) {
    packed.push(slice);
    groups.push(groupFrom(slice, 0, kind));
  }

  function spanRows(slice: readonly Atom[]) {
    if (rows) return coveredRows(slice, texts, rows);
    return mergedLines(slice, texts, measure, linePx, kind);
  }

  /** Left piece through `absEnd` inside `combined[at]`, and the piece after it. */
  function cutCombined(combined: readonly Atom[], at: number, absEnd: number): [Atom[], Atom[]] | null {
    const atom = combined[at];
    if (!atom || absEnd <= atom.start || absEnd >= atom.end) return null;
    const left = combined.slice(0, at).concat(pieceOf(atom, atom.start, absEnd));
    const right = [pieceOf(atom, absEnd, atom.end)].concat(combined.slice(at + 1));
    return [left, right];
  }

  /**
   * Two windows from a fold that would paint a fifth row.
   * Three-and-two wins, then two-and-two, then two-and-three.
   * A stronger pause wins a tie. Both sides stay inside two to four rows.
   */
  function balanceSplit(combined: readonly Atom[]): [Atom[], Atom[]] | null {
    type Cand = { left: Atom[]; right: Atom[]; score: number };
    const cands: Cand[] = [];
    const consider = (left: Atom[], right: Atom[], rank: number) => {
      if (left.length === 0 || right.length === 0) return;
      if (tooShort(left) || tooShort(right)) return;
      if (!withinCap(left) || !withinCap(right)) return;
      const l = spanRows(left);
      const r = spanRows(right);
      const floor = minWindowLines();
      let plan = 5;
      if (l >= 2.5 && l < 3.6 && r >= floor && r < 2.6) plan = 0;
      else if (l >= floor && l < 2.6 && r >= floor && r < 2.6) plan = 1;
      else if (l >= floor && l < 2.6 && r >= 2.5 && r < 3.6) plan = 2;
      cands.push({ left, right, score: plan * 20 + rank });
    };
    for (let n = 0; n < combined.length; n += 1) {
      const atom = combined[n]!;
      if (n > 0) consider(combined.slice(0, n), combined.slice(n), 0);
      // The pair already passed four rows. A sentence that fit on its own
      // may open here, at a semicolon, dash, or comma. A word boundary stays
      // closed: the break is never mid-thought.
      const pauses = breakCandidates(atom.text);
      for (const cand of pauses) {
        if (cand.rank >= 3) continue;
        const pair = cutCombined(combined, n, atom.start + cand.end);
        if (pair) consider(pair[0], pair[1], cand.rank + 1);
      }
    }
    if (cands.length === 0) return null;
    cands.sort((a, b) => a.score - b.score);
    const best = cands[0]!;
    const right0 = best.right[0]!;
    const left0 = best.left[0]!;
    if (right0.index === left0.index) {
      right0.windowBase = Math.max(right0.windowBase ?? 0, (left0.windowBase ?? 0) + 1, (groups[groups.length - 1]?.window ?? 0) + 1);
    }
    return [best.left, best.right];
  }

  /** Fold one short window into the window before it, or split that pair. */
  function foldLone(slice: Atom[]) {
    if (!tooShort(slice)) return false;
    const prev = packed[packed.length - 1];
    if (!prev || !canAttach(prev, slice)) return false;
    const moved = prev.concat(slice);
    if (withinCap(moved)) {
      packed[packed.length - 1] = moved;
      groups[groups.length - 1] = groupFrom(moved, groups[groups.length - 1]!.window, kind);
      return true;
    }
    const split = balanceSplit(moved);
    if (!split) return false;
    const window = groups[groups.length - 1]!.window;
    packed[packed.length - 1] = split[0];
    groups[groups.length - 1] = groupFrom(split[0], window, kind);
    pushSlice(split[1]);
    return true;
  }

  let i = 0;
  while (i < atoms.length) {
    const atom = atoms[i]!;
    if (bound?.edge === "last" && atom.index > bound.index) break;
    if (bound && bound.edge !== "last" && boundSatisfied(groups, bound)) {
      // The painted passage stops once it is known. A one-row sentence still
      // ahead has to fold into that passage now, or the step past it thinks
      // the sentence was already consumed and the reader cannot reach it.
      if (tooShort([atom]) && foldLone([atom])) {
        i += 1;
        continue;
      }
      break;
    }
    const breathText = texts.get(atom.index) ?? "";
    const alone = atomLines(atom, breathText, measure, linePx);
    const words = wordPieces(atom.text);
    const aloneRows = rowsFit(rows, breathText, atom.start, atom.end);
    if ((!fits(alone, cap, linePx) || !aloneRows) && words.length > 1) {
      const maxWindows =
        bound && (bound.edge === "last" || atom.index <= bound.index || !boundSatisfied(groups, bound))
          ? windowsStillNeeded(groups, bound, atom)
          : undefined;
      const pieces = splitAtom(atom, breathText, measure, cap, linePx, kind, maxWindows, rows);
      for (const piece of pieces) {
        const part = piece.parts[0];
        if (!part) continue;
        const slice: Atom[] = [
          {
            index: part.index,
            sentence: atom.sentence,
            start: part.start,
            end: part.end,
            text: breathText.slice(part.start, part.end),
            windowBase: piece.window > 0 ? piece.window : undefined,
          },
        ];
        packed.push(slice);
        groups.push(piece);
      }
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < atoms.length) {
      const next = atoms[j]!;
      const prev = atoms[j - 1]!;
      if (crossesStop(prev.index, next.index, stops)) break;
      if (crossesCut(prev, next, cuts)) break;
      const nextText = texts.get(next.index) ?? "";
      const nextLines = atomLines(next, nextText, measure, linePx);
      const nextFitsRows = rowsFit(rows, nextText, next.start, next.end);
      if ((!fits(nextLines, cap, linePx) || !nextFitsRows) && wordPieces(next.text).length > 1) break;
      const have = mergedLines(atoms.slice(i, j), texts, measure, linePx, kind);
      // A paragraph break (the next breath) stays closed unless this passage
      // is still a single short line.
      if (next.index !== prev.index && !isShortLine(have)) break;
      const lines = mergedLines(atoms.slice(i, j + 1), texts, measure, linePx, kind);
      if (!fits(lines, cap, linePx)) break;
      if (rows && coveredRows(atoms.slice(i, j + 1), texts, rows) > SPOTLIGHT_MAX_LINES) break;
      j += 1;
    }
    const slice = atoms.slice(i, j);
    const next = j < atoms.length ? atoms[j] : undefined;
    const blocked =
      !next ||
      endsAtStop(slice) ||
      crossesStop(slice[slice.length - 1]!.index, next.index, stops) ||
      crossesCut(slice[slice.length - 1]!, next, cuts);
    if (tooShort(slice) && !blocked && next) {
      const prev = packed[packed.length - 1];
      const moved = prev && canAttach(prev, slice) ? prev.concat(slice) : null;
      const movedFits = moved !== null && withinCap(moved) && !tooShort(moved);
      if (moved && movedFits) {
        packed[packed.length - 1] = moved;
        groups[groups.length - 1] = groupFrom(moved, groups[groups.length - 1]!.window, kind);
        i = j;
        continue;
      }
      const taken = takeClause(slice, next);
      if (taken) {
        pushSlice(slice.concat(taken.prefix));
        atoms[j] = taken.rest;
        i = j;
        continue;
      }
      if (moved && withinCap(moved)) {
        packed[packed.length - 1] = moved;
        groups[groups.length - 1] = groupFrom(moved, groups[groups.length - 1]!.window, kind);
        i = j;
        continue;
      }
    }
    if (tooShort(slice) && foldLone(slice)) {
      i = j;
      continue;
    }
    pushSlice(slice);
    i = j;
  }
  if (bound?.edge === "last") {
    const overlapping = groups.filter((group) => group.index <= bound.index && group.endIndex >= bound.index);
    const last = overlapping[overlapping.length - 1] ?? groups[groups.length - 1];
    return last ? [last] : groups;
  }
  if (bound?.edge === "first") return groups.slice(0, 1);
  return groups;
}

export function spotlightGroups(
  breaths: readonly SpotlightBreath[],
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind = "prose",
  stops?: ReadonlySet<number>,
  cuts?: ReadonlyMap<number, number>,
  countRows?: CountRows,
): SpotlightGroup[] {
  return groupBreaths(breaths, measure, limitPx, linePx, kind, stops, cuts, countRows, undefined);
}

/**
 * The groups a reader needs for one place: the passage on screen, the step
 * after it, or the last passage of a breath when stepping backward.
 * The rest of the chapter is left ungrouped so a long poem can open.
 */
export function spotlightNear(
  breaths: readonly SpotlightBreath[],
  place: SpotlightPlace,
  measure: MeasureFn,
  limitPx: number,
  linePx: number,
  kind: DisplayKind = "prose",
  stops?: ReadonlySet<number>,
  cuts?: ReadonlyMap<number, number>,
  edge: SpotlightEdge = "around",
  after = 1,
  countRows?: CountRows,
): SpotlightGroup[] {
  if (breaths.length === 0) return [];
  const focusPos = breaths.findIndex((breath) => breath.index === place.index);
  if (focusPos < 0) return spotlightGroups(breaths, measure, limitPx, linePx, kind, stops, cuts, countRows);
  const origin =
    edge === "first"
      ? { index: place.index, sentence: 0 }
      : groupOrigin(breaths, place.index, measure, limitPx, linePx, kind, stops, countRows);
  const originPos = breaths.findIndex((breath) => breath.index === origin.index);
  const start = originPos >= 0 ? originPos : focusPos;
  // A passage is at most four lines, so the breaths it can touch sit next to it.
  const slack = edge === "last" ? 8 : Math.max(after, 0) + 8;
  const slice = breaths.slice(start, Math.min(breaths.length, focusPos + slack + 1));
  const bound: GroupBound = {
    edge,
    index: place.index,
    cursor: place.cursor,
    window: place.window,
    after,
  };
  return groupBreaths(
    slice,
    measure,
    limitPx,
    linePx,
    kind,
    stops,
    cuts,
    countRows,
    bound,
    origin.index === slice[0]?.index ? origin.sentence : 0,
  );
}

/**
 * The passage that finishes `stop` must end on `stopLength` (the breath's
 * last character, or a cut inside that breath) and must not continue past it.
 * A miss is a short reason.
 */
export function passageEndsAtStop(
  groups: readonly SpotlightGroup[],
  stop: number,
  stopLength: number,
): string | null {
  for (const group of groups) {
    let before = false;
    let past = false;
    for (const part of group.parts) {
      if (part.index < stop || (part.index === stop && part.start < stopLength)) before = true;
      if (part.index > stop || (part.index === stop && part.end > stopLength)) past = true;
    }
    if (before && past) {
      return `a lit passage runs from breath ${group.index} through breath ${group.endIndex}`;
    }
  }
  const finishers = groups.filter((group) =>
    group.parts.some((part) => part.index === stop && part.end === stopLength),
  );
  if (finishers.length === 0) return "no lit passage ends on the stop's last character";
  const finisher = finishers[finishers.length - 1]!;
  if (finisher.parts.some((part) => part.index > stop || (part.index === stop && part.end > stopLength))) {
    return "the last lit passage continues past the stop";
  }
  return null;
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

/** The group whose lit range contains this character, if the scene still has it. */
export function groupCovering(
  groups: readonly SpotlightGroup[],
  index: number,
  start: number,
): SpotlightGroup | null {
  for (const group of groups) {
    for (const part of group.parts) {
      if (part.index === index && part.start <= start && part.end > start) return group;
    }
  }
  return null;
}

export function placeOf(group: SpotlightGroup): SpotlightPlace {
  return { index: group.index, cursor: group.cursor, window: group.window };
}

export function spotlightKey(place: SpotlightPlace) {
  return `${place.index}:${place.cursor}:${place.window}`;
}

export type GroupsAt = (breathIndex: number, query?: SpotlightQuery) => readonly SpotlightGroup[];

/**
 * One group forward or back.
 * `groupsAt` returns the scene that contains that breath. A query asks for
 * the passage on screen, the first passage of a breath, or the last one.
 * Off the first group of a scene, the previous scene opens on its last group.
 */
export function stepSpotlight(input: {
  place: SpotlightPlace;
  delta: 1 | -1;
  groupsAt: GroupsAt;
  breathCount: number;
}): SpotlightPlace | "start" | "end" {
  const groups = input.groupsAt(input.place.index, {
    cursor: input.place.cursor,
    window: input.place.window,
    edge: "around",
    after: 1,
  });
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
    const next = input.groupsAt(nextIndex, { cursor: 0, window: 0, edge: "first", after: 0 });
    const first = next.find((group) => group.index >= nextIndex) ?? next[0];
    return first ? placeOf(first) : "end";
  }
  if (at > 0) return placeOf(groups[at - 1]!);
  const first = groups[0]!;
  // The slice can open after a tall sentence in this same breath. That
  // sentence's last window is the passage a left tap needs. The breath
  // before it is one step further back.
  if (first.cursor > 0 || first.window > 0) {
    const prior = input.groupsAt(first.index, { cursor: 0, window: 0, edge: "last", after: 0 });
    for (let i = prior.length - 1; i >= 0; i -= 1) {
      const group = prior[i]!;
      if (group.endIndex > first.index) continue;
      const key = placeOf(group);
      const earlier =
        key.index < input.place.index ||
        (key.index === input.place.index &&
          (key.cursor < input.place.cursor ||
            (key.cursor === input.place.cursor && key.window < input.place.window)));
      if (earlier) return key;
    }
  }
  const prevIndex = first.index - 1;
  if (prevIndex < 0) return "start";
  const prev = input.groupsAt(prevIndex, { cursor: 0, window: 0, edge: "last", after: 0 });
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
  groupsAt: GroupsAt,
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

const ROW_BOX_SLACK = 0.08;

function lineBoxes(sample: string, metrics: DisplayMetrics) {
  const line = displayLinePx(metrics);
  const height = metrics.faceReady ? measureStyledHeight(sample, metrics) : measureDisplaySample(sample, metrics);
  if (!(height > 0)) return sample.trim() ? 1 : 0;
  return Math.max(1, Math.ceil(height / (line > 0 ? line : PHONE_LINE_PX) - ROW_BOX_SLACK));
}

/**
 * Painted rows of a lit slice.
 * One line that continues earlier words is charged the shared row and one
 * extra wrap, and that cannot reach a fifth row. Any other slice is counted
 * per display block. Past text can add the shared row and one extra wrap.
 * Text still ahead of the cut can push the last focus word onto another row,
 * and four estimated rows can hide the same extra line, so both are read
 * from the focus spans' client rects.
 * Books and imported pages share this count.
 */
export function countFocusRows(
  text: string,
  start: number,
  end: number,
  metrics: DisplayMetrics,
  kind: DisplayKind = "prose",
): number {
  if (!(end > start) || !text) return 0;
  const slice = text.slice(start, end);
  const alone = lineBoxes(slice, metrics);
  // A continuation measured on its own can hide the row it shares with the
  // line above. Read the painted rows when the page can. The two-row charge
  // is only the fallback for a count with no page, and it still cannot
  // reach a fifth row.
  if (alone <= 1 && start > 0) {
    if (typeof document !== "undefined") {
      const laid = laidFocus(text, start, end, metrics, kind);
      if (laid.parts.length > 0) return paintedRows(laid.parts, metrics);
    }
    return Math.min(SPOTLIGHT_MAX_LINES, alone + 2);
  }
  const laid = laidFocus(text, start, end, metrics, kind);
  if (laid.parts.length === 0) return alone;
  // The line after the focus, or a block break under a four-row estimate, can
  // add a row the slice measured on its own does not see.
  const confirm = laid.ahead || laid.safe >= SPOTLIGHT_MAX_LINES;
  if (!confirm || typeof document === "undefined") return alone <= 1 ? alone : laid.safe;
  return paintedRows(laid.parts, metrics);
}

/** Client rects of the focus, one block at a time. The gate uses this directly. */
export function paintFocusRows(
  text: string,
  start: number,
  end: number,
  metrics: DisplayMetrics,
  kind: DisplayKind = "prose",
): number {
  if (!(end > start) || !text || typeof document === "undefined") return 0;
  const laid = laidFocus(text, start, end, metrics, kind);
  if (laid.parts.length === 0) return 0;
  return paintedRows(laid.parts, metrics);
}

function laidFocus(text: string, start: number, end: number, metrics: DisplayMetrics, kind: DisplayKind) {
  const blocks = resolveDisplayBlocks(text, metrics, kind);
  const marked = markSpotlight(text, blocks, { start, end }, kind);
  let safe = 0;
  let ahead = false;
  const parts: { text: string; focus: boolean }[][] = [];
  for (const pieces of marked) {
    const focusText = pieces
      .filter((piece) => piece.role === "focus")
      .map((piece) => piece.text)
      .join("");
    if (!focusText.trim()) continue;
    if (pieces.some((piece) => piece.role === "ahead")) ahead = true;
    const past = pieces.some((piece) => piece.role === "past");
    const boxes = lineBoxes(focusText, metrics);
    safe += past ? boxes + 2 : boxes;
    parts.push(pieces.map((piece) => ({ text: piece.text, focus: piece.role === "focus" })));
  }
  return { safe, parts, ahead };
}

function paintedRows(parts: { text: string; focus: boolean }[][], metrics: DisplayMetrics) {
  let rows = 0;
  for (const pieces of parts) rows += measureFocusRows(pieces, metrics);
  return Math.max(rows, 1);
}

/** A one-word section card has no second line of its own. */
export const SHORT_WINDOW_MARK = "· · ·";

export type ShortWindowLift = {
  rows: number;
  /** Scene title drawn above the body. The title belongs to this scene. */
  lead: string | null;
  /** Body set on two lines when it cannot take a title. */
  lines: readonly [string, string] | null;
};

function splitTwoLines(text: string): [string, string] | null {
  const breaks: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (!/\s/u.test(text[i] ?? "")) continue;
    let j = i;
    while (j < text.length && /\s/u.test(text[j] ?? "")) j += 1;
    const left = text.slice(0, i).trim();
    const right = text.slice(j).trim();
    if (left && right) breaks.push(j);
    i = j - 1;
  }
  if (breaks.length === 0) return null;
  const target = text.length / 2;
  let best = breaks[0]!;
  let bestDist = Math.abs(best - target);
  for (const at of breaks) {
    const dist = Math.abs(at - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = at;
    }
  }
  const left = text.slice(0, best).trim();
  const right = text.slice(best).trim();
  if (!left || !right) return null;
  return [left, right];
}

/**
 * A window the packer could not fold without leaving its scene.
 * The scene title is the line that belongs above an opening window, when
 * it is a different line and the two together stay inside four rows.
 * Anything still on one row is set on two lines. A single word takes the
 * section mark under it. Sit stops stay where they are: the line after a
 * stop is set on two lines rather than pulled back across the stop.
 */
export function liftShortWindow(input: {
  rows: number;
  title: string;
  body: string;
  opening: boolean;
  titleRows?: (title: string) => number;
}): ShortWindowLift {
  if (!(input.rows > 0) || input.rows >= SPOTLIGHT_MIN_LINES) {
    return { rows: input.rows, lead: null, lines: null };
  }
  // A printed break (`* * *`) is one row and has no clause to fold.
  // Splitting it on spaces hands `*` and `* *` to italics, which drop the
  // marks and leave a focus with no height. Keep the ornament whole.
  const ornament = input.body.trim();
  if (isSectionBreak(ornament)) {
    return { rows: SPOTLIGHT_MIN_LINES, lead: null, lines: [ornament, SHORT_WINDOW_MARK] };
  }
  const title = input.title.trim();
  const titleFlat = title.replace(/\s+/g, " ").trim();
  const bodyFlat = input.body.replace(/\s+/g, " ").trim();
  if (input.opening && titleFlat && titleFlat !== bodyFlat) {
    const titleRows = input.titleRows?.(title) ?? 1;
    const sum = titleRows + input.rows;
    if (titleRows >= 1 && sum >= SPOTLIGHT_MIN_LINES && sum <= SPOTLIGHT_MAX_LINES) {
      return { rows: sum, lead: title, lines: null };
    }
  }
  const pair = splitTwoLines(input.body);
  if (pair) return { rows: SPOTLIGHT_MIN_LINES, lead: null, lines: pair };
  const word = bodyFlat || input.body.trim();
  if (!word) return { rows: input.rows, lead: null, lines: null };
  return { rows: SPOTLIGHT_MIN_LINES, lead: null, lines: [word, SHORT_WINDOW_MARK] };
}

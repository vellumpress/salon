import { isSectionBreak, splitEmphasis } from "./emphasized-text.ts";
import { quoteIntervals, sentenceSpans, type SentenceSpan } from "./sentences.ts";

/** A displayed block may be this fraction of the viewport, and no taller. */
export const VIEWPORT_BLOCK_FRACTION = 1 / 3;

/** Phone column used before the live face has been measured. */
export const PHONE_VIEWPORT = 844;
export const PHONE_CHARS_PER_LINE = 29.5;
export const PHONE_LINE_PX = 29;

export function phoneBlockLimit(viewport = PHONE_VIEWPORT) {
  return Math.floor(viewport * VIEWPORT_BLOCK_FRACTION);
}

/** Character estimate of a block on a phone, in pixels. */
export function phoneLineMeasure(text: string) {
  const chars = text.replace(/\s+/g, " ").trim().length || 1;
  return Math.ceil(chars / PHONE_CHARS_PER_LINE) * PHONE_LINE_PX;
}

export type DisplayBlock = {
  text: string;
  sentences: number;
};

/** Verse stays one block. A play repeats the speaker on every piece of a speech. */
export type DisplayKind = "prose" | "verse" | "speech";

const NOT_A_SPEAKER = new Set(["Note", "Notes", "Footnote", "N.B", "N.B.", "P.S", "P.S."]);

/** House form: "Character: dialogue", the same label the plays are bound with. */
const SPEAKER_LABEL = /^([A-Z][\w’'.-]*(?: [A-Z][\w’'.-]*){0,3}): \S/;

export function displayKindForForm(form: string | undefined | null): DisplayKind {
  if (form === "poem") return "verse";
  if (form === "play") return "speech";
  return "prose";
}

function speakerPrefix(text: string): string | null {
  const label = SPEAKER_LABEL.exec(text)?.[1] ?? null;
  if (!label || NOT_A_SPEAKER.has(label)) return null;
  return label;
}

function showBlock(raw: string, speaker: string | null, first: boolean) {
  if (first || !speaker) return raw;
  return `${speaker}: ${raw.replace(/^\s+/, "")}`;
}

export type DisplayMetrics = {
  width: number;
  viewport: number;
  limit: number;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  /** False while the reading face is still loading. The CSS family string does not change when it arrives. */
  faceReady: boolean;
};

type PackUnit = { start: number; end: number; sentences: number };

/**
 * A quotation is one unit when the quotation itself fits in the third and
 * the block that would hold it still measures within the third. The sentence
 * that opens it comes along only when that combined block still fits.
 * A nested quote that fits stays whole even when the outer quote does not.
 * A quotation past the third is left in sentences so the packer can break
 * at those ends. A later speech repeats the speaker, so that label counts.
 */
function unitsForPack(
  text: string,
  spans: SentenceSpan[],
  measure: (sample: string) => number,
  limitPx: number,
  speaker: string | null,
): PackUnit[] {
  const fits = (sample: string) => {
    if (measure(sample) > limitPx) return false;
    if (!speaker) return true;
    return measure(showBlock(sample, speaker, false)) <= limitPx;
  };
  const fitting = quoteIntervals(text).filter((range) => fits(text.slice(range.start, range.end)));
  const held = fitting.filter(
    (range) =>
      !fitting.some(
        (other) =>
          other !== range &&
          other.start <= range.start &&
          other.end >= range.end &&
          (other.start < range.start || other.end > range.end),
      ),
  );
  const units: PackUnit[] = [];
  let i = 0;
  while (i < spans.length) {
    let j = i;
    let end = spans[i]!.end;
    let grew = true;
    while (grew) {
      grew = false;
      for (const range of held) {
        if (!(range.start < end && range.end > spans[i]!.start && range.end > end)) continue;
        let k = j;
        while (k + 1 < spans.length && spans[k]!.end < range.end) k += 1;
        const candidateEnd = spans[k]!.end;
        if (candidateEnd <= end) continue;
        const opener = text[range.start];
        // shoot '450 is a digit after an apostrophe, not a quotation.
        if (opener === "'" && /\d/.test(text[range.start + 1] ?? "")) {
          if (!fits(text.slice(spans[i]!.start, candidateEnd))) continue;
        }
        // Size the block that will paint. A single tap may still pass the
        // third, because it cannot be split. A taller quotation can.
        const candidate = text.slice(spans[i]!.start, candidateEnd);
        if (!fits(candidate)) {
          const tapsInside = tapSpans(text).filter(
            (span) => span.start >= spans[i]!.start && span.start < candidateEnd,
          ).length;
          if (tapsInside > 1) continue;
        }
        end = candidateEnd;
        j = k;
        grew = true;
      }
    }
    units.push({ start: spans[i]!.start, end, sentences: j - i + 1 });
    i = j + 1;
  }
  return units;
}

type UnitRange = { from: number; to: number };

/** A last block shorter than a third of the limit is a stub. Fold it upward. */
function foldShortTail(
  text: string,
  units: PackUnit[],
  ranges: UnitRange[],
  measure: (sample: string) => number,
  limitPx: number,
  speaker: string | null,
) {
  const tailMin = limitPx / 3;
  const height = (range: UnitRange, first: boolean) =>
    measure(showBlock(text.slice(units[range.from]!.start, units[range.to - 1]!.end), speaker, first));
  const absorb = () => {
    const last = ranges[ranges.length - 1]!;
    const prev = ranges[ranges.length - 2]!;
    prev.to = last.to;
    ranges.pop();
  };
  while (ranges.length >= 2) {
    const last = ranges[ranges.length - 1]!;
    const prev = ranges[ranges.length - 2]!;
    if (height(last, false) >= tailMin) break;
    // Fold into the block above when the two still fit.
    if (height({ from: prev.from, to: last.to }, prev.from === 0) <= limitPx) {
      absorb();
      continue;
    }
    break;
  }
  if (ranges.length < 2) return;
  const last = ranges[ranges.length - 1]!;
  const prev = ranges[ranges.length - 2]!;
  if (height(last, false) >= tailMin) return;
  // Merging would pass the third. Split the last two blocks at the sentence
  // boundary that makes them most even, and keep both within the third.
  // A glued quotation opens back into its sentences so a stub can borrow one.
  const taps = tapSpans(text);
  const pieces: PackUnit[] = [];
  for (let u = prev.from; u < last.to; u += 1) {
    const unit = units[u]!;
    const covered = taps.filter((span) => span.start >= unit.start && span.start < unit.end);
    if (covered.length <= 1) {
      pieces.push(unit);
      continue;
    }
    for (let n = 0; n < covered.length; n += 1) {
      const start = n === 0 ? unit.start : covered[n]!.start;
      const end = n + 1 < covered.length ? covered[n + 1]!.start : unit.end;
      pieces.push({ start, end, sentences: 1 });
    }
  }
  if (pieces.length < 2) return;
  const pieceHeight = (from: number, to: number, first: boolean) =>
    measure(showBlock(text.slice(pieces[from]!.start, pieces[to - 1]!.end), speaker, first));
  let best = -1;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestRight = -1;
  for (let cut = 1; cut < pieces.length; cut += 1) {
    const leftH = pieceHeight(0, cut, prev.from === 0);
    const rightH = pieceHeight(cut, pieces.length, false);
    if (leftH > limitPx || rightH > limitPx || rightH < tailMin) continue;
    const diff = Math.abs(leftH - rightH);
    if (diff < bestDiff || (diff === bestDiff && rightH > bestRight)) {
      bestDiff = diff;
      best = cut;
      bestRight = rightH;
    }
  }
  if (best < 0) return;
  const before = units.slice(0, prev.from);
  const after = units.slice(last.to);
  units.splice(0, units.length, ...before, ...pieces, ...after);
  prev.to = prev.from + best;
  last.from = prev.to;
  last.to = prev.from + pieces.length;
}

/**
 * Group sentence slices so each block measures within `limitPx`.
 * A sentence that is taller on its own stays whole. A quotation stays whole
 * when the quotation itself fits in the third, including one nested inside
 * a taller quote. The sentence that opens or closes it comes along only
 * when the block that holds both still measures within the third.
 * A quotation past the third breaks at sentence ends inside it. Sentences
 * then pack greedily up to the limit. A tail shorter than a third of the
 * limit folds into the block above only when the merged block still fits
 * in the third. When that merge would pass the third, the last two blocks
 * are split again so their heights are as even as possible and both stay
 * within the third. A single sentence that cannot move stays where it is.
 * Abbreviations are not breaks. Verse is one block even when it holds many
 * sentences. Prose slices joined together are the original string. A play
 * speech repeats "Speaker:" on every block after the first; the slices
 * underneath still join back to the original.
 * A block's sentence count is the sentences a tap can land on. A quotation
 * that fits is one sentence. A quotation past the third counts each
 * sentence inside it, so a split block does not report zero.
 */
function tapCount(text: string) {
  const count = tapSpans(text).length;
  return count > 0 ? count : 1;
}

/**
 * Sentences a tap can land on.
 * A quotation that fits in the third stays one sentence, interior stops
 * included. A quotation past the third contributes each sentence inside it.
 */
export function tapSpans(text: string): SentenceSpan[] {
  const closed = sentenceSpans(text);
  if (!text) return closed;
  const limit = phoneBlockLimit();
  const tall = quoteIntervals(text).filter(
    (range) => phoneLineMeasure(text.slice(range.start, range.end)) > limit,
  );
  if (tall.length === 0) return closed;
  const inner = sentenceSpans(text, "in-quotes");
  const spans: SentenceSpan[] = [];
  for (const span of closed) {
    const overlapsTall = tall.some((range) => range.start < span.end && range.end > span.start);
    if (!overlapsTall) {
      spans.push(span);
      continue;
    }
    const pieces = inner.filter((item) => item.start >= span.start && item.start < span.end);
    if (pieces.length <= 1) spans.push(span);
    else spans.push(...pieces);
  }
  return spans.length > 0 ? spans : closed;
}

/**
 * How many tappable sentences begin in each slice.
 * The slices are the original characters, before a play repeats its speaker.
 */
function tapSentenceCounts(text: string, parts: string[]): number[] {
  const taps = tapSpans(text);
  let offset = 0;
  const ranges = parts.map((part) => {
    const start = offset;
    offset += part.length;
    return { start, end: start + part.length };
  });
  const counts = ranges.map(() => 0);
  for (const span of taps) {
    let index = ranges.findIndex((range) => span.start >= range.start && span.start < range.end);
    if (index < 0) index = Math.max(0, ranges.length - 1);
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}

export function packDisplayBlocks(
  text: string,
  measure: (sample: string) => number,
  limitPx: number,
  kind: DisplayKind = "prose",
): DisplayBlock[] {
  if (!text) return [{ text, sentences: 1 }];
  if (kind === "verse") return [{ text, sentences: 1 }];
  const speaker = kind === "speech" ? speakerPrefix(text) : null;
  const spans = sentenceSpans(text, "in-quotes");
  if (spans.length <= 1 || !(limitPx > 0)) {
    return [{ text, sentences: tapCount(text) }];
  }
  const units = unitsForPack(text, spans, measure, limitPx, speaker);
  if (units.length <= 1) {
    return [{ text, sentences: tapCount(text) }];
  }
  const ranges: UnitRange[] = [];
  let from = 0;
  while (from < units.length) {
    let lo = from;
    let hi = units.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const sample = showBlock(text.slice(units[from]!.start, units[mid]!.end), speaker, from === 0);
      if (measure(sample) <= limitPx) lo = mid;
      else hi = mid - 1;
    }
    ranges.push({ from, to: lo + 1 });
    from = lo + 1;
  }
  foldShortTail(text, units, ranges, measure, limitPx, speaker);
  const raws: string[] = [];
  for (const range of ranges) {
    raws.push(text.slice(units[range.from]!.start, units[range.to - 1]!.end));
  }
  if (raws.join("") !== text) {
    return [{ text, sentences: tapCount(text) }];
  }
  const counts = tapSentenceCounts(text, raws);
  return raws.map((raw, index) => ({
    text: showBlock(raw, speaker, index === 0),
    sentences: counts[index] ?? 0,
  }));
}

/**
 * Before the column has a real height, pack with the phone estimate.
 * One block per sentence is what flashes and then jumps once the face is measured.
 */
export function unmeasuredBlocks(text: string, kind: DisplayKind = "prose"): DisplayBlock[] {
  return packDisplayBlocks(text, phoneLineMeasure, phoneBlockLimit(), kind);
}

let probe: HTMLParagraphElement | null = null;

function probeEl(): HTMLParagraphElement {
  if (probe?.isConnected) return probe;
  const el = document.createElement("p");
  el.setAttribute("aria-hidden", "true");
  el.dataset.displayProbe = "1";
  el.style.position = "absolute";
  el.style.left = "-10000px";
  el.style.top = "0";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  el.style.margin = "0";
  el.style.padding = "0";
  el.style.border = "0";
  el.style.boxSizing = "border-box";
  el.style.whiteSpace = "normal";
  el.style.overflowWrap = "break-word";
  el.style.wordBreak = "normal";
  el.style.hyphens = "manual";
  el.style.minWidth = "0";
  document.body.appendChild(el);
  probe = el;
  return el;
}

function fillProbe(text: string) {
  const el = probeEl();
  el.replaceChildren();
  if (isSectionBreak(text)) {
    el.textContent = "· · ·";
    return el;
  }
  for (const part of splitEmphasis(text)) {
    if (part.type === "em") {
      const em = document.createElement("em");
      em.textContent = part.value;
      el.append(em);
    } else {
      el.append(part.value);
    }
  }
  return el;
}

/** Height of one block in the reader's type, at the column width. */
export function measureStyledHeight(text: string, metrics: DisplayMetrics): number {
  const el = fillProbe(text);
  el.style.width = `${metrics.width}px`;
  el.style.fontFamily = metrics.fontFamily;
  el.style.fontSize = metrics.fontSize;
  el.style.fontWeight = metrics.fontWeight;
  el.style.fontStyle = metrics.fontStyle;
  el.style.lineHeight = metrics.lineHeight;
  el.style.letterSpacing = metrics.letterSpacing;
  return el.getBoundingClientRect().height;
}

const cache = new Map<string, DisplayBlock[]>();
const calibration = new Map<string, { line: number; chars: number }>();

function styleKey(metrics: DisplayMetrics) {
  return [
    metrics.width,
    metrics.fontSize,
    metrics.fontWeight,
    metrics.fontStyle,
    metrics.lineHeight,
    metrics.letterSpacing,
    metrics.fontFamily,
    metrics.faceReady ? 1 : 0,
  ].join("|");
}

/**
 * Before the reading face has loaded, one measured sample per column, then
 * a character estimate. Once Cormorant is ready, each candidate is measured
 * in that face: the estimate wraps wider than the real column and both cuts
 * quotations that fit and packs blocks past the third.
 */
function calibrate(metrics: DisplayMetrics) {
  const key = styleKey(metrics);
  const hit = calibration.get(key);
  if (hit) return hit;
  const fontPx = Number.parseFloat(metrics.fontSize);
  const measured = measureStyledHeight("ABCDEFGHIJKLMNOPQRSTUVWXYZ", metrics);
  // A face that has not painted yet reports a collapsed line. Do not cache that:
  // it treats hundreds of characters as one line and the paragraph stays whole.
  if (!(measured > 0) || (fontPx > 0 && measured < fontPx * 0.45)) {
    return { line: Math.max(16, fontPx > 0 ? fontPx * 1.45 : 24), chars: 22 };
  }
  const line = measured;
  const sample = "n".repeat(480);
  const block = Math.max(line, measureStyledHeight(sample, metrics));
  const lines = Math.max(1, Math.round(block / line));
  const chars = Math.max(8, (sample.length / lines) * 0.82);
  const value = { line, chars };
  calibration.set(key, value);
  return value;
}

export function resolveDisplayBlocks(
  text: string,
  metrics: DisplayMetrics,
  kind: DisplayKind = "prose",
): DisplayBlock[] {
  const key = `${styleKey(metrics)}|${metrics.limit}|${kind}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const blocks = packDisplayBlocks(
    text,
    metrics.faceReady
      ? (sample) => measureStyledHeight(sample, metrics)
      : (sample) => {
          const fit = calibrate(metrics);
          const chars = sample.replace(/\s+/g, " ").trim().length || 1;
          return Math.ceil(chars / fit.chars) * fit.line;
        },
    metrics.limit,
    kind,
  );
  cache.set(key, blocks);
  if (cache.size > 80) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return blocks;
}

export function metricsEqual(a: DisplayMetrics | null, b: DisplayMetrics): boolean {
  if (!a) return false;
  return (
    a.width === b.width &&
    a.viewport === b.viewport &&
    a.limit === b.limit &&
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.lineHeight === b.lineHeight &&
    a.letterSpacing === b.letterSpacing &&
    a.faceReady === b.faceReady
  );
}

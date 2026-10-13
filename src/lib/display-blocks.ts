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
 * A quotation is one unit when the quotation itself fits in the third.
 * The sentence that opens it comes along, because a sentence cannot break.
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
        const curly = opener === "\u201C" || opener === "\u2018";
        // A curly quotation that fits stays whole even when the sentence
        // around it runs past the third. A straight mark is often an
        // apostrophe; glue those sentences only when the result still fits.
        if (!curly && !fits(text.slice(spans[i]!.start, candidateEnd))) continue;
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
  while (ranges.length >= 2) {
    const last = ranges[ranges.length - 1]!;
    const prev = ranges[ranges.length - 2]!;
    if (height(last, false) >= tailMin) break;
    if (height({ from: prev.from, to: last.to }, prev.from === 0) <= limitPx) {
      prev.to = last.to;
      ranges.pop();
      continue;
    }
    if (prev.to - prev.from < 2) break;
    let moved = false;
    while (prev.to - prev.from >= 2 && height(last, false) < tailMin) {
      const taken = { from: prev.to - 1, to: last.to };
      if (height(taken, false) > limitPx) break;
      prev.to -= 1;
      last.from = prev.to;
      moved = true;
    }
    if (!moved) break;
  }
}

/**
 * Group sentence slices so each block measures within `limitPx`.
 * A sentence that is taller on its own stays whole. A quotation stays whole
 * when the quotation itself fits in the third, including one nested inside
 * a taller quote. A quotation past the third breaks at sentence ends inside
 * it. Sentences then pack greedily up to the limit. A tail shorter than a
 * third of the limit folds into the block above when that still fits, and
 * otherwise the boundary moves back until the tail is tall enough.
 * Abbreviations are not breaks. Verse is one block even when it holds many
 * sentences. Prose slices joined together are the original string. A play
 * speech repeats "Speaker:" on every block after the first; the slices
 * underneath still join back to the original.
 */
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
    return [{ text, sentences: 1 }];
  }
  const units = unitsForPack(text, spans, measure, limitPx, speaker);
  if (units.length <= 1) {
    return [{ text, sentences: Math.max(1, units[0]?.sentences ?? spans.length) }];
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
  const counts: number[] = [];
  for (const range of ranges) {
    let sentences = 0;
    for (let u = range.from; u < range.to; u += 1) sentences += units[u]!.sentences;
    raws.push(text.slice(units[range.from]!.start, units[range.to - 1]!.end));
    counts.push(Math.max(1, sentences));
  }
  if (raws.join("") !== text) {
    return [{ text, sentences: Math.max(1, spans.length) }];
  }
  return raws.map((raw, index) => ({
    text: showBlock(raw, speaker, index === 0),
    sentences: counts[index] ?? 1,
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

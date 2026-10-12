import { isSectionBreak, splitEmphasis } from "./emphasized-text.ts";
import { sentenceSpans } from "./sentences.ts";

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

/**
 * Group sentence slices so each block measures within `limitPx`.
 * A sentence that is taller on its own stays whole. A quotation stays
 * whole too, even when that one block is taller than the third: a cut
 * inside it would take the words out of the speech. Verse is one block
 * even when it holds many sentences. Prose slices joined together are
 * the original string. A play speech repeats "Speaker:" on every block
 * after the first; the slices underneath still join back to the original.
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
  const spans = sentenceSpans(text);
  if (spans.length <= 1 || !(limitPx > 0)) {
    return [{ text, sentences: 1 }];
  }
  const raws: string[] = [];
  const counts: number[] = [];
  let from = 0;
  while (from < spans.length) {
    let lo = from;
    let hi = spans.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const sample = showBlock(rawSlice(text, spans, from, mid + 1), speaker, from === 0);
      if (measure(sample) <= limitPx) lo = mid;
      else hi = mid - 1;
    }
    const next = lo + 1;
    raws.push(rawSlice(text, spans, from, next));
    counts.push(next - from);
    from = next;
  }
  if (raws.join("") !== text) {
    return [{ text, sentences: Math.max(1, spans.length) }];
  }
  return raws.map((raw, index) => ({
    text: showBlock(raw, speaker, index === 0),
    sentences: counts[index] ?? 1,
  }));
}

function rawSlice(
  text: string,
  spans: { start: number; end: number }[],
  from: number,
  next: number,
) {
  const sliceEnd = next < spans.length ? spans[next]!.start : text.length;
  return text.slice(spans[from]!.start, sliceEnd);
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
 * One measured sample per column, then a character estimate.
 * The estimate wraps a little early so a block stays inside the third;
 * the reader tightens again if a real line still overflows.
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
  const fit = calibrate(metrics);
  const blocks = packDisplayBlocks(text, (sample) => {
    const chars = sample.replace(/\s+/g, " ").trim().length || 1;
    return Math.ceil(chars / fit.chars) * fit.line;
  }, metrics.limit, kind);
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

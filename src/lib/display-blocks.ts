import { isSectionBreak, splitEmphasis } from "./emphasized-text.ts";
import { sentenceSpans } from "./sentences.ts";

/** A displayed block may be this fraction of the viewport, and no taller. */
export const VIEWPORT_BLOCK_FRACTION = 1 / 3;

export type DisplayBlock = {
  text: string;
  sentences: number;
};

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
};

/**
 * Group sentence slices so each block measures within `limitPx`.
 * A sentence that is taller on its own stays whole.
 * The blocks' text joined together is the original string.
 */
export function packDisplayBlocks(
  text: string,
  measure: (sample: string) => number,
  limitPx: number,
): DisplayBlock[] {
  if (!text) return [{ text, sentences: 1 }];
  const spans = sentenceSpans(text);
  if (spans.length <= 1 || !(limitPx > 0)) {
    return [{ text, sentences: Math.max(1, spans.length) }];
  }
  const blocks: DisplayBlock[] = [];
  let from = 0;
  while (from < spans.length) {
    let lo = from;
    let hi = spans.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      const sample = text.slice(spans[from]!.start, spans[mid]!.end);
      if (measure(sample) <= limitPx) lo = mid;
      else hi = mid - 1;
    }
    const next = lo + 1;
    const sliceEnd = next < spans.length ? spans[next]!.start : text.length;
    blocks.push({
      text: text.slice(spans[from]!.start, sliceEnd),
      sentences: next - from,
    });
    from = next;
  }
  if (blocks.map((block) => block.text).join("") !== text) {
    return [{ text, sentences: spans.length }];
  }
  return blocks;
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
  const line = Math.max(1, measureStyledHeight("ABCDEFGHIJKLMNOPQRSTUVWXYZ", metrics));
  const sample = "n".repeat(480);
  const block = Math.max(line, measureStyledHeight(sample, metrics));
  const lines = Math.max(1, Math.round(block / line));
  const chars = Math.max(8, (sample.length / lines) * 0.82);
  const value = { line, chars };
  calibration.set(key, value);
  return value;
}

export function resolveDisplayBlocks(text: string, metrics: DisplayMetrics): DisplayBlock[] {
  const key = `${styleKey(metrics)}|${metrics.limit}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const fit = calibrate(metrics);
  const blocks = packDisplayBlocks(text, (sample) => {
    const chars = sample.replace(/\s+/g, " ").trim().length || 1;
    return Math.ceil(chars / fit.chars) * fit.line;
  }, metrics.limit);
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
    a.letterSpacing === b.letterSpacing
  );
}

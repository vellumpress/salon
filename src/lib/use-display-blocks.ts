import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  metricsEqual,
  resolveDisplayBlocks,
  VIEWPORT_BLOCK_FRACTION,
  type DisplayBlock,
  type DisplayMetrics,
} from "./display-blocks.ts";
import { sentenceSpans } from "./sentences.ts";

function viewportHeight() {
  const visual = window.visualViewport?.height;
  if (visual && visual > 32) return Math.round(visual);
  return Math.round(window.innerHeight);
}

function readMetrics(node: HTMLElement, tighten: number): DisplayMetrics | null {
  const sample = node.querySelector<HTMLElement>(".breath-block") ?? node;
  const width = Math.round(sample.clientWidth);
  const viewport = viewportHeight();
  if (width < 8 || viewport < 32) return null;
  const style = getComputedStyle(sample);
  const limit = Math.max(48, Math.floor(viewport * VIEWPORT_BLOCK_FRACTION) - tighten);
  return {
    width,
    viewport,
    limit,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  };
}

function fallbackBlock(text: string): DisplayBlock[] {
  const spans = sentenceSpans(text);
  return [{ text, sentences: Math.max(1, spans.length) }];
}

/**
 * Split the breaths on screen into blocks that fit in a third of the
 * viewport. Measurement uses the live column width and the face already
 * on the line, and it runs again when the phone rotates.
 */
export function useDisplayBlocks(
  sourceRef: RefObject<HTMLElement | null>,
  texts: readonly string[],
  layoutKey: string,
) {
  const [metrics, setMetrics] = useState<DisplayMetrics | null>(null);
  const [settled, setSettled] = useState("");
  const [tick, setTick] = useState(0);
  const tightenRef = useRef(0);
  const viewportSeen = useRef(0);

  useLayoutEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener("resize", bump);
    window.visualViewport?.addEventListener("resize", bump);
    document.fonts?.addEventListener("loadingdone", bump);
    void document.fonts?.ready.then(bump);
    return () => {
      window.removeEventListener("resize", bump);
      window.visualViewport?.removeEventListener("resize", bump);
      document.fonts?.removeEventListener("loadingdone", bump);
    };
  }, []);

  useLayoutEffect(() => {
    const node = sourceRef.current;
    if (!node) return;
    const viewport = viewportHeight();
    if (viewportSeen.current !== viewport) {
      viewportSeen.current = viewport;
      tightenRef.current = 0;
    }
    const next = readMetrics(node, tightenRef.current);
    if (!next) return;
    setMetrics((prev) => (metricsEqual(prev, next) ? prev : next));
  }, [sourceRef, tick, texts, layoutKey]);

  const packed = useMemo(() => {
    const map = new Map<string, DisplayBlock[]>();
    if (!metrics) return map;
    for (const text of texts) {
      if (map.has(text)) continue;
      map.set(text, resolveDisplayBlocks(text, metrics));
    }
    return map;
  }, [metrics, texts]);

  useLayoutEffect(() => {
    if (!metrics) return;
    const root = sourceRef.current?.closest<HTMLElement>("[data-breath-index]");
    if (!root) return;
    const cap = metrics.viewport * VIEWPORT_BLOCK_FRACTION;
    let overflow = 0;
    for (const node of root.querySelectorAll<HTMLElement>("[data-block-sentences]")) {
      const count = Number(node.getAttribute("data-block-sentences"));
      if (!(count > 1)) continue;
      if (node.getClientRects().length === 0) continue;
      const height = node.offsetHeight;
      if (height > cap + 0.5) overflow = Math.max(overflow, height - cap);
    }
    const key = `${metrics.viewport}|${metrics.width}|${metrics.limit}|${metrics.fontSize}|${metrics.lineHeight}`;
    if (overflow > 0.5 && tightenRef.current < cap * 0.5) {
      tightenRef.current = Math.min(
        Math.floor(cap * 0.5),
        tightenRef.current + Math.ceil(overflow),
      );
      const next = readMetrics(sourceRef.current!, tightenRef.current);
      if (next && !metricsEqual(metrics, next)) {
        setSettled("");
        setMetrics(next);
        return;
      }
    }
    setSettled(key);
  }, [metrics, packed, sourceRef]);

  const readyKey = metrics
    ? `${metrics.viewport}|${metrics.width}|${metrics.limit}|${metrics.fontSize}|${metrics.lineHeight}`
    : "";

  return {
    blocksFor(text: string): DisplayBlock[] {
      return packed.get(text) ?? fallbackBlock(text);
    },
    ready: readyKey !== "" && readyKey === settled,
    viewport: metrics?.viewport ?? 0,
  };
}

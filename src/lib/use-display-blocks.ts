import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  metricsEqual,
  resolveDisplayBlocks,
  unmeasuredBlocks,
  VIEWPORT_BLOCK_FRACTION,
  type DisplayBlock,
  type DisplayKind,
  type DisplayMetrics,
} from "./display-blocks.ts";

function viewportHeight() {
  const visual = window.visualViewport?.height;
  if (visual && visual > 32) return Math.round(visual);
  return Math.round(window.innerHeight);
}

function faceSettled(style: CSSStyleDeclaration): boolean {
  const fonts = document.fonts;
  if (!fonts) return true;
  try {
    const spec = `${style.fontWeight || "400"} ${style.fontSize || "16px"} ${style.fontFamily || "serif"}`;
    if (fonts.check(spec)) return true;
  } catch {
    /* the family string can be a list the checker rejects */
  }
  return fonts.status === "loaded";
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
    faceReady: faceSettled(style),
  };
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
  kind: DisplayKind = "prose",
) {
  const [metrics, setMetrics] = useState<DisplayMetrics | null>(null);
  const [settled, setSettled] = useState("");
  const [tick, setTick] = useState(0);
  const tightenRef = useRef(0);
  const viewportSeen = useRef(0);
  const blindSince = useRef(0);

  useLayoutEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener("resize", bump);
    window.visualViewport?.addEventListener("resize", bump);
    document.fonts?.addEventListener("loadingdone", bump);
    void document.fonts?.ready.then(bump);
    // A home-screen launch can grow the layout after the first paint without a
    // window resize. The document element does fire when that height arrives.
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(bump) : null;
    observer?.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", bump);
      window.visualViewport?.removeEventListener("resize", bump);
      document.fonts?.removeEventListener("loadingdone", bump);
      observer?.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const node = sourceRef.current;
    const retry = () => {
      const now = Date.now();
      if (blindSince.current === 0) blindSince.current = now;
      if (now - blindSince.current > 8000) return;
      const id = window.setTimeout(() => setTick((n) => n + 1), 100);
      return () => window.clearTimeout(id);
    };
    if (!node) return retry();
    const viewport = viewportHeight();
    if (viewportSeen.current !== viewport) {
      viewportSeen.current = viewport;
      tightenRef.current = 0;
    }
    const next = readMetrics(node, tightenRef.current);
    if (!next) {
      // Standalone can report a 0 viewport on the first frames and then the
      // real height, with no resize event. Keep looking for a few seconds.
      return retry();
    }
    blindSince.current = 0;
    setMetrics((prev) => (metricsEqual(prev, next) ? prev : next));
  }, [sourceRef, tick, texts, layoutKey]);

  const packed = useMemo(() => {
    const map = new Map<string, DisplayBlock[]>();
    if (!metrics) return map;
    for (const text of texts) {
      if (map.has(text)) continue;
      map.set(text, resolveDisplayBlocks(text, metrics, kind));
    }
    return map;
  }, [metrics, texts, kind]);

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
      return packed.get(text) ?? unmeasuredBlocks(text, kind);
    },
    ready: readyKey !== "" && readyKey === settled,
    viewport: metrics?.viewport ?? 0,
  };
}

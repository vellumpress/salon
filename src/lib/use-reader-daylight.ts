import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import {
  DAYLIGHT_COLORS_KEY,
  daylightAt,
  readDaylightEnabled,
  writeDaylightEnabled,
  type DaylightSample,
} from "./daylight-colors.ts";
import {
  PAGE_PAPER,
  applyStatusBarColorToDocument,
  readChromeBackground,
} from "./status-bar-color.ts";

/** Cold open matches the server (noon, not yet live). */
const SERVER_SAMPLE_AT = new Date(2026, 0, 1, 12, 0, 0);

/**
 * Client-only clock already read by a gate frame (device-import loading).
 * The reader that replaces that frame paints the same color on its first
 * commit, so the status bar does not fall back to paper. Never read this
 * during SSR — a warm server would leak another request's clock into HTML.
 */
type RememberedDaylight = {
  enabled: boolean;
  sample: DaylightSample;
};

let remembered: RememberedDaylight | null = null;

function rememberedNow(): RememberedDaylight | null {
  if (typeof window === "undefined") return null;
  return remembered;
}

function remember(enabled: boolean, sample: DaylightSample) {
  remembered = { enabled, sample };
}

export type ReaderDaylight = {
  /** Persisted preference. Default on, including before storage is read. */
  enabled: boolean;
  /** Live page colors. False until mount, and whenever the toggle is off. */
  active: boolean;
  sample: DaylightSample;
  setEnabled: (on: boolean) => void;
  className: string | undefined;
  style: CSSProperties | undefined;
};

/**
 * Local-time reader colors. The first paint matches the server (paper).
 * After mount, the clock is read and then checked on each minute boundary.
 */
export function useReaderDaylight(): ReaderDaylight {
  const [enabled, setEnabledState] = useState(() => rememberedNow()?.enabled ?? true);
  const [live, setLive] = useState(() => rememberedNow() != null);
  const [motion, setMotion] = useState(false);
  const [sample, setSample] = useState<DaylightSample>(
    () => rememberedNow()?.sample ?? daylightAt(SERVER_SAMPLE_AT),
  );

  useEffect(() => {
    const on = readDaylightEnabled();
    setEnabledState(on);
    const sync = () => {
      const next = daylightAt(new Date());
      remember(readDaylightEnabled(), next);
      setSample(next);
    };
    sync();
    setLive(true);
    let interval = 0;
    const wait = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => {
      sync();
      interval = window.setInterval(sync, 60_000);
    }, wait);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DAYLIGHT_COLORS_KEY) return;
      const next = readDaylightEnabled();
      if (remembered) remembered = { ...remembered, enabled: next };
      setEnabledState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!live || !enabled) {
      setMotion(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMotion(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setMotion(true));
    return () => window.cancelAnimationFrame(id);
  }, [live, enabled]);

  function setEnabled(on: boolean) {
    writeDaylightEnabled(on);
    if (remembered) remembered = { ...remembered, enabled: on };
    setEnabledState(on);
  }

  const active = live && enabled;

  useLayoutEffect(() => {
    const root = document.documentElement;
    // Before the clock is read, leave whatever StatusBarSync sampled. Forcing
    // paper here is what left a paper status bar after a device import mounted.
    if (!live) return;
    if (!enabled) {
      root.removeAttribute("data-status-motion");
      applyStatusBarColorToDocument(PAGE_PAPER);
      return;
    }
    if (motion) root.setAttribute("data-status-motion", "1");
    else root.removeAttribute("data-status-motion");
    applyStatusBarColorToDocument(sample.background);
  }, [live, enabled, motion, sample.background]);

  useLayoutEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-status-motion");
    };
  }, []);

  const style: CSSProperties | undefined = active
    ? {
        backgroundColor: sample.background,
        color: sample.ink,
        ["--reader-bg" as string]: sample.background,
        ["--reader-ink" as string]: sample.ink,
        ["--reader-muted" as string]: sample.muted,
        ["--reader-keep" as string]: sample.keep,
        ["--reader-sand" as string]: sample.sand,
        ["--reader-rule" as string]: sample.rule,
      }
    : undefined;

  return {
    enabled,
    active,
    sample,
    setEnabled,
    className: active
      ? motion
        ? "reader-daylight reader-daylight-motion"
        : "reader-daylight"
      : undefined,
    style,
  };
}

/**
 * Paper and other route chrome. Samples the frame the same way the root
 * status-bar sync does, and yields when a live reader already published
 * `--status-page`.
 */
export function useChromeStatusBar() {
  useLayoutEffect(() => {
    if (document.querySelector('[data-daylight]:not([data-daylight="off"])')) return;
    applyStatusBarColorToDocument(readChromeBackground(document) ?? PAGE_PAPER);
  }, []);
}

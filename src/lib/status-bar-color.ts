/**
 * iOS status bar color.
 *
 * Safari reads `<meta name="theme-color">` live and picks dark or light
 * glyphs from the luminance. An installed PWA with
 * `apple-mobile-web-app-status-bar-style: black-translucent` draws the page
 * under the status bar and always uses white glyphs, so a light page gets a
 * strip deepened toward ink until those glyphs clear WCAG AA (4.5). The page
 * itself keeps the real color.
 */

import { contrastRatio, mixHex } from "./daylight-colors.ts";

/** Resting page. Matches `--color-paper`. */
export const PAGE_PAPER = "#f3f1eb";

/** Brand / daylight dark ink. Light strips mix toward this, not a new hue. */
export const STATUS_INK = "#111111";

/** `black-translucent` status glyphs are white. */
export const STATUS_GLYPH = "#ffffff";

/** Small status-bar text. Below this, the strip is deepened. */
export const STATUS_MIN_CONTRAST = 4.5;

export type StatusBarPaint = {
  /** Color behind the page, and the Safari `theme-color`. */
  page: string;
  /** Color of the safe-area strip. Equals `page` when white glyphs already clear. */
  strip: string;
};

type StyleTarget = {
  setProperty(name: string, value: string): void;
};

type MetaTarget = {
  setAttribute(name: string, value: string): void;
};

export type StatusBarHost = {
  root: { style: StyleTarget };
  meta: MetaTarget | null;
  ensureMeta?: () => MetaTarget;
};

export function cssColorToHex(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (raw === "transparent" || raw === "") return null;
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const body = hex[1] ?? "";
    const full = body.length === 3 ? [...body].map((channel) => channel + channel).join("") : body;
    return `#${full}`;
  }
  const rgb = raw.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/,
  );
  if (!rgb) return null;
  const alpha = rgb[4];
  if (alpha != null) {
    const value = alpha.endsWith("%") ? Number(alpha.slice(0, -1)) / 100 : Number(alpha);
    if (!(value >= 0.99)) return null;
  }
  const channels = [rgb[1], rgb[2], rgb[3]].map((channel) =>
    Math.max(0, Math.min(255, Math.round(Number(channel)))),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** First opaque computed background, from the element up through its ancestors. */
export function firstOpaqueBackground(colors: readonly string[]): string | null {
  for (const color of colors) {
    const hex = cssColorToHex(color);
    if (hex) return hex;
  }
  return null;
}

/**
 * Safe-area strip for white status glyphs. Dark pages pass through unchanged.
 * Light pages mix toward {@link STATUS_INK} only as far as {@link STATUS_MIN_CONTRAST}.
 */
export function statusStripColor(page: string, minContrast = STATUS_MIN_CONTRAST): string {
  const background = cssColorToHex(page) ?? PAGE_PAPER;
  if (contrastRatio(STATUS_GLYPH, background) >= minContrast) return background;
  let lo = 0;
  let hi = 1;
  let best = STATUS_INK;
  for (let step = 0; step < 18; step++) {
    const t = (lo + hi) / 2;
    const sample = mixHex(background, STATUS_INK, t);
    if (contrastRatio(STATUS_GLYPH, sample) >= minContrast) {
      best = sample;
      hi = t;
    } else {
      lo = t;
    }
  }
  return best;
}

/**
 * `whiteGlyphs` is the installed PWA (`black-translucent` always draws white).
 * Safari chooses glyph color from `theme-color`, so the strip stays the page.
 */
export function statusBarPaint(page: string, whiteGlyphs: boolean): StatusBarPaint {
  const normalized = cssColorToHex(page) ?? PAGE_PAPER;
  return {
    page: normalized,
    strip: whiteGlyphs ? statusStripColor(normalized) : normalized,
  };
}

export function isStandaloneDisplay(
  nav: { standalone?: boolean } | null | undefined,
  displayModeStandalone = false,
): boolean {
  return nav?.standalone === true || displayModeStandalone;
}

/** Write `theme-color` and the `--status-page` / `--status-strip` variables. */
export function applyStatusBarColor(
  page: string,
  host: StatusBarHost,
  whiteGlyphs: boolean,
): StatusBarPaint {
  const paint = statusBarPaint(page, whiteGlyphs);
  host.root.style.setProperty("--status-page", paint.page);
  host.root.style.setProperty("--status-strip", paint.strip);
  const meta = host.meta ?? host.ensureMeta?.() ?? null;
  meta?.setAttribute("content", paint.page);
  return paint;
}

export function applyStatusBarColorToDocument(
  page: string,
  doc: Document = document,
): StatusBarPaint {
  const view = doc.defaultView;
  const nav = view?.navigator as (Navigator & { standalone?: boolean }) | undefined;
  const standalone = isStandaloneDisplay(
    nav,
    view?.matchMedia?.("(display-mode: standalone)")?.matches === true,
  );
  const existing = doc.querySelector('meta[name="theme-color"]');
  return applyStatusBarColor(
    page,
    {
      root: doc.documentElement,
      meta: existing,
      ensureMeta() {
        const el = doc.createElement("meta");
        el.setAttribute("name", "theme-color");
        doc.head.appendChild(el);
        return el;
      },
    },
    standalone,
  );
}

/** Background that will show in the status-bar band: the reader frame, else the mark bar. */
export function readChromeBackground(doc: Document): string | null {
  const start = doc.querySelector(".frame-screen") ?? doc.querySelector(".cell-mark") ?? doc.body;
  const view = doc.defaultView;
  if (!start || !view) return null;
  const colors: string[] = [];
  let node: Element | null = start;
  while (node) {
    colors.push(view.getComputedStyle(node).backgroundColor);
    node = node.parentElement;
  }
  return firstOpaqueBackground(colors);
}

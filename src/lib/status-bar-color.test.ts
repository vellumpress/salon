import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DAYLIGHT_SOLIDS, contrastRatio, relativeLuminance } from "./daylight-colors.ts";
import {
  PAGE_PAPER,
  STATUS_GLYPH,
  STATUS_INK,
  STATUS_MIN_CONTRAST,
  applyStatusBarColor,
  cssColorToHex,
  firstOpaqueBackground,
  isStandaloneDisplay,
  statusBarPaint,
  statusStripColor,
} from "./status-bar-color.ts";

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

test("night and morning strips match the page, because white glyphs already clear", () => {
  for (const phase of ["night", "morning"] as const) {
    const background = DAYLIGHT_SOLIDS[phase].background;
    const paint = statusBarPaint(background, true);
    assert.equal(paint.page, background);
    assert.equal(paint.strip, background);
    assert.ok(contrastRatio(STATUS_GLYPH, background) >= STATUS_MIN_CONTRAST);
  }
});

test("midday, evening, and paper deepen only toward ink until white glyphs clear 4.5", () => {
  const pages = [DAYLIGHT_SOLIDS.midday.background, DAYLIGHT_SOLIDS.evening.background, PAGE_PAPER];
  for (const background of pages) {
    assert.ok(contrastRatio(STATUS_GLYPH, background) < STATUS_MIN_CONTRAST);
    const strip = statusStripColor(background);
    assert.notEqual(strip, background);
    assert.ok(contrastRatio(STATUS_GLYPH, strip) >= STATUS_MIN_CONTRAST);
    assert.ok(relativeLuminance(strip) < relativeLuminance(background));
    for (let index = 0; index < 3; index++) {
      const pageChannel = channel(background, index);
      const inkChannel = channel(STATUS_INK, index);
      const stripChannel = channel(strip, index);
      const lo = Math.min(pageChannel, inkChannel) - 1;
      const hi = Math.max(pageChannel, inkChannel) + 1;
      assert.ok(stripChannel >= lo && stripChannel <= hi, `${background} → ${strip}`);
    }
  }
});

test("theme-color follows the live page, and the strip variable is the safe shade", () => {
  const props = new Map<string, string>();
  const attrs = new Map<string, string>();
  const host = {
    root: { style: { setProperty: (name: string, value: string) => props.set(name, value) } },
    meta: {
      setAttribute: (name: string, value: string) => attrs.set(name, value),
    },
  };

  const midday = applyStatusBarColor(DAYLIGHT_SOLIDS.midday.background, host, true);
  assert.equal(attrs.get("content"), DAYLIGHT_SOLIDS.midday.background);
  assert.equal(props.get("--status-page"), midday.page);
  assert.equal(props.get("--status-strip"), midday.strip);
  assert.notEqual(midday.strip, midday.page);

  const safari = applyStatusBarColor(DAYLIGHT_SOLIDS.midday.background, host, false);
  assert.equal(attrs.get("content"), DAYLIGHT_SOLIDS.midday.background);
  assert.equal(safari.strip, safari.page);

  const night = applyStatusBarColor(DAYLIGHT_SOLIDS.night.background, host, true);
  assert.equal(attrs.get("content"), "#7a1832");
  assert.equal(night.page, night.strip);

  const paper = applyStatusBarColor("rgb(243, 241, 235)", host, true);
  assert.equal(paper.page, PAGE_PAPER);
  assert.equal(attrs.get("content"), PAGE_PAPER);
  assert.ok(contrastRatio(STATUS_GLYPH, paper.strip) >= STATUS_MIN_CONTRAST);
});

test("standalone is the home-screen flag or display-mode", () => {
  assert.equal(isStandaloneDisplay({ standalone: true }, false), true);
  assert.equal(isStandaloneDisplay(null, true), true);
  assert.equal(isStandaloneDisplay({ standalone: false }, false), false);
  assert.equal(isStandaloneDisplay(undefined, false), false);
});

test("chrome sampling skips a transparent layer and keeps an opaque page color", () => {
  assert.equal(cssColorToHex("transparent"), null);
  assert.equal(cssColorToHex("rgba(122, 24, 50, 0)"), null);
  assert.equal(firstOpaqueBackground(["rgba(0, 0, 0, 0)", "rgb(122, 24, 50)"]), "#7a1832");
  assert.equal(
    firstOpaqueBackground(["rgba(243, 241, 235, 0.2)", "rgb(243, 241, 235)"]),
    PAGE_PAPER,
  );
  assert.equal(cssColorToHex("#F3F1EB"), PAGE_PAPER);
});

test("the shell paints under the status bar and daylight publishes theme-color", () => {
  const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
  const hook = readFileSync(new URL("./use-reader-daylight.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(root, /viewport-fit=cover/);
  assert.match(root, /apple-mobile-web-app-status-bar-style", content: "black-translucent"/);
  assert.match(root, /status-bar-fill/);
  assert.match(root, /readChromeBackground/);
  assert.match(hook, /applyStatusBarColorToDocument/);
  assert.match(hook, /data-status-motion/);
  assert.match(css, /\.status-bar-fill\s*\{[^}]*env\(safe-area-inset-top/);
  assert.match(css, /\.frame-screen\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/);
  assert.match(css, /\.cell-mark\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/);
  assert.match(css, /--mark-row:\s*calc\(3rem \+ env\(safe-area-inset-top/);
});

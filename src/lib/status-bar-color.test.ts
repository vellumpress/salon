import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DAYLIGHT_SOLIDS, contrastRatio, relativeLuminance } from "./daylight-colors.ts";
import { parseHTML } from "linkedom";
import {
  PAGE_PAPER,
  STATUS_GLYPH,
  STATUS_INK,
  STATUS_MIN_CONTRAST,
  applyStatusBarColor,
  applyStatusBarColorToDocument,
  cssColorToHex,
  firstOpaqueBackground,
  isStandaloneDisplay,
  publishThemeColor,
  readChromeBackground,
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

test("leaving the reader does not read the status tint back off the page", () => {
  const mark = { parentElement: null as unknown };
  const body = { parentElement: null as unknown };
  const root = { parentElement: null as unknown };
  mark.parentElement = body;
  body.parentElement = root;
  const view = {
    getComputedStyle(node: unknown) {
      if (node === mark) return { backgroundColor: "rgb(243, 241, 235)" };
      return { backgroundColor: "rgb(255, 208, 0)" };
    },
  };
  const doc = {
    body,
    documentElement: root,
    defaultView: view,
    querySelector(selector: string) {
      if (selector === ".frame-screen") return null;
      if (selector === ".cell-mark") return mark;
      return null;
    },
  };
  assert.equal(readChromeBackground(doc as unknown as Document), PAGE_PAPER);

  const bare = {
    ...doc,
    querySelector() {
      return null;
    },
  };
  assert.equal(readChromeBackground(bare as unknown as Document), null);
});

test("a second theme-color publish replaces the node, so Safari leaves the homepage cream", () => {
  const { document: doc } = parseHTML(
    `<!doctype html><html><head>
      <meta name="theme-color" content="#F3F1EB">
      <meta name="theme-color" content="#F3F1EB">
    </head><body></body></html>`,
  );
  const stale = doc.querySelector('meta[name="theme-color"]');
  publishThemeColor(doc, "#f3f1eb");
  const paper = [...doc.querySelectorAll('meta[name="theme-color"]')];
  assert.equal(paper.length, 1);
  assert.notEqual(paper[0], stale);
  assert.equal(paper[0]?.getAttribute("content"), "#f3f1eb");

  const morning = DAYLIGHT_SOLIDS.morning.background;
  const painted = applyStatusBarColorToDocument(morning, doc);
  const live = [...doc.querySelectorAll('meta[name="theme-color"]')];
  assert.equal(live.length, 1);
  assert.notEqual(live[0], paper[0]);
  assert.equal(live[0]?.getAttribute("content"), morning);
  assert.equal(painted.page, morning);
  assert.equal(painted.strip, morning);
  assert.equal(doc.documentElement.style.getPropertyValue("--status-page"), morning);

  const home = applyStatusBarColorToDocument("rgb(243, 241, 235)", doc);
  assert.equal(home.page, PAGE_PAPER);
  assert.equal(doc.querySelector('meta[name="theme-color"]')?.getAttribute("content"), PAGE_PAPER);
  assert.equal(doc.documentElement.style.getPropertyValue("--status-page"), PAGE_PAPER);
});

test("the shell paints under the status bar and daylight publishes theme-color", () => {
  const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
  const hook = readFileSync(new URL("./use-reader-daylight.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(root, /viewport-fit=cover/);
  assert.match(root, /apple-mobile-web-app-status-bar-style", content: "black-translucent"/);
  assert.match(root, /status-bar-fill/);
  assert.match(root, /readChromeBackground/);
  const sync = root.slice(root.indexOf("function StatusBarSync"));
  assert.match(sync, /useEffect\(\(\) => \{/);
  assert.doesNotMatch(sync, /useLayoutEffect/);
  assert.match(hook, /applyStatusBarColorToDocument/);
  assert.match(hook, /useEffect\(\(\) => \{\s*publishReaderStatusBar/);
  assert.match(hook, /data-status-motion/);
  assert.match(css, /\.status-bar-fill\s*\{[^}]*env\(safe-area-inset-top/);
  assert.match(css, /\.frame-screen\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/);
  assert.match(css, /\.cell-mark\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/);
  assert.match(css, /--mark-row:\s*calc\(3rem \+ env\(safe-area-inset-top/);
});

test("black-translucent strips keep the deepened shades, and night and morning stay exact", () => {
  assert.equal(statusStripColor(DAYLIGHT_SOLIDS.evening.background), "#258743");
  assert.equal(statusStripColor(DAYLIGHT_SOLIDS.midday.background), "#8d7408");
  assert.equal(statusStripColor(PAGE_PAPER), "#777674");
  assert.equal(statusStripColor(DAYLIGHT_SOLIDS.night.background), "#7a1832");
  assert.equal(statusStripColor(DAYLIGHT_SOLIDS.morning.background), "#1348b0");
  assert.equal(statusBarPaint(DAYLIGHT_SOLIDS.night.background, true).strip, "#7a1832");
  assert.equal(statusBarPaint(DAYLIGHT_SOLIDS.midday.background, false).strip, "#ffd000");
});

function cssBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS block ${selector}`);
  return match?.[1] ?? "";
}

test("html and body backgrounds resolve through --status-page", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const page = /background(?:-color)?:\s*var\(--status-page,\s*var\(--color-paper\)\)/;
  const pinned = /background(?:-color)?:\s*var\(--color-paper\)\s*;/;
  for (const selector of [
    "html",
    "body",
    "html.sitting,\n  html.sitting body",
    "html.together-compose,\nhtml.together-compose body",
  ]) {
    const block = cssBlock(css, selector);
    assert.match(block, page, selector);
    assert.doesNotMatch(block, pinned, selector);
  }
  assert.match(
    cssBlock(css, "html.together-compose,\nhtml.together-compose body"),
    /color-scheme:\s*light/,
  );
  assert.match(cssBlock(css, ".frame-screen"), /background:\s*var\(--color-paper\)/);
  assert.match(cssBlock(css, ".cell-mark"), /background:\s*var\(--color-paper\)/);
});

test("the solo reader runs past lines through the status bar without covering them", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const frame = cssBlock(css, ".reader-frame:not(.together-lock)");
  assert.match(frame, /--reader-top-lead:\s*calc\(3rem \+ 1px \+ env\(safe-area-inset-top,\s*0px\)\)/);
  assert.match(frame, /padding-top:\s*0/);
  assert.match(frame, /padding-bottom:\s*0/);

  const header = cssBlock(css, ".reader-frame:not(.together-lock) > header");
  assert.match(header, /padding-top:\s*env\(safe-area-inset-top,\s*0px\)/);

  const bleed = cssBlock(css, ".reader-turn-bleed");
  assert.match(bleed, /margin-bottom:\s*calc\(-1 \* \(3rem \+ env\(safe-area-inset-bottom,\s*0px\)\)\)/);
  assert.doesNotMatch(bleed, /margin-top/);
  const paneBleed = cssBlock(css, ".reader-turn-bleed > .reading-pane");
  assert.match(paneBleed, /margin-top:\s*calc\(-1 \* var\(--reader-top-lead,\s*0px\)\)/);

  const dropped = cssBlock(css, "html:has(.reader-frame:not(.together-lock)) .status-bar-fill");
  assert.match(dropped, /z-index:\s*0/);
  assert.doesNotMatch(dropped, /backdrop-filter|-webkit-backdrop-filter/);

  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  assert.match(reader, /focusAnchorPx\(height,\s*overlap,\s*CENTER_LINE_ANCHOR,\s*lead\)/);
  assert.match(reader, /!together && "reader-turn-bleed"/);
});

test("the status-bar edge is solid page color and has no backdrop-filter", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const fill = cssBlock(css, ".status-bar-fill");
  assert.match(fill, /position:\s*fixed/);
  assert.match(fill, /top:\s*0/);
  assert.match(fill, /height:\s*1px/);
  assert.match(fill, /height:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*1px\)/);
  assert.match(fill, /background:\s*var\(--status-page,\s*var\(--color-paper\)\)/);
  assert.doesNotMatch(fill, /backdrop-filter|-webkit-backdrop-filter/);

  const strip = cssBlock(css, ".status-bar-fill::before");
  assert.match(strip, /height:\s*env\(safe-area-inset-top,\s*0px\)/);
  assert.match(
    strip,
    /background:\s*var\(--status-strip,\s*var\(--status-page,\s*var\(--color-paper\)\)\)/,
  );
  assert.doesNotMatch(strip, /backdrop-filter|-webkit-backdrop-filter/);

  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const rule of code.split("}")) {
    if (!/position:\s*(?:fixed|sticky)/.test(rule)) continue;
    if (!/top:\s*0/.test(rule)) continue;
    assert.doesNotMatch(rule, /backdrop-filter|-webkit-backdrop-filter/);
  }
});

test("device imports render TbrReader with daylight, and reader-like chrome publishes status", () => {
  const read = readFileSync(new URL("../routes/read.$workId.tsx", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const hook = readFileSync(new URL("./use-reader-daylight.ts", import.meta.url), "utf8");

  assert.match(read, /isDeviceImport\(workId\)/);
  assert.match(read, /useReaderDaylight\(\)/);
  assert.match(read, /data-daylight=/);
  assert.match(read, /<TbrReader/);
  assert.doesNotMatch(read, /if\s*\(\s*device\s*\)[^;\n]*return\s+null/);
  const loaded = read.slice(read.lastIndexOf("if (!work)"));
  assert.match(loaded, /<TbrReader/);

  assert.match(reader, /useReaderDaylight\(\)/);
  assert.match(reader, /data-daylight=/);
  assert.match(reader, /TogetherShell/);

  assert.match(hook, /export function useChromeStatusBar/);
  assert.match(hook, /readChromeBackground/);
  assert.match(hook, /applyStatusBarColorToDocument/);

  for (const file of ["sit.$token.tsx", "s.$token.tsx", "glass.tsx", "page.tsx"]) {
    const source = readFileSync(new URL(`../routes/${file}`, import.meta.url), "utf8");
    assert.match(source, /useChromeStatusBar\(\)/, file);
    assert.match(source, /frame-screen/, file);
  }
});

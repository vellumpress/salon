import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CENTER_LINE_ANCHOR,
  CENTER_LINE_KEY,
  UPCOMING_WINDOW,
  breathTooTall,
  centerLineOffset,
  focusAnchorPx,
  readCenterLineEnabled,
  upcomingBreaths,
  upcomingOpacity,
  writeCenterLineEnabled,
} from "./center-line.ts";
import type { Breath, Work } from "./literature.ts";

function memoryStore(initial?: Record<string, string>) {
  const data = { ...(initial ?? {}) };
  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

function workOf(scenes: Array<{ id: string; count: number }>): Work {
  const breaths: Breath[] = [];
  for (const scene of scenes) {
    for (let i = 0; i < scene.count; i += 1) {
      breaths.push({
        id: `${scene.id}-${i}`,
        sceneId: scene.id,
        text: `Line ${scene.id} ${i}`,
      });
    }
  }
  return {
    id: "fixture",
    title: "Fixture",
    author: "Test",
    year: "",
    note: "",
    minutes: 1,
    cover: "",
    coverAlt: "",
    scenes: scenes.map((scene) => ({
      id: scene.id,
      title: scene.id,
      place: scene.id,
      reentry: "",
      prompt: "",
    })),
    breaths,
  };
}

test("center the line defaults on and persists like the other reader settings", () => {
  const fresh = memoryStore();
  assert.equal(readCenterLineEnabled(fresh), true);
  assert.equal(readCenterLineEnabled(memoryStore({ [CENTER_LINE_KEY]: "" })), true);
  writeCenterLineEnabled(false, fresh);
  assert.equal(fresh.data[CENTER_LINE_KEY], "0");
  assert.equal(readCenterLineEnabled(fresh), false);
  writeCenterLineEnabled(true, fresh);
  assert.equal(fresh.data[CENTER_LINE_KEY], "1");
  assert.equal(readCenterLineEnabled(fresh), true);
  assert.equal(readCenterLineEnabled(memoryStore({ [CENTER_LINE_KEY]: "off" })), false);
  assert.equal(readCenterLineEnabled(memoryStore({ [CENTER_LINE_KEY]: "false" })), false);
  assert.equal(readCenterLineEnabled(memoryStore({ [CENTER_LINE_KEY]: "0" })), false);
  assert.equal(readCenterLineEnabled(null), true);
});

test("the focus sentence rests in the lower band of the reading area", () => {
  assert.ok(CENTER_LINE_ANCHOR >= 0.62 && CENTER_LINE_ANCHOR <= 0.66);
  assert.ok(UPCOMING_WINDOW >= 16 && UPCOMING_WINDOW <= 28);
});

test("the anchor stays at 64% of the area above the hourglass", () => {
  assert.equal(focusAnchorPx(800, 0), 800 * CENTER_LINE_ANCHOR);
  assert.equal(focusAnchorPx(800, 80), 720 * CENTER_LINE_ANCHOR);
  assert.equal(focusAnchorPx(0, 40), 0);
  assert.equal(focusAnchorPx(100, 400), 0);
  assert.equal(focusAnchorPx(Number.NaN, 10), 0);
});

test("a top lead keeps the focus in the same place inside the reading area", () => {
  const bottom = 82;
  const lead = 96;
  const oldPane = 700;
  const oldAnchor = focusAnchorPx(oldPane, bottom);
  const withLead = focusAnchorPx(oldPane + lead, bottom, CENTER_LINE_ANCHOR, lead);
  assert.equal(withLead, oldAnchor + lead);
  assert.equal(withLead - lead, (oldPane - bottom) * CENTER_LINE_ANCHOR);
  assert.equal(focusAnchorPx(800, 80, CENTER_LINE_ANCHOR, Number.NaN), 720 * CENTER_LINE_ANCHOR);
  assert.equal(focusAnchorPx(100, 40, CENTER_LINE_ANCHOR, 80), 60);
  assert.equal(focusAnchorPx(100, 40, CENTER_LINE_ANCHOR, -10), 60 * CENTER_LINE_ANCHOR);
});

test("upcoming window fills a tall phone below the focus, including the hourglass", () => {
  const phone = 956;
  const header = 48;
  const safeTop = 47;
  const hourglass = 48;
  const homeIndicator = 34;
  const pane = phone - safeTop - header;
  const overlap = hourglass + homeIndicator;
  const anchor = focusAnchorPx(pane, overlap);
  const below = pane - anchor;
  const shortLine = 28;
  assert.ok(anchor > pane * 0.5, "focus stays in the lower band of the reading area");
  assert.ok(
    UPCOMING_WINDOW * shortLine >= below,
    `window ${UPCOMING_WINDOW} does not cover ${below}px below the anchor`,
  );
});

test("center offset keeps the breath on the anchor at the start, middle, and end", () => {
  const pane = 800;
  const anchor = Math.round(pane * CENTER_LINE_ANCHOR);
  const height = 48;
  for (const lineTop of [0, 120, 360, 2400, 12000]) {
    const shift = centerLineOffset({ paneHeight: pane, lineTop, lineHeight: height });
    const landed = lineTop + height / 2 + shift;
    assert.equal(landed, anchor, `line at ${lineTop} landed at ${landed}`);
  }
  assert.equal(centerLineOffset({ paneHeight: 0, lineTop: 10, lineHeight: 20 }), 0);
  assert.equal(
    centerLineOffset({ paneHeight: pane, lineTop: anchor - height / 2, lineHeight: height }),
    0,
  );
});

test("a breath that cannot sit on the lower anchor scrolls instead of clipping", () => {
  const pane = 800;
  assert.equal(breathTooTall(80, pane), false);
  assert.equal(breathTooTall(pane * 0.7, pane), false);
  assert.equal(breathTooTall(pane * 0.73, pane), true);
  assert.equal(breathTooTall(pane * 0.95, pane, 0.5), true);
  assert.equal(breathTooTall(pane * 0.8, pane, 0.5), false);
  assert.equal(breathTooTall(10, 0), false);
  assert.equal(breathTooTall(0, pane), false);
});

test("upcoming breaths are a scene-bounded window, not the rest of the book", () => {
  const work = workOf([
    { id: "one", count: 4 },
    { id: "two", count: 40 },
    { id: "three", count: 6 },
  ]);
  const startOfTwo = 4;

  assert.equal(upcomingBreaths(work, startOfTwo - 1).length, 0);
  assert.equal(upcomingBreaths(work, startOfTwo)[0]?.id, "two-1");

  const windowed = upcomingBreaths(work, startOfTwo);
  assert.equal(windowed.length, UPCOMING_WINDOW);
  assert.ok(windowed.every((breath) => breath.sceneId === "two"));
  assert.equal(windowed[0]?.id, "two-1");
  assert.equal(windowed.at(-1)?.id, `two-${UPCOMING_WINDOW}`);
  assert.equal(upcomingBreaths(work, startOfTwo, 3).map((breath) => breath.id).join(","), "two-1,two-2,two-3");

  const nearEnd = upcomingBreaths(work, startOfTwo + 37);
  assert.equal(nearEnd.length, 2);
  assert.equal(nearEnd.at(-1)?.id, "two-39");
  assert.equal(upcomingBreaths(work, startOfTwo + 39).length, 0);
  assert.equal(upcomingBreaths(work, work.breaths.length).length, 0);
  assert.equal(upcomingBreaths(work, -1).length, 0);
  assert.equal(upcomingBreaths(work, startOfTwo, 0).length, 0);
});

test("a long book only walks the upcoming window", () => {
  const work = workOf([{ id: "chapter", count: 20000 }]);
  const started = performance.now();
  const next = upcomingBreaths(work, 500);
  const elapsed = performance.now() - started;
  assert.equal(next.length, UPCOMING_WINDOW);
  assert.equal(next[0]?.id, "chapter-501");
  assert.equal(next.at(-1)?.id, `chapter-${500 + UPCOMING_WINDOW}`);
  assert.ok(elapsed < 30, `window took ${elapsed}ms`);
});

test("upcoming preview stays fainter than the current line and still legible", () => {
  assert.equal(upcomingOpacity(0, 1), 0.36);
  const count = UPCOMING_WINDOW;
  for (let i = 0; i < count; i += 1) {
    const opacity = upcomingOpacity(i, count);
    assert.ok(opacity >= 0.3 && opacity <= 0.42, `index ${i} opacity ${opacity}`);
  }
  assert.ok(upcomingOpacity(0, count) > upcomingOpacity(count - 1, count));
  assert.ok(upcomingOpacity(0, count) < 0.44, "nearest preview is a step fainter than before");
});

test("upcoming preview is one soft blur and the focus line stays sharp", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const slot = css.match(/\.upcoming-slot\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(slot, /filter:\s*blur\(2px\)/);
  assert.doesNotMatch(slot, /\.breath-now|\.look-line/);
  const breath = css.match(/\.look-line,\s*\n\.breath-now\s*\{[^}]+\}/)?.[0] ?? "";
  assert.ok(breath.length > 0, "focus line rule missing");
  assert.doesNotMatch(breath, /blur|filter/);
  const transparent = css.slice(css.indexOf("@media (prefers-reduced-transparency: reduce)"));
  assert.match(transparent, /\.upcoming-slot\s*\{[^}]*filter:\s*none/);
  const motion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(motion, /\.reader-frame \*/);
  assert.match(motion, /transition:\s*none\s*!important/);
});

test("the hourglass sheet toggles Center the line next to Daylight colors", () => {
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const hook = readFileSync(new URL("./use-center-line.ts", import.meta.url), "utf8");

  assert.match(hook, /CENTER_LINE_KEY/);
  assert.match(hook, /readCenterLineEnabled/);
  assert.match(hook, /writeCenterLineEnabled/);

  const sheet = reader.slice(reader.indexOf("Daylight colors"), reader.indexOf("<footer"));
  assert.match(sheet, /Center the line/);
  assert.match(sheet, /role="switch"/);
  assert.match(sheet, /aria-checked=\{centerLine\.enabled\}/);
  assert.match(sheet, /centerLine\.setEnabled\(!centerLine\.enabled\)/);
  assert.ok(
    sheet.indexOf("Daylight colors") < sheet.indexOf("Center the line"),
    "Center the line sits with the Daylight colors switch",
  );

  assert.match(reader, /upcomingBreaths/);
  assert.match(reader, /centerOn && "reading-pane-centered"/);
  assert.match(reader, /center-track/);
  assert.match(reader, /upcoming-slot/);
  assert.match(reader, /"breath-now relative z-\[1\] font-serif"/);

  const branchAt = reader.indexOf("centerOn ? (");
  assert.ok(branchAt > -1, "centered reading branch missing");
  const off = reader.slice(branchAt, reader.indexOf("bottom-anchor", branchAt));
  assert.match(off, /center-track/);
  assert.match(off, /upcoming-slot/);
  const legacy = reader.slice(
    reader.indexOf("bottom-anchor", branchAt),
    reader.indexOf("bottom-anchor-end", branchAt),
  );
  assert.match(legacy, /lookback-slot/);
  assert.match(legacy, /breathSlotRef/);
  assert.doesNotMatch(legacy, /upcoming-slot|center-track|reading-pane-centered/);
  assert.match(reader, /const breathClass = cn\("breath-slot"/);

  assert.match(css, /\.reading-pane-centered/);
  assert.match(css, /\.center-track\[data-ready="1"\]/);
  const motion = css.match(/\.center-track\[data-ready="1"\]\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(motion, /transition:\s*transform\s+280ms/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.reader-frame \*/);
  assert.match(reduced, /transition:\s*none\s*!important/);
});

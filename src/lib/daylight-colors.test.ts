import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BLEND_MINUTES,
  BLEND_RADIUS_MINUTES,
  DAYLIGHT_COLORS_KEY,
  DAYLIGHT_PHASE_HOURS,
  DAYLIGHT_SOLIDS,
  contrastRatio,
  daylightAt,
  daylightAtMinute,
  mixHex,
  readDaylightEnabled,
  writeDaylightEnabled,
  type DaylightPhase,
} from "./daylight-colors.ts";

const BOUNDARIES = [
  { minute: 5 * 60, from: "night", to: "morning" },
  { minute: 11 * 60, from: "morning", to: "midday" },
  { minute: 16 * 60, from: "midday", to: "evening" },
  { minute: 21 * 60, from: "evening", to: "night" },
] as const;

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

test("nominal phases use saturated solids at the middle of each watch", () => {
  const centers: Array<[number, DaylightPhase]> = [
    [8 * 60, "morning"],
    [13 * 60 + 30, "midday"],
    [18 * 60 + 30, "evening"],
    [23 * 60, "night"],
    [1 * 60, "night"],
    [0, "night"],
    [4 * 60, "night"],
  ];
  for (const [minute, phase] of centers) {
    const sample = daylightAtMinute(minute);
    assert.equal(sample.phase, phase, `${minute} should be ${phase}`);
    assert.equal(sample.blend, 0);
    assert.equal(sample.background, DAYLIGHT_SOLIDS[phase].background);
    assert.equal(sample.ink, DAYLIGHT_SOLIDS[phase].ink);
    assert.equal(sample.from, phase);
    assert.equal(sample.to, phase);
  }
});

test("phase hours and blend window are the published clock", () => {
  assert.equal(BLEND_MINUTES, 45);
  assert.deepEqual(DAYLIGHT_PHASE_HOURS.morning, { from: "5:00", to: "11:00" });
  assert.deepEqual(DAYLIGHT_PHASE_HOURS.midday, { from: "11:00", to: "16:00" });
  assert.deepEqual(DAYLIGHT_PHASE_HOURS.evening, { from: "16:00", to: "21:00" });
  assert.deepEqual(DAYLIGHT_PHASE_HOURS.night, { from: "21:00", to: "5:00" });
  assert.equal(DAYLIGHT_SOLIDS.morning.background, "#1348b0");
  assert.equal(DAYLIGHT_SOLIDS.morning.ink, "#fff8ee");
  assert.equal(DAYLIGHT_SOLIDS.midday.background, "#ffd000");
  assert.equal(DAYLIGHT_SOLIDS.midday.ink, "#111111");
  assert.equal(DAYLIGHT_SOLIDS.evening.background, "#2fbf5a");
  assert.equal(DAYLIGHT_SOLIDS.evening.ink, "#111111");
  assert.equal(DAYLIGHT_SOLIDS.night.background, "#7a1832");
  assert.equal(DAYLIGHT_SOLIDS.night.ink, "#fff8ee");
});

test("blend boundaries ease across 45 minutes and match the solids outside", () => {
  for (const boundary of BOUNDARIES) {
    const before = daylightAtMinute(boundary.minute - BLEND_RADIUS_MINUTES - 1);
    const open = daylightAtMinute(boundary.minute - BLEND_RADIUS_MINUTES);
    const mid = daylightAtMinute(boundary.minute);
    const close = daylightAtMinute(boundary.minute + BLEND_RADIUS_MINUTES);
    const after = daylightAtMinute(boundary.minute + BLEND_RADIUS_MINUTES + 1);
    const fromHex = DAYLIGHT_SOLIDS[boundary.from].background;
    const toHex = DAYLIGHT_SOLIDS[boundary.to].background;

    assert.equal(before.phase, boundary.from);
    assert.equal(before.background, fromHex);
    assert.equal(before.blend, 0);

    assert.equal(open.from, boundary.from);
    assert.equal(open.to, boundary.to);
    assert.equal(open.blend, 0);
    assert.equal(open.background, fromHex);

    assert.equal(mid.from, boundary.from);
    assert.equal(mid.to, boundary.to);
    assert.ok(Math.abs(mid.blend - 0.5) < 1e-9, `${boundary.minute} blend ${mid.blend}`);
    assert.equal(mid.background, mixHex(fromHex, toHex, 0.5));
    assert.notEqual(mid.background, fromHex);
    assert.notEqual(mid.background, toHex);

    assert.equal(close.blend, 1);
    assert.equal(close.background, toHex);
    assert.equal(close.phase, boundary.to);

    assert.equal(after.phase, boundary.to);
    assert.equal(after.background, toHex);
    assert.equal(after.blend, 0);
  }
});

test("midnight stays night — the wrap is not a blend", () => {
  const late = daylightAtMinute(23 * 60 + 30);
  const midnight = daylightAtMinute(0);
  const early = daylightAtMinute(30);
  const solid = DAYLIGHT_SOLIDS.night.background;
  assert.equal(late.phase, "night");
  assert.equal(midnight.phase, "night");
  assert.equal(early.phase, "night");
  assert.equal(late.background, solid);
  assert.equal(midnight.background, solid);
  assert.equal(early.background, solid);
  assert.equal(late.blend, 0);
  assert.equal(midnight.blend, 0);
  assert.notEqual(late.background, DAYLIGHT_SOLIDS.evening.background);
  assert.notEqual(early.background, DAYLIGHT_SOLIDS.morning.background);

  assert.equal(daylightAtMinute(-30).background, daylightAtMinute(23 * 60 + 30).background);
  assert.equal(daylightAtMinute(1440 + 60).phase, "night");
  assert.equal(daylightAtMinute(1440 + 8 * 60).background, DAYLIGHT_SOLIDS.morning.background);
});

test("local Date hours follow the device clock across midnight", () => {
  const late = daylightAt(new Date(2026, 0, 1, 23, 30, 40));
  const early = daylightAt(new Date(2026, 0, 2, 0, 30, 10));
  const morning = daylightAt(new Date(2026, 5, 15, 8, 5, 0));
  assert.equal(late.phase, "night");
  assert.equal(early.phase, "night");
  assert.equal(late.background, early.background);
  assert.equal(morning.phase, "morning");
  assert.equal(morning.background, DAYLIGHT_SOLIDS.morning.background);
});

test("body text, muted text, and the keep mark clear contrast all day", () => {
  let worstInk = Number.POSITIVE_INFINITY;
  let worstMuted = Number.POSITIVE_INFINITY;
  let worstKeep = Number.POSITIVE_INFINITY;
  const phases = new Set<DaylightPhase>();
  for (let minute = 0; minute < 1440; minute++) {
    const sample = daylightAtMinute(minute);
    phases.add(sample.phase);
    const ink = contrastRatio(sample.ink, sample.background);
    const muted = contrastRatio(sample.muted, sample.background);
    const keep = contrastRatio(sample.keep, sample.background);
    const sand = contrastRatio(sample.sand, sample.background);
    if (ink < worstInk) worstInk = ink;
    if (muted < worstMuted) worstMuted = muted;
    if (keep < worstKeep) worstKeep = keep;
    assert.ok(ink >= 4.5, `ink ${ink.toFixed(2)} at minute ${minute} ${sample.background}/${sample.ink}`);
    assert.ok(muted >= 4.5, `muted ${muted.toFixed(2)} at minute ${minute}`);
    assert.ok(keep >= 3, `keep ${keep.toFixed(2)} at minute ${minute} ${sample.keep}`);
    assert.ok(sand >= 3, `sand ${sand.toFixed(2)} at minute ${minute}`);
  }
  assert.equal(phases.size, 4);
  assert.ok(worstInk >= 4.5);
  assert.ok(worstMuted >= 4.5);
  assert.ok(worstKeep >= 3);

  for (const phase of Object.keys(DAYLIGHT_SOLIDS) as DaylightPhase[]) {
    const solid = DAYLIGHT_SOLIDS[phase];
    assert.ok(
      contrastRatio(solid.ink, solid.background) >= 4.5,
      `${phase} solid ${solid.background} / ${solid.ink}`,
    );
  }
});

test("daylight colors default on and persist in localStorage", () => {
  const fresh = memoryStore();
  assert.equal(readDaylightEnabled(fresh), true);
  assert.equal(readDaylightEnabled(memoryStore({ [DAYLIGHT_COLORS_KEY]: "" })), true);
  writeDaylightEnabled(false, fresh);
  assert.equal(fresh.data[DAYLIGHT_COLORS_KEY], "0");
  assert.equal(readDaylightEnabled(fresh), false);
  writeDaylightEnabled(true, fresh);
  assert.equal(fresh.data[DAYLIGHT_COLORS_KEY], "1");
  assert.equal(readDaylightEnabled(fresh), true);
  assert.equal(readDaylightEnabled(memoryStore({ [DAYLIGHT_COLORS_KEY]: "off" })), false);
  assert.equal(readDaylightEnabled(memoryStore({ [DAYLIGHT_COLORS_KEY]: "false" })), false);
  assert.equal(readDaylightEnabled(null), true);
});

test("reader wires the toggle, the minute clock, and reduced motion", () => {
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const hook = readFileSync(new URL("./use-reader-daylight.ts", import.meta.url), "utf8");
  assert.match(reader, /Daylight colors/);
  assert.match(reader, /role="switch"/);
  assert.match(reader, /reader-daylight/);
  assert.match(reader, /useReaderDaylight/);
  assert.match(hook, /60_000/);
  assert.match(hook, /DAYLIGHT_COLORS_KEY/);
  assert.match(css, /\.reader-daylight/);
  assert.match(css, /\.reader-frame/);
  assert.match(css, /--reader-bg/);
  assert.match(css, /--reader-ink/);
  assert.match(css, /--reader-keep/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.reader-frame/);
  assert.match(reduced, /transition:\s*none\s*!important/);
});

test("italics, section breaks, and Note breaths use phase ink, not a hardcoded dark color", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const dark = /#(?:111111|111|000000|0b0b0c|1a1a1a)\b|var\(\s*--color-ink\s*\)/;

  const breakRule = css.match(/\.section-break\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(breakRule, /color:\s*currentColor/);
  assert.doesNotMatch(breakRule, dark);

  const inkBlock = css.match(
    /\.reader-daylight \.breath-now,[\s\S]*?\.reader-daylight \.daylight-switch \{\s*color:\s*var\(--reader-ink\);\s*\}/,
  )?.[0] ?? "";
  assert.match(inkBlock, /\.reader-daylight \.breath-now em/);
  assert.match(inkBlock, /\.reader-daylight \.look-line em/);
  assert.match(inkBlock, /\.reader-daylight \.section-break/);
  assert.doesNotMatch(inkBlock, dark);

  assert.match(reader, /"breath-now relative z-\[1\] font-serif"/);
  assert.doesNotMatch(reader, /breath-now[^"\n]*text-ink/);
  assert.match(reader, /<em key=\{i\}>\{part\.value\}<\/em>/);
  assert.doesNotMatch(reader, /Note:[\s\S]{0,180}(?:text-ink|#111)/);
  assert.doesNotMatch(css, /\.note-breath|\.breath-note|\[data-note\]/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CONTRIBUTOR_IDS, CONTRIBUTOR_WEIGHTS, type ContributorResult } from "./reading-score.ts";
import {
  GLASS,
  GLASS_LOWER_CLIP,
  GLASS_UPPER_CLIP,
  SCORE_SAND_COLOR,
  SETTLE_MS,
  easeSettle,
  hourglassCopy,
  polygonArea,
  sandBands,
  sandGrains,
  sandHeight,
} from "./score-hourglass.ts";

function part(
  id: ContributorResult["id"],
  status: ContributorResult["status"],
  value: number | null,
): ContributorResult {
  return { id, value, raw: value, status, note: "" };
}

const scoredParts: ContributorResult[] = [
  part("immersion", "scored", 80),
  part("rhythm", "learning", null),
  part("return", "scored", 100),
  part("range", "scored", 100),
  part("restfulness", "scored", 100),
  part("connection", "scored", 75),
];

test("the score glass is the reader bowtie, with a bar at each end", () => {
  const reader = readFileSync(new URL("../components/hourglass.tsx", import.meta.url), "utf8");
  assert.match(reader, /16,12 104,12 60,110 104,208 16,208 60,110/);
  assert.equal(GLASS.outline, "16,12 104,12 60,110 104,208 16,208 60,110");
  const pts = GLASS.outline.split(" ");
  assert.equal(pts.length, 6);
  assert.equal(pts[2], pts[5]);
  assert.equal(GLASS.upper.apexY - GLASS.upper.top, GLASS.lower.bottom - GLASS.lower.apexY);
  assert.match(GLASS_UPPER_CLIP, /22,22 98,22 60,108/);
  assert.match(GLASS_LOWER_CLIP, /60,112/);
  assert.equal(GLASS.viewW, 120);
  assert.equal(GLASS.viewH, 220);
});

test("stippled sand tracks the score: 0 on top, 100 on the bottom, 50 split", () => {
  const turned = sandGrains(0);
  assert.ok(turned.some((grain) => grain.id.startsWith("upper")));
  assert.equal(turned.some((grain) => grain.id.startsWith("lower")), false);
  const full = sandHeight(turned.filter((grain) => grain.id.startsWith("upper")));
  assert.ok(full > 60, `expected a full upper bulb, got ${full}`);

  const read = sandGrains(100);
  assert.equal(read.some((grain) => grain.id.startsWith("upper")), false);
  assert.ok(read.some((grain) => grain.id.startsWith("lower")));
  assert.ok(Math.abs(sandHeight(read.filter((grain) => grain.id.startsWith("lower"))) - full) < 8);

  const running = sandGrains(50);
  const upper = sandHeight(running.filter((grain) => grain.id.startsWith("upper")));
  const lower = sandHeight(running.filter((grain) => grain.id.startsWith("lower")));
  assert.ok(Math.abs(upper - full / 2) < 12, `upper ${upper}`);
  assert.ok(Math.abs(lower - full / 2) < 12, `lower ${lower}`);
  assert.ok(running.some((grain) => grain.id.startsWith("neck")));

  const nearly = sandGrains(80);
  const nearlyUpper = sandHeight(nearly.filter((grain) => grain.id.startsWith("upper")));
  const nearlyLower = sandHeight(nearly.filter((grain) => grain.id.startsWith("lower")));
  assert.ok(nearlyLower > nearlyUpper * 2, `lower ${nearlyLower} upper ${nearlyUpper}`);
  assert.equal(sandGrains(Number.NaN).length, 0);
});

test("grain is ink, and contributor colors stay on the rows", () => {
  const bands = sandBands(scoredParts);
  assert.equal(bands.some((band) => band.id === "rhythm"), false);
  assert.deepEqual(
    bands.map((band) => band.color),
    ["immersion", "return", "range", "restfulness", "connection"].map((id) => SCORE_SAND_COLOR[id as keyof typeof SCORE_SAND_COLOR]),
  );
  assert.equal(SCORE_SAND_COLOR.immersion, "var(--color-forest)");
  assert.equal(SCORE_SAND_COLOR.return, "var(--color-blue)");
  assert.equal(SCORE_SAND_COLOR.range, "var(--color-red)");
  assert.equal(SCORE_SAND_COLOR.restfulness, "var(--color-ink)");
  assert.equal(SCORE_SAND_COLOR.connection, "var(--color-navy)");
  const glass = readFileSync(new URL("../components/score-hourglass.tsx", import.meta.url), "utf8");
  assert.match(glass, /<circle/);
  assert.match(glass, /fill="currentColor"/);
  assert.doesNotMatch(glass, /SCORE_TRACK|paper-deep/);
  const weightSum = bands.reduce((sum, band) => sum + band.weight, 0);
  assert.equal(weightSum, 80);
  assert.equal(CONTRIBUTOR_WEIGHTS.rhythm, 20);
});

test("a scored day shows the number under the glass and keeps the score word", () => {
  const copy = hourglassCopy({
    kind: "reading",
    total: 83,
    label: "Settled",
    hide: false,
    paused: false,
    learning: false,
    scored: true,
  });
  assert.equal(copy.state, "scored");
  assert.equal(copy.sand, 83);
  assert.equal(copy.primary, "83");
  assert.equal(copy.secondary, "Settled");
  assert.equal(copy.aria, "Reading score 83, Settled");
});

test("a short day shows its number, never Quick visit", () => {
  const copy = hourglassCopy({
    kind: "quick-visit",
    total: 4,
    label: "Light",
    hide: false,
    paused: false,
    learning: false,
    scored: true,
  });
  assert.equal(copy.primary, "4");
  assert.equal(copy.sand, 4);
  assert.notEqual(copy.primary, "Quick visit");
  assert.equal(copy.secondary, "Light");
});

test("still learning keeps the number and names the state under it", () => {
  const copy = hourglassCopy({
    kind: "reading",
    total: 64,
    label: "Present",
    hide: false,
    paused: false,
    learning: true,
    scored: true,
  });
  assert.equal(copy.state, "learning");
  assert.equal(copy.sand, 64);
  assert.equal(copy.primary, "64");
  assert.equal(copy.secondary, "Still learning");
  assert.match(copy.aria, /Still learning/);
});

test("a reading day with nothing scored yet still shows a low number", () => {
  const copy = hourglassCopy({
    kind: "reading",
    total: 0,
    label: "Light",
    hide: false,
    paused: false,
    learning: true,
    scored: false,
  });
  assert.equal(copy.state, "learning");
  assert.equal(copy.sand, 1);
  assert.equal(copy.primary, "1");
  assert.equal(copy.secondary, "Still learning");
});

test("no reading shows a low number, not a numberless Rest", () => {
  const copy = hourglassCopy({
    kind: "rest",
    total: 1,
    label: "Light",
    hide: false,
    paused: false,
    learning: false,
    scored: false,
  });
  assert.equal(copy.sand, 1);
  assert.equal(copy.primary, "1");
  assert.equal(copy.secondary, "Light");
  assert.match(copy.aria, /Reading score 1/);
  assert.notEqual(copy.primary, "Rest");
});

test("hiding the score keeps the sand and swaps the number for the word", () => {
  const copy = hourglassCopy({
    kind: "reading",
    total: 81,
    label: "Settled",
    hide: true,
    paused: false,
    learning: false,
    scored: true,
  });
  assert.equal(copy.sand, 81);
  assert.equal(copy.primary, "Settled");
  assert.equal(copy.secondary, null);
});

test("pause replaces the word, not a visible number", () => {
  const pausedVisit = hourglassCopy({
    kind: "rest",
    total: 1,
    label: "Light",
    hide: false,
    paused: true,
    learning: false,
    scored: false,
  });
  assert.equal(pausedVisit.primary, "Paused");
  assert.equal(pausedVisit.sand, null);
  const pausedScore = hourglassCopy({
    kind: "reading",
    total: 90,
    label: "Deep",
    hide: false,
    paused: true,
    learning: false,
    scored: true,
  });
  assert.equal(pausedScore.primary, "90");
  assert.equal(pausedScore.sand, 90);
  assert.equal(pausedScore.aria, "Scoring is paused");
});

test("settle runs once for about 600ms and eases from empty-bottom to the score", () => {
  assert.equal(SETTLE_MS, 600);
  assert.equal(easeSettle(0), 0);
  assert.equal(easeSettle(1), 1);
  assert.ok(easeSettle(0.5) > 0.5);
  const early = 80 * easeSettle(0.2);
  const late = 80 * easeSettle(0.8);
  assert.ok(early < late);
  assert.ok(late < 80);
});

test("You renders a small stippled hourglass and does not draw the ring", () => {
  const page = readFileSync(new URL("../components/you-reading.tsx", import.meta.url), "utf8");
  const glass = readFileSync(new URL("../components/score-hourglass.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(page, /<ScoreHourglass /);
  assert.doesNotMatch(page, /<circle/);
  assert.doesNotMatch(page, /strokeDasharray/);
  assert.doesNotMatch(page, /ScoreRing/);
  assert.doesNotMatch(glass, /h-52 w-52/);
  assert.match(glass, /type-title/);
  assert.match(glass, /prefers-reduced-motion/);
  assert.match(glass, /SETTLE_MS/);
  assert.match(glass, /sandGrains/);
  assert.match(css, /\.score-glass-svg\s*\{[^}]*height:\s*6\.5rem/);
  assert.doesNotMatch(css, /\.score-glass-svg\s*\{[^}]*height:\s*10rem/);
  assert.match(css, /\.score-glass-label\s*\{/);
  for (const id of CONTRIBUTOR_IDS) {
    assert.ok(SCORE_SAND_COLOR[id].startsWith("var(--color-"));
  }
});

test("polygon area of a triangle matches base times height over two", () => {
  const area = polygonArea(GLASS_UPPER_CLIP);
  const base = GLASS.upper.right - GLASS.upper.left;
  const height = GLASS.upper.apexY - GLASS.upper.top;
  assert.ok(Math.abs(area - (base * height) / 2) < 1, `area ${area}`);
});

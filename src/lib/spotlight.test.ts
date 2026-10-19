import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cutsForWork, stopsForWork } from "./catalog/merge-stop-index.ts";
import { assembleWork } from "./import/assemble.ts";
import { phoneBlockLimit, phoneLineMeasure, PHONE_LINE_PX, type DisplayKind } from "./display-blocks.ts";
import {
  markSpotlight,
  passageEndsAtStop,
  type GroupsAt,
  placeOf,
  repeatSpotlight,
  SPOTLIGHT_LINE_SLOP,
  SPOTLIGHT_MAX_LINES,
  SPOTLIGHT_MIN_LINES,
  spotlightGroups,
  spotlightKey,
  spotlightLineCap,
  spotlightNear,
  stepSpotlight,
  type SpotlightGroup,
  type SpotlightPlace,
} from "./spotlight.ts";

const measure = phoneLineMeasure;
const line = PHONE_LINE_PX;
const limit = phoneBlockLimit();

function linesOf(sample: string) {
  return measure(sample) / line;
}

function assertGroupFits(group: SpotlightGroup) {
  const height = measure(group.sample);
  assert.ok(height <= limit + 0.5, `group is ${height}px, past ${limit}px: ${group.sample.slice(0, 80)}`);
  assert.ok(
    linesOf(group.sample) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP + 0.02,
    `group is ${linesOf(group.sample).toFixed(2)} lines: ${group.sample.slice(0, 80)}`,
  );
  assert.ok(!group.sample.includes("\u0000"));
}

/** A sentence of about `lines` phone lines, built from a repeated word. */
function sentenceOf(lines: number, word = "alpha") {
  const target = Math.max(1, lines) * 29.5 - 4;
  let text = "";
  let n = 0;
  while (text.trim().length < target) {
    text += `${word}${n} `;
    n += 1;
  }
  return `${text.trim()}.`;
}

test("short sentences in one paragraph merge while they stay within four lines", () => {
  const text = "Alpha one. Beta two. Gamma three.";
  const groups = spotlightGroups([{ index: 4, text }], measure, limit, line);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.index, 4);
  assert.equal(groups[0]!.cursor, 0);
  assert.equal(groups[0]!.window, 0);
  assert.equal(groups[0]!.endCursor, 3);
  assert.match(groups[0]!.sample, /Alpha one/);
  assert.match(groups[0]!.sample, /Gamma three/);
  assert.ok(linesOf(groups[0]!.sample) >= 1);
  assert.ok(linesOf(groups[0]!.sample) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  assertGroupFits(groups[0]!);
});

test("a passage does not merge across a sit or ritual stop", () => {
  const later = sentenceOf(2, "three");
  const breaths = [
    { index: 0, text: sentenceOf(2, "one") },
    { index: 1, text: "Two." },
    { index: 2, text: later },
  ];
  const open = spotlightGroups(breaths, measure, limit, line);
  assert.ok(open.some((group) => group.index <= 1 && group.endIndex > 1), "the fixture did not merge across the stop");
  const stopped = spotlightGroups(breaths, measure, limit, line, "prose", new Set([1]));
  assert.equal(passageEndsAtStop(stopped, 1, "Two.".length), null);
  assert.equal(stopped[0]!.endIndex, 1);
  assert.match(stopped[0]!.sample, /Two\./);
  assert.equal(stopped[1]!.index, 2);
  assert.ok(stopped.every((group) => group.index > 1 || group.endIndex <= 1));
});

test("a short fragment does not take the sentence after a stop", () => {
  const first = "Hi.";
  const second = "The spare key stayed under the third stair where the landlord had hidden it.";
  assert.ok(linesOf(first) < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP, `fragment measured ${linesOf(first).toFixed(2)} lines`);
  assert.ok(
    linesOf(second) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP,
    `next sentence measured ${linesOf(second).toFixed(2)} lines`,
  );
  const stacked = linesOf(first) + linesOf(second);
  assert.ok(stacked <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `stacked pair measured ${stacked.toFixed(2)} lines`);
  assert.ok(stacked * line <= limit + 0.5, `stacked pair measured ${stacked * line}px`);
  const breaths = [
    { index: 4, text: first },
    { index: 5, text: second },
  ];
  const open = spotlightGroups(breaths, measure, limit, line);
  assert.equal(open.length, 1);
  assert.equal(open[0]!.endIndex, 5);
  assert.match(open[0]!.sample, /spare key/);
  const stopped = spotlightGroups(breaths, measure, limit, line, "prose", new Set([4]));
  assert.equal(passageEndsAtStop(stopped, 4, first.length), null);
  assert.equal(stopped[0]!.sample, first);
  assert.equal(stopped[0]!.endIndex, 4);
  assert.equal(stopped[1]!.index, 5);
  assert.doesNotMatch(stopped[0]!.sample, /spare/);
});

test("a sit that ends inside a longer breath does not take the next sentence", () => {
  const text = "The air of Naples generates legend. Go now.";
  const cut = text.indexOf("Go now");
  assert.ok(cut > "legend.".length);
  const breaths = [
    { index: 1, text },
    { index: 2, text: "The next breath starts here." },
  ];
  const open = spotlightGroups(breaths, measure, limit, line);
  assert.notEqual(passageEndsAtStop(open, 1, cut), null);
  const stopped = spotlightGroups(breaths, measure, limit, line, "prose", new Set([1]), new Map([[1, cut]]));
  assert.equal(passageEndsAtStop(stopped, 1, cut), null);
  const finisher = stopped.find((group) => group.parts.some((part) => part.index === 1 && part.end === cut));
  assert.ok(finisher);
  assert.match(finisher.sample, /generates legend/);
  assert.doesNotMatch(finisher.sample, /Go now/);
  assert.ok(stopped.some((group) => group.sample.includes("Go now")));
});

test("sentences inside a stop still merge, and the following breath stays out", () => {
  const text = "Alpha one. Beta two. Gamma three stays here.";
  const next = "The next paragraph starts after the stop.";
  const breaths = [
    { index: 8, text },
    { index: 9, text: next },
  ];
  const groups = spotlightGroups(breaths, measure, limit, line, "prose", new Set([8]));
  assert.equal(passageEndsAtStop(groups, 8, text.length), null);
  const finisher = groups.find((group) => group.parts.some((part) => part.index === 8 && part.end === text.length));
  assert.ok(finisher);
  assert.match(finisher!.sample, /Alpha one/);
  assert.match(finisher!.sample, /Gamma three/);
  assert.equal(finisher!.endIndex, 8);
  const after = groups.find((group) => group.index === 9);
  assert.ok(after);
  assert.match(after!.sample, /next paragraph/);
});

test("a one-line sentence takes the next sentence in the same paragraph when the pair stays within four lines", () => {
  const tiny = "Hi.";
  const next = "The landlord chuckled and said the room was ready for one.";
  const groups = spotlightGroups([{ index: 0, text: `${tiny} ${next}` }], measure, limit, line);
  assert.ok(groups.length >= 1);
  assert.match(groups[0]!.sample, /^Hi\./);
  assert.match(groups[0]!.sample, /landlord/);
  assert.ok(linesOf(tiny) < 2);
  assertGroupFits(groups[0]!);
});

test("a long sentence with no internal pause steps on word boundaries, two to four lines at a time", () => {
  const words = Array.from({ length: 90 }, (_, i) => `word${i}`);
  const text = `${words.join(" ")}.`;
  const groups = spotlightGroups([{ index: 2, text }], measure, limit, line);
  assert.ok(groups.length > 1, "a ninety-word sentence stayed one tap");
  const seen = groups.map((group) => group.sample).join(" ");
  for (const word of words) assert.match(seen, new RegExp(`\\b${word}\\b`));
  for (const group of groups) {
    assert.equal(group.index, 2);
    assert.equal(group.cursor, 0);
    assert.equal(group.endCursor, 1);
    assertGroupFits(group);
    assert.ok(linesOf(group.sample) <= spotlightLineCap(line) / line + 0.05);
    const parts = group.sample.trim().split(/\s+/);
    assert.ok(parts.every((part) => words.includes(part.replace(/\.$/, "")) || part.endsWith(".")));
  }
  const windows = groups.map((group) => group.window);
  assert.deepEqual(windows, windows.map((_, i) => i));
  assert.equal(groups.map((group) => group.sample).join(""), text);
  for (const group of groups) {
    assert.ok(
      linesOf(group.sample) >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP - 0.05,
      `window is ${linesOf(group.sample).toFixed(2)} lines: ${group.sample.slice(0, 40)}`,
    );
  }
});

test("one tap moves one group, and the way back does not skip", () => {
  const breaths = [0, 1, 2, 3, 4, 5].map((index) => ({
    index,
    text: "One two three four.",
  }));
  const groups = spotlightGroups(breaths, measure, limit, line);
  assert.ok(groups.length >= 2);
  assert.ok(groups[0]!.endIndex > groups[0]!.index, "short breaths did not merge");
  for (const group of groups) {
    let height = 0;
    for (const part of group.parts) {
      const breath = breaths.find((item) => item.index === part.index);
      height += measure((breath?.text ?? "").slice(part.start, part.end));
    }
    assert.ok(height <= limit + 0.5, `stacked group is ${height}px: ${group.sample}`);
    assert.ok(
      height / line <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP + 0.05,
      `stacked group is ${(height / line).toFixed(2)} lines`,
    );
  }
  const groupsAt = () => groups;
  let place: SpotlightPlace = placeOf(groups[0]!);
  const forward: string[] = [spotlightKey(place)];
  for (let i = 0; i < groups.length - 1; i += 1) {
    const moved = stepSpotlight({ place, delta: 1, groupsAt, breathCount: 6 });
    assert.notEqual(moved, "start");
    assert.notEqual(moved, "end");
    if (moved === "start" || moved === "end") break;
    const key = spotlightKey(moved);
    assert.notEqual(key, forward[forward.length - 1]);
    forward.push(key);
    place = moved;
  }
  assert.equal(forward.length, groups.length);
  for (let i = forward.length - 1; i > 0; i -= 1) {
    const moved = stepSpotlight({ place, delta: -1, groupsAt, breathCount: 6 });
    assert.notEqual(moved, "start");
    if (moved === "start" || moved === "end") break;
    assert.equal(spotlightKey(moved), forward[i - 1]);
    place = moved;
  }
  if (groups.length > 2) {
    const skipped = repeatSpotlight(placeOf(groups[0]!), 1, 2, groupsAt, 6);
    assert.notEqual(skipped, "start");
    assert.notEqual(skipped, "end");
    if (skipped !== "start" && skipped !== "end") {
      assert.equal(spotlightKey(skipped), spotlightKey(placeOf(groups[2]!)));
    }
  }
});

test("progress stays on the first sentence of the group", () => {
  const text = "One. Two. Three. Four. Five. Six.";
  const groups = spotlightGroups([{ index: 8, text }], measure, limit, line);
  for (const group of groups) {
    assert.equal(group.index, 8);
    assert.ok(group.cursor >= 0);
    assert.equal(placeOf(group).cursor, group.cursor);
    assert.equal(placeOf(group).window, group.window);
  }
});

test("sentences in one paragraph keep merging until the next would pass four lines", () => {
  const sentence = sentenceOf(2, "amber");
  assert.ok(linesOf(sentence) >= 2 && linesOf(sentence) <= 2.2, `sentence is ${linesOf(sentence)} lines`);
  const pair = `${sentence} ${sentence}`;
  const triple = `${sentence} ${sentence} ${sentence}`;
  assert.ok(linesOf(pair) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  assert.ok(linesOf(triple) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const merged = spotlightGroups([{ index: 0, text: pair }], measure, limit, line);
  assert.equal(merged.length, 1);
  assert.match(merged[0]!.sample, /amber0/);
  const stopped = spotlightGroups([{ index: 0, text: triple }], measure, limit, line);
  assert.equal(stopped.length, 2);
  assert.equal(stopped.map((group) => group.sample).join(""), triple);
  assert.ok(linesOf(stopped[0]!.sample) >= SPOTLIGHT_MIN_LINES);
  assert.ok(linesOf(stopped[0]!.sample) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  assert.match(stopped[1]!.sample, /amber/);
  assertGroupFits(stopped[0]!);
  assertGroupFits(stopped[1]!);
});

test("a two-line passage does not merge across a paragraph break", () => {
  const sentence = sentenceOf(2, "birch");
  assert.ok(linesOf(sentence) >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
  const groups = spotlightGroups(
    [
      { index: 0, text: sentence },
      { index: 1, text: sentence },
    ],
    measure,
    limit,
    line,
  );
  assert.equal(groups.length, 2);
  assert.equal(groups[0]!.endIndex, 0);
  assert.equal(groups[1]!.index, 1);
  assert.equal(groups[0]!.sample, sentence);
});

test("a one-line sentence crosses a paragraph when the pair stays within four lines", () => {
  const next = sentenceOf(2, "cedar");
  const stacked = linesOf("Hi.") + linesOf(next);
  assert.ok(linesOf("Hi.") < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
  assert.ok(stacked <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `stacked ${stacked}`);
  const groups = spotlightGroups(
    [
      { index: 3, text: "Hi." },
      { index: 4, text: next },
    ],
    measure,
    limit,
    line,
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.index, 3);
  assert.equal(groups[0]!.endIndex, 4);
  assert.match(groups[0]!.sample, /Hi\./);
  assert.match(groups[0]!.sample, /cedar/);
  assertGroupFits(groups[0]!);
});

test("a one-line sentence rebalances when the next sentence would pass four lines", () => {
  const next = sentenceOf(4, "damson").replace(/^./u, (letter) => letter.toUpperCase());
  const stacked = linesOf("Hi.") + linesOf(next);
  assert.ok(stacked > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `stacked ${stacked}`);
  const breaths = [
    { index: 0, text: `Hi. ${next}` },
    { index: 1, text: "Hi." },
    { index: 2, text: next },
  ];
  const groups = spotlightGroups(breaths, measure, limit, line);
  for (const breath of breaths) {
    const parts = groups.flatMap((group) => group.parts.filter((part) => part.index === breath.index));
    assert.ok(parts.length > 0, `missing breath ${breath.index}`);
    let at = 0;
    for (const part of parts) {
      assert.equal(part.start, at, breath.text.slice(Math.max(0, at - 12), at + 12));
      at = part.end;
    }
    assert.equal(at, breath.text.length);
  }
  for (const group of groups) {
    let height = 0;
    for (const part of group.parts) {
      const text = breaths.find((breath) => breath.index === part.index)?.text ?? "";
      height += measure(text.slice(part.start, part.end));
    }
    assert.ok(height / line >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP, `window is ${(height / line).toFixed(2)} lines: ${group.sample.slice(0, 48)}`);
    assert.ok(height / line <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP + 0.05, group.sample.slice(0, 48));
    assertGroupFits(group);
  }
  assert.ok(groups.some((group) => group.sample.includes("Hi.")));
  assert.ok(groups.every((group) => group.sample.trim() !== "Hi."));
});

test("a one-line sentence moves back when the previous window has room", () => {
  const prev = sentenceOf(2, "prior");
  const tiny = "He was a remarkable man!";
  const next = sentenceOf(4, "later");
  assert.ok(linesOf(tiny) < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
  assert.ok(linesOf(prev) + linesOf(tiny) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  assert.ok(linesOf(tiny) + linesOf(next) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const groups = spotlightGroups(
    [
      { index: 0, text: prev },
      { index: 1, text: tiny },
      { index: 2, text: next },
    ],
    measure,
    limit,
    line,
  );
  const home = groups.find((group) => group.sample.includes("remarkable"));
  assert.ok(home);
  assert.match(home!.sample, /prior/);
  assert.doesNotMatch(home!.sample, /later/);
  assert.equal(home!.index, 0);
  assert.equal(home!.endIndex, 1);
  for (const group of groups) assertGroupFits(group);
});

test("a one-line sentence breaks the next sentence at a comma when the previous window is full", () => {
  const prev = sentenceOf(4, "full");
  const tiny = "He was a remarkable man!";
  const head = sentenceOf(2, "angle").replace(/\.$/, "");
  const tail = sentenceOf(2, "fish").replace(/\.$/, "");
  const next = `${head}, ${tail}.`;
  assert.ok(linesOf(prev) + linesOf(tiny) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  assert.ok(linesOf(tiny) + linesOf(next) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const breaths = [
    { index: 0, text: prev },
    { index: 1, text: tiny },
    { index: 2, text: next },
  ];
  const groups = spotlightGroups(breaths, measure, limit, line);
  const home = groups.find((group) => group.sample.includes("remarkable"));
  assert.ok(home);
  assert.match(home!.sample, /angle/);
  assert.match(home!.sample, /,\s*$/);
  assert.doesNotMatch(home!.sample, /fish/);
  assert.doesNotMatch(home!.sample, /full/);
  const parts = groups.flatMap((group) => group.parts.filter((part) => part.index === 2));
  let at = 0;
  for (const part of parts) {
    assert.equal(part.start, at);
    at = part.end;
  }
  assert.equal(at, next.length);
  for (const group of groups) {
    let height = 0;
    for (const part of group.parts) {
      const text = breaths.find((breath) => breath.index === part.index)?.text ?? "";
      height += measure(text.slice(part.start, part.end));
    }
    assert.ok(height / line >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP, group.sample.slice(0, 48));
    assertGroupFits(group);
  }
});

test("a borrowed opening still steps back onto that same window", () => {
  const tiny = "He was a remarkable man!";
  const head = sentenceOf(2, "angle").replace(/\.$/, "");
  const tail = sentenceOf(2, "fish").replace(/\.$/, "");
  const after = sentenceOf(2, "later");
  const text = `${tiny} ${head}, ${tail}. ${after}`;
  const breaths = [
    { index: 4, text },
    { index: 5, text: sentenceOf(2, "next") },
  ];
  const full = spotlightGroups(breaths, measure, limit, line);
  assert.ok(full.some((group) => group.window > 0), full.map((group) => spotlightKey(placeOf(group))).join(" "));
  const lazy: GroupsAt = (index, query) =>
    spotlightNear(
      breaths,
      { index, cursor: query?.cursor ?? 0, window: query?.window ?? 0 },
      measure,
      limit,
      line,
      "prose",
      undefined,
      undefined,
      query?.edge ?? "around",
      query?.after ?? 1,
    );
  let place = placeOf(full[0]!);
  for (let i = 0; i < full.length; i += 1) {
    assert.equal(spotlightKey(place), spotlightKey(placeOf(full[i]!)));
    if (i === full.length - 1) break;
    const forward = stepSpotlight({ place, delta: 1, groupsAt: lazy, breathCount: breaths.length });
    assert.equal(spotlightKey(forward as SpotlightPlace), spotlightKey(placeOf(full[i + 1]!)));
    const back = stepSpotlight({ place: forward as SpotlightPlace, delta: -1, groupsAt: lazy, breathCount: breaths.length });
    assert.equal(spotlightKey(back as SpotlightPlace), spotlightKey(place), `back from ${spotlightKey(forward as SpotlightPlace)}`);
    place = forward as SpotlightPlace;
  }
});

test("a one-line sentence at the end of the chapter stays alone when nothing precedes it", () => {
  const groups = spotlightGroups([{ index: 6, text: "Hi." }], measure, limit, line);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.sample, "Hi.");
  assert.equal(groups[0]!.endIndex, 6);
});

test("a one-line chapter ending folds into the window before it", () => {
  const prev = sentenceOf(3, "prior");
  const tiny = "Hi.";
  assert.ok(linesOf(tiny) < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
  assert.ok(linesOf(prev) + linesOf(tiny) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const groups = spotlightGroups(
    [
      { index: 0, text: prev },
      { index: 1, text: tiny },
    ],
    measure,
    limit,
    line,
  );
  assert.equal(groups.length, 1);
  assert.match(groups[0]!.sample, /prior0/);
  assert.match(groups[0]!.sample, /Hi\./);
  assert.equal(groups[0]!.index, 0);
  assert.equal(groups[0]!.endIndex, 1);
  assertGroupFits(groups[0]!);
});

test("a one-row sentence still ahead folds into the painted window", () => {
  const breaths = [
    { index: 0, text: "Hi one." },
    { index: 1, text: "Hi two." },
    { index: 2, text: "Hi three." },
  ];
  for (const breath of breaths) {
    assert.ok(linesOf(breath.text) < SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
  }
  const countRows = () => 1;
  const near = (index: number, query?: { cursor?: number; window?: number; edge?: "around" | "first" | "last"; after?: number }) =>
    spotlightNear(
      breaths,
      { index, cursor: query?.cursor ?? 0, window: query?.window ?? 0 },
      measure,
      limit,
      line,
      "prose",
      undefined,
      undefined,
      query?.edge ?? "around",
      query?.after ?? 1,
      countRows,
    );
  const painted = near(0, { edge: "around", after: 0 });
  assert.match(painted.map((group) => group.sample).join(" "), /Hi three/);
  const stepped = repeatSpotlight({ index: 0, cursor: 0, window: 0 }, 1, 1, near, breaths.length);
  if (stepped !== "end" && stepped !== "start") {
    assert.match(near(stepped.index, { edge: "around", after: 0 }).map((group) => group.sample).join(" "), /Hi three/);
  }
});

test("a one-line chapter ending splits when the fold would pass four rows", () => {
  const prev = sentenceOf(4, "full");
  const tiny = "Hi.";
  assert.ok(linesOf(prev) + linesOf(tiny) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const breaths = [
    { index: 0, text: prev },
    { index: 1, text: tiny },
  ];
  const groups = spotlightGroups(breaths, measure, limit, line);
  assert.ok(groups.length >= 2);
  assert.match(groups[groups.length - 1]!.sample, /Hi\./);
  assert.equal(groups.map((group) => group.sample).join("").includes(tiny), true);
  for (const breath of breaths) {
    const parts = groups.flatMap((group) => group.parts.filter((part) => part.index === breath.index));
    let at = 0;
    for (const part of parts) {
      assert.equal(part.start, at);
      at = part.end;
    }
    assert.equal(at, breath.text.length);
  }
  for (const group of groups) {
    assert.ok(
      linesOf(group.sample) >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP,
      `window is ${linesOf(group.sample).toFixed(2)} lines: ${group.sample.slice(0, 48)}`,
    );
    assert.ok(
      linesOf(group.sample) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP + 0.02,
      `window is ${linesOf(group.sample).toFixed(2)} lines: ${group.sample.slice(0, 48)}`,
    );
    assertGroupFits(group);
  }
});

test("a sentence inside four lines stays whole", () => {
  const text = sentenceOf(4, "elder");
  assert.ok(linesOf(text) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `measured ${linesOf(text)}`);
  assert.ok(linesOf(text) >= SPOTLIGHT_MAX_LINES - 1);
  const groups = spotlightGroups([{ index: 1, text }], measure, limit, line);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.sample, text);
  assert.equal(groups[0]!.window, 0);
});

test("a sentence longer than four lines prefers a semicolon, colon, or em dash", () => {
  const head = sentenceOf(3, "fir").replace(/\.$/, "");
  const tail = sentenceOf(3, "gum").replace(/\.$/, "");
  assert.ok(linesOf(head) >= 2 && linesOf(head) <= 4);
  for (const pause of [";", ":", "\u2014"] as const) {
    const text = `${head}${pause} ${tail}.`;
    assert.ok(linesOf(text) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `${pause} total ${linesOf(text)}`);
    const groups = spotlightGroups([{ index: 0, text }], measure, limit, line);
    assert.ok(groups.length >= 2, pause);
    assert.equal(groups.map((group) => group.sample).join(""), text);
    assert.match(groups[0]!.sample, new RegExp(`${pause}\\s*$`));
    assert.match(groups[1]!.sample, /^gum/);
    assert.doesNotMatch(groups[0]!.sample, /gum/);
    for (const group of groups) {
      assert.ok(linesOf(group.sample) >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
      assertGroupFits(group);
    }
  }
});

test("a comma before a conjunction beats a later comma", () => {
  const head = sentenceOf(2, "hazel").replace(/\.$/, "");
  const mid = sentenceOf(2, "ivy").replace(/\.$/, "");
  const tail = sentenceOf(3, "juniper").replace(/\.$/, "");
  const text = `${head}, and ${mid}, ${tail}.`;
  assert.ok(linesOf(text) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const groups = spotlightGroups([{ index: 0, text }], measure, limit, line);
  assert.ok(groups.length >= 2);
  assert.match(groups[0]!.sample, /,\s*$/);
  assert.doesNotMatch(groups[0]!.sample, /\band\b/);
  assert.match(groups[1]!.sample, /^and\b/);
  assert.equal(groups.map((group) => group.sample).join(""), text);
});

test("a comma beats a word boundary when no stronger pause is in the window", () => {
  const head = sentenceOf(3, "kelp").replace(/\.$/, "");
  const tail = sentenceOf(3, "larch").replace(/\.$/, "");
  const text = `${head}, ${tail}.`;
  assert.ok(linesOf(text) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  const groups = spotlightGroups([{ index: 0, text }], measure, limit, line);
  assert.equal(groups.length, 2);
  assert.match(groups[0]!.sample, /,\s*$/);
  assert.match(groups[1]!.sample, /^larch/);
  assert.equal(groups.map((group) => group.sample).join(""), text);
  for (const group of groups) assertGroupFits(group);
});

test("a sentence end inside a long quotation beats a comma", () => {
  const head = sentenceOf(3, "maple").replace(/\.$/, "");
  const tail = sentenceOf(3, "nutmeg").replace(/\.$/, "").replace(/^./u, (letter) => letter.toUpperCase());
  const text = `\u201C${head}. ${tail}, and the thought finishes here.\u201D`;
  assert.ok(linesOf(text) > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `quote is ${linesOf(text)} lines`);
  const groups = spotlightGroups([{ index: 0, text }], measure, limit, line);
  assert.ok(groups.length >= 2);
  assert.match(groups[0]!.sample, /maple/);
  assert.match(groups[0]!.sample, /\.\s*$/);
  assert.doesNotMatch(groups[0]!.sample, /nutmeg/);
  assert.match(groups[1]!.sample, /^Nutmeg/);
  assert.equal(groups.map((group) => group.sample).join(""), text);
});

test("a long sentence avoids leaving a one-line remnant", () => {
  const early = sentenceOf(2, "oak").replace(/\.$/, "");
  const late = sentenceOf(2, "pine").replace(/\.$/, "");
  const remnant = sentenceOf(1, "quince").replace(/\.$/, "");
  const text = `${early}, ${late}, ${remnant}.`;
  const whole = linesOf(text);
  assert.ok(whole > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `whole is ${whole} lines`);
  const groups = spotlightGroups([{ index: 0, text }], measure, limit, line);
  assert.equal(groups.map((group) => group.sample).join(""), text);
  for (const group of groups) {
    assert.ok(
      linesOf(group.sample) >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP,
      `piece is ${linesOf(group.sample).toFixed(2)} lines: ${group.sample.slice(0, 48)}`,
    );
    assertGroupFits(group);
  }
  assert.ok(groups.length >= 2);
  assert.ok(linesOf(groups[groups.length - 1]!.sample) >= SPOTLIGHT_MIN_LINES - SPOTLIGHT_LINE_SLOP);
});

test("a split never falls in the middle of a word", () => {
  const text = `${Array.from({ length: 40 }, () => "unbreakable").join(" ")}.`;
  const groups = spotlightGroups([{ index: 0, text }], measure, limit, line);
  assert.ok(groups.length > 1);
  assert.equal(groups.map((group) => group.sample).join(""), text);
  for (const group of groups) {
    const trimmed = group.sample.trim();
    assert.match(trimmed, /^unbreakable\b/);
    assert.match(trimmed, /unbreakable\.?$/);
    assert.ok(trimmed.split(/\s+/).every((part) => part === "unbreakable" || part === "unbreakable."));
    assertGroupFits(group);
  }
});

test("markSpotlight keeps past and ahead and joins back to the block", () => {
  const text = "Past words stay dim. Focus words stay lit. Ahead words stay soft.";
  const blocks = [{ text, sentences: 3 }];
  const focus = "Focus words stay lit. ";
  const start = text.indexOf(focus);
  const marks = markSpotlight(text, blocks, { start, end: start + focus.length });
  assert.equal(marks.length, 1);
  const joined = marks[0]!.map((piece) => piece.text).join("");
  assert.equal(joined, text);
  assert.deepEqual(
    marks[0]!.map((piece) => piece.role),
    ["past", "focus", "ahead"],
  );
});

function samePlace(a: SpotlightGroup, b: SpotlightGroup) {
  assert.equal(spotlightKey(placeOf(a)), spotlightKey(placeOf(b)));
  assert.equal(a.endIndex, b.endIndex);
  assert.equal(a.endCursor, b.endCursor);
  assert.equal(a.sample, b.sample);
}

test("a place grouped on its own matches the chapter, including the step each way", () => {
  const breaths = [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({
    index,
    text: index % 3 === 0 ? sentenceOf(6, `long${index}`) : sentenceOf(1, `short${index}`),
  }));
  const full = spotlightGroups(breaths, measure, limit, line);
  assert.ok(full.length > 4);
  const lazy: GroupsAt = (index, query) =>
    spotlightNear(
      breaths,
      { index, cursor: query?.cursor ?? 0, window: query?.window ?? 0 },
      measure,
      limit,
      line,
      "prose",
      undefined,
      undefined,
      query?.edge ?? "around",
      query?.after ?? 1,
    );
  let place = placeOf(full[0]!);
  for (let i = 0; i < full.length; i += 1) {
    const near = spotlightNear(breaths, place, measure, limit, line, "prose", undefined, undefined, "around", 1);
    const found = near.find(
      (group) => group.index === place.index && group.cursor === place.cursor && group.window === place.window,
    );
    assert.ok(found, `missing ${spotlightKey(place)}`);
    samePlace(found, full[i]!);
    if (i === full.length - 1) break;
    const moved = stepSpotlight({ place, delta: 1, groupsAt: lazy, breathCount: breaths.length });
    assert.notEqual(moved, "start");
    assert.notEqual(moved, "end");
    if (moved === "start" || moved === "end") break;
    assert.equal(spotlightKey(moved), spotlightKey(placeOf(full[i + 1]!)));
    place = moved;
  }
  for (let i = full.length - 1; i > 0; i -= 1) {
    const moved = stepSpotlight({ place, delta: -1, groupsAt: lazy, breathCount: breaths.length });
    assert.notEqual(moved, "start");
    if (moved === "start" || moved === "end") break;
    assert.equal(spotlightKey(moved), spotlightKey(placeOf(full[i - 1]!)));
    place = moved;
  }
});

test("the first window of a long sentence matches, and the rest of the sentence can wait", () => {
  const text = sentenceOf(18, "ramayan");
  const full = spotlightGroups([{ index: 4, text }], measure, limit, line, "verse");
  assert.ok(full.length > 3);
  const open = spotlightNear(
    [{ index: 4, text }],
    { index: 4, cursor: 0, window: 0 },
    measure,
    limit,
    line,
    "verse",
    undefined,
    undefined,
    "around",
    0,
  );
  assert.equal(open.length, 1);
  samePlace(open[0]!, full[0]!);
  const later = spotlightNear(
    [{ index: 4, text }],
    { index: 4, cursor: 0, window: 2 },
    measure,
    limit,
    line,
    "verse",
    undefined,
    undefined,
    "around",
    0,
  );
  const third = later.find((group) => group.window === 2);
  assert.ok(third);
  samePlace(third!, full[2]!);
  const tail = spotlightNear(
    [{ index: 4, text }],
    { index: 4, cursor: 0, window: 0 },
    measure,
    limit,
    line,
    "verse",
    undefined,
    undefined,
    "last",
    0,
  );
  assert.equal(tail.length, 1);
  samePlace(tail[0]!, full[full.length - 1]!);
});

test("opening the Ramayan groups the passage on screen, not the whole canto", () => {
  const data = JSON.parse(
    readFileSync(new URL("./catalog/texts/the-ramayan-of-valmiki.json", import.meta.url), "utf8"),
  ) as { breaths: { sceneId: string; text: string }[] };
  const book = data.breaths;
  const sceneOf = (index: number) => {
    const id = book[index]?.sceneId;
    return book.flatMap((breath, at) => (breath.sceneId === id ? [{ index: at, text: breath.text }] : []));
  };
  const scene = sceneOf(5);
  const place = { index: 5, cursor: 0, window: 0 };
  const started = performance.now();
  const near = spotlightNear(scene, place, measure, limit, line, "verse", undefined, undefined, "around", 0);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 400, `open grouped in ${elapsed.toFixed(0)}ms`);
  const fullStarted = performance.now();
  const full = spotlightGroups(scene, measure, limit, line, "verse");
  const fullElapsed = performance.now() - fullStarted;
  assert.ok(full.length > 100, `expected the canto to be many passages, got ${full.length}`);
  assert.ok(fullElapsed > elapsed * 3, `full canto ${fullElapsed.toFixed(0)}ms was not slower than the open ${elapsed.toFixed(0)}ms`);
  const found = near.find((group) => group.index === 5 && group.cursor === 0 && group.window === 0);
  assert.ok(found);
  samePlace(found!, full[0]!);
  const lazy: GroupsAt = (index, query) =>
    spotlightNear(
      sceneOf(index),
      { index, cursor: query?.cursor ?? 0, window: query?.window ?? 0 },
      measure,
      limit,
      line,
      "verse",
      undefined,
      undefined,
      query?.edge ?? "around",
      query?.after ?? 1,
    );
  let cursor = place;
  const steps = Math.min(12, full.length - 1);
  for (let i = 0; i < steps; i += 1) {
    const moved = stepSpotlight({ place: cursor, delta: 1, groupsAt: lazy, breathCount: book.length });
    assert.notEqual(moved, "start");
    assert.notEqual(moved, "end");
    if (moved === "start" || moved === "end") break;
    assert.equal(spotlightKey(moved), spotlightKey(placeOf(full[i + 1]!)), `forward ${i}`);
    cursor = moved;
  }
  const back = stepSpotlight({ place, delta: -1, groupsAt: lazy, breathCount: book.length });
  assert.notEqual(back, "start");
  assert.notEqual(back, "end");
  if (back !== "start" && back !== "end") {
    const preface = spotlightGroups(sceneOf(back.index), measure, limit, line, "verse");
    samePlace(
      preface[preface.length - 1]!,
      spotlightNear(sceneOf(back.index), back, measure, limit, line, "verse", undefined, undefined, "around", 0).find(
        (group) => spotlightKey(placeOf(group)) === spotlightKey(back),
      )!,
    );
    assert.equal(back.index, 4);
  }
});

test("sentences that would paint more than four rows stay split", () => {
  const text = "The Litany ended with the Agnus Dei. Once more all the pupils knelt, and the priest prayed.";
  const kept = spotlightGroups([{ index: 16, text }], measure, limit, line);
  assert.equal(kept.length, 1);
  const cut = text.indexOf("Once");
  const countRows = (_sample: string, start: number, end: number) => (start < cut && end > cut ? 6 : 3);
  const groups = spotlightGroups(
    [{ index: 16, text }],
    measure,
    limit,
    line,
    "prose",
    undefined,
    undefined,
    countRows,
  );
  assert.equal(groups.length, 2);
  assert.match(groups[0]!.sample, /Agnus Dei/);
  assert.doesNotMatch(groups[0]!.sample, /knelt/);
  assert.match(groups[1]!.sample, /^Once more/);
  assert.equal(groups.map((group) => group.sample).join(""), text);
});

test("rows add across breaths, and a sit stop still ends the passage", () => {
  const breaths = [
    { index: 0, text: "The Litany ended with the Agnus Dei." },
    { index: 1, text: "Once more all the pupils knelt." },
    { index: 2, text: sentenceOf(2, "three") },
  ];
  const countRows = () => 3;
  const split = spotlightGroups(breaths, measure, limit, line, "prose", undefined, undefined, countRows);
  assert.ok(split.every((group) => group.index === group.endIndex));
  const stopped = spotlightGroups(breaths, measure, limit, line, "prose", new Set([1]), undefined, () => 1);
  assert.equal(passageEndsAtStop(stopped, 1, breaths[1]!.text.length), null);
  assert.ok(stopped.every((group) => group.endIndex <= 1 || group.index > 1));
});

test("a sentence inside the height cap breaks at a semicolon, dash, or comma when it would paint a fifth row", () => {
  const head = sentenceOf(2, "litany").replace(/\.$/, "");
  const tail = sentenceOf(2, "agnus").replace(/\.$/, "");
  assert.ok(linesOf(`${head} ${tail}.`) <= SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP);
  for (const pause of [";", "\u2014", ","] as const) {
    const text = `${head}${pause} ${tail}.`;
    const at = text.indexOf(pause);
    const tailAt = text.indexOf(tail);
    const countRows = (_sample: string, start: number, end: number) => {
      const coversHead = start <= at && end > at;
      const coversTail = end > tailAt;
      return coversHead && coversTail ? 6 : 3;
    };
    const kept = spotlightGroups([{ index: 0, text }], measure, limit, line);
    assert.equal(kept.length, 1, `${pause} still fits the height cap`);
    const groups = spotlightGroups(
      [{ index: 0, text }],
      measure,
      limit,
      line,
      "prose",
      undefined,
      undefined,
      countRows,
    );
    assert.ok(groups.length >= 2, pause);
    assert.equal(groups.map((group) => group.sample).join(""), text);
    assert.match(groups[0]!.sample, new RegExp(`${pause}\\s*$`));
    assert.match(groups[1]!.sample, /^agnus/);
    for (const group of groups) {
      const end = text.indexOf(group.sample) + group.sample.length;
      const start = text.indexOf(group.sample);
      assert.ok(countRows(text, start, end) <= SPOTLIGHT_MAX_LINES);
    }
  }
});

type SampleBreath = { index: number; text: string; sceneId: string };

function navOf(
  breaths: readonly SampleBreath[],
  kind: DisplayKind = "prose",
  stops?: ReadonlySet<number>,
  cuts?: ReadonlyMap<number, number>,
) {
  const scenes = new Map<string, { index: number; text: string }[]>();
  for (const breath of breaths) {
    const list = scenes.get(breath.sceneId) ?? [];
    list.push({ index: breath.index, text: breath.text });
    scenes.set(breath.sceneId, list);
  }
  const groupsAt: GroupsAt = (index, query) => {
    const sceneId = breaths.find((breath) => breath.index === index)?.sceneId;
    const scene = (sceneId && scenes.get(sceneId)) || [];
    return spotlightNear(
      scene,
      { index, cursor: query?.cursor ?? 0, window: query?.window ?? 0 },
      measure,
      limit,
      line,
      kind,
      stops,
      cuts,
      query?.edge ?? "around",
      query?.after ?? 1,
    );
  };
  const ordered: SpotlightGroup[] = [];
  for (const scene of scenes.values()) {
    ordered.push(...spotlightGroups(scene, measure, limit, line, kind, stops, cuts));
  }
  return { groupsAt, ordered, breathCount: (breaths[breaths.length - 1]?.index ?? 0) + 1 };
}

function placeBefore(a: SpotlightPlace, b: SpotlightPlace) {
  if (a.index !== b.index) return a.index < b.index;
  if (a.cursor !== b.cursor) return a.cursor < b.cursor;
  return a.window < b.window;
}

/**
 * Walk forward one window at a time.
 * From every window k, the next right tap's left tap returns to k.
 * A left tap from that next window is the same passage.
 */
function assertReversible(label: string, breaths: readonly SampleBreath[], kind?: DisplayKind, stops?: ReadonlySet<number>, cuts?: ReadonlyMap<number, number>) {
  const { groupsAt, ordered, breathCount } = navOf(breaths, kind, stops, cuts);
  assert.ok(ordered.length > 1, `${label} has one window`);
  const widths = new Map<string, number>();
  let paragraph = false;
  let chapter = false;
  let sit = false;
  let place = placeOf(ordered[0]!);
  const seen = new Set<string>();
  for (let step = 0; step < ordered.length + 8; step += 1) {
    const key = spotlightKey(place);
    assert.equal(seen.has(key), false, `${label} repeated ${key}`);
    seen.add(key);
    const sentence = `${place.index}:${place.cursor}`;
    widths.set(sentence, (widths.get(sentence) ?? 0) + 1);
    const forward = stepSpotlight({ place, delta: 1, groupsAt, breathCount });
    if (forward === "end") break;
    assert.notEqual(forward, "start", label);
    if (forward === "start") break;
    assert.equal(placeBefore(place, forward), true, `${label} right from ${key} landed on ${spotlightKey(forward)}`);
    const back = stepSpotlight({ place: forward, delta: -1, groupsAt, breathCount });
    assert.notEqual(back, "start", `${label} left from ${spotlightKey(forward)} walked off the start`);
    assert.notEqual(back, "end", label);
    if (back === "start" || back === "end") break;
    assert.equal(
      spotlightKey(back),
      key,
      `${label} left from ${spotlightKey(forward)} landed on ${spotlightKey(back)}, one window is ${key}`,
    );
    if (forward.index !== place.index) paragraph = true;
    const fromScene = breaths.find((breath) => breath.index === place.index)?.sceneId;
    const toScene = breaths.find((breath) => breath.index === forward.index)?.sceneId;
    if (fromScene && toScene && fromScene !== toScene) chapter = true;
    if (stops && forward.index !== place.index && (stops.has(place.index) || stops.has(forward.index))) sit = true;
    place = forward;
  }
  return { widths: [...widths.values()], paragraph, chapter, sit, steps: seen.size };
}

function openingBreaths(id: string, scenes: number): SampleBreath[] {
  const work = JSON.parse(readFileSync(new URL(`./catalog/texts/${id}.json`, import.meta.url), "utf8")) as {
    breaths: { text: string; sceneId: string }[];
  };
  const want = new Set<string>();
  const breaths: SampleBreath[] = [];
  let extra: string | null = null;
  for (let index = 0; index < work.breaths.length; index += 1) {
    const breath = work.breaths[index]!;
    if (want.size < scenes) want.add(breath.sceneId);
    if (want.has(breath.sceneId)) {
      breaths.push({ index, text: breath.text, sceneId: breath.sceneId });
      continue;
    }
    if (!extra) extra = breath.sceneId;
    if (breath.sceneId !== extra) break;
    breaths.push({ index, text: breath.text, sceneId: breath.sceneId });
    break;
  }
  return breaths;
}

test("a left step into a four-window sentence lands on its last window", () => {
  const text = `${sentenceOf(13, "Lamp")} ${sentenceOf(4, "Next")}`;
  const breaths = [{ index: 0, text, sceneId: "s0" }];
  const { ordered } = navOf(breaths);
  const sentence = ordered.filter((group) => group.cursor === 0);
  assert.equal(sentence.length, 4, ordered.map((group) => spotlightKey(placeOf(group))).join(" "));
  const last = sentence[sentence.length - 1]!;
  const next = ordered[ordered.indexOf(last) + 1]!;
  assert.equal(next.cursor, 1);
  const back = stepSpotlight({
    place: placeOf(next),
    delta: -1,
    groupsAt: navOf(breaths).groupsAt,
    breathCount: 1,
  });
  assert.equal(spotlightKey(back as SpotlightPlace), spotlightKey(placeOf(last)));
  assert.equal((back as SpotlightPlace).window, 3);
});

test("a three-window sentence still steps back onto its last window", () => {
  const text = `${sentenceOf(10, "Lamp")} ${sentenceOf(4, "Next")}`;
  const breaths = [{ index: 0, text, sceneId: "s0" }];
  const nav = navOf(breaths);
  const sentence = nav.ordered.filter((group) => group.cursor === 0);
  assert.equal(sentence.length, 3, nav.ordered.map((group) => spotlightKey(placeOf(group))).join(" "));
  const edge = assertReversible("three windows", breaths);
  assert.ok(edge.widths.includes(3));
  assert.ok(!edge.widths.some((width) => width >= 4));
});

test("a right step and a left step return to the same window across splits, paragraphs, chapters, and sits", () => {
  const widths: number[] = [];
  let paragraph = false;
  let chapter = false;
  let sit = false;
  const books = [
    { id: "quicksand", scenes: 1 },
    { id: "cranford", scenes: 1 },
    { id: "strange-tales", scenes: 2 },
  ];
  const edges = new Map<string, ReturnType<typeof assertReversible>>();
  for (const book of books) {
    const breaths = openingBreaths(book.id, book.scenes);
    const edge = assertReversible(book.id, breaths, "prose", stopsForWork(book.id), cutsForWork(book.id));
    edges.set(book.id, edge);
    widths.push(...edge.widths);
    paragraph = paragraph || edge.paragraph;
    chapter = chapter || edge.chapter;
    sit = sit || edge.sit;
    assert.ok(edge.steps > 4, `${book.id} walked ${edge.steps}`);
  }
  const quicksand = edges.get("quicksand")!;
  assert.equal(quicksand.paragraph, true, "quicksand never crossed a paragraph");
  assert.equal(quicksand.chapter, true, "quicksand never crossed a chapter");
  assert.equal(quicksand.sit, true, "quicksand never crossed its sit");
  const pair = `${sentenceOf(6, "Pair")} ${sentenceOf(3, "Tail")}`;
  const two = assertReversible("two windows", [{ index: 0, text: pair, sceneId: "s0" }]);
  widths.push(...two.widths);
  assert.ok(widths.includes(2), `no 2-window sentence in ${widths.join(",")}`);
  assert.ok(widths.includes(3), `no 3-window sentence in ${widths.join(",")}`);
  assert.ok(widths.some((width) => width >= 4), `no 4-window sentence in ${widths.join(",")}`);
  assert.equal(paragraph, true, "the sample never crossed a paragraph");
  assert.equal(chapter, true, "the sample never crossed a chapter");
  assert.equal(sit, true, "the sample never crossed a sit");
});

test("an imported page steps back one window across two, three, and four window sentences", () => {
  const work = assembleWork({
    title: "Imported",
    author: "Imported",
    source: "this phone",
    hadHeading: true,
    blocks: [
      {
        title: "Chapter 1",
        paragraphs: [
          sentenceOf(13, "Lamp"),
          sentenceOf(4, "After"),
          sentenceOf(10, "Third"),
          sentenceOf(6, "Pair"),
        ],
      },
      {
        title: "Chapter 2",
        paragraphs: [sentenceOf(4, "Chapter")],
      },
    ],
  });
  const breaths = work.breaths.map((breath, index) => ({
    index,
    text: breath.text,
    sceneId: breath.sceneId,
  }));
  const edge = assertReversible("imported page", breaths);
  assert.ok(edge.widths.includes(2), `imported windows ${edge.widths.join(",")}`);
  assert.ok(edge.widths.includes(3), `imported windows ${edge.widths.join(",")}`);
  assert.ok(edge.widths.some((width) => width >= 4), `imported windows ${edge.widths.join(",")}`);
  assert.equal(edge.paragraph, true);
  assert.equal(edge.chapter, true);
});

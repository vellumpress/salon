import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { phoneBlockLimit, phoneLineMeasure, PHONE_LINE_PX } from "./display-blocks.ts";
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
  assert.equal(stopped[0]!.endIndex, 0);
  assert.equal(stopped[1]!.index, 1);
  assert.equal(stopped[1]!.endIndex, 1);
  assert.equal(stopped[1]!.sample, "Two.");
  assert.equal(stopped[2]!.index, 2);
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

test("a one-line sentence stays alone when the next sentence would pass four lines", () => {
  const next = sentenceOf(4, "damson").replace(/^./u, (letter) => letter.toUpperCase());
  const stacked = linesOf("Hi.") + linesOf(next);
  assert.ok(stacked > SPOTLIGHT_MAX_LINES + SPOTLIGHT_LINE_SLOP, `stacked ${stacked}`);
  const groups = spotlightGroups(
    [
      { index: 0, text: `Hi. ${next}` },
      { index: 1, text: "Hi." },
      { index: 2, text: next },
    ],
    measure,
    limit,
    line,
  );
  const same = groups.find((group) => group.index === 0);
  assert.ok(same);
  assert.equal(same!.sample.trim(), "Hi.");
  assert.equal(same!.endCursor, 1);
  const across = groups.filter((group) => group.index === 1);
  assert.equal(across.length, 1);
  assert.equal(across[0]!.sample.trim(), "Hi.");
  assert.equal(across[0]!.endIndex, 1);
  assert.ok(groups.some((group) => group.sample.includes("damson")));
});

test("a one-line sentence at the end of the chapter stays alone", () => {
  const groups = spotlightGroups([{ index: 6, text: "Hi." }], measure, limit, line);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.sample, "Hi.");
  assert.equal(groups[0]!.endIndex, 6);
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

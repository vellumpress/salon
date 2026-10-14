import assert from "node:assert/strict";
import test from "node:test";
import { phoneBlockLimit, phoneLineMeasure, PHONE_LINE_PX } from "./display-blocks.ts";
import {
  markSpotlight,
  passageEndsAtStop,
  placeOf,
  repeatSpotlight,
  spotlightGroups,
  spotlightKey,
  spotlightLineCap,
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
  assert.ok(height <= limit + 0.5, `group is ${height}px, past ${limit}px: ${group.sample.slice(0, 60)}`);
  assert.ok(
    linesOf(group.sample) <= 3 + 0.34 + 0.02 || height <= limit + 0.5,
    `group is ${linesOf(group.sample).toFixed(2)} lines: ${group.sample.slice(0, 60)}`,
  );
  assert.ok(!/\S\s+\S/.test("") || !group.sample.includes("\u0000"));
}

test("short sentences merge into one two-to-three line group", () => {
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
  assert.ok(linesOf(groups[0]!.sample) <= 3.4);
  assertGroupFits(groups[0]!);
});

test("a passage does not merge across a sit or ritual stop", () => {
  const breaths = [
    { index: 0, text: "One." },
    { index: 1, text: "Two." },
    { index: 2, text: "Three." },
  ];
  const open = spotlightGroups(breaths, measure, limit, line);
  assert.ok(open.some((group) => group.index <= 1 && group.endIndex > 1), "the fixture did not merge across the stop");
  const stopped = spotlightGroups(breaths, measure, limit, line, "prose", new Set([1]));
  assert.equal(passageEndsAtStop(stopped, 1, "Two.".length), null);
  assert.equal(stopped[0]!.index, 0);
  assert.equal(stopped[0]!.endIndex, 1);
  assert.equal(stopped[1]!.index, 2);
  assert.ok(stopped[1]!.endIndex >= 2);
  assert.ok(stopped.every((group) => group.index > 1 || group.endIndex <= 1));
});

test("a short fragment does not take the sentence after a stop", () => {
  const first = "Hi.";
  const second = "The spare key stayed under the third stair where the landlord had hidden it.";
  assert.ok(linesOf(first) < 2 - 0.34, `fragment measured ${linesOf(first).toFixed(2)} lines`);
  assert.ok(linesOf(second) <= 3 + 0.34, `next sentence measured ${linesOf(second).toFixed(2)} lines`);
  const stacked = linesOf(first) + linesOf(second);
  assert.ok(stacked > 3 + 0.34, `stacked pair measured ${stacked.toFixed(2)} lines`);
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

test("a fragment under two lines takes the next whole sentence inside a third of the screen", () => {
  const tiny = "Hi.";
  const next = "The landlord chuckled and said the room was ready for one.";
  const groups = spotlightGroups([{ index: 0, text: `${tiny} ${next}` }], measure, limit, line);
  assert.ok(groups.length >= 1);
  assert.match(groups[0]!.sample, /^Hi\./);
  assert.match(groups[0]!.sample, /landlord/);
  assert.ok(linesOf(tiny) < 2);
  assertGroupFits(groups[0]!);
});

test("a long sentence steps on word boundaries, two or three lines at a time", () => {
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
    assert.ok(height / line <= 3.34 + 0.05, `stacked group is ${(height / line).toFixed(2)} lines`);
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

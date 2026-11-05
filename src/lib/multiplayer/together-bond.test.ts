import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CHAPTER_TOAST_MS,
  CLAP_MS,
  CLAP_WINDOW_MS,
  MARGIN_EMOJI,
  PULSE_MS,
  claimChapterToast,
  clapForOther,
  finishedScene,
  isSilentClap,
  mergeChapters,
  emojiOn,
  jumpTarget,
  mergeEmoji,
  mergeLedger,
  mergePins,
  mergePulses,
  mergeUnderlines,
  nextEmoji,
  nextPin,
  nextUnderline,
  noteFinished,
  paceCue,
  paceLabel,
  pinsOn,
  pulsesOn,
  scoreLabel,
  sharedFinished,
  underlinesOn,
  type PassagePin,
  type ReadLedger,
  type Underline,
} from "./together-bond.ts";

test("a shared underline toggles per reader and stays on that passage", () => {
  const on = nextUnderline([], "p-aaaaaa", 4, 10, "line-1");
  assert.ok(on);
  assert.equal(on?.on, true);
  const kept = mergeUnderlines([], [on]);
  assert.equal(underlinesOn(kept, 4).length, 1);
  assert.equal(underlinesOn(kept, 5).length, 0);

  const off = nextUnderline(kept, "p-aaaaaa", 4, 12, "line-2");
  const theirs = nextUnderline([], "p-bbbbbb", 4, 11, "line-b");
  const next = mergeUnderlines(kept, [off, theirs, { id: "nope" }, null]);
  assert.deepEqual(
    underlinesOn(next, 4).map((mark) => mark.from),
    ["p-bbbbbb"],
  );

  const stale = mergeUnderlines(next, [{ id: "old", from: "p-bbbbbb", breath: 4, at: 9, on: false }]);
  assert.equal(underlinesOn(stale, 4).length, 1);
});

test("a pin sticks to the passage and the other reader can jump to it", () => {
  const pin = nextPin([], "p-aaaaaa", 6, 20, "pin-1", "Chapter I");
  assert.equal(pin?.on, true);
  assert.equal(pin?.place, "Chapter I");
  const pins = mergePins([], [pin, { id: "bad" }]);
  assert.equal(pinsOn(pins, 6)[0]?.from, "p-aaaaaa");
  assert.equal(jumpTarget(pins, "p-bbbbbb", 6), null);
  assert.equal(jumpTarget(pins, "p-bbbbbb", 2)?.breath, 6);
  assert.equal(jumpTarget(pins, "p-aaaaaa", 2)?.breath, 6);

  const other = nextPin([], "p-bbbbbb", 9, 30, "pin-2", "");
  const both = mergePins(pins, [other]);
  assert.equal(jumpTarget(both, "p-aaaaaa", 6)?.from, "p-bbbbbb");

  const lifted = nextPin(both, "p-aaaaaa", 6, 40, "pin-3", "Chapter I");
  const left = mergePins(both, [lifted]);
  assert.equal(pinsOn(left, 6).length, 0);
  assert.equal(pinsOn(left, 9).length, 1);
});

test("a reaction pulse stays on the sentence, then goes quiet", () => {
  const now = 10_000;
  const live = mergePulses(
    [],
    [
      { id: "g1", from: "p-aaaaaa", breath: 3, at: now - 400 },
      { id: "old", from: "p-bbbbbb", breath: 3, at: now - PULSE_MS - 50 },
      { id: "junk", breath: 3 },
    ],
    now,
  );
  assert.deepEqual(
    pulsesOn(live, 3, now).map((pulse) => pulse.id),
    ["g1"],
  );
  assert.equal(pulsesOn(live, 3, now + PULSE_MS).length, 0);
  assert.equal(pulsesOn(live, 4, now).length, 0);
});

test("pace is caught up, waiting here, or quiet when you are behind", () => {
  assert.equal(paceCue(4, []), "");
  assert.equal(paceCue(4, [4, 4]), "caught-up");
  assert.equal(paceCue(8, [5]), "waiting");
  assert.equal(paceCue(3, [8]), "");
  assert.equal(paceCue(6, [6, 2]), "waiting");
  assert.equal(paceLabel("caught-up"), "Caught up");
  assert.equal(paceLabel("waiting"), "Waiting here");
  assert.equal(paceLabel(""), "");
});

test("the shared count is passages you both finished today", () => {
  assert.deepEqual(noteFinished([], 2, 3), [2]);
  assert.deepEqual(noteFinished([2], 3, 8), [2, 3]);
  assert.deepEqual(noteFinished([2], 4, 4), [2]);
  assert.deepEqual(noteFinished([1, 2], 2, 1), [1, 2]);

  const day = "2026-11-05";
  const self: ReadLedger = { from: "p-aaaaaa", day, at: 3, breaths: [1, 2, 4] };
  const peer: ReadLedger = { from: "p-bbbbbb", day, at: 4, breaths: [2, 4, 9] };
  const yesterday: ReadLedger = { from: "p-bbbbbb", day: "2026-11-04", at: 1, breaths: [1, 2, 4] };
  assert.equal(sharedFinished(day, self, [peer]), 2);
  assert.equal(sharedFinished(day, self, [yesterday]), 0);
  assert.equal(sharedFinished(day, self, []), 0);
  assert.equal(scoreLabel(0), "We read this far");
  assert.equal(scoreLabel(1), "We read 1 today");
  assert.equal(scoreLabel(2), "We read 2 today");

  const older: ReadLedger = { from: "p-bbbbbb", day, at: 1, breaths: [1] };
  assert.equal(mergeLedger(peer, older, "p-bbbbbb")?.breaths.length, 3);
  assert.deepEqual(mergeLedger(undefined, { day, at: 2, breaths: [3, 3, -1, "no"] }, "p-bbbbbb")?.breaths, [3]);
});

test("one margin emoji per passage, from a small set", () => {
  assert.deepEqual([...MARGIN_EMOJI], ["💛", "✨", "👀", "🌙"]);
  const first = nextEmoji([], "p-aaaaaa", 5, "💛", 10, "e1");
  const replaced = nextEmoji(first ? [first] : [], "p-bbbbbb", 5, "✨", 12, "e2");
  const marks = mergeEmoji(first ? [first] : [], [replaced]);
  assert.equal(emojiOn(marks, 5)?.emoji, "✨");
  assert.equal(marks.length, 1);

  const cleared = nextEmoji(marks, "p-aaaaaa", 5, "✨", 14, "e3");
  assert.equal(cleared?.emoji, "");
  assert.equal(mergeEmoji(marks, [cleared]).length, 0);
  assert.equal(nextEmoji([], "p-aaaaaa", 5, "lol", 1, "e4"), null);

  const elsewhere = nextEmoji([], "p-aaaaaa", 8, "🌙", 15, "e5");
  const both = mergeEmoji(marks, [elsewhere]);
  assert.equal(emojiOn(both, 5)?.emoji, "✨");
  assert.equal(emojiOn(both, 8)?.emoji, "🌙");
});

test("a chapter toast waits until both readers have finished it", () => {
  assert.equal(finishedScene("s0", "s0", 1, 2), "");
  assert.equal(finishedScene("s0", "s1", 4, 3), "");
  assert.equal(finishedScene("", "s1", 1, 2), "");
  assert.equal(finishedScene("s0", "s1", 4, 5), "s0");

  const seen = new Set<string>();
  const self = mergeChapters([], [{ id: "s0", from: "p-aaaaaa", place: "Chapter I", at: 10 }]);
  assert.equal(claimChapterToast(self, [], seen), null);
  assert.equal(claimChapterToast(self, [[]], seen), null);
  const peer = mergeChapters([], [{ id: "s0", from: "p-bbbbbb", place: "Chapter I", at: 12 }]);
  const toast = claimChapterToast(self, [peer], seen);
  assert.equal(toast?.id, "s0");
  assert.equal(toast?.place, "Chapter I");
  assert.equal(claimChapterToast(self, [peer], seen), null);
  assert.ok(CHAPTER_TOAST_MS >= 2000 && CHAPTER_TOAST_MS <= 4000);
});

test("a silent clap is a second tap, and only the other reader sees it", () => {
  const first = { at: 1000, x: 40, y: 80, zone: "next", breath: 3 };
  assert.equal(isSilentClap(first, { at: 1200, x: 48, y: 84, zone: "next" }, CLAP_WINDOW_MS), true);
  assert.equal(isSilentClap(first, { at: 1200, x: 200, y: 80, zone: "next" }, CLAP_WINDOW_MS), false);
  assert.equal(isSilentClap(first, { at: 1200, x: 40, y: 80, zone: "prev" }, CLAP_WINDOW_MS), false);
  assert.equal(isSilentClap(first, { at: 1000 + CLAP_WINDOW_MS + 40, x: 40, y: 80, zone: "next" }, CLAP_WINDOW_MS), false);
  assert.equal(isSilentClap(null, { at: 1200, x: 40, y: 80, zone: "next" }), false);

  const now = 5_000;
  const claps = [
    { id: "c1", from: "p-aaaaaa", breath: 3, at: now - 200 },
    { id: "c2", from: "p-bbbbbb", breath: 3, at: now - 100 },
    { id: "old", from: "p-bbbbbb", breath: 3, at: now - CLAP_MS - 20 },
  ];
  assert.equal(clapForOther(claps, "p-aaaaaa", now), true);
  assert.equal(clapForOther([{ id: "c1", from: "p-aaaaaa", breath: 3, at: now - 200 }], "p-aaaaaa", now), false);
  assert.equal(clapForOther(claps, "p-cccccc", now + CLAP_MS), false);
});

test("Read Together keeps the text column and drops the pen", () => {
  const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.together-lock \.look-line[\s\S]{0,180}padding-right:\s*7\.5rem/);
  assert.doesNotMatch(css, /\.together-lock \.breath-now[\s\S]{0,80}padding-right:\s*7\.5rem/);
  assert.match(css, /\.passage-bond\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.bond-pulse\s*\{[^}]*animation:\s*none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.bond-ripple\s*\{[^}]*animation:\s*none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.chapter-toast\s*\{[^}]*animation:\s*none/);
  assert.doesNotMatch(css, /\.passage-ink/);
  assert.doesNotMatch(css, /\.ink-pen/);

  const shell = readFileSync(new URL("../../components/sitting-room.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(shell, /A word on this sentence/);
  assert.doesNotMatch(shell, /SIT_REACTIONS/);
  assert.doesNotMatch(shell, /aria-label="Pen"/);
  assert.doesNotMatch(shell, /PassageInk/);
  assert.doesNotMatch(shell, /passage-ink/);
  assert.match(shell, /aria-label="Underline"/);
  assert.match(shell, /aria-label="Pin"/);
  assert.match(shell, /aria-label="React"/);
  assert.match(shell, /aria-label="Margin emoji"/);
  assert.match(shell, /PassageBond/);
  assert.match(shell, /This line/);
  assert.match(shell, /We made it/);

  const bond = readFileSync(new URL("../../components/passage-bond.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(bond, /onPointerDown|strokePath|freehand/);
  assert.match(bond, /data-underlined/);
  assert.match(bond, /data-pinned/);
  assert.match(bond, /data-pulse/);
  assert.match(bond, /data-emoji/);
  assert.match(bond, /data-clap/);
});

test("underline merge keeps a reader's own later mark", () => {
  const marks: Underline[] = [
    { id: "a", from: "p-aaaaaa", breath: 1, at: 1, on: true },
    { id: "b", from: "p-bbbbbb", breath: 1, at: 2, on: true },
  ];
  const next = mergeUnderlines(marks, [{ id: "c", from: "p-aaaaaa", breath: 1, at: 3, on: true }]);
  assert.equal(next.filter((mark) => mark.from === "p-aaaaaa").length, 1);
  assert.equal(next.find((mark) => mark.from === "p-aaaaaa")?.id, "c");
  const pins: PassagePin[] = [{ id: "p", from: "p-aaaaaa", breath: 2, at: 1, place: "", on: true }];
  assert.equal(mergePins(pins, [{ id: "q", from: "p-aaaaaa", breath: 2, at: 0, on: false }]).length, 1);
});

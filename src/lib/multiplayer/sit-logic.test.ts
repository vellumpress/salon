import assert from "node:assert/strict";
import test from "node:test";
import {
  chatWithoutMargin,
  gapLabel,
  isLivePeer,
  isSitReaction,
  keepSitIdentity,
  marginMarkFromChat,
  marginPlace,
  marginReaderName,
  marksOnSentence,
  mergeMarginMarks,
  mergeSitLines,
  passedReactionNote,
  peerAside,
  reconnectDelay,
  shouldSyncNewcomer,
  sitStatusLabel,
  SIT_REACTIONS,
  type MarginMark,
} from "./sit-logic.ts";

test("chat merges without duplicates across sync and live send", () => {
  const live = mergeSitLines([], [{ id: "", from: "p-aaaaaa", text: " hello ", at: 10 }]);
  assert.equal(live[0]?.id, "p-aaaaaa-10");
  const synced = mergeSitLines(live, [
    { id: "p-aaaaaa-10", from: "p-aaaaaa", text: "hello", at: 10 },
    { id: "p-bbbbbb-11", from: "p-bbbbbb", text: "yes", at: 11 },
  ]);
  assert.deepEqual(
    synced.map((line) => line.text),
    ["hello", "yes"],
  );
  assert.equal(mergeSitLines(synced, [{ id: "x", from: "", text: "no", at: 12 }]).length, 2);
});

test("offline wins over a seat that has not dropped", () => {
  assert.equal(sitStatusLabel("offline", true, 1), "offline");
  assert.equal(sitStatusLabel("live", true, 1), "");
  assert.equal(sitStatusLabel("live", true, 0), "waiting");
  assert.equal(sitStatusLabel("reconnecting", false, 0), "reconnecting");
});

test("presence ignores old chat once the peer drops", () => {
  assert.equal(isLivePeer("connected"), true);
  assert.equal(isLivePeer("failed"), false);
  assert.equal(isLivePeer("disconnected"), false);
  assert.equal(isLivePeer(""), false);
});

test("gap and book switch describe where the other reader is", () => {
  assert.equal(gapLabel(10, 11), "");
  assert.equal(gapLabel(10, 14), "a few lines ahead");
  assert.equal(gapLabel(20, 4), "well behind");
  assert.equal(gapLabel(4, 20), "well ahead");
  assert.equal(
    peerAside({
      selfPlace: "Chapter I",
      selfWorkId: "passing",
      peerPlace: "Chapter I",
      peerWorkId: "passing",
      selfBreath: 3,
      peerBreath: 9,
    }),
    "a few lines ahead",
  );
  assert.equal(
    peerAside({
      selfPlace: "Chapter I",
      selfWorkId: "passing",
      peerPlace: "East Side",
      peerWorkId: "gold",
      selfBreath: 3,
      peerBreath: 9,
    }),
    "on another book",
  );
  assert.equal(
    peerAside({
      selfPlace: "Chapter I",
      selfWorkId: "passing",
      peerPlace: "Chapter II",
      peerWorkId: "passing",
      selfBreath: 3,
      peerBreath: 3,
    }),
    "at Chapter II",
  );
});

test("reconnect waits and the same tab keeps its seat", () => {
  assert.equal(reconnectDelay(0), 400);
  assert.equal(reconnectDelay(1), 800);
  assert.equal(reconnectDelay(8), 8000);
  assert.equal(keepSitIdentity("p-ab12cd"), "p-ab12cd");
  assert.equal(keepSitIdentity("nope"), "");
  assert.equal(keepSitIdentity(null), "");
  assert.equal(shouldSyncNewcomer("p-aaaaaa", ["p-bbbbbb"]), true);
  assert.equal(shouldSyncNewcomer("p-bbbbbb", ["p-aaaaaa"]), false);
});

test("reactions stay a fixed short set", () => {
  assert.deepEqual([...SIT_REACTIONS], ["love", "?", "lol", "wow"]);
  assert.equal(isSitReaction("lol"), true);
  assert.equal(isSitReaction("?"), true);
  assert.equal(isSitReaction("yes"), false);
  assert.equal(isSitReaction("again"), false);
  assert.equal(isSitReaction("hello"), false);
});

test("a reaction word stays in the margin of that sentence", () => {
  const mark = marginMarkFromChat({
    from: "p-aaaaaa",
    text: " love ",
    at: 10,
    breath: 4,
    name: "mira",
  });
  assert.ok(mark);
  assert.equal(mark?.word, "love");
  assert.equal(mark?.breath, 4);
  assert.equal(mark?.name, "mira");
  assert.equal(marginMarkFromChat({ from: "p-aaaaaa", text: "hello", at: 11, breath: 4 }), null);
  assert.equal(marginMarkFromChat({ from: "p-aaaaaa", text: "lol", at: 11 }), null);
  const next = mergeMarginMarks(mark ? [mark] : [], [
    {
      id: "later",
      from: "p-aaaaaa",
      word: "wow",
      breath: 4,
      at: 12,
    },
    {
      id: "other",
      from: "p-bbbbbb",
      word: "?",
      breath: 4,
      at: 13,
      name: "bea",
    },
    {
      id: "elsewhere",
      from: "p-bbbbbb",
      word: "lol",
      breath: 9,
      at: 14,
    },
  ]);
  assert.deepEqual(
    marksOnSentence(next, 4).map((item) => item.word),
    ["wow", "?"],
  );
  assert.equal(marksOnSentence(next, 4).find((item) => item.from === "p-aaaaaa")?.name, "mira");
  assert.deepEqual(
    marksOnSentence(next, 9).map((item) => item.word),
    ["lol"],
  );
});

test("older reaction words still display, and a passed sentence says how far", () => {
  const kept = mergeMarginMarks([], [
    { id: "a", from: "p-aaaaaa", word: "yes", breath: 2, at: 1 },
    { id: "b", from: "p-bbbbbb", word: "hmm", breath: 2, at: 2 },
    { id: "c", from: "p-cccccc", word: "oh", breath: 3, at: 3 },
    { id: "d", from: "p-dddddd", word: "again", breath: 4, at: 4 },
    { id: "e", from: "p-eeeeee", word: "nope", breath: 4, at: 5 },
  ] as MarginMark[]);
  assert.deepEqual(
    kept.map((item) => item.word),
    ["yes", "hmm", "oh", "again"],
  );
  assert.equal(marginMarkFromChat({ from: "p-aaaaaa", text: "again", at: 6, breath: 1 })?.word, "again");
  assert.equal(passedReactionNote("again", 1), "again, a sentence back");
  assert.equal(passedReactionNote("lol", 3), "lol, 3 sentences back");
  assert.equal(passedReactionNote("love", 0), "love");
  assert.equal(marginPlace(4, 4, [4]), "beside");
  assert.equal(marginPlace(3, 4, [3, 4]), "beside");
  assert.equal(marginPlace(2, 4, [4]), "passed");
  assert.equal(marginPlace(8, 4, [4]), "waiting");
  assert.equal(marginReaderName({ from: "p-aaaaaa", selfId: "p-aaaaaa", name: "mira" }), "you");
  assert.equal(marginReaderName({ from: "p-bbbbbb", selfId: "p-aaaaaa", name: "@bea" }), "@bea");
  assert.equal(marginReaderName({ from: "p-bbbbbb", selfId: "p-aaaaaa" }), "them");
  const lines = [
    { id: "p-bbbbbb-9", from: "p-bbbbbb", text: "lol", at: 9 },
    { id: "p-bbbbbb-10", from: "p-bbbbbb", text: "the envelope", at: 10 },
  ];
  assert.deepEqual(
    chatWithoutMargin(lines, [
      { id: "p-bbbbbb-9", from: "p-bbbbbb", word: "lol", breath: 4, at: 9 },
    ]).map((line) => line.text),
    ["the envelope"],
  );
});

test("five racing sends keep one copy of each line", () => {
  for (let run = 0; run < 5; run += 1) {
    let lines = mergeSitLines([], []);
    for (let i = 0; i < 4; i += 1) {
      const line = { id: `p-aaaaaa-${run}-${i}`, from: "p-aaaaaa", text: `n${i}`, at: run * 10 + i };
      lines = mergeSitLines(lines, [line]);
      lines = mergeSitLines(lines, [line, line]);
    }
    assert.equal(lines.length, 4);
    assert.equal(new Set(lines.map((line) => line.id)).size, 4);
  }
});

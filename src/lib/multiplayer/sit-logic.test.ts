import assert from "node:assert/strict";
import test from "node:test";
import {
  gapLabel,
  isLivePeer,
  keepSitIdentity,
  mergeSitLines,
  peerAside,
  reconnectDelay,
  shouldSyncNewcomer,
  sitStatusLabel,
  SIT_REACTIONS,
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
  assert.deepEqual([...SIT_REACTIONS], ["yes", "hmm", "oh", "again"]);
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

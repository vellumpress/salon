import assert from "node:assert/strict";
import test from "node:test";
import {
  TAP_GUARD_MS,
  disarmUserMoveDocument,
  noteUserMove,
  readUserMove,
  readerHref,
  tapAllowsWrite,
  tapBeats,
  tapOwnsVisit,
  type UserMove,
} from "./place-guard.ts";

function memory(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

function move(partial: Partial<UserMove> = {}): UserMove {
  return {
    workId: "cranford",
    index: 2,
    cursor: 4,
    at: 4_000,
    href: "/salon/read/cranford?at=3",
    breathId: "s0-2",
    ...partial,
  };
}

test("a shell reload is the same address as the tap", () => {
  assert.equal(
    readerHref("/salon/read/cranford?at=3&__fresh=1"),
    readerHref("/salon/read/cranford?at=3"),
  );
  assert.equal(readerHref("/salon/read/cranford?sit=5&at=3"), "/salon/read/cranford?sit=5&at=3");
});

test("the note survives a read, including the sentence cursor", () => {
  const box = memory();
  noteUserMove(move({ href: "/salon/read/cranford?at=3&__fresh=9" }), box);
  disarmUserMoveDocument();
  const stored = readUserMove(box);
  assert.equal(stored?.index, 2);
  assert.equal(stored?.cursor, 4);
  assert.equal(stored?.href, "/salon/read/cranford?at=3");
  assert.equal(stored?.breathId, "s0-2");
});

test("a tap in this document owns the visit, and a later link does not", () => {
  const box = memory();
  const href = "/salon/read/cranford?at=3";
  noteUserMove(move(), box);
  assert.equal(tapOwnsVisit(readUserMove(box), "cranford", href, { armed: true }), true);
  disarmUserMoveDocument();
  assert.equal(tapOwnsVisit(readUserMove(box), "cranford", href, { armed: false }), false);
  assert.equal(
    tapOwnsVisit(readUserMove(box), "cranford", `${href}&__fresh=1`, { armed: false, now: 4_000 + 1_000 }),
    true,
  );
  assert.equal(
    tapOwnsVisit(readUserMove(box), "cranford", `${href}&__fresh=1`, {
      armed: false,
      now: 4_000 + TAP_GUARD_MS + 1,
    }),
    false,
  );
  assert.equal(tapOwnsVisit(readUserMove(box), "moby-dick", href, { armed: true }), false);
});

test("a different breath is blocked, and the same breath may be reanchored", () => {
  const box = memory();
  const href = "/salon/read/cranford?at=3";
  noteUserMove(move(), box);
  disarmUserMoveDocument();
  const opts = { armed: true };
  assert.equal(tapAllowsWrite("cranford", 3, href, "s0-3", box, opts), false);
  assert.equal(tapAllowsWrite("cranford", 2, href, "s0-2", box, opts), true);
  assert.equal(tapAllowsWrite("cranford", 18, href, "s0-2", box, opts), true);
  assert.equal(tapAllowsWrite("cranford", 3, href, "s0-3", box, { armed: false }), true);
});

test("a tap beats an older save, and a newer tap beats it back", () => {
  assert.equal(tapBeats({ userMovedAt: 4_000, lastOpenedAt: 9_000 }, { lastOpenedAt: 1_000 }), true);
  assert.equal(tapBeats({ lastOpenedAt: 9_000 }, { userMovedAt: 4_000, lastOpenedAt: 4_000 }), false);
  assert.equal(
    tapBeats({ userMovedAt: 4_000, lastOpenedAt: 4_000 }, { userMovedAt: 5_000, lastOpenedAt: 5_000 }),
    false,
  );
  assert.equal(
    tapBeats({ userMovedAt: 5_000, lastOpenedAt: 5_000 }, { userMovedAt: 4_000, lastOpenedAt: 9_000 }),
    true,
  );
  assert.equal(tapBeats({ userMovedAt: 4_000 }, { lastOpenedAt: 8_000 }), false);
});

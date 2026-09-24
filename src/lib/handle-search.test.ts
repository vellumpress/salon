import assert from "node:assert/strict";
import test from "node:test";
import { searchHandles } from "./handle-search.ts";
import type { FriendRow } from "./friend-profile.ts";
import { normalizeHandle } from "./social.ts";

function row(handle: string, partial: Partial<FriendRow> = {}): FriendRow {
  return {
    id: `local:${handle}`,
    handle,
    name: `@${handle}`,
    isSelf: false,
    following: false,
    place: "",
    readingTitle: "",
    readingAuthor: "",
    latest: "",
    waiting: false,
    ...partial,
  };
}

test("normalizeHandle keeps dots and underscores and drops the rest", () => {
  assert.equal(normalizeHandle("@New.Handle"), "new.handle");
  assert.equal(normalizeHandle("A_B"), "a_b");
  assert.equal(normalizeHandle("@Ada-Voss"), "adavoss");
  assert.equal(normalizeHandle("  Jules  "), "jules");
});

test("search offers a follow only when the handle matches nobody known", () => {
  const rows = [row("meghan", { isSelf: true }), row("mina", { following: true, waiting: true })];
  assert.equal(searchHandles("", rows).matches.length, 0);
  assert.equal(searchHandles("min", rows).offer, null);
  assert.deepEqual(
    searchHandles("min", rows).matches.map((item) => item.handle),
    ["mina"],
  );
  assert.equal(searchHandles("@New.Handle", rows).offer, "new.handle");
  assert.equal(searchHandles("a", rows).offer, null);
  assert.equal(searchHandles("salon", rows).offer, null);
  assert.equal(searchHandles("@Meghan", rows).offer, null);
  assert.equal(searchHandles("@Meghan", rows).matches[0]?.isSelf, true);
});

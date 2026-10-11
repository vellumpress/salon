import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOLLOWED_FEED_KINDS, isQaHandle, planFollowInserts, planFollowSync, rankActiveReaders } from "./remote-directory.ts";

test("follow inserts skip people who already have a row and names the misses", () => {
  const first = planFollowInserts(
    "user-a",
    ["@Mina", "ghost"],
    [{ id: "user-b", handle: "mina" }],
    [],
  );
  assert.deepEqual(first.rows, [{ follower_id: "user-a", followee_id: "user-b" }]);
  assert.deepEqual(first.missing, ["ghost"]);
  const second = planFollowInserts(
    "user-a",
    ["mina"],
    [{ id: "user-b", handle: "mina" }],
    ["user-b"],
  );
  assert.deepEqual(second.rows, []);
  assert.deepEqual(second.missing, []);
});

test("an empty follow list does not unfollow everyone on the first pass", () => {
  const first = planFollowSync(null, ["mina"], 0);
  assert.deepEqual(first.drop, []);
  assert.deepEqual(first.next, ["mina"]);
  const blip = planFollowSync(first.next, [], first.emptyStreak);
  assert.deepEqual(blip.drop, []);
  assert.deepEqual(blip.next, ["mina"]);
  assert.equal(blip.emptyStreak, 1);
  const again = planFollowSync(blip.next, [], blip.emptyStreak);
  assert.deepEqual(again.drop, ["mina"]);
  assert.deepEqual(again.next, []);
  const one = planFollowSync(["mina", "cleo"], ["cleo"], 0);
  assert.deepEqual(one.drop, ["mina"]);
  assert.deepEqual(one.next, ["cleo"]);
});

test("readers to follow are the newest real handles, never QA", () => {
  assert.equal(isQaHandle("qareadera"), true);
  assert.equal(isQaHandle("@qa-reader-b"), true);
  assert.equal(isQaHandle("emily"), false);
  const ranked = rankActiveReaders(
    [
      { handle: "qareaderb", at: 500 },
      { handle: "emily", name: "Emily", at: 100 },
      { handle: "emily", at: 400 },
      { handle: "ipohboi", at: 300 },
      { handle: "mike", at: 200 },
    ],
    ["mike"],
  );
  assert.deepEqual(
    ranked.map((row) => row.handle),
    ["emily", "ipohboi"],
  );
  assert.equal(ranked[0]?.at, 400);
});

test("the follower feed always asks for the open book and kept lines", () => {
  assert.ok(FOLLOWED_FEED_KINDS.includes("reading"));
  assert.ok(FOLLOWED_FEED_KINDS.includes("kept"));
  assert.ok(FOLLOWED_FEED_KINDS.includes("finished"));
});

test("friends sync subscribes to activity and follows, and the page renders both", () => {
  const sync = readFileSync(new URL("../components/remote-sync.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../routes/friends.tsx", import.meta.url), "utf8");
  const sql = readFileSync(
    new URL("../../supabase/migrations/20261011190000_friend_activity_realtime.sql", import.meta.url),
    "utf8",
  );
  assert.match(sync, /subscribeFriendActivity/);
  assert.match(page, /remoteKept/);
  assert.match(page, /shelfFromActivity/);
  assert.doesNotMatch(page, /share a sit or invite link/);
  assert.match(sql, /add table public\.activity/);
  assert.match(sql, /add table public\.follows/);
});

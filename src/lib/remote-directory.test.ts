import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOLLOWED_FEED_KINDS, planFollowInserts } from "./remote-directory.ts";

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

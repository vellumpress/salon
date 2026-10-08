import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddSitting,
  canDirectUpdateClub,
  canInsertClubMessage,
  canLeaveClub,
  canReadClubMessages,
  canReadClubRow,
  canReadProgress,
  canWriteProgress,
  mergeClubMessages,
  shouldAutoJoin,
  type ClubActor,
} from "./club-flow.ts";

const owner: ClubActor = { userId: "owner", ownerId: "owner", member: true };
const member: ClubActor = { userId: "member", ownerId: "owner", member: true };
const stranger: ClubActor = { userId: "stranger", ownerId: "owner", member: false };
const ownerLeft: ClubActor = { userId: "owner", ownerId: "owner", member: false };

test("members read chat and progress; strangers do not", () => {
  assert.equal(canReadClubMessages(member), true);
  assert.equal(canReadClubMessages(stranger), false);
  assert.equal(canReadClubMessages(null), false);
  assert.equal(canReadProgress(member), true);
  assert.equal(canReadProgress(stranger), false);
  assert.equal(canReadClubRow(ownerLeft), true);
  assert.equal(canReadClubRow(stranger), false);
});

test("only the author inserts a line, and only the owner rewrites the club", () => {
  assert.equal(canInsertClubMessage(member, "member"), true);
  assert.equal(canInsertClubMessage(member, "owner"), false);
  assert.equal(canInsertClubMessage(stranger, "stranger"), false);
  assert.equal(canDirectUpdateClub(owner), true);
  assert.equal(canDirectUpdateClub(member), false);
  assert.equal(canDirectUpdateClub(ownerLeft), true);
  assert.equal(canAddSitting(member), true);
  assert.equal(canAddSitting(stranger), false);
});

test("a member writes only their own progress and can leave", () => {
  assert.equal(canWriteProgress(member, "member"), true);
  assert.equal(canWriteProgress(member, "owner"), false);
  assert.equal(canWriteProgress(stranger, "stranger"), false);
  assert.equal(canLeaveClub(member), true);
  assert.equal(canLeaveClub(stranger), false);
  assert.equal(canLeaveClub(owner), true);
});

test("leaving sticks and chat lines do not duplicate", () => {
  assert.equal(shouldAutoJoin(["ab12"], "ab12"), false);
  assert.equal(shouldAutoJoin(["ab12"], "cd34"), true);
  const first = mergeClubMessages([], [{ id: 1, body: "a" }, { id: 2, body: "b" }]);
  const again = mergeClubMessages(first, [{ id: 2, body: "b" }, { id: 3, body: "c" }]);
  assert.deepEqual(
    again.map((row) => row.id),
    [1, 2, 3],
  );
  const raced = mergeClubMessages(
    [{ id: 4, body: "late" }],
    [
      { id: 4, body: "late" },
      { id: 4, body: "late" },
    ],
  );
  assert.equal(raced.length, 1);
});

test("five racing joins keep one line per id", () => {
  for (let run = 0; run < 5; run += 1) {
    let rows: { id: number; body: string }[] = [];
    const incoming = Array.from({ length: 6 }, (_, index) => ({
      id: index + run,
      body: `run-${run}-${index}`,
    }));
    rows = mergeClubMessages(rows, incoming);
    rows = mergeClubMessages(rows, incoming.slice().reverse());
    rows = mergeClubMessages(incoming, rows);
    const ids = rows.map((row) => row.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, 6);
  }
});

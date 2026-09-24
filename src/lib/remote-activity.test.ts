import assert from "node:assert/strict";
import test from "node:test";
import { asContact } from "./friends.ts";
import { listFriends } from "./friend-profile.ts";
import { activityFromRow, draftsFromLocal, withRemoteActivity } from "./remote-activity.ts";
import type { WorkProgress } from "./store.ts";

const progress = (partial: Partial<WorkProgress> = {}): WorkProgress => ({
  breathIndex: 0,
  lastOpenedAt: 0,
  sittingStartedAt: null,
  keywords: {},
  kept: [],
  completedAt: null,
  entered: false,
  ...partial,
});

test("local history becomes hosted activity drafts without dropping the handle", () => {
  const drafts = draftsFromLocal({
    handle: "@Meghan",
    progress: {
      passing: progress({
        entered: true,
        breathIndex: 4,
        lastOpenedAt: 1_700_000_000_000,
        kept: ["line-1"],
      }),
    },
    sitHistory: [{ workId: "passing", minutes: 12, endedAt: 1_700_000_100_000 }],
    hostedSits: [],
    sitPledges: [],
    togetherKeeps: [],
  });
  assert.equal(
    drafts.some((row) => row.kind === "reading" && row.bookId === "passing"),
    true,
  );
  assert.equal(
    drafts.some((row) => row.kind === "kept" && row.key === "kept:passing:line-1"),
    true,
  );
  assert.equal(
    drafts.some((row) => row.kind === "sit"),
    true,
  );
  assert.equal(draftsFromLocal({ ...emptyHistory(), handle: "x" }).length, 0);
});

test("a synced row becomes a friend activity and does not invent people", () => {
  const event = activityFromRow({
    id: 9,
    user_id: "user",
    kind: "reading",
    book_id: "passing",
    payload: { summary: "reading Passing", workTitle: "Passing", author: "Nella Larsen" },
    created_at: "2026-09-24T12:00:00.000Z",
  });
  assert.ok(event);
  assert.equal(event.kind, "reading");
  assert.equal(event.workTitle, "Passing");
  assert.equal(activityFromRow({ ...baseRow(), kind: "invited" }), null);

  const contact = asContact({ handle: "mina" });
  assert.ok(contact);
  const graph = withRemoteActivity(
    {
      selfHandle: "meghan",
      contacts: [contact],
      following: [contact.id],
      progress: {},
      sitHistory: [],
      togetherKeeps: [],
      hostedSits: [],
      sitPledges: [],
    },
    {
      mina: [event],
      ghost: [{ ...event, id: "remote:10" }],
    },
  );
  assert.equal(graph.contacts.length, 1);
  assert.equal(graph.contacts[0]?.reading, "passing");
  assert.equal(listFriends(graph).some((row) => row.handle === "ghost"), false);
  assert.equal(listFriends(graph).find((row) => row.handle === "mina")?.readingTitle, "Passing");
});

function emptyHistory() {
  return {
    handle: "",
    progress: {},
    sitHistory: [],
    hostedSits: [],
    sitPledges: [],
    togetherKeeps: [],
  };
}

function baseRow() {
  return {
    id: 1,
    user_id: "user",
    kind: "reading",
    book_id: "passing",
    payload: {},
    created_at: "2026-09-24T12:00:00.000Z",
  };
}

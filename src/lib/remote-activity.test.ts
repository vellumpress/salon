import assert from "node:assert/strict";
import test from "node:test";
import { asContact } from "./friends.ts";
import { collapseReadingRuns, listFriends } from "./friend-profile.ts";
import {
  activityFromRow,
  draftsFromLocal,
  EMPTY_FRIEND_BOOK,
  publishingHandle,
  readingForCard,
  readingWriteAction,
  shelfFromActivity,
  withRemoteActivity,
} from "./remote-activity.ts";
import { canReadActivity, canWriteActivity } from "./friend-access.ts";
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
  const keptDraft = drafts.find((row) => row.kind === "kept" && row.key === "kept:passing:line-1");
  assert.ok(keptDraft);
  assert.equal(keptDraft.payload.breathId, "line-1");
  assert.equal(keptDraft.payload.line, undefined);
  const reading = drafts.find((row) => row.kind === "reading" && row.key.startsWith("reading:passing:"));
  assert.match(String(reading?.payload.progress ?? ""), /sentence|%|Opened/);
  const shelfKey = drafts.find((row) => row.key === "reading-shelf:passing:4");
  assert.ok(shelfKey);
  assert.equal(shelfKey.kind, "reading");
  assert.equal(shelfKey.payload.atIndex, 4);
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

test("a kept line syncs its sentence without requiring it on older rows", () => {
  const drafts = draftsFromLocal({
    handle: "mina",
    progress: {
      passing: progress({
        entered: true,
        lastOpenedAt: 20,
        kept: [
          {
            v: 1,
            id: "s0-1",
            text: "She wrote the letter.",
            workId: "passing",
            title: "Passing",
            author: "Nella Larsen",
            savedAt: 20,
          },
        ],
      }),
    },
    sitHistory: [],
    hostedSits: [],
    sitPledges: [],
    togetherKeeps: [],
  });
  const kept = drafts.find((row) => row.kind === "kept");
  assert.equal(kept?.payload.line, "She wrote the letter.");
  assert.equal(kept?.payload.breathId, "s0-1");
  assert.equal(kept?.key, "kept:passing:s0-1");
  const older = activityFromRow({
    id: 4,
    user_id: "user",
    kind: "kept",
    book_id: "passing",
    payload: { summary: "kept a line from Passing", breathId: "s0-1" },
    created_at: "2026-09-24T12:00:00.000Z",
  });
  assert.equal(older?.breathId, "s0-1");
  assert.equal(older?.line, undefined);
});

test("a reading row without a progress label still shows how far in", () => {
  const event = activityFromRow({
    id: 11,
    user_id: "user",
    kind: "reading",
    book_id: "passing",
    payload: { summary: "reading Passing", workTitle: "Passing", author: "Nella Larsen", atIndex: 12 },
    created_at: "2026-10-11T12:00:00.000Z",
  });
  assert.match(event?.progress ?? "", /%|sentence|Opened/);
  const shelf = shelfFromActivity([
    event!,
    {
      id: "remote:12",
      at: 20,
      kind: "kept",
      label: "Kept",
      summary: "kept a line from Passing",
      line: "She wrote the letter.",
      workId: "passing",
      workTitle: "Passing",
      author: "Nella Larsen",
      breathId: "s0-1",
      atIndex: 12,
    },
    {
      id: "remote:13",
      at: 21,
      kind: "sit",
      label: "Sit",
      summary: "sat with Passing",
      workId: "passing",
      workTitle: "Passing",
    },
  ]);
  assert.equal(shelf.reading?.workId, "passing");
  assert.equal(shelf.kept.length, 1);
  assert.equal(shelf.kept[0]?.line, "She wrote the letter.");
});

test("a stored sentence cue yields to the catalog place when the index is known", () => {
  const event = activityFromRow({
    id: 14,
    user_id: "user",
    kind: "reading",
    book_id: "passing",
    payload: {
      summary: "reading Passing",
      workTitle: "Passing",
      author: "Nella Larsen",
      atIndex: 18,
      progress: "Sentence 19",
    },
    created_at: "2026-10-11T17:37:26.000Z",
  });
  assert.match(event?.progress ?? "", /% in · sentence 19/);
  assert.equal(publishingHandle("", "ipohboi"), "ipohboi");
  assert.equal(publishingHandle("Mina", ""), "mina");
  assert.equal(publishingHandle("x", "ipohboi"), "ipohboi");
});

test("the card uses a kept line's book, and says so when there is nothing", () => {
  const fromLine = readingForCard(undefined, [
    {
      workId: "passing",
      workTitle: "Passing",
      author: "Nella Larsen",
      atIndex: 18,
    },
  ]);
  assert.equal(fromLine?.workTitle, "Passing");
  assert.match(fromLine?.progress ?? "", /sentence 19/);
  assert.equal(readingForCard(undefined, []), undefined);
  assert.equal(EMPTY_FRIEND_BOOK, "Hasn't opened a book on tbr yet");
  const keptOnly = shelfFromActivity([
    {
      id: "remote:20",
      at: 30,
      kind: "kept",
      label: "Kept",
      summary: "kept a line from Passing",
      line: "A line kept on the phone already.",
      workId: "passing",
      workTitle: "Passing",
      author: "Nella Larsen",
      atIndex: 18,
    },
  ]);
  assert.equal(keptOnly.reading?.workId, "passing");
  assert.equal(keptOnly.kept.length, 1);
});

test("a friend phone's existing book is readable without a sign-in", () => {
  const drafts = draftsFromLocal({
    handle: "bea",
    progress: {
      passing: progress({
        entered: true,
        breathIndex: 18,
        lastOpenedAt: 1_700_000_000_000,
      }),
    },
    sitHistory: [],
    hostedSits: [],
    sitPledges: [],
    togetherKeeps: [],
  });
  const shelfDraft = drafts.find((row) => row.key.startsWith("reading-shelf:"));
  assert.ok(shelfDraft);
  const event = activityFromRow({
    id: 30,
    user_id: "bea-id",
    kind: shelfDraft.kind,
    book_id: shelfDraft.bookId,
    payload: shelfDraft.payload,
    created_at: new Date(shelfDraft.at).toISOString(),
  });
  assert.equal(event?.workTitle, "Passing");
  assert.match(event?.progress ?? "", /sentence 19/);
  const follows = [{ followerId: "mike-id", followeeId: "bea-id" }];
  assert.equal(canReadActivity("bea-id", "bea-id", []), true);
  assert.equal(canReadActivity("mike-id", "bea-id", follows), true);
  assert.equal(canReadActivity("stranger-id", "bea-id", follows), true);
  assert.equal(canReadActivity(null, "bea-id", follows), true);
  assert.equal(canReadActivity("mike-id", "bea-id", []), true);
  assert.equal(canWriteActivity("stranger-id", "bea-id"), false);
  assert.equal(canWriteActivity(null, "bea-id"), false);
  const shelf = shelfFromActivity(event ? [event] : []);
  assert.equal(shelf.reading?.workTitle, "Passing");
  assert.equal(readingForCard(undefined, []), undefined);
});

test("consecutive House of Mirth progress rows collapse to the latest sentence", () => {
  const mirth = (id: string, at: number, atIndex: number, sentence: number) => ({
    id,
    at,
    kind: "reading" as const,
    workId: "the-house-of-mirth",
    workTitle: "The House of Mirth",
    progress: `34% in · sentence ${sentence}`,
    atIndex,
    summary: "reading The House of Mirth",
    label: "Reading",
  });
  const sit = (id: string, at: number) => ({
    id,
    at,
    kind: "sit" as const,
    workId: "the-house-of-mirth",
    workTitle: "The House of Mirth",
    summary: "sat with The House of Mirth",
    label: "Sit",
  });
  const events = [
    mirth("remote:418", 3_000, 1953, 1954),
    sit("remote:419", 3_000),
    sit("remote:417", 2_956),
    mirth("remote:416", 2_944, 1954, 1955),
    mirth("remote:415", 2_943, 1953, 1954),
    {
      id: "remote:moby",
      at: 4_000,
      kind: "reading" as const,
      workId: "moby-dick",
      progress: "3% in · sentence 72",
      atIndex: 71,
      summary: "reading Moby-Dick",
      label: "Reading",
    },
  ];
  const collapsed = collapseReadingRuns(events);
  const readings = collapsed.filter(
    (item): item is ReturnType<typeof mirth> => item.kind === "reading" && item.workId === "the-house-of-mirth",
  );
  assert.equal(readings.length, 1);
  assert.equal(readings[0]?.id, "remote:418");
  assert.match(readings[0]?.progress ?? "", /sentence 1954/);
  assert.equal(readings[0]?.atIndex, 1953);
  assert.equal(collapsed.filter((item) => item.kind === "sit").length, 2);
  assert.equal(collapsed.filter((item) => item.workId === "moby-dick").length, 1);
  assert.equal(readingWriteAction({ hasRow: false }), "insert");
  assert.equal(readingWriteAction({ hasRow: true, storedAt: 1953, nextAt: 1954 }), "update");
  assert.equal(readingWriteAction({ hasRow: true, storedAt: 1954, nextAt: 1954 }), "skip");
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

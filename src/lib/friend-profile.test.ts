import assert from "node:assert/strict";
import test from "node:test";
import { asContact } from "./friends.ts";
import {
  activityBlurb,
  compactWhen,
  friendProfile,
  friendProfilePath,
  listFriends,
  localFriendProfiles,
  type FriendGraph,
} from "./friend-profile.ts";
import type { HostedSit } from "./hosted-sit.ts";
import { dayKey } from "./day-key.ts";
import type { SitPledge } from "./sit-pledge.ts";
import type { WorkProgress } from "./store.ts";
import type { TogetherKeep } from "./together-keep.ts";

const NOW = Date.parse("2026-09-24T18:00:00");

function progress(partial: Partial<WorkProgress>): WorkProgress {
  return {
    breathIndex: 0,
    lastOpenedAt: 0,
    sittingStartedAt: null,
    keywords: {},
    kept: [],
    completedAt: null,
    entered: false,
    ...partial,
  };
}

function emptyGraph(partial: Partial<FriendGraph> = {}): FriendGraph {
  return {
    selfHandle: "",
    contacts: [],
    following: [],
    progress: {},
    sitHistory: [],
    togetherKeeps: [],
    hostedSits: [],
    sitPledges: [],
    now: NOW,
    ...partial,
  };
}

test("profile path is a shareable /friends/handle route", () => {
  assert.equal(friendProfilePath("@Meghan"), "/friends/meghan");
  assert.equal(compactWhen(NOW - 2 * 60 * 60 * 1000, NOW), "2h");
});

test("demo ids never appear, even when leftover follows name them", () => {
  const graph = emptyGraph({
    selfHandle: "meghan",
    following: ["nora", "vera", "ivo", "cleo", "leo", "rene", "ada", "jules"],
  });
  const rows = listFriends(graph);
  assert.deepEqual(
    rows.map((row) => row.handle),
    ["meghan"],
  );
  assert.equal(rows[0]?.place, "This device");
  assert.equal(rows[0]?.isSelf, true);
  for (const name of ["nora", "vera", "ivo", "cleo", "leo", "rene", "ada", "jules"]) {
    const profile = friendProfile(name, graph);
    assert.equal(profile?.activity.length, 0);
    assert.equal(profile?.readingNow, undefined);
    assert.equal(profile?.score, null);
  }
});

test("self profile is local history, newest first, with score and read-along", () => {
  const opened = NOW - 30 * 60 * 1000;
  const graph = emptyGraph({
    selfHandle: "meghan",
    progress: {
      naomi: progress({
        entered: true,
        breathIndex: 40,
        lastOpenedAt: opened,
        kept: ["b9"],
      }),
    },
    sitHistory: [{ workId: "passing", minutes: 12, endedAt: NOW - 3 * 60 * 60 * 1000 }],
    ledgers: {
      readingMinutesByDay: { [dayKey(NOW)]: 20 },
      advancesByDay: { [dayKey(NOW)]: 8 },
    },
  });
  const profile = localFriendProfiles.profile("meghan", graph);
  assert.ok(profile);
  assert.equal(profile.isSelf, true);
  assert.equal(profile.readingNow?.workTitle, "Naomi");
  assert.equal(profile.readingNow?.atIndex, 40);
  assert.ok(profile.score?.hasSignal);
  assert.ok((profile.score?.streak ?? 0) >= 1);
  assert.ok(profile.activity[0]?.kind === "reading" || profile.activity[0]?.kind === "kept");
  assert.ok(profile.activity.some((row) => row.kind === "kept" && row.breathId === "b9" && row.workId === "naomi"));
  assert.ok(profile.activity.some((row) => row.kind === "sit" && row.workId === "passing"));
  const times = profile.activity.map((row) => row.at);
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
  const row = listFriends(graph)[0];
  assert.match(row?.latest ?? "", /naomi/i);
  assert.match(row?.latest ?? "", /30m|just now|reading/i);
});

test("another person only shows what a shared sit or note brought in", () => {
  const contact = asContact({ handle: "mina", name: "Mina", reading: "naomi", workTitle: "Naomi" });
  assert.ok(contact);
  const sit: HostedSit = {
    id: "hs1",
    hostHandle: "mina",
    hostName: "Mina",
    workId: "naomi",
    workTitle: "Naomi",
    author: "Jun'ichirō Tanizaki",
    minutes: 20,
    createdAt: NOW - 5 * 60 * 60 * 1000,
    invitees: ["meghan"],
    rsvps: [{ handle: "meghan", name: "@meghan", status: "yes", at: NOW - 4 * 60 * 60 * 1000 }],
    keeps: [
      {
        handle: "mina",
        name: "Mina",
        breathId: "k1",
        line: "She writes it in Roman letters.",
        at: 12,
        keptAt: NOW - 2 * 60 * 60 * 1000,
      },
    ],
    endedAt: null,
  };
  const pledge: SitPledge = {
    id: "pl1",
    fromHandle: "mina",
    fromName: "Mina",
    toHandle: "meghan",
    toName: "@meghan",
    window: "tonight",
    dueAt: NOW + 60 * 60 * 1000,
    createdAt: NOW - 60 * 60 * 1000,
    status: "pending",
  };
  const together: TogetherKeep = {
    id: "tk1",
    workId: "passing",
    workTitle: "Passing",
    author: "Nella Larsen",
    theirs: { handle: "mina", name: "Mina", breathId: "t1", line: "A kept line.", at: 3 },
    yours: { handle: "meghan", name: "@meghan", breathId: "y1", line: "Mine.", at: 4 },
    createdAt: NOW - 90 * 60 * 1000,
  };
  const graph = emptyGraph({
    selfHandle: "meghan",
    contacts: [contact],
    following: [contact.id],
    progress: {
      passing: progress({ entered: true, breathIndex: 2, lastOpenedAt: NOW - 10 * 60 * 1000, kept: ["secret"] }),
    },
    hostedSits: [sit],
    sitPledges: [pledge],
    togetherKeeps: [together],
  });

  const mina = friendProfile("mina", graph);
  assert.ok(mina);
  assert.equal(mina.isSelf, false);
  assert.equal(mina.score, null);
  assert.equal(mina.readingNow?.workTitle, "Naomi");
  assert.equal(mina.readingNow?.atIndex, undefined);
  const kinds = mina.activity.map((row) => row.kind);
  assert.ok(kinds.includes("kept"));
  assert.ok(kinds.includes("hosted"));
  assert.ok(kinds.includes("tonight"));
  assert.ok(kinds.includes("together"));
  assert.equal(kinds.includes("reading"), false);
  assert.equal(kinds.includes("sit"), false);
  assert.equal(
    mina.activity.some((row) => row.breathId === "secret"),
    false,
  );
  assert.equal(mina.activity[0]?.kind, "tonight");
  const kept = mina.activity.find((row) => row.kind === "kept");
  assert.equal(kept?.line, "She writes it in Roman letters.");
  assert.equal(kept?.atIndex, 12);
  assert.match(activityBlurb(kept!, NOW), /kept a line from Naomi · 2h/);

  const self = friendProfile("meghan", graph);
  assert.equal(self?.readingNow?.workId, "passing");
  assert.equal(
    self?.activity.some((row) => row.kind === "reading" && row.workId === "passing"),
    false,
  );
  assert.ok(self?.activity.some((row) => row.kind === "kept" && row.breathId === "secret"));
  assert.ok(self?.activity.some((row) => row.kind === "joined"));
  assert.equal(
    self?.activity.some((row) => row.line === "She writes it in Roman letters."),
    false,
  );

  const handles = listFriends(graph).map((row) => row.handle);
  assert.deepEqual(handles[0], "meghan");
  assert.ok(handles.includes("mina"));
  assert.equal(handles.includes("nora"), false);
});

test("an unknown handle opens an empty profile instead of invented activity", () => {
  const profile = friendProfile("ada", emptyGraph({ selfHandle: "meghan" }));
  assert.ok(profile);
  assert.equal(profile.activity.length, 0);
  assert.equal(profile.readingNow, undefined);
  assert.equal(listFriends(emptyGraph({ selfHandle: "meghan" })).some((row) => row.handle === "ada"), false);
  assert.equal(friendProfile("a", emptyGraph()), null);
});

test("no real friends is just this device", () => {
  const rows = listFriends(emptyGraph({ selfHandle: "meghan" }));
  assert.equal(rows.filter((row) => !row.isSelf).length, 0);
  assert.equal(listFriends(emptyGraph()).length, 0);
});

test("a followed name with no activity is waiting", () => {
  const contact = asContact({ handle: "new.handle" });
  assert.ok(contact);
  const rows = listFriends(
    emptyGraph({
      selfHandle: "meghan",
      contacts: [contact],
      following: [contact.id],
    }),
  );
  const row = rows.find((item) => item.handle === "new.handle");
  assert.equal(row?.following, true);
  assert.equal(row?.waiting, true);
  assert.equal(row?.readingTitle, "");
});

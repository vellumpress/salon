import assert from "node:assert/strict";
import test from "node:test";
import {
  asContact,
  contactId,
  friendsFeed,
  searchPeople,
  youCard,
} from "./friends.ts";
import { handleError, normalizeHandle, readerByHandle } from "./social.ts";
import type { WorkProgress } from "./store.ts";

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

test("normalizeHandle strips @ and punctuation", () => {
  assert.equal(normalizeHandle("@Ada-Voss"), "adavoss");
  assert.equal(normalizeHandle("  Jules  "), "jules");
});

test("handleError blocks reserved and taken names", () => {
  assert.equal(handleError("a"), "Use at least two letters.");
  assert.equal(handleError("salon"), "That name is reserved.");
  assert.equal(handleError("ada", ["ada"]), "Someone already sits as that name.");
  assert.equal(handleError("mina"), null);
});

test("demo salon handles are not a people directory", () => {
  assert.equal(readerByHandle("@Ada"), undefined);
  assert.equal(readerByHandle("nora"), undefined);
  assert.equal(searchPeople("passing").length, 0);
  assert.equal(searchPeople("").length, 0);
  assert.equal(friendsFeed(["ada", "nora", "vera", "ivo", "cleo", "leo", "rene"]).length, 0);
});

test("local contacts join the friends feed", () => {
  const contact = asContact({ handle: "mina", name: "Mina", reading: "passing" });
  assert.ok(contact);
  assert.equal(contact.id, contactId("mina"));
  const feed = friendsFeed([contact.id], [contact]);
  assert.equal(feed[0]?.handle, "mina");
  assert.equal(feed[0]?.workTitle, "Passing");
});

test("youCard uses last-read as currently sitting", () => {
  const you = youCard({
    handle: "reader",
    progress: {
      passing: progress({ entered: true, lastOpenedAt: 20, breathIndex: 4 }),
    },
  });
  assert.equal(you.handle, "reader");
  assert.equal(you.reading, "passing");
  assert.equal(you.workTitle, "Passing");
});

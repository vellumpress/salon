import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  asContact,
  boardKeptLines,
  contactId,
  fitRailHeight,
  friendsFeed,
  searchPeople,
  youCard,
} from "./friends.ts";
import type { TogetherKeep } from "./together-keep.ts";
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

test("boardKeptLines stays empty until this phone has a real line", () => {
  assert.deepEqual(boardKeptLines({ selfHandle: "mina" }), []);
  assert.deepEqual(
    boardKeptLines({
      selfHandle: "",
      selfLines: [
        { workId: "passing", breathId: "b1", text: "A sentence.", title: "Passing", at: 2 },
      ],
    }),
    [],
  );
});

test("boardKeptLines keeps a together line and drops blanks", () => {
  const pair: TogetherKeep = {
    id: "tk1",
    workId: "passing",
    workTitle: "Passing",
    author: "Nella Larsen",
    theirs: { handle: "mina", name: "Mina", breathId: "b1", line: "The envelope.", at: 3 },
    yours: { handle: "reader", name: "You", breathId: "b2", line: "   ", at: 4 },
    createdAt: 1,
  };
  const lines = boardKeptLines({ selfHandle: "reader", togetherKeeps: [pair] });
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.handle, "mina");
  assert.equal(lines[0]?.line, "The envelope.");
  assert.equal(lines[0]?.workTitle, "Passing");
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

test("friends rails hug the cards and do not paint an ink plate", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const friends = readFileSync(new URL("../routes/friends.tsx", import.meta.url), "utf8");
  assert.match(friends, /className="rail-clip"/);
  assert.match(friends, /className="rail-hug"/);
  assert.doesNotMatch(friends, /className="rail hug"/);
  assert.match(friends, /fitRailHeight/);
  const clip = css.match(/\.rail-clip\s*\{([^}]+)\}/);
  assert.ok(clip, "missing .rail-clip");
  assert.match(clip[1], /overflow-x:\s*auto/);
  assert.match(clip[1], /overflow-y:\s*hidden/);
  assert.match(clip[1], /background:\s*var\(--color-paper\)/);
  assert.doesNotMatch(clip[1], /display:\s*flex/);
  assert.doesNotMatch(clip[1], /background:\s*var\(--color-ink\)/);
  const row = css.match(/\.rail-hug\s*\{([^}]+)\}/);
  assert.ok(row, "missing .rail-hug");
  assert.match(row[1], /overflow:\s*visible/);
  assert.match(row[1], /background:\s*var\(--color-paper\)/);
  assert.match(row[1], /align-items:\s*flex-start/);
  assert.doesNotMatch(row[1], /background:\s*var\(--color-ink\)/);
});

test("fitRailHeight uses the tallest card, not a stretched row", () => {
  assert.equal(fitRailHeight([]), 0);
  assert.equal(fitRailHeight([0, -4]), 0);
  assert.equal(fitRailHeight([180.2, 164]), 181);
  assert.equal(fitRailHeight([220, 480]), 480);
});

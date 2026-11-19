import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { emptyShelf, mergeShelves } from "./library-sync.ts";
import { shelfButtonLabel, shelfButtonName, toggleShelfId } from "./shelf-list.ts";

test("shelf add and remove are one toggle of the saved list", () => {
  assert.deepEqual(toggleShelfId([], "passing"), ["passing"]);
  assert.deepEqual(toggleShelfId(["passing", "we"], "dalloway"), ["passing", "we", "dalloway"]);
  assert.deepEqual(toggleShelfId(["passing", "we"], "passing"), ["we"]);
});

test("a private import stays off the account shelf", () => {
  assert.deepEqual(toggleShelfId(["passing"], "import-local"), ["passing"]);
  assert.deepEqual(toggleShelfId(["passing"], "page"), ["passing"]);
});

test("shelf words stay plain", () => {
  assert.equal(shelfButtonLabel(false), "Shelf");
  assert.equal(shelfButtonLabel(true), "On shelf");
  assert.equal(shelfButtonName(false), "Add to shelf");
  assert.equal(shelfButtonName(true), "Remove from shelf");
  assert.doesNotMatch(`${shelfButtonLabel(false)} ${shelfButtonName(true)}`, /\b(lane|sit)\b/i);
});

test("sign-in unions the phone shelf with the account, and an empty side does not erase the other", () => {
  const local = { ...emptyShelf(), favorites: ["passing"] };
  const remote = { ...emptyShelf(), favorites: ["we", "passing"] };
  assert.deepEqual(mergeShelves(local, remote).favorites, ["passing", "we"]);
  assert.deepEqual(mergeShelves(local, emptyShelf()).favorites, ["passing"]);
  assert.deepEqual(mergeShelves(emptyShelf(), remote).favorites, ["we", "passing"]);
});

test("signing out does not clear the shelf on this phone", () => {
  const session = readFileSync(new URL("./use-reader-session.ts", import.meta.url), "utf8");
  const signOutAt = session.indexOf("const signOut = useCallback");
  const signOut = session.slice(signOutAt, session.indexOf("const syncHandle", signOutAt));
  assert.match(signOut, /signOutReaderVault/);
  assert.match(signOut, /signOutHosted/);
  assert.doesNotMatch(signOut, /favorites|vellum-v1|localStorage\.clear|removeItem/);

  const sync = readFileSync(new URL("../components/remote-sync.tsx", import.meta.url), "utf8");
  const signedOut = sync.slice(sync.indexOf("onAuthStateChange"), sync.indexOf("if (!isOffline())"));
  assert.match(signedOut, /SIGNED_OUT/);
  assert.doesNotMatch(signedOut, /favorites:\s*\[\]|localStorage\.clear/);
});

test("the book gate and the reader both offer the shelf control, and You has a Shelf tab", () => {
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const you = readFileSync(new URL("../components/you-reading.tsx", import.meta.url), "utf8");
  assert.match(reader, /FavoriteMark workId=\{work\.id\} className="mt-4 border border-ink"/);
  assert.equal((reader.match(/<FavoriteMark workId=\{work\.id\}/g) ?? []).length, 2);
  assert.match(you, /id: "shelf", label: "Shelf"/);
  assert.match(you, /<ShelfList /);
  assert.doesNotMatch(you, /label: "Your lines"/);
});

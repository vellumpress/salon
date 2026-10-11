import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sessionFromAuthEvent } from "./auth-session.ts";

test("a returning session is kept when the first auth event has no user", () => {
  const initial = sessionFromAuthEvent("INITIAL_SESSION", null, "reader-1");
  assert.equal(initial.userId, "reader-1");
  assert.equal(initial.sync, false);

  const refreshed = sessionFromAuthEvent("TOKEN_REFRESHED", null, "reader-1");
  assert.equal(refreshed.userId, "reader-1");
  assert.equal(refreshed.sync, false);

  const signedIn = sessionFromAuthEvent("SIGNED_IN", "reader-1", null);
  assert.equal(signedIn.userId, "reader-1");
  assert.equal(signedIn.sync, true);

  const signedOut = sessionFromAuthEvent("SIGNED_OUT", null, "reader-1");
  assert.equal(signedOut.userId, null);
  assert.equal(signedOut.sync, false);
});

test("Friends restarts from the session event and does not invent an @name", () => {
  const sync = readFileSync(new URL("../components/remote-sync.tsx", import.meta.url), "utf8");
  assert.match(sync, /sessionFromAuthEvent/);
  assert.match(sync, /sessionTick/);
  const session = readFileSync(new URL("./use-reader-session.ts", import.meta.url), "utf8");
  const adoptAt = session.indexOf("const apply = async");
  const createAt = session.indexOf("const createAccount = useCallback");
  const adopt = session.slice(adoptAt, createAt);
  assert.doesNotMatch(adopt, /split\("@\"\)/);
  assert.match(adopt, /preferred\.length < 2/);
  assert.match(adopt, /setTimeout/);
});

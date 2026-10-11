import assert from "node:assert/strict";
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

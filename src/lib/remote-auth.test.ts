import assert from "node:assert/strict";
import test from "node:test";
import { confirmEmailMessage, HANDLE_TAKEN_MESSAGE, mapAuthError } from "./remote-auth.ts";

test("auth errors stay honest about confirmation and a taken handle", () => {
  assert.equal(mapAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }).status, "confirm_email");
  assert.equal(mapAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }).status, "invalid");
  assert.equal(mapAuthError({ code: "over_email_send_rate_limit", message: "rate limit" }).status, "error");
  assert.match(confirmEmailMessage("mina"), /Check your email to confirm @mina/);
  assert.match(confirmEmailMessage("mina"), /this phone/);
  assert.equal(HANDLE_TAKEN_MESSAGE, "That @handle is taken.");
});

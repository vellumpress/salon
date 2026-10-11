import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  authFailureMessage,
  authLinkNotice,
  authReturnUrl,
  confirmEmailMessage,
  EMAIL_EXISTS_MESSAGE,
  HANDLE_TAKEN_MESSAGE,
  isNetworkError,
  MAGIC_LINK_SENT,
  MAIL_RATE_MESSAGE,
  mapAuthError,
  PASSWORD_MISMATCH_MESSAGE,
  recoveryLinkKind,
  RESET_EMAIL_RATE,
  RESET_EMAIL_SUCCESS,
  resetEmailNotice,
  shouldPreserveRecoverySession,
} from "./remote-auth.ts";

test("auth errors stay honest about confirmation and a taken handle", () => {
  assert.equal(mapAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }).status, "confirm_email");
  assert.equal(mapAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }).status, "invalid");
  assert.equal(mapAuthError({ code: "over_email_send_rate_limit", message: "rate limit" }).status, "error");
  assert.match(confirmEmailMessage("mina"), /Check your email to confirm @mina/);
  assert.match(confirmEmailMessage("mina"), /this phone/);
  assert.equal(HANDLE_TAKEN_MESSAGE, "That @handle is taken.");
  const aborted = new Error("The operation was aborted.");
  aborted.name = "AbortError";
  assert.equal(isNetworkError(aborted), true);
  assert.equal(isNetworkError(new TypeError("Failed to fetch")), true);
});

test("password reset mail stays neutral except for the send rate limit", () => {
  assert.equal(resetEmailNotice(null).text, RESET_EMAIL_SUCCESS);
  assert.equal(resetEmailNotice({ message: "User not found" }).tone, "success");
  assert.equal(
    resetEmailNotice({ code: "over_email_send_rate_limit", message: "rate limit" }).text,
    RESET_EMAIL_RATE,
  );
  assert.equal(recoveryLinkKind("", ""), "invalid");
  assert.equal(recoveryLinkKind("", "#error=access_denied&error_code=otp_expired"), "invalid");
  assert.equal(
    recoveryLinkKind("", "#access_token=tok&refresh_token=ref&type=recovery"),
    "pending",
  );
  assert.equal(recoveryLinkKind("?code=abc", ""), "pending");
  assert.equal(shouldPreserveRecoverySession("PASSWORD_RECOVERY", "/salon/login"), true);
  assert.equal(shouldPreserveRecoverySession("SIGNED_IN", "/salon/reset-password"), true);
  assert.equal(shouldPreserveRecoverySession("SIGNED_IN", "/salon/login"), false);
});

test("a wrong password is not told that the email already exists", () => {
  assert.equal(authFailureMessage("invalid"), PASSWORD_MISMATCH_MESSAGE);
  assert.equal(authFailureMessage("exists"), EMAIL_EXISTS_MESSAGE);
  assert.match(PASSWORD_MISMATCH_MESSAGE, /did not match/);
  assert.equal(authLinkNotice("", "#error=access_denied&error_code=otp_expired"), "That link has expired. Ask for a new one.");
  assert.equal(authLinkNotice("", ""), "");
  assert.equal(authReturnUrl("/login", "http://127.0.0.1:8080"), "http://127.0.0.1:8080/salon/login");
  assert.equal(authReturnUrl("/reset-password", "https://vellumpress.github.io"), "https://vellumpress.github.io/salon/reset-password");
  assert.equal(MAGIC_LINK_SENT, "Check your email. The link brings you back here.");
  assert.match(MAIL_RATE_MESSAGE, /Wait a little/);
});

test("sign-out leaves the phone library, and a stale phone password still asks the server", () => {
  const session = readFileSync(new URL("./use-reader-session.ts", import.meta.url), "utf8");
  const signOutAt = session.indexOf("const signOut = useCallback");
  const syncAt = session.indexOf("const syncHandle = useCallback");
  const signOutBlock = session.slice(signOutAt, syncAt);
  assert.match(signOutBlock, /signOutReaderVault/);
  assert.doesNotMatch(signOutBlock, /vellum-v1|localStorage\.clear|removeItem/);
  const signInAt = session.indexOf("const signIn = useCallback");
  const signInBlock = session.slice(signInAt, signOutAt);
  assert.match(signInBlock, /That password does not match/);
  assert.match(signInBlock, /rehashVaultPassword/);
  assert.match(signInBlock, /connectHostedAccount/);
});

test("sign-in offers forgot password and the reset pages call Supabase", () => {
  const form = readFileSync(new URL("../components/reader-auth-form.tsx", import.meta.url), "utf8");
  const forgot = readFileSync(new URL("../routes/forgot-password.tsx", import.meta.url), "utf8");
  const reset = readFileSync(new URL("../routes/reset-password.tsx", import.meta.url), "utf8");
  const session = readFileSync(new URL("./use-reader-session.ts", import.meta.url), "utf8");
  assert.match(form, /Forgot password\?/);
  assert.match(form, /Email me a sign-in link/);
  assert.match(forgot, /authReturnUrl\("\/reset-password"\)/);
  assert.match(form, /to="\/forgot-password"/);
  assert.match(forgot, /resetPasswordForEmail/);
  assert.match(forgot, /RESET_EMAIL_SUCCESS|resetEmailNotice/);
  assert.match(reset, /updateUser\(\{ password \}\)/);
  assert.match(reset, /rehashVaultPassword/);
  assert.match(reset, /to="\/forgot-password"/);
  assert.match(session, /shouldPreserveRecoverySession/);
});

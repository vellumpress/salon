import assert from "node:assert/strict";
import test from "node:test";
import { toStartCookieOptions } from "./start-cookie-options.ts";

test("maps Better Auth Set-Cookie fields onto Start cookie options", () => {
  const opts = toStartCookieOptions({
    value: "token",
    path: "/app",
    httponly: true,
    secure: true,
    samesite: "Lax",
    "max-age": 300,
  });
  assert.equal(opts.path, "/app");
  assert.equal(opts.httpOnly, true);
  assert.equal(opts.secure, true);
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.maxAge, 300);
});

test("defaults missing attributes and ignores a bad max-age", () => {
  const opts = toStartCookieOptions({ value: "x", samesite: "nope", "max-age": "nope" });
  assert.equal(opts.path, "/");
  assert.equal(opts.sameSite, "lax");
  assert.equal(opts.maxAge, undefined);
  assert.equal(opts.secure, true);
  assert.equal(opts.httpOnly, true);
});

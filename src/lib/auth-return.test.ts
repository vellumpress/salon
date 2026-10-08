import assert from "node:assert/strict";
import test from "node:test";
import { safeAuthNext } from "./auth-return.ts";

test("auth return stays on invite, club, sit, and read paths", () => {
  assert.equal(safeAuthNext("/club/invite/abcdefghij"), "/club/invite/abcdefghij");
  assert.equal(safeAuthNext("/club/ab12cd"), "/club/ab12cd");
  assert.equal(safeAuthNext("/together"), "/together");
  assert.equal(safeAuthNext("/read/passing?sit=20&pair=ab12cd"), "/read/passing?sit=20&pair=ab12cd");
  assert.equal(safeAuthNext("/sit/abc"), "/sit/abc");
  assert.equal(safeAuthNext("/friends/ada"), "/friends/ada");
  assert.equal(safeAuthNext("/shuffle"), "/shuffle");
});

test("auth return rejects open redirects", () => {
  assert.equal(safeAuthNext("https://evil.example/club/ab12"), undefined);
  assert.equal(safeAuthNext("//evil.example"), undefined);
  assert.equal(safeAuthNext("/\\evil"), undefined);
  assert.equal(safeAuthNext("/login"), undefined);
  assert.equal(safeAuthNext("/desk"), undefined);
  assert.equal(safeAuthNext("club/ab12"), undefined);
  assert.equal(safeAuthNext(""), undefined);
  assert.equal(safeAuthNext("/club/invite/short"), undefined);
});

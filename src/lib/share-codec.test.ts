import assert from "node:assert/strict";
import test from "node:test";
import { asShareToken, clipLine, decodeShare, encodeShare } from "./share-codec.ts";

test("encodeShare round-trips a compact payload", () => {
  const token = encodeShare({ v: 1, k: "echo", w: "passing" });
  assert.ok(asShareToken(token));
  assert.deepEqual(decodeShare(token), { v: 1, k: "echo", w: "passing" });
});

test("asShareToken rejects short or messy values", () => {
  assert.equal(asShareToken("abc"), undefined);
  assert.equal(asShareToken("not a token!"), undefined);
  assert.ok(asShareToken("abcdefgh"));
});

test("clipLine keeps short lines and ellipsizes long ones", () => {
  assert.equal(clipLine("  a quiet line  "), "a quiet line");
  assert.ok(clipLine("word ".repeat(80), 40).endsWith("…"));
});

import assert from "node:assert/strict";
import test from "node:test";
import { splitEmphasis } from "./emphasized-text.ts";

test("underscore, star, and em markup become italic parts", () => {
  for (const text of [
    "that went _bung_.",
    "that went *bung*.",
    "that went <em>bung</em>.",
  ]) {
    assert.deepEqual(splitEmphasis(text), [
      { type: "text", value: "that went " },
      { type: "em", value: "bung" },
      { type: "text", value: "." },
    ]);
  }
});

test("plain text is unchanged", () => {
  assert.deepEqual(splitEmphasis("The sugar buildings fell down."), [
    { type: "text", value: "The sugar buildings fell down." },
  ]);
});

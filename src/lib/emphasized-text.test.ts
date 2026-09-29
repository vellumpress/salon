import assert from "node:assert/strict";
import test from "node:test";
import { isSectionBreak, splitEmphasis } from "./emphasized-text.ts";

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

test("unpaired emphasis marks are dropped and paired italics stay", () => {
  assert.deepEqual(splitEmphasis("house_."), [{ type: "text", value: "house." }]);
  assert.deepEqual(splitEmphasis('_This is the "living" room'), [
    { type: "text", value: 'This is the "living" room' },
  ]);
  assert.deepEqual(splitEmphasis("a lone * remains"), [
    { type: "text", value: "a lone  remains" },
  ]);
  assert.deepEqual(splitEmphasis("that went _bung_."), [
    { type: "text", value: "that went " },
    { type: "em", value: "bung" },
    { type: "text", value: "." },
  ]);
  assert.deepEqual(splitEmphasis("keep *this* star"), [
    { type: "text", value: "keep " },
    { type: "em", value: "this" },
    { type: "text", value: " star" },
  ]);
});

test("em dashes and double em dashes stay dashes", () => {
  for (const text of ["a pause — then", "the blanks (——) stay", "—— and — together"]) {
    assert.equal(
      splitEmphasis(text).map((part) => part.value).join(""),
      text,
    );
    assert.equal(isSectionBreak(text), false);
  }
});

test("asterisk rows are section breaks, not italics", () => {
  for (const text of ["* * *", "* * * * *", "  ***  "]) {
    assert.equal(isSectionBreak(text), true, text);
  }
  assert.equal(isSectionBreak("*this*"), false);
  assert.equal(isSectionBreak("keep *this* star"), false);
});

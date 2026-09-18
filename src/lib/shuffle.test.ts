import assert from "node:assert/strict";
import test from "node:test";
import { asPairCode, clubPair } from "./pair.ts";

test("accepts friend codes and club ids as pair rooms", () => {
  assert.equal(asPairCode("ab3k2n"), "ab3k2n");
  assert.equal(asPairCode("Drayton"), "drayton");
  assert.equal(asPairCode("ferryslip"), "ferryslip");
  assert.equal(asPairCode("abc"), undefined);
  assert.equal(asPairCode("not a room"), undefined);
});

test("clubPair keeps alphanumeric club ids", () => {
  assert.equal(clubPair("drayton"), "drayton");
  assert.equal(clubPair("ferryslip"), "ferryslip");
  assert.equal(clubPair("East Side"), "eastside");
  assert.equal(clubPair("k3m9p2qx"), "k3m9p2qx");
});

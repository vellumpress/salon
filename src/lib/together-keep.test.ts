import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeEchoInvite,
  echoInviteUrl,
  encodeEchoInvite,
  findEchoBreath,
  pairTogetherKeep,
  sameTogetherPair,
} from "./together-keep.ts";

const breaths = [
  { id: "s0-0", text: "The street is still." },
  { id: "s0-1", text: "The envelope is still unopened." },
  { id: "s0-2", text: "She writes it in Roman letters." },
];

test("echo invite encodes a friend's kept line", () => {
  const token = encodeEchoInvite({
    workId: "passing",
    handle: "@Ada",
    name: "Ada Voss",
    line: "The envelope is still unopened.",
    breathId: "s0-1",
    at: 1,
    word: "letter",
  });
  const invite = decodeEchoInvite(token);
  assert.ok(invite);
  assert.equal(invite.handle, "ada");
  assert.equal(invite.workId, "passing");
  assert.equal(invite.at, 1);
  assert.equal(invite.breathId, "s0-1");
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string } } }).window = {
    location: { origin: "https://vellumpress.github.io" },
  };
  try {
    const url = echoInviteUrl(invite);
    assert.match(url, /^https:\/\/vellumpress\.github\.io\/salon\/read\/passing\?/);
    assert.match(url, /echo=/);
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});

test("findEchoBreath prefers the friend's breath, then the line", () => {
  assert.equal(
    findEchoBreath(breaths, { breathId: "s0-2", line: "The envelope is still unopened." }),
    2,
  );
  assert.equal(findEchoBreath(breaths, { line: "The envelope is still unopened." }), 1);
  assert.equal(findEchoBreath(breaths, { word: "street" }), 0);
});

test("pairTogetherKeep links two keeps on the same work", () => {
  const pair = pairTogetherKeep({
    workId: "passing",
    theirs: {
      handle: "ada",
      name: "Ada Voss",
      breathId: "s0-1",
      line: "The envelope is still unopened.",
      at: 1,
    },
    yours: {
      handle: "mina",
      name: "Mina",
      breathId: "s0-2",
      line: "She writes it in Roman letters.",
      at: 2,
    },
  });
  assert.ok(pair);
  assert.equal(pair.workTitle, "Passing");
  assert.equal(pair.theirs.handle, "ada");
  assert.equal(pair.yours.breathId, "s0-2");
  assert.ok(
    sameTogetherPair(pair, {
      ...pair,
      id: "other",
    }),
  );
});

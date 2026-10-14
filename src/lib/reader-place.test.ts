import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sentenceAtFor } from "./sentence-place.ts";

test("a breath keeps its sentence, and the next breath does not inherit it", () => {
  const here = { breathIndex: 4, sentenceAt: 3 };
  assert.equal(sentenceAtFor(here, 4, { sentenceAt: 1 }), 1);
  assert.equal(sentenceAtFor(here, 4), 3);
  assert.equal(sentenceAtFor(here, 4, {}), 3);
  assert.equal(sentenceAtFor({ breathIndex: 4 }, 4), 0);
  assert.equal(sentenceAtFor(here, 5), 0);
  assert.equal(sentenceAtFor(here, 5, { sentenceAt: 2 }), 2);
  assert.equal(sentenceAtFor(here, 4, { sentenceAt: 0 }), 0);
});

test("the reader writes the sentence, and an empty boot does not overwrite it", () => {
  const store = readFileSync(new URL("./store.ts", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  assert.match(store, /if \(!persistWrites\) return/);
  assert.match(store, /onFinishHydration\(armPersist\)/);
  assert.match(store, /sentenceAt: sentenceAtFor/);
  assert.match(reader, /setSentenceAt\(work\.id, index, cursor\)/);
  assert.match(reader, /savedSentenceAt\(progress, index\)/);
  assert.match(reader, /stampTap\(work, next, sentence\)/);
});

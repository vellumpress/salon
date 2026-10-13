import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { displayKindForForm, packDisplayBlocks, phoneBlockLimit, phoneLineMeasure } from "./display-blocks.ts";
import { shelfWork } from "./catalog/shelf.ts";
import { sentenceSpans } from "./sentences.ts";
import {
  breathSentenceCount,
  focusPieces,
  repeatSentenceStep,
  stepSentencePlace,
} from "./sentence-step.ts";

test("a left tap inside a split paragraph stays on that paragraph", () => {
  assert.deepEqual(
    stepSentencePlace({ index: 60, cursor: 1, delta: -1, here: 2, prevCount: 2, breathCount: 100 }),
    { index: 60, cursor: 0 },
  );
  assert.deepEqual(
    stepSentencePlace({ index: 60, cursor: 0, delta: -1, here: 2, prevCount: 2, breathCount: 100 }),
    { index: 59, cursor: 1 },
  );
});

test("a right tap leaves on the last sentence and the next breath opens at the start", () => {
  assert.deepEqual(
    stepSentencePlace({ index: 60, cursor: 0, delta: 1, here: 2, prevCount: 1, breathCount: 100 }),
    { index: 60, cursor: 1 },
  );
  assert.deepEqual(
    stepSentencePlace({ index: 60, cursor: 1, delta: 1, here: 2, prevCount: 1, breathCount: 100 }),
    { index: 61, cursor: 0 },
  );
});

test("the ends of the book do not wrap", () => {
  assert.equal(
    stepSentencePlace({ index: 0, cursor: 0, delta: -1, here: 3, prevCount: 1, breathCount: 4 }),
    "start",
  );
  assert.equal(
    stepSentencePlace({ index: 3, cursor: 1, delta: 1, here: 2, prevCount: 1, breathCount: 4 }),
    "end",
  );
});

test("verse is one step even when the stanza has several stops", () => {
  const text = "The sun set. The moon rose. Still the road.";
  assert.equal(sentenceSpans(text).length, 3);
  assert.equal(breathSentenceCount(text, "verse"), 1);
  assert.equal(breathSentenceCount(text, "prose"), 3);
});

test("moby-dick s3-32 steps one sentence, including the continuation and the breath after it", () => {
  const work = JSON.parse(readFileSync(new URL("./catalog/texts/moby-dick.json", import.meta.url), "utf8")) as {
    breaths: { id: string; text: string }[];
  };
  const at = work.breaths.findIndex((breath) => breath.id === "s3-32");
  assert.equal(at, 60);
  const here = breathSentenceCount(work.breaths[at]!.text, "prose");
  const prev = breathSentenceCount(work.breaths[at - 1]!.text, "prose");
  const next = breathSentenceCount(work.breaths[at + 1]!.text, "prose");
  assert.equal(here, 2);
  assert.equal(prev, 2);
  const blocks = packDisplayBlocks(work.breaths[at]!.text, phoneLineMeasure, phoneBlockLimit(), "prose");
  // The quote fits, so an interior stop stays inside that one sentence.
  assert.deepEqual(
    blocks.map((block) => block.sentences),
    [1, 1],
  );
  const pieces = focusPieces(work.breaths[at]!.text, blocks);
  assert.equal(pieces[0]?.[0]?.sentence, 0);
  assert.equal(pieces[1]?.every((piece) => piece.sentence === 1), true);
  assert.match(pieces[1]?.map((piece) => piece.text).join("") ?? "", /No,/);
  assert.equal(
    pieces.flat().map((piece) => piece.text).join(""),
    work.breaths[at]!.text,
  );
  const onContinuation = stepSentencePlace({
    index: at,
    cursor: 0,
    delta: 1,
    here,
    prevCount: prev,
    breathCount: work.breaths.length,
  });
  assert.deepEqual(onContinuation, { index: at, cursor: 1 });
  const backInside = stepSentencePlace({
    index: at,
    cursor: 1,
    delta: -1,
    here,
    prevCount: prev,
    breathCount: work.breaths.length,
  });
  assert.deepEqual(backInside, { index: at, cursor: 0 });
  const after = stepSentencePlace({
    index: at + 2,
    cursor: 0,
    delta: -1,
    here: breathSentenceCount(work.breaths[at + 2]!.text, "prose"),
    prevCount: next,
    breathCount: work.breaths.length,
  });
  assert.deepEqual(after, { index: at + 1, cursor: next - 1 });
});

test("the first sentence of a continuation block steps back into the block above", () => {
  const work = JSON.parse(readFileSync(new URL("./catalog/texts/moby-dick.json", import.meta.url), "utf8")) as {
    breaths: { text: string }[];
  };
  const text = work.breaths[0]!.text;
  const blocks = packDisplayBlocks(text, phoneLineMeasure, phoneBlockLimit(), "prose");
  assert.ok(blocks.length > 1);
  assert.ok((blocks[0]?.sentences ?? 0) > 1);
  const continuation = blocks[0]!.sentences;
  const back = stepSentencePlace({
    index: 0,
    cursor: continuation,
    delta: -1,
    here: breathSentenceCount(text, "prose"),
    prevCount: 1,
    breathCount: work.breaths.length,
  });
  assert.deepEqual(back, { index: 0, cursor: continuation - 1 });
  let base = 0;
  const pieces = focusPieces(text, blocks);
  blocks.forEach((block, index) => {
    const shown = pieces[index] ?? [];
    assert.equal(shown.map((piece) => piece.text).join(""), block.text);
    assert.equal(shown.filter((piece) => piece.sentence >= base).length, block.sentences);
    base += block.sentences;
  });
  assert.equal(base, breathSentenceCount(text, "prose"));
  const letter = JSON.parse(readFileSync(new URL("./catalog/texts/cranford.json", import.meta.url), "utf8")) as {
    breaths: { id: string; text: string }[];
  };
  const quote = letter.breaths.find((breath) => breath.id === "s2-4")?.text ?? "";
  const quoteBlocks = packDisplayBlocks(quote, phoneLineMeasure, phoneBlockLimit(), "prose");
  const quotePieces = focusPieces(quote, quoteBlocks);
  const quoteSentences = sentenceSpans(quote, "in-quotes").length;
  assert.ok(quoteBlocks.length > 1);
  assert.equal(breathSentenceCount(quote, "prose"), quoteSentences);
  assert.ok(quoteBlocks.every((block) => block.sentences >= 1));
  assert.equal(
    quoteBlocks.reduce((sum, block) => sum + block.sentences, 0),
    quoteSentences,
  );
  assert.deepEqual(
    quotePieces.flat().map((piece) => piece.sentence),
    quotePieces.flat().map((_, index) => index),
  );
  assert.equal(quotePieces.flat().map((piece) => piece.text).join(""), quote);
  const forward = stepSentencePlace({
    index: 46,
    cursor: 0,
    delta: 1,
    here: quoteSentences,
    prevCount: 1,
    breathCount: letter.breaths.length,
  });
  assert.deepEqual(forward, { index: 46, cursor: 1 });
  const backInsideQuote = stepSentencePlace({
    index: 46,
    cursor: 1,
    delta: -1,
    here: quoteSentences,
    prevCount: 1,
    breathCount: letter.breaths.length,
  });
  assert.deepEqual(backInsideQuote, { index: 46, cursor: 0 });
});

test("a play speech steps sentences and keeps the speaker pieces intact", () => {
  const work = JSON.parse(readFileSync(new URL("./catalog/texts/the-father.json", import.meta.url), "utf8")) as {
    breaths: { id: string; text: string }[];
  };
  const at = work.breaths.findIndex((breath) => breath.id === "s0-51");
  const text = work.breaths[at]!.text;
  const blocks = packDisplayBlocks(text, phoneLineMeasure, phoneBlockLimit(), "speech");
  assert.ok(blocks.length > 1);
  const firstBlock = blocks[0]!.sentences;
  assert.ok(firstBlock >= 1);
  const onContinuation = firstBlock;
  assert.equal(blocks.slice(0, 1).reduce((sum, block) => sum + block.sentences, 0), onContinuation);
  const spoken = focusPieces(text, blocks, "speech");
  blocks.forEach((block, index) => {
    assert.equal(spoken[index]?.map((piece) => piece.text).join(""), block.text);
  });
  assert.match(spoken[1]?.[0]?.text ?? "", /^Captain:/);
  assert.deepEqual(
    stepSentencePlace({
      index: at,
      cursor: onContinuation,
      delta: -1,
      here: breathSentenceCount(text, "speech"),
      prevCount: 1,
      breathCount: work.breaths.length,
    }),
    { index: at, cursor: onContinuation - 1 },
  );
  assert.equal(displayKindForForm(shelfWork("the-father")?.form), "speech");
  assert.equal(displayKindForForm(shelfWork("lamia")?.form), "verse");
});

test("a hold repeats the same one-sentence step", () => {
  const counts = [2, 1, 3];
  const landed = repeatSentenceStep({ index: 1, cursor: 0 }, -1, 2, (index) => counts[index] ?? 1, counts.length);
  assert.deepEqual(landed, { index: 0, cursor: 0 });
  const stopped = repeatSentenceStep({ index: 0, cursor: 0 }, -1, 3, (index) => counts[index] ?? 1, counts.length);
  assert.equal(stopped, "start");
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { packDisplayBlocks, unmeasuredBlocks, VIEWPORT_BLOCK_FRACTION } from "./display-blocks.ts";
import { sentenceSpans } from "./sentences.ts";

function loadBreath(id: string, index: number) {
  const work = JSON.parse(
    readFileSync(new URL(`./catalog/texts/${id}.json`, import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  return work.breaths[index]?.text ?? "";
}

/** Rough phone column: about 34 characters a line, 29px a line, third of 844. */
function lineMeasure(text: string) {
  const chars = text.replace(/\s+/g, " ").trim().length;
  const lines = Math.max(1, Math.ceil(chars / 34));
  return lines * 29;
}

const PHONE_THIRD = Math.floor(844 * VIEWPORT_BLOCK_FRACTION);

function assertPacked(text: string, limit = PHONE_THIRD) {
  const blocks = packDisplayBlocks(text, lineMeasure, limit);
  assert.equal(blocks.map((block) => block.text).join(""), text);
  for (const block of blocks) {
    assert.ok(block.sentences >= 1);
    if (block.sentences > 1) {
      assert.ok(
        lineMeasure(block.text) <= limit,
        `multi-sentence block measured ${lineMeasure(block.text)} over ${limit}`,
      );
    }
  }
  return blocks;
}

test("sentence slices join back to the original characters", () => {
  const samples = [
    loadBreath("moby-dick", 0),
    loadBreath("the-price-of-love", 0),
    "I met Mr. Smith in town. He waved.",
    "Call me Ishmael.",
    "No. 12 stood open. She went in.",
    "",
  ];
  for (const text of samples) {
    const spans = sentenceSpans(text);
    assert.equal(spans.map((span) => text.slice(span.start, span.end)).join(""), text);
    for (let i = 1; i < spans.length; i += 1) {
      assert.equal(spans[i]?.start, spans[i - 1]?.end);
    }
  }
});

test("Mr. and No. 12 stay inside the sentence they belong to", () => {
  const mister = sentenceSpans("I met Mr. Smith in town. He waved.");
  assert.equal(mister.length, 2);
  assert.equal("I met Mr. Smith in town.".slice(0), "I met Mr. Smith in town.");
  assert.match("I met Mr. Smith in town. He waved.".slice(mister[0]!.start, mister[0]!.end), /Mr\. Smith/);
  const number = sentenceSpans("No. 12 stood open. She went in.");
  assert.equal(number.length, 2);
  assert.match("No. 12 stood open. She went in.".slice(number[0]!.start, number[0]!.end), /No\. 12/);
});

test("a paragraph taller than a third of the phone splits only at sentences", () => {
  const moby = loadBreath("moby-dick", 0);
  const fleck = loadBreath("the-price-of-love", 0);
  for (const text of [moby, fleck]) {
    assert.ok(lineMeasure(text) > PHONE_THIRD);
    const blocks = assertPacked(text);
    assert.ok(blocks.length > 1, "long paragraph stayed one block");
    assert.ok(blocks.some((block) => block.sentences >= 1));
  }
});

test("one sentence taller than a third stays a single block", () => {
  const text = `${"word ".repeat(400)}end.`;
  assert.equal(sentenceSpans(text).length, 1);
  assert.ok(lineMeasure(text) > PHONE_THIRD);
  const blocks = assertPacked(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.sentences, 1);
  assert.equal(blocks[0]?.text, text);
});

test("a short paragraph is left whole", () => {
  const text = "Call me Ishmael. The sea was calm.";
  const blocks = assertPacked(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.text, text);
});

test("an unmeasured paragraph is one sentence per block", () => {
  const text = loadBreath("moby-dick", 0);
  const blocks = unmeasuredBlocks(text);
  assert.ok(blocks.length > 1);
  assert.equal(blocks.map((block) => block.text).join(""), text);
  for (const block of blocks) assert.equal(block.sentences, 1);
});

test("the block limit is one third of the viewport", () => {
  assert.equal(VIEWPORT_BLOCK_FRACTION, 1 / 3);
  assert.equal(PHONE_THIRD, 281);
});

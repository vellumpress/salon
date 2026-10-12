import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { packDisplayBlocks, unmeasuredBlocks, VIEWPORT_BLOCK_FRACTION } from "./display-blocks.ts";
import { sentenceSpans } from "./sentences.ts";

function breathById(id: string, breathId: string) {
  const work = JSON.parse(
    readFileSync(new URL(`./catalog/texts/${id}.json`, import.meta.url), "utf8"),
  ) as { breaths: { id: string; text: string }[] };
  const found = work.breaths.find((item) => item.id === breathId);
  if (!found) throw new Error(`${id} ${breathId} missing`);
  return found.text;
}

function parts(text: string) {
  return sentenceSpans(text).map((span) => text.slice(span.start, span.end));
}

function recoverSpeech(blocks: { text: string }[], speaker: string) {
  const prefix = `${speaker}: `;
  return blocks
    .map((block, index) => {
      if (index === 0) return block.text;
      assert.ok(block.text.startsWith(prefix), block.text.slice(0, 40));
      return block.text.slice(prefix.length);
    })
    .join("");
}

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

test("a split block does not open on a space", () => {
  const text = "Alpha went home. Bravo stayed out. Charlie left at dawn.";
  const slices = parts(text);
  assert.ok(slices.length >= 3);
  for (const slice of slices) assert.doesNotMatch(slice, /^\s/);
  assert.equal(slices.join(""), text);
  const blocks = packDisplayBlocks(text, () => 400, 1);
  assert.ok(blocks.length >= 3);
  for (const block of blocks) assert.doesNotMatch(block.text, /^\s/);
  assert.equal(blocks.map((block) => block.text).join(""), text);
});

test("a period inside an open quote is not a sentence break", () => {
  const closed = "He said “Go.” Then he left. She smiled.";
  const closedParts = parts(closed);
  assert.deepEqual(closedParts, ["He said “Go.” ", "Then he left. ", "She smiled."]);

  const held = "She whispered “Go. Then stay.” He nodded. She left.";
  const heldParts = parts(held);
  assert.equal(heldParts.length, 3);
  assert.match(heldParts[0] ?? "", /Go\. Then stay\./);
  assert.doesNotMatch(heldParts[1] ?? "", /^\s/);

  const inches = 'He stood 6" tall in the room. Then he left the hall.';
  assert.equal(parts(inches).length, 2);
});

test("moby-dick s3-32 keeps the landlord's quote in one piece", () => {
  const text = breathById("moby-dick", "s3-32");
  const slices = parts(text);
  assert.equal(slices.length, 2);
  assert.match(slices[0] ?? "", /comprehension\.\s*$/);
  assert.match(slices[1] ?? "", /worm\. But to-night/);
  assert.match(slices[1] ?? "", /sell his head\.”$/);
  for (const slice of slices) assert.doesNotMatch(slice, /^\s/);
  const blocks = assertPacked(text);
  assert.ok(blocks.length >= 1);
  for (const block of blocks) assert.doesNotMatch(block.text, /^\s/);
});

test("moby-dick s3-6 does not break the harpooneer's question", () => {
  const text = breathById("moby-dick", "s3-6");
  const slices = parts(text);
  assert.equal(slices.length, 3);
  assert.match(slices[0] ?? "", /skrimshander\*\.\s*$/);
  assert.match(slices[1] ?? "", /unoccupied\.\s*$/);
  assert.match(slices[2] ?? "", /have ye\? I s’pose/);
  assert.match(slices[2] ?? "", /sort of thing\.”$/);
  for (const slice of slices) assert.doesNotMatch(slice, /^\s/);
  assertPacked(text);
});

test("cranford s0-14 keeps Captain Brown's advice inside the quote", () => {
  const text = breathById("cranford", "s0-14");
  const slices = parts(text);
  const advice = slices.find((slice) => slice.includes("Get her a flannel"));
  assert.ok(advice, "the flannel speech was not one slice");
  assert.match(advice ?? "", /alive\. But my advice/);
  assert.match(advice ?? "", /at once\.”$/);
  for (const slice of slices) assert.doesNotMatch(slice, /^\s/);
  assertPacked(text);
});

test("cranford s2-4 is one unsplittable letter", () => {
  const text = breathById("cranford", "s2-4");
  assert.equal(sentenceSpans(text).length, 1);
  assert.ok(lineMeasure(text) > PHONE_THIRD);
  const blocks = assertPacked(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.sentences, 1);
  assert.equal(blocks[0]?.text, text);
  const cold = unmeasuredBlocks(text);
  assert.equal(cold.length, 1);
  assert.equal(cold[0]?.sentences, 1);
});

test("poetry stays one block", () => {
  for (const [id, breathId] of [
    ["a-shropshire-lad", "s4-3"],
    ["leaves-of-grass", "s0-10"],
  ] as const) {
    const text = breathById(id, breathId);
    assert.ok(sentenceSpans(text).length > 1, `${id} ${breathId} has no sentence marks`);
    const blocks = packDisplayBlocks(text, lineMeasure, 40, "verse");
    assert.equal(blocks.length, 1, id);
    assert.equal(blocks[0]?.sentences, 1);
    assert.equal(blocks[0]?.text, text);
    const cold = unmeasuredBlocks(text, "verse");
    assert.equal(cold.length, 1);
    assert.equal(cold[0]?.text, text);
    assert.ok(lineMeasure(text) > 40);
  }
});

test("a play speech repeats the speaker on every block", () => {
  const cases = [
    ["the-father", "s0-51", "Captain"],
    ["the-little-clay-cart", "s2-1", "Maitreya"],
    ["the-little-clay-cart", "s1-30", "Director"],
  ] as const;
  for (const [id, breathId, speaker] of cases) {
    const text = breathById(id, breathId);
    const blocks = packDisplayBlocks(text, lineMeasure, 70, "speech");
    assert.ok(blocks.length > 1, `${id} ${breathId} did not split`);
    for (const block of blocks) {
      assert.match(block.text, new RegExp(`^${speaker}: `));
      assert.doesNotMatch(block.text, /^\s/);
    }
    assert.equal(recoverSpeech(blocks, speaker), text);
    const cold = unmeasuredBlocks(text, "speech");
    assert.ok(cold.length > 1, `${id} ${breathId} unmeasured stayed whole`);
    for (const block of cold) assert.match(block.text, new RegExp(`^${speaker}: `));
    assert.equal(recoverSpeech(cold, speaker), text);
  }
  const maitreya = breathById("the-little-clay-cart", "s2-1");
  const busy = parts(maitreya).find((slice) => slice.includes("other Brahman"));
  assert.match(busy ?? "", /Brahman\. I am busy\./);
  const note = "Note: Keep this remark aside. It has another sentence. And a third one besides.";
  const notes = packDisplayBlocks(note, () => 400, 1, "speech");
  assert.ok(notes.length > 1);
  assert.match(notes[0]?.text ?? "", /^Note: /);
  assert.doesNotMatch(notes[1]?.text ?? "", /^Note: /);
});

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { shelfWork } from "./catalog/shelf.ts";
import {
  displayKindForForm,
  packDisplayBlocks,
  phoneBlockLimit,
  phoneLineMeasure,
  unmeasuredBlocks,
  VIEWPORT_BLOCK_FRACTION,
} from "./display-blocks.ts";
import { interiorQuoteBreaks, legacyInteriorQuoteBreaks, sentenceSpans, splitSentences } from "./sentences.ts";

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

/** Phone column: 29.5 characters a line, 29px a line, third of 844. */
function lineMeasure(text: string) {
  return phoneLineMeasure(text);
}

const PHONE_THIRD = phoneBlockLimit(844);

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

test("an unmeasured paragraph uses the same chunks as the phone estimate", () => {
  const text = loadBreath("moby-dick", 0);
  const blocks = unmeasuredBlocks(text);
  const fitted = packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD);
  assert.deepEqual(blocks, fitted);
  assert.equal(blocks.map((block) => block.text).join(""), text);
  assert.ok(blocks.length < sentenceSpans(text).length);
  for (const block of blocks) assert.doesNotMatch(block.text, /^\s/);
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

test("cranford s2-4 breaks the letter at sentence ends inside the quote", () => {
  const text = breathById("cranford", "s2-4");
  assert.equal(sentenceSpans(text).length, 1);
  assert.ok(sentenceSpans(text, "in-quotes").length > 1);
  assert.ok(lineMeasure(text) > PHONE_THIRD);
  const blocks = assertPacked(text);
  assert.ok(blocks.length > 1);
  assert.equal(blocks.map((block) => block.text).join(""), text);
  assert.deepEqual(unmeasuredBlocks(text), blocks);
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
    assert.deepEqual(cold, packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD, "speech"));
    assert.ok(cold.length > 1, `${id} ${breathId} unmeasured stayed whole`);
    for (const block of cold) {
      assert.match(block.text, new RegExp(`^${speaker}: `));
      assert.doesNotMatch(block.text, /^\s/);
    }
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

const NESTED_QUOTE =
  "He leaned back. “My father used to say to me, ‘Never lend money to a friend. You will lose the money. You will lose the friend. And worst of all you will lose your good opinion of yourself.’ I did not listen to him, of course. Nobody listens to fathers. That is what fathers are for, I suppose, to be ignored until it is too late to matter.” He laughed.";

const NESTED_STRAIGHT =
  "He leaned back. \"My father used to say to me, 'Never lend money to a friend. You will lose the money. You will lose the friend. And worst of all you will lose your good opinion of yourself.' I did not listen to him, of course. Nobody listens to fathers. That is what fathers are for, I suppose, to be ignored until it is too late to matter.\" He laughed.";

test("the phone estimate is a third of 844 at 29.5 characters a line", () => {
  assert.equal(PHONE_THIRD, 281);
  assert.equal(phoneLineMeasure("n".repeat(29)), 29);
  assert.equal(phoneLineMeasure("n".repeat(30)), 58);
});

test("Mr. Mrs. Dr. and St. do not end a sentence, in or out of quotes", () => {
  const outside = [
    "I met Mrs. Reed in town. She waved.",
    "I met Dr. Reed in town. She waved.",
    "I met St. Paul from the train. She waved.",
    "I met Mr. Smith in town. He waved.",
  ];
  for (const text of outside) {
    const slices = parts(text);
    assert.equal(slices.length, 2, text);
    assert.match(slices[0] ?? "", /(?:Mr|Mrs|Dr|St)\. \p{L}/u);
    assert.doesNotMatch(slices[0] ?? "", /(?:Mr|Mrs|Dr|St)\.\s*$/);
  }
  const inside = [
    "She said “Mrs. Reed is here. Come in.” He nodded.",
    "She said “Dr. Reed is here. Come in.” He nodded.",
    "She said “St. Paul is far. Come in.” He nodded.",
    "She said “Mr. Home is here. Come in.” He nodded.",
    "Ask “Mr.” Home about the door. Then leave.",
    "Ask “Mrs.” Reed about the door. Then leave.",
    "Ask “Dr.” Reed about the door. Then leave.",
    "Ask “St.” Paul about the door. Then leave.",
  ];
  for (const text of inside) {
    assert.equal(interiorQuoteBreaks(text), 0, text);
    const held = parts(text).find((slice) => /(?:Mr|Mrs|Dr|St)\./.test(slice));
    assert.ok(held, text);
    assert.match(held ?? "", /(?:Mr|Mrs|Dr|St)\.(?:”|\s+\p{L})/u);
    assert.doesNotMatch(held ?? "", /(?:Mr|Mrs|Dr|St)\.\s*$/);
  }
  const villette = breathById("villette", "s0-32");
  assert.ok(legacyInteriorQuoteBreaks(villette) > 0);
  assert.equal(interiorQuoteBreaks(villette), 0);
  const home = parts(villette).find((slice) => slice.includes("Mr."));
  assert.match(home ?? "", /Mr\. Home/);
  assert.doesNotMatch(home ?? "", /Mr\.\s*$/);
  const blocks = assertPacked(villette);
  for (const block of blocks) assert.doesNotMatch(block.text, /^\s/);
  const bound = splitSentences("See “Mr. Home today. He left the room.");
  assert.ok(bound.some((chunk) => /Mr\.$/.test(chunk)));
});

test("a nested quotation keeps the inner quote together and splits the outer one", () => {
  for (const text of [NESTED_QUOTE, NESTED_STRAIGHT]) {
    assert.equal(interiorQuoteBreaks(text), 0);
    assert.ok(legacyInteriorQuoteBreaks(text) > 0, "the older splitter did not cut this quote");
    const speech = parts(text).find((slice) => slice.includes("Never lend"));
    assert.match(speech ?? "", /You will lose the money/);
    assert.match(speech ?? "", /good opinion of yourself/);
    assert.match(speech ?? "", /too late to matter/);
    const blocks = assertPacked(text);
    const holding = blocks.filter((block) => block.text.includes("Never lend"));
    assert.equal(holding.length, 1);
    assert.match(holding[0]?.text ?? "", /good opinion of yourself/);
    const later = blocks.find((block) => block.text.includes("too late to matter"));
    assert.ok(later);
    assert.notEqual(later, holding[0]);
    for (const block of blocks) assert.doesNotMatch(block.text, /^\s/);
    assert.deepEqual(unmeasuredBlocks(text), packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD));
  }
});

test("moby-dick s3-32 does not flash one block per sentence", () => {
  const text = breathById("moby-dick", "s3-32");
  const cold = unmeasuredBlocks(text);
  assert.deepEqual(cold, packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD));
  assert.notEqual(cold.length, 3);
  assert.equal(cold.filter((block) => block.text.includes("worm. But")).length, 1);
  const many = Array.from({ length: 12 }, (_, index) => `Sentence ${index} is short.`).join(" ");
  const coldMany = unmeasuredBlocks(many);
  assert.ok(sentenceSpans(many).length >= 12);
  assert.ok(coldMany.length < sentenceSpans(many).length);
  assert.deepEqual(coldMany, packDisplayBlocks(many, phoneLineMeasure, PHONE_THIRD));
});

test("phone-height repros keep quotes, verse, and speakers whole", () => {
  const quotes = [
    ["moby-dick", "s3-32"],
    ["moby-dick", "s3-6"],
    ["cranford", "s0-14"],
    ["cranford", "s2-4"],
  ] as const;
  for (const [id, breathId] of quotes) {
    const text = breathById(id, breathId);
    assert.equal(interiorQuoteBreaks(text), 0, `${id} ${breathId}`);
    const blocks = assertPacked(text);
    for (const block of blocks) assert.doesNotMatch(block.text, /^\s/);
    assert.deepEqual(unmeasuredBlocks(text), blocks);
  }
  for (const [id, breathId] of [
    ["a-shropshire-lad", "s4-3"],
    ["leaves-of-grass", "s0-10"],
  ] as const) {
    const text = breathById(id, breathId);
    const blocks = packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD, "verse");
    assert.equal(blocks.length, 1, id);
    assert.equal(blocks[0]?.sentences, 1);
    assert.equal(blocks[0]?.text, text);
    assert.deepEqual(unmeasuredBlocks(text, "verse"), blocks);
  }
  for (const [id, breathId, speaker] of [
    ["the-father", "s0-51", "Captain"],
    ["the-little-clay-cart", "s2-1", "Maitreya"],
    ["the-little-clay-cart", "s1-30", "Director"],
  ] as const) {
    const text = breathById(id, breathId);
    const blocks = packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD, "speech");
    assert.deepEqual(unmeasuredBlocks(text, "speech"), blocks);
    for (const block of blocks) {
      assert.match(block.text, new RegExp(`^${speaker}: `));
      assert.doesNotMatch(block.text, /^\s/);
    }
    assert.equal(recoverSpeech(blocks, speaker), text);
  }
});

test("a quotation that fits in the third is not broken", () => {
  const text = "She said “Go home now. Then stay with me. Leave in the morning.” He nodded.";
  assert.ok(lineMeasure(text) <= PHONE_THIRD);
  assert.ok(sentenceSpans(text, "in-quotes").length > sentenceSpans(text).length);
  const blocks = assertPacked(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.text, text);
});

test("one long sentence inside a quotation stays one block", () => {
  const text = `“${"word ".repeat(400)}end.”`;
  assert.equal(sentenceSpans(text, "in-quotes").length, 1);
  assert.ok(lineMeasure(text) > PHONE_THIRD);
  const blocks = assertPacked(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.sentences, 1);
  assert.equal(blocks[0]?.text, text);
});

const PHONE_REPROS = [
  ["moby-dick", "s3-32"],
  ["moby-dick", "s3-6"],
  ["cranford", "s0-14"],
  ["cranford", "s2-4"],
  ["new-grub-street", "s7-85"],
  ["villette", "s0-32"],
  ["a-shropshire-lad", "s4-3"],
  ["leaves-of-grass", "s0-10"],
  ["the-father", "s0-51"],
  ["the-little-clay-cart", "s2-1"],
  ["the-little-clay-cart", "s1-30"],
] as const;

test("phone repros stay within a third except for a single sentence", () => {
  for (const [id, breathId] of PHONE_REPROS) {
    const text = breathById(id, breathId);
    const kind = displayKindForForm(shelfWork(id)?.form);
    const blocks = packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD, kind);
    const shown = blocks
      .map((block, index) => (index === 0 || kind !== "speech" ? block.text : block.text.replace(/^[^:]+: /, "")))
      .join("");
    assert.equal(shown, text, `${id} ${breathId}`);
    for (const block of blocks) {
      if (block.sentences > 1) {
        assert.ok(
          phoneLineMeasure(block.text) <= PHONE_THIRD,
          `${id} ${breathId} multi-sentence block measured ${phoneLineMeasure(block.text)}`,
        );
      }
      assert.doesNotMatch(block.text, /^\s/);
    }
    if (id === "villette" && breathId === "s0-32") {
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0]?.sentences, 1);
      assert.equal(interiorQuoteBreaks(text), 0);
    }
    if (kind === "verse") {
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0]?.text, text);
    }
  }
});

test("the catalog no longer splits inside an open quote", () => {
  const dir = new URL("./catalog/texts/", import.meta.url);
  let before = 0;
  let after = 0;
  let books = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const work = JSON.parse(readFileSync(new URL(name, dir), "utf8")) as {
      breaths?: { text?: string }[];
    };
    books += 1;
    for (const breath of work.breaths ?? []) {
      const text = breath.text;
      if (!text) continue;
      before += legacyInteriorQuoteBreaks(text);
      after += interiorQuoteBreaks(text);
    }
  }
  console.log(`quote splits inside an open quote: before ${before}, after ${after}, books ${books}`);
  assert.ok(books > 1000, `catalog has ${books} books`);
  assert.equal(after, 0);
  assert.ok(before > after);
});

test("the catalog has no multi-sentence block taller than a third of the phone", () => {
  const dir = new URL("./catalog/texts/", import.meta.url);
  let before = 0;
  let after = 0;
  let books = 0;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const id = name.slice(0, -5);
    const work = JSON.parse(readFileSync(new URL(name, dir), "utf8")) as {
      breaths?: { text?: string }[];
    };
    books += 1;
    const kind = displayKindForForm(shelfWork(id)?.form);
    if (kind === "verse") continue;
    for (const breath of work.breaths ?? []) {
      const text = breath.text;
      if (!text) continue;
      for (const span of sentenceSpans(text)) {
        const slice = text.slice(span.start, span.end);
        if (sentenceSpans(slice, "in-quotes").length > 1 && phoneLineMeasure(slice) > PHONE_THIRD) before += 1;
      }
      for (const block of packDisplayBlocks(text, phoneLineMeasure, PHONE_THIRD, kind)) {
        if (block.sentences > 1 && phoneLineMeasure(block.text) > PHONE_THIRD) after += 1;
      }
    }
  }
  console.log(`phone blocks over a third, more than one sentence: before ${before}, after ${after}, books ${books}`);
  assert.ok(books > 1000, `catalog has ${books} books`);
  assert.ok(before > 0);
  assert.equal(after, 0);
});

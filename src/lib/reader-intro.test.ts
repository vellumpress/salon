import assert from "node:assert/strict";
import test from "node:test";
import { readerIntro, trimReaderIntro } from "./reader-intro";
import type { Work } from "./works";

function work(id: string, note = ""): Work {
  return {
    id,
    title: "Title",
    author: "Author",
    year: "1929",
    note,
    minutes: 1,
    cover: "",
    coverAlt: "",
    scenes: [],
    breaths: [],
  };
}

test("uses a Featured shelf pitch before other copy", () => {
  assert.equal(
    readerIntro(work("passing", "This LE About copy should not win.")),
    'Nella Larsen’s two women, one secret, and the color line drawn through friendship. Chicago heat, Harlem rooms — belonging as a dangerous performance.',
  );
});

test("uses Featured before Ritual copy", () => {
  assert.equal(
    readerIntro(work("cheri", "This LE About copy should not win.")),
    'Paris pearls and a kept boy — Flanner’s Colette, appetite turning into recognition. Aging beauty meets the younger lover who was never going to stay.',
  );
});

test("trims a local Literary Editor About to two sentences", () => {
  assert.equal(
    readerIntro(
      work(
        "the-man-who-was-afraid",
        "First immersive sentence. Second immersive sentence! Academic third sentence.",
      ),
    ),
    "First immersive sentence. Second immersive sentence!",
  );
});

test("omits metadata fallback for works without a local polished bind", () => {
  assert.equal(
    readerIntro(work("not-on-the-shelf", "Long enough metadata should not become an intro.")),
    "",
  );
});

test("normalizes paragraph breaks while trimming About copy", () => {
  assert.equal(
    trimReaderIntro(
      "  One sentence in the room.\n\nA second sentence at the door. A third stays out.  ",
    ),
    "One sentence in the room. A second sentence at the door.",
  );
});

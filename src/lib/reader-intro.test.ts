import assert from "node:assert/strict";
import test from "node:test";
import { SHELF } from "./catalog/shelf.ts";
import { readerIntro, trimReaderIntro } from "./reader-intro.ts";
import type { Work } from "./works.ts";

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

function shelfAsWork(id: string): Work {
  const item = SHELF.find((row) => row.id === id);
  assert.ok(item, id);
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    year: String(item.year),
    note: item.intro ?? "",
    minutes: item.minutes,
    cover: "",
    coverAlt: "",
    scenes: [],
    breaths: [],
  };
}

test("uses a Featured shelf pitch before other copy", () => {
  assert.equal(
    readerIntro(work("passing", "This LE About copy should not win.")),
    "Irene Redfield sorts her morning mail in Harlem and finds a thin envelope in purple ink—no return address, a hand she knows at once. Clare Kendry, the childhood friend who slipped into another world, is writing again. Nella Larsen’s 1929 New York novel opens on that letter, still unopened, and the careful life it threatens to unsettle.",
  );
});

test("Quicksand uses the before-sleep closed-door sit, not Featured carousel copy", () => {
  const copy = readerIntro(shelfAsWork("quicksand"));
  assert.match(copy, /Helga Crane sits alone/);
  assert.match(copy, /will not open the door/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
});

test("The Attendant’s Confession uses the before-sleep human-document sit", () => {
  const copy = readerIntro(shelfAsWork("attendants-confession"));
  assert.match(copy, /human document/);
  assert.match(copy, /smells of the grave/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Mogul/i);
});

test("uses Featured before Ritual copy", () => {
  assert.equal(
    readerIntro(work("cheri", "This LE About copy should not win.")),
    "Paris pearls and a kept boy — Flanner’s Colette, appetite turning into recognition. Aging beauty meets the younger lover who was never going to stay.",
  );
});

test("stored preface wins over a long About note", () => {
  const copy = readerIntro(
    work(
      "the-man-who-was-afraid",
      "This LE About copy should not win because a stored preface already exists.",
    ),
  );
  assert.match(copy, /Sit with the world/i);
  assert.doesNotMatch(copy, /This LE About copy/);
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
      "  One sentence in the room.\n\nA second sentence at the door. A third stays in. A fourth stays out.  ",
    ),
    "One sentence in the room. A second sentence at the door. A third stays in.",
  );
});

test("Of Human Bondage has a stored 2–3 sentence preface", () => {
  const copy = readerIntro(shelfAsWork("of-human-bondage"));
  assert.match(copy, /club foot/i);
  assert.match(copy, /Sit with that weather/i);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
  const sentences = copy.split(/(?<=[.!?])\s+/).filter(Boolean);
  assert.ok(sentences.length >= 2 && sentences.length <= 3, copy);
});

test("every shelf work has a non-empty readerIntro", () => {
  const missing: string[] = [];
  const thin: string[] = [];
  const banned: string[] = [];
  for (const item of SHELF) {
    const copy = readerIntro(shelfAsWork(item.id));
    if (!copy) {
      missing.push(item.id);
      continue;
    }
    if (copy.length < 24) thin.push(`${item.id}: ${copy}`);
    if (/gutenberg|public domain|copyright ©/i.test(copy)) banned.push(item.id);
  }
  assert.deepEqual(missing, [], `empty readerIntro: ${missing.join(", ")}`);
  assert.deepEqual(thin, [], `thin readerIntro: ${thin.join(" | ")}`);
  assert.deepEqual(banned, [], `legal boilerplate in readerIntro: ${banned.join(", ")}`);
});

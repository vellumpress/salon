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

test("Quicksand Featured open uses the before-sleep closed-door sit", () => {
  const copy = readerIntro(shelfAsWork("quicksand"));
  assert.match(copy, /Helga Crane sits alone/);
  assert.match(copy, /will not open the door/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
});

test("Enchanted April Featured open uses the Agony Column sit", () => {
  const copy = readerIntro(shelfAsWork("enchanted-april"));
  assert.match(copy, /Shaftesbury Avenue/);
  assert.match(copy, /Agony Column/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
});

test("Mr. Fortune’s Maggot Featured open uses the one-convert sit", () => {
  const copy = readerIntro(shelfAsWork("mr-fortunes-maggot"));
  assert.match(copy, /Fanua/);
  assert.match(copy, /Timothy Fortune/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
});

test("The Attendant’s Confession uses the before-sleep human-document sit", () => {
  const copy = readerIntro(shelfAsWork("attendants-confession"));
  assert.match(copy, /human document/);
  assert.match(copy, /smells of the grave/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Mogul/i);
});

test("Rashōmon uses the before-sleep empty-gate sit", () => {
  const copy = readerIntro(shelfAsWork("rashomon"));
  assert.match(copy, /Evening under Rashōmon/);
  assert.match(copy, /desolation before the crime story blooms/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Hearn/i);
});

test("A High Wind in Jamaica uses the before-sleep rank-plant sit", () => {
  const copy = readerIntro(shelfAsWork("high-wind-jamaica"));
  assert.match(copy, /Jamaica after Emancipation/);
  assert.match(copy, /rank plant/);
  assert.match(copy, /warn the room first/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|do not extend|locked/i);
});

test("Noli Me Tangere uses the unwind dinner-announcement sit", () => {
  const copy = readerIntro(shelfAsWork("noli-me-tangere"));
  assert.match(copy, /Capitan Tiago announces a dinner/);
  assert.match(copy, /Binondo/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host note/i);
});

test("Vera uses the before-sleep cliff-gate sit", () => {
  const copy = readerIntro(shelfAsWork("vera"));
  assert.match(copy, /Cornwall/);
  assert.match(copy, /garden gate/);
  assert.match(copy, /Wemyss intensifies later/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("On a Chinese Screen uses the waking Parlour sit", () => {
  const copy = readerIntro(shelfAsWork("on-a-chinese-screen"));
  assert.match(copy, /Cheltenham/);
  assert.match(copy, /American stove/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|Orientalist/i);
});

test("Futility uses the waking sisters-bouquet sit", () => {
  const copy = readerIntro(shelfAsWork("futility"));
  assert.match(copy, /three sisters/i);
  assert.match(copy, /dacha/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|Wharton/i);
});

test("The Poison Tree uses the unwind Ganges-storm sit", () => {
  const copy = readerIntro(shelfAsWork("poison-tree"));
  assert.match(copy, /leave the boat/);
  assert.match(copy, /Joisto/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host note|Recommend/i);
});

test("Trooper Peter Halket uses the before-sleep kopje-fire sit", () => {
  const copy = readerIntro(shelfAsWork("trooper-peter-halket"));
  assert.match(copy, /kopje/);
  assert.match(copy, /Chartered Company/);
  assert.match(copy, /colonial/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|do not extend|locked/i);
});

test("The Home and the World uses the before-sleep mirror-prayer sit", () => {
  const copy = readerIntro(shelfAsWork("the-home-and-the-world"));
  assert.match(copy, /vermilion/);
  assert.match(copy, /mirror/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("Where Angels Fear to Tread uses the waking Charing Cross sit", () => {
  const copy = readerIntro(shelfAsWork("where-angels-fear-to-tread"));
  assert.match(copy, /Charing Cross/);
  assert.match(copy, /Monteriano/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("The Gadfly uses the before-sleep Fragola sit", () => {
  const copy = readerIntro(shelfAsWork("the-gadfly"));
  assert.match(copy, /Pisa/);
  assert.match(copy, /Fragola/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
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

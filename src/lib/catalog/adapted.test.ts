import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import {
  ADAPTED_BY_SALON_IDS,
  curatorialTrack,
  NEXT_FEATURED_TRACK_IDS,
} from "./curatorial.ts";
import { ADAPTED_WORKS, CLASSIC_LOCAL_WORKS, LOCAL_WORKS } from "./full-pdf.ts";
import { RITUAL_LANES } from "./rituals.ts";
import { SHELF, shelfWork } from "./shelf.ts";
import { isBoundLocal } from "./en-rights.ts";
import { placeFor } from "./places.ts";
import { readerIntro } from "../reader-intro.ts";
import type { Work } from "../literature.ts";

const LANE: Record<string, "unwind" | "before-sleep"> = {
  "miss-brill-adapted": "unwind",
  "prefer-not": "unwind",
  "late-season": "unwind",
  "between-the-drop-and-the-water": "before-sleep",
  "he-woke-changed": "unwind",
  "the-pattern": "before-sleep",
  "a-coat-worthy-of-respect": "unwind",
  "what-she-borrowed": "unwind",
  "it-was-not-nervousness": "before-sleep",
  "during-carnival": "before-sleep",
  "what-we-sold": "unwind",
};

const EXPECT = {
  "miss-brill-adapted": {
    title: "The Bench at Four",
    opening: /^Miss Brill put on her coat the way other people put on a face/,
    last: /the city kept casting itself without her/,
    place: { label: "Menton / French Riviera", region: "fr" },
    credit: /After Mansfield, Miss Brill, 1920/,
    scene: /river park/i,
  },
  "prefer-not": {
    title: "Prefer Not",
    opening: /^I am a man who believes in soft walls and quieter victories/,
    last: /a gentle workplace could always find a door/,
    place: { label: "New York", region: "us" },
    credit: /After Melville, Bartleby, 1853/,
    scene: /screen/i,
  },
  "late-season": {
    title: "Late Season",
    opening: /^Dmitri Gurov came to Cape May in September/,
    last: /harder to put down/,
    place: { label: "Yalta / Moscow", region: "ru" },
    credit: /After Chekhov, The Lady with the Dog, 1899/,
    scene: /off season/i,
  },
  "between-the-drop-and-the-water": {
    title: "Between the Drop and the Water",
    opening: /^Peyton Farquhar stood on the edge of the condemned pier/,
    last: /let him go home/,
    place: { label: "Hudson River, New York", region: "us" },
    credit: /After Bierce, An Occurrence at Owl Creek Bridge, 1890/,
    scene: /pier/i,
  },
  "he-woke-changed": {
    title: "He Woke Changed",
    opening: /^Gregor Samsa woke from uneasy dreams and found himself changed/,
    last: /someone else's problem/,
    place: { label: "Prague", region: "cz" },
    credit: /After Kafka, The Metamorphosis, 1915/,
    scene: /apartment/i,
  },
  "the-pattern": {
    title: "The Pattern",
    opening: /^John said the country would fix me/,
    last: /did not try to hold anyone in/,
    place: { label: "Hudson, New York", region: "us" },
    credit: /After Gilman, The Yellow Wallpaper, 1892/,
    scene: /wallpaper/i,
  },
  "a-coat-worthy-of-respect": {
    title: "A Coat Worthy of Respect",
    opening: /^Akaky Akakievich Petrovich/,
    last: /impossible to ignore/,
    place: { label: "St. Petersburg", region: "ru" },
    credit: /After Gogol, The Overcoat, 1842/,
    scene: /coat/i,
  },
  "what-she-borrowed": {
    title: "What She Borrowed",
    opening: /^Mathilde Loisel believed she had been born for better rooms/,
    last: /impossible even to hate cleanly/,
    place: { label: "Paris", region: "fr" },
    credit: /After Maupassant, The Necklace, 1884/,
    scene: /gala/i,
  },
  "it-was-not-nervousness": {
    title: "It Was Not Nervousness",
    opening: /^Listen\. I can tell this calmly/,
    last: /it is his heart/,
    place: { label: "East London", region: "gb" },
    credit: /After Poe, The Tell-Tale Heart, 1843/,
    scene: /walk-up/i,
  },
  "during-carnival": {
    title: "During Carnival",
    opening: /^I did not announce what Fortunato had done to me/,
    last: /bells went quiet/,
    place: { label: "Venice", region: "it" },
    credit: /After Poe, The Cask of Amontillado, 1846/,
    scene: /cellar/i,
  },
  "what-we-sold": {
    title: "What We Sold",
    opening: /^Della counted the jar twice on Christmas Eve morning/,
    last: /did not need to be correct to be true/,
    place: { label: "London", region: "gb" },
    credit: /After O\. Henry, The Gift of the Magi, 1905/,
    scene: /christmas/i,
  },
} as const;

test("Adapted remakes are local sits with source credit, not Featured", () => {
  const unwind = RITUAL_LANES.find((lane) => lane.id === "unwind");
  const beforeSleep = RITUAL_LANES.find((lane) => lane.id === "before-sleep");
  assert.ok(unwind);
  assert.ok(beforeSleep);
  for (const id of ADAPTED_BY_SALON_IDS) {
    const want = EXPECT[id];
    const work = shelfWork(id);
    assert.ok(work, id);
    assert.equal(work.title, want.title, id);
    assert.equal(work.author, "Salon", id);
    assert.equal(work.year, 2026, id);
    assert.equal(work.local, true, id);
    assert.equal(work.gutenberg, undefined, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.match(work.opening ?? "", want.opening, id);
    assert.equal(curatorialTrack(id), "adapted", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    const lane = LANE[id];
    assert.ok(lane, `${id} lane`);
    const home = lane === "unwind" ? unwind : beforeSleep;
    const other = lane === "unwind" ? beforeSleep : unwind;
    assert.ok(home.workIds.includes(id), `${id} ${lane}`);
    assert.equal(other.workIds.includes(id), false, `${id} not other lane`);
    assert.deepEqual(placeFor(work), want.place, id);

    const copy = readerIntro({
      id: work.id,
      title: work.title,
      author: work.author,
      year: String(work.year),
      note: work.intro ?? "",
      minutes: work.minutes,
      cover: "",
      coverAlt: "",
      scenes: [],
      breaths: [],
    } satisfies Work);
    assert.match(copy, want.credit, `${id} intro`);
    assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i, id);

    const packed = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { title: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as { breaths: { text: string }[] };
    assert.match(packed.scenes[0]?.title ?? "", want.scene, id);
    assert.match(packed.breaths[0]?.text ?? "", want.opening, id);
    assert.match(packed.breaths.at(-1)?.text ?? "", want.last, id);
    assert.equal(full.breaths.length, packed.breaths.length, `${id} full sit`);
    assert.equal(work.breaths, packed.breaths.length, `${id} shelf breaths`);
    const joined = packed.breaths.map((breath) => breath.text).join(" ");
    assert.doesNotMatch(joined, /project gutenberg|transcriber/i, id);
  }
});

test("classic Miss Brill collection stays on the shelf beside the remake", () => {
  const classic = SHELF.find((item) => item.id === "the-garden-party-and-other-stories");
  const remake = SHELF.find((item) => item.id === "miss-brill-adapted");
  assert.ok(classic);
  assert.ok(remake);
  assert.notEqual(classic!.id, remake!.id);
  assert.equal(remake!.title, "The Bench at Four");
});

test("homepage classics strip does not mix in Adapted remakes", () => {
  const adapted = new Set<string>(ADAPTED_BY_SALON_IDS);
  assert.deepEqual(
    ADAPTED_WORKS.map((item) => item.id),
    [...ADAPTED_BY_SALON_IDS],
  );
  assert.equal(
    CLASSIC_LOCAL_WORKS.some((item) => adapted.has(item.id)),
    false,
  );
  assert.ok(LOCAL_WORKS.some((item) => item.id === "miss-brill-adapted"));
  assert.ok(CLASSIC_LOCAL_WORKS.some((item) => item.id === "passing"));
  assert.ok(LOCAL_WORKS.some((item) => item.id === "the-pattern"));
  assert.ok(LOCAL_WORKS.some((item) => item.id === "he-woke-changed"));
});

test("Adapted homepage strip drifts like the classics works strip", () => {
  const src = readFileSync(new URL("../../components/adapted-strip.tsx", import.meta.url), "utf8");
  assert.match(src, /STRIP_DRIFT_START_MS/);
  assert.match(src, /stripDriftDelta/);
  assert.match(src, /pointerdown/);
  assert.match(src, /ADAPTED_WORKS/);
  assert.doesNotMatch(src, /FEATURED_CAROUSEL|NEXT_FEATURED|CLASSIC_LOCAL_WORKS/);
});

test("batch-2 remakes use Mira open-ats, not raw keep-as-is extracts", () => {
  const gregor = readFileSync(new URL("./texts/he-woke-changed.json", import.meta.url), "utf8");
  const pattern = readFileSync(new URL("./texts/the-pattern.json", import.meta.url), "utf8");
  const nerve = readFileSync(new URL("./texts/it-was-not-nervousness.json", import.meta.url), "utf8");
  assert.doesNotMatch(gregor, /When Gregor Samsa woke one morning/);
  assert.doesNotMatch(gregor, /transformed in his bed/);
  assert.match(gregor, /would not fit under the covers/);
  assert.match(pattern, /locked gate/);
  assert.match(nerve, /Roosevelt/);
});

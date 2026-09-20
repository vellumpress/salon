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

const EXPECT = {
  "miss-brill-adapted": {
    title: "The Bench at Four",
    opening: /^Miss Brill put on her coat the way other people put on a face/,
    last: /the city kept casting itself without her/,
    place: { label: "New York", region: "us" },
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
    place: { label: "Cape May / New York", region: "us" },
    credit: /After Chekhov, The Lady with the Dog, 1899/,
    scene: /off season/i,
  },
} as const;

test("Adapted remakes are local sits with source credit, not Featured", () => {
  const unwind = RITUAL_LANES.find((lane) => lane.id === "unwind");
  assert.ok(unwind);
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
    assert.ok(unwind.workIds.includes(id), `${id} unwind`);
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
});

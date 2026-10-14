import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { blurbFor } from "./blurbs.ts";
import { countryFor } from "./countries.ts";
import { placeFor } from "./places.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";
import { RITUAL_LANES, RITUAL_SIT_MINUTES, ritualPitchFor, worksForRitualLane } from "./rituals.ts";
import { LOCAL_WORKS } from "./full-pdf.ts";
import { searchShelf, SHELF, shelfWork } from "./shelf.ts";
import { canonicalWorkId, remapAliasedWorkIds, WORK_ID_ALIASES } from "../work-id-alias.ts";

/** Keep → retire. Twenty-nine retiring slugs. */
const PAIRS = {
  "crime-and-punishment": ["crime"],
  "niels-lyhne": ["niels"],
  "the-story-of-an-african-farm": ["african-farm"],
  "picture-of-dorian-gray": ["dorian"],
  "the-hidden-force": ["hidden-force"],
  "the-late-mattia-pascal": ["mattia"],
  "death-in-venice": ["venice"],
  "the-underdogs": ["underdogs"],
  "almayers-folly": ["almayer-s-folly"],
  "laos-folk-lore": ["laos-folk-lore-of-farther-india"],
  "gods-trombones": ["god-s-trombones"],
  "family-at-gilje": ["the-family-at-gilje"],
  "rise-of-david-levinsky": ["the-rise-of-david-levinsky"],
  "reign-of-greed": ["the-reign-of-greed", "the-reign-of-greed-el-filibusterismo"],
  "way-of-all-flesh": ["the-way-of-all-flesh"],
  mogens: ["mogens-and-other-stories"],
  "shadow-of-the-cathedral": ["the-shadow-of-the-cathedral"],
  "the-house-by-the-medlar-tree": ["malavoglia"],
  rebours: ["against-the-grain"],
  "taras-bulba": ["taras-bulba-and-other-tales"],
  "the-poison-tree": ["poison-tree"],
  "spring-time-case": ["a-spring-time-case"],
  "the-story-of-gosta-berling": ["gosta"],
  ecstasy: ["ecstasy-a-study-of-happiness"],
  "diary-of-a-chambermaid": ["a-chambermaid-s-diary"],
  "the-inferno": ["inferno-2"],
  "the-great-god-pan": ["great-god-pan"],
  "korean-folk-tales": ["charan"],
} as const;

const RETIRED = Object.values(PAIRS).flat();

type Book = {
  scenes: { id: string; title?: string }[];
  breaths: { sceneId?: string; text: string }[];
};

function book(id: string): Book {
  return JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Book;
}

function sceneWords(id: string, index = 0) {
  const text = book(id);
  const scene = text.scenes[index];
  assert.ok(scene, `${id} scene ${index}`);
  const breaths = text.breaths.filter((breath) => breath.sceneId === scene.id);
  const words = breaths
    .map((breath) => breath.text)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    title: scene.title ?? "",
    words,
    minutes: Math.round(words / 200),
    opening: breaths[0]?.text ?? "",
  };
}

test("shelf dupes leave the shelf and follow the keeper", () => {
  assert.equal(RETIRED.length, 29);
  assert.equal(LOCAL_WORKS.length, 1145);
  for (const [live, retired] of Object.entries(PAIRS)) {
    assert.equal(SHELF.filter((item) => item.id === live).length, 1, live);
    assert.equal(shelfWork(live)?.local, true, live);
    for (const id of retired) {
      assert.equal(WORK_ID_ALIASES[id], live, id);
      assert.equal(canonicalWorkId(id), live, id);
      assert.equal(SHELF.some((item) => item.id === id), false, id);
      assert.equal(shelfWork(id)?.id, live, id);
      assert.equal(searchShelf(shelfWork(live)?.title ?? id).some((item) => item.id === id), false, id);
      assert.equal(STORED_PREFACES[id], undefined, id);
      assert.equal(blurbFor(id), blurbFor(live), id);
      for (const lane of RITUAL_LANES) {
        assert.equal(lane.workIds.includes(id), false, `${lane.id} ${id}`);
        assert.equal(worksForRitualLane(lane).some((item) => item.id === id), false, `${lane.id} ${id}`);
      }
    }
  }
  assert.equal(existsSync(new URL("./texts/dorian.json", import.meta.url)), true);
});

test("moved sits end on a scene break, and the Mogens cut stays unseated", () => {
  const pan = sceneWords("the-great-god-pan");
  assert.match(pan.title, /Chapter 1|Chapter I/);
  assert.equal(pan.words, 3040);
  assert.equal(pan.minutes, 15);
  assert.equal(RITUAL_SIT_MINUTES["the-great-god-pan"], 15);
  assert.match(pan.opening, /glad you came, Clarke/);
  assert.match(ritualPitchFor("the-great-god-pan") ?? "", /ends with the chapter/);
  assert.doesNotMatch(ritualPitchFor("the-great-god-pan") ?? "", /ends with the novella/);
  const waking = RITUAL_LANES.find((lane) => lane.id === "waking-up");
  assert.equal(waking?.workIds.includes("the-great-god-pan"), true);
  for (const lane of RITUAL_LANES) {
    if (lane.id === "waking-up") continue;
    assert.equal(lane.workIds.includes("the-great-god-pan"), false, lane.id);
  }

  const dogs = sceneWords("the-underdogs");
  assert.match(dogs.title, /Chapter I/);
  assert.equal(dogs.words, 1186);
  assert.equal(dogs.minutes, 6);
  assert.equal(RITUAL_SIT_MINUTES["the-underdogs"], 6);
  assert.match(dogs.opening, /no animal/);
  const walk = RITUAL_LANES.find((lane) => lane.id === "on-a-walk");
  assert.equal(walk?.workIds.includes("the-underdogs"), true);
  assert.equal(waking?.workIds.includes("the-underdogs"), false);

  const mogens = sceneWords("mogens");
  assert.equal(mogens.minutes, 73);
  assert.equal(RITUAL_SIT_MINUTES["mogens"], 73);
  assert.ok(mogens.words > 1200, "a six-minute cut would end inside the novella");
  const sleep = RITUAL_LANES.find((lane) => lane.id === "before-sleep");
  assert.equal(sleep?.workIds.includes("mogens"), true);
  assert.equal(waking?.workIds.includes("mogens"), false);
  assert.equal(RITUAL_SIT_MINUTES["mogens-and-other-stories"], undefined);
});

test("metadata retitles keep both lord-arthur slugs and both bliss slugs", () => {
  assert.equal(shelfWork("bliss")?.title, "Bliss and Other Stories");
  assert.equal(shelfWork("bliss-and-other-stories")?.title, "Bliss, and Other Stories");
  assert.equal(shelfWork("lord-arthur-savile-s-crime")?.title, "Lord Arthur Savile's Crime and Other Stories");
  const tale = shelfWork("lord-arthur-saviles-crime");
  assert.ok(tale);
  assert.equal(tale.title, "Lord Arthur Savile’s Crime");
  assert.equal(placeFor(shelfWork("mogens")!)?.label, "Denmark");
  assert.equal(countryFor(shelfWork("mogens")!), "Denmark");
  assert.equal(placeFor(shelfWork("the-great-god-pan")!)?.label, "London");
  assert.equal(countryFor(shelfWork("the-great-god-pan")!), "Wales");
});

test("a retired id's saved progress follows the keeper", () => {
  const remapped = remapAliasedWorkIds({
    progress: {
      "great-god-pan": { lastOpenedAt: 8, breathIndex: 3, breathId: "s0-2" },
      underdogs: { lastOpenedAt: 2, breathIndex: 1 },
    },
    favorites: ["dorian", "charan"],
    readingNow: { id: "crime" },
  });
  const progress = remapped.progress as Record<
    string,
    { breathIndex?: number; breathId?: string } | undefined
  >;
  assert.equal(progress["the-great-god-pan"]?.breathIndex, 3);
  assert.equal(progress["the-great-god-pan"]?.breathId, "s0-2");
  assert.equal(progress["great-god-pan"], undefined);
  assert.equal(progress["the-underdogs"]?.breathIndex, 1);
  assert.equal(remapped.readingNow?.id, "crime-and-punishment");
  assert.equal(remapped.favorites?.includes("dorian"), false);
  assert.equal(remapped.favorites?.includes("picture-of-dorian-gray"), true);
  assert.equal(remapped.favorites?.includes("korean-folk-tales"), true);
});

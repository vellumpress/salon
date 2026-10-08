import assert from "node:assert/strict";
import test from "node:test";
import {
  EN_OFF_READABLE_IDS,
  isBoundLocal,
  isBoundReadable,
  isEnReadableOff,
} from "./en-rights.ts";
import { existsSync } from "node:fs";
import { SHELF, searchShelf } from "./shelf.ts";
import { NEXT_FEATURED_TRACK_IDS } from "./curatorial.ts";
import { RITUAL_LANES, RITUAL_SIT_MINUTES, worksForRitualLane } from "./rituals.ts";
import { FULL_TEXT_WORKS, LOCAL_WORKS, withFullPdf, withLocalBound } from "./full-pdf.ts";

/** OPEN-FIX-2 language sweep: shelf texts that are 98–100% non-English. Doña Perfecta left in DONA-PERFECTA (English re-bind). */
const LANGUAGE_SWEEP_OFF_IDS = [
  "bruges-la-morte",
  "calligrammes",
  "das-stunden-buch",
  "ein-landarzt",
  "les-chants-de-maldoror",
  "les-trophees",
  "os-lusiadas",
  "policarpo",
  "therese-raquin",
  "ubirajara",
  "meaulnes",
  "papeis-avulsos",
  "hien-le-maboul",
  "les-civilises",
  "prosas-profanas",
  "les-villes-tentaculaires",
  "alcools",
  "contes-cruels",
  "a-illustre-casa-de-ramires",
  "quincas",
  "tradiciones-peruanas",
  "emaux-et-camees",
  "knulp",
  "iracema",
  "neue-gedichte",
  "azul",
  "casmurro",
  "les-heures-claires",
  "petersburg",
  "nazarin",
  "pepita-jimenez",
  "cecilia",
  "the-mandarin",
  "la-regenta",
  "tristana",
  "les-amours-jaunes",
  "los-pazos-de-ulloa",
  "amor-de-perdicao",
  "libro-de-poemas",
  "misericordia",
  "martin-fierro",
];

test("hold/pull ids are marked off English readable", () => {
  for (const id of [
    "metamorphosis",
    "mama-blanca",
    "skylark",
    "nirmala",
    "zaynab",
    "cat",
    "wild-geese",
    "quiroga",
    "grand-hotel",
    "ramires",
    "villes-tentaculaires",
    "heures-claires",
    "trophees",
    "emaux",
    "cousin-basilio",
    "bruges-la-morte",
    "calligrammes",
    "das-stunden-buch",
    "ein-landarzt",
    "les-chants-de-maldoror",
    "les-trophees",
    "os-lusiadas",
    "policarpo",
    "therese-raquin",
    "ubirajara",
    "meaulnes",
    "papeis-avulsos",
    "hien-le-maboul",
    "les-civilises",
    "prosas-profanas",
    "les-villes-tentaculaires",
    "alcools",
    "contes-cruels",
    "a-illustre-casa-de-ramires",
    "quincas",
    "tradiciones-peruanas",
    "emaux-et-camees",
    "knulp",
    "iracema",
    "neue-gedichte",
    "azul",
    "casmurro",
    "les-heures-claires",
    "petersburg",
    "nazarin",
    "pepita-jimenez",
    "cecilia",
    "the-mandarin",
    "la-regenta",
    "tristana",
    "les-amours-jaunes",
    "los-pazos-de-ulloa",
    "amor-de-perdicao",
    "libro-de-poemas",
    "misericordia",
    "martin-fierro",
  ]) {
    assert.equal(isEnReadableOff(id), true, id);
    assert.equal(EN_OFF_READABLE_IDS.has(id), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg: 1 }), false, id);
    assert.equal(isBoundLocal({ id, local: true }), false, id);
  }
});


test("Siddhartha PG 2500 is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("siddhartha"), false);
  assert.equal(isBoundLocal({ id: "siddhartha", local: true }), true);
  assert.equal(isBoundReadable({ id: "siddhartha", local: true, gutenberg: 2500 }), true);
});

test("Dragon's Teeth (basilio) is not on the EN-off list", () => {
  assert.equal(isEnReadableOff("basilio"), false);
  assert.equal(isBoundLocal({ id: "basilio", local: true }), true);
  assert.equal(isBoundReadable({ id: "basilio", local: true }), true);
});

test("Rashōmon is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("rashomon"), false);
  assert.equal(isBoundLocal({ id: "rashomon", local: true }), true);
  assert.equal(isBoundReadable({ id: "rashomon", local: true, gutenberg: 78105 }), true);
});

test("A High Wind in Jamaica is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("high-wind-jamaica"), false);
  assert.equal(isBoundLocal({ id: "high-wind-jamaica", local: true }), true);
  assert.equal(isBoundReadable({ id: "high-wind-jamaica", local: true, gutenberg: 75530 }), true);
});

test("Noli Me Tangere is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("noli-me-tangere"), false);
  assert.equal(isBoundLocal({ id: "noli-me-tangere", local: true }), true);
  assert.equal(isBoundReadable({ id: "noli-me-tangere", local: true, gutenberg: 6737 }), true);
});

test("Enchanted April is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("enchanted-april"), false);
  assert.equal(isBoundLocal({ id: "enchanted-april", local: true }), true);
  assert.equal(isBoundReadable({ id: "enchanted-april", local: true, gutenberg: 16389 }), true);
});

test("Mr. Fortune’s Maggot is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("mr-fortunes-maggot"), false);
  assert.equal(isBoundLocal({ id: "mr-fortunes-maggot", local: true }), true);
  assert.equal(isBoundReadable({ id: "mr-fortunes-maggot", local: true, gutenberg: 79534 }), true);
});

test("Vera is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("vera"), false);
  assert.equal(isBoundLocal({ id: "vera", local: true }), true);
  assert.equal(isBoundReadable({ id: "vera", local: true, gutenberg: 34366 }), true);
});

test("On a Chinese Screen is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("on-a-chinese-screen"), false);
  assert.equal(isBoundLocal({ id: "on-a-chinese-screen", local: true }), true);
  assert.equal(isBoundReadable({ id: "on-a-chinese-screen", local: true, gutenberg: 48788 }), true);
});

test("Futility is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("futility"), false);
  assert.equal(isBoundLocal({ id: "futility", local: true }), true);
  assert.equal(isBoundReadable({ id: "futility", local: true, gutenberg: 77253 }), true);
});

test("The Poison Tree is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("poison-tree"), false);
  assert.equal(isBoundLocal({ id: "poison-tree", local: true }), true);
  assert.equal(isBoundReadable({ id: "poison-tree", local: true, gutenberg: 17455 }), true);
});

test("Trooper Peter Halket is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("trooper-peter-halket"), false);
  assert.equal(isBoundLocal({ id: "trooper-peter-halket", local: true }), true);
  assert.equal(isBoundReadable({ id: "trooper-peter-halket", local: true, gutenberg: 1431 }), true);
});

test("The Immoralist is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("the-immoralist"), false);
  assert.equal(isBoundLocal({ id: "the-immoralist", local: true }), true);
  assert.equal(isBoundReadable({ id: "the-immoralist", local: true, gutenberg: 78975 }), true);
});

test("Letters of a Javanese Princess is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("letters-of-a-javanese-princess"), false);
  assert.equal(isBoundLocal({ id: "letters-of-a-javanese-princess", local: true }), true);
  assert.equal(
    isBoundReadable({ id: "letters-of-a-javanese-princess", local: true, gutenberg: 34647 }),
    true,
  );
});

test("Blood and Sand is a readable local EN bind", () => {
  assert.equal(isEnReadableOff("blood-and-sand"), false);
  assert.equal(isBoundLocal({ id: "blood-and-sand", local: true }), true);
  assert.equal(isBoundReadable({ id: "blood-and-sand", local: true, gutenberg: 54222 }), true);
});

test("Mira evening A24 Next / Rituals sits are readable local EN binds", () => {
  for (const [id, gutenberg] of [
    ["bliss", 44385],
    ["a-hundred-and-seventy-chinese-poems", 42290],
    ["dubliners", 2814],
    ["gitanjali", 7164],
    ["martin-bircks-youth", 78363],
  ] as const) {
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(isBoundLocal({ id, local: true }), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg }), true, id);
  }
});

test("Mira 6pm Next / Rituals sits are readable local EN binds", () => {
  for (const [id, gutenberg] of [
    ["demian", 74222],
    ["death-comes-for-the-archbishop", 69730],
    ["the-getting-of-wisdom", 3728],
  ] as const) {
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(isBoundLocal({ id, local: true }), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg }), true, id);
  }
});

test("Mira 4pm Next sits are readable local EN binds", () => {
  for (const [id, gutenberg] of [
    ["all-quiet-on-the-western-front", 75011],
    ["we", 61963],
    ["the-story-of-gosta-berling", 56158],
    ["thais", 2078],
  ] as const) {
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(isBoundLocal({ id, local: true }), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg }), true, id);
  }
});

test("Mira FULL-TEXT CLEAR ×4 are readable local EN binds", () => {
  for (const [id, gutenberg] of [
    ["nacha-regules", 59441],
    ["krakatit", 79127],
    ["the-peasants", 75846],
    ["cane", 60093],
  ] as const) {
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(isBoundLocal({ id, local: true }), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg }), true, id);
  }
});

test("Mira FULL-TEXT CLEAR ×7 are readable local EN binds", () => {
  for (const [id, gutenberg] of [
    ["steppenwolf", 75756],
    ["the-home-and-the-world", 7166],
    ["the-story-of-gosta-berling", 56158],
    ["martin-bircks-youth", 78363],
    ["bliss", 44385],
    ["shadowings", 34215],
    ["brazilian-tales", 21040],
  ] as const) {
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(isBoundLocal({ id, local: true }), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg }), true, id);
  }
});

test("Mira PM4 Next sits are readable local EN binds", () => {
  for (const [id, gutenberg] of [
    ["the-painted-veil", 64682],
    ["the-good-soldier", 2775],
    ["growth-of-the-soil", 10984],
    ["nada-the-lily", 1207],
  ] as const) {
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(isBoundLocal({ id, local: true }), true, id);
    assert.equal(isBoundReadable({ id, local: true, gutenberg }), true, id);
  }
});

test("OPEN-FIX-2 language sweep: non-English binds leave every reader surface, rows and texts stay", () => {
  assert.equal(LANGUAGE_SWEEP_OFF_IDS.length, 41);
  const next = new Set<string>(NEXT_FEATURED_TRACK_IDS as readonly string[]);
  const local = new Set(LOCAL_WORKS.map((work) => work.id));
  const full = new Set(FULL_TEXT_WORKS.map((work) => work.id));
  for (const id of LANGUAGE_SWEEP_OFF_IDS) {
    assert.equal(isEnReadableOff(id), true, id);
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, `${id} catalog row stays`);
    assert.notEqual(work!.language, "English", id);
    assert.ok(existsSync(new URL(`./texts/${id}.json`, import.meta.url)), `${id} text file kept`);
    assert.equal(local.has(id), false, `${id} LOCAL_WORKS`);
    assert.equal(full.has(id), false, `${id} FULL_TEXT_WORKS`);
    const found = searchShelf(work!.title);
    assert.equal(withLocalBound(found).some((item) => item.id === id), false, `${id} local search`);
    assert.equal(withFullPdf(found).some((item) => item.id === id), false, `${id} full-text search`);
    assert.equal(next.has(id), false, `${id} Next queue`);
    assert.equal(id in RITUAL_SIT_MINUTES, false, `${id} sit minutes`);
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${id} listed in ${lane.id}`);
      assert.equal(worksForRitualLane(lane).some((item) => item.id === id), false, `${id} shown in ${lane.id}`);
    }
  }
  // Pan Tadeusz is re-bound in English in its own pack.
  assert.equal(isEnReadableOff("pan-tadeusz"), false);
});

test("DONA-PERFECTA: the English re-bind (PG 2462, Serrano) is readable again, still off Next and before-sleep", () => {
  const work = SHELF.find((item) => item.id === "dona-perfecta");
  assert.ok(work);
  assert.equal(isEnReadableOff("dona-perfecta"), false);
  assert.equal(work!.language, "English");
  assert.equal(work!.gutenberg, 2462);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(LOCAL_WORKS.some((item) => item.id === "dona-perfecta"), true);
  assert.equal(withLocalBound(searchShelf("Doña Perfecta")).some((item) => item.id === "dona-perfecta"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("dona-perfecta"), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes("dona-perfecta"), false, lane.id);
});

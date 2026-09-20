import assert from "node:assert/strict";
import test from "node:test";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import {
  ADAPTED_BY_SALON_IDS,
  curatorialTrack,
  isAdaptedBySalon,
  NEXT_FEATURED_TRACK_IDS,
} from "./curatorial.ts";
import { RITUAL_LANES } from "./rituals.ts";
import { SHELF } from "./shelf.ts";
import { isBoundLocal } from "./en-rights.ts";

test("Locked recommend order is April, Bridge, Maggot, then Mirth, then Quicksand", () => {
  assert.deepEqual(FEATURED_CAROUSEL_IDS, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("attendants-confession"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("rashomon"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("high-wind-jamaica"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("noli-me-tangere"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("vera"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("on-a-chinese-screen"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("futility"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("poison-tree"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("trooper-peter-halket"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-home-and-the-world"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("where-angels-fear-to-tread"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-gadfly"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-immoralist"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("letters-of-a-javanese-princess"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("blood-and-sand"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("ecstasy"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("an-outcast-of-the-islands"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-underdogs"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("diary-of-a-chambermaid"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-painted-veil"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-good-soldier"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("growth-of-the-soil"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("nada-the-lily"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("all-quiet-on-the-western-front"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("we"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-story-of-gosta-berling"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("thais"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("second-april"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-bridge"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("miss-brill-adapted"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("prefer-not"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("late-season"), false);
  for (const id of FEATURED_CAROUSEL_IDS) {
    assert.equal(curatorialTrack(id), "featured", id);
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
  }
});

test("Next queue no longer lists Mirth or Quicksand", () => {
  assert.deepEqual([...NEXT_FEATURED_TRACK_IDS], [
    "attendants-confession",
    "rashomon",
    "high-wind-jamaica",
    "noli-me-tangere",
    "vera",
    "on-a-chinese-screen",
    "futility",
    "trooper-peter-halket",
    "the-home-and-the-world",
    "the-immoralist",
  ]);
  assert.equal(curatorialTrack("quicksand"), "featured");
  assert.equal(curatorialTrack("the-house-of-mirth"), "featured");
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("quicksand"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-house-of-mirth"), false);
  assert.equal(curatorialTrack("attendants-confession"), "next");
  assert.equal(curatorialTrack("rashomon"), "next");
  assert.equal(curatorialTrack("high-wind-jamaica"), "next");
  assert.equal(curatorialTrack("noli-me-tangere"), "next");
  assert.equal(curatorialTrack("vera"), "next");
  assert.equal(curatorialTrack("on-a-chinese-screen"), "next");
  assert.equal(curatorialTrack("futility"), "next");
  assert.equal(curatorialTrack("trooper-peter-halket"), "next");
  assert.equal(curatorialTrack("the-home-and-the-world"), "next");
  assert.equal(curatorialTrack("the-immoralist"), "next");
  assert.equal(curatorialTrack("where-angels-fear-to-tread"), "later");
  assert.equal(curatorialTrack("the-gadfly"), "later");
  assert.equal(curatorialTrack("letters-of-a-javanese-princess"), "later");
  assert.equal(curatorialTrack("blood-and-sand"), "later");
  assert.equal(curatorialTrack("poison-tree"), "later");
  assert.equal(curatorialTrack("ecstasy"), "later");
  assert.equal(curatorialTrack("an-outcast-of-the-islands"), "later");
  assert.equal(curatorialTrack("the-underdogs"), "later");
  assert.equal(curatorialTrack("diary-of-a-chambermaid"), "later");
  assert.equal(curatorialTrack("the-painted-veil"), "later");
  assert.equal(curatorialTrack("the-good-soldier"), "later");
  assert.equal(curatorialTrack("growth-of-the-soil"), "later");
  assert.equal(curatorialTrack("nada-the-lily"), "later");
  assert.equal(curatorialTrack("all-quiet-on-the-western-front"), "later");
  assert.equal(curatorialTrack("we"), "later");
  assert.equal(curatorialTrack("the-story-of-gosta-berling"), "later");
  assert.equal(curatorialTrack("thais"), "later");
});

test("Quicksand is a local before-sleep bind with no Gutenberg id", () => {
  const work = SHELF.find((item) => item.id === "quicksand");
  assert.ok(work);
  assert.equal(work.year, 1928);
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, undefined);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Helga Crane sat alone/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("quicksand"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("quicksand"),
    false,
  );
});

test("Adapted by Salon remakes are their own track — never locked recommend or Next", () => {
  assert.deepEqual(
    [...ADAPTED_BY_SALON_IDS],
    [
      "miss-brill-adapted",
      "prefer-not",
      "late-season",
      "between-the-drop-and-the-water",
      "he-woke-changed",
      "the-pattern",
      "a-coat-worthy-of-respect",
      "what-she-borrowed",
      "it-was-not-nervousness",
      "during-carnival",
      "what-we-sold",
      "bliss-tokyo",
      "open-window-singapore",
      "story-of-an-hour-buenos-aires",
      "masque-rio",
      "boule-de-suif-istanbul",
      "happy-prince-hong-kong",
      "hunger-artist-milan",
      "the-nose-cape-town",
      "queen-of-spades-paris",
      "decapitated-chicken-lisbon",
    ],
  );
  for (const id of ADAPTED_BY_SALON_IDS) {
    assert.equal(isAdaptedBySalon(id), true, id);
    assert.equal(curatorialTrack(id), "adapted", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
  }
  assert.equal(curatorialTrack("enchanted-april"), "featured");
  assert.equal(curatorialTrack("quicksand"), "featured");
  const garden = SHELF.find((item) => item.id === "the-garden-party-and-other-stories");
  assert.ok(garden);
  assert.equal(garden!.title.startsWith("The Garden Party"), true);
  assert.equal(curatorialTrack("the-garden-party-and-other-stories"), "later");
});

test("The Attendant’s Confession is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "attendants-confession");
  assert.ok(work);
  assert.equal(work.year, 1881);
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 21040);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^So it really seems to you/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("attendants-confession"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("attendants-confession"),
    false,
  );
});

test("Rashōmon is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "rashomon");
  assert.ok(work);
  assert.equal(work.year, 1915);
  assert.equal(work.title, "Rashōmon");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 78105);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It was evening\./);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("rashomon"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("rashomon"),
    false,
  );
});

test("A High Wind in Jamaica is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "high-wind-jamaica");
  assert.ok(work);
  assert.equal(work.year, 1929);
  assert.equal(work.title, "A High Wind in Jamaica");
  assert.equal(work.author, "Richard Hughes");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 75530);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^One of the fruits of Emancipation/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("high-wind-jamaica"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("high-wind-jamaica"),
    false,
  );
});

test("Noli Me Tangere is a local unwind bind on Next", () => {
  const work = SHELF.find((item) => item.id === "noli-me-tangere");
  assert.ok(work);
  assert.equal(work.year, 1887);
  assert.equal(work.title, "Noli Me Tangere (The Social Cancer)");
  assert.equal(work.author, "José Rizal (tr. Charles Derbyshire)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 6737);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^On the last of October Don Santiago de los Santos/);
  const lane = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("noli-me-tangere"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("noli-me-tangere"),
    false,
  );
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "before-sleep")?.workIds.includes("noli-me-tangere"),
    false,
  );
  const stub = SHELF.find((item) => item.id === "the-social-cancer-noli-me-tangere");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.equal(stub.gutenberg, 20228);
  assert.notEqual(stub.id, work.id);
});

test("Vera is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "vera");
  assert.ok(work);
  assert.equal(work.year, 1921);
  assert.equal(work.title, "Vera");
  assert.equal(work.author, "Elizabeth von Arnim");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 34366);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^When the doctor had gone/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("vera"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("vera"),
    false,
  );
  assert.equal(isAdaptedBySalon("vera"), false);
  assert.equal(curatorialTrack("vera"), "next");
});

test("On a Chinese Screen is a local waking bind on Next", () => {
  const work = SHELF.find((item) => item.id === "on-a-chinese-screen");
  assert.ok(work);
  assert.equal(work.year, 1922);
  assert.equal(work.title, "On a Chinese Screen");
  assert.equal(work.author, "W. Somerset Maugham");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 48788);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^"I really think I can make something of it," she said/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("on-a-chinese-screen"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("on-a-chinese-screen"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("on-a-chinese-screen"), false);
  assert.equal(isAdaptedBySalon("on-a-chinese-screen"), false);
});

test("Futility is a local waking bind on Next", () => {
  const work = SHELF.find((item) => item.id === "futility");
  assert.ok(work);
  assert.equal(work.year, 1922);
  assert.equal(work.title, "Futility");
  assert.equal(work.author, "William Gerhardie");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 77253);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It was somewhat in the manner of an Ibsen drama/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("futility"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("futility"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("futility"), false);
});

test("The Poison Tree is a local unwind bind on Later, not Next", () => {
  const work = SHELF.find((item) => item.id === "poison-tree");
  assert.ok(work);
  assert.equal(work.year, 1884);
  assert.equal(work.title, "The Poison Tree");
  assert.equal(work.author, "Bankim Chandra Chatterjee (tr. Miriam S. Knight)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 17455);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Nagendra Natha Datta is about to travel by boat/);
  const lane = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("poison-tree"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("poison-tree"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("poison-tree"), false);
  assert.equal(curatorialTrack("poison-tree"), "later");
});

test("Trooper Peter Halket is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "trooper-peter-halket");
  assert.ok(work);
  assert.equal(work.year, 1897);
  assert.equal(work.title, "Trooper Peter Halket of Mashonaland");
  assert.equal(work.author, "Olive Schreiner");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 1431);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It was a dark night/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("trooper-peter-halket"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("trooper-peter-halket"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("trooper-peter-halket"), false);
  const stub = SHELF.find((item) => item.id === "trooper-peter-halket-of-mashonaland");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("Enchanted April is a local waking bind on locked recommend", () => {
  const work = SHELF.find((item) => item.id === "enchanted-april");
  assert.ok(work);
  assert.equal(work.year, 1922);
  assert.equal(work.title, "The Enchanted April");
  assert.equal(work.author, "Elizabeth von Arnim");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 16389);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It began in a Woman/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("enchanted-april"));
  assert.equal(curatorialTrack("enchanted-april"), "featured");
});

test("Mr. Fortune’s Maggot is a local unwind bind on locked recommend", () => {
  const work = SHELF.find((item) => item.id === "mr-fortunes-maggot");
  assert.ok(work);
  assert.equal(work.year, 1927);
  assert.equal(work.title, "Mr. Fortune’s Maggot");
  assert.equal(work.author, "Sylvia Townsend Warner");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 79534);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Though the Reverend Timothy Fortune/);
  const lane = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("mr-fortunes-maggot"));
  assert.equal(curatorialTrack("mr-fortunes-maggot"), "featured");
});

test("House of Mirth stays on unwind and is locked recommend, not Next", () => {
  const work = SHELF.find((item) => item.id === "the-house-of-mirth");
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(curatorialTrack("the-house-of-mirth"), "featured");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(unwind?.workIds.includes("the-house-of-mirth"));
});

test("The Home and the World is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "the-home-and-the-world");
  assert.ok(work);
  assert.equal(work.year, 1916);
  assert.equal(work.title, "The Home and the World");
  assert.equal(work.author, "Rabindranath Tagore (tr. Surendranath Tagore)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 7166);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Mother, today there comes back to mind/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-home-and-the-world"));
  assert.ok(lane!.workIds.indexOf("the-home-and-the-world") > lane!.workIds.indexOf("quicksand"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("the-home-and-the-world"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-home-and-the-world"), false);
  assert.equal(curatorialTrack("the-home-and-the-world"), "next");
  const stub = SHELF.find((item) => item.id === "home-world");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("The Immoralist is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "the-immoralist");
  assert.ok(work);
  assert.equal(work.year, 1930);
  assert.equal(work.title, "The Immoralist");
  assert.equal(work.author, "André Gide (tr. Dorothy Bussy)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 78975);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^My dear friends, I knew you were faithful/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-immoralist"));
  assert.ok(lane!.workIds.indexOf("the-immoralist") > lane!.workIds.indexOf("the-home-and-the-world"));
  assert.ok(lane!.workIds.indexOf("the-immoralist") > lane!.workIds.indexOf("quicksand"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("the-immoralist"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-immoralist"), false);
  assert.equal(curatorialTrack("the-immoralist"), "next");
  const stub = SHELF.find((item) => item.id === "immoralist");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("Letters of a Javanese Princess is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "letters-of-a-javanese-princess");
  assert.ok(work);
  assert.equal(work.year, 1920);
  assert.equal(work.title, "Letters of a Javanese Princess");
  assert.equal(work.author, "Raden Adjeng Kartini (tr. Agnes Louise Symmers)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 34647);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^I have longed to make the acquaintance/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("letters-of-a-javanese-princess"));
  assert.ok(
    lane!.workIds.indexOf("letters-of-a-javanese-princess") >
      lane!.workIds.indexOf("enchanted-april"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("letters-of-a-javanese-princess"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("letters-of-a-javanese-princess"), false);
  assert.equal(curatorialTrack("letters-of-a-javanese-princess"), "later");
});

test("Blood and Sand is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "blood-and-sand");
  assert.ok(work);
  assert.equal(work.year, 1908);
  assert.equal(work.title, "Blood and Sand");
  assert.equal(work.author, "Vicente Blasco Ibáñez (tr. Mrs. W. A. Gillespie)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 54222);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Juan Gallardo breakfasted early/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("blood-and-sand"));
  assert.ok(lane!.workIds.indexOf("blood-and-sand") > lane!.workIds.indexOf("letters-of-a-javanese-princess"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("blood-and-sand"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("blood-and-sand"), false);
  assert.equal(curatorialTrack("blood-and-sand"), "later");
});

test("Where Angels Fear to Tread is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "where-angels-fear-to-tread");
  assert.ok(work);
  assert.equal(work.year, 1905);
  assert.equal(work.title, "Where Angels Fear to Tread");
  assert.equal(work.author, "E. M. Forster");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2948);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^They were all at Charing Cross/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("where-angels-fear-to-tread"));
  assert.ok(lane!.workIds.indexOf("where-angels-fear-to-tread") > lane!.workIds.indexOf("enchanted-april"));
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("where-angels-fear-to-tread"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("where-angels-fear-to-tread"), false);
  assert.equal(curatorialTrack("where-angels-fear-to-tread"), "later");
});

test("The Gadfly is a local before-sleep bind on Next, behind Home and the World", () => {
  const work = SHELF.find((item) => item.id === "the-gadfly");
  assert.ok(work);
  assert.equal(work.year, 1897);
  assert.equal(work.title, "The Gadfly");
  assert.equal(work.author, "Ethel Lilian Voynich");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 3431);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Arthur sat in the library/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-gadfly"));
  assert.ok(lane!.workIds.indexOf("the-gadfly") > lane!.workIds.indexOf("the-home-and-the-world"));
  assert.ok(lane!.workIds.indexOf("the-home-and-the-world") > lane!.workIds.indexOf("quicksand"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-gadfly"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-gadfly"), false);
  assert.equal(curatorialTrack("the-gadfly"), "later");
});

test("Ecstasy is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "ecstasy");
  assert.ok(work);
  assert.equal(work.year, 1919);
  assert.equal(work.title, "Ecstasy");
  assert.equal(work.author, "Louis Couperus (tr. Alexander Teixeira de Mattos)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 37770);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Dolf Van Attema/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("ecstasy"));
  assert.ok(lane!.workIds.indexOf("ecstasy") > lane!.workIds.indexOf("the-gadfly"));
  assert.ok(lane!.workIds.indexOf("ecstasy") > lane!.workIds.indexOf("quicksand"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("ecstasy"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("ecstasy"), false);
  assert.equal(curatorialTrack("ecstasy"), "later");
  const stub = SHELF.find((item) => item.id === "ecstasy-a-study-of-happiness");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("An Outcast of the Islands is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "an-outcast-of-the-islands");
  assert.ok(work);
  assert.equal(work.year, 1896);
  assert.equal(work.title, "An Outcast of the Islands");
  assert.equal(work.author, "Joseph Conrad");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 638);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^When he stepped off the straight and narrow path/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("an-outcast-of-the-islands"));
  assert.ok(
    lane!.workIds.indexOf("an-outcast-of-the-islands") > lane!.workIds.indexOf("blood-and-sand"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("an-outcast-of-the-islands"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("an-outcast-of-the-islands"), false);
  assert.equal(curatorialTrack("an-outcast-of-the-islands"), "later");
});

test("The Underdogs is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-underdogs");
  assert.ok(work);
  assert.equal(work.year, 1929);
  assert.equal(work.title, "The Underdogs");
  assert.equal(work.author, "Mariano Azuela (tr. E. Munguía, Jr.)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 549);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^"That's no animal/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("the-underdogs"));
  assert.ok(lane!.workIds.indexOf("the-underdogs") > lane!.workIds.indexOf("an-outcast-of-the-islands"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-underdogs"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-underdogs"), false);
  assert.equal(curatorialTrack("the-underdogs"), "later");
  const stub = SHELF.find((item) => item.id === "underdogs");
  assert.ok(stub);
  assert.notEqual(stub.id, work.id);
});

test("The Diary of a Chambermaid is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "diary-of-a-chambermaid");
  assert.ok(work);
  assert.equal(work.year, 1900);
  assert.equal(work.title, "The Diary of a Chambermaid");
  assert.equal(work.author, "Octave Mirbeau");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 44303);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^To-day, September 14/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("diary-of-a-chambermaid"));
  assert.ok(lane!.workIds.indexOf("diary-of-a-chambermaid") > lane!.workIds.indexOf("the-underdogs"));
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("diary-of-a-chambermaid"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("diary-of-a-chambermaid"), false);
  assert.equal(curatorialTrack("diary-of-a-chambermaid"), "later");
  const stub = SHELF.find((item) => item.id === "a-chambermaid-s-diary");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("The Painted Veil is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-painted-veil");
  assert.ok(work);
  assert.equal(work.year, 1925);
  assert.equal(work.title, "The Painted Veil");
  assert.equal(work.author, "W. Somerset Maugham");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 64682);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^She gave a startled cry/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-painted-veil"));
  assert.ok(lane!.workIds.indexOf("the-painted-veil") > lane!.workIds.indexOf("ecstasy"));
  assert.ok(lane!.workIds.indexOf("the-painted-veil") > lane!.workIds.indexOf("quicksand"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-painted-veil"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-painted-veil"), false);
  assert.equal(curatorialTrack("the-painted-veil"), "later");
});

test("The Good Soldier is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-good-soldier");
  assert.ok(work);
  assert.equal(work.year, 1915);
  assert.equal(work.title, "The Good Soldier");
  assert.equal(work.author, "Ford Madox Ford");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2775);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^This is the saddest story I have ever heard/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-good-soldier"));
  assert.ok(lane!.workIds.indexOf("the-good-soldier") > lane!.workIds.indexOf("the-painted-veil"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-good-soldier"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-good-soldier"), false);
  assert.equal(curatorialTrack("the-good-soldier"), "later");
});

test("Growth of the Soil is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "growth-of-the-soil");
  assert.ok(work);
  assert.equal(work.year, 1920);
  assert.equal(work.title, "Growth of the Soil");
  assert.equal(work.author, "Knut Hamsun (tr. W. W. Worster)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 10984);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^The long, long road over the moors/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("growth-of-the-soil"));
  assert.ok(
    lane!.workIds.indexOf("growth-of-the-soil") > lane!.workIds.indexOf("diary-of-a-chambermaid"),
  );
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("growth-of-the-soil"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("growth-of-the-soil"), false);
  assert.equal(curatorialTrack("growth-of-the-soil"), "later");
});

test("Nada the Lily is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "nada-the-lily");
  assert.ok(work);
  assert.equal(work.year, 1892);
  assert.equal(work.title, "Nada the Lily");
  assert.equal(work.author, "H. Rider Haggard");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 1207);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^You ask me, my father/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("nada-the-lily"));
  assert.ok(lane!.workIds.indexOf("nada-the-lily") > lane!.workIds.indexOf("the-good-soldier"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("nada-the-lily"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("nada-the-lily"), false);
  assert.equal(curatorialTrack("nada-the-lily"), "later");
});

test("All Quiet on the Western Front is a local before-sleep Next lead, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "all-quiet-on-the-western-front");
  assert.ok(work);
  assert.equal(work.year, 1929);
  assert.equal(work.title, "All Quiet on the Western Front");
  assert.equal(work.author, "Erich Maria Remarque (tr. A. W. Wheen)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 75011);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^We are at rest five miles behind the front/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("all-quiet-on-the-western-front"));
  assert.ok(lane!.workIds.indexOf("all-quiet-on-the-western-front") > lane!.workIds.indexOf("nada-the-lily"));
  assert.ok(lane!.workIds.indexOf("all-quiet-on-the-western-front") > lane!.workIds.indexOf("quicksand"));
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("all-quiet-on-the-western-front"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("all-quiet-on-the-western-front"), false);
  assert.equal(curatorialTrack("all-quiet-on-the-western-front"), "later");
});

test("We is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "we");
  assert.ok(work);
  assert.equal(work.year, 1924);
  assert.equal(work.title, "We");
  assert.equal(work.author, "Yevgeny Zamyatin (tr. Gregory Zilboorg)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 61963);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^I feel my cheeks are burning/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("we"));
  assert.ok(lane!.workIds.indexOf("we") > lane!.workIds.indexOf("growth-of-the-soil"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("we"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("we"), false);
  assert.equal(curatorialTrack("we"), "later");
});

test("The Story of Gösta Berling is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-story-of-gosta-berling");
  assert.ok(work);
  assert.equal(work.year, 1898);
  assert.equal(work.title, "The Story of Gösta Berling");
  assert.equal(work.author, "Selma Lagerlöf (tr. Pauline Bancroft Flach)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 56158);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^At last the minister stood in the pulpit/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-story-of-gosta-berling"));
  assert.ok(
    lane!.workIds.indexOf("the-story-of-gosta-berling") >
      lane!.workIds.indexOf("all-quiet-on-the-western-front"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-story-of-gosta-berling"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-story-of-gosta-berling"), false);
  assert.equal(curatorialTrack("the-story-of-gosta-berling"), "later");
  const stub = SHELF.find((item) => item.id === "gosta");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("Thaïs is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "thais");
  assert.ok(work);
  assert.equal(work.year, 1909);
  assert.equal(work.title, "Thaïs");
  assert.equal(work.author, "Anatole France (tr. Robert B. Douglas)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2078);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^In those days there were many hermits/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("thais"));
  assert.ok(lane!.workIds.indexOf("thais") > lane!.workIds.indexOf("the-story-of-gosta-berling"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("thais"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("thais"), false);
  assert.equal(curatorialTrack("thais"), "later");
});

test("Locked recommend five stay findable on ritual lanes, not a homepage rail", () => {
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(waking?.workIds.includes("enchanted-april"));
  assert.ok(unwind?.workIds.includes("the-bridge-of-san-luis-rey"));
  assert.ok(unwind?.workIds.includes("mr-fortunes-maggot"));
  assert.ok(unwind?.workIds.includes("the-house-of-mirth"));
  assert.ok(sleep?.workIds.includes("quicksand"));
  for (const id of FEATURED_CAROUSEL_IDS) {
    assert.equal(curatorialTrack(id), "featured", id);
  }
});

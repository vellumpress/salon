import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  assert.equal(FEATURED_CAROUSEL_IDS.includes("demian"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("death-comes-for-the-archbishop"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-getting-of-wisdom"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("bliss"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("a-hundred-and-seventy-chinese-poems"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("dubliners"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("gitanjali"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("martin-bircks-youth"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("harmonium"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("steppenwolf"), false);
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
    "a-hero-of-our-time",
    "strange-tales",
    "short-stories-from-the-balkans",
    "the-awakening",
    "tropic",
    "there-is-confusion",
    "miss-lulu-bett",
    "the-three-impostors",
    "reginald",
    "last-poems-housman",
    "the-dynamiter",
    "candide",
    "trooper-peter-halket-of-mashonaland",
    "the-toys-of-peace",
    "the-black-dog",
    "children-of-the-frost",
    "south-sea-tales",
    "fairies-and-fusiliers",
    "young-adventure",
    "the-tempers",
    "the-crescent-moon",
    "poems-by-emily-dickinson-series-one",
    "a-diversity-of-creatures",
    "an-american-tragedy",
    "bertha-garlan",
    "born-in-exile",
    "calvary",
    "charmides-and-other-poems",
    "cousin-betty",
    "dauber",
    "eugenie-grandet",
    "heart-of-darkness",
    "in-a-glass-darkly",
    "in-the-world",
    "indiana",
    "lady-windermeres-fan",
    "pans-garden",
    "peacock-pie",
    "prosas-profanas",
    "resurrection",
    "rosmersholm",
    "salome",
    "salt-water-ballads",
    "small-souls",
    "songs-and-satires",
    "tess-of-the-durbervilles",
    "the-ballad-of-the-white-horse",
    "the-book-of-wonder",
    "the-colonel-s-dream",
    "the-comedienne",
    "the-crux",
    "the-dream",
    "the-gods-of-pegana",
    "the-grand-babylon-hotel",
    "the-hidden-force",
    "the-house-by-the-medlar-tree",
    "the-house-of-the-seven-gables",
    "the-jacket",
    "the-job",
    "the-magic-skin",
    "the-man-of-property",
    "the-napoleon-of-notting-hill",
    "the-party-and-other-stories",
    "the-pit",
    "the-poison-tree",
    "the-reign-of-greed",
    "the-rise-of-david-levinsky",
    "the-rise-of-silas-lapham",
    "the-road-to-the-open",
    "the-romance-of-the-milky-way",
    "the-three-taverns",
    "the-titan",
    "the-town-down-the-river",
    "the-veil-and-other-poems",
    "the-village",
    "the-wolves-of-god",
    "the-wonderful-adventures-of-nils",
    "theresa-raquin",
    "three-soldiers",
    "twilight-sleep",
    "virgin-soil",
    "wanderers",
    "white-jacket",
    "yekl",
    "zuleika-dobson",
    "all-quiet-on-the-western-front",
    "a-group-of-noble-dames",
    "captain-craig",
    "daniel-deronda",
    "day-and-night-stories",
    "fifty-one-tales",
    "jude-the-obscure",
    "les-villes-tentaculaires",
    "neue-gedichte",
    "over-the-brazier",
    "rolling-stones",
    "salammbo",
    "smoke-bellew",
    "songs-from-vagabondia",
    "songs-of-childhood",
    "ten-minute-stories",
    "the-everlasting-mercy",
    "the-golden-bowl",
    "the-rainbow",
    "the-sword-of-welleran",
    "time-and-the-gods",
    "a-changed-man",
    "ballads-of-a-bohemian",
    "ballads-of-a-cheechako",
    "crucial-instances",
    "filipino-popular-tales",
    "lost-illusions",
    "mogens",
    "more-songs-from-vagabondia",
    "rhymes-of-a-red-cross-man",
    "rhymes-of-a-rolling-stone",
    "songs-of-travel",
    "the-faith-of-men",
    "the-golden-whales-of-california",
    "the-hermit-and-the-wild-woman",
    "the-princess-casamassima",
    "the-son-of-the-wolf",
    "the-stolen-bacillus",
    "the-tragic-muse",
    "toilers-of-the-sea",
    "toward-the-gulf",
  ]);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("buddenbrooks"), false);
  assert.equal(curatorialTrack("buddenbrooks"), "later");
  assert.equal(FEATURED_CAROUSEL_IDS.includes("buddenbrooks"), false);
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
  assert.equal(curatorialTrack("all-quiet-on-the-western-front"), "next");
  assert.equal(curatorialTrack("we"), "later");
  assert.equal(curatorialTrack("the-story-of-gosta-berling"), "later");
  assert.equal(curatorialTrack("thais"), "later");
  assert.equal(curatorialTrack("demian"), "later");
  assert.equal(curatorialTrack("death-comes-for-the-archbishop"), "later");
  assert.equal(curatorialTrack("the-getting-of-wisdom"), "later");
  assert.equal(curatorialTrack("bliss"), "later");
  assert.equal(curatorialTrack("a-hundred-and-seventy-chinese-poems"), "later");
  assert.equal(curatorialTrack("dubliners"), "later");
  assert.equal(curatorialTrack("gitanjali"), "later");
  assert.equal(curatorialTrack("martin-bircks-youth"), "later");
  assert.equal(curatorialTrack("harmonium"), "later");
  assert.equal(curatorialTrack("steppenwolf"), "later");
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
      "prefer-not",
      "bliss-tokyo",
      "masque-rio",
      "the-pattern",
      "garden-party-barcelona",
      "boule-de-suif-istanbul",
      "story-of-an-hour-buenos-aires",
      "late-season",
      "open-window-singapore",
      "miss-brill-adapted",
      "the-nose-cape-town",
      "usher-prague",
      "araby-seville",
      "between-the-drop-and-the-water",
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
  for (const id of [
    "madame-bovary-tokyo",
    "dorian-gray-shanghai",
    "anna-karenina-milan",
    "jane-eyre-singapore",
    "pride-prejudice-buenos-aires",
    "dracula-istanbul",
    "crime-punishment-cape-town",
    "age-of-innocence-venice",
    "tess-lisbon",
    "scarlet-letter-kyoto",
    "wuthering-heights-rio",
  ]) {
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.notEqual(curatorialTrack(id), "adapted", id);
    assert.notEqual(curatorialTrack(id), "featured", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
  }
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
  assert.equal(stub.local, true);
  assert.notEqual(stub.id, work.id);
  assert.equal(FEATURED_CAROUSEL_IDS.includes(stub.id), false);
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
  assert.equal(work.author, "Erich Maria Remarque");
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
    true,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("all-quiet-on-the-western-front"), false);
  assert.equal(curatorialTrack("all-quiet-on-the-western-front"), "next");
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

test("Demian is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "demian");
  assert.ok(work);
  assert.equal(work.year, 1923);
  assert.equal(work.title, "Demian");
  assert.equal(work.author, "Hermann Hesse (tr. N. H. Priday)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 74222);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^I will begin my story with an event of the time when I was ten or eleven/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("demian"));
  assert.ok(lane!.workIds.indexOf("demian") > lane!.workIds.indexOf("thais"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("demian"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("demian"), false);
  assert.equal(curatorialTrack("demian"), "later");
});

test("Death Comes for the Archbishop is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "death-comes-for-the-archbishop");
  assert.ok(work);
  assert.equal(work.year, 1927);
  assert.equal(work.title, "Death Comes for the Archbishop");
  assert.equal(work.author, "Willa Cather");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 69730);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^One afternoon in the autumn of 1851 a solitary horseman/);
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const mourning = RITUAL_LANES.find((item) => item.id === "soft-mourning");
  assert.ok(waking?.workIds.includes("death-comes-for-the-archbishop"));
  assert.ok(waking!.workIds.indexOf("death-comes-for-the-archbishop") > waking!.workIds.indexOf("we"));
  assert.equal(unwind?.workIds.includes("death-comes-for-the-archbishop"), false);
  assert.equal(mourning?.workIds.includes("death-comes-for-the-archbishop"), false);
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("death-comes-for-the-archbishop"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("death-comes-for-the-archbishop"), false);
  assert.equal(curatorialTrack("death-comes-for-the-archbishop"), "later");
});

test("The Getting of Wisdom is a local waking Rituals bind, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-getting-of-wisdom");
  assert.ok(work);
  assert.equal(work.year, 1910);
  assert.equal(work.title, "The Getting of Wisdom");
  assert.equal(work.author, "Henry Handel Richardson");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 3728);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^The four children were lying on the grass/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("the-getting-of-wisdom"));
  assert.ok(
    lane!.workIds.indexOf("the-getting-of-wisdom") >
      lane!.workIds.indexOf("death-comes-for-the-archbishop"),
  );
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-getting-of-wisdom"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-getting-of-wisdom"), false);
  assert.equal(curatorialTrack("the-getting-of-wisdom"), "later");
});

test("Bliss is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "bliss");
  assert.ok(work);
  assert.equal(work.year, 1920);
  assert.equal(work.title, "Bliss");
  assert.equal(work.author, "Katherine Mansfield");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 44385);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Although Bertha Young was thirty/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("bliss"));
  assert.ok(lane!.workIds.indexOf("bliss") > lane!.workIds.indexOf("demian"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("bliss"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("bliss"), false);
  assert.equal(curatorialTrack("bliss"), "later");
});

test("A Hundred and Seventy Chinese Poems is a local before-sleep Rituals bind, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "a-hundred-and-seventy-chinese-poems");
  assert.ok(work);
  assert.equal(work.year, 1918);
  assert.equal(work.title, "A Hundred and Seventy Chinese Poems");
  assert.equal(work.author, "Various (tr. Arthur Waley)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 42290);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^My bed is so empty/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("a-hundred-and-seventy-chinese-poems"));
  assert.ok(
    lane!.workIds.indexOf("a-hundred-and-seventy-chinese-poems") > lane!.workIds.indexOf("bliss"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("a-hundred-and-seventy-chinese-poems"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("a-hundred-and-seventy-chinese-poems"), false);
  assert.equal(curatorialTrack("a-hundred-and-seventy-chinese-poems"), "later");
});

test("Dubliners is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "dubliners");
  assert.ok(work);
  assert.equal(work.year, 1914);
  assert.equal(work.title, "Dubliners");
  assert.equal(work.author, "James Joyce");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2814);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^There was no hope for him this time/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("dubliners"));
  assert.ok(lane!.workIds.indexOf("dubliners") > lane!.workIds.indexOf("a-hundred-and-seventy-chinese-poems"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("dubliners"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("dubliners"), false);
  assert.equal(curatorialTrack("dubliners"), "later");
});

test("Gitanjali is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "gitanjali");
  assert.ok(work);
  assert.equal(work.year, 1912);
  assert.equal(work.title, "Gitanjali");
  assert.equal(work.author, "Rabindranath Tagore");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 7164);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Thou hast made me endless/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("gitanjali"));
  assert.ok(lane!.workIds.indexOf("gitanjali") > lane!.workIds.indexOf("dubliners"));
  assert.equal(unwind?.workIds.includes("gitanjali"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("gitanjali"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("gitanjali"), false);
  assert.equal(curatorialTrack("gitanjali"), "later");
});

test("Harmonium is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "harmonium");
  assert.ok(work);
  assert.equal(work.year, 1923);
  assert.equal(work.title, "Harmonium");
  assert.equal(work.author, "Wallace Stevens");
  assert.equal(work.local, true);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^One must have a mind of winter/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("harmonium"));
  assert.ok(lane!.workIds.indexOf("harmonium") > lane!.workIds.indexOf("martin-bircks-youth"));
  assert.equal(unwind?.workIds.includes("harmonium"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("harmonium"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("harmonium"), false);
  assert.equal(curatorialTrack("harmonium"), "later");
});

test("Martin Birck's Youth is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "martin-bircks-youth");
  assert.ok(work);
  assert.equal(work.year, 1930);
  assert.equal(work.title, "Martin Birck's Youth");
  assert.equal(work.author, "Hjalmar Söderberg (tr. Charles Wharton Stork)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 78363);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Martin Birck was a little child/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("martin-bircks-youth"));
  assert.ok(lane!.workIds.indexOf("martin-bircks-youth") > lane!.workIds.indexOf("gitanjali"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("martin-bircks-youth"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("martin-bircks-youth"), false);
  assert.equal(curatorialTrack("martin-bircks-youth"), "later");
});

test("Steppenwolf stays off this Next / Rituals pack", () => {
  const work = SHELF.find((item) => item.id === "steppenwolf");
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 75756);
  assert.equal(work.breaths, 770);
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("steppenwolf"), false, lane.id);
  }
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("steppenwolf"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("steppenwolf"), false);
});

test("Unhuman Tour soft-holds stay off this Next / Rituals pack", () => {
  for (const id of ["unhuman-tour-kusamakura", "kusamakura-unhuman-tour"]) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, undefined, id);
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${id} ${lane.id}`);
    }
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
  }
});

test("Salon 8am CLEAR ×4 are local Next / Rituals binds, never Featured", () => {
  const expect = {
    "nacha-regules": { lane: "unwind", opening: /^An August night!/ },
    krakatit: { lane: "before-sleep", opening: /^With the evening the fog/ },
    "the-peasants": { lane: "waking-up", opening: /Praised be Jesus Christ!/ },
    cane: { lane: "before-sleep", opening: /^Her skin is like dusk/ },
  } as const;
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.match(work!.opening ?? "", want.opening, id);
    const lane = RITUAL_LANES.find((item) => item.id === want.lane);
    assert.ok(lane?.workIds.includes(id), `${id} ${want.lane}`);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "later", id);
  }
  assert.ok(forYou?.workIds.includes("cane"));
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(forYou!.workIds.includes("nacha-regules"), false);
  assert.equal(forYou!.workIds.includes("krakatit"), false);
  assert.equal(forYou!.workIds.includes("the-peasants"), false);
});

test("Salon noon CLEAR ×5 are local Next / Rituals binds, never Featured", () => {
  const expect = {
    "a-hero-of-our-time": {
      track: "next",
      opening: /^I was travelling post from Tiflis\./,
      breaths: 1526,
    },
    "strange-tales": {
      track: "next",
      opening: /^A Kiang-si gentleman, named Mêng Lung-t‘an/,
      breaths: 470,
    },
    "short-stories-from-the-balkans": {
      track: "next",
      opening: /^Leiba Zibal, proprietor of the little rest-house by Podeni/,
      breaths: 986,
    },
    "the-awakening": {
      track: "next",
      opening: /^A green and yellow parrot, which hung in a cage outside the door/,
      breaths: 1066,
    },
    "a-few-figs-from-thistles": {
      track: "later",
      opening: /^My candle burns at both ends;/,
      breaths: 66,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  assert.ok(sleep);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.match(work!.opening ?? "", want.opening, id);
    assert.ok(sleep!.workIds.includes(id), id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), want.track, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  const cycle = [
    "a-hero-of-our-time",
    "strange-tales",
    "short-stories-from-the-balkans",
    "the-awakening",
    "a-few-figs-from-thistles",
  ];
  const immoralist = sleep!.workIds.indexOf("the-immoralist");
  const gadfly = sleep!.workIds.indexOf("the-gadfly");
  for (const id of cycle) {
    const at = sleep!.workIds.indexOf(id);
    assert.ok(at > immoralist, `${id} ahead of Later pile`);
    assert.ok(at < gadfly, `${id} ahead of Later pile`);
  }
  assert.equal(waking?.workIds.includes("a-few-figs-from-thistles"), false);
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  const caneAt = forYou!.workIds.indexOf("cane");
  const awakeningAt = forYou!.workIds.indexOf("the-awakening");
  assert.ok(caneAt > 2);
  assert.equal(awakeningAt, caneAt + 1);
  assert.equal(forYou!.workIds.includes("cane"), true);
  assert.equal(forYou!.workIds.includes("a-hero-of-our-time"), false);
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("a-few-figs-from-thistles"),
    false,
  );
  assert.equal(curatorialTrack("a-few-figs-from-thistles"), "later");
});

test("Salon PM CLEAR ×5 are local Next / Rituals binds, never Featured", () => {
  const expect = {
    tropic: {
      track: "next",
      opening: /^The whistle blew for eleven o'clock\.$/,
      breaths: 3259,
      forYou: false,
    },
    "there-is-confusion": {
      track: "next",
      opening: /^Joanna’s first consciousness/,
      breaths: 2014,
      forYou: true,
    },
    buddenbrooks: {
      track: "later",
      opening: /^“And--and--what comes next\?”$/,
      breaths: 1845,
      forYou: false,
    },
    "miss-lulu-bett": {
      track: "next",
      opening: /^The Deacons were at supper\.$/,
      breaths: 1712,
      forYou: true,
    },
    color: {
      track: "later",
      opening: /^I doubt not God is good, well-meaning, kind,$/,
      breaths: 1192,
      forYou: false,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  assert.ok(sleep);
  assert.ok(forYou);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.match(work!.opening ?? "", want.opening, id);
    assert.ok(sleep!.workIds.includes(id), id);
    assert.equal(forYou!.workIds.includes(id), want.forYou, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), want.track, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(
      (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id),
      want.track === "next",
      id,
    );
  }
  const cycle = ["tropic", "there-is-confusion", "buddenbrooks", "miss-lulu-bett", "color"];
  const figs = sleep!.workIds.indexOf("a-few-figs-from-thistles");
  const gadfly = sleep!.workIds.indexOf("the-gadfly");
  let prev = figs;
  for (const id of cycle) {
    const at = sleep!.workIds.indexOf(id);
    assert.ok(at > prev, `${id} follows the PM cycle order`);
    assert.ok(at < gadfly, `${id} ahead of the Later pile`);
    prev = at;
  }
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(next.indexOf("tropic") > next.indexOf("the-awakening"));
  assert.ok(next.indexOf("there-is-confusion") > next.indexOf("tropic"));
  assert.ok(next.indexOf("miss-lulu-bett") > next.indexOf("there-is-confusion"));
  assert.equal(next.includes("buddenbrooks"), false);
  assert.equal(next.includes("color"), false);
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(forYou!.workIds.at(-2), "there-is-confusion");
  assert.equal(forYou!.workIds.at(-1), "miss-lulu-bett");
  assert.equal(sleep!.workIds[0], "quicksand");
});


test("BATCH-4 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-group-of-noble-dames": { opening: "King's-Hintock Court (said the narrator, turning over his memoranda for reference)--King's-Hintock C", breaths: 1152, scenes: 10, gutenberg: 3049 },
    "captain-craig": { opening: "I doubt if ten men in all Tilbury Town Had ever shaken hands with Captain Craig, Or called him by hi", breaths: 258, scenes: 16, gutenberg: 77544 },
    "daniel-deronda": { opening: "Men can do nothing without the make-believe of a beginning. Even science, the strict measurer, is ob", breaths: 4304, scenes: 70, gutenberg: 7469 },
    "day-and-night-stories": { opening: "\"*Je suis la première au rendez-vous. Je vous attends.*\"", breaths: 995, scenes: 15, gutenberg: 45964 },
    "fifty-one-tales": { opening: "Fame singing in the highways, and trifling as she sang, with sordid adventurers, passed the poet by.", breaths: 451, scenes: 49, gutenberg: 7838 },
    "jude-the-obscure": { opening: "Part First AT MARYGREEN", breaths: 3627, scenes: 81, gutenberg: 153 },
    "les-villes-tentaculaires": { opening: "*Tous les chemins vont vers la ville.*", breaths: 520, scenes: 32, gutenberg: 45590 },
    "neue-gedichte": { opening: "Wie manches Mal durch das noch unbelaubte Gezweig ein Morgen durchsieht, der schon ganz im Frühling", breaths: 344, scenes: 64, gutenberg: 33863 },
    "over-the-brazier": { opening: "The youngest poet down the shelves was fumbling In a dim library, just behind the chair From which t", breaths: 89, scenes: 20, gutenberg: 47144 },
    "rolling-stones": { opening: "[This was the last work of O. Henry. The *Cosmopolitan Magazine* had ordered it from him and, after", breaths: 1496, scenes: 21, gutenberg: 3815 },
    "salammbo": { opening: "It was at Megara, a suburb of Carthage, in the gardens of Hamilcar. The soldiers whom he had command", breaths: 1924, scenes: 15, gutenberg: 1290 },
    "smoke-bellew": { opening: "I.", breaths: 1255, scenes: 6, gutenberg: 1596 },
    "songs-from-vagabondia": { opening: "VAGABONDIA.", breaths: 306, scenes: 7, gutenberg: 18238 },
    "songs-of-childhood": { opening: "As I lay awake in the white moonlight, I heard a sweet singing in the wood-- 'Out of bed, Sleepyhead", breaths: 332, scenes: 43, gutenberg: 23545 },
    "ten-minute-stories": { opening: "At the moorland cross-roads Martin stood examining the sign-post for several minutes in some bewilde", breaths: 833, scenes: 28, gutenberg: 72928 },
    "the-everlasting-mercy": { opening: "Produced by Al Haines.", breaths: 210, scenes: 1, gutenberg: 41467 },
    "the-golden-bowl": { opening: "The Prince had always liked his London, when it had come to him; he was one of the modern Romans who", breaths: 2497, scenes: 42, gutenberg: 4264 },
    "the-rainbow": { opening: "Chapter I. HOW TOM BRANGWEN MARRIED A POLISH LADY", breaths: 4518, scenes: 101, gutenberg: 28948 },
    "the-sword-of-welleran": { opening: "Where the great plain of Tarphet runs up, as the sea in estuaries, among the Cyresian mountains, the", breaths: 434, scenes: 11, gutenberg: 10806 },
    "time-and-the-gods": { opening: "Once when the gods were young and only Their swarthy servant Time was without age, the gods lay slee", breaths: 677, scenes: 20, gutenberg: 8183 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("zuleika-dobson");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.ok(sleep!.workIds.includes(id), id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows Tier A on Next`);
    prev = at;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening.slice(0, 40)), id);
  }
});


test("BATCH-5 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-changed-man": { opening: "A Committee Man of 'The Terror' Master John Horseleigh, Knight The Duke's Reappearance A Mere Interlude", breaths: 1806, scenes: 11, gutenberg: 3058 },
    "ballads-of-a-bohemian": { opening: "Alas! upon some starry height, The Gods of Excellence to please, This hand of mine will never smite The Harp of High Ser", breaths: 732, scenes: 67, gutenberg: 995 },
    "ballads-of-a-cheechako": { opening: "My rhymes are rough, and often in my rhyming I've drifted, silver-sailed, on seas of dream, Hearing afar the bells of El", breaths: 301, scenes: 20, gutenberg: 259 },
    "crucial-instances": { opening: "Have you ever questioned the long shuttered front of an old Italian house, that motionless mask, smooth, mute, equivocal", breaths: 1090, scenes: 7, gutenberg: 7516 },
    "filipino-popular-tales": { opening: "Narrated by Macaria Garcia. The story is popular among the Pampangans.", breaths: 3055, scenes: 79, gutenberg: 8299 },
    "lost-illusions": { opening: "At the time when this story opens, the Stanhope press and the ink-distributing roller were not as yet in general use in ", breaths: 660, scenes: 12, gutenberg: 13159 },
    "mogens": { opening: "SUMMER it was; in the middle of the day; in a corner of the enclosure. Immediately in front of it stood an old oaktree, ", breaths: 477, scenes: 4, gutenberg: 6765 },
    "more-songs-from-vagabondia": { opening: "What is the stir in the street? Hurry of feet! And after, A sound as of pipes and of tabers!", breaths: 385, scenes: 44, gutenberg: 18007 },
    "rhymes-of-a-red-cross-man": { opening: "With flowers of flame festoon the night.", breaths: 354, scenes: 62, gutenberg: 315 },
    "rhymes-of-a-rolling-stone": { opening: "_I sing no idle songs of dalliance days, No dreams Elysian inspire my rhyming; I have no Celia to enchant my lays, No pi", breaths: 348, scenes: 52, gutenberg: 309 },
    "songs-of-travel": { opening: "Give to me the life I love, Let the lave go by me, Give the jolly heaven above And the byway nigh me. Bed in the bush wi", breaths: 147, scenes: 37, gutenberg: 487 },
    "the-faith-of-men": { opening: "I wash my hands of him at the start. I cannot father his tales, nor will I be responsible for them. I make these prelimi", breaths: 781, scenes: 8, gutenberg: 1096 },
    "the-golden-whales-of-california": { opening: "Once, in the city of Kalamazoo, The gods went walking, two and two, With the friendly phœnix, the stars of Orion, The sp", breaths: 431, scenes: 47, gutenberg: 69969 },
    "the-hermit-and-the-wild-woman": { opening: "THE Hermit lived in a cave in the hollow of a hill. Below him was a glen, with a stream in a coppice of oaks and alders,", breaths: 1228, scenes: 7, gutenberg: 4533 },
    "the-princess-casamassima": { opening: "“Oh yes, I dare say I can find the child, if you would like to see him,” Miss Pynsent said; she had a fluttering wish to", breaths: 2952, scenes: 47, gutenberg: 64599 },
    "the-son-of-the-wolf": { opening: "'Carmen won't last more than a couple of days.' Mason spat out a chunk of ice and surveyed the poor animal ruefully, the", breaths: 742, scenes: 9, gutenberg: 2377 },
    "the-stolen-bacillus": { opening: "\"This again,\" said the Bacteriologist, slipping a glass slide under the microscope, \"is a preparation of the celebrated ", breaths: 790, scenes: 15, gutenberg: 12750 },
    "the-tragic-muse": { opening: "The people of France have made it no secret that those of England, as a general thing, are to their perception an inexpr", breaths: 3936, scenes: 51, gutenberg: 20085 },
    "toilers-of-the-sea": { opening: "Christmas Day in the year 182- was somewhat remarkable in the island of Guernsey. Snow fell on that day. In the Channel ", breaths: 2319, scenes: 71, gutenberg: 32338 },
    "toward-the-gulf": { opening: "DEAR OLD DICK THE ROOM OF MIRRORS THE LETTER CANTICLE OF THE RACE BLACK EAGLE RETURNS TO ST. JOE MY LIGHT WITH YOURS THE", breaths: 660, scenes: 43, gutenberg: 7845 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("time-and-the-gods");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.ok(sleep!.workIds.includes(id), id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows BATCH-4 on Next`);
    prev = at;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening.slice(0, 40)), id);
  }
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

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

test("Featured carousel is unchanged and does not include Quicksand", () => {
  assert.ok(FEATURED_CAROUSEL_IDS.includes("passing"));
  assert.equal(FEATURED_CAROUSEL_IDS.includes("quicksand"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("attendants-confession"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("rashomon"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("high-wind-jamaica"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("noli-me-tangere"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("vera"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("on-a-chinese-screen"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("futility"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("poison-tree"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("trooper-peter-halket"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("second-april"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-bridge"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("miss-brill-adapted"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("prefer-not"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("late-season"), false);
  for (const id of FEATURED_CAROUSEL_IDS) {
    assert.equal(curatorialTrack(id), "featured", id);
  }
});

test("Quicksand is Next Featured-track", () => {
  assert.deepEqual([...NEXT_FEATURED_TRACK_IDS], [
    "quicksand",
    "attendants-confession",
    "rashomon",
    "high-wind-jamaica",
    "noli-me-tangere",
    "vera",
    "on-a-chinese-screen",
    "futility",
    "trooper-peter-halket",
  ]);
  assert.equal(curatorialTrack("quicksand"), "next");
  assert.equal(curatorialTrack("attendants-confession"), "next");
  assert.equal(curatorialTrack("rashomon"), "next");
  assert.equal(curatorialTrack("high-wind-jamaica"), "next");
  assert.equal(curatorialTrack("noli-me-tangere"), "next");
  assert.equal(curatorialTrack("vera"), "next");
  assert.equal(curatorialTrack("on-a-chinese-screen"), "next");
  assert.equal(curatorialTrack("futility"), "next");
  assert.equal(curatorialTrack("trooper-peter-halket"), "next");
  assert.equal(curatorialTrack("poison-tree"), "later");
  assert.equal(curatorialTrack("the-house-of-mirth"), "later");
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

test("Adapted by Salon remakes are their own track — never Featured or Next", () => {
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
    ],
  );
  for (const id of ADAPTED_BY_SALON_IDS) {
    assert.equal(isAdaptedBySalon(id), true, id);
    assert.equal(curatorialTrack(id), "adapted", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
  }
  assert.equal(curatorialTrack("passing"), "featured");
  assert.equal(curatorialTrack("quicksand"), "next");
  const garden = SHELF.find((item) => item.id === "the-garden-party-and-other-stories");
  assert.ok(garden);
  assert.equal(garden!.title.startsWith("The Garden Party"), true);
  assert.equal(curatorialTrack("the-garden-party-and-other-stories"), "later");
});

test("The Attendant’s Confession is a local before-sleep bind on Next Featured-track", () => {
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

test("Rashōmon is a local before-sleep bind on Next Featured-track", () => {
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

test("A High Wind in Jamaica is a local before-sleep bind on Next Featured-track", () => {
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

test("Noli Me Tangere is a local unwind bind on Next Featured-track", () => {
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

test("Vera is a local before-sleep bind on Next Featured-track", () => {
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

test("On a Chinese Screen is a local waking bind on Next Featured-track", () => {
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

test("Futility is a local waking bind on Next Featured-track", () => {
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

test("Trooper Peter Halket is a local before-sleep bind on Next Featured-track", () => {
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

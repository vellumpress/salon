import assert from "node:assert/strict";
import test from "node:test";
import { estimateRitualMinutes, ritualDurationLabel } from "./rituals.ts";
import type { ShelfWork } from "./shelf";

function work(
  partial: Partial<ShelfWork> & Pick<ShelfWork, "id" | "form">,
): ShelfWork {
  return {
    title: "Title",
    author: "Author",
    year: 1900,
    language: "English",
    minutes: 160,
    ...partial,
  };
}

test("short poem pamphlet lands near ~12 min", () => {
  const item = work({
    id: "second-april",
    form: "poem",
    breaths: 343,
    minutes: 43,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 12);
  assert.equal(ritualDurationLabel(item), "~12 min");
});

test("Figs before-sleep sit is First Fig and Recuerdo", () => {
  const item = work({
    id: "a-few-figs-from-thistles",
    form: "poem",
    breaths: 66,
    minutes: 20,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Yellow Wallpaper is about a half hour", () => {
  const item = work({
    id: "wallpaper",
    form: "other",
    breaths: 390,
    minutes: 49,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 35);
  assert.equal(ritualDurationLabel(item), "~30 min");
});

test("long novel becomes several sittings", () => {
  const item = work({
    id: "orlando",
    form: "novel",
    breaths: 3247,
    minutes: 406,
    local: true,
  });
  assert.ok(estimateRitualMinutes(item) > 90);
  assert.equal(ritualDurationLabel(item), "Several sittings");
});

test("medium poetry collection is one sitting", () => {
  const item = work({
    id: "the-wild-swans-at-coole",
    form: "poem",
    breaths: 1434,
    minutes: 179,
    local: true,
  });
  assert.equal(ritualDurationLabel(item), "One sitting");
});

test("form heuristic when breaths are missing", () => {
  assert.equal(
    ritualDurationLabel(work({ id: "x-poem", form: "poem", minutes: 160 })),
    "~20 min",
  );
  assert.equal(
    ritualDurationLabel(work({ id: "x-novel", form: "novel", minutes: 160 })),
    "Several sittings",
  );
});

test("bite-sized ritual sits use short overrides", () => {
  const item = work({
    id: "passing",
    form: "novel",
    breaths: 3034,
    minutes: 197,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Quicksand before-sleep sit is a short evening room, not the whole novel", () => {
  const item = work({
    id: "quicksand",
    form: "novel",
    breaths: 685,
    minutes: 160,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Attendant’s Confession before-sleep sit is the human document, not the whole story", () => {
  const item = work({
    id: "attendants-confession",
    form: "other",
    breaths: 248,
    minutes: 31,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Rashōmon before-sleep sit is the empty gate, not the whole story", () => {
  const item = work({
    id: "rashomon",
    form: "other",
    breaths: 151,
    minutes: 14,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("A High Wind in Jamaica before-sleep sit is the rank-plant cut, not the novel", () => {
  const item = work({
    id: "high-wind-jamaica",
    form: "novel",
    breaths: 12,
    minutes: 3,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 3);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Noli Me Tangere unwind sit is the dinner announcement, not the novel", () => {
  const item = work({
    id: "noli-me-tangere",
    form: "novel",
    breaths: 7,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Botchan first-session sit is the scar beat, not the novel", () => {
  const item = work({
    id: "botchan",
    form: "novel",
    breaths: 3074,
    minutes: 384,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Vera before-sleep sit is the cliff-gate cut, not the novel", () => {
  const item = work({
    id: "vera",
    form: "novel",
    breaths: 5,
    minutes: 4,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 4);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("On a Chinese Screen waking sit is the Parlour cut, not the book", () => {
  const item = work({
    id: "on-a-chinese-screen",
    form: "stories",
    breaths: 23,
    minutes: 5,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Futility waking sit is the sisters-bouquet cut, not the novel", () => {
  const item = work({
    id: "futility",
    form: "novel",
    breaths: 17,
    minutes: 4,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 4);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Poison Tree unwind sit is the storm cut, not the novel", () => {
  const item = work({
    id: "poison-tree",
    form: "novel",
    breaths: 42,
    minutes: 5,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Enchanted April waking sit is the first-session dripping-street cut, not the novel", () => {
  const item = work({
    id: "enchanted-april",
    form: "novel",
    breaths: 7,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 8);
  assert.equal(ritualDurationLabel(item), "~12 min");
});

test("Mr. Fortune’s Maggot unwind sit is the Fanua-call cut, not the novel", () => {
  const item = work({
    id: "mr-fortunes-maggot",
    form: "novel",
    breaths: 2629,
    minutes: 329,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Home and the World before-sleep sit is the mirror-prayer cut", () => {
  const item = work({
    id: "the-home-and-the-world",
    form: "novel",
    breaths: 8,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 6);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Where Angels Fear to Tread waking sit is the platform cut", () => {
  const item = work({
    id: "where-angels-fear-to-tread",
    form: "novel",
    breaths: 6,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 4);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Immoralist before-sleep sit is the freedom-line cut", () => {
  const item = work({
    id: "the-immoralist",
    form: "novel",
    breaths: 12,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Letters of a Javanese Princess waking sit is the cloistered-arms cut", () => {
  const item = work({
    id: "letters-of-a-javanese-princess",
    form: "other",
    breaths: 5,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Painted Veil before-sleep sit is the door cut", () => {
  const item = work({
    id: "the-painted-veil",
    form: "novel",
    breaths: 16,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Good Soldier before-sleep sit is the glove cut", () => {
  const item = work({
    id: "the-good-soldier",
    form: "novel",
    breaths: 6,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Growth of the Soil waking sit is the first-sack cut", () => {
  const item = work({
    id: "growth-of-the-soil",
    form: "novel",
    breaths: 9,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("All Quiet on the Western Front before-sleep sit is the double-rations cut", () => {
  const item = work({
    id: "all-quiet-on-the-western-front",
    form: "novel",
    breaths: 13,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("We waking sit is the wisest-of-lines cut", () => {
  const item = work({
    id: "we",
    form: "novel",
    breaths: 9,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Story of Gösta Berling before-sleep sit is the pulpit cut", () => {
  const item = work({
    id: "the-story-of-gosta-berling",
    form: "novel",
    breaths: 9,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Demian before-sleep sit is the two-worlds cut", () => {
  const item = work({
    id: "demian",
    form: "novel",
    breaths: 9,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Death Comes for the Archbishop waking sit is the red-hills cut", () => {
  const item = work({
    id: "death-comes-for-the-archbishop",
    form: "novel",
    breaths: 3474,
    minutes: 457,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Bliss before-sleep sit is the radiant-mirror cut", () => {
  const item = work({
    id: "bliss",
    form: "other",
    breaths: 360,
    minutes: 45,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("A Hundred and Seventy Chinese Poems before-sleep sit is the Winter Night cut", () => {
  const item = work({
    id: "a-hundred-and-seventy-chinese-poems",
    form: "poem",
    breaths: 896,
    minutes: 112,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Dubliners Rituals sit is the Araby cut", () => {
  const item = work({
    id: "dubliners",
    form: "stories",
    breaths: 196,
    minutes: 25,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 12);
  assert.equal(ritualDurationLabel(item), "~12 min");
});

test("Gitanjali before-sleep sit is the poem-1 cut", () => {
  const item = work({
    id: "gitanjali",
    form: "poem",
    breaths: 750,
    minutes: 94,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Harmonium before-sleep sit is The Snow Man cut", () => {
  const item = work({
    id: "harmonium",
    form: "poem",
    breaths: 2221,
    minutes: 293,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Martin Birck's Youth before-sleep sit is the childhood-garden cut", () => {
  const item = work({
    id: "martin-bircks-youth",
    form: "novel",
    breaths: 1769,
    minutes: 221,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Getting of Wisdom waking sit is the dirty-sheet cut", () => {
  const item = work({
    id: "the-getting-of-wisdom",
    form: "novel",
    breaths: 3689,
    minutes: 461,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Thaïs before-sleep sit is the Nile-huts cut", () => {
  const item = work({
    id: "thais",
    form: "novel",
    breaths: 48,
    minutes: 8,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 8);
  assert.equal(ritualDurationLabel(item), "~12 min");
});

test("Nada the Lily before-sleep sit is the hidden-name cut", () => {
  const item = work({
    id: "nada-the-lily",
    form: "novel",
    breaths: 8,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Blood and Sand waking sit is the fight-day breakfast cut", () => {
  const item = work({
    id: "blood-and-sand",
    form: "novel",
    breaths: 7,
    minutes: 2,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Gadfly before-sleep sit is the Fragola cut, not the novel", () => {
  const item = work({
    id: "the-gadfly",
    form: "novel",
    breaths: 6653,
    minutes: 832,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Nacha Regules unwind sit is the mandola cut", () => {
  const item = work({
    id: "nacha-regules",
    form: "novel",
    breaths: 1252,
    minutes: 160,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Krakatit before-sleep sit is the fog-and-eyes cut", () => {
  const item = work({
    id: "krakatit",
    form: "novel",
    breaths: 1887,
    minutes: 160,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("The Peasants waking sit is the roadside greeting cut", () => {
  const item = work({
    id: "the-peasants",
    form: "novel",
    breaths: 2772,
    minutes: 160,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 2);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Cane Rituals sit is the Karintha sketch", () => {
  const item = work({
    id: "cane",
    form: "stories",
    breaths: 909,
    minutes: 80,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 4);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

test("Trooper Peter Halket before-sleep sit is the kopje-fire cut, not the novel", () => {
  const item = work({
    id: "trooper-peter-halket",
    form: "novel",
    breaths: 16,
    minutes: 4,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 4);
  assert.equal(ritualDurationLabel(item), "~5 min");
});

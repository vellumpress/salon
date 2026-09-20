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
    id: "a-few-figs-from-thistles",
    form: "poem",
    breaths: 343,
    minutes: 43,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 12);
  assert.equal(ritualDurationLabel(item), "~12 min");
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
    breaths: 3366,
    minutes: 421,
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

test("Enchanted April waking sit is the Agony Column cut, not the novel", () => {
  const item = work({
    id: "enchanted-april",
    form: "novel",
    breaths: 4375,
    minutes: 547,
    local: true,
  });
  assert.equal(estimateRitualMinutes(item), 5);
  assert.equal(ritualDurationLabel(item), "~5 min");
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

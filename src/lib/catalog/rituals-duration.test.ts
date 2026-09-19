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

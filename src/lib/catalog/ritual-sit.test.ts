import assert from "node:assert/strict";
import test from "node:test";
import { nearestSitPreset } from "../sitting.ts";
import {
  RITUAL_SIT_MINUTES,
  estimateRitualMinutes,
  isPlaceholderRitualLabel,
  parseRitualDurationLabel,
  ritualCardSearch,
  ritualCardSit,
  ritualDurationLabel,
} from "./rituals.ts";
import { measureRitualSit, ritualBookCards } from "./ritual-sit-measure.ts";
import type { ShelfWork } from "./shelf.ts";

function card(id: string): ShelfWork {
  const work = ritualBookCards().find((item) => item.id === id);
  assert.ok(work, id);
  return work;
}

test("ritual card labels match the measured sit and are not placeholders", () => {
  const failures: string[] = [];
  let labeledFive = 0;
  for (const work of ritualBookCards()) {
    const measured = measureRitualSit(work.id);
    const label = ritualDurationLabel(work);
    const named = parseRitualDurationLabel(label);
    const sit = ritualCardSit(work);
    const stored = RITUAL_SIT_MINUTES[work.id];
    if (label === "~5 min") labeledFive += 1;
    if (stored !== measured.minutes) {
      failures.push(`${work.id} stored ${stored} measured ${measured.minutes} (${measured.words} words, ${measured.source})`);
    }
    if (named === null || Math.abs(named - measured.minutes) > 2) {
      failures.push(`${work.id} label ${label} is more than 2 min from ${measured.minutes}`);
    }
    if (Math.abs(sit - measured.minutes) > 2) {
      failures.push(`${work.id} opens ${sit} min, measured ${measured.minutes}`);
    }
    if (named !== sit) {
      failures.push(`${work.id} label ${label} does not match the sitting it opens (${sit})`);
    }
    if (isPlaceholderRitualLabel(label, measured.minutes)) {
      failures.push(`${work.id} uses a placeholder label ${label} for a ${measured.minutes} min sit`);
    }
    if (stored === 5 && Math.abs(measured.minutes - 5) > 2) {
      failures.push(`${work.id} still has the placeholder sit of 5`);
    }
  }
  assert.equal(failures.length, 0, failures.slice(0, 12).join("\n"));
  assert.ok(labeledFive < 80, `still ${labeledFive} cards labeled ~5 min`);
});

test("Easter, Trafalgar, and The Ballad of the White Horse keep Mira's measured sits", () => {
  const easter = card("easter");
  assert.equal(measureRitualSit("easter").words, 6081);
  assert.equal(estimateRitualMinutes(easter), 30);
  assert.equal(ritualDurationLabel(easter), "~30 min");
  assert.equal(ritualCardSit(easter), 30);

  const trafalgar = card("trafalgar");
  assert.equal(measureRitualSit("trafalgar").words, 2736);
  assert.equal(estimateRitualMinutes(trafalgar), 14);
  assert.equal(ritualDurationLabel(trafalgar), "~14 min");
  assert.equal(ritualCardSit(trafalgar), 14);
  assert.notEqual(nearestSitPreset(14), 14);

  const horse = card("the-ballad-of-the-white-horse");
  assert.equal(measureRitualSit("the-ballad-of-the-white-horse").words, 1742);
  assert.equal(estimateRitualMinutes(horse), 9);
  assert.equal(ritualDurationLabel(horse), "~9 min");
  assert.equal(ritualCardSit(horse), 9);
  assert.equal(nearestSitPreset(9), 12);
});

test("Quicksand opens Chapter I, not the five-minute placeholder", () => {
  const work = card("quicksand");
  const sit = measureRitualSit("quicksand");
  assert.equal(sit.scene, "Chapter I");
  assert.equal(sit.minutes, 17);
  assert.equal(ritualDurationLabel(work), "~17 min");
  assert.equal(ritualCardSit(work), 17);
  assert.equal(isPlaceholderRitualLabel("~5 min", sit.minutes), true);
});

test("a mid-book tale keeps its own minutes instead of the shared preset", () => {
  const fjeld = card("tales-from-the-fjeld");
  assert.equal(estimateRitualMinutes(fjeld), 8);
  assert.equal(nearestSitPreset(8), 12);
  assert.equal(ritualCardSit(fjeld), 8);
  assert.equal(ritualDurationLabel(fjeld), "~8 min");
  assert.deepEqual(ritualCardSearch(fjeld), { sit: 8, at: 1658 });
});

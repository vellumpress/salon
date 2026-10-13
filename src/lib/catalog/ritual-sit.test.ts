import assert from "node:assert/strict";
import test from "node:test";
import { ritualCardPitch } from "./blurbs.ts";
import { nearestSitPreset } from "../sitting.ts";
import { shelfWork } from "./shelf.ts";
import {
  RITUAL_LANES,
  RITUAL_SIT_MINUTES,
  estimateRitualMinutes,
  isPlaceholderRitualLabel,
  parseRitualDurationLabel,
  ritualCardSearch,
  ritualCardSit,
  ritualDurationLabel,
  ritualPitchFor,
  worksForRitualLane,
} from "./rituals.ts";
import { measureRitualSit, ritualBookCards } from "./ritual-sit-measure.ts";
import type { ShelfWork } from "./shelf.ts";

function card(id: string): ShelfWork {
  const work = ritualBookCards().find((item) => item.id === id);
  assert.ok(work, id);
  return work;
}

test("every ritual card has a pitch", () => {
  const blank: string[] = [];
  for (const lane of RITUAL_LANES) {
    if (lane.id === "serialize") continue;
    for (const work of worksForRitualLane(lane)) {
      if (!ritualCardPitch(work.id).trim()) blank.push(`${lane.id}:${work.id}`);
    }
  }
  assert.deepEqual(blank, []);
});

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

test("Botchan's ritual sit is the scar passage, about one minute", () => {
  const sit = measureRitualSit("botchan");
  assert.equal(sit.source, "opening");
  assert.equal(sit.words, 260);
  assert.equal(sit.minutes, 1);
  const work = card("botchan");
  assert.equal(ritualDurationLabel(work), "~1 min");
  assert.equal(ritualCardSit(work), 1);
  assert.equal(ritualCardSearch(work).sit, 1);
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

test("PITCHES-2 drops eight sits from Unwind and Before sleep without emptying either lane", () => {
  const gone = [
    "in-a-glass-darkly",
    "of-one-blood",
    "rosmersholm",
    "miss-julia",
    "rolling-stones",
    "salome",
    "rhymes-of-a-red-cross-man",
    "layla",
  ];
  for (const laneId of ["unwind", "before-sleep"] as const) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane);
    const empty: string[] = [];
    for (const id of lane.workIds) {
      if (!shelfWork(id) || !ritualCardPitch(id).trim()) empty.push(id);
    }
    assert.deepEqual(empty, [], laneId);
    for (const id of gone) assert.equal(lane.workIds.includes(id), false, `${laneId}:${id}`);
  }
  for (const id of gone) {
    assert.ok(shelfWork(id), id);
    assert.equal(ritualPitchFor(id), undefined, id);
  }
});

test("PITCHES-3 drops eight wind-down sits and keeps Underdogs on On a walk", () => {
  const gone = [
    "self-determining-haiti",
    "shahnameh",
    "smoke-and-steel",
    "tales-of-old-japan",
    "the-dream",
    "the-everlasting-mercy",
    "gilgamesh",
    "the-dynamiter",
  ];
  for (const laneId of ["unwind", "before-sleep"] as const) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane);
    const empty: string[] = [];
    for (const id of lane.workIds) {
      if (!shelfWork(id) || !ritualCardPitch(id).trim()) empty.push(id);
    }
    assert.deepEqual(empty, [], laneId);
    for (const id of gone) assert.equal(lane.workIds.includes(id), false, `${laneId}:${id}`);
    assert.equal(lane.workIds.includes("underdogs"), false, laneId);
  }
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  assert.ok(walk?.workIds.includes("underdogs"));
  assert.ok(ritualPitchFor("underdogs"));
  for (const id of gone) {
    assert.ok(shelfWork(id), id);
    assert.equal(ritualPitchFor(id), undefined, id);
  }
});

test("PITCHES-4 drops seventeen sits from Before sleep without emptying the lane", () => {
  const gone = [
    "the-magic-skin",
    "the-princess-casamassima",
    "the-triumph-of-death",
    "watch-and-ward",
    "warriors-of-old-japan",
    "the-jacket",
    "the-hermit-and-the-wild-woman",
    "the-octopus",
    "the-red-laugh",
    "the-three-impostors",
    "the-wolves-of-god",
    "the-party-and-other-stories",
    "the-tempers",
    "the-son-of-the-wolf",
    "toward-the-gulf",
    "the-hesperides-and-noble-numbers",
    "the-sweet-miracle",
  ];
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(sleep);
  const empty: string[] = [];
  for (const id of sleep.workIds) {
    if (!shelfWork(id) || !ritualCardPitch(id).trim()) empty.push(id);
  }
  assert.deepEqual(empty, []);
  for (const id of gone) {
    assert.equal(sleep.workIds.includes(id), false, id);
    assert.ok(shelfWork(id), id);
    assert.equal(ritualPitchFor(id), undefined, id);
  }
  assert.ok(sleep.workIds.includes("unhuman-tour-kusamakura"));
  assert.ok(ritualPitchFor("unhuman-tour-kusamakura")?.includes("painter climbing"));
});

test("a mid-book tale keeps its own minutes instead of the shared preset", () => {
  const fjeld = card("tales-from-the-fjeld");
  assert.equal(estimateRitualMinutes(fjeld), 8);
  assert.equal(nearestSitPreset(8), 12);
  assert.equal(ritualCardSit(fjeld), 8);
  assert.equal(ritualDurationLabel(fjeld), "~8 min");
  assert.deepEqual(ritualCardSearch(fjeld), { sit: 8, at: 1658 });
});

import assert from "node:assert/strict";
import test from "node:test";
import { isLocalBound } from "./full-pdf.ts";
import { SHELF } from "./shelf.ts";
import {
  FIRST_SESSION_RITUAL_IDS,
  FOR_YOU_LANE_ID,
  RITUAL_LANES,
  defaultRitualLaneId,
  ritualLaneStack,
} from "./rituals.ts";
import { SERIALIZE_LANE_ID } from "./serialize.ts";

function lane(id: string) {
  const found = RITUAL_LANES.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

test("default Rituals lane is For you, never Serialize", () => {
  assert.equal(defaultRitualLaneId(), FOR_YOU_LANE_ID);
  assert.notEqual(defaultRitualLaneId(), SERIALIZE_LANE_ID);
  assert.equal(RITUAL_LANES[0]?.id, FOR_YOU_LANE_ID);
  assert.equal(defaultRitualLaneId([{ id: SERIALIZE_LANE_ID }, { id: "unwind" }]), "unwind");
  assert.equal(defaultRitualLaneId([{ id: SERIALIZE_LANE_ID }]), SERIALIZE_LANE_ID);
});

test("first-session For you stack is Mirth → Quicksand → Botchan", () => {
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  const forYou = lane(FOR_YOU_LANE_ID);
  assert.deepEqual(forYou.workIds, [
    ...FIRST_SESSION_RITUAL_IDS,
    "cane",
    "the-awakening",
    "there-is-confusion",
    "miss-lulu-bett",
  ]);
  assert.equal(forYou.workIds[0], "the-house-of-mirth");
  assert.equal(forYou.workIds[1], "quicksand");
  assert.equal(forYou.workIds[2], "botchan");
  for (const id of [
    "ecstasy",
    "an-outcast-of-the-islands",
    "the-underdogs",
    "diary-of-a-chambermaid",
    "the-painted-veil",
    "the-good-soldier",
    "growth-of-the-soil",
    "nada-the-lily",
    "all-quiet-on-the-western-front",
    "we",
    "the-story-of-gosta-berling",
    "thais",
    "demian",
    "death-comes-for-the-archbishop",
    "the-getting-of-wisdom",
    "bliss",
    "a-hundred-and-seventy-chinese-poems",
    "dubliners",
    "gitanjali",
    "martin-bircks-youth",
    "harmonium",
    "steppenwolf",
    "a-hero-of-our-time",
    "strange-tales",
    "short-stories-from-the-balkans",
    "a-few-figs-from-thistles",
    "tropic",
    "buddenbrooks",
    "color",
  ]) {
    assert.equal(forYou.workIds.includes(id), false, id);
  }
  for (const id of FIRST_SESSION_RITUAL_IDS) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(isLocalBound(id), true, id);
  }
  assert.deepEqual(
    ritualLaneStack(forYou, 0).slice(0, 3).map((item) => item.id),
    ["the-house-of-mirth", "quicksand", "botchan"],
  );
  assert.deepEqual(
    ritualLaneStack(forYou, 99).slice(0, 3).map((item) => item.id),
    ["the-house-of-mirth", "quicksand", "botchan"],
  );
});

test("pin keeps first-session ids at the front of any lane that has them", () => {
  const unwind = ritualLaneStack(lane("unwind"), 13);
  assert.deepEqual(
    unwind.slice(0, 2).map((item) => item.id),
    ["the-house-of-mirth", "botchan"],
  );
  assert.equal(unwind.some((item) => item.id === "quicksand"), false);

  const beforeSleep = ritualLaneStack(lane("before-sleep"), 13);
  assert.equal(beforeSleep[0]?.id, "quicksand");
  assert.ok(beforeSleep.some((item) => item.id === "vera"));

  const waking = ritualLaneStack(lane("waking-up"), 13);
  assert.equal(
    waking.some((item) =>
      (FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(item.id),
    ),
    false,
  );
});

test("Unwind lists Botchan after Mirth, Maggot, and Bridge; Naomi stays off Rituals", () => {
  const unwind = lane("unwind");
  assert.deepEqual(unwind.workIds.slice(0, 4), [
    "the-house-of-mirth",
    "mr-fortunes-maggot",
    "the-bridge-of-san-luis-rey",
    "botchan",
  ]);
  assert.equal(unwind.workIds.includes("naomi"), false);
  for (const ritual of RITUAL_LANES) {
    assert.equal(ritual.workIds.includes("naomi"), false, ritual.id);
  }
  assert.equal(lane("waking-up").workIds.includes("enchanted-april"), true);
  assert.equal(lane(FOR_YOU_LANE_ID).workIds.includes("enchanted-april"), false);
  assert.equal(isLocalBound("botchan"), true);
  assert.equal(isLocalBound("naomi"), true);
  assert.equal(isLocalBound("enchanted-april"), true);
});

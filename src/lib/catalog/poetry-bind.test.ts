import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { SHELF } from "./shelf.ts";
import {
  FIRST_SCENE_TITLE,
  TIMED_SIT_TITLE,
  fixPoetryOcr,
  poemTitleBleed,
} from "./poetry-bind.ts";
import type { Work } from "../literature.ts";

function lookbackBreaths(work: Work, index: number, limit = 12) {
  const current = work.breaths[index];
  if (!current) return [];
  const start = Math.max(0, index - limit);
  return work.breaths.slice(start, index).filter((breath) => breath.sceneId === current.sceneId);
}

const LOCAL_POEM_IDS = SHELF.filter((item) => item.form === "poem" && item.local).map(
  (item) => item.id,
);

function load(kind: "texts" | "openings", id: string): Work | null {
  const url = new URL(`./${kind}/${id}.json`, import.meta.url);
  if (!existsSync(url)) return null;
  return JSON.parse(readFileSync(url, "utf8")) as Work;
}

test("OCR repairs T-for-I without touching dialect 'T was", () => {
  assert.equal(fixPoetryOcr("T have inscribed your name."), "I have inscribed your name.");
  assert.equal(fixPoetryOcr("“T have a fear,” he used to say,"), "“I have a fear,” he used to say,");
  assert.equal(fixPoetryOcr("It is written: “l have a friend,"), "It is written: “I have a friend,");
  assert.equal(fixPoetryOcr("'T was in the radiant summer weather,"), "'T was in the radiant summer weather,");
});

test("every local poem text exists and was audited", () => {
  const missing = LOCAL_POEM_IDS.filter((id) => !load("texts", id));
  assert.deepEqual(missing, [], `missing local poem texts: ${missing.join(", ")}`);
  assert.ok(LOCAL_POEM_IDS.length >= 50, `expected a full poetry shelf, got ${LOCAL_POEM_IDS.length}`);
});

test("local poem binds have no timed-sit scene chops", () => {
  const chops: string[] = [];
  for (const id of LOCAL_POEM_IDS) {
    const work = load("texts", id);
    if (!work) continue;
    const hits = work.scenes.filter((scene) => TIMED_SIT_TITLE.test(scene.title)).map((s) => s.title);
    if (hits.length) chops.push(`${id}: ${hits.slice(0, 3).join(", ")}`);
  }
  assert.deepEqual(chops, [], `timed-sit leftovers:\n${chops.join("\n")}`);
});

test("A Hundred and Seventy Chinese Poems is one poem per scene", () => {
  const full = load("texts", "a-hundred-and-seventy-chinese-poems");
  const packed = load("openings", "a-hundred-and-seventy-chinese-poems");
  assert.ok(full && packed);
  assert.equal(full!.scenes[0]?.title, "Winter Night");
  assert.match(full!.scenes[0]?.reentry ?? "", /^My bed is so empty/);
  assert.ok(full!.scenes.length >= 70, `too few poems: ${full!.scenes.length}`);
  const winter = full!.breaths.filter((b) => b.sceneId === full!.scenes[0]!.id);
  assert.equal(
    winter.some((b) => /Rejected Wife|People Hide Their Love|The Ferry/i.test(b.text)),
    false,
    "next poem leaked into Winter Night",
  );
  assert.deepEqual(
    packed!.scenes.map((s) => s.title),
    ["Winter Night", "On the Birth of His Son", "The Red Cockatoo"],
  );
  assert.match(packed!.breaths.at(-1)?.text ?? "", /shut it up inside\.?$/);
  assert.equal(poemTitleBleed(full!).length, 0);
});

test("Gitanjali is numbered poem-per-scene and skips Yeats", () => {
  const full = load("texts", "gitanjali");
  const packed = load("openings", "gitanjali");
  assert.ok(full && packed);
  assert.equal(full!.scenes[0]?.title, FIRST_SCENE_TITLE.gitanjali);
  assert.match(full!.scenes[0]?.reentry ?? "", /^Thou hast made me endless/);
  assert.equal(full!.scenes[1]?.title, "2");
  const first = full!.breaths.filter((b) => b.sceneId === full!.scenes[0]!.id);
  assert.equal(
    first.some((b) => /^2\.$/.test(b.text) || /When thou commandest me to sing/.test(b.text)),
    false,
    "poem 2 leaked into poem 1",
  );
  assert.match(full!.scenes[1]?.reentry ?? "", /^When thou commandest me to sing/);
  assert.ok(full!.scenes.length >= 70, `too few offerings: ${full!.scenes.length}`);
  assert.equal(packed!.scenes[0]?.title, "The little flute");
  assert.equal(packed!.scenes[1]?.title, "2");
  assert.match(packed!.breaths.at(-1)?.text ?? "", /friend who art my lord\.?$/);
  assert.doesNotMatch(full!.breaths.slice(0, 20).map((b) => b.text).join(" "), /Yeats|INTRODUCTION/i);
});

test("called-out local poem collections are poem-per-scene", () => {
  const ids = [
    "sonnets-from-the-portuguese",
    "the-weary-blues",
    "the-house-of-life",
    "sappho-one-hundred-lyrics",
  ];
  for (const id of ids) {
    const work = load("texts", id);
    assert.ok(work, id);
    assert.equal(
      work!.scenes.some((s) => TIMED_SIT_TITLE.test(s.title)),
      false,
      id,
    );
    assert.ok(work!.scenes.length >= 10, `${id} scenes ${work!.scenes.length}`);
  }
});

test("lookback stays inside the current poem/chapter scene", () => {
  const work = load("texts", "gitanjali");
  assert.ok(work);
  const startOfTwo = work!.breaths.findIndex((b) => b.sceneId === work!.scenes[1]?.id);
  assert.ok(startOfTwo > 0);
  const prior = lookbackBreaths(work!, startOfTwo, 12);
  assert.equal(prior.length, 0);
  const later = lookbackBreaths(work!, startOfTwo + 2, 12);
  assert.ok(later.every((b) => b.sceneId === work!.scenes[1]?.id));
  assert.equal(
    later.some((b) => b.sceneId === work!.scenes[0]?.id),
    false,
  );
});

test("inscribed OCR is fixed in Pictures of the Floating World", () => {
  const work = load("texts", "pictures-of-the-floating-world");
  assert.ok(work);
  const joined = work!.breaths.map((b) => b.text).join("\n");
  assert.match(joined, /I have inscribed your name/);
  assert.doesNotMatch(joined, /T have inscribed/);
});

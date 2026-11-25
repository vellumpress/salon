import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { cutsForWork, stopsForWork } from "./catalog/merge-stop-index.ts";
import { UPCOMING_WINDOW, lookbackBreaths, upcomingBreaths } from "./center-line.ts";
import { phoneBlockLimit, phoneLineMeasure, PHONE_LINE_PX } from "./display-blocks.ts";
import type { Work } from "./literature.ts";
import { chapterPlace, signpostTitle } from "./spine-nav.ts";
import { spotlightNear, stepSpotlight, type GroupsAt } from "./spotlight.ts";
const texts = new URL("./catalog/texts/", import.meta.url);

function load(id: string): Work {
  return JSON.parse(readFileSync(new URL(`${id}.json`, texts), "utf8")) as Work;
}

test("a signpost uses the printed title, and the bar keeps its place line", () => {
  const bridge = load("the-bridge-of-san-luis-rey");
  const partTwo = bridge.scenes[1];
  assert.equal(signpostTitle(partTwo), "Part Two: The Marquesa de Montemayor");
  assert.equal(chapterPlace(bridge.id, partTwo), "PART TWO: THE MARQUESA DE MONTEMAYOR");
  assert.equal(signpostTitle(undefined), "· · ·");
  assert.equal(signpostTitle({ title: "", place: "Poem 2" }), "Poem 2");
});

test("every chapter and poem boundary still has a next breath and a way back", () => {
  const names = readdirSync(texts).filter((name) => name.endsWith(".json"));
  const wanted = [
    "the-bridge-of-san-luis-rey",
    "gitanjali",
    "the-weary-blues",
    "sonnets-from-the-portuguese",
    "the-house-of-mirth",
  ];
  const seen = new Set<string>();
  let boundaries = 0;
  const problems: string[] = [];
  for (const name of names) {
    const work = JSON.parse(readFileSync(new URL(name, texts), "utf8")) as Work;
    if (!work?.breaths?.length || work.breaths.length < 2) continue;
    let crossed = false;
    for (let i = 1; i < work.breaths.length; i += 1) {
      const prev = work.breaths[i - 1];
      const next = work.breaths[i];
      if (!prev || !next || prev.sceneId === next.sceneId) continue;
      crossed = true;
      boundaries += 1;
      const ahead = upcomingBreaths(work, i - 1, 1);
      if (ahead[0]?.id !== next.id) problems.push(`${work.id} upcoming at ${i - 1}`);
      const behind = lookbackBreaths(work, i, 1);
      if (behind[0]?.id !== prev.id) problems.push(`${work.id} lookback at ${i}`);
      if (problems.length > 12) break;
    }
    if (crossed) seen.add(work.id);
    if (problems.length > 12) break;
    const last = work.breaths.length - 1;
    if (upcomingBreaths(work, last, 3).length !== 0) problems.push(`${work.id} continues past the book`);
  }
  assert.deepEqual(problems, []);
  assert.ok(boundaries > 500, `only ${boundaries} boundaries`);
  for (const id of wanted) assert.equal(seen.has(id), true, `${id} had no chapter boundary`);
  const bridge = load("the-bridge-of-san-luis-rey");
  const partTwo = bridge.breaths.findIndex((breath) => breath.sceneId === "s1");
  assert.equal(partTwo, 63);
  assert.match(bridge.breaths[62]?.text ?? "", /finger of God/);
  assert.match(upcomingBreaths(bridge, 62)[0]?.text ?? "", /Spanish schoolboy/);
  assert.ok(upcomingBreaths(bridge, 62).length <= UPCOMING_WINDOW);
  assert.equal(lookbackBreaths(bridge, 63).at(-1)?.sceneId, "s0");
});

test("a tap from the last sentence of a part, poem, or book chapter lands in the next one", () => {
  const measure = phoneLineMeasure;
  const limit = phoneBlockLimit();
  const books = [
    { id: "the-bridge-of-san-luis-rey", at: 62 },
    { id: "gitanjali", at: 7 },
    { id: "the-house-of-mirth", at: 305 },
    { id: "sonnets-from-the-portuguese", at: 1 },
  ];
  for (const book of books) {
    const work = load(book.id);
    const stops = stopsForWork(work.id);
    const cuts = cutsForWork(work.id);
    const scenes = new Map<string, { index: number; text: string }[]>();
    for (let index = 0; index < work.breaths.length; index += 1) {
      const breath = work.breaths[index];
      if (!breath) continue;
      const list = scenes.get(breath.sceneId) ?? [];
      list.push({ index, text: breath.text });
      scenes.set(breath.sceneId, list);
    }
    const groupsAt: GroupsAt = (index, query) => {
      const sceneId = work.breaths[index]?.sceneId;
      const scene = (sceneId && scenes.get(sceneId)) || [];
      return spotlightNear(
        scene,
        { index, cursor: query?.cursor ?? 0, window: query?.window ?? 0 },
        measure,
        limit,
        PHONE_LINE_PX,
        "prose",
        stops,
        cuts,
        query?.edge ?? "around",
        query?.after ?? 1,
      );
    };
    let place: { index: number; cursor: number; window: number } = {
      index: book.at,
      cursor: 0,
      window: 0,
    };
    const from = work.breaths[place.index]?.sceneId;
    let landed = from;
    for (let step = 0; step < 16; step += 1) {
      const moved = stepSpotlight({
        place,
        delta: 1,
        groupsAt,
        breathCount: work.breaths.length,
      });
      assert.notEqual(moved, "end", `${book.id} ended inside the chapter`);
      assert.notEqual(moved, "start", book.id);
      if (moved === "end" || moved === "start") break;
      place = moved;
      landed = work.breaths[place.index]?.sceneId;
      if (landed && landed !== from) break;
    }
    assert.notEqual(landed, from, `${book.id} tap never left the chapter`);
    const back = stepSpotlight({
      place,
      delta: -1,
      groupsAt,
      breathCount: work.breaths.length,
    });
    assert.notEqual(back, "start", book.id);
    assert.notEqual(back, "end", book.id);
    if (back === "start" || back === "end") continue;
    assert.equal(work.breaths[back.index]?.sceneId, from, `${book.id} back tap stayed in the new chapter`);
  }
});

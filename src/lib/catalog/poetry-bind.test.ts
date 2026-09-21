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
  assert.equal(full!.scenes[0]?.title, FIRST_SCENE_TITLE["a-hundred-and-seventy-chinese-poems"]);
  assert.equal(full!.scenes[0]?.title, "Battle");
  assert.match(full!.scenes[0]?.reentry ?? "", /Falling into Trouble|We grasp our battle-spears/);
  assert.equal(full!.scenes.length, 139);
  assert.equal(
    full!.scenes.some((scene) => /^(Chapter|Part|Introduction|Two Poems|Title)\b/i.test(scene.title)),
    false,
  );
  const winter = full!.scenes.find((scene) => scene.title === "Winter Night");
  assert.ok(winter);
  const winterBreaths = full!.breaths.filter((b) => b.sceneId === winter!.id);
  assert.equal(winterBreaths.length, 4);
  assert.equal(
    winterBreaths.some((b) => /Rejected Wife|People Hide Their Love|The Ferry/i.test(b.text)),
    false,
    "next poem leaked into Winter Night",
  );
  assert.deepEqual(packed!.scenes.map((s) => s.title), ["Winter Night"]);
  assert.match(packed!.scenes[0]?.reentry ?? "", /^My bed is so empty/);
  assert.match(packed!.breaths.at(-1)?.text ?? "", /carry me back to you!$/);
  assert.doesNotMatch(packed!.breaths.map((b) => b.text).join(" "), /\bBattle\b/);
  for (const scene of full!.scenes) {
    const lines = full!.breaths.filter((b) => b.sceneId === scene.id).map((b) => b.text);
    const last = lines.at(-1) ?? "";
    assert.equal(
      /^(Chapter|Part)\s+[IVXLCDM\d]+$|^Introduction$|^Two Poems$/i.test(last.trim()),
      false,
      `${scene.title} ends on a section header: ${last}`,
    );
  }
  const winterBleed = poemTitleBleed({
    scenes: [winter!],
    breaths: winterBreaths,
  });
  assert.equal(winterBleed.length, 0, "Winter Night should not swallow the next title");
});

test("Gitanjali is numbered poem-per-scene and skips Yeats", () => {
  const full = load("texts", "gitanjali");
  const packed = load("openings", "gitanjali");
  assert.ok(full && packed);
  assert.equal(full!.scenes[0]?.title, FIRST_SCENE_TITLE.gitanjali);
  assert.equal(full!.scenes[0]?.title, "Poem 1");
  assert.match(full!.scenes[0]?.reentry ?? "", /^Thou hast made me endless/);
  assert.equal(full!.scenes[1]?.title, "Poem 2");
  assert.equal(full!.scenes.length, 103);
  assert.equal(full!.scenes[102]?.title, "Poem 103");
  for (let n = 79; n <= 103; n++) {
    assert.ok(
      full!.scenes.some((scene) => scene.title === `Poem ${n}`),
      `poems 79–103 must stay split: missing Poem ${n}`,
    );
  }
  const first = full!.breaths.filter((b) => b.sceneId === full!.scenes[0]!.id);
  assert.equal(
    first.some((b) => /^2\.$/.test(b.text) || /When thou commandest me to sing/.test(b.text)),
    false,
    "poem 2 leaked into poem 1",
  );
  assert.match(full!.scenes[1]?.reentry ?? "", /^When thou commandest me to sing/);
  assert.equal(packed!.scenes[0]?.title, "Poem 1");
  assert.equal(packed!.scenes[1]?.title, "Poem 2");
  assert.match(packed!.breaths.slice(-3).map((b) => b.text).join(" "), /friend who art my lord/);
  assert.doesNotMatch(full!.breaths.map((b) => b.text).join(" "), /Yeats|INTRODUCTION|PROJECT GUTENBERG/i);
});

test("The Weary Blues opens on Proem, not Van Vechten", () => {
  const full = load("texts", "the-weary-blues");
  const packed = load("openings", "the-weary-blues");
  assert.ok(full && packed);
  assert.equal(full!.scenes[0]?.title, FIRST_SCENE_TITLE["the-weary-blues"]);
  assert.equal(full!.scenes[0]?.title, "Proem");
  assert.match(full!.scenes[0]?.reentry ?? "", /^I am a Negro:/);
  assert.equal(full!.scenes[1]?.title, "The Weary Blues");
  assert.equal(full!.scenes.length, 64);
  assert.deepEqual(
    packed!.scenes.map((s) => s.title),
    ["Proem", "The Weary Blues", "Jazzonia"],
  );
  assert.doesNotMatch(full!.breaths.map((b) => b.text).join(" "), /Van Vechten/i);
  assert.equal(
    full!.scenes.some((scene) => /^(Chapter|Part|Introduction|Two Poems|Title)\b/i.test(scene.title)),
    false,
  );
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

test("Mira batch-2 poem-chapter binds stay one poem per scene", () => {
  const expect: Record<string, { minScenes: number; first: string; long?: string }> = {
    "pictures-of-the-floating-world": { minScenes: 140, first: "Streets" },
    silhouettes: { minScenes: 70, first: "After Sunset" },
    "the-wild-swans-at-coole": { minScenes: 30, first: "The Wild Swans at Coole", long: "Ego Dominus Tuus" },
    "copper-sun": { minScenes: 20, first: "Colors" },
    color: { minScenes: 70, first: "Yet Do I Marvel" },
    "renascence-and-other-poems": { minScenes: 20, first: "Renascence", long: "Renascence" },
    "chicago-poems": { minScenes: 140, first: "Chicago" },
    "goblin-market-and-other-poems": { minScenes: 120, first: "Goblin Market", long: "Goblin Market" },
    "the-black-christ-and-other-poems": { minScenes: 40, first: "To the Three for Whom the Book", long: "The Black Christ" },
    "sword-blades-and-poppy-seed": { minScenes: 50, first: "The Captured Goddess", long: "The Great Adventure of Max Breuck" },
  };
  for (const [id, want] of Object.entries(expect)) {
    const full = load("texts", id);
    assert.ok(full, id);
    assert.ok(full!.scenes.length >= want.minScenes, `${id} scenes ${full!.scenes.length}`);
    assert.equal(full!.scenes[0]?.title, want.first, id);
    assert.equal(
      full!.scenes.some((scene) => /^(Chapter|Part|Introduction|Two Poems|Title)\b/i.test(scene.title)),
      false,
      id,
    );
    if (want.long) {
      const long = full!.scenes.filter((scene) => scene.title === want.long);
      assert.equal(long.length, 1, `${id} ${want.long} must stay one chapter`);
    }
    assert.doesNotMatch(
      full!.scenes.map((scene) => scene.title).join("\n"),
      /Henry Holt|Salgsoereee|^Mit$|^Bee$/m,
      id,
    );
  }
  const floating = load("openings", "pictures-of-the-floating-world");
  assert.deepEqual(floating?.scenes.map((s) => s.title), ["Streets", "Circumstance", "Angles"]);
  const wearyOpen = load("openings", "the-black-christ-and-other-poems");
  assert.equal(wearyOpen?.scenes[0]?.title, "That Bright Chimeric Beast");
  const sil = load("texts", "silhouettes");
  const joined = sil!.breaths.map((b) => b.text).join("\n");
  assert.doesNotMatch(joined, /\bTHE sea\b/);
  assert.doesNotMatch(joined, /\bAFTER SUNSET\b/);
});

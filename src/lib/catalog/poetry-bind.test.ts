import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { SHELF } from "./shelf.ts";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import {
  FIRST_SCENE_TITLE,
  POETRY_REBIND_IDS,
  TIMED_SIT_TITLE,
  fixPoetryOcr,
  poemTitleBleed,
} from "./poetry-bind.ts";
import type { Work } from "../literature.ts";
import { openingBreathIndex } from "../opening-scene.ts";

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
  assert.ok(full);
  assert.equal(packed, null);
  assert.equal(full!.scenes[0]?.title, FIRST_SCENE_TITLE["a-hundred-and-seventy-chinese-poems"]);
  assert.equal(full!.scenes[0]?.title, "Winter Night");
  assert.notEqual(full!.scenes[0]?.title, "Battle");
  assert.match(full!.scenes[0]?.reentry ?? "", /^My bed is so empty/);
  const battle = full!.scenes.find((scene) => scene.title === "Battle");
  assert.ok(battle);
  assert.match(battle!.reentry ?? "", /Ch’ü Yüan|Falling into Trouble|We grasp our battle-spears/);
  assert.equal(full!.scenes.length, 140);
  assert.equal(full!.breaths.length, 3196);
  assert.equal(
    full!.scenes.some((scene) => /^(Chapter|Part|Introduction|Two Poems)\b/i.test(scene.title)),
    false,
  );
  const winter = full!.scenes.find((scene) => scene.title === "Winter Night");
  assert.ok(winter);
  assert.equal(winter, full!.scenes[0]);
  const winterBreaths = full!.breaths.filter((b) => b.sceneId === winter!.id);
  assert.equal(winterBreaths.length, 4);
  assert.equal(
    winterBreaths.some((b) => /Rejected Wife|People Hide Their Love|The Ferry/i.test(b.text)),
    false,
    "next poem leaked into Winter Night",
  );
  assert.match(winterBreaths[0]?.text ?? "", /^My bed is so empty/);
  assert.match(winterBreaths.at(-1)?.text ?? "", /carry me back to you!$/);
  assert.doesNotMatch(winterBreaths.map((b) => b.text).join(" "), /\bBattle\b/);
  for (const scene of full!.scenes) {
    const lines: string[] = full!.breaths
      .filter((b) => b.sceneId === scene.id)
      .map((b) => b.text);
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

test("Harmonium is poem-per-scene and opens on The Snow Man", () => {
  const full = load("texts", "harmonium");
  const packed = load("openings", "harmonium");
  assert.ok(full && packed);
  assert.equal(full!.scenes[0]?.title, FIRST_SCENE_TITLE.harmonium);
  assert.equal(full!.scenes[0]?.title, "The Snow Man");
  assert.match(full!.scenes[0]?.reentry ?? "", /^One must have a mind of winter/);
  assert.equal(full!.scenes[1]?.title, "Earthy Anecdote");
  assert.equal(full!.scenes.length, 120);
  assert.ok(full!.scenes.some((scene) => scene.title === "Earthy Anecdote"));
  const first = full!.breaths.filter((b) => b.sceneId === full!.scenes[0]!.id);
  assert.equal(
    first.some((b) => /bucks went clattering|In the Carolinas/i.test(b.text)),
    false,
    "next poem leaked into The Snow Man",
  );
  assert.equal(packed!.scenes.length, 1);
  assert.equal(packed!.scenes[0]?.title, "The Snow Man");
  assert.match(packed!.breaths[0]?.text ?? "", /^One must have a mind of winter/);
  assert.match(packed!.breaths.at(-1)?.text ?? "", /the nothing that is\.?$/);
  assert.doesNotMatch(packed!.breaths.map((b) => b.text).join(" "), /Earthy Anecdote|bucks went clattering/i);
  assert.equal(
    full!.scenes.some((scene) => /^(Chapter|Part|Introduction|Two Poems|Title|Contents)\b/i.test(scene.title)),
    false,
  );
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

test("Mira CLEAR precipitations and sour-grapes stay poem-per-scene", () => {
  const expect = {
    precipitations: {
      scenes: 116,
      breaths: 1357,
      first: "Midnight Worship:  Brooklyn Bridge",
      reentry: /^In the rain$/,
    },
    "sour-grapes": {
      scenes: 53,
      breaths: 1201,
      first: "The Late Singer",
      reentry: /^Here it is spring again$/,
    },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const full = load("texts", id);
    assert.ok(full, id);
    assert.equal(full!.scenes.length, want.scenes, `${id} scenes`);
    assert.equal(full!.breaths.length, want.breaths, `${id} breaths`);
    assert.equal(full!.scenes[0]?.title, want.first, id);
    assert.match(full!.scenes[0]?.reentry ?? "", want.reentry, id);
    assert.equal(
      full!.scenes.some((scene) => /^(Chapter|Part|Introduction|Two Poems|Title)\b/i.test(scene.title)),
      false,
      id,
    );
    assert.equal(load("openings", id), null, `${id} stub opening must be gone`);
    const work = SHELF.find((item) => item.id === id);
    assert.equal(work?.form, "poem", id);
    assert.equal(work?.opening, full!.scenes[0]?.reentry, `${id} shelf opening`);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, `${id} must stay off Featured`);
  }
  const midnight = load("texts", "precipitations")!;
  const first = midnight.breaths.filter((b) => b.sceneId === midnight.scenes[0]!.id);
  assert.equal(
    first.some((b) => /ASCENSION|AUTUMN DUSK IN CENTRAL PARK/i.test(b.text)),
    false,
    "next poem leaked into Midnight Worship",
  );
});

test("The Pier-Glass binds all 25 poems of the 1921 Secker edition, one breath each", () => {
  const titles = [
    "The Stake", "The Troll's Nosegay", "The Pier-glass", "The Finding of Love", "Reproach",
    "The Magical Picture", "Distant Smoke", "Morning Phoenix", "Catherine Drury", "Raising the Stone",
    "The Treasure Box", "The Kiss", "Lost Love", "Fox's Dingle", "The Gnat", "The Patchwork Bonnet",
    "Kit Logan and Lady Helen", "Down", "Saul of Tarsus", "Storm: at the Farm Window",
    "Black Horse Lane", "Return", "Incubus", "The Hills of May", "The Coronation Murder",
  ];
  const full = load("texts", "the-pier-glass")!;
  assert.deepEqual(full.scenes.map((scene) => scene.title), titles);
  assert.equal(full.breaths.length, titles.length);
  for (const scene of full.scenes) {
    const breaths = full.breaths.filter((breath) => breath.sceneId === scene.id);
    assert.equal(breaths.length, 1, scene.title);
    assert.equal(scene.reentry, breaths[0]!.text, scene.title);
    for (const line of breaths[0]!.text.split(" / ")) {
      assert.equal((line.match(/\*/g) ?? []).length % 2, 0, `${scene.title}: ${line}`);
    }
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.doesNotMatch(joined, /POETRY BY THE SAME AUTHOR|Martin Secker|Gutenberg|_[A-Za-z]|--/);
  assert.match(full.breaths[0]!.text, /^Naseboro' held him guilty, \/ Crowther took his part, \//);
  assert.match(full.breaths.at(-1)!.text, /Thus, he stabs 'em; there, they lie\.$/);
  const shelf = SHELF.find((item) => item.id === "the-pier-glass");
  assert.equal(shelf?.breaths, titles.length);
  assert.ok(full.breaths[0]!.text.startsWith(shelf!.opening!), "shelf opening is the first stanza as printed");
});

test("Mira poetry re-bind pack: one scene per printed poem, counts and card from the bind", () => {
  assert.equal(POETRY_REBIND_IDS.length, 36);
  for (const id of POETRY_REBIND_IDS) {
    const full = load("texts", id);
    assert.ok(full, id);
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    const sceneIds = new Set(full!.scenes.map((scene) => scene.id));
    assert.equal(sceneIds.size, full!.scenes.length, `${id} scene ids unique`);
    for (const scene of full!.scenes) {
      assert.doesNotMatch(scene.title, /,\s*$/, `${id}#${scene.id} verse line as title`);
      assert.doesNotMatch(scene.title, TIMED_SIT_TITLE, `${id}#${scene.id} timed-sit title`);
      assert.ok(full!.breaths.some((breath) => breath.sceneId === scene.id), `${id}#${scene.id} empty scene`);
    }
    for (const breath of full!.breaths) {
      assert.ok(sceneIds.has(breath.sceneId), `${id}#${breath.id} orphan breath`);
      assert.ok(breath.text.trim().length > 0, `${id}#${breath.id} empty breath`);
    }
    const words = full!.breaths
      .flatMap((breath) => breath.text.split(/\s+/))
      .filter((word) => word && word !== "/").length;
    assert.equal(work!.breaths, full!.breaths.length, `${id} shelf breaths`);
    assert.equal(work!.minutes, Math.round(words / 200), `${id} shelf minutes = words/200`);
    assert.equal(full!.minutes, work!.minutes, `${id} text minutes`);
    const opening = work!.opening ?? "\u0000";
    const at = full!.breaths.findIndex((breath) => breath.text.startsWith(opening));
    const start = openingBreathIndex(full!);
    assert.ok(at >= start && at <= start + 2, `${id} card is the first real lines (at ${at}, start ${start})`);
  }
});

test("Motley and Poems of Passion no longer open mid-verse", () => {
  const motley = load("texts", "motley-and-other-poems")!;
  const card = SHELF.find((item) => item.id === "motley-and-other-poems")!.opening ?? "";
  assert.ok(card.startsWith("When I go free, / I think 'twill be / A night of stars and snow,"), card);
  assert.equal(motley.scenes.some((scene) => scene.title.startsWith("I think 'twill be")), false);
  const passion = load("texts", "poems-of-passion")!;
  assert.equal(passion.scenes.filter((scene) => /,\s*$/.test(scene.title)).length, 0);
  assert.ok(passion.scenes.length >= 80, `poems-of-passion scenes ${passion.scenes.length}`);
});

/** Phone cap for one breath in the re-bind pack: about 40 verse lines or 350 words. */
const REBIND_BREATH_MAX_LINES = 40;
const REBIND_BREATH_MAX_WORDS = 350;

/**
 * Over-cap breaths that are a single printed stanza, verse paragraph or prose
 * paragraph in the source (no blank-line break inside), so they stay whole
 * rather than being cut mid-stanza. `id#breathId` → why.
 */
const REBIND_LONG_STANZAS: Readonly<Record<string, string>> = {
  "the-ballad-of-the-white-horse#s0-1": "Prefatory Note: one prose paragraph, 395 words",
  "peacock-pie#s31-0": "The Lost Shoe: one poem printed without stanza breaks, 44 lines / 150 words",
  "peacock-pie#s34-0": "Off the Ground: one poem printed without stanza breaks, 114 lines / 416 words",
  "the-three-taverns#s7-3": "The Three Taverns: one printed verse paragraph, 98 lines / 835 words",
  "the-three-taverns#s7-5": "The Three Taverns: one printed verse paragraph, 46 lines / 367 words",
  "the-three-taverns#s7-7": "The Three Taverns: one printed verse paragraph, 65 lines / 557 words",
  "the-three-taverns#s13-1": "John Brown: one printed verse paragraph, 43 lines / 366 words",
  "the-three-taverns#s13-2": "John Brown: one printed verse paragraph, 76 lines / 656 words",
  "the-three-taverns#s17-3": "Tasker Norcross: one printed verse paragraph, 52 lines / 439 words",
  "the-three-taverns#s17-5": "Tasker Norcross: one printed verse paragraph, 70 lines / 596 words",
  "the-three-taverns#s25-1": "Rahel to Varnhagen: one printed verse paragraph, 60 lines / 524 words",
  "the-three-taverns#s25-3": "Rahel to Varnhagen: one printed verse paragraph, 65 lines / 572 words",
  "the-three-taverns#s25-4": "Rahel to Varnhagen: one printed verse paragraph, 108 lines / 917 words",
  "the-three-taverns#s31-1": "Lazarus: one printed verse paragraph, 47 lines / 403 words",
  "the-town-down-the-river#s2-6": "An Island: one printed verse paragraph, 50 lines / 327 words",
  "songs-and-satires#s3-6": "The Cocked Hat: one printed verse paragraph, 45 lines / 312 words",
  "songs-and-satires#s4-0": "The Vision: one printed verse paragraph, 69 lines / 522 words",
  "songs-and-satires#s7-2": "The Loop: one printed verse paragraph, 54 lines / 408 words",
  "songs-and-satires#s7-3": "The Loop: one printed verse paragraph, 85 lines / 668 words",
  "songs-and-satires#s30-1": "Jim and Arabel's Sister: one printed verse paragraph, 47 lines / 381 words",
  "songs-and-satires#s36-1": "The Conversation: one printed verse paragraph, 43 lines / 325 words",
  "songs-and-satires#s44-7": "In Michigan: one printed verse paragraph, 41 lines / 287 words",
  "rhymes-of-a-red-cross-man#s42-1": "Wounded: one printed verse paragraph, 58 lines / 489 words",
  "rhymes-of-a-red-cross-man#s51-0": "Afternoon Tea: one printed verse paragraph, 41 lines / 489 words",
  "rhymes-of-a-red-cross-man#s51-1": "Afternoon Tea: one printed verse paragraph, 49 lines / 624 words",
  "cathay#s9-2": "The Seafarer: one printed verse paragraph, 77 lines / 525 words",
  "kalevala#s1-19": "Preface: one prose paragraph, 382 words",
  "kalevala#s1-47": "Preface: one prose paragraph, 375 words",
  "idylls-of-the-king#s3-21": "The Marriage of Geraint: one printed verse paragraph with no sentence break that keeps both parts under the cap, 43 lines / 364 words",
  "idylls-of-the-king#s13-1": "To the Queen: one printed verse paragraph with no sentence break that keeps both parts under the cap, 41 lines / 323 words",
  "the-defence-of-guenevere-and-other-poems#s4-57": "Sir Peter Harpdon's End: one printed verse paragraph, 42 lines / 332 words",
  "the-defence-of-guenevere-and-other-poems#s4-59": "Sir Peter Harpdon's End: one printed verse paragraph, 63 lines / 470 words",
  "the-defence-of-guenevere-and-other-poems#s4-73": "Sir Peter Harpdon's End: one printed verse paragraph, 46 lines / 369 words",
  "atalanta-in-calydon#s3-0": "The Argument: one prose paragraph, 395 words",
  "atalanta-in-calydon#s4-72": "Atalanta in Calydon: one printed verse paragraph with no sentence break that keeps both parts under the cap, 42 lines / 345 words",
  "atalanta-in-calydon#s4-163": "Atalanta in Calydon: one printed verse paragraph with no sentence break that keeps both parts under the cap, 43 lines / 359 words",
  "heliodora-and-other-poems#s29-3": "Charioteer: one printed stanza, 41 lines / 150 words",
};

function breathSize(text: string) {
  const lines = text.split(" / ").length;
  const words = text.split(/\s+/).filter((word) => word && word !== "/").length;
  return { lines, words };
}

test("Mira poetry re-bind pack: no breath over the phone cap unless it is one printed stanza", () => {
  const over: string[] = [];
  const stillOver = new Set<string>();
  for (const id of POETRY_REBIND_IDS) {
    const full = load("texts", id)!;
    for (const breath of full.breaths) {
      const { lines, words } = breathSize(breath.text);
      if (lines <= REBIND_BREATH_MAX_LINES && words <= REBIND_BREATH_MAX_WORDS) continue;
      const key = `${id}#${breath.id}`;
      stillOver.add(key);
      if (!(key in REBIND_LONG_STANZAS)) over.push(`${key} ${lines} lines / ${words} words`);
    }
  }
  assert.deepEqual(over, []);
  for (const key of Object.keys(REBIND_LONG_STANZAS)) {
    assert.ok(stillOver.has(key), `${key} is no longer over the cap; drop it from REBIND_LONG_STANZAS`);
  }
});

test("Mira poetry re-bind pack 2: epics bind one scene per printed canto, rune or section", () => {
  const kalevala = load("texts", "kalevala")!;
  assert.equal(kalevala.scenes.length, 55);
  assert.deepEqual(
    kalevala.scenes.slice(2, 4).map((scene) => scene.title),
    ["Proem", "Rune I. Birth of Wainamoinen"],
  );
  assert.equal(kalevala.scenes.at(-2)?.title, "Epilogue");
  const donJuan = load("texts", "don-juan")!;
  assert.equal(donJuan.scenes.length, 18);
  assert.equal(donJuan.scenes[1]?.title, "Canto the First");
  assert.equal(donJuan.scenes.at(-1)?.title, "Canto the Seventeenth");
  const idylls = load("texts", "idylls-of-the-king")!;
  assert.equal(idylls.scenes.length, 14);
  assert.equal(idylls.scenes[1]?.title, "The Coming of Arthur");
  const domesday = load("texts", "domesday-book")!;
  assert.equal(domesday.scenes.length, 40);
  assert.equal(domesday.scenes.at(-1)?.title, "The Verdict");
});

test("Mira poetry re-bind pack 2: verse drama speaks as “Speaker: line”, Lamia fits the cap", () => {
  const atalanta = load("texts", "atalanta-in-calydon")!;
  const play = atalanta.scenes.find((scene) => scene.title === "Atalanta in Calydon")!;
  const lines = atalanta.breaths.filter((breath) => breath.sceneId === play.id).map((b) => b.text);
  assert.match(lines[0] ?? "", /^Chief Huntsman: Maiden, and mistress of the months and stars/);
  assert.ok(lines.some((text) => text.startsWith("Chorus: When the hounds of spring are on winter's traces")));
  const lamia = load("texts", "lamia")!;
  assert.deepEqual(lamia.scenes.map((scene) => scene.title), ["Part 1", "Part 2"]);
  for (const breath of lamia.breaths) {
    const { lines: n, words } = breathSize(breath.text);
    assert.ok(n <= REBIND_BREATH_MAX_LINES && words <= REBIND_BREATH_MAX_WORDS, `lamia#${breath.id}`);
  }
});

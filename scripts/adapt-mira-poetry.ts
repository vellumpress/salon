#!/usr/bin/env node
/**
 * Copy Mira's poem-chapter product JSON into Salon texts + ritual openings.
 * Usage:
 *   node --experimental-strip-types scripts/adapt-mira-poetry.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fixPoetryOcr, normalizeTitleKey } from "../src/lib/catalog/poetry-bind.ts";
import { breathsFor, type Breath, type Scene, type Work } from "../src/lib/literature.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uploadRoots = [
  "/home/ubuntu/.cursor/projects/workspace/uploads",
  join(root, "uploads"),
];

type MiraScene = Scene & { resume?: string };
type MiraWork = Omit<Work, "scenes"> & { scenes: MiraScene[] };

const FRONT_MATTER =
  /^(title|chapter\s+[ivxlcdm\d]+|introduction|preface|contents|two poems|part\s+[ivxlcdm\d]+)$/i;
const SECTION_HEADER =
  /^(?:chapter|part)\s+[ivxlcdm\d]+\.?$|^introduction$|^two poems$|^contents$|^preface$/i;
const NUMBER_ONLY = /^\d{1,3}\.$/;
const PG_FOOTER =
  /\*\*\*\s*END OF (THE )?PROJECT GUTENBERG|Updated editions will replace the previous|Italicized text is surrounded|An incorrect page number in the Table of Contents|Transcriber['’]s note/i;
const SMALL_DOUBLE = /\b(in|the|of|a|and|by|to|on|from|with|an|at)\s+\1\b/gi;

const NOTES: Record<string, string> = {
  gitanjali:
    "Phone-clear devotion lyric. Skip the Yeats introduction — open on Poem 1.\n\nGitanjali (Tagore; 1912 EN; PG 7164). This local bind is the song offerings, Poem 1 through Poem 103. Never the Yeats introduction.",
  "a-hundred-and-seventy-chinese-poems":
    "Waley’s 1918 Chinese lyrics. The book opens on Battle — the first poem. Rituals sit on Winter Night.\n\nA Hundred and Seventy Chinese Poems (tr. Waley; 1918; PG 42290). Default open is Battle. Rituals open at Winter Night.",
  "the-weary-blues":
    "Harlem poems, 1926. Opens on Proem — not the Van Vechten introduction.",
};

const OPENING_NOTES: Record<string, string> = {
  gitanjali:
    "Before-sleep ritual sit — Poem 1.\n\nPhone-clear devotion lyric. Skip the Yeats introduction — open on poem 1.\n\nGitanjali (Tagore; 1912 EN; PG 7164). Sit through the first two song offerings. Stop before the rest of the book.",
  "a-hundred-and-seventy-chinese-poems":
    "Before-sleep ritual sit — Winter Night.\n\nGentler China lyrics for a night sit. Open the Winter Night pack — not Battle.\n\nA Hundred and Seventy Chinese Poems (tr. Waley; 1918; PG 42290). Sit through Winter Night. Never Battle.",
  "the-weary-blues":
    "Bite-sized ritual sit — Proem · The Weary Blues · Jazzonia.\n\nHarlem, late night—a piano that won’t quit, and a young poet listening hard. Langston Hughes’s 1926 first book opens with Proem (“I am a Negro”), then the title poem and a short run of cabaret pieces. Blues and jazz aren’t decoration here; they’re the beat the lines move to.",
};

const OPENING_TITLES: Record<string, string[]> = {
  gitanjali: ["Poem 1", "Poem 2"],
  "a-hundred-and-seventy-chinese-poems": ["Winter Night"],
  "the-weary-blues": ["Proem", "The Weary Blues", "Jazzonia"],
  "pictures-of-the-floating-world": ["Streets", "Circumstance", "Angles"],
  "the-wild-swans-at-coole": ["The Wild Swans at Coole", "In Memory of Major Robert Gregory"],
  "copper-sun": ["Colors"],
  color: [
    "Yet Do I Marvel",
    "A Song of Praise",
    "Brown Boy to Brown Girl",
    "A Brown Girl Dead",
    "To a Brown Girl",
    "To a Brown Boy",
    "Black Magdalens",
  ],
  "chicago-poems": ["Chicago", "Sketch", "Masses", "Lost", "The Harbor"],
  "the-black-christ-and-other-poems": ["That Bright Chimeric Beast"],
  "sword-blades-and-poppy-seed": ["The Captured Goddess"],
};

const KEEP_EXISTING_OPENING = new Set(["silhouettes"]);

const PREFIX_OPENINGS: Record<string, { title: string; breaths: number }> = {
  "renascence-and-other-poems": { title: "Renascence", breaths: 95 },
  "goblin-market-and-other-poems": { title: "Goblin Market", breaths: 90 },
};

const SHELF_OPENING_FROM_PACKED = new Set([
  "the-weary-blues",
  "copper-sun",
  "sword-blades-and-poppy-seed",
  "pictures-of-the-floating-world",
  "goblin-market-and-other-poems",
]);

const PRIORITY = [
  {
    id: "gitanjali",
    files: ["gitanjali_170f.json", "gitanjali.json"],
  },
  {
    id: "a-hundred-and-seventy-chinese-poems",
    files: ["a-hundred-and-seventy-chinese-poems_c770.json", "a-hundred-and-seventy-chinese-poems.json"],
  },
  {
    id: "the-weary-blues",
    files: ["the-weary-blues_beac.json", "the-weary-blues.json"],
  },
];

const BATCH2 = [
  "pictures-of-the-floating-world",
  "silhouettes",
  "the-wild-swans-at-coole",
  "copper-sun",
  "color",
  "renascence-and-other-poems",
  "chicago-poems",
  "goblin-market-and-other-poems",
  "the-black-christ-and-other-poems",
  "sword-blades-and-poppy-seed",
];

export function undoubleTitle(title: string) {
  let next = title;
  for (let i = 0; i < 8; i++) {
    const fixed = next.replace(SMALL_DOUBLE, "$1");
    if (fixed === next) break;
    next = fixed;
  }
  return next;
}

function isFrontMatterTitle(title: string) {
  return FRONT_MATTER.test(title.trim());
}

function isNumberBreath(text: string) {
  return NUMBER_ONLY.test(text.trim());
}

function lettersOf(text: string) {
  return text.replace(/[^A-Za-z]/g, "");
}

function isTitleEcho(text: string, title: string) {
  const t = text.trim().replace(/\s+/g, " ");
  const letters = lettersOf(t);
  if (letters.length < 3) return false;
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (norm(t) === norm(title)) return true;
  const upper = letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.86;
  return upper && norm(t) === norm(title);
}

function isByLine(text: string) {
  return /^By\s+\S/i.test(text.trim());
}

export function reentryOf(title: string, lines: string[]) {
  const verse =
    lines.find((line) => {
      const t = line.trim();
      if (!t) return false;
      if (isNumberBreath(t)) return false;
      if (isTitleEcho(t, title)) return false;
      if (isByLine(t)) return false;
      if (/^\(Adapted from/i.test(t)) return false;
      if (/^\(To\s+/i.test(t) && t.length < 80) return false;
      if (/^\([^)]{0,40}\)$/.test(t)) return false;
      return true;
    }) ??
    lines[0] ??
    title;
  return verse;
}

function isAllCapsHeadingLine(text: string) {
  const t = text.trim();
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3 || letters.length > 64) return false;
  if (t.length > 90) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.86;
}

function unshoutCapsWords(text: string) {
  return text.replace(/\b([A-Z]{2,}[A-Z'’]*)\b/g, (word) => {
    if (/^(?:I{1,3}|IV|VI{0,3}|IX|X)$/.test(word)) return word;
    return word[0] + word.slice(1).toLowerCase();
  });
}

function isSludgeLine(text: string) {
  if (/^PICTURES\s+OF THE\s+FLOATING/i.test(text)) return true;
  if (/^\d+\s+PICTURES\s+OF THE/i.test(text)) return true;
  if (/Printed in the United States of America/i.test(text)) return true;
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (!letters.length) return true;
  if (letters.length < 3 && text.length > 6) return true;
  const ratio = letters.length / Math.max(text.length, 1);
  return ratio < 0.28 && text.length > 10;
}

function stripTrailingSludge(lines: string[]) {
  const next = [...lines];
  while (next.length && isSludgeLine(next[next.length - 1]!)) next.pop();
  return next;
}

function isJunkScene(title: string, lines: string[]) {
  const joined = lines.join(" ");
  if (/^(Salgsoereee|Mit)$/i.test(title)) return true;
  if (/^Bee$/i.test(title) && /bashthee|1c\s+i\s+at/i.test(joined)) return true;
  if (/^By Amy Lowell$/i.test(title) && /VOLUME of lyrical|Sword Blades/i.test(joined)) return true;
  if (/As Toward Immortality/i.test(title) && lines.filter((line) => /[A-Za-z]{4,}/.test(line)).length <= 1) {
    return true;
  }
  if (/Henry Holt and Company|Burton E\. Stevenson|" and Other POETS"/i.test(title)) return true;
  if (
    /^(The New Poetry|North of Boston|A Boy's Will|The Listeners)$/i.test(title) &&
    /\$\s*\d|net\.|printing/i.test(joined)
  ) {
    return true;
  }
  return false;
}

function stripGlue(lines: string[], title: string, otherTitles: Set<string>) {
  const cleaned = lines.filter((line) => line && !SECTION_HEADER.test(line));
  const own = normalizeTitleKey(title);
  while (cleaned.length) {
    const last = cleaned[cleaned.length - 1]!;
    const key = normalizeTitleKey(last);
    if (key && key !== own && otherTitles.has(key)) {
      cleaned.pop();
      continue;
    }
    if (isAllCapsHeadingLine(last) && key !== own) {
      cleaned.pop();
      continue;
    }
    break;
  }
  return cleaned;
}

export function adaptMiraWork(
  mira: MiraWork,
  salon: Work,
  note = NOTES[salon.id] ?? salon.note,
  opts: { stripSludge?: boolean } = {},
): Work {
  const scenes: Scene[] = [];
  const breaths: Breath[] = [];
  const prompt = salon.scenes[0]?.prompt || "A word from this stretch.";
  const kept = mira.scenes
    .map((scene) => ({ scene, title: undoubleTitle(scene.title) }))
    .filter(({ title }) => !isFrontMatterTitle(title));
  const otherTitles = new Set(kept.map(({ title }) => normalizeTitleKey(title)));

  for (const { scene, title } of kept) {
    let lines = mira.breaths
      .filter((breath) => breath.sceneId === scene.id)
      .map((breath) => fixPoetryOcr(breath.text.replace(/[ \t]+$/g, "").replace(/^[ \t]+/, "").trim()));
    const footerAt = lines.findIndex((line) => PG_FOOTER.test(line));
    if (footerAt >= 0) lines = lines.slice(0, footerAt);
    lines = lines.filter((line) => line && !isNumberBreath(line) && !/^(THE END|FINIS)$/i.test(line));
    lines = stripGlue(lines, title, otherTitles);
    if (opts.stripSludge) lines = stripTrailingSludge(lines);
    if (salon.id === "silhouettes") lines = lines.map(unshoutCapsWords);
    if (lines.length > 1 && lines[0] && isTitleEcho(lines[0], title)) lines = lines.slice(1);
    if (isJunkScene(title, lines)) continue;
    if (!lines.length) continue;
    const id = `s${scenes.length}`;
    scenes.push({
      id,
      title,
      place: title,
      reentry: reentryOf(title, lines),
      prompt,
    });
    breaths.push(...breathsFor(id, lines));
  }

  return {
    ...salon,
    note,
    scenes,
    breaths,
  };
}

function openingFromTitles(full: Work, salonOpening: Work, titles: string[]): Work {
  const wanted = titles
    .map((title) => full.scenes.find((scene) => scene.title === title))
    .filter((scene): scene is Scene => Boolean(scene));
  const scenes: Scene[] = [];
  const breaths: Breath[] = [];
  wanted.forEach((scene, index) => {
    const id = `s${index}`;
    const lines = full.breaths.filter((breath) => breath.sceneId === scene.id).map((breath) => breath.text);
    scenes.push({ ...scene, id, place: scene.title });
    breaths.push(...breathsFor(id, lines));
  });
  return {
    ...salonOpening,
    note: OPENING_NOTES[full.id] ?? salonOpening.note,
    scenes: scenes.length ? scenes : salonOpening.scenes,
    breaths: breaths.length ? breaths : salonOpening.breaths,
  };
}

function openingFromPrefix(full: Work, salonOpening: Work, spec: { title: string; breaths: number }): Work {
  const scene = full.scenes.find((item) => item.title === spec.title) ?? full.scenes[0];
  if (!scene) return salonOpening;
  const lines = full.breaths
    .filter((breath) => breath.sceneId === scene.id)
    .map((breath) => breath.text)
    .slice(0, spec.breaths);
  return {
    ...salonOpening,
    scenes: [{ ...scene, id: "s0", place: scene.title }],
    breaths: breathsFor("s0", lines),
  };
}

function findMiraFile(id: string, names: string[]) {
  for (const dir of uploadRoots) {
    if (!existsSync(dir)) continue;
    for (const name of names) {
      const path = join(dir, name);
      if (existsSync(path)) return path;
    }
    for (const file of readdirSync(dir)) {
      if (file.startsWith(id) && file.endsWith(".json")) return join(dir, file);
    }
  }
  return null;
}

function writeJson(path: string, work: Work) {
  writeFileSync(path, `${JSON.stringify(work, null, 2)}\n`);
}

function updateShelf(id: string, breaths: number, opening?: string) {
  const path = join(root, "src/lib/catalog/shelf.ts");
  const src = readFileSync(path, "utf8");
  const idAt = src.indexOf(`id: "${id}"`);
  if (idAt < 0) return false;
  const nextId = src.indexOf(`id: "`, idAt + 8);
  const sliceEnd = nextId < 0 ? src.length : nextId;
  let slice = src.slice(idAt, sliceEnd);
  slice = slice.replace(/breaths:\s*\d+/, `breaths: ${breaths}`);
  if (opening) {
    slice = slice.replace(/opening:\s*`[^`]*`/, `opening: ${JSON.stringify(opening)}`);
    slice = slice.replace(/opening:\s*"[^"]*"/, `opening: ${JSON.stringify(opening)}`);
  }
  writeFileSync(path, src.slice(0, idAt) + slice + src.slice(sliceEnd));
  return true;
}

function loadWork(path: string): Work {
  return JSON.parse(readFileSync(path, "utf8")) as Work;
}

const jobs = [...PRIORITY];
for (const id of BATCH2) {
  jobs.push({ id, files: [`${id}.json`] });
}

const shipped: string[] = [];
const missing: string[] = [];

for (const job of jobs) {
  const miraPath = findMiraFile(job.id, job.files);
  const salonPath = join(root, "src/lib/catalog/texts", `${job.id}.json`);
  const openPath = join(root, "src/lib/catalog/openings", `${job.id}.json`);
  if (!miraPath) {
    if (PRIORITY.some((item) => item.id === job.id)) {
      throw new Error(`missing Mira JSON for ${job.id}`);
    }
    missing.push(job.id);
    continue;
  }
  if (!existsSync(salonPath) || !existsSync(openPath)) {
    throw new Error(`missing Salon bind for ${job.id}`);
  }
  const mira = JSON.parse(readFileSync(miraPath, "utf8")) as MiraWork;
  const salon = loadWork(salonPath);
  const opening = loadWork(openPath);
  const full = adaptMiraWork(mira, salon, NOTES[job.id] ?? salon.note, {
    stripSludge: BATCH2.includes(job.id),
  });
  const prefix = PREFIX_OPENINGS[job.id];
  const packed = KEEP_EXISTING_OPENING.has(job.id)
    ? opening
    : prefix
      ? openingFromPrefix(full, opening, prefix)
      : openingFromTitles(full, opening, OPENING_TITLES[job.id] ?? [full.scenes[0]?.title ?? ""]);
  writeJson(salonPath, full);
  if (!KEEP_EXISTING_OPENING.has(job.id)) writeJson(openPath, packed);
  const shelfOpening = SHELF_OPENING_FROM_PACKED.has(job.id) ? packed.scenes[0]?.reentry : undefined;
  updateShelf(job.id, full.breaths.length, shelfOpening);
  shipped.push(
    `${job.id} scenes=${full.scenes.length} breaths=${full.breaths.length} first="${full.scenes[0]?.title}" opening=${packed.scenes.map((s) => s.title).join(" · ")}`,
  );
}

console.log(shipped.join("\n"));
if (missing.length) console.log(`\nbatch-2 missing Mira JSON: ${missing.join(", ")}`);

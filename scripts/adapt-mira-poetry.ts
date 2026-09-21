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
  /\*\*\*\s*END OF (THE )?PROJECT GUTENBERG|Updated editions will replace the previous/i;
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
};

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
  const upper = letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.86;
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

export function adaptMiraWork(mira: MiraWork, salon: Work, note = NOTES[salon.id] ?? salon.note): Work {
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
    scenes,
    breaths,
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
  const full = adaptMiraWork(mira, salon);
  const titles = OPENING_TITLES[job.id] ?? [full.scenes[0]?.title ?? ""];
  const packed = openingFromTitles(full, opening, titles);
  writeJson(salonPath, full);
  writeJson(openPath, packed);
  const shelfOpening =
    job.id === "the-weary-blues" ? packed.scenes[0]?.reentry : undefined;
  updateShelf(job.id, full.breaths.length, shelfOpening);
  shipped.push(
    `${job.id} scenes=${full.scenes.length} breaths=${full.breaths.length} first="${full.scenes[0]?.title}" opening=${packed.scenes.map((s) => s.title).join(" · ")}`,
  );
}

console.log(shipped.join("\n"));
if (missing.length) console.log(`\nbatch-2 missing Mira JSON: ${missing.join(", ")}`);

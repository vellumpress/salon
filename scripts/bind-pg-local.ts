#!/usr/bin/env node
/**
 * Bind cited Project Gutenberg texts into catalog JSON + shelf local:true.
 * Does not write openings/*.json (a stub opening can strand the reader).
 *
 * Skips Mira BATCH-1 CLEAR ids another agent is shipping, and holds
 * poems-by-emily-dickinson-series-one.
 *
 *   node --experimental-strip-types scripts/bind-pg-local.ts --only id1,id2
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { countryFor } from "../src/lib/catalog/countries.ts";
import { EN_OFF_READABLE_IDS } from "../src/lib/catalog/en-rights.ts";
import {
  displayPoemTitle,
  fixPoetryOcr,
  isSkipBreath,
  splitLinesIntoPoems,
  TIMED_SIT_TITLE,
} from "../src/lib/catalog/poetry-bind.ts";
import { betweenMarks, buildFromRaw } from "../src/lib/gutenberg.server.ts";
import { breathsFor, type Work } from "../src/lib/literature.ts";
import { splitSentences } from "../src/lib/sentences.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const textDir = join(root, "src/lib/catalog/texts");
const openDir = join(root, "src/lib/catalog/openings");
const shelfPath = join(root, "src/lib/catalog/shelf.ts");
const cacheDir = join(root, ".pg-cache");
const MAX_BREATHS = 28000;

/** Another agent owns these. Do not bind or rename them. */
const HELD_IDS = new Set([
  "the-three-impostors",
  "reginald",
  "last-poems-housman",
  "the-dynamiter",
  "candide",
  "trooper-peter-halket-of-mashonaland",
  "trooper-peter-halket",
  "the-toys-of-peace",
  "the-black-dog",
  "children-of-the-frost",
  "south-sea-tales",
  "fairies-and-fusiliers",
  "young-adventure",
  "the-tempers",
  "the-crescent-moon",
  "poems-by-emily-dickinson-series-one",
  "poems-dickinson-series-one",
]);

const HELD_PG = new Set([
  35517, 2678, 2830, 7848, 647, 19942, 1431, 1477, 61016, 10736, 1208, 10122, 312, 31878, 6520,
]);

type Mode = "novel" | "stories" | "poem" | "play";
type Form = "novel" | "stories" | "poem" | "play" | "other";

type Spec = {
  id: string;
  title: string;
  author: string;
  year: number;
  pg: number;
  form: Form;
  mode: Mode;
  shelfId?: string;
};

const DELTA: Spec[] = [
  { id: "songs-and-satires", title: "Songs and Satires", author: "Edgar Lee Masters", year: 1916, pg: 36149, form: "poem", mode: "poem" },
  { id: "the-three-taverns", title: "The Three Taverns: A Book of Poems", author: "Edwin Arlington Robinson", year: 1920, pg: 1040, form: "poem", mode: "poem" },
  { id: "a-diversity-of-creatures", title: "A Diversity of Creatures", author: "Rudyard Kipling", year: 1917, pg: 13085, form: "stories", mode: "stories" },
  { id: "the-town-down-the-river", title: "The Town Down the River: A Book of Poems", author: "Edwin Arlington Robinson", year: 1910, pg: 76699, form: "poem", mode: "poem" },
  { id: "prosas-profanas", title: "Prosas Profanas", author: "Rubén Darío", year: 1896, pg: 47650, form: "poem", mode: "poem" },
  { id: "the-romance-of-the-milky-way", title: "The Romance of the Milky Way, and Other Studies & Stories", author: "Lafcadio Hearn", year: 1905, pg: 15320, form: "stories", mode: "stories" },
  { id: "the-comedienne", title: "The Comedienne", author: "Władysław Reymont (trans. Edmund Obecny)", year: 1896, pg: 25760, form: "novel", mode: "novel" },
  { id: "lady-windermeres-fan", title: "Lady Windermere's Fan", author: "Oscar Wilde", year: 1892, pg: 790, form: "play", mode: "play" },
  { id: "salome", title: "Salomé", author: "Oscar Wilde (trans. Lord Alfred Douglas)", year: 1893, pg: 42704, form: "play", mode: "play" },
  { id: "rosmersholm", title: "Rosmersholm", author: "Henrik Ibsen (trans. R. Farquharson Sharp)", year: 1886, pg: 2289, form: "play", mode: "play" },
  { id: "the-man-of-property", title: "The Man of Property", author: "John Galsworthy", year: 1906, pg: 2559, form: "novel", mode: "novel" },
  { id: "heart-of-darkness", title: "Heart of Darkness", author: "Joseph Conrad", year: 1899, pg: 219, form: "novel", mode: "novel", shelfId: "heart-of-darkness" },
  { id: "hidden-force", title: "The Hidden Force", author: "Louis Couperus (trans. Alexander Teixeira de Mattos)", year: 1900, pg: 34725, form: "novel", mode: "novel", shelfId: "hidden-force" },
  { id: "the-napoleon-of-notting-hill", title: "The Napoleon of Notting Hill", author: "G. K. Chesterton", year: 1904, pg: 20058, form: "novel", mode: "novel" },
  { id: "the-village", title: "The Village", author: "Ivan Bunin (trans. Isabel F. Hapgood)", year: 1910, pg: 59981, form: "novel", mode: "novel" },
  { id: "cousin-betty", title: "Cousin Betty", author: "Honoré de Balzac (trans. James Waring)", year: 1846, pg: 1749, form: "novel", mode: "novel" },
  { id: "eugenie-grandet", title: "Eugenie Grandet", author: "Honoré de Balzac (trans. Katharine Prescott Wormeley)", year: 1833, pg: 1715, form: "novel", mode: "novel" },
  { id: "the-crux", title: "The Crux", author: "Charlotte Perkins Gilman", year: 1911, pg: 38551, form: "novel", mode: "novel" },
  { id: "the-pit", title: "The Pit", author: "Frank Norris", year: 1903, pg: 4382, form: "novel", mode: "novel" },
  { id: "the-titan", title: "The Titan", author: "Theodore Dreiser", year: 1914, pg: 3629, form: "novel", mode: "novel" },
  { id: "theresa-raquin", title: "Theresa Raquin", author: "Émile Zola (trans. Edward Vizetelly)", year: 1867, pg: 6626, form: "novel", mode: "novel" },
  { id: "wanderers", title: "Wanderers", author: "Knut Hamsun (tr. W. W. Worster)", year: 1906, pg: 7762, form: "novel", mode: "novel" },
  { id: "zuleika-dobson", title: "Zuleika Dobson", author: "Max Beerbohm", year: 1911, pg: 1845, form: "novel", mode: "novel" },
  { id: "bertha-garlan", title: "Bertha Garlan", author: "Arthur Schnitzler (trans. Horace Samuel)", year: 1900, pg: 9955, form: "novel", mode: "novel" },
  { id: "calvary", title: "Calvary", author: "Octave Mirbeau (trans. Louis Rich)", year: 1886, pg: 48773, form: "novel", mode: "novel" },
  { id: "in-the-world", title: "In the World", author: "Maksim Gorky (trans. Gertrude M. Foakes)", year: 1916, pg: 55502, form: "novel", mode: "novel" },
  { id: "the-dream", title: "The Dream", author: "Émile Zola (trans. Eliza E. Chase)", year: 1888, pg: 9499, form: "novel", mode: "novel" },
  { id: "malavoglia", title: "The House by the Medlar-Tree", author: "Giovanni Verga (trans. Mary A. Craig)", year: 1881, pg: 54684, form: "novel", mode: "novel", shelfId: "malavoglia" },
  { id: "the-house-of-the-seven-gables", title: "The House of the Seven Gables", author: "Nathaniel Hawthorne", year: 1851, pg: 77, form: "novel", mode: "novel" },
  { id: "the-jacket", title: "The Jacket (The Star-Rover)", author: "Jack London", year: 1915, pg: 1162, form: "novel", mode: "novel" },
  { id: "the-magic-skin", title: "The Magic Skin", author: "Honoré de Balzac (trans. Ellen Marriage)", year: 1831, pg: 1307, form: "novel", mode: "novel" },
  { id: "the-rise-of-silas-lapham", title: "The Rise of Silas Lapham", author: "William Dean Howells", year: 1885, pg: 154, form: "novel", mode: "novel" },
  { id: "the-road-to-the-open", title: "The Road to the Open", author: "Arthur Schnitzler (trans. Horace Samuel)", year: 1908, pg: 45895, form: "novel", mode: "novel" },
  { id: "three-soldiers", title: "Three Soldiers", author: "John Dos Passos", year: 1921, pg: 6362, form: "novel", mode: "novel" },
  { id: "twilight-sleep", title: "Twilight Sleep", author: "Edith Wharton", year: 1927, pg: 70844, form: "novel", mode: "novel", shelfId: "twilight-sleep" },
  { id: "virgin-soil", title: "Virgin Soil", author: "Ivan Turgenev (trans. R. S. Townsend)", year: 1877, pg: 2466, form: "novel", mode: "novel" },
  { id: "born-in-exile", title: "Born in Exile", author: "George Gissing", year: 1892, pg: 4526, form: "novel", mode: "novel" },
  { id: "indiana", title: "Indiana", author: "George Sand", year: 1832, pg: 63445, form: "novel", mode: "novel" },
  { id: "resurrection", title: "Resurrection", author: "Leo Tolstoy (trans. Louise Maude)", year: 1899, pg: 1938, form: "novel", mode: "novel" },
  { id: "small-souls", title: "Small Souls", author: "Louis Couperus (trans. Alexander Teixeira de Mattos)", year: 1901, pg: 34021, form: "novel", mode: "novel", shelfId: "small-souls" },
  { id: "the-colonels-dream", title: "The Colonel's Dream", author: "Charles W. Chesnutt", year: 1905, pg: 19746, form: "novel", mode: "novel", shelfId: "the-colonels-dream" },
  { id: "the-grand-babylon-hotel", title: "The Grand Babylon Hotel", author: "Arnold Bennett", year: 1902, pg: 2813, form: "novel", mode: "novel" },
  { id: "the-job", title: "The Job", author: "Sinclair Lewis", year: 1917, pg: 25474, form: "novel", mode: "novel" },
  { id: "the-reign-of-greed-el-filibusterismo", title: "The Reign of Greed", author: "José Rizal (trans. Charles Derbyshire)", year: 1891, pg: 10676, form: "novel", mode: "novel", shelfId: "the-reign-of-greed-el-filibusterismo" },
  { id: "the-wonderful-adventures-of-nils", title: "The Wonderful Adventures of Nils", author: "Selma Lagerlöf (trans. Velma Swanston Howard)", year: 1906, pg: 10935, form: "novel", mode: "novel" },
  { id: "white-jacket", title: "White Jacket", author: "Herman Melville", year: 1850, pg: 10712, form: "novel", mode: "novel", shelfId: "white-jacket" },
  { id: "pans-garden", title: "Pan's Garden: A Volume of Nature Stories", author: "Algernon Blackwood", year: 1912, pg: 77472, form: "stories", mode: "stories" },
  { id: "the-wolves-of-god", title: "The Wolves of God, and Other Fey Stories", author: "Algernon Blackwood; Wilfred Wilson", year: 1921, pg: 38310, form: "stories", mode: "stories" },
  { id: "peacock-pie", title: "Peacock Pie, a Book of Rhymes", author: "Walter de la Mare", year: 1913, pg: 3753, form: "poem", mode: "poem" },
  { id: "the-party-and-other-stories", title: "The Party and Other Stories", author: "Anton Chekhov (tr. Constance Garnett)", year: 1917, pg: 13413, form: "stories", mode: "stories" },
  { id: "the-veil-and-other-poems", title: "The Veil, and Other Poems", author: "Walter de la Mare", year: 1921, pg: 52366, form: "poem", mode: "poem" },
  { id: "charmides-and-other-poems", title: "Charmides, and Other Poems", author: "Oscar Wilde", year: 1881, pg: 1031, form: "poem", mode: "poem" },
  { id: "the-book-of-wonder", title: "The Book of Wonder", author: "Lord Dunsany", year: 1912, pg: 7477, form: "stories", mode: "stories" },
  { id: "salt-water-ballads", title: "Salt-Water Ballads", author: "John Masefield", year: 1902, pg: 52761, form: "poem", mode: "poem" },
  { id: "in-a-glass-darkly", title: "In a Glass Darkly", author: "Joseph Sheridan Le Fanu", year: 1872, pg: 37172, form: "stories", mode: "stories" },
  { id: "the-gods-of-pegana", title: "The Gods of Pegana", author: "Lord Dunsany", year: 1905, pg: 8395, form: "stories", mode: "stories" },
  { id: "the-rise-of-david-levinsky", title: "The Rise of David Levinsky", author: "Abraham Cahan", year: 1917, pg: 2803, form: "novel", mode: "novel", shelfId: "the-rise-of-david-levinsky" },
  { id: "yekl", title: "Yekl", author: "Abraham Cahan", year: 1896, pg: 36715, form: "novel", mode: "novel" },
  { id: "dauber", title: "Dauber: A Poem", author: "John Masefield", year: 1913, pg: 56607, form: "poem", mode: "poem" },
  { id: "the-ballad-of-the-white-horse", title: "The Ballad of the White Horse", author: "G. K. Chesterton", year: 1911, pg: 1719, form: "poem", mode: "poem" },
  { id: "an-american-tragedy", title: "An American Tragedy", author: "Theodore Dreiser", year: 1925, pg: 75181, form: "novel", mode: "novel" },
  { id: "tess-of-the-durbervilles", title: "Tess of the d'Urbervilles", author: "Thomas Hardy", year: 1891, pg: 110, form: "novel", mode: "novel" },
];

const SKIP_SCENE = /^(contents|table of contents|preface|introduction|foreword|index|illustrations|notes|dedication|epigraph|bibliography|the end|finis)$/i;

function argValue(flag: string) {
  const i = process.argv.indexOf(flag);
  return i < 0 ? "" : (process.argv[i + 1] ?? "");
}

function clip(text: string, max = 220) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function urls(id: number) {
  return [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ];
}

async function fetchPg(id: number) {
  mkdirSync(cacheDir, { recursive: true });
  const cached = join(cacheDir, `${id}.txt`);
  if (existsSync(cached) && readFileSync(cached, "utf8").length > 800) return readFileSync(cached, "utf8");
  let last = "no response";
  for (const url of urls(id)) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "VellumPressSalon/1.0 (catalog bind; literary reader)",
          Accept: "text/plain,*/*;q=0.1",
        },
      });
      if (!response.ok) {
        last = `${response.status} ${url}`;
        continue;
      }
      const text = await response.text();
      if (text.length < 800 || /<!doctype html/i.test(text.slice(0, 180))) {
        last = `short ${url}`;
        continue;
      }
      writeFileSync(cached, text);
      return text;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(last);
}

function isEnglishSource(raw: string) {
  const lang = raw.slice(0, 3000).match(/Language:\s*([^\n]+)/i)?.[1] ?? "";
  if (!lang) return true;
  return /english/i.test(lang);
}

function titleTokens(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["other", "stories", "poems", "book", "volume", "papers", "from", "with"].includes(word));
}

function citesTitle(raw: string, title: string) {
  const head = raw.slice(0, 8000).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const tokens = titleTokens(title);
  if (!tokens.length) return true;
  const hits = tokens.filter((token) => head.includes(token));
  return hits.length >= Math.min(2, tokens.length);
}

function isBoiler(text: string) {
  return /project gutenberg|produced by|transcriber|ebook|start of (the|this) project|end of (the|this) project|proofreading|release date:|distributed proofreading/i.test(text);
}

function junkLine(line: string) {
  return /transcribed from|proofing by|etext scanned|produced by|internet archive|pgdp\.net|this etext was transcribed|email ccx074|images generously made available|original pages are available|text enclosed by underscores|distributed proofreading|all rights reserved|made and printed in|alfred a\. knopf|elkin mathews/i.test(line);
}

function normKey(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function cutToContents(parts: string[]) {
  const idx = parts.findIndex((part) => /^(contents|content)\b/i.test(part.trim()) && part.trim().length < 60);
  if (idx < 0 || idx > 240) return parts;
  const entries: string[] = [];
  let i = idx + 1;
  for (; i < parts.length && i < idx + 200; i++) {
    let part = parts[i]!.replace(/\s+/g, " ").trim().replace(/\s+\d{1,4}$/, "").trim();
    if (!part || /^(page|chapter)$/i.test(part)) continue;
    if (part.length > 90 && entries.length >= 2) break;
    if (part.length > 140) break;
    entries.push(part);
    if (entries.length >= 80) break;
  }
  const start = entries.find((entry) => !/memoir|preface|introduction|foreword|dedication|^note\b|illustrations|contents|bibliographic/.test(normKey(entry)));
  if (!start) return parts;
  const key = normKey(start);
  for (let j = idx + 1; j < parts.length; j++) {
    const n = normKey((parts[j] ?? "").replace(/\s+\d{1,4}$/, ""));
    if (!n) continue;
    if (n === key || (key.length > 6 && (n.startsWith(key) || (key.startsWith(n) && n.length > 8)))) return parts.slice(j);
  }
  return parts;
}

function isCapsSubtitle(line: string) {
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12 || line.length > 180) return false;
  return !/[a-z]/.test(line) && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.88;
}

function dropHeadLines(lines: string[]) {
  const out = [...lines];
  while (out.length > 2) {
    const line = out[0]!.trim();
    if (!line || junkLine(line) || isBoiler(line) || isCapsSubtitle(line)) {
      out.shift();
      continue;
    }
    if (/^[A-Z][A-Z .'-]{1,22}\.?$/.test(line)) {
      out.shift();
      continue;
    }
    if (/^(published in|at the request of|fellow-townswoman)/i.test(line) || (/^\[/.test(line) && line.length < 90)) {
      out.shift();
      continue;
    }
    if (/\s\d{1,4}$/.test(line) && line.length < 70) {
      out.shift();
      continue;
    }
    break;
  }
  return out;
}

function finish(spec: Spec, scenes: Work["scenes"], breaths: Work["breaths"]): Work {
  const host = spec.mode === "poem" ? "poem" : spec.mode === "stories" ? "story" : spec.mode === "play" ? "act" : "chapter";
  return {
    id: spec.id,
    title: spec.title,
    author: spec.author,
    year: String(spec.year),
    note: `${spec.author}'s ${spec.year} ${spec.form} ${spec.title}. Full text, opening on the first ${host}.`,
    minutes: Math.max(12, Math.round(breaths.length / 8)),
    cover: "",
    coverAlt: "",
    scenes,
    breaths,
  };
}

function renumber(spec: Spec, scenes: Work["scenes"], breaths: Work["breaths"]) {
  const nextScenes: Work["scenes"] = [];
  const nextBreaths: Work["breaths"] = [];
  for (const scene of scenes) {
    let lines = dropHeadLines(
      breaths.filter((breath) => breath.sceneId === scene.id).map((breath) => breath.text).filter((line) => line && !junkLine(line)),
    );
    if (lines.length < 2) continue;
    let title = scene.title.replace(TIMED_SIT_TITLE, "").trim();
    if (/^\[/.test(title) || /^story \d+$/i.test(title) || title === "Poem" || SKIP_SCENE.test(title)) {
      const guess = lines.find((line) => line.length > 2 && line.length < 56 && !/[.!?]$/.test(line) && !isCapsSubtitle(line));
      if (guess) title = guess;
    }
    const id = `s${nextScenes.length}`;
    nextScenes.push({ id, title, place: title, reentry: lines[0] ?? "", prompt: scene.prompt });
    nextBreaths.push(...breathsFor(id, lines));
  }
  return finish(spec, nextScenes, nextBreaths);
}

function isJunkScene(title: string, lines: string[], spec: Spec) {
  const blob = lines.join(" ");
  if (junkLine(blob) || isBoiler(blob)) return true;
  if (SKIP_SCENE.test(title.trim()) || /^index of /i.test(title) || /foreword by/i.test(title)) return true;
  if (lines.length >= 3 && lines.filter((line) => /\s\d{1,4}$/.test(line.trim()) && line.length < 80).length >= Math.ceil(lines.length * 0.6)) {
    return true;
  }
  const authorTokens = normKey(spec.author).split(" ").filter((word) => word.length > 3);
  const titleWords = title.trim().split(/\s+/);
  if (titleWords.length >= 2 && titleWords.length <= 6 && authorTokens.some((token) => normKey(title).split(" ").includes(token)) && blob.length < 400) {
    return true;
  }
  const nt = normKey(title);
  const bt = normKey(spec.title);
  if (nt && bt && (nt === bt || bt.startsWith(`${nt} `)) && blob.length < 450 && lines.length < 12) return true;
  return false;
}

function polish(work: Work, spec: Spec) {
  const scenes = [...work.scenes];
  while (scenes.length > 1) {
    const scene = scenes[0]!;
    const lines = work.breaths.filter((breath) => breath.sceneId === scene.id).map((breath) => breath.text);
    if (!isJunkScene(scene.title, lines, spec)) break;
    scenes.shift();
  }
  return renumber(spec, scenes, work.breaths);
}

function poemWork(raw: string, spec: Spec): Work {
  const lines = cutToContents(
    betweenMarks(raw)
      .split("\n")
      .map((line) => fixPoetryOcr(line.trim()))
      .filter((line) => line && !isSkipBreath(line) && !isBoiler(line) && !junkLine(line)),
  );
  const built = splitLinesIntoPoems(lines).filter((scene) => !SKIP_SCENE.test(scene.title.trim()) && scene.lines.length >= 2);
  const scenes: Work["scenes"] = [];
  const breaths: Work["breaths"] = [];
  for (const item of built) {
    const title = displayPoemTitle(item.title);
    if (TIMED_SIT_TITLE.test(title) || SKIP_SCENE.test(title)) continue;
    const text = item.lines.map((line) => line.trim()).filter(Boolean);
    if (text.length < 2) continue;
    const id = `s${scenes.length}`;
    scenes.push({
      id,
      title,
      place: title,
      reentry: text.find((line) => line !== title) ?? text[0] ?? "",
      prompt: "What does the poem hold?",
    });
    breaths.push(...breathsFor(id, text));
    if (breaths.length >= MAX_BREATHS) break;
  }
  return finish(spec, scenes, breaths);
}

function isStoryHead(para: string, next: string | undefined) {
  const p = para.trim();
  if (!p || p.length > 72 || !next || next.length < 50 || isBoiler(p) || junkLine(p)) return false;
  const words = p.split(/\s+/);
  if (words.length > 12) return false;
  const letters = p.replace(/[^A-Za-z]/g, "");
  const upper = letters ? letters.replace(/[^A-Z]/g, "").length / letters.length : 0;
  if (letters.length >= 3 && upper > 0.82) return true;
  if (/^(chapter|book|part|act|scene)\b/i.test(p)) return true;
  if (/^[A-Z]/.test(p) && words.length <= 8 && !/[.!?]$/.test(p)) return true;
  return false;
}

function storyWork(raw: string, spec: Spec): Work | null {
  const paras = cutToContents(
    betweenMarks(raw)
      .split(/\n\s*\n/)
      .map((para) => para.replace(/\s+/g, " ").trim())
      .filter((para) => para && !isBoiler(para) && !junkLine(para)),
  );
  type Chunk = { title: string; text: string };
  const chunks: Chunk[] = [];
  let title = "";
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n\n").trim();
    if (text.length > 100) chunks.push({ title: title || `Story ${chunks.length + 1}`, text });
    title = "";
    buf = [];
  };
  for (let i = 0; i < paras.length; i++) {
    const para = paras[i] ?? "";
    if (isStoryHead(para, paras[i + 1])) {
      if (buf.length) flush();
      title = para.replace(/\s+/g, " ").trim();
      continue;
    }
    buf.push(para);
  }
  flush();
  if (chunks.length < 3) return null;
  const scenes: Work["scenes"] = [];
  const breaths: Work["breaths"] = [];
  for (const chunk of chunks) {
    if (SKIP_SCENE.test(chunk.title)) continue;
    const lines = splitSentences(chunk.text).filter((line) => line && !isBoiler(line) && !junkLine(line));
    if (lines.length < 4) continue;
    const id = `s${scenes.length}`;
    const label = chunk.title.length > 64 ? chunk.title.slice(0, 62).trim() : chunk.title;
    scenes.push({ id, title: label, place: label, reentry: lines[0] ?? "", prompt: "A word from this stretch." });
    breaths.push(...breathsFor(id, lines));
    if (breaths.length >= MAX_BREATHS) break;
  }
  if (scenes.length < 3) return null;
  return finish(spec, scenes, breaths);
}

function novelWork(raw: string, spec: Spec) {
  const work = buildFromRaw(
    raw,
    { id: spec.id, title: spec.title, author: spec.author, year: String(spec.year), minutes: 0, gutenberg: spec.pg },
    MAX_BREATHS,
  );
  return { ...work, note: `${spec.author}'s ${spec.year} ${spec.form} ${spec.title}. Full text, opening on the first chapter.`, minutes: Math.max(12, Math.round(work.breaths.length / 8)) };
}

function bindOne(raw: string, spec: Spec) {
  const work = spec.mode === "poem" ? poemWork(raw, spec) : spec.mode === "stories" ? (storyWork(raw, spec) ?? novelWork(raw, spec)) : novelWork(raw, spec);
  return polish(work, spec);
}

function rejectReason(work: Work, raw: string, spec: Spec) {
  if (!isEnglishSource(raw)) return "not-english";
  if (!citesTitle(raw, spec.title)) return "title-mismatch";
  const min = spec.mode === "poem" ? 24 : 50;
  if (work.breaths.length < min) return `short-${work.breaths.length}`;
  if (!work.scenes.length) return "no-scenes";
  const head = work.breaths.slice(0, 4).map((breath) => breath.text).join(" ");
  if (isBoiler(head) || junkLine(head)) return "boilerplate-open";
  if (work.scenes.some((scene) => TIMED_SIT_TITLE.test(scene.title))) return "timed-sit";
  if (spec.mode === "poem" && work.scenes.length < 4) return `poem-scroll-${work.scenes.length}`;
  if (spec.mode === "stories" && work.scenes.length < 2) return "one-sit";
  return "";
}

function objectSpan(src: string, id: string) {
  const at = src.indexOf(`id: "${id}"`);
  if (at < 0) return null;
  const start = src.lastIndexOf("{", at);
  if (start < 0) return null;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i]!;
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  return null;
}

function patchShelf(spec: Spec, work: Work) {
  let src = readFileSync(shelfPath, "utf8");
  const targetId = spec.shelfId && src.includes(`id: "${spec.shelfId}"`) ? spec.shelfId : spec.id;
  const span = objectSpan(src, targetId);
  const opening = JSON.stringify(clip(work.breaths[0]?.text ?? ""));
  if (!span) {
    const country = countryFor({ id: spec.id, author: spec.author, language: "English" });
    if (!country) throw new Error(`no country for ${spec.author}`);
    const line = `  { id: ${JSON.stringify(spec.id)}, title: ${JSON.stringify(spec.title)}, author: ${JSON.stringify(spec.author)}, year: ${spec.year}, form: ${JSON.stringify(spec.form)}, language: "English", minutes: ${work.minutes}, local: true, opening: ${opening}, breaths: ${work.breaths.length}, gutenberg: ${spec.pg} },`;
    const marker = "\n];\n\nconst BY_ID";
    const at = src.indexOf(marker);
    if (at < 0) throw new Error("shelf close not found");
    writeFileSync(shelfPath, `${src.slice(0, at)}\n${line}${src.slice(at)}`);
    return "appended";
  }
  let obj = src.slice(span.start, span.end);
  const existingPg = Number(obj.match(/gutenberg:\s*(\d+)/)?.[1] ?? 0);
  if (existingPg && existingPg !== spec.pg) {
    throw new Error(`shelf ${targetId} already cites PG ${existingPg}, not ${spec.pg}`);
  }
  if (!/local:\s*true/.test(obj)) obj = obj.replace(/\}$/, ", local: true }");
  if (/opening:\s*"/.test(obj)) obj = obj.replace(/opening:\s*"(?:\\.|[^"])*"/, `opening: ${opening}`);
  else obj = obj.replace(/\}$/, `, opening: ${opening} }`);
  if (/breaths:\s*\d+/.test(obj)) obj = obj.replace(/breaths:\s*\d+/, `breaths: ${work.breaths.length}`);
  else obj = obj.replace(/\}$/, `, breaths: ${work.breaths.length} }`);
  obj = obj.replace(/minutes:\s*\d+/, `minutes: ${work.minutes}`);
  if (!/gutenberg:\s*\d+/.test(obj)) obj = obj.replace(/\}$/, `, gutenberg: ${spec.pg} }`);
  spec.id = targetId;
  writeFileSync(shelfPath, src.slice(0, span.start) + obj + src.slice(span.end));
  return "patched";
}

function selected() {
  const only = new Set(argValue("--only").split(",").filter(Boolean));
  const mode = argValue("--mode");
  return DELTA.filter((spec) => {
    if (HELD_IDS.has(spec.id) || (spec.shelfId && HELD_IDS.has(spec.shelfId)) || HELD_PG.has(spec.pg)) return false;
    if (only.size && !only.has(spec.id) && !(spec.shelfId && only.has(spec.shelfId))) return false;
    if (mode && spec.mode !== mode) return false;
    return true;
  });
}

async function main() {
  const specs = selected();
  const texts = new Set(readdirSync(textDir).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5)));
  let wrote = 0;
  for (const spec of specs) {
    const shelfId = spec.shelfId ?? spec.id;
    if (texts.has(spec.id) || texts.has(shelfId)) {
      console.log(`skip ${spec.id} already local`);
      continue;
    }
    if (EN_OFF_READABLE_IDS.has(spec.id) || EN_OFF_READABLE_IDS.has(shelfId)) {
      console.log(`skip ${spec.id} en-off`);
      continue;
    }
    try {
      const raw = await fetchPg(spec.pg);
      const work = bindOne(raw, spec);
      const why = rejectReason(work, raw, spec);
      if (why) {
        console.log(`FAIL ${spec.id} pg${spec.pg} ${why} scenes=${work.scenes.length} breaths=${work.breaths.length} first="${work.scenes[0]?.title}" open="${clip(work.breaths[0]?.text ?? "", 70)}"`);
        continue;
      }
      const how = patchShelf(spec, work);
      work.id = spec.id;
      const openPath = join(openDir, `${spec.id}.json`);
      if (existsSync(openPath)) unlinkSync(openPath);
      writeFileSync(join(textDir, `${spec.id}.json`), JSON.stringify(work));
      texts.add(spec.id);
      wrote += 1;
      console.log(`OK ${spec.id} pg${spec.pg} ${how} scenes=${work.scenes.length} breaths=${work.breaths.length} first="${work.scenes[0]?.title}" open="${clip(work.breaths[0]?.text ?? "", 78)}"`);
    } catch (err) {
      console.log(`FAIL ${spec.id} pg${spec.pg} ${err instanceof Error ? err.message : err}`);
    }
  }
  const n = readdirSync(textDir).filter((name) => name.endsWith(".json")).length;
  console.log(`wrote ${wrote}; N=${n}/1128`);
}

await main();

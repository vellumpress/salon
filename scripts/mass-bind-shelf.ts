/**
 * Bind English shelf rows that already cite a Gutenberg id and have no local text.
 * Skips Mira BATCH-1, the held Dickinson stub, and the in-flight SHIPPABLE-DELTA ids.
 *
 *   node --experimental-strip-types scripts/mass-bind-shelf.ts --form novel
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { SHELF, type ShelfWork } from "../src/lib/catalog/shelf.ts";
import { betweenMarks, buildFromRaw } from "../src/lib/gutenberg.server.ts";
import { findCueOnlyBreaths, mergeWorkDialogue } from "../src/lib/catalog/dialogue-formatting.ts";
import type { Work } from "../src/lib/literature.ts";

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
  "attendants-confession",
  "enchanted-april",
  "vera",
  "futility",
  "high-wind-jamaica",
  "rashomon",
  "on-a-chinese-screen",
  "poison-tree",
  "songs-and-satires",
  "the-three-taverns",
  "a-diversity-of-creatures",
  "the-town-down-the-river",
  "prosas-profanas",
  "the-romance-of-the-milky-way",
  "the-comedienne",
  "mr-fortunes-maggot",
  "noli-me-tangere",
  "cousin-betty",
  "eugenie-grandet",
  "heart-of-darkness",
  "hidden-force",
  "lady-windermeres-fan",
  "rosmersholm",
  "salome",
  "the-crux",
  "the-man-of-property",
  "the-napoleon-of-notting-hill",
  "the-pit",
  "the-village",
  "the-octopus",
  "under-fire",
  "kalevala",
  "before-adam",
]);

const HELD_PG = new Set([
  35517, 2678, 2830, 7848, 647, 19942, 1431, 1477, 61016, 10736, 1208, 10122, 312, 31878, 6520,
]);

/** Ids owned by the open Tier A SHIPPABLE-DELTA PR — do not rebind. */
const DELTA_IDS = new Set(
  `a-diversity-of-creatures an-american-tragedy bertha-garlan born-in-exile calvary charmides-and-other-poems cousin-betty dauber eugenie-grandet heart-of-darkness in-a-glass-darkly in-the-world indiana lady-windermeres-fan pans-garden peacock-pie prosas-profanas resurrection rosmersholm salome salt-water-ballads small-souls songs-and-satires tess-of-the-durbervilles the-ballad-of-the-white-horse the-book-of-wonder the-colonel-s-dream the-colonels-dream the-comedienne the-crux the-dream the-gods-of-pegana the-grand-babylon-hotel the-hidden-force hidden-force the-house-by-the-medlar-tree malavoglia the-house-of-the-seven-gables the-jacket the-job the-magic-skin the-man-of-property the-napoleon-of-notting-hill the-party-and-other-stories the-pit the-poison-tree poison-tree the-reign-of-greed the-reign-of-greed-el-filibusterismo the-rise-of-david-levinsky the-rise-of-silas-lapham the-road-to-the-open the-romance-of-the-milky-way the-three-taverns the-titan the-town-down-the-river the-veil-and-other-poems the-village the-wolves-of-god the-wonderful-adventures-of-nils nils theresa-raquin therese-raquin three-soldiers twilight-sleep virgin-soil wanderers white-jacket yekl zuleika-dobson`.split(
    /\s+/,
  ),
);

const CACHE = ".pg-cache";
const TEXT_DIR = "src/lib/catalog/texts";
const SHELF_PATH = "src/lib/catalog/shelf.ts";
const MAX_BREATHS = 22000;
const UA = "VellumPressSalon/1.0 (literary catalog; +https://vellumpress.github.io/salon/)";

/** Slice past a preface so the host breath is the work itself. */
const ANCHORS: Record<string, string> = {
  "the-canterbury-tales": "WHEN that Aprilis, with his showers swoot",
  "aurora-leigh": "FIRST BOOK.",
  "black-spirits-and-white-a-book-of-ghost-stories": "No. 252 Rue M. le Prince.",
  "the-poems-of-emma-lazarus-volume-1": "\nEPOCHS.\n",
  "the-hesperides-and-noble-numbers": "1. THE ARGUMENT OF HIS BOOK.",
};

const CHROME =
  /transcriber|produced by|project gutenberg|table of contents|minor typographical|indicate _italics_|modern scholars believe|mcclurg|fac-?simile|all rights reserved/i;

const JUNK =
  /gutenberg|transcriber|produced by|ebook|copyright|all rights reserved|table of contents|^\s*contents\s*$|this (book|etext|project)|online distributed|proofread|digitiz|start of (this|the)|end of (this|the)|illustrated by|title page|printer'?s? note|editorial note/i;

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function urls(id: number) {
  return [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ];
}

async function fetchPg(id: number): Promise<string> {
  mkdirSync(CACHE, { recursive: true });
  const file = `${CACHE}/pg${id}.txt`;
  if (existsSync(file)) {
    const cached = readFileSync(file, "utf8");
    if (cached.length > 800 && !cached.startsWith("<!")) return cached;
  }
  let last = "fetch failed";
  for (const url of urls(id)) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": UA, Accept: "text/plain,*/*;q=0.1" },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        last = `${response.status} ${url}`;
        continue;
      }
      const text = await response.text();
      if (text.length < 800 || text.startsWith("<!") || /<html/i.test(text.slice(0, 400))) {
        last = `not plain text ${url}`;
        continue;
      }
      writeFileSync(file, text);
      return text;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(last);
}

function isEnglish(raw: string) {
  const lang = raw.match(/^Language:\s*(.+)$/im)?.[1]?.trim() ?? "";
  if (!lang) return true;
  return /english/i.test(lang);
}

function lastName(author: string) {
  const base = author.replace(/\s*\(.*$/, "").replace(/;.*$/, "").trim();
  const parts = base.split(/\s+/).filter((part) => !/^(jr|sr|st)\.?$/i.test(part));
  return (parts.at(-1) ?? "").replace(/[^A-Za-z'-]/g, "");
}

function authorMatches(raw: string, author: string) {
  const header = raw.match(/^Author:\s*(.+)$/im)?.[1]?.trim() ?? "";
  if (!header) return true;
  const last = lastName(author);
  if (last.length < 3) return true;
  return header.toLowerCase().includes(last.toLowerCase());
}

function citesTitle(raw: string, title: string) {
  const head = raw.slice(0, 12000);
  const full = title.trim();
  if (full.length >= 3) {
    const esc = full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${esc}\\b`, "i").test(head)) return true;
  }
  const low = head.toLowerCase();
  const words = full
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !["from", "with", "that", "other", "tales", "story", "stories"].includes(word));
  if (words.length === 0) return false;
  const hits = words.filter((word) => low.includes(word));
  return hits.length >= Math.min(2, words.length) || (words.length === 1 && hits.length === 1);
}

function isJunkLine(text: string) {
  const t = text.trim();
  if (!t) return true;
  if (JUNK.test(t)) return true;
  if (/^(chapter|book|part|volume)\s+[ivxlcdm\d]+[.:]?$/i.test(t)) return true;
  if (/^(by|translated by|illustrated by)\b/i.test(t) && t.length < 80) return true;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 6 && letters.length < 80) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.85) return true;
  }
  if (t.length < 48 && !/[.!?…]/.test(t)) return true;
  return false;
}

function proseEnough(text: string) {
  const t = text.trim();
  return t.length >= 40 && /[a-z]/.test(t) && /[.!?…]/.test(t) && !JUNK.test(t);
}

function polish(work: Work): Work {
  const merged = mergeWorkDialogue(work);
  let scenes = merged.scenes.map((scene) => ({ ...scene }));
  let breaths = merged.breaths.map((breath) => ({ ...breath }));

  const sceneBreaths = (id: string) => breaths.filter((breath) => breath.sceneId === id);

  while (scenes.length > 1) {
    const lines = sceneBreaths(scenes[0]!.id).map((breath) => breath.text);
    const first = lines.find((line) => proseEnough(line)) ?? "";
    const head = lines.slice(0, 3).join(" ");
    if (proseEnough(first) && !CHROME.test(first) && !CHROME.test(head)) break;
    const drop = scenes[0]!.id;
    scenes = scenes.slice(1);
    breaths = breaths.filter((breath) => breath.sceneId !== drop);
  }

  if (scenes[0]) {
    const id = scenes[0].id;
    let lines = sceneBreaths(id).map((breath) => breath.text);
    while (
      lines.length > 1 &&
      (isJunkLine(lines[0] ?? "") ||
        CHROME.test(lines[0] ?? "") ||
        ((lines[0] ?? "").trim().length < 40 && (lines[1] ?? "").trim().length > 80))
    ) {
      lines = lines.slice(1);
    }
    breaths = [...lines.map((text, i) => ({ id: `${id}-${i}`, sceneId: id, text })), ...breaths.filter((breath) => breath.sceneId !== id)];
    const first = lines.find((line) => proseEnough(line)) ?? lines[0] ?? "";
    scenes[0] = { ...scenes[0], reentry: first };
  }

  const renumberedScenes = scenes.map((scene, index) => ({ ...scene, id: `s${index}` }));
  const idMap = new Map(scenes.map((scene, index) => [scene.id, `s${index}`]));
  const renumberedBreaths = breaths.map((breath) => {
    const sceneId = idMap.get(breath.sceneId) ?? breath.sceneId;
    return { ...breath, sceneId };
  });
  const grouped = new Map<string, typeof renumberedBreaths>();
  for (const breath of renumberedBreaths) {
    const list = grouped.get(breath.sceneId) ?? [];
    list.push(breath);
    grouped.set(breath.sceneId, list);
  }
  const finalBreaths = [];
  for (const scene of renumberedScenes) {
    const lines = grouped.get(scene.id) ?? [];
    lines.forEach((breath, index) => finalBreaths.push({ ...breath, id: `${scene.id}-${index}` }));
    if (lines[0]) scene.reentry = lines.find((breath) => proseEnough(breath.text))?.text ?? lines[0].text;
  }

  return { ...merged, scenes: renumberedScenes, breaths: finalBreaths };
}

function chapterNumber(title: string) {
  const match = title.match(/chapter\s+([ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine)/i);
  if (!match) return null;
  const token = match[1]!.toLowerCase();
  if (/^\d+$/.test(token)) return Number(token);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  if (words[token]) return words[token];
  const romans: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  return romans[token] ?? null;
}

function rejectReason(work: Work) {
  if (work.scenes.length < 1 || work.breaths.length < 40) return `thin ${work.scenes.length} scenes / ${work.breaths.length} breaths`;
  const chapter = chapterNumber(work.scenes[0]?.title ?? "");
  if (chapter != null && chapter >= 2) return `opens at chapter ${chapter}`;
  const first = work.breaths[0]?.text ?? "";
  if (/contents|mcclurg|fac-simile|sandbourne moor/i.test(first)) return `contents open: ${first.slice(0, 80)}`;
  if (!proseEnough(first) && !proseEnough(work.breaths.find((breath) => proseEnough(breath.text))?.text ?? "")) {
    return `no prose open: ${first.slice(0, 80)}`;
  }
  if (JUNK.test(first) || CHROME.test(first)) return `junk open: ${first.slice(0, 80)}`;
  const cues = findCueOnlyBreaths(work.breaths.map((breath) => breath.text));
  if (cues.length > 0) return `cue-only ×${cues.length}: ${cues[0]?.text}`;
  return "";
}

function candidates(form: string | undefined) {
  const texts = new Set(readdirSync(TEXT_DIR).map((name) => name.replace(/\.json$/, "")));
  const usedPg = new Set(SHELF.filter((work) => work.local && work.gutenberg).map((work) => work.gutenberg));
  return SHELF.filter((work) => {
    if (work.language !== "English" || !work.gutenberg || work.local) return false;
    if (form && work.form !== form) return false;
    if (work.year > 1930) return false;
    if (texts.has(work.id) || HELD_IDS.has(work.id) || DELTA_IDS.has(work.id) || HELD_PG.has(work.gutenberg)) return false;
    if (usedPg.has(work.gutenberg)) return false;
    return true;
  });
}

function openingLine(work: Work) {
  const line = (work.breaths.find((breath) => proseEnough(breath.text)) ?? work.breaths[0])?.text ?? "";
  return line.replace(/\s+/g, " ").trim().slice(0, 220);
}

function patchShelf(bound: { work: ShelfWork; text: Work }[]) {
  let src = readFileSync(SHELF_PATH, "utf8");
  for (const { work, text } of bound) {
    const key = `id: "${work.id}"`;
    const at = src.indexOf(key);
    if (at < 0) throw new Error(`shelf missing ${work.id}`);
    const start = src.lastIndexOf("{", at);
    let depth = 0;
    let quote = false;
    let escape = false;
    let tick = false;
    let end = -1;
    for (let i = start; i < src.length; i++) {
      const ch = src[i]!;
      if (tick) {
        if (ch === "`") tick = false;
        continue;
      }
      if (quote) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === '"') quote = false;
        continue;
      }
      if (ch === "`") {
        tick = true;
        continue;
      }
      if (ch === '"') {
        quote = true;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) throw new Error(`unclosed shelf object ${work.id}`);
    const obj = src.slice(start, end);
    const existingPg = Number(obj.match(/gutenberg:\s*(\d+)/)?.[1] ?? 0);
    if (existingPg !== work.gutenberg) throw new Error(`shelf ${work.id} cites PG ${existingPg}, not ${work.gutenberg}`);
    if (/local:\s*true/.test(obj)) throw new Error(`shelf ${work.id} already local`);
    const minutes = Math.max(20, Math.round(text.breaths.length / 8));
    let body = obj.slice(0, -1).trimEnd();
    body = body.replace(/minutes:\s*\d+/, `minutes: ${minutes}`);
    if (!body.endsWith(",")) body += ",";
    body += `\n    local: true,\n    opening: ${JSON.stringify(openingLine(text))},\n    breaths: ${text.breaths.length},`;
    const next = `${body}\n  }`;
    src = src.slice(0, start) + next + src.slice(end);
  }
  writeFileSync(SHELF_PATH, src);
}

function hostRaw(work: ShelfWork, raw: string) {
  const body = betweenMarks(raw);
  const anchor = ANCHORS[work.id];
  if (!anchor) return raw;
  const at = body.indexOf(anchor);
  if (at < 0) throw new Error(`anchor missing for ${work.id}`);
  return `*** START OF THE PROJECT GUTENBERG EBOOK ***\n\n${body.slice(at)}\n`;
}

function coverage(raw: string, text: Work) {
  const bodyLetters = betweenMarks(raw).replace(/[^A-Za-z]/g, "").length;
  const boundLetters = text.breaths
    .map((breath) => breath.text)
    .join("")
    .replace(/[^A-Za-z]/g, "").length;
  if (bodyLetters < 2000) return 1;
  return boundLetters / bodyLetters;
}

async function bindOne(work: ShelfWork) {
  const raw = await fetchPg(work.gutenberg!);
  if (!isEnglish(raw)) throw new Error("not english");
  if (!authorMatches(raw, work.author)) throw new Error("author does not match shelf");
  if (!citesTitle(raw, work.title)) throw new Error("title not in source");
  const built = buildFromRaw(
    hostRaw(work, raw),
    {
      id: work.id,
      title: work.title,
      author: work.author,
      year: String(work.year),
      minutes: work.minutes,
      gutenberg: work.gutenberg!,
    },
    MAX_BREATHS,
  );
  built.note = `${work.title} — a full sitting.`;
  built.cover = "";
  built.coverAlt = "";
  const text = polish(built);
  const why = rejectReason(text);
  if (why) throw new Error(why);
  const ratio = coverage(raw, text);
  const floor = work.form === "poem" ? 0.35 : 0.45;
  if (ratio < floor) throw new Error(`truncated ${ratio.toFixed(2)}`);
  return text;
}

async function pool<T, R>(items: T[], limit: number, job: (item: T) => Promise<R>) {
  const out: R[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await job(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  const form = arg("--form");
  const only = new Set((arg("--only") ?? "").split(",").filter(Boolean));
  const limit = Number(arg("--limit") ?? "0");
  let list = candidates(form);
  if (only.size) list = list.filter((work) => only.has(work.id));
  if (limit > 0) list = list.slice(0, limit);
  console.log(`binding ${list.length} ${form ?? "works"}`);

  const results = await pool(list, 4, async (work) => {
    try {
      const text = await bindOne(work);
      writeFileSync(`${TEXT_DIR}/${work.id}.json`, `${JSON.stringify(text)}\n`);
      const open = openingLine(text);
      console.log(`OK ${work.id} pg${work.gutenberg} ${text.scenes.length}/${text.breaths.length} :: ${open.slice(0, 110)}`);
      return { work, text, error: "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL ${work.id} pg${work.gutenberg} ${message}`);
      return { work, text: null as Work | null, error: message };
    }
  });

  const bound = results.filter((result) => result.text).map((result) => ({ work: result.work, text: result.text! }));
  if (bound.length) patchShelf(bound);
  console.log(`shipped ${bound.length} failed ${results.length - bound.length}`);
}

main();

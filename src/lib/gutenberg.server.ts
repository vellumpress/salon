import { breathsFor, type Work } from "./literature.ts";
import {
  isChapterHeading,
  isChapterOne,
  isFrontMatter,
  isStructuralMark,
  repairLines,
  splitSentences,
} from "./sentences.ts";

const MAX_BYTES = 2_200_000;
const MAX_BREATHS = 10_000;
const SCENE_SIZE = 36;
const OPENING_CHARS = 90_000;
const OPENING_BREATHS = 96;

const textCache = new Map<number, string>();
const textWait = new Map<number, Promise<string>>();
const workCache = new Map<number, Work>();
const workWait = new Map<number, Promise<Work>>();
const openingCache = new Map<number, Work>();

function gutenbergUrls(id: number) {
  return [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ];
}

async function fetchOne(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    redirect: "follow",
    signal,
    headers: {
      Accept: "text/plain,text/html;q=0.4,*/*;q=0.1",
      "User-Agent": "Vellum/1.0 (literary reader)",
    },
  });
  if (!response.ok) throw new Error("This text would not come.");
  const buf = await response.arrayBuffer();
  const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
  const text = new TextDecoder("utf-8").decode(slice);
  if (text.length < 800) throw new Error("This text would not come.");
  return text;
}

async function fetchTextFast(id: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const text = await Promise.any(gutenbergUrls(id).map((url) => fetchOne(url, controller.signal)));
    controller.abort();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function getText(id: number) {
  const hit = textCache.get(id);
  if (hit) return Promise.resolve(hit);
  const waiting = textWait.get(id);
  if (waiting) return waiting;
  const pending = fetchTextFast(id).then(
    (text) => {
      textCache.set(id, text);
      textWait.delete(id);
      return text;
    },
    (err) => {
      textWait.delete(id);
      throw err;
    },
  );
  textWait.set(id, pending);
  return pending;
}

export function betweenMarks(raw: string) {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const start = text.search(/\*\*\*\s*START OF[^\n]*\*\*\*/i);
  let body = text;
  if (start >= 0) body = body.slice(text.indexOf("\n", start) + 1);
  const cut = body.search(/\*\*\*\s*END OF[^\n]*\*\*\*/i);
  if (cut >= 0) body = body.slice(0, cut);
  return body.trim();
}

function isBoilerplatePara(p: string) {
  const low = p.toLowerCase();
  return /gutenberg|transcriber|produced by|ebook|copyright|illustration|language:|encoding:|start of this|end of this|all rights reserved|printed in the|renewed by|harcourt|_fiction_|_biography_|_criticism_|misspelled words have been corrected|every effort has been made to replicate|faithfully as possible|digitizer|online distributed proofreading|italic text has been marked|i wish to thank the editors|note from the digitizer|on japanese pronunciation|following general rules will help the reader|unfamiliar with japanese|author.?s original notes are in brackets/.test(
    low,
  );
}

function looksLikeProse(p: string) {
  const t = p.trim();
  if (t.length < 18) return false;
  if (isChapterHeading(t) || isFrontMatter(t) || isStructuralMark(t)) return false;
  if (!/[.!?…]/.test(t)) return false;
  if ((t.match(/\b[A-Z]{4,}\b/g) || []).length >= 6) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 20) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.72) return false;
  }
  return true;
}

function stripFront(text: string) {
  const paras = text.split(/\n{2,}/);
  let i = 0;
  while (i < paras.length && i < 80) {
    const p = paras[i] ?? "";
    const trimmed = p.trim();
    if (isChapterHeading(trimmed) && trimmed.length < 90) break;
    if (looksLikeProse(p) && !isBoilerplatePara(p)) break;
    if ((isBoilerplatePara(p) && p.length < 1800) || trimmed.length < 4 || isStructuralMark(trimmed) || isFrontMatter(trimmed)) {
      i += 1;
      continue;
    }
    if (!looksLikeProse(p) && trimmed.length < 400) {
      i += 1;
      continue;
    }
    break;
  }
  return paras.slice(i).join("\n\n").trim();
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isTitleish(line: string, title: string, author: string) {
  const low = normalizeKey(line);
  const t = normalizeKey(title);
  const last = normalizeKey(author.split(",")[0] ?? "").split(" ").at(-1) ?? "";
  if (!low) return true;
  if (low === t || (low.length >= 8 && t.includes(low) && low.length < 80)) return true;
  if (t.length > 8 && low.startsWith(t) && line.length < t.length + 24) return true;
  if (/^by /.test(low)) return true;
  if (/^(illustrated|translated|edited|rendered) by/.test(low)) return true;
  if (last.length > 3 && low.includes(last) && line.length < 90) return true;
  if (isFrontMatter(line)) return true;
  if (/^(once again|to|for|dedicated to)$/i.test(line.trim())) return true;
  return false;
}

function followingProse(lines: string[], from: number) {
  for (let i = from; i < Math.min(lines.length, from + 8); i++) {
    const next = (lines[i] ?? "").trim();
    if (!next || isStructuralMark(next)) continue;
    if (isChapterHeading(next) || isFrontMatter(next)) return false;
    if (next.length > 50) return true;
    if (next.length > 20 && /[.!?…]/.test(next)) return true;
    if (next.length > 24) return true;
  }
  return false;
}

function isBodyChapter(lines: string[], index: number) {
  return isChapterHeading(lines[index] ?? "") && followingProse(lines, index + 1);
}

function isKeepLine(line: string) {
  if (isChapterHeading(line) || isFrontMatter(line) || isStructuralMark(line)) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 8 && letters.length <= 52) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.86) return false;
  }
  return true;
}

function tocEndIndex(lines: string[]) {
  const limit = Math.min(lines.length, 140);
  // TOC runs are dense (headings within 2 lines). Body chapters are sparse;
  // treating sparse runs as TOC skipped early chapters (In Our Time 1–3).
  const heads: number[] = [];
  for (let i = 0; i < limit; i++) {
    if (isChapterHeading(lines[i] ?? "")) heads.push(i);
  }
  for (let s = 0; s < heads.length; s++) {
    let e = s;
    while (e + 1 < heads.length && heads[e + 1]! - heads[e]! <= 2) e += 1;
    if (e - s + 1 < 3) continue;
    let tocLike = true;
    for (let j = s; j < e; j++) {
      const a = heads[j]!;
      const b = heads[j + 1]!;
      for (let k = a + 1; k < b; k++) {
        const mid = (lines[k] ?? "").trim();
        if (mid.length > 80 && looksLikeProse(mid)) {
          tocLike = false;
          break;
        }
      }
      if (!tocLike) break;
    }
    if (!tocLike) continue;
    const last = heads[e]!;
    // A Chapter I that still has real prose after it is the body start, not TOC.
    // Don't let a tight TOC→title→Chapter I gap swallow the first chapter
    // (Edwin Drood, Blithedale Romance).
    if (e > s && isChapterOne(lines[last] ?? "") && followingProse(lines, last + 1)) {
      return heads[e - 1]!;
    }
    return last;
  }
  return -1;
}

function skipFrontMatter(lines: string[], title: string, author: string) {
  const afterToc = tocEndIndex(lines) + 1;
  // Only hunt chapter markers near the front — unbounded search jumped to late
  // "Part I" / poem "I" and dropped earlier stories (Hungry Hearts, Weary Blues).
  const windowEnd = Math.min(lines.length, afterToc + 80);
  const prologue = lines.findIndex(
    (line, index) =>
      index >= afterToc &&
      index < windowEnd &&
      /^(the\s+)?prologue\b/i.test(line.trim()) &&
      followingProse(lines, index + 1),
  );
  const chapterOne = lines.findIndex(
    (line, index) => index >= afterToc && index < windowEnd && isChapterOne(line) && followingProse(lines, index + 1),
  );
  if (prologue >= 0 && (chapterOne < 0 || prologue < chapterOne)) return lines.slice(prologue);
  if (chapterOne >= 0) return lines.slice(chapterOne);
  const firstChapter = lines.findIndex((_, index) => index >= afterToc && index < windowEnd && isBodyChapter(lines, index));
  if (firstChapter >= 0) return lines.slice(firstChapter);
  let i = Math.max(0, afterToc);
  while (i < lines.length && i < afterToc + 50) {
    const line = lines[i] ?? "";
    if (
      isTitleish(line, title, author) ||
      isFrontMatter(line) ||
      isStructuralMark(line) ||
      isChapterHeading(line) ||
      isBoilerplatePara(line)
    ) {
      i += 1;
      continue;
    }
    if (!looksLikeProse(line) && line.length < 80) {
      i += 1;
      continue;
    }
    break;
  }
  return lines.slice(i);
}

function stripTitlePrefix(text: string, title: string, author: string) {
  const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let out = text.trim();
  const t = esc(title.trim());
  const a = esc((author.split(",")[0] ?? "").trim());
  if (t.length > 3) out = out.replace(new RegExp(`^${t}(?:\\s+by\\s+${a})?\\s*`, "i"), "");
  else if (a.length > 3) out = out.replace(new RegExp(`^by\\s+${a}\\s*`, "i"), "");
  return out.trim() || text.trim();
}

function scenesFrom(lines: string[]) {
  const cuts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isBodyChapter(lines, i) && cuts[cuts.length - 1] !== i) cuts.push(i);
  }
  if (cuts.length < 2) {
    const next = [0];
    for (let i = SCENE_SIZE; i < lines.length; i += SCENE_SIZE) next.push(i);
    return next;
  }
  if (cuts[0] !== 0) return [0, ...cuts];
  return cuts;
}

function sceneLabel(slice: string[], index: number) {
  const heading = slice.find((line) => isChapterHeading(line));
  if (heading) {
    const cleaned = heading.replace(/\s+/g, " ").trim();
    const bracket = cleaned.match(/^[\[(]\s*([ivxlcdm\d]{1,8})\s*[\])]$/i);
    if (bracket?.[1]) return `Chapter ${bracket[1].toUpperCase()}`;
    const dashed = cleaned.match(/^[—–\-]+\s*([ivxlcdm]+)\s*[—–\-]+$/i);
    if (dashed?.[1]) return `Chapter ${dashed[1].toUpperCase()}`;
    if (/^[ivxlcdm]+\.?$/i.test(cleaned) || /^\d+\.?$/.test(cleaned)) {
      return `Chapter ${cleaned.replace(/\.$/, "").toUpperCase()}`;
    }
    return cleaned.length > 48 ? cleaned.slice(0, 46).trim() : cleaned;
  }
  return `Chapter ${index + 1}`;
}

export type GutenbergOpts = {
  id: string;
  title: string;
  author: string;
  year: string;
  minutes: number;
  gutenberg: number;
};

export function buildFromRaw(raw: string, opts: GutenbergOpts, maxBreaths: number): Work {
  const body = stripFront(betweenMarks(raw));
  const source = maxBreaths <= OPENING_BREATHS && body.length > OPENING_CHARS ? body.slice(0, OPENING_CHARS) : body;
  let lines = skipFrontMatter(splitSentences(source, maxBreaths + 24), opts.title, opts.author);
  if (lines[0]) lines[0] = stripTitlePrefix(lines[0], opts.title, opts.author);
  lines = lines.filter((line) => line && !isStructuralMark(line)).slice(0, maxBreaths);
  if (lines.length < 4) throw new Error("Nothing to read there.");

  const cuts = scenesFrom(lines);
  const scenes: Work["scenes"] = [];
  const breaths: Work["breaths"] = [];
  for (let i = 0; i < cuts.length; i++) {
    const start = cuts[i] ?? 0;
    const end = cuts[i + 1] ?? lines.length;
    const slice = lines.slice(start, end);
    const prose = slice.filter(isKeepLine);
    if (prose.length < 1) continue;
    const sceneId = `s${scenes.length}`;
    const label = sceneLabel(slice, scenes.length);
    scenes.push({
      id: sceneId,
      title: label,
      place: label,
      reentry: prose[0] ?? "",
      prompt: "A word from this stretch.",
    });
    breaths.push(...breathsFor(sceneId, prose));
  }

  if (breaths.length < 4) {
    const repaired = repairLines(lines, maxBreaths).filter(isKeepLine);
    return {
      id: opts.id,
      title: opts.title,
      author: opts.author,
      year: opts.year,
      note: `Project Gutenberg ${opts.gutenberg}`,
      minutes: opts.minutes || Math.max(20, Math.round(repaired.length / 8)),
      cover: "",
      coverAlt: "",
      scenes: [
        {
          id: "s0",
          title: "Chapter 1",
          place: "Chapter 1",
          reentry: repaired[0] ?? "",
          prompt: "A word from this stretch.",
        },
      ],
      breaths: breathsFor("s0", repaired),
    };
  }

  return {
    id: opts.id,
    title: opts.title,
    author: opts.author,
    year: opts.year,
    note: `Project Gutenberg ${opts.gutenberg}`,
    minutes: opts.minutes || Math.max(20, Math.round(breaths.length / 8)),
    cover: "",
    coverAlt: "",
    scenes,
    breaths,
  };
}

function parseFull(opts: GutenbergOpts) {
  const hit = workCache.get(opts.gutenberg);
  if (hit) return Promise.resolve(hit);
  const waiting = workWait.get(opts.gutenberg);
  if (waiting) return waiting;
  const pending = getText(opts.gutenberg)
    .then((raw) => {
      const work = buildFromRaw(raw, opts, MAX_BREATHS);
      workCache.set(opts.gutenberg, work);
      workWait.delete(opts.gutenberg);
      return work;
    })
    .catch((err) => {
      workWait.delete(opts.gutenberg);
      throw err;
    });
  workWait.set(opts.gutenberg, pending);
  return pending;
}

export async function loadGutenbergOpening(opts: GutenbergOpts): Promise<{ work: Work; complete: boolean }> {
  const full = workCache.get(opts.gutenberg);
  if (full) return { work: full, complete: true };
  const opening = openingCache.get(opts.gutenberg);
  void parseFull(opts);
  if (opening) return { work: opening, complete: false };
  const raw = await getText(opts.gutenberg);
  const cached = workCache.get(opts.gutenberg);
  if (cached) return { work: cached, complete: true };
  const work = buildFromRaw(raw, opts, OPENING_BREATHS);
  const done = workCache.get(opts.gutenberg);
  if (done) return { work: done, complete: true };
  openingCache.set(opts.gutenberg, work);
  return { work, complete: false };
}

export async function loadGutenbergWork(opts: GutenbergOpts): Promise<Work> {
  return parseFull(opts);
}

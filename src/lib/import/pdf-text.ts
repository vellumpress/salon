import { isChapterHeading } from "../sentences.ts";
import { assembleWork } from "./assemble.ts";
import { PDF_TOO_LARGE, SCANNED_PDF } from "./messages.ts";
import type { Work } from "../literature.ts";

export type PdfTextLine = {
  text: string;
  /** Font size in page units. Larger than the body median marks a heading. */
  size?: number;
  italic?: boolean;
};

export type PdfTextPage = {
  lines: PdfTextLine[];
};

export type PdfOutlineHeading = {
  title: string;
  /** 1-based page index into `pages`. */
  page: number;
};

const TEXT_CAP = 1_500_000;

function norm(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function keyOf(text: string) {
  return norm(text).toLowerCase();
}

function stripWrap(text: string) {
  return text.replace(/^_+|_+$/g, "").trim();
}

export function isPageNumber(text: string) {
  const t = norm(stripWrap(text));
  if (!t || t.length > 24) return false;
  if (/^(?:page\s+)?\d{1,4}$/i.test(t)) return true;
  if (/^\d{1,4}\s*(?:\/|of)\s*\d{1,4}$/i.test(t)) return true;
  if (/^[-–—]\s*\d{1,4}\s*[-–—]$/.test(t)) return true;
  return false;
}

function displayLine(line: PdfTextLine) {
  const text = norm(line.text);
  if (!text) return "";
  if (line.italic && !text.includes("_")) return `_${text}_`;
  return text;
}

function medianSize(pages: PdfTextPage[]) {
  const sizes: number[] = [];
  for (const page of pages) {
    for (const line of page.lines) {
      const text = norm(line.text);
      if (!line.size || text.length < 20) continue;
      sizes.push(line.size);
    }
  }
  if (!sizes.length) return 0;
  sizes.sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)] ?? 0;
}

function chromeKeys(pages: PdfTextPage[]) {
  const drop = new Set<string>();
  if (pages.length < 3) return drop;
  const counts = new Map<string, number>();
  for (const page of pages) {
    const lines = page.lines
      .map((line) => keyOf(stripWrap(line.text)))
      .filter((line) => line.length > 0 && line.length <= 80);
    const edges = new Set<string>();
    if (lines[0]) edges.add(lines[0]);
    const last = lines[lines.length - 1];
    if (last && lines.length > 1) edges.add(last);
    for (const edge of edges) counts.set(edge, (counts.get(edge) ?? 0) + 1);
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.4));
  for (const [key, count] of counts) {
    if (count >= threshold) drop.add(key);
  }
  return drop;
}

function isLargeHeading(text: string, size: number | undefined, body: number) {
  const t = norm(stripWrap(text));
  if (t.length < 2 || t.length > 90) return false;
  if (isPageNumber(t)) return false;
  if (isChapterHeading(t)) return true;
  if (!size || !body || size < body * 1.28) return false;
  const words = t.split(/\s+/);
  if (words.length > 14) return false;
  if (/[.!?]["”']*$/.test(t) && words.length > 6) return false;
  return true;
}

function matchesOutline(text: string, title: string) {
  const a = keyOf(stripWrap(text));
  const b = keyOf(title);
  if (!a || !b || b.length < 2) return false;
  if (a === b) return true;
  if (b.length >= 8 && (a.startsWith(b) || b.startsWith(a))) return true;
  return false;
}

function paragraphsFromLines(lines: string[]) {
  const paras: string[] = [];
  let buf = "";
  const flush = () => {
    const t = buf.replace(/[ ]{2,}/g, " ").trim();
    if (t) paras.push(t);
    buf = "";
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (!buf) {
      buf = line;
      continue;
    }
    if (/[-\u00ad\u2010]$/.test(buf) && /^\p{L}/u.test(line)) {
      buf = buf.replace(/[-\u00ad\u2010]$/, "") + line;
      continue;
    }
    const ended = /[.!?…]["”'»)_]*$/u.test(buf);
    const fresh = /^[_“"'\u2018(]*\p{Lu}/u.test(line);
    if (ended && fresh) {
      flush();
      buf = line;
      continue;
    }
    buf = `${buf} ${line}`;
  }
  flush();
  return paras;
}

/**
 * Turn extracted PDF lines into the same scene/breath shape as a bound book.
 * Repeated edge lines and page numbers are dropped. Hyphens at line breaks
 * are joined. Chapters come from the outline, a large font, or a heading
 * line, then a length fallback.
 */
export function workFromPdfPages(input: {
  title: string;
  author: string;
  source: string;
  pages: PdfTextPage[];
  outline?: PdfOutlineHeading[];
  id?: string;
}): Work {
  const pages = input.pages ?? [];
  const chrome = chromeKeys(pages);
  const body = medianSize(pages);
  const outline = (input.outline ?? [])
    .map((item) => ({ title: norm(item.title), page: item.page }))
    .filter((item) => item.title.length > 0 && item.page >= 1);
  const used = new Set<string>();
  const blocks: { title: string; paragraphs: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let hadHeading = false;
  let chars = 0;

  const pushHeading = (title: string) => {
    hadHeading = true;
    current = { title, lines: [] };
    blocks.push({ title, paragraphs: [] });
  };

  const addLine = (text: string) => {
    chars += text.length;
    if (chars > TEXT_CAP) throw new Error(PDF_TOO_LARGE);
    if (!current) {
      current = { title: "", lines: [] };
      blocks.push({ title: "", paragraphs: [] });
    }
    current.lines.push(text);
  };

  const close = () => {
    if (!current) return;
    const block = blocks[blocks.length - 1];
    if (block) block.paragraphs = paragraphsFromLines(current.lines);
    current = null;
  };

  pages.forEach((page, index) => {
    const pageNo = index + 1;
    const lines = page.lines
      .map((line) => ({ ...line, text: displayLine(line) }))
      .filter((line) => {
        if (!line.text) return false;
        const bare = stripWrap(line.text);
        if (isPageNumber(bare)) return false;
        if (chrome.has(keyOf(bare))) return false;
        return true;
      });

    for (const item of outline) {
      if (item.page !== pageNo) continue;
      const mark = keyOf(item.title);
      if (used.has(mark)) continue;
      if (lines.some((line) => matchesOutline(line.text, item.title))) continue;
      close();
      used.add(mark);
      pushHeading(item.title);
    }

    for (const line of lines) {
      const bare = stripWrap(line.text);
      const hit = outline.find((item) => !used.has(keyOf(item.title)) && matchesOutline(bare, item.title));
      if (hit || isLargeHeading(bare, line.size, body)) {
        const title = hit ? hit.title : bare;
        if (hit) used.add(keyOf(hit.title));
        close();
        pushHeading(title);
        continue;
      }
      addLine(line.text);
    }
  });
  close();

  const filled = blocks.filter((block) => block.title || block.paragraphs.length > 0);
  const work = assembleWork({
    id: input.id,
    title: input.title,
    author: input.author,
    source: input.source,
    blocks: filled,
    hadHeading,
  });
  if (!work.breaths.length) throw new Error(SCANNED_PDF);
  return work;
}

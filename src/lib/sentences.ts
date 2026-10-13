const ABBREV = new Set([
  "mr",
  "mrs",
  "ms",
  "sra",
  "srta",
  "sr",
  "dr",
  "prof",
  "jr",
  "st",
  "vs",
  "etc",
  "vol",
  "ch",
  "pp",
  "inc",
  "ltd",
  "mt",
  "ft",
  "gen",
  "col",
  "capt",
  "rev",
  "hon",
  "ave",
  "blvd",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
  "fig",
  "gov",
  "sen",
  "rep",
  "sgt",
  "lt",
  "dept",
  "est",
  "ed",
  "p",
  "n",
  "v",
  "cf",
  "al",
]);

export const CHAPTER_HEADING =
  /^(?:(?:chapter|book|part|act|scene)\s+[ivxlcdm\d]+(?:[.:].{0,80})?|(?:chapter|book|part|act|scene)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten)\b.*)$/i;

function isRoman(value: string) {
  const t = value.replace(/\.$/, "").trim();
  if (!t || t.length > 8) return false;
  return /^(?:m{0,3})(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/i.test(t);
}

function isChapterRoman(value: string) {
  const t = value.replace(/\.$/, "").trim();
  if (!isRoman(t)) return false;
  if (/^[mdc]$/i.test(t)) return false;
  return t.length <= 6;
}

export function isFrontMatter(line: string) {
  const t = line.trim().replace(/[.:]/g, "");
  if (
    /^(the\s+)?(contents|table of contents|preface|introduction|introducing .{0,60}to the reader|foreword|dedication|epigraph|acknowledgments|afterword|title page|list of illustrations|translator'?s (note|preface)|bibliography)$/i.test(
      t,
    )
  ) {
    return true;
  }
  return /^(?:[ivxlcdm]+\.?\s+){2,}[ivxlcdm]+\.?$/i.test(line.trim());
}

export function isStructuralMark(line: string) {
  const t = line.trim();
  if (!t) return true;
  if (/^\[(?:illustration|pg \d+)[^\]]*\]$/i.test(t)) return true;
  if (/^\(word count:\s*\d+\)$/i.test(t)) return true;
  if (/^[\s*•·\-–—._=*#]+$/.test(t)) return true;
  return false;
}

export function isChapterHeading(line: string) {
  const t = line.trim();
  if (t.length < 1 || t.length > 90) return false;
  if (isFrontMatter(t)) return false;
  if (/^[—–\-]+\s*([ivxlcdm]+)\s*[—–\-]+$/i.test(t)) {
    const roman = t.match(/[ivxlcdm]+/i)?.[0] ?? "";
    return isChapterRoman(roman);
  }
  if (/^[\[(]\s*([ivxlcdm\d]{1,8})\s*[\])]$/i.test(t)) {
    const inner = t.replace(/^[\[(]\s*|\s*[\])]$/g, "");
    // Digits in parentheses are usually footnotes (e.g. Hearn), not chapters.
    if (/^\d{1,2}$/.test(inner)) return /^\[/.test(t.trim());
    return isChapterRoman(inner);
  }
  if (/^[ivxlcdm]{1,8}\.?$/i.test(t)) return isChapterRoman(t);
  if (/^\d{1,2}\.$/.test(t)) {
    const n = Number(t);
    return n > 0 && n < 80;
  }
  const titled = t.match(/^([ivxlcdm]+)\.\s+(.+)$/i);
  if (titled?.[1] && isChapterRoman(titled[1])) {
    const rest = titled[2] ?? "";
    if (/^[a-z]/.test(rest)) return false;
    // Reject initials like "L. H." / "L. H. Tōkyō..." (signatures), not chapters.
    if (/^[A-Z]\.?$/.test(rest.trim()) || /^[A-Z]\.\s/.test(rest.trim())) return false;
    if (rest.length > 48) return false;
    if (/[.!?]/.test(rest) && rest.split(/\s+/).length > 6) return false;
    return true;
  }
  return CHAPTER_HEADING.test(t);
}

function isBreakLine(line: string) {
  return isChapterHeading(line) || isFrontMatter(line) || isStructuralMark(line);
}

export function isChapterOne(line: string) {
  const t = line.trim();
  if (!isChapterHeading(t)) return false;
  if (/^(?:chapter|book|part|act|scene)\s+(?:one|1|i)(?:[\s.:]|$)/i.test(t)) {
    if (/^(?:chapter|book|part|act|scene)\s+(?:ii|iii|iv|ix|xi|xl|2|3)\b/i.test(t)) return false;
    return true;
  }
  if (/^(?:i|1)(?:\.|$)/i.test(t)) return true;
  if (/^[—–\-]+\s*i\s*[—–\-]+$/i.test(t)) return true;
  if (/^[\[(]\s*(?:1|i)\s*[\])]$/i.test(t)) return true;
  return false;
}

export function unwrapProse(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, " ");
  const paras: string[] = [];
  for (const para of normalized.split(/\n{2,}/)) {
    const lines = para
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) continue;
    let buf = "";
    const flush = () => {
      const t = decohyphen(buf);
      if (t) paras.push(t);
      buf = "";
    };
    for (const line of lines) {
      if (isBreakLine(line)) {
        flush();
        const t = decohyphen(line);
        if (t) paras.push(t);
        continue;
      }
      if (!buf) {
        buf = line;
      } else if (/[-\u00ad\u2010-\u2014]$/.test(buf) && /^\p{L}/u.test(line)) {
        buf = buf.replace(/[-\u00ad\u2010-\u2014]$/, "") + line;
      } else {
        buf = `${buf} ${line}`;
      }
    }
    flush();
  }
  return paras.join("\n\n");
}

function decohyphen(text: string) {
  return text.replace(/(\p{L})-\s+(\p{L})/gu, "$1$2").replace(/[ ]{2,}/g, " ").trim();
}

function isAbbreviation(word: string, after: string) {
  const bare = word.replace(/["”']+$/, "");
  if (!/\.$/.test(bare)) return false;
  const core = bare.slice(0, -1).replace(/\./g, "").toLowerCase();
  if (/^[A-Z]$/.test(bare.slice(0, -1))) return true;
  if (core === "no") return /^\s*\d/.test(after);
  if (ABBREV.has(core)) return true;
  if (/^\d+$/.test(core) && /^\s*\d/.test(after)) return true;
  return false;
}

/**
 * The word the reader abbreviation check should see. A leading quote is not
 * part of the title, and neither is a word glued on by an em dash, en dash,
 * or a run of hyphens: back—Dr. is still Dr. A single hyphen stays, so
 * hall-like is one word. The importer keeps the older token, so stored
 * breaths do not move.
 */
function abbreviationToken(word: string) {
  const segments = word.split(/(?:\u2014|\u2013|-{2,})+/);
  return (segments[segments.length - 1] ?? word).replace(/^["“”'‘’]+/, "");
}

export type SentenceSpan = { start: number; end: number };

type QuoteState = {
  curlyDouble: boolean;
  curlySingle: boolean;
  straightDouble: boolean;
  straightSingle: boolean;
};

/** A leading apostrophe, not an opening quote: 'tis, 'em, 'gainst. */
const LEADING_APOSTROPHE =
  /^(?:tis|twas|twere|twill|twould|twixt|em|gainst|neath|mid|midst|cause|ere|round)\b/i;

function isLetter(ch: string) {
  return /\p{L}/u.test(ch);
}

function quotesOpen(state: QuoteState) {
  return state.curlyDouble || state.curlySingle || state.straightDouble || state.straightSingle;
}

function isStraightApostrophe(text: string, index: number) {
  const prev = index > 0 ? text[index - 1]! : "";
  const next = index + 1 < text.length ? text[index + 1]! : "";
  if (isLetter(prev) && isLetter(next)) return true;
  if (/\d/.test(prev)) return true;
  if (!isLetter(prev) && LEADING_APOSTROPHE.test(text.slice(index + 1))) return true;
  return false;
}

function feedQuote(state: QuoteState, text: string, index: number) {
  const ch = text[index]!;
  if (ch === "\u201C") {
    state.curlyDouble = true;
    return;
  }
  if (ch === "\u201D") {
    state.curlyDouble = false;
    return;
  }
  if (ch === "\u2018") {
    state.curlySingle = true;
    return;
  }
  if (ch === "\u2019") {
    if (state.curlySingle) state.curlySingle = false;
    return;
  }
  if (ch === '"') {
    const prev = index > 0 ? text[index - 1]! : "";
    if (/\d/.test(prev)) return;
    state.straightDouble = !state.straightDouble;
    return;
  }
  if (ch === "'") {
    if (isStraightApostrophe(text, index)) return;
    state.straightSingle = !state.straightSingle;
  }
}

function isStop(ch: string) {
  return ch === "." || ch === "!" || ch === "?" || ch === "\u2026";
}

function closesOpenQuote(state: QuoteState, text: string, index: number) {
  const ch = text[index]!;
  if (ch === "\u201D" && state.curlyDouble) return true;
  if (ch === "\u2019" && state.curlySingle) return true;
  if (ch === '"' && state.straightDouble) return true;
  if (ch === "'" && state.straightSingle && !isStraightApostrophe(text, index)) return true;
  return false;
}

/**
 * Sentence ranges in the original string. Slices joined back together are
 * the same characters; nothing is rewritten, dropped, or re-hyphenated.
 * A break needs the same abbreviation and capital-after-period rules as
 * the importer, and it is refused while a double or single quote is still
 * open, including a single quote nested inside a double. Taps follow that
 * closed slice. Display blocks pass `"in-quotes"` so a quotation taller
 * than a third of the screen can break at those same sentence ends.
 * Mr., Mrs., Dr., and St. are abbreviations even when a quote mark sits on
 * the front of the word, or when an em dash, en dash, or double hyphen
 * glues the previous word to the title. The space after a break stays on
 * the earlier slice, so the next one does not start with a blank.
 */
export function sentenceSpans(text: string, mode: "closed" | "in-quotes" = "closed"): SentenceSpan[] {
  if (!text) return [{ start: 0, end: 0 }];
  const spans: SentenceSpan[] = [];
  const state: QuoteState = {
    curlyDouble: false,
    curlySingle: false,
    straightDouble: false,
    straightSingle: false,
  };
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (isStop(ch)) {
      let end = i + 1;
      const probe: QuoteState = { ...state };
      while (end < text.length && closesOpenQuote(probe, text, end)) {
        feedQuote(probe, text, end);
        end += 1;
      }
      if (mode === "in-quotes" || !quotesOpen(probe)) {
        const after = text.slice(end);
        const before = text.slice(start, end);
        const word = (before.match(/(\S+)$/) ?? [])[1] ?? "";
        const follows = after.length === 0 || /^\s+($|[A-Z“"‘(\[]|\d)/.test(after);
        if (!isAbbreviation(abbreviationToken(word), after) && follows && before.trim().length > 1) {
          while (end < text.length && /\s/.test(text[end]!)) end += 1;
          spans.push({ start, end });
          for (let k = i; k < end; k += 1) feedQuote(state, text, k);
          start = end;
          i = end;
          continue;
        }
      }
    }
    feedQuote(state, text, i);
    i += 1;
  }
  if (start < text.length) {
    const tail = text.slice(start);
    if (spans.length > 0 && tail.trim().length === 0) {
      spans[spans.length - 1]!.end = text.length;
    } else {
      spans.push({ start, end: text.length });
    }
  }
  if (spans.length === 0) spans.push({ start: 0, end: text.length });
  return spans;
}

export type QuoteInterval = { start: number; end: number };

/**
 * Each quotation, from its opening mark through its closer.
 * A single nested inside a double is its own interval, and so is the double.
 * An unclosed mark runs to the end of the text.
 */
export function quoteIntervals(text: string): QuoteInterval[] {
  const state = freshQuotes();
  const open: { kind: keyof QuoteState; start: number }[] = [];
  const ranges: QuoteInterval[] = [];
  const kinds = ["curlyDouble", "curlySingle", "straightDouble", "straightSingle"] as const;
  for (let i = 0; i < text.length; i += 1) {
    const prev: QuoteState = { ...state };
    feedQuote(state, text, i);
    for (const kind of kinds) {
      if (!prev[kind] && state[kind]) {
        open.push({ kind, start: i });
        continue;
      }
      if (prev[kind] && !state[kind]) {
        for (let k = open.length - 1; k >= 0; k -= 1) {
          if (open[k]!.kind !== kind) continue;
          const start = open[k]!.start;
          open.splice(k, 1);
          ranges.push({ start, end: i + 1 });
          break;
        }
      }
    }
  }
  for (const item of open) ranges.push({ start: item.start, end: text.length });
  return ranges;
}

function freshQuotes(): QuoteState {
  return {
    curlyDouble: false,
    curlySingle: false,
    straightDouble: false,
    straightSingle: false,
  };
}

/**
 * Display breaks that still fall while a quote is open. The end of a
 * quotation is not one of these: closers that ride with the punctuation
 * are already inside the earlier slice.
 */
export function interiorQuoteBreaks(text: string): number {
  const spans = sentenceSpans(text);
  if (spans.length <= 1) return 0;
  const bounds = new Set<number>();
  for (let i = 0; i < spans.length - 1; i += 1) bounds.add(spans[i]!.end);
  const state = freshQuotes();
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (bounds.has(i) && quotesOpen(state)) count += 1;
    feedQuote(state, text, i);
  }
  if (bounds.has(text.length) && quotesOpen(state)) count += 1;
  return count;
}

/**
 * Breaks the older splitter would make while a quote is still open.
 * That splitter is `.!?…` plus a capital, and it ignores quotes. A closer
 * that belongs to the punctuation is consumed before the count, so the
 * end of a quotation is not an interior break.
 */
export function legacyInteriorQuoteBreaks(text: string): number {
  if (!text) return 0;
  const re = /[.!?…]["”']*/g;
  const state = freshQuotes();
  let count = 0;
  let start = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const stop = match.index;
    while (cursor < stop) {
      feedQuote(state, text, cursor);
      cursor += 1;
    }
    const end = stop + match[0].length;
    const before = text.slice(start, end);
    const after = text.slice(end);
    const word = (before.match(/(\S+)$/) ?? [])[1] ?? "";
    const follows = after.length === 0 || /^\s+($|[A-Z“"‘(\[]|\d)/.test(after);
    const breaks = !isAbbreviation(word, after) && follows && before.trim().length > 1;
    const probe = { ...state };
    let closeAt = stop + 1;
    while (closeAt < text.length && closesOpenQuote(probe, text, closeAt)) {
      feedQuote(probe, text, closeAt);
      closeAt += 1;
    }
    if (breaks && quotesOpen(probe)) count += 1;
    if (breaks) start = end;
    while (cursor < end) {
      feedQuote(state, text, cursor);
      cursor += 1;
    }
  }
  return count;
}

function isNoise(text: string) {
  const t = text.trim();
  if (isChapterHeading(t) || isFrontMatter(t)) return false;
  if (t.length < 2) return true;
  return isStructuralMark(t);
}

function peelHeading(para: string): { heading: string | null; rest: string } {
  const p = para.trim();
  if (isChapterHeading(p)) return { heading: p, rest: "" };
  const match = p.match(
    /^(?:(?:chapter|book|part|act|scene)\s+[ivxlcdm\d]+|[ivxlcdm]{1,8}\.|[—–\-]+\s*[ivxlcdm]+\s*[—–\-]+|[\[(]\s*[ivxlcdm\d]{1,8}\s*[)\]])\s+(.+)$/i,
  );
  if (!match?.[1]) return { heading: null, rest: p };
  const rest = match[1].trim();
  if (rest.length < 12) return { heading: null, rest: p };
  const heading = p.slice(0, p.length - rest.length).trim();
  return { heading, rest };
}

export function splitSentences(text: string, max = Number.POSITIVE_INFINITY) {
  const chunks: string[] = [];
  for (const para of unwrapProse(text).split(/\n{2,}/)) {
    const raw = para.trim();
    if (raw.length < 1) continue;
    const { heading, rest } = peelHeading(raw);
    if (heading && !isNoise(heading)) chunks.push(heading);
    const p = rest;
    if (!p) continue;
    if (isChapterHeading(p) || isFrontMatter(p) || isNoise(p)) {
      if (!isNoise(p) && !isFrontMatter(p)) chunks.push(p);
      continue;
    }
    let start = 0;
    const re = /[.!?…]["”']*/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(p))) {
      const end = match.index + match[0].length;
      const before = p.slice(start, end);
      const after = p.slice(end);
      const word = (before.match(/(\S+)$/) ?? [])[1] ?? "";
      if (isAbbreviation(word, after)) continue;
      if (after.length > 0 && !/^\s+($|[A-Z“"‘(\[]|\d)/.test(after)) continue;
      const sentence = before.trim();
      if (sentence.length > 1 && !isNoise(sentence)) chunks.push(sentence);
      start = end;
      if (chunks.length >= max) break;
    }
    if (chunks.length >= max) break;
    const tail = p.slice(start).trim();
    if (tail.length > 1 && !isNoise(tail)) chunks.push(tail);
    if (chunks.length >= max) break;
  }
  return mergeFragments(chunks).slice(0, max);
}

function joinParts(left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (/[-\u00ad]$/.test(a) && /^\p{L}/u.test(b)) return decohyphen(a.replace(/[-\u00ad]$/, "") + b);
  return decohyphen(`${a} ${b}`);
}

function mergeFragments(chunks: string[]) {
  const out: string[] = [];
  for (const raw of chunks) {
    let t = raw.trim();
    if (!t || isNoise(t)) continue;
    const lead = t.match(/^[”']+\s*/);
    if (lead && out.length) {
      out[out.length - 1] = `${out[out.length - 1]}${lead[0].trim() ? ` ${lead[0].trim()}` : ""}`;
      t = t.slice(lead[0].length).trim();
      if (!t) continue;
    }
    const prev = out[out.length - 1];
    if (prev && shouldMerge(prev, t)) {
      out[out.length - 1] = joinParts(prev, t);
    } else {
      out.push(t);
    }
  }
  return out;
}

function looksLikeTitle(text: string) {
  const t = text.trim();
  if (t.length < 2 || t.length > 80) return false;
  if (/[.!?]$/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 10) return false;
  return /^[\p{Lu}"“_]/u.test(t);
}

function shouldMerge(prev: string, next: string) {
  if (isChapterHeading(prev) || isChapterHeading(next)) return false;
  if (isFrontMatter(prev) || isFrontMatter(next)) return false;
  if (/^by\b/i.test(prev) && next.length > 24) return false;
  if (looksLikeTitle(prev) && looksLikeTitle(next)) return false;
  if (looksLikeTitle(prev) && /^[\p{Lu}"“]/u.test(next) && next.length > 30) return false;
  if (/[-\u00ad]$/.test(prev)) return true;
  if (!/[.!?…]["”']?$/.test(prev)) return true;
  if (/^["“'\[]?[a-zà-öø-ÿ]/.test(next)) return true;
  if (prev.length < 8) return true;
  if (/^[A-Z][a-z]{0,3}\.$/.test(prev) && prev.length < 16) return true;
  if (/^["“'\[]?[.…]/.test(next) && next.length < 24) return true;
  return false;
}

export function repairLines(lines: string[], max = Number.POSITIVE_INFINITY) {
  const glued: string[] = [];
  for (const raw of lines) {
    const t = decohyphen(raw.replace(/\s+/g, " ").trim());
    if (!t || isNoise(t)) continue;
    const prev = glued[glued.length - 1];
    if (prev && shouldMerge(prev, t)) {
      glued[glued.length - 1] = joinParts(prev, t);
    } else {
      glued.push(t);
    }
  }
  const out: string[] = [];
  for (const piece of glued) {
    if (isChapterHeading(piece) || isFrontMatter(piece)) {
      out.push(piece);
      continue;
    }
    out.push(...splitSentences(piece));
  }
  return mergeFragments(out).slice(0, max);
}

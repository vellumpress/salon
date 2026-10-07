/**
 * Text gate: book breaths carry the book, not the digitizer's paperwork.
 *
 * Transcriber's notes, "Alterations to the text", typo-fix lists, scan
 * credits ("Images provided by … via Wikipedia"), e-text editor notes and
 * "[End of Text]" markers came in with the source files. Readers saw them as
 * breaths. They are not the author's or the printed edition's words.
 *
 * Author's notes, printed errata, translator's notes and printed footnotes
 * are printed-edition matter and are not this gate.
 *
 * The back-matter gates below cover what the printer and publisher added
 * around the book: copyright and imprint lines read as breaths, publishers'
 * ads, printer lines and catalogue pages after the end, and page-number
 * indexes (index of first lines, name indexes) at the back.
 *
 * Allowlist entries are `textId#breathId` with the reason beside them. Each
 * one is a breath that matches a pattern and was left on purpose. Do not
 * widen the patterns to skip a hit. Remove the entry when the breath is fixed.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const TEXT_APPARATUS_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "transcriber's note", pattern: /\btranscribers?['’]?s?['’]?\s+(?:specific\s+)?(?:notes?|endnotes)\b/i },
  { name: "added by transcribers", pattern: /\badded by (?:the )?transcribers?\b/i },
  { name: "in this transcription", pattern: /\bin this (?:transcription|e-?text|e-?book|electronic (?:edition|text))\b/i },
  { name: "transcribed from the edition", pattern: /\b(?:this|the) text was transcribed from\b/i },
  { name: "alterations to the text", pattern: /\balterations to the text\b/i },
  { name: "notes on the text", pattern: /^\s*notes on the text:?\s*$/i },
  { name: "provided by (scan credit)", pattern: /^\s*(?:interior\s+)?(?:images?|illustrations?|scans?|page images?)\s+(?:were\s+)?(?:provided|supplied|made available)\s+by\b/i },
  { name: "Wikipedia/Wikimedia", pattern: /\bwiki(?:pedia|media)\b/i },
  { name: "Internet Archive", pattern: /\binternet archive\b|\barchive\.org\b/i },
  { name: "HathiTrust", pattern: /\bhathi\s?trust\b/i },
  { name: "Google Books", pattern: /\bgoogle books\b|\bbooks\.google\b/i },
  { name: "Project Gutenberg", pattern: /\bproject gutenberg\b|\bgutenberg\.(?:org|net)\b|\bpglaf\b|\bpgdp\b/i },
  { name: "distributed proofreaders", pattern: /\bdistributed proofread(?:ers|ing)\b|\bonline distributed\b/i },
  { name: "produced by (credit line)", pattern: /^\s*(?:this (?:e-?text|e-?book|file) was )?produced by\b/i },
  { name: "e-text", pattern: /\be-?texts?\b/i },
  { name: "e-book", pattern: /\be-?books?\b/i },
  { name: "end-of-text marker", pattern: /\[\s*end of [^\]]{1,80}\]|~{2,}\s*end of text\s*~{2,}/i },
  { name: "ligatured characters", pattern: /\bligatured\b/i },
  { name: "typo-fix list entry", pattern: /^\s*\[(?:chapter|ch\.|page|p\.|book|part|vol\.)\s+[\w.]+\]\s/i },
  { name: "quoted reading changed to", pattern: /["”_]\s+(?:changed|corrected)\s+to\s+["“_]/i },
  { name: "on page N … changed", pattern: /\bon page \d+\b.{0,120}\b(?:changed|corrected)\b/i },
  { name: "inconsistencies preserved", pattern: /\binconsistenc(?:y|ies)\b.{0,160}\b(?:have|has) been (?:preserved|retained|left)\b/i },
  { name: "typesetter error retained", pattern: /\b(?:obvious\s+)?(?:typesetter|typographical|printer['’]?s?)\s+errors?\b.{0,80}\b(?:has|have) been (?:retained|corrected|fixed)\b/i },
  { name: "transcriber sign-off in brackets", pattern: /\btranscribers?['’]?s?\s*\)/i },
  { name: "TN-marked note", pattern: /^\s*\(?TN:\s/ },
  { name: "change list (French)", pattern: /^\s*liste des modifications\b/i },
  { name: "digitizer signature", pattern: /\bA(?:lan)?\.?\s+(?:R\.\s+)?Light\b[.,]?\s.{0,40}\b(?:19|20)\d\d\b|\bA\.\s?L\.,\s+(?:19|20)\d\d\b/ },
];

/** Documented exceptions: `textId#breathId` → reason. */
export const TEXT_APPARATUS_ALLOWLIST: Readonly<Record<string, string>> = {
  "the-beautiful-and-damned#s2-843":
    "the transcriber's bracket stands in for a printed mirror-image sign inside Fitzgerald's sentence (“found and translated the [note] in a white semicircle of letters”); without it the sentence reads “translated the in a white semicircle”, so it stays until the sign itself can be restored",
  "the-rubaiyat-of-omar-khayyam#s173-172":
    "“[Greek phrase deleted from etext]” sits inside FitzGerald's quoted note; the Greek itself is missing, so there is nothing to restore it with",
};

type Hit = { key: string; pattern: string; text: string };

function scanFolder(folder: "texts" | "openings", hits: Hit[]) {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const dir = join(here, folder);
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const data = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      breaths?: { id?: string; text?: string }[];
    };
    const id = name.slice(0, -5);
    for (const breath of data.breaths ?? []) {
      const text = breath?.text;
      if (typeof text !== "string") continue;
      for (const { name: pattern, pattern: re } of TEXT_APPARATUS_PATTERNS) {
        if (re.test(text)) {
          hits.push({ key: `${id}#${breath.id}`, pattern, text: text.slice(0, 160) });
        }
      }
    }
  }
}

let cached: Hit[] | undefined;
function allHits(): Hit[] {
  if (!cached) {
    cached = [];
    scanFolder("texts", cached);
    scanFolder("openings", cached);
  }
  return cached;
}

test("no shipped text carries transcriber or source apparatus as a breath", () => {
  const hits = allHits();
  const unexpected = hits.filter((hit) => !(hit.key in TEXT_APPARATUS_ALLOWLIST));
  assert.deepEqual(unexpected, []);
});

test("every allowlist entry still matches, and has a reason", () => {
  const matched = new Set(allHits().map((hit) => hit.key));
  for (const [key, reason] of Object.entries(TEXT_APPARATUS_ALLOWLIST)) {
    assert.ok(reason.trim().length > 20, `${key} needs a reason`);
    assert.ok(matched.has(key), `${key} no longer matches; drop it from the allowlist`);
  }
});

test("patterns catch the apparatus this gate was written for", () => {
  const samples = [
    "Alterations to the text: Reformat TOC.",
    "Interior images provided by the British Library via Wikipedia.",
    "Ligatured Latin characters have been modernized.",
    "[End of Text]",
    "[End of original text.]",
    "[Chapter IX] Change “his yellow fangs gleamed _though_ his parted lips” to _through_.",
    "Transcriber’s note: There is no section number 7 in Book III.",
    "Transcribers Notes:",
    "Etext editor’s translation:",
    "This has been corrected in this transcription.]",
    "“But that's neither here not there.” changed to “But that's neither here nor there.”",
    "Note: On page 325, “the other two were the spy A----n” changed to “the other two were the spy A--v”",
    "Produced by the Online Distributed Proofreading Team",
    "This text was transcribed from the Second Edition, which was first printed in June of 1889.",
    "Alan R. Light. Monroe, North Carolina, July, 1997.",
    "ADDENDA (added by transcribers)",
  ];
  for (const sample of samples) {
    assert.ok(
      TEXT_APPARATUS_PATTERNS.some(({ pattern }) => pattern.test(sample)),
      `no pattern caught: ${sample}`,
    );
  }
  const printed = [
    "THE END",
    "Printed by Spottiswoode, Ballantyne & Co.",
    "[Footnote 5: The above is a very inefficient and rather absurd translation of the French.--Translator.]",
    "Thus, down to the time of Gutenberg, architecture is the principal writing.",
    "When she had read it over she changed it to the other word, and was content.",
  ];
  for (const line of printed) {
    assert.ok(
      !TEXT_APPARATUS_PATTERNS.some(({ pattern }) => pattern.test(line)),
      `pattern too wide: ${line}`,
    );
  }
});

/* ------------------------------------------------------------------------ */
/* Back matter: publishers' and printers' pages, back indexes, copyright.    */
/* ------------------------------------------------------------------------ */

type Book = { id: string; folder: "texts" | "openings"; breaths: { id: string; text: string }[] };

let books: Book[] | undefined;
function allBooks(): Book[] {
  if (books) return books;
  const here = fileURLToPath(new URL(".", import.meta.url));
  const out: Book[] = [];
  for (const folder of ["texts", "openings"] as const) {
    const dir = join(here, folder);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const data = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
        breaths?: { id?: string; text?: string }[];
      };
      const breaths = (data.breaths ?? [])
        .filter((b) => typeof b?.text === "string" && typeof b?.id === "string")
        .map((b) => ({ id: b.id as string, text: b.text as string }));
      out.push({ id: name.slice(0, -5), folder, breaths });
    }
  }
  books = out;
  return out;
}

/** "THE END", "FINIS", "FIN", "End of Volume I", "Here ends …" on a breath of its own. */
export const END_MARKER =
  /^\W*(?:the\s+end|finis|fin|end\s+of\s+(?:the\s+)?(?:volume|vol\.|book|part)\b.{0,40}|here\s+ends\b.{0,80})\W*$/i;

const PRICE_US = /\$\s?\d+(?:\.\d\d)?\b/;
const PRICE_UK = /\b\d+\s?\*?s\.\*?\s?(?:\d+\s?\*?d\.\*?\s?)?(?:net\b|each\b|$)|\b\d+\/(?:\d+|-)\s*net\b/i;
const BINDING = /\b(?:net|cloth|boards|buckram|leather|postpaid|post\s*free)\b/i;

/** Publisher and printer matter: what a back-of-book ad or colophon line looks like. */
export const BACK_MATTER_PATTERNS: { name: string; test: (text: string) => boolean }[] = [
  {
    name: "price line",
    // A price in a short catalogue line, or next to a binding/net. Prose that mentions dollars is long and has neither.
    test: (t) => (PRICE_US.test(t) || PRICE_UK.test(t)) && (t.length <= 160 || BINDING.test(t)),
  },
  {
    name: "book format",
    test: (t) => /\b(?:crown|demy|post|fcap\.?|foolscap|royal|cr\.)\s+(?:8vo|4to|16mo)\b|\b(?:8vo|12mo|16mo)\b/i.test(t),
  },
  {
    name: "printer line",
    test: (t) =>
      /\bprinted\s+(?:by|at\s+the|in\s+(?:great\s+britain|the\s+united\s+states|u\.?\s?s\.?\s?a))\b|\belectrotyped\b|\bprinters?,\s+[A-Z]|\bprinters\s+to\s+(?:his|her)\s+majesty\b/i.test(t),
  },
  {
    name: "publisher's list",
    test: (t) =>
      /\b(?:poetry|books|novels|works)\s+by\s+the\s+same\s+author\b|^\W*by\s+the\s+same\s+author\W*$|\bprices?\s+indicated\s+in\s+this\s+catalogue\b|\bcomplete\s+catalogues?\b|\bcatalogue\s+of\s+(?:books|publications|new\s+books)\b|\badvertisements\s+of\s+(?:books|other\s+books|the)\b|\bfollowing\s+pages\s+contain\s+advertisements\b|\bmodern\s+library\s+of\s+the\s+world\b|\bborzoi\s+(?:books|novels)\b/i.test(t),
  },
];

/**
 * Where publishers' pages would sit: everything after the last end marker
 * (within the last 400 breaths), or the last 40 breaths when the book has none.
 * Footnotes and author's notes after THE END stay; they do not look like ads.
 */
function backMatterWindow(breaths: Book["breaths"]) {
  const n = breaths.length;
  for (let i = n - 1; i >= Math.max(0, n - 400); i--) {
    if (END_MARKER.test(breaths[i].text)) return breaths.slice(i + 1);
  }
  return breaths.slice(Math.max(0, n - 40));
}

/** Book-level and breath-level exceptions for the back-matter gates. */
export const BACK_MATTER_ALLOWLIST: Readonly<Record<string, string>> = {};

/** A page-number index entry: "Æg′-ir, the sea-god, 102, 132." or a dotted leader "…… 30". */
const INDEX_ENTRY = /(?:,\s*|\s)\d{1,4}(?:[-–]\d{1,4})?\.?\s*$|\.{4,}\s*\d{1,4}\s*$/;

export const BACK_INDEX_ALLOWLIST: Readonly<Record<string, string>> = {
  "the-songs-of-bilitis#back-index":
    "the printed table of songs carries Louÿs's own “not translated” markers, and the translator's closing note (“The Songs marked * …”, signed M. S. B.) explains them; cutting the table would orphan that note",
};

/** "Copyright, 1920, by", "Copyright by Harper and Brothers.", "All rights reserved". */
export const COPYRIGHT_LINE = /^\W*copyright\b|\bcopyright,?\s+(?:\d{4}|by)\b|\ball rights reserved\b/i;

export const COPYRIGHT_ALLOWLIST: Readonly<Record<string, string>> = {
  "cousin-betty#s55-38":
    "Balzac's own joke: the lovers' talk “may be ticketed, like certain lengthy literary efforts of our day, “*All rights reserved*,” for it cannot be reproduced” — story text, not an imprint",
};

test("no publisher's ad, printer line or catalogue page after the end of a book", () => {
  const unexpected: string[] = [];
  for (const book of allBooks()) {
    if (book.folder !== "texts") continue;
    for (const breath of backMatterWindow(book.breaths)) {
      const hit = BACK_MATTER_PATTERNS.find(({ test: t }) => t(breath.text));
      if (!hit) continue;
      const key = `${book.id}#${breath.id}`;
      if (key in BACK_MATTER_ALLOWLIST) continue;
      unexpected.push(`${key} [${hit.name}] ${breath.text.slice(0, 120)}`);
    }
  }
  assert.deepEqual(unexpected, []);
});

test("no page-number index (index of first lines, name index) closes a book", () => {
  const unexpected: string[] = [];
  for (const book of allBooks()) {
    if (book.folder !== "texts") continue;
    const tail = book.breaths.slice(-12);
    if (tail.length < 8) continue;
    const entries = tail.filter((b) => INDEX_ENTRY.test(b.text)).length;
    if (entries < 8) continue;
    const key = `${book.id}#back-index`;
    if (key in BACK_INDEX_ALLOWLIST) continue;
    unexpected.push(`${key} (${entries}/12) ${tail[tail.length - 1].text.slice(0, 100)}`);
  }
  assert.deepEqual(unexpected, []);
});

test("no copyright or rights line reads as a breath", () => {
  const unexpected: string[] = [];
  for (const book of allBooks()) {
    for (const breath of book.breaths) {
      if (!COPYRIGHT_LINE.test(breath.text)) continue;
      const key = `${book.id}#${breath.id}`;
      if (key in COPYRIGHT_ALLOWLIST) continue;
      unexpected.push(`${book.folder}/${key} ${breath.text.slice(0, 120)}`);
    }
  }
  assert.deepEqual(unexpected, []);
});

test("back-matter allowlist entries still match, and have a reason", () => {
  const all = allBooks().filter((b) => b.folder === "texts");
  for (const [key, reason] of Object.entries(BACK_MATTER_ALLOWLIST)) {
    assert.ok(reason.trim().length > 20, `${key} needs a reason`);
    const [id, breathId] = key.split("#");
    const book = all.find((b) => b.id === id);
    const breath = book && backMatterWindow(book.breaths).find((b) => b.id === breathId);
    assert.ok(breath && BACK_MATTER_PATTERNS.some(({ test: t }) => t(breath.text)), `${key} no longer matches`);
  }
  for (const [key, reason] of Object.entries(BACK_INDEX_ALLOWLIST)) {
    assert.ok(reason.trim().length > 20, `${key} needs a reason`);
    const book = all.find((b) => b.id === key.split("#")[0]);
    const tail = book?.breaths.slice(-12) ?? [];
    assert.ok(tail.filter((b) => INDEX_ENTRY.test(b.text)).length >= 8, `${key} no longer matches`);
  }
  for (const [key, reason] of Object.entries(COPYRIGHT_ALLOWLIST)) {
    assert.ok(reason.trim().length > 20, `${key} needs a reason`);
    const [id, breathId] = key.split("#");
    const hit = allBooks().some(
      (b) => b.id === id && b.breaths.some((x) => x.id === breathId && COPYRIGHT_LINE.test(x.text)),
    );
    assert.ok(hit, `${key} no longer matches`);
  }
});

test("back-matter patterns catch what they were written for, and spare the book", () => {
  const caught = [
    "Copyright, 1920, by",
    "Copyright by Harper and Brothers.",
    "*All rights reserved*",
  ];
  for (const line of caught) assert.ok(COPYRIGHT_LINE.test(line), `copyright gate missed: ${line}`);
  const ads = [
    "Printed in Great Britain by R. & R. Clark, Limited, Edinburgh.",
    "*Printed by* R. & R. CLARK, LIMITED, *Edinburgh*.",
    "Cambridge: Electrotyped and Printed by Welch, Bigelow, & Co.",
    "Cloth, 12mo, $1.25 net; postpaid, $1.36",
    "Lover's Gift and Crossing. Cr. 8vo. 5s. net.",
    "Demy 8vo, 10*s.* 6*d.*",
    "The following pages contain advertisements of books by the same author",
    "Poetry by the Same Author",
    "Modern Library of the World's Best Books",
  ];
  for (const line of ads) {
    assert.ok(BACK_MATTER_PATTERNS.some(({ test: t }) => t(line)), `ad gate missed: ${line}`);
  }
  const book = [
    "THE END",
    "He employed four men at $10 a month to go and look for all kinds of peculiar things ; and he paid them well for every curious creature they brought in, so that in time his collection filled three rooms of the house and the servants grew afraid to sweep them.",
    "[Footnote 5: The above is a very inefficient and rather absurd translation of the French.--Translator.]",
    "This Preface is now printed here for the first time in a collected edition of the works of Anne Brontë.",
    "Now it so happen’d, in the catalogue",
  ];
  for (const line of book) {
    assert.ok(!BACK_MATTER_PATTERNS.some(({ test: t }) => t(line)), `ad gate too wide: ${line}`);
    assert.ok(!COPYRIGHT_LINE.test(line), `copyright gate too wide: ${line}`);
  }
  assert.ok(END_MARKER.test("THE END."));
  assert.ok(END_MARKER.test("End of Volume I"));
  assert.ok(!END_MARKER.test("The end of the matter was that he went home."));
  assert.ok(INDEX_ENTRY.test("You say you'll kiss me, and I thank you for it, 394."));
  assert.ok(INDEX_ENTRY.test("A friend should warn a friend of ill ............................. 30"));
  assert.ok(
    TEXT_APPARATUS_PATTERNS.some(({ pattern }) =>
      pattern.test("in our translation, (i.e. the Authorised “King James” Version Transcriber) “My heart is inditing”"),
    ),
    "bare “Transcriber)” sign-off must be caught",
  );
  assert.ok(
    TEXT_APPARATUS_PATTERNS.some(({ pattern }) => pattern.test("TN: The crest was a small emblem worn on top of a knight’s helmet.")),
    "“TN:” notes must be caught",
  );
});

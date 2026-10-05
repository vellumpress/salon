/**
 * Soft-launch gate. Reader-facing copy must not carry pipeline meta.
 *
 * Breaths of public-domain books keep ordinary words (a character named
 * Mike, “featured” in prose, an art salon, parchment vellum, “reseated”).
 * Those are not this gate. The patterns below are the leaked pipeline
 * phrases, plus name tokens on editorial copy only (intros, blurbs,
 * pitches, prefaces, bound notes).
 *
 * Allowlist is empty on purpose. A real literary collision belongs here
 * as `file#surface: pattern`, with the reason beside it — do not widen
 * the patterns to skip a hit.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { blurbFor } from "./blurbs.ts";
import { PREFACES, prefaceFor } from "./prefaces.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";
import { PITCHES } from "./pitches.ts";
import { RITUAL_PITCHES } from "./rituals.ts";
import { SHELF } from "./shelf.ts";
import { readerIntro } from "../reader-intro.ts";
import type { Work } from "../works.ts";
import { scanStaffText, stripCatalogBookSource } from "../../../scripts/strip-bind-notes.mjs";

/** Documented exceptions. Prefer zero. */
export const PIPELINE_LEAK_ALLOWLIST: readonly string[] = [];

/** Phrases that are pipeline even inside a story breath. */
const BREATH_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "A24", pattern: /\bA24\b/ },
  { name: "No Featured", pattern: /\bNo Featured\b/i },
  { name: "Featured placement", pattern: /\bFeatured placement\b/i },
  { name: "Never Featured", pattern: /\bNever Featured\b/ },
  { name: "fidelity lock", pattern: /fidelity lock/i },
  { name: "Glam reseat", pattern: /\bGlam reseat\b/i },
  { name: "Whole continuous book", pattern: /\bWhole continuous book\b/i },
  { name: "the reseat", pattern: /\bthe reseat\b/i },
  { name: "Mira stamps", pattern: /\bMira stamps\b/ },
  { name: "Thea Morse", pattern: /\bThea Morse\b/ },
  { name: "Thea inventory", pattern: /\bThea inventory\b/ },
  { name: "recast-as-commentary", pattern: /recast-as-commentary/i },
  { name: "stamped for Mike", pattern: /stamped for Mike/i },
  { name: "Mike required", pattern: /\bMike required\b/i },
  { name: "vellumpress", pattern: /vellumpress/i },
];

/**
 * Host-process remarks written for staff, not readers ("Host OK", "warn the
 * room", "don’t sanitize"). Reader copy says what is in the book instead
 * ("period racial language, left as printed"). “Host” and “sit” on their own
 * are product words (Host a sit), so only the staff phrasings are banned.
 * Editorial surfaces only: a story breath may say “sanitize” or “for the room”.
 */
export const HOST_STAFF_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "Host OK", pattern: /\bHost OK\b/i },
  { name: "Host note", pattern: /\bHost notes?\b/i },
  { name: "if you Host", pattern: /\bif you Host\b/i },
  { name: "Host may", pattern: /\bHost may\b/i },
  { name: "Host into", pattern: /\bHost into\b/i },
  { name: "Host further", pattern: /\bHost further\b/i },
  { name: "before you Host", pattern: /\bbefore you Host\b/i },
  { name: "warn the room", pattern: /\bwarn the room\b/i },
  { name: "for the room", pattern: /\bfor the room\b/i },
  { name: "sanitize", pattern: /sanitiz/i },
  { name: "flag, do not", pattern: /\bflag, do not\b/i },
  { name: "translator on this sit", pattern: /\bNo translator is named on this sit\b/i },
  { name: "sit stays on Part", pattern: /\bThe sit stays on Part\b/i },
  { name: "mid-bind", pattern: /\bmid-bind\b/i },
];

/**
 * Audit and shelf-placement boilerplate ("No score is invented for this sit.",
 * "Inventory 81 is medium.", "PG reading-ease 82.0 is easy.", "Soft England,
 * carefully.", "France is primary.", "The lead is this book, not …").
 * The figures stay in source bind notes for the pipeline. Production
 * chunks drop `note` (see scripts/strip-bind-notes.mjs), and reader copy
 * never carries them. Bind notes are still checked through readerIntro,
 * the one path where a note can reach a reader.
 */
export const BOILERPLATE_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "no score invented", pattern: /\bNo (?:reading-ease )?score is invented\b/i },
  { name: "inventory", pattern: /\binventory\b/i },
  { name: "reading-ease", pattern: /reading-ease/i },
  { name: "Launch", pattern: /\bLaunch\b/ },
  { name: "Notion", pattern: /\bNotion\b/ },
  { name: "inflate", pattern: /\b(?:soft-)?inflate\b/i },
  { name: "For you seat", pattern: /\bFor you seat\b/i },
  { name: "soft against", pattern: /\bsoft against\b/i },
  { name: "Soft X, carefully", pattern: /\bSoft [A-Z][^.]*, carefully\b/ },
  { name: "Long, carefully", pattern: /\b(?:Long|The sit is longer), carefully\./ },
  { name: "is primary", pattern: /\b(?:is|are) primary\b/ },
  { name: "the lead is this", pattern: /\bThe lead (?:is|stays) this\b/ },
  { name: "weighted lead", pattern: /-weighted lead\b/ },
  { name: "invented for this sit", pattern: /\bis invented for this sit\b/i },
  { name: "no catalog number", pattern: /\bno catalog number\b/i },
  { name: "year/translator invented", pattern: /\b(?:year|translator) is (?:invented|cited)\b/ },
  { name: "bind", pattern: /\b(?:only|local|this|the) bind\b/ },
  { name: "stays held", pattern: /\bstays held\b/ },
  { name: "densify", pattern: /densif/i },
  { name: "not Next", pattern: /\bnot Next\b/ },
  { name: "Resident-only", pattern: /Resident-only/ },
  { name: "CLEAR EN", pattern: /\bCLEAR EN\b/ },
];

/**
 * Editorial surfaces (intros, host notes, blurbs, pitches, prefaces).
 * Name tokens are banned here because this copy is ours, not the book.
 */
const EDITORIAL_PATTERNS: { name: string; pattern: RegExp }[] = [
  ...BREATH_PATTERNS,
  { name: "Thea", pattern: /\bThea\b/ },
  { name: "Mira", pattern: /\bMira\b/ },
  { name: "Mike", pattern: /\bMike\b/ },
  { name: "Featured", pattern: /\bFeatured\b/ },
  { name: "reseat", pattern: /\breseat\b/i },
  { name: "remake", pattern: /\bremake\b/i },
  { name: "Glam", pattern: /\bGlam\b/ },
  { name: "Vellum", pattern: /\bVellum\b/ },
  { name: "Salon", pattern: /\bSalon\b/ },
  ...HOST_STAFF_PATTERNS,
];

/** Copy a reader sees directly: editorial patterns plus audit boilerplate. */
const READER_COPY_PATTERNS = [...EDITORIAL_PATTERNS, ...BOILERPLATE_PATTERNS];

type Hit = { where: string; name: string; snippet: string };

function consider(
  hits: Hit[],
  where: string,
  text: string,
  patterns: { name: string; pattern: RegExp }[],
) {
  for (const { name, pattern } of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const key = `${where}: ${name}`;
    if (PIPELINE_LEAK_ALLOWLIST.includes(key)) continue;
    const at = match.index;
    hits.push({
      where,
      name,
      snippet: text.slice(Math.max(0, at - 36), at + match[0].length + 36).replace(/\s+/g, " "),
    });
  }
}

test("reader-facing copy has no pipeline leaks (allowlist empty)", () => {
  assert.deepEqual(PIPELINE_LEAK_ALLOWLIST, []);
  const hits: Hit[] = [];

  for (const work of SHELF) {
    if (work.intro) consider(hits, `shelf.intro:${work.id}`, work.intro, READER_COPY_PATTERNS);
    if (work.opening) consider(hits, `shelf.opening:${work.id}`, work.opening, BREATH_PATTERNS);
    const blurb = blurbFor(work);
    if (blurb) consider(hits, `blurb:${work.id}`, blurb, READER_COPY_PATTERNS);
  }
  for (const [id, copy] of Object.entries(PITCHES)) {
    consider(hits, `pitch:${id}`, copy, READER_COPY_PATTERNS);
  }
  for (const [id, copy] of Object.entries(RITUAL_PITCHES)) {
    consider(hits, `ritual:${id}`, copy, READER_COPY_PATTERNS);
  }
  for (const [id, copy] of Object.entries(PREFACES)) {
    consider(hits, `preface:${id}`, copy, READER_COPY_PATTERNS);
  }
  for (const [id, copy] of Object.entries(STORED_PREFACES)) {
    consider(hits, `stored-preface:${id}`, copy, READER_COPY_PATTERNS);
  }

  const here = fileURLToPath(new URL(".", import.meta.url));
  for (const folder of ["texts", "openings"] as const) {
    const dir = join(here, folder);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const data = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
        note?: string;
        breaths?: { text?: string }[];
      };
      const id = name.slice(0, -5);
      if (typeof data.note === "string") {
        consider(hits, `${folder}.note:${id}`, data.note, EDITORIAL_PATTERNS);
      }
      for (let i = 0; i < (data.breaths?.length ?? 0); i++) {
        const text = data.breaths?.[i]?.text;
        if (typeof text === "string") {
          consider(hits, `${folder}.breath:${id}#${i}`, text, BREATH_PATTERNS);
        }
      }
    }
  }

  assert.deepEqual(
    hits.map((hit) => `${hit.where} [${hit.name}] ${hit.snippet}`),
    [],
  );
});

/**
 * The Host-voice rewrite kept each content heads-up. A cut that drops the
 * warning itself (not just the staff phrasing) fails here.
 */
test("reader-voice heads-ups survive the Host-staff scrub", () => {
  const ritual = (id: string) => RITUAL_PITCHES[id] ?? "";
  const expect: [string, RegExp][] = [
    ["thais", /Paphnutius and the courtesan Thaïs/],
    ["high-wind-jamaica", /period racial language in this stretch, left as printed/],
    ["color", /Incident prints a racial slur/],
    ["all-quiet-on-the-western-front", /trench violence and period language about the enemy/],
    ["tropic", /racial violence are in this stretch, left as printed/],
    ["blacker", /color hierarchy within the community/],
    ["a-hero-of-our-time", /imperial violence in the Caucasus/],
    ["noli-me-tangere", /colonial power of the friars/],
    ["blood-and-sand", /bullring gore and animal death/],
    ["the-painted-veil", /adultery, in the colonial heat/],
    ["oblomov", /period class language, left as printed/],
    ["the-book-of-khalid", /self-Orientalizing irony, left as printed/],
    ["the-peasants", /ethnic language left as printed/],
    ["the-song-of-the-blood-red-flower", /frankly sensual/],
    ["growth-of-the-soil", /period word “Lapp” for Sámi/],
    ["letters-of-a-javanese-princess", /same colonial frame/],
    ["banjo", /dialect is left as written/],
    ["african-tragedy", /Christian-mission frame moralizes town life/],
  ];
  const missing = expect.filter(([id, pattern]) => !pattern.test(ritual(id))).map(([id]) => id);
  assert.deepEqual(missing, []);
  assert.doesNotMatch(ritual("bertha-garlan"), /translator/i);
  assert.doesNotMatch(ritual("bunner-sisters"), /Part I\./);
});

/**
 * Bind notes keep pipeline metadata (inventory, reading-ease, "Host: Ch I …"
 * scope labels). They are internal unless readerIntro falls back to one, so
 * check the copy a reader actually gets at the threshold, note included.
 */
test("reader threshold copy carries no audit boilerplate, even via a bind note", () => {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const noteFor = (id: string) => {
    for (const folder of ["texts", "openings"] as const) {
      try {
        const data = JSON.parse(readFileSync(join(here, folder, `${id}.json`), "utf8")) as { note?: string };
        if (typeof data.note === "string") return data.note;
      } catch {
        // no bind for this folder
      }
    }
    return undefined;
  };
  const hits: Hit[] = [];
  for (const work of SHELF) {
    const copy = readerIntro({ ...work, note: noteFor(work.id) } as unknown as Work);
    consider(hits, `readerIntro:${work.id}`, copy, [...BOILERPLATE_PATTERNS, ...HOST_STAFF_PATTERNS, { name: "Host: label", pattern: /\bHost:/ }]);
  }
  assert.deepEqual(
    hits.map((hit) => `${hit.where} [${hit.name}] ${hit.snippet}`),
    [],
  );
});

/**
 * Preface integrity. The sentence splitter breaks after "(ed. ", "(trans. ",
 * "(incl. ", "(Vol. " and bare initials, and a stored preface built from that
 * split keeps only the stub ("Various (ed. Enter one room at a time.").
 * Every preface must close its brackets and must not open on a lone initial
 * or a sub-25-character fragment glued to an invitation line.
 */
const INVITATION =
  /(?:Enter one room at a time|Sit with the world|Let the first line arrive|The house is still dark|A night sitting)/;
const INITIAL_STUB = new RegExp(`^(?:[A-Z]\\.(?:-[A-Z]\\.)?\\s)+${INVITATION.source}`);
const SHORT_STUB = new RegExp(`^[^.]{0,25}\\.\\s${INVITATION.source}`);
const BROKEN_CREDIT = /\((?:eds?|trans|tr|incl|vol)\.\s+(?=Enter one room|Sit with the world|Let the first line|The house is still dark|A night sitting)/i;

function parensBalanced(text: string) {
  // Quoted source text stays as printed, so a curly-quoted cut such as
  // lewis-and-irene's “…phosphates, oxygen).” does not count against the copy.
  const own = text.replace(/“[^”]*”/g, "");
  let depth = 0;
  for (const ch of own) {
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function prefaceProblems(where: string, copy: string): string[] {
  const out: string[] = [];
  if (!parensBalanced(copy)) out.push(`${where} [unbalanced parentheses] ${copy.slice(0, 90)}`);
  if (INITIAL_STUB.test(copy)) out.push(`${where} [initial stub] ${copy.slice(0, 90)}`);
  if (SHORT_STUB.test(copy)) out.push(`${where} [fragment stub] ${copy.slice(0, 90)}`);
  if (BROKEN_CREDIT.test(copy)) out.push(`${where} [broken credit] ${copy.slice(0, 90)}`);
  return out;
}

test("stored and composed prefaces are whole sentences, not split-off credit stubs", () => {
  const problems: string[] = [];
  for (const [id, copy] of Object.entries(PREFACES)) problems.push(...prefaceProblems(`PREFACES:${id}`, copy));
  for (const [id, copy] of Object.entries(STORED_PREFACES)) problems.push(...prefaceProblems(`STORED_PREFACES:${id}`, copy));
  for (const work of SHELF) {
    const copy = prefaceFor(work.id);
    if (copy) problems.push(...prefaceProblems(`prefaceFor:${work.id}`, copy));
    const blurb = blurbFor(work);
    if (blurb && !parensBalanced(blurb)) problems.push(`blurbFor:${work.id} [unbalanced parentheses] ${blurb}`);
  }
  assert.deepEqual(problems, []);
});

test("editorial copy and the reader intro never carry licensing language", () => {
  const PUBLIC_DOMAIN = /public[\s-]domain/i;
  const hits: string[] = [];
  const sources: Array<[string, Record<string, string>]> = [
    ["PITCHES", PITCHES],
    ["RITUAL_PITCHES", RITUAL_PITCHES],
    ["PREFACES", PREFACES],
    ["STORED_PREFACES", STORED_PREFACES],
  ];
  for (const [name, table] of sources) {
    for (const [id, copy] of Object.entries(table)) if (PUBLIC_DOMAIN.test(copy)) hits.push(`${name}:${id}`);
  }
  for (const work of SHELF) {
    if (work.intro && PUBLIC_DOMAIN.test(work.intro)) hits.push(`shelf.intro:${work.id}`);
    const intro = readerIntro(work as unknown as Work);
    if (PUBLIC_DOMAIN.test(intro)) hits.push(`readerIntro:${work.id}`);
    if (!parensBalanced(intro)) hits.push(`readerIntro:${work.id} [unbalanced parentheses]`);
  }
  assert.deepEqual(hits, []);
});

/**
 * Bind notes are pipeline metadata. They stay in source JSON and are stripped
 * before a texts/openings file becomes a production chunk. This gate scans
 * that shipped payload (note removed), the serialize plan that ships in the
 * client, and reader copy. `npm run build` scans `dist/` with the same
 * patterns. Literary collisions are allowlisted in scripts/strip-bind-notes.mjs.
 */
test("shipped book chunks and reader assets carry no bind-note staff metadata", () => {
  const hits: string[] = [];
  const here = fileURLToPath(new URL(".", import.meta.url));
  for (const folder of ["texts", "openings"] as const) {
    const dir = join(here, folder);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const raw = readFileSync(join(dir, name), "utf8");
      const shipped = stripCatalogBookSource(raw) ?? raw;
      const id = name.slice(0, -5);
      for (const hit of scanStaffText(shipped, `${folder}:${id}`)) {
        hits.push(`${hit.where} [${hit.name}] ${hit.snippet}`);
      }
    }
  }

  const serialize = readFileSync(join(here, "serialize.ts"), "utf8");
  if (serialize.includes("shipNotes")) {
    hits.push("serialize.ts [shipNotes] unused staff field still ships");
  }
  for (const hit of scanStaffText(serialize, "serialize.ts")) {
    hits.push(`${hit.where} [${hit.name}] ${hit.snippet}`);
  }

  const reader: Array<[string, string]> = [];
  for (const work of SHELF) {
    if (work.intro) reader.push([`shelf.intro:${work.id}`, work.intro]);
    const blurb = blurbFor(work);
    if (blurb) reader.push([`blurb:${work.id}`, blurb]);
  }
  for (const [id, copy] of Object.entries(PITCHES)) reader.push([`pitch:${id}`, copy]);
  for (const [id, copy] of Object.entries(RITUAL_PITCHES)) reader.push([`ritual:${id}`, copy]);
  for (const [id, copy] of Object.entries(PREFACES)) reader.push([`preface:${id}`, copy]);
  for (const [id, copy] of Object.entries(STORED_PREFACES)) reader.push([`stored-preface:${id}`, copy]);
  for (const [where, copy] of reader) {
    for (const hit of scanStaffText(copy, where)) {
      hits.push(`${hit.where} [${hit.name}] ${hit.snippet}`);
    }
  }

  assert.deepEqual(hits, []);
});

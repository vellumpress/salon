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

/**
 * Project Gutenberg apparatus belongs to the source file, not the book.
 * Book bodies (texts/openings breaths and scene labels) end at the work's own
 * last line; the "*** END OF THE PROJECT GUTENBERG …" marker, the licence and
 * the "Updated editions will replace…" boilerplate are stripped at bind time.
 */
const PG_BODY_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "PG end marker", pattern: /\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG/i },
  { name: "PG start marker", pattern: /\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG/i },
  { name: "old PG end line", pattern: /\bEnd of (?:the |this )?Project Gutenberg/i },
  { name: "PG updated editions", pattern: /\bUpdated editions will replace the previous one\b/i },
  { name: "PG full licence", pattern: /\bFULL (?:PROJECT GUTENBERG )?LICENSE\b|\bFull Project Gutenberg(?:-tm|™)? License\b/ },
  { name: "PG trademark", pattern: /\bProject Gutenberg[-‐ ]?(?:tm|™)/i },
  { name: "PG foundation", pattern: /\bProject Gutenberg Literary Archive Foundation\b/i },
  { name: "PG licence URL", pattern: /gutenberg\.org\/license/i },
];

test("book bodies carry no Project Gutenberg end marker or licence text", () => {
  const hits: string[] = [];
  const here = fileURLToPath(new URL(".", import.meta.url));
  for (const folder of ["texts", "openings"] as const) {
    const dir = join(here, folder);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const book = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
        scenes: { id: string; title?: string; place?: string; reentry?: string }[];
        breaths: { id: string; text: string }[];
      };
      const id = name.slice(0, -5);
      const fields: Array<[string, string]> = [];
      for (const scene of book.scenes) {
        for (const key of ["title", "place", "reentry"] as const) {
          const value = scene[key];
          if (value) fields.push([`${folder}:${id}:${scene.id}.${key}`, value]);
        }
      }
      for (const breath of book.breaths) fields.push([`${folder}:${id}:${breath.id}`, breath.text]);
      for (const [where, value] of fields) {
        for (const { name: label, pattern } of PG_BODY_PATTERNS) {
          if (pattern.test(value)) hits.push(`${where} [${label}] ${value.slice(0, 80)}`);
        }
      }
    }
  }
  assert.deepEqual(hits, []);
});

/**
 * Reader intros speak to the reader. Staff instructions ("Skip the preface",
 * "This sit is X only") belong to the bind, not the threshold card; the house
 * phrasing is "It opens at …" / "This reading is just …".
 */
test("reader intros and their source copy carry no staff skip/sit instructions", () => {
  // Widened in the leftovers pass: every card surface (intro, shelf intro,
  // blurb, pitch, ritual pitch, composed and stored prefaces), and the staff
  // imperatives as well as the "sit" jargon. House phrasing instead:
  // "It opens at …", "This reading is just …", "This reading stops …".
  const LEAD = String.raw`(?:^|[.!?…]["”’)]?\s+|—\s+|;\s+)`;
  const STAFF = [
    { name: "Skip the", pattern: /\bSkip the\b/i },
    { name: "This sit is", pattern: /\bThis sit is\b/ },
    { name: "this sit stops", pattern: /\bthis sit stops\b/i },
    { name: "imperative Ship/Skip/Cut/Bind/Drop", pattern: new RegExp(`${LEAD}(?:Ship|Skip|Cut|Bind|Drop)\\s`) },
    { name: "imperative Stop at/after/when/before/on", pattern: new RegExp(`${LEAD}Stop (?:at|after|when|before|on)\\b`) },
    { name: "imperative Keep the", pattern: new RegExp(`${LEAD}Keep the\\b`) },
    { name: "imperative Open …", pattern: new RegExp(`${LEAD}Open (?:at |on |with )?(?:Chapter|Part|Book|Act|Canto|Capítulo|the |[A-Z])`) },
    { name: "lowercase skip/stop/open/ship after a dash", pattern: /[—;]\s+(?:skip|ship|stop (?:at|after|when|before|on)|open (?:at|on|with))\b/ },
    { name: "the sit / this sit / first sit", pattern: /\b(?:the|this|a|first|fresh|closed|unwind) sit\b(?! (?:with|down|still|here|by|beside|in|on|at|up|alone|under)\b)/i },
    { name: "per sit / one … this sit", pattern: /\bper sit\b|\bthis sit[.;,]/i },
    { name: "sit + verb", pattern: /\bsit (?:is|stops|runs|opens|stays|ends|turns)\b/i },
    { name: "Internet Archive", pattern: /\bInternet Archive\b/ },
    { name: "OCR", pattern: /\bOCR\b/ },
    { name: "PG number", pattern: /\bPG \d+/ },
    { name: "mojibake / soft hyphens", pattern: /\bmojibake\b|\bsoft hyphens\b/i },
    { name: "e-text / transcriber", pattern: /\be-?text\b|\btranscriber\b/i },
    { name: "phone-hard", pattern: /\bphone-hard\b/i },
    { name: "scan texture", pattern: /\bscan texture\b/i },
  ];
  const copy: Array<[string, string]> = [];
  for (const work of SHELF) {
    const intro = readerIntro(work as unknown as Work);
    if (intro) copy.push([`readerIntro:${work.id}`, intro]);
    if (work.intro) copy.push([`shelf.intro:${work.id}`, work.intro]);
    const blurb = blurbFor(work);
    if (blurb) copy.push([`blurb:${work.id}`, blurb]);
    const preface = prefaceFor(work.id);
    if (preface) copy.push([`prefaceFor:${work.id}`, preface]);
  }
  for (const [id, text] of Object.entries(PITCHES)) copy.push([`pitch:${id}`, text]);
  for (const [id, text] of Object.entries(RITUAL_PITCHES)) copy.push([`ritual:${id}`, text]);
  for (const [id, text] of Object.entries(PREFACES)) copy.push([`preface:${id}`, text]);
  for (const [id, text] of Object.entries(STORED_PREFACES)) copy.push([`stored-preface:${id}`, text]);
  const hits: string[] = [];
  for (const [where, text] of copy) {
    for (const { name, pattern } of STAFF) {
      const m = pattern.exec(text);
      if (m) hits.push(`${where} [${name}] …${text.slice(Math.max(0, m.index - 30), m.index + 50)}…`);
    }
  }
  assert.deepEqual(hits, []);
});

/**
 * The bind-time dialogue formatter writes `Speaker: line`. In a non-play work
 * a speaker that carries past an unrecognised cue or into the next poem's
 * heading prefixes hundreds of breaths with the wrong name (Poems & Ballads
 * had "King David:" on every breath from the masque to the end of the book).
 * Fail when one label dominates a non-play work, runs unbroken for a long
 * stretch, or sits in front of ALL-CAPS headings.
 *
 * Known offenders still waiting for a source-aligned fix are listed below with
 * the signature they trip. The allowlist must shrink: an entry that no longer
 * trips fails the test so it gets removed.
 */
const SPEAKER_PREFIX_PENDING: Record<string, string> = {};

const SPEAKER_LABEL = /^([A-Z][\w’'.-]*(?: [A-Z][\w’'.-]*){0,3}): \S/;
const LABELLED_HEADING = /^[^:]{1,40}: [A-Z0-9][A-Z0-9 .,'’-]{3,}$/;
const NOT_A_SPEAKER = new Set(["Note", "Notes", "Footnote", "N.B", "P.S"]);

function speakerPrefixProblems(texts: string[]): string[] {
  const labels = texts.map((text) => {
    const label = SPEAKER_LABEL.exec(text)?.[1] ?? null;
    return label && !NOT_A_SPEAKER.has(label) ? label : null;
  });
  const counts = new Map<string, number>();
  for (const label of labels) if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  const problems: string[] = [];
  const [top, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  if (texts.length >= 100 && topCount / texts.length >= 0.25) {
    problems.push(`${top} on ${topCount}/${texts.length} breaths`);
  }
  let run = 0;
  let best = 0;
  let bestLabel = "";
  let previous: string | null = null;
  for (const label of labels) {
    run = label && label === previous ? run + 1 : label ? 1 : 0;
    previous = label;
    if (run > best) [best, bestLabel] = [run, label ?? ""];
  }
  if (best >= 120) problems.push(`${bestLabel} runs ${best} breaths`);
  const headings = texts.filter((text, i) => labels[i] && LABELLED_HEADING.test(text)).length;
  if (headings >= 5) problems.push(`${headings} prefixed ALL-CAPS headings`);
  return problems;
}

test("no non-play work carries a dominant or runaway speaker prefix", () => {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const hits: string[] = [];
  const stale: string[] = [];
  for (const work of SHELF) {
    if (work.form === "play") continue;
    let book: { breaths: { text: string }[] };
    try {
      book = JSON.parse(readFileSync(join(here, "texts", `${work.id}.json`), "utf8"));
    } catch {
      continue;
    }
    const problems = speakerPrefixProblems(book.breaths.map((breath) => breath.text ?? ""));
    if (work.id in SPEAKER_PREFIX_PENDING) {
      if (problems.length === 0) stale.push(work.id);
      continue;
    }
    if (problems.length) hits.push(`${work.id}: ${problems.join("; ")}`);
  }
  assert.deepEqual(hits, []);
  assert.deepEqual(stale, [], "fixed works must leave SPEAKER_PREFIX_PENDING");
});

test("the speaker-prefix gate trips on the King David carry-over", () => {
  const breaths = [
    ...Array.from({ length: 60 }, (_, i) => `Opening line ${i}`),
    ...Array.from({ length: 140 }, (_, i) => `King David: Line ${i} of the poems after the masque`),
  ];
  assert.ok(speakerPrefixProblems(breaths).length > 0);
});

/**
 * Producer and transcriber residue in book bodies: credits, e-text notes and
 * transcriber's-note headings. The Canterbury glosses are inline readers' aids
 * and FitzGerald's notes in the Rubáiyát carry two "[Greek … deleted from
 * etext]" markers mid-text; Marius the Epicurean has an e-text editor's
 * translation of Pater's Greek inside a mid-book notes section. These sit
 * mid-body (cutting would shift saved positions) and are listed, not cut.
 */
const BODY_RESIDUE_ALLOW = new Set([
  "the-canterbury-tales",
  "the-rubaiyat-of-omar-khayyam",
  "marius-the-epicurean",
]);
const BODY_RESIDUE: { name: string; pattern: RegExp }[] = [
  { name: "Project Gutenberg", pattern: /\bProject Gutenberg\b/ },
  { name: "PG e-text", pattern: /\bPG [Ee]-?[Tt]ext\b/ },
  { name: "pgdp credit", pattern: /pgdp\.net|Distributed Proofread/i },
  { name: "e-text note", pattern: /\be-?text\b(?! of)/i },
  { name: "transcriber's note heading", pattern: /^\W*transcriber(?:[’']s)? (?:notes?|changes)\W*$/i },
  { name: "typo list", pattern: /Typographical errors corrected/i },
  { name: "e-book production notes", pattern: /Production notes for e-?Book edition/i },
  { name: "producer credit", pattern: /^\W*(?:Produced|Prepared|Transcribed|Scanned|Digitized) (?:by|from) [A-Z0-9]|File was produced from images/ },
  { name: "Internet Archive / pglaf", pattern: /\bInternet Archive\b|archive\.org\/details|pglaf\.org/i },
  { name: "transcription note", pattern: /Lines longer than \d+ characters|\bThis transcription is based\b|^\W*Note on text:/i },
];

test("book bodies carry no producer credit or transcriber's-note residue", () => {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const hits: string[] = [];
  for (const folder of ["texts", "openings"] as const) {
    for (const name of readdirSync(join(here, folder))) {
      if (!name.endsWith(".json")) continue;
      const id = name.slice(0, -5);
      if (BODY_RESIDUE_ALLOW.has(id)) continue;
      const book = JSON.parse(readFileSync(join(here, folder, name), "utf8")) as {
        scenes: { id: string; title?: string; place?: string }[];
        breaths: { id: string; text: string }[];
      };
      const fields: Array<[string, string]> = [
        ...book.scenes.map((scene): [string, string] => [`${scene.id}.title`, scene.title ?? ""]),
        ...book.scenes.map((scene): [string, string] => [`${scene.id}.place`, scene.place ?? ""]),
        ...book.breaths.map((breath): [string, string] => [breath.id, breath.text ?? ""]),
      ];
      for (const [where, value] of fields) {
        for (const { name: label, pattern } of BODY_RESIDUE) {
          if (pattern.test(value)) hits.push(`${folder}:${id}:${where} [${label}] ${value.slice(0, 80)}`);
        }
      }
    }
  }
  assert.deepEqual(hits, []);
});

/**
 * The shelf `opening` is the line printed on the board card. It should be the
 * book's first real line, never a producer credit, an e-text note, a bare
 * "BY" byline or a copyright/imprint line from the title page.
 */
const CARD_OPENING_RESIDUE: { name: string; pattern: RegExp }[] = [
  { name: "producer / e-text", pattern: /\be-?text\b|\btranscri|Project Gutenberg|^\W*Produced by [A-Z]|Internet Archive|pglaf|@/i },
  { name: "transcription note", pattern: /Lines longer than \d+ characters/i },
  { name: "byline", pattern: /^(?:BY|By)(?:\s+[A-Z][\w.]*\.?){0,4}\s*$/ },
  { name: "copyright / imprint", pattern: /^\W*(?:Copyright|Printed in|All Rights Reserved|This volume was first published)\b|^[A-Z][\w&.,' ]+ (?:Company|Co\.|Press)\b.*\b1[89]\d\d$/i },
];

// Title-page heads stay in the book (no saved position moves); the leading
// scenes are tagged front, so the card and a fresh Sit open on the first line.
const CARD_OPENING_PENDING = new Set<string>([]);

test("card openings are the book's first line, not producer or title-page residue", () => {
  const hits: string[] = [];
  for (const work of SHELF) {
    if (CARD_OPENING_PENDING.has(work.id)) continue;
    const opening = (work as { opening?: string }).opening ?? "";
    for (const { name, pattern } of CARD_OPENING_RESIDUE) {
      if (pattern.test(opening)) hits.push(`${work.id} [${name}] ${opening.slice(0, 80)}`);
    }
  }
  assert.deepEqual(hits, []);
});

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
import { RITUAL_LANES, RITUAL_PITCHES } from "./rituals.ts";
import { SERIALIZE_PLANS } from "./serialize.ts";
import { GUEST_CURATORS } from "./curated.ts";
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

/**
 * Roman numerals in headings stay all caps. The old bind casing ran
 * str.title() over caps headings ("Rune Iv", "Chap. Xxxix", "Ii. a Game of
 * Chess") and #251's de-shout lowered line references ("[Ii.1-303]"). Scene
 * titles and heading-length breaths are checked: a title-cased numeral after a
 * heading word, opening the line before a period, or inside a bracketed line
 * reference, and a lower-case word straight after a numbered heading.
 */
const ROMAN_NUMERAL = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const NUMERAL_HEADWORD =
  String.raw`(?:Chap\.|Chapter|Chapters|Book|Books|Part|Volume|Vol\.|Canto|Rune|Act|Scene|Letter|Fable|Fables|Psalm|Section|Lib\.)`;
const TITLE_CASED_NUMERAL: RegExp[] = [
  new RegExp(String.raw`\b${NUMERAL_HEADWORD} ([IVXLC][ivxlc]+)\b`, "g"),
  /^["“‘(*]*([IVXLC][ivxlc]+)\.(?:\s|$)/g,
  /\[([IVXLC][ivxlc]+)\.\d/g,
];
const LOWER_AFTER_NUMBERED_HEADING = /^["“‘(*]*(?:[IVXLC]{2,}|\d+)\.\s+(the|a|an|in|at|on)\s+[A-Z]/;

export function titleCasedNumerals(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of TITLE_CASED_NUMERAL) {
    for (const match of text.matchAll(pattern)) {
      if (ROMAN_NUMERAL.test(match[1].toUpperCase())) hits.push(match[0]);
    }
  }
  const lower = LOWER_AFTER_NUMBERED_HEADING.exec(text);
  if (lower) hits.push(lower[0]);
  return hits;
}

test("headings keep Roman numerals in caps and capitalise the word after a numbered heading", () => {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const hits: string[] = [];
  for (const folder of ["texts", "openings"] as const) {
    for (const name of readdirSync(join(here, folder))) {
      if (!name.endsWith(".json")) continue;
      const book = JSON.parse(readFileSync(join(here, folder, name), "utf8")) as {
        scenes: { id: string; title?: string; place?: string }[];
        breaths: { id: string; text: string }[];
      };
      const fields: Array<[string, string]> = [
        ...book.scenes.map((scene): [string, string] => [`${scene.id}.title`, scene.title ?? ""]),
        ...book.scenes.map((scene): [string, string] => [`${scene.id}.place`, scene.place ?? ""]),
        ...book.breaths
          .filter((breath) => (breath.text ?? "").length <= 80)
          .map((breath): [string, string] => [breath.id, breath.text]),
      ];
      for (const [where, value] of fields) {
        for (const hit of titleCasedNumerals(value)) hits.push(`${folder}:${name}:${where} ${hit}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("the numeral gate trips on title-cased numerals and passes printed ones", () => {
  for (const bad of ["Rune Iv", "Chap. Xxxix", "Ii. a Game of Chess", "[Ii.1-303] The Creation", "Letter Lxxiii", "VI. the Gods of Greece"]) {
    assert.ok(titleCasedNumerals(bad).length > 0, bad);
  }
  for (const good of ["Rune IV", "Chap. XXXIX", "II. A Game of Chess", "[II.1-303] The Creation", "Vi sat ved bordet.", "Liv and Mix", "II. v. 81-84.", "L. of G.’s Purport"]) {
    assert.deepEqual(titleCasedNumerals(good), [], good);
  }
});

/**
 * A card opening is a line of the book, not a contents run ("I. LIFE OF … II.
 * … III. …"). The Ramayan card still opens on its canto list; it is listed
 * here until its contents are tagged front.
 */
const CONTENTS_OPENING_PENDING = new Set<string>(["the-ramayan-of-valmiki"]);

test("card openings are not a run of contents entries", () => {
  const hits: string[] = [];
  const stale: string[] = [];
  for (const work of SHELF) {
    const opening = (work as { opening?: string }).opening ?? "";
    const numbered = opening.match(/(?:^|\s)(?:[IVXLC]+|\d+)\.\s+[A-Z]/g) ?? [];
    const contents = numbered.length >= 3;
    if (CONTENTS_OPENING_PENDING.has(work.id)) {
      if (!contents) stale.push(work.id);
      continue;
    }
    if (contents) hits.push(`${work.id}: ${opening.slice(0, 80)}`);
  }
  assert.deepEqual(hits, []);
  assert.deepEqual(stale, [], "fixed works must leave CONTENTS_OPENING_PENDING");
});

/**
 * Curation talk: staff choosing books, written into copy a reader sees ("Not the
 * Africa novel pile.", "Montsou is not the war of Three Soldiers.", "The Broadway
 * open is careful after The Rise of David Levinsky.", "The Host stays in the
 * South, after Wings …", "this open starts at Section I", "Priday 1923 EN only.").
 * Editorial surfaces only — intros, cards, pitches, ritual notes, prefaces, the
 * threshold intro, lane labels, serial framing and curator copy — never book
 * bodies. The words also have real senses (a Gwent hill lane, cinder piles, slate
 * cliffs, a colder register, the top floor, picks up The Times, a taste for
 * adventure, the open plain), so each pattern needs a staff context.
 *
 * Allowlist: `where: name`, with the reason beside it. Empty after the sweep.
 */
export const CURATION_ALLOWLIST: readonly string[] = [];

export const CURATION_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "book pile", pattern: /\b(?:novel|book|title|reading|story|stories|poetry|classics?)\s+piles?\b|\b(?:on|off|from|onto|into|to) the (?:[\w’'-]+ ){0,3}pile\b/i },
  { name: "slate", pattern: /\b(?:on|off|the|this|our|today[’']s|tonight[’']s|next|reading) slate\b(?! (?:cliffs?|roofs?|grey|gray|blue|sky|tiles?|quarr\w*))|\bslated (?:for|to|as)\b/i },
  { name: "queue", pattern: /\b(?:the|this|our|reading|Next|Featured|Rituals?) queue\b|\bqueued (?:for|behind|after)\b/i },
  { name: "lane (staff)", pattern: /\b(?:Ritual|Rituals|unwind|before-sleep|on-a-walk|walk|waking-up|soft-mourning|bite-sized|For you|serialize|commute)\s+lanes?\b|\b(?:every|each|one|any|another|other|its) (?:Ritual )?lanes?\b|\blanes? only\b|\boff (?:the|every|all) lanes?\b/i },
  { name: "floor (staff)", pattern: /\b(?:score|ease|reading-ease|word-count|minutes?|length|quality|inventory)\s+floor\b|\bfloor (?:is|of|at) \d|\babove the floor\b/i },
  { name: "register (staff)", pattern: /\b(?:the|our|this) (?:Thea |Mira |curation |catalog |launch |rights |shelf |reading )?register (?:entry|row|line|says|lists|has)\b|\bregister(?:ed)? (?:as|for) (?:Next|Featured|Rituals?|For you|the shelf)\b/i },
  { name: "shortlist", pattern: /\bshort-?list(?:s|ed|ing)?\b/i },
  { name: "picks / runners-up", pattern: /\brunners?-up\b|\b(?:our|top|first|second|lead|alternate|staff|editors?[’']?|curators?[’']?) picks?\b|\bpick(?:s|ed)? (?:over|instead of|ahead of)\b|\bpicked for (?:Next|Featured|Rituals?|the shelf)\b/i },
  { name: "taste (staff)", pattern: /\btaste (?:call|pick|match|fit|profile|signal|score|lead|test)\b|\b(?:on|house|reader|our|Thea[’']s|Mira[’']s) taste\b(?! (?:for|of))/i },
  { name: "Not the … pile/list/shelf", pattern: /\bNot the [^.]{0,40}\b(?:pile|slate|queue|lane|list|shortlist|shelf|track|carousel|pick|lead)s?\b/i },
  { name: "the open (staff noun)", pattern: /\b(?:this|the|[A-Z][\w’'-]+) open (?:is|stays|starts|already|runs|ends)\b|\b(?:is|not) the open\b/i },
  { name: "the Host opens/stays", pattern: /\b[Tt]he Host (?:opens|stays|starts|runs|ends|turns|sits)\b/ },
  { name: "selected … stay out", pattern: /\bselected [\w ]{0,24}(?:stays?|left) out\b/i },
  { name: "EN only", pattern: /\bEN only\b/ },
  { name: "open is careful", pattern: /\bopen is careful\b|\bis careful after\b/i },
  { name: "Next placement", pattern: /\bNext carefully\b|\bplain Next\b|\bleads Next\b/ },
];

const escapeTitle = (title: string) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SHELF_TITLES = [...new Set(SHELF.map((work) => work.title))].filter((title) => title.length >= 4).sort((a, b) => b.length - a.length);
/** "is not the war of Three Soldiers": another shelf title as a comparison (two-word titles and up). */
const NOT_TITLE = new RegExp(
  String.raw`\bnot (?:the )?(?:[\w’'-]+ ){0,3}(?:of )?(${SHELF_TITLES.filter((title) => title.includes(" ")).map(escapeTitle).join("|")})(?![\w’'-])`,
  "g",
);
/** "is careful after The Rise of David Levinsky", "stays in the South, after Wings": placement after another title. */
const AFTER_TITLE = new RegExp(
  String.raw`\b(?:careful|stays?|sits?|comes?|follows?|placed|seated|lands?)\b[^.]{0,40}\bafter (${SHELF_TITLES.map(escapeTitle).join("|")})(?![\w’'-])`,
  "g",
);

export function curationHits(text: string, selfTitle = ""): string[] {
  const hits: string[] = [];
  for (const { name, pattern } of CURATION_PATTERNS) if (pattern.test(text)) hits.push(name);
  for (const [name, pattern] of [["not the … another title", NOT_TITLE], ["placed after another title", AFTER_TITLE]] as const) {
    for (const match of text.matchAll(pattern)) {
      if (match[1] !== selfTitle) {
        hits.push(name);
        break;
      }
    }
  }
  return hits;
}

function curationCopy(): Array<[string, string, string]> {
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
  const titleOf = new Map(SHELF.map((work) => [work.id, work.title]));
  const copy: Array<[string, string, string]> = [];
  for (const work of SHELF) {
    if (work.intro) copy.push([`shelf.intro:${work.id}`, work.intro, work.title]);
    const blurb = blurbFor(work);
    if (blurb) copy.push([`blurb:${work.id}`, blurb, work.title]);
    const preface = prefaceFor(work.id);
    if (preface) copy.push([`prefaceFor:${work.id}`, preface, work.title]);
    const intro = readerIntro({ ...work, note: noteFor(work.id) } as unknown as Work);
    if (intro) copy.push([`readerIntro:${work.id}`, intro, work.title]);
  }
  for (const [id, text] of Object.entries(PITCHES)) copy.push([`pitch:${id}`, text, titleOf.get(id) ?? ""]);
  for (const [id, text] of Object.entries(RITUAL_PITCHES)) copy.push([`ritual:${id}`, text, titleOf.get(id) ?? ""]);
  for (const [id, text] of Object.entries(PREFACES)) copy.push([`preface:${id}`, text, titleOf.get(id) ?? ""]);
  for (const [id, text] of Object.entries(STORED_PREFACES)) copy.push([`stored-preface:${id}`, text, titleOf.get(id) ?? ""]);
  for (const lane of RITUAL_LANES) {
    copy.push([`lane.label:${lane.id}`, lane.label, ""]);
    if (lane.hint) copy.push([`lane.hint:${lane.id}`, lane.hint, ""]);
  }
  for (const plan of SERIALIZE_PLANS) copy.push([`serialize.framing:${plan.id}`, plan.framing, plan.title]);
  for (const curator of GUEST_CURATORS) {
    copy.push([`curator.note:${curator.slug}`, curator.note, ""]);
    const walk = (value: unknown, where: string) => {
      if (typeof value === "string") copy.push([where, value, ""]);
      else if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${where}[${i}]`));
      else if (value && typeof value === "object") {
        for (const [key, item] of Object.entries(value)) if (key === "blurb" || key === "entries" || key === "pick" || key === "alt" || typeof item === "object") walk(item, `${where}.${key}`);
      }
    };
    walk(curator.groups, `curator.groups:${curator.slug}`);
  }
  return copy;
}

test("reader-facing copy carries no curation talk (piles, slates, lanes, picks, 'not the X')", () => {
  const hits: string[] = [];
  for (const [where, text, title] of curationCopy()) {
    for (const name of curationHits(text, title)) {
      if (CURATION_ALLOWLIST.includes(`${where}: ${name}`)) continue;
      hits.push(`${where} [${name}] ${text.slice(0, 120)}`);
    }
  }
  assert.deepEqual(hits, []);
});

test("the curation gate trips on the leaked lines and passes ordinary prose", () => {
  const halket =
    "A dark night on a Mashonaland kopje, Trooper Peter Halket’s fire quivering, a burnt kraal already in the dark. It opens at Chapter I. Schreiner’s 1897 novella keeps the Chartered Company frame, left as printed. Not the Africa novel pile.";
  assert.ok(curationHits(halket).length > 0, "original Halket ritual note");
  for (const bad of [
    "Montsou is not the war of Three Soldiers.",
    "The Broadway open is careful after The Rise of David Levinsky.",
    "The Host stays in the South, after Wings on the Lower East Side.",
    "Childhood two-worlds map. Priday 1923 EN only.",
    "The novel continues; the selected shorts stay out.",
    "The epigraph stays in the book; this open starts at Section I.",
    "The England breakfast is the open.",
    "The Host opens in Vevey; Rome comes later in the book.",
    "It sits on the walk lane only.",
    "Off the slate this week.",
    "A shortlist of three.",
    "The runner-up was Kim.",
    "A taste call, not a rule.",
  ]) {
    assert.ok(curationHits(bad).length > 0, bad);
  }
  for (const good of [
    "the company, the empty parade ground, and cinder piles in a purple evening.",
    "Cloud banks like corroding slate cliffs open Strindberg’s Dream Play.",
    "Lucian Taylor loses himself on a Gwent hill lane.",
    "a stranger led through the lanes of Stambul after dark.",
    "tended the geraniums boxed on the sill of his window above Water Lane.",
    "Same author as Enchanted April, colder register.",
    "Their names are in the parish register.",
    "takes the attic on the top floor, and arrives with two trunks.",
    "finishes in a heap on the floor.",
    "Mrs. Wilkins picks up The Times.",
    "An orphan with a taste for adventure.",
    "an estate, a scandal, and the class that calls it taste.",
    "Over the open plain, beneath a starless sky.",
    "a village that lies high and in the open, without the lavish shade.",
    "It opens in Vevey; Rome comes later in the book.",
    "London learns it is not the center.",
    "This is not the title story, Mrs. Spring Fragrance.",
    "Tender and quiet, for the evening rather than for sleep.",
  ]) {
    assert.deepEqual(curationHits(good), [], good);
  }
  assert.deepEqual(CURATION_ALLOWLIST, []);
});

/**
 * Provenance and production notes: where a year or credit was sourced and how
 * the text was set ("the year is 1894, from the Harper copyright line", "the
 * Toronto title page", "Quotes stay as printed.", "the printed breaks kept",
 * "The dedication stays at the front of the book.", "The two snatches of French
 * verse stay in French", "This tbr cut stops on …", "named in the About only",
 * "The first breath is 334 words"). That is bind talk, not copy for a reader.
 * The card already shows author, translator and year.
 *
 * Content heads-ups keep "left as printed" (it tells a reader the period
 * language is unaltered), and the first-reading line keeps "up to its first
 * printed break", so neither is banned here. Every reader-copy surface is
 * checked: shelf intros, blurbs, pitches, ritual pitches, composed and stored
 * prefaces, and the threshold intro.
 *
 * Allowlist: `where: name`, with the reason beside it. Empty on purpose.
 */
export const PROVENANCE_ALLOWLIST: readonly string[] = [];

export const PROVENANCE_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "the year is", pattern: /\byear is\b/i },
  { name: "copyright", pattern: /\bcopyright\b/i },
  { name: "title page", pattern: /\btitle page\b/i },
  { name: "imprint", pattern: /\bimprint\b/i },
  { name: "printing (source)", pattern: /\b(?:this|the|magazine|first) printing (?:is|named|of)\b|\bthis printing\b|\bmagazine printing\b/i },
  { name: "edition (source)", pattern: /\bthe edition gives\b|\bthis text follows\b|\b(?:second|third) edition\b|\bfirst-edition year\b|\bfrom the (?:[A-Z][\w&.,' ]+ )?edition\b/ },
  { name: "as printed (not a heads-up)", pattern: /(?<!\bleft )(?<!\bleft exactly )\bas printed\b/i },
  { name: "stays in French / italics", pattern: /\bstays? in (?:French|italics)\b|\bline by line\b/i },
  { name: "kept (production)", pattern: /\bprinted breaks? kept\b|\b(?:breaks?|notes?|footnotes?|spelling) (?:is |are )?kept\b|\bkept as a note\b/i },
  { name: "front of the book", pattern: /\bfront of the book\b/i },
  { name: "own page", pattern: /\bas (?:its|their) own (?:short )?page\b/i },
  { name: "set as / set in italics", pattern: /\bis set as\b|\bare set in italics\b|\bset as “/i },
  { name: "print errors / corrected", pattern: /\bprint errors?\b|\bis corrected to\b|\btypographic slips?\b/i },
  { name: "tbr cut", pattern: /\btbr cut\b|\bcut stops\b/i },
  { name: "named in the About", pattern: /\bnamed in the About\b/i },
  { name: "Wikipedia / PG page", pattern: /\bWikipedia\b|\bPG (?:page|text)\b/ },
  { name: "first breath N words", pattern: /\bfirst breath (?:is|of|stays) \d/i },
  { name: "Note line", pattern: /\bNote lines?\b/ },
  { name: "shorter screens", pattern: /\bshorter screens\b|\bno words are changed\b/i },
  { name: "One story; the book continues", pattern: /\bOne (?:story|chapter|tale); the (?:book|cycle|collection) continues\b/ },
  { name: "stays in the book / stays out", pattern: /\bstays? in the book\b|\b(?:preface|introduction|tales?) stays? out\b|\b(?:is|are) not included\b|\bare out;/i },
  { name: "dropped (production)", pattern: /\b(?:is|are) dropped\b/ },
  { name: "no translator listed", pattern: /\bno (?:separate )?translator (?:is listed|preface)\b/i },
  { name: "quote typography", pattern: /\b(?:straight|curly|single|double) quotes\b|\bquotes stay\b|\bquote marks\b/i },
  { name: "accents stay", pattern: /\baccents stay\b|\bwithout tildes\b/i },
  { name: "printed as (spelling note)", pattern: /\bis printed as\b|\bprinted without\b/i },
];

export function provenanceHits(text: string): string[] {
  return PROVENANCE_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}

test("reader-facing copy carries no provenance or production notes (allowlist empty)", () => {
  const copy: Array<[string, string]> = [];
  for (const work of SHELF) {
    if (work.intro) copy.push([`shelf.intro:${work.id}`, work.intro]);
    const blurb = blurbFor(work);
    if (blurb) copy.push([`blurb:${work.id}`, blurb]);
    const preface = prefaceFor(work.id);
    if (preface) copy.push([`prefaceFor:${work.id}`, preface]);
    const intro = readerIntro(work as unknown as Work);
    if (intro) copy.push([`readerIntro:${work.id}`, intro]);
  }
  for (const [id, text] of Object.entries(PITCHES)) copy.push([`pitch:${id}`, text]);
  for (const [id, text] of Object.entries(RITUAL_PITCHES)) copy.push([`ritual:${id}`, text]);
  for (const [id, text] of Object.entries(PREFACES)) copy.push([`preface:${id}`, text]);
  for (const [id, text] of Object.entries(STORED_PREFACES)) copy.push([`stored-preface:${id}`, text]);
  const hits: string[] = [];
  for (const [where, text] of copy) {
    for (const name of provenanceHits(text)) {
      if (PROVENANCE_ALLOWLIST.includes(`${where}: ${name}`)) continue;
      const pattern = PROVENANCE_PATTERNS.find((item) => item.name === name)!.pattern;
      const m = pattern.exec(text);
      const at = m?.index ?? 0;
      hits.push(`${where} [${name}] …${text.slice(Math.max(0, at - 40), at + 60)}…`);
    }
  }
  assert.deepEqual(hits, []);
});

test("the provenance gate trips on the leaked lines and passes heads-ups and story copy", () => {
  for (const bad of [
    "Ludovic Halévy, in Edith V.B. Matthews's English; the year is 1894, from the Harper copyright line.",
    "Elizabeth von Arnim; the year is 1907, from the title page, which names her only as the author of “Elizabeth and Her German Garden.”",
    "André Gide, in Dorothy Bussy's English; the year is 1924, from the Toronto title page.",
    "Quotes stay as printed.",
    "Marti is printed as Marti.",
    "Straight quotes stay as printed.",
    "Eight chapters and Alissa’s journal, the printed breaks kept.",
    "The dedication “To M. A. G.” stays at the front of the book.",
    "The two snatches of French verse stay in French, in italics, line by line.",
    "Kenneth Grahame; the year is 1895, when the book first appeared.",
    "One story; the book continues with the Prologue and sixteen more.",
    "Faithful friends summoned to a distant house. This tbr cut stops on the freedom line.",
    "The English year is 1897.",
    "The Scribner imprint is 1906.",
    "Garnett is named in the About only.",
    "The first breath is 334 words, left as printed.",
    "The dedication stays, as its own page before Chapter I.",
    "The Irish talk stays as printed.",
    "“BOOK 1” is set as Book I, to match Books II–V.",
    "Two print errors are fixed: “rerepeated” is set as “repeated”.",
    "Some long paragraphs have been broken into shorter screens; no words are changed.",
    "The year is from the Wikipedia page the PG page links to.",
    "Morier’s novel, first 1824, this printing 1895.",
    "Thirty-one chapters, the translator's 62 notes kept.",
    "The preface stays out.",
    "The heading’s “I.” is dropped.",
  ]) {
    assert.ok(provenanceHits(bad).length > 0, bad);
  }
  for (const good of [
    "A heads-up before you start: on the way the narrator tells Harold that Indians scalp and burn their prisoners, a schoolboy notion of the period, left as printed.",
    "The Jamaican Creole talk is left as printed.",
    "The Yankee village talk is left exactly as printed.",
    "The first reading is Chapter I up to its first printed break, ending “…who afterwards became my friend.”",
    "This reading is the whole story, through its three printed breaks, ending “…the last seconds of happiness I have known in my life.”",
    "It ends “…withstood the shock of this avalanche of dancers.”",
    "Amused and brisk, for a walk. Paris.",
    "From Over the Sliprails.",
    "First published in Norwegian in 1883; this translation is from 1920.",
    "There was a man of the Island of Hawaii, whom I shall call Keawe; for the truth is, he still lives, and his name must be kept secret.",
    "Desire and a kept boy are the story, told frankly.",
    "Stephen Crane’s Maggie, first published in 1893 under the pseudonym Johnston Smith (Crane paid for a private printing himself).",
    "Expect dense, older English and a few rough spots from the old printing; this is a reading edition, not a critical text.",
    "The novel is set in Paris, and the reading stays in Chapter I.",
    "It was pouring with rain, and Dorine van Lowe dropped in on Karel and Cateau.",
  ]) {
    assert.deepEqual(provenanceHits(good), [], good);
  }
  assert.deepEqual(PROVENANCE_ALLOWLIST, []);
});

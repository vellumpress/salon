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
import { PREFACES } from "./prefaces.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";
import { PITCHES } from "./pitches.ts";
import { RITUAL_PITCHES } from "./rituals.ts";
import { SHELF } from "./shelf.ts";

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
];

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
    if (work.intro) consider(hits, `shelf.intro:${work.id}`, work.intro, EDITORIAL_PATTERNS);
    if (work.opening) consider(hits, `shelf.opening:${work.id}`, work.opening, BREATH_PATTERNS);
    const blurb = blurbFor(work);
    if (blurb) consider(hits, `blurb:${work.id}`, blurb, EDITORIAL_PATTERNS);
  }
  for (const [id, copy] of Object.entries(PITCHES)) {
    consider(hits, `pitch:${id}`, copy, EDITORIAL_PATTERNS);
  }
  for (const [id, copy] of Object.entries(RITUAL_PITCHES)) {
    consider(hits, `ritual:${id}`, copy, EDITORIAL_PATTERNS);
  }
  for (const [id, copy] of Object.entries(PREFACES)) {
    consider(hits, `preface:${id}`, copy, EDITORIAL_PATTERNS);
  }
  for (const [id, copy] of Object.entries(STORED_PREFACES)) {
    consider(hits, `stored-preface:${id}`, copy, EDITORIAL_PATTERNS);
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

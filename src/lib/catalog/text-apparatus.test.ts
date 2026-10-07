/**
 * Text gate: book breaths carry the book, not the digitizer's paperwork.
 *
 * Transcriber's notes, "Alterations to the text", typo-fix lists, scan
 * credits ("Images provided by … via Wikipedia"), e-text editor notes and
 * "[End of Text]" markers came in with the source files. Readers saw them as
 * breaths. They are not the author's or the printed edition's words.
 *
 * Author's notes, printed errata, translator's notes, printed footnotes,
 * printers' imprints and publishers' pages are printed-edition matter and
 * are not this gate.
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
  { name: "digitizer signature", pattern: /\bA(?:lan)?\.?\s+(?:R\.\s+)?Light\b[.,]?\s.{0,40}\b(?:19|20)\d\d\b|\bA\.\s?L\.,\s+(?:19|20)\d\d\b/ },
];

const TCH = "The Canterbury Tales notes thread the transcriber’s notes through the printed editor’s notes (some share a breath with a tale’s first lines, others are marked only “TN”); left for a dedicated pass";

/** Documented exceptions: `textId#breathId` → reason. */
export const TEXT_APPARATUS_ALLOWLIST: Readonly<Record<string, string>> = {
  "the-canterbury-tales#s197-1": TCH,
  "the-canterbury-tales#s200-2": TCH,
  "the-canterbury-tales#s221-1": TCH,
  "the-canterbury-tales#s237-3": TCH,
  "the-canterbury-tales#s238-0": TCH,
  "the-canterbury-tales#s242-1": TCH,
  "the-canterbury-tales#s269-0": TCH,
  "the-canterbury-tales#s305-1": TCH,
  "the-canterbury-tales#s357-1": TCH,
  "the-canterbury-tales#s490-0": TCH,
  "the-canterbury-tales#s522-1": TCH,
  "the-canterbury-tales#s549-2": TCH,
  "the-canterbury-tales#s630-2": TCH,
  "the-canterbury-tales#s735-17": TCH,
  "the-canterbury-tales#s792-14": TCH,
  "the-canterbury-tales#s843-20": TCH,
  "the-canterbury-tales#s1025-28": TCH,
  "the-canterbury-tales#s1087-1": TCH,
  "the-canterbury-tales#s1098-0": TCH,
  "the-canterbury-tales#s1101-0": TCH,
  "the-canterbury-tales#s1103-0": TCH,
  "the-canterbury-tales#s1104-0": TCH,
  "the-beautiful-and-damned#s2-843":
    "the transcriber's bracket stands in for a printed mirror-image sign inside Fitzgerald's sentence; cutting it breaks the sentence",
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

#!/usr/bin/env node
/**
 * Audit local form:poem binds for timed-sit chops vs poem-per-scene.
 * Read-only. Prints a compact report.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shelfSrc = readFileSync(join(root, "src/lib/catalog/shelf.ts"), "utf8");

const DOT_CHOP = / · \d+$/;
const CHAPTER_N = /^Chapter \d+$/i;
const CHAPTER_ROMAN = /^Chapter [IVXLCDM]+$/i;
const ALL_CAPS = /^[A-Z0-9][A-Z0-9 '’:,;.\-—–!?()]*$/;
const TITLE_CASE = /^[A-Z][A-Za-z0-9'’:,;.\-—–!?() ]{0,70}$/;
const NUMBERED = /^(?:\d{1,3}|[IVXLCDM]{1,8})\.?$/;

function extractPoemIds() {
  const ids = [];
  const re =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?form:\s*"poem"[\s\S]*?\}/g;
  // shelf entries can be one-liners or multi-line objects
  const oneLiners = [
    ...shelfSrc.matchAll(
      /\{\s*id:\s*"([^"]+)"[^}]*form:\s*"poem"[^}]*\}/g,
    ),
  ];
  const seen = new Set();
  for (const m of oneLiners) {
    const chunk = m[0];
    const id = m[1];
    if (!chunk.includes("local: true")) continue;
    seen.add(id);
    ids.push(id);
  }
  // multi-line objects: crude scan
  const blocks = shelfSrc.split(/\n  \{/);
  for (const block of blocks) {
    if (!/form:\s*"poem"/.test(block)) continue;
    if (!/local:\s*true/.test(block)) continue;
    const id = block.match(/id:\s*"([^"]+)"/)?.[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function looksTitle(text) {
  const t = text.trim();
  if (!t || t.length > 80) return false;
  if (NUMBERED.test(t)) return true;
  if (ALL_CAPS.test(t) && t.replace(/[^A-Z]/g, "").length >= 3) return true;
  if (TITLE_CASE.test(t) && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 10) {
    if (/^(The|A|An|Of|On|In|To|By|From|With|And|Or|For)\b/.test(t) || /^[A-Z]/.test(t)) {
      if (!/\b(said|was|were|have|has|had|would|could|should|must|will)\b/i.test(t)) {
        return t.length < 48;
      }
    }
  }
  return false;
}

function analyze(id) {
  const textPath = join(root, "src/lib/catalog/texts", `${id}.json`);
  const openPath = join(root, "src/lib/catalog/openings", `${id}.json`);
  if (!existsSync(textPath)) {
    return { id, missing: true };
  }
  const work = JSON.parse(readFileSync(textPath, "utf8"));
  const opening = existsSync(openPath) ? JSON.parse(readFileSync(openPath, "utf8")) : null;
  const scenes = work.scenes ?? [];
  const breaths = work.breaths ?? [];
  const titles = scenes.map((s) => s.title);
  const chopTitles = titles.filter((t) => DOT_CHOP.test(t));
  const genericChapter = titles.filter((t) => CHAPTER_N.test(t) || CHAPTER_ROMAN.test(t));
  const uniqueTitles = new Set(titles);

  // title bleed: a breath that looks like a title but is not the first breath of its scene
  let bleed = 0;
  const bleedExamples = [];
  const sceneFirst = new Map();
  for (const b of breaths) {
    if (!sceneFirst.has(b.sceneId)) sceneFirst.set(b.sceneId, b.text);
  }
  for (let i = 0; i < breaths.length; i++) {
    const b = breaths[i];
    const next = breaths[i + 1];
    if (!looksTitle(b.text)) continue;
    if (sceneFirst.get(b.sceneId) === b.text) continue;
    // title mid-scene
    bleed += 1;
    if (bleedExamples.length < 4) {
      bleedExamples.push({
        at: i,
        scene: b.sceneId,
        text: b.text,
        next: next?.text?.slice(0, 60),
      });
    }
  }

  const ocrHits = [];
  const ocrRe =
    /\b(?:T have|T am|T was|T will|T would|l have|l am|1 have|1 am|rn the|tlie |tbe |teh )\b/g;
  for (const b of breaths) {
    if (ocrRe.test(b.text) || /T have inscribed/.test(b.text)) {
      ocrHits.push(b.text.slice(0, 80));
    }
  }

  return {
    id,
    scenes: scenes.length,
    breaths: breaths.length,
    openingScenes: opening?.scenes?.length ?? 0,
    openingBreaths: opening?.breaths?.length ?? 0,
    chopTitles: chopTitles.length,
    genericChapter: genericChapter.length,
    uniqueTitles: uniqueTitles.size,
    firstTitle: titles[0],
    sampleTitles: titles.slice(0, 8),
    bleed,
    bleedExamples,
    ocrHits: ocrHits.slice(0, 6),
    needsRebind: chopTitles.length > 0 || bleed > 3 || genericChapter.length > scenes.length * 0.4,
  };
}

const ids = extractPoemIds();
const rows = ids.map(analyze);
console.log(`local poem ids: ${ids.length}`);
console.log(`with text files: ${rows.filter((r) => !r.missing).length}`);
console.log(`missing text: ${rows.filter((r) => r.missing).map((r) => r.id).join(", ") || "none"}`);
console.log("");
console.log("NEEDS REBIND");
for (const r of rows.filter((r) => !r.missing && r.needsRebind)) {
  console.log(
    `- ${r.id} scenes=${r.scenes} breaths=${r.breaths} chops=${r.chopTitles} genericCh=${r.genericChapter} bleed=${r.bleed} first="${r.firstTitle}"`,
  );
  if (r.bleedExamples.length) {
    for (const ex of r.bleedExamples) {
      console.log(`    bleed @${ex.at} [${ex.scene}] "${ex.text}" → "${ex.next ?? ""}"`);
    }
  }
  if (r.ocrHits.length) console.log(`    ocr: ${r.ocrHits.join(" | ")}`);
}
console.log("");
console.log("LOOKS OK");
for (const r of rows.filter((r) => !r.missing && !r.needsRebind)) {
  console.log(
    `- ${r.id} scenes=${r.scenes} breaths=${r.breaths} chops=${r.chopTitles} genericCh=${r.genericChapter} bleed=${r.bleed} first="${r.firstTitle}"`,
  );
}
console.log("");
console.log("OCR ANY");
for (const r of rows.filter((r) => r.ocrHits?.length)) {
  console.log(`- ${r.id}: ${r.ocrHits.join(" | ")}`);
}

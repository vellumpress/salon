import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  mergeWorkDialogue,
  openingFromWork,
  workHasCueOnlyBreaths,
} from "../src/lib/catalog/dialogue-formatting.ts";
import type { Work } from "../src/lib/literature.ts";

const root = join(import.meta.dirname, "..");
const textsDir = join(root, "src/lib/catalog/texts");
const openingsDir = join(root, "src/lib/catalog/openings");
const shelfPath = join(root, "src/lib/catalog/shelf.ts");

function load(path: string): Work {
  return JSON.parse(readFileSync(path, "utf8")) as Work;
}

function dump(path: string, work: Work) {
  writeFileSync(path, JSON.stringify(work));
}

function breathsEqual(a: Work, b: Work) {
  if (a.breaths.length !== b.breaths.length) return false;
  return a.breaths.every(
    (breath, i) => breath.text === b.breaths[i]?.text && breath.sceneId === b.breaths[i]?.sceneId,
  );
}

function looksLikeBareCue(text: string) {
  const t = text.trim();
  if (!t) return false;
  if (!/[.:]$/.test(t) && !/\[[^\]]+\]\s+[A-Z]/.test(t)) return false;
  return /^(?:\[[^\]]+\]\s*)?(?:[A-Z][A-Z''.\-]*(?:\s+[A-Z][A-Z''.\-]*){0,4})\s*\.?$/.test(t);
}

function patchShelf(shelf: string, id: string, opening: string, count: number, updateOpening: boolean) {
  const needle = `id: "${id}"`;
  const start = shelf.indexOf(needle);
  if (start < 0) return shelf;
  const from = start + needle.length;
  const nextObj = shelf.indexOf("\n  { id:", from);
  const nextMulti = shelf.indexOf("\n  {\n    id:", from);
  const endCandidates = [nextObj, nextMulti, shelf.indexOf("\n];", from)].filter((n) => n >= 0);
  const end = endCandidates.length ? Math.min(...endCandidates) : shelf.length;
  let block = shelf.slice(start, end);
  if (updateOpening && opening) {
    if (/\bopening:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/.test(block)) {
      block = block.replace(
        /\bopening:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/,
        `opening: ${JSON.stringify(opening)}`,
      );
    }
  }
  if (/\bbreaths:\s*\d+/.test(block)) {
    block = block.replace(/\bbreaths:\s*\d+/, `breaths: ${count}`);
  }
  return shelf.slice(0, start) + block + shelf.slice(end);
}

const changed: string[] = [];
let shelf = readFileSync(shelfPath, "utf8");

for (const file of readdirSync(textsDir).filter((name) => name.endsWith(".json"))) {
  const path = join(textsDir, file);
  const work = load(path);
  const merged = mergeWorkDialogue(work);
  if (breathsEqual(work, merged) && !workHasCueOnlyBreaths(work)) {
    continue;
  }
  dump(path, merged);
  const openingPath = join(openingsDir, file);
  dump(openingPath, openingFromWork(merged));
  const first = merged.breaths[0]?.text ?? "";
  const prevFirst = work.breaths[0]?.text ?? "";
  shelf = patchShelf(
    shelf,
    work.id,
    first,
    merged.breaths.length,
    looksLikeBareCue(prevFirst) || first !== prevFirst,
  );
  changed.push(`${work.id}:${work.breaths.length}->${merged.breaths.length}`);
}

writeFileSync(shelfPath, shelf);

console.log(`rewrote ${changed.length} packs`);
for (const line of changed) console.log(" ", line);

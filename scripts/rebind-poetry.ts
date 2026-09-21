#!/usr/bin/env node
/**
 * Rebuild local form:poem binds so each poem is one scene.
 * Usage:
 *   node --experimental-strip-types scripts/rebind-poetry.ts --dry
 *   node --experimental-strip-types scripts/rebind-poetry.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  openingFromScenes,
  poemTitleBleed,
  rebindPoetryWork,
  TIMED_SIT_TITLE,
} from "../src/lib/catalog/poetry-bind.ts";
import type { Work } from "../src/lib/literature.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7);

function localPoemIds() {
  const src = readFileSync(join(root, "src/lib/catalog/shelf.ts"), "utf8");
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const m of src.matchAll(/\{\s*id:\s*"([^"]+)"[^}]*form:\s*"poem"[^}]*\}/g)) {
    if (!m[0].includes("local: true")) continue;
    seen.add(m[1]!);
    ids.push(m[1]!);
  }
  for (const block of src.split(/\n  \{/)) {
    if (!/form:\s*"poem"/.test(block) || !/local:\s*true/.test(block)) continue;
    const id = block.match(/id:\s*"([^"]+)"/)?.[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function writeJson(path: string, work: Work) {
  const prev = readFileSync(path, "utf8");
  const pretty = /\n\s+"id"/.test(prev) || prev.startsWith("{\n");
  const body = pretty ? `${JSON.stringify(work, null, 2)}\n` : JSON.stringify(work);
  writeFileSync(path, body);
}

function updateShelfBreaths(id: string, breaths: number) {
  const path = join(root, "src/lib/catalog/shelf.ts");
  const src = readFileSync(path, "utf8");
  const idAt = src.indexOf(`id: "${id}"`);
  if (idAt < 0) return false;
  const nextId = src.indexOf(`id: "`, idAt + 8);
  const sliceEnd = nextId < 0 ? src.length : nextId;
  const slice = src.slice(idAt, sliceEnd);
  const replaced = slice.replace(/breaths:\s*\d+/, `breaths: ${breaths}`);
  if (replaced === slice) return false;
  writeFileSync(path, src.slice(0, idAt) + replaced + src.slice(sliceEnd));
  return true;
}

function load(path: string): Work {
  return JSON.parse(readFileSync(path, "utf8")) as Work;
}

const ids = (only ? [only] : localPoemIds()).filter((id) =>
  existsSync(join(root, "src/lib/catalog/texts", `${id}.json`)),
);

const report: string[] = [];
for (const id of ids) {
  const textPath = join(root, "src/lib/catalog/texts", `${id}.json`);
  const openPath = join(root, "src/lib/catalog/openings", `${id}.json`);
  const before = load(textPath);
  const after = rebindPoetryWork(before);
  const chops = after.scenes.filter((s) => TIMED_SIT_TITLE.test(s.title)).length;
  const bleed = poemTitleBleed(after);
  const openingBefore = existsSync(openPath) ? load(openPath) : null;
  let openingAfter = openingBefore ? rebindPoetryWork(openingBefore) : null;
  if (id === "gitanjali" && openingBefore && openingAfter) {
    openingAfter = openingFromScenes(after, openingBefore, 2);
  }
  report.push(
    [
      id,
      `scenes ${before.scenes.length}→${after.scenes.length}`,
      `breaths ${before.breaths.length}→${after.breaths.length}`,
      `first="${after.scenes[0]?.title}"`,
      chops ? `CHOPS=${chops}` : "",
      bleed.length ? `BLEED=${bleed.length}` : "",
      openingAfter
        ? `opening ${openingBefore!.scenes.length}→${openingAfter.scenes.length}/${openingBefore!.breaths.length}→${openingAfter.breaths.length}`
        : "",
    ]
      .filter(Boolean)
      .join(" | "),
  );
  if (id === "gitanjali" || id === "a-hundred-and-seventy-chinese-poems") {
    console.log(`\n## ${id} first 24 scenes`);
    for (const scene of after.scenes.slice(0, 24)) {
      const n = after.breaths.filter((b) => b.sceneId === scene.id).length;
      console.log(`  ${scene.id} [${n}] ${scene.title} :: ${scene.reentry.slice(0, 70)}`);
    }
    if (openingAfter) {
      console.log(`  opening scenes:`);
      for (const scene of openingAfter.scenes) {
        console.log(`    ${scene.title} :: ${scene.reentry.slice(0, 70)}`);
      }
    }
  }
  if (!dry) {
    writeJson(textPath, after);
    if (openingAfter) writeJson(openPath, openingAfter);
    updateShelfBreaths(id, after.breaths.length);
  }
}

console.log("\n" + report.join("\n"));
console.log(dry ? `\ndry-run ${ids.length} works` : `\nwrote ${ids.length} works`);

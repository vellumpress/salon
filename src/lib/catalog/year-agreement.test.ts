import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { creditLine } from "../credit-line.ts";
import { SHELF } from "./shelf.ts";

/**
 * The Rituals card and the shelf row read `shelf.year`.
 * The start screen reads `year` on the bound text, and on the opening
 * while that is what has loaded. Those three have to name the same year.
 * A translation date stays in the preface, not as a second year on one surface.
 */
function boundYear(folder: "texts" | "openings", id: string): string | undefined {
  const path = new URL(`./${folder}/${id}.json`, import.meta.url);
  if (!existsSync(path)) return undefined;
  const raw = JSON.parse(readFileSync(path, "utf8")) as { year?: string | number | null };
  if (raw.year == null) return "";
  return String(raw.year).trim();
}

test("card, start screen, and shelf show the same year", () => {
  const failures: string[] = [];
  for (const work of SHELF) {
    const shelfYear = work.year == null ? "" : String(work.year).trim();
    const card = creditLine(work.author, work.year);
    const textYear = boundYear("texts", work.id);
    const openYear = boundYear("openings", work.id);
    if (textYear === undefined && openYear === undefined) continue;
    if (textYear !== undefined && (textYear !== shelfYear || creditLine(work.author, textYear) !== card)) {
      failures.push(`${work.id} shelf "${shelfYear}" card "${card}" start "${creditLine(work.author, textYear)}"`);
    }
    if (openYear !== undefined && openYear !== shelfYear) {
      failures.push(`${work.id} opening "${openYear}" shelf "${shelfYear}"`);
    }
  }
  assert.deepEqual(failures, []);
});

test("Botchan's card and start screen both say 1906", () => {
  const work = SHELF.find((item) => item.id === "botchan");
  assert.ok(work);
  assert.equal(work.year, 1906);
  assert.equal(boundYear("texts", "botchan"), "1906");
  assert.equal(boundYear("openings", "botchan"), "1906");
  assert.equal(creditLine(work.author, work.year), "Natsume Sōseki · 1906");
  assert.match(
    JSON.parse(readFileSync(new URL("./texts/botchan.json", import.meta.url), "utf8")).note as string,
    /Yasotaro Mori’s 1919 translation/,
  );
});

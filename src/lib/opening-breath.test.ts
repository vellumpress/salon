import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { splitSentences } from "./sentences.ts";

type Opening = { id: string; title: string; sentences: number };

function openings(): Opening[] {
  const dir = new URL("./catalog/texts/", import.meta.url);
  const rows: Opening[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const book = JSON.parse(readFileSync(new URL(file, dir), "utf8")) as {
      id?: string;
      title?: string;
      breaths?: { text?: string }[];
    };
    const text = book.breaths?.[0]?.text ?? "";
    rows.push({
      id: book.id ?? file.replace(/\.json$/, ""),
      title: book.title ?? "",
      sentences: splitSentences(text).length,
    });
  }
  return rows;
}

test("Quicksand's first breath holds many sentences, and so do other openings", () => {
  const rows = openings();
  const quicksand = rows.find((row) => row.id === "quicksand");
  assert.ok(quicksand, "quicksand missing");
  assert.ok(quicksand.sentences >= 4, `quicksand opens on ${quicksand.sentences} sentences`);
  const long = rows.filter((row) => row.sentences >= 4);
  assert.ok(long.length > 50, `expected many long openings, saw ${long.length}`);
  assert.equal(long.some((row) => row.id === "the-house-of-mirth"), false);
});

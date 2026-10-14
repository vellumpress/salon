import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { colonelBreathPlace, placeAliasAt } from "../colonel-place.ts";
import { normalizeKeptText } from "../kept-lines.ts";
import { sentenceSpans } from "../sentences.ts";
import { cardReadPath } from "../salon-card.ts";
import { remapAliasedWorkIds } from "../work-id-alias.ts";
import { RITUAL_LANES, RITUAL_SIT_MINUTES } from "./rituals.ts";
import { searchShelf, SHELF } from "./shelf.ts";

function expectedPlace(partialText: string, fullNorm: string[], fullBy: Map<string, number>) {
  const key = normalizeKeptText(partialText);
  if (key && fullBy.has(key)) return { index: fullBy.get(key) ?? 0, exact: true };
  const spans = sentenceSpans(partialText);
  const span = spans[0];
  const sentence = span ? normalizeKeptText(partialText.slice(span.start, span.end)) : key;
  if (sentence.length >= 16) {
    if (fullBy.has(sentence)) return { index: fullBy.get(sentence) ?? 0, exact: false };
    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < fullNorm.length; i++) {
      const hay = fullNorm[i] ?? "";
      if (!hay || hay === sentence) continue;
      const shorter = Math.min(sentence.length, hay.length);
      if (shorter < 16) continue;
      if (!(hay.includes(sentence) || sentence.includes(hay))) continue;
      const score = shorter / Math.max(sentence.length, hay.length);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best >= 0) return { index: best, exact: false };
  }
  return { index: 0, exact: false };
}

test("the partial Colonel bind follows the full book by sentence text", () => {
  assert.equal(SHELF.some((item) => item.id === "the-colonel-s-dream"), false);
  assert.equal(SHELF.filter((item) => item.id === "colonels-dream").length, 1);
  assert.deepEqual(
    searchShelf("The Colonel's Dream").map((item) => item.id),
    ["colonels-dream"],
  );
  assert.equal(RITUAL_SIT_MINUTES["the-colonel-s-dream"], undefined);
  assert.equal(RITUAL_SIT_MINUTES["colonels-dream"], 5);
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("the-colonel-s-dream"), false, lane.id);
  }
  const seated = RITUAL_LANES.filter((lane) => lane.workIds.includes("colonels-dream")).map((lane) => lane.id);
  assert.deepEqual(seated, ["before-sleep", "unwind", "on-a-walk"]);

  const partial = JSON.parse(readFileSync(new URL("./texts/the-colonel-s-dream.json", import.meta.url), "utf8")) as {
    breaths: { text: string }[];
  };
  const full = JSON.parse(readFileSync(new URL("./texts/colonels-dream.json", import.meta.url), "utf8")) as {
    breaths: { text: string }[];
  };
  const fullNorm = full.breaths.map((breath) => normalizeKeptText(breath.text));
  const fullBy = new Map<string, number>();
  fullNorm.forEach((key, index) => {
    if (key && !fullBy.has(key)) fullBy.set(key, index);
  });
  partial.breaths.forEach((breath, index) => {
    assert.deepEqual(colonelBreathPlace(index), expectedPlace(breath.text, fullNorm, fullBy), String(index));
  });

  const opening = "Two gentlemen were seated, one March morning in 189--, in the private office of French and Company, Limited, on lower Broadway.";
  const openingAt = partial.breaths.findIndex((breath) => breath.text.startsWith(opening));
  assert.equal(openingAt, 22);
  assert.deepEqual(colonelBreathPlace(openingAt), { index: 0, exact: true });
  assert.equal(placeAliasAt("the-colonel-s-dream", openingAt), 0);
  assert.equal(placeAliasAt("colonels-dream", 22), 22);
  assert.equal(cardReadPath({ workId: "the-colonel-s-dream", at: openingAt }), "/read/colonels-dream?at=0");

  const remapped = remapAliasedWorkIds({
    progress: {
      "the-colonel-s-dream": {
        lastOpenedAt: 9,
        breathIndex: openingAt,
        sentenceAt: 1,
        breathId: "s0-31",
        breathCount: 1549,
        kept: [
          "s0-31",
          {
            v: 1 as const,
            id: "s0-32",
            text: "Mr. French",
            workId: "the-colonel-s-dream",
            title: "The Colonel's Dream",
            author: "Charles W. Chesnutt",
            savedAt: 1,
          },
        ],
      },
      "colonels-dream": { lastOpenedAt: 4, breathIndex: 8, sentenceAt: 0, kept: ["live"] },
    },
  });
  const row = remapped.progress?.["colonels-dream"] as {
    lastOpenedAt?: number;
    breathIndex?: number;
    sentenceAt?: number;
    breathId?: string;
    breathCount?: number;
    kept?: ({ workId?: string } | string)[];
  };
  assert.equal(remapped.progress?.["the-colonel-s-dream"], undefined);
  assert.equal(row?.lastOpenedAt, 9);
  assert.equal(row?.breathIndex, 0);
  assert.equal(row?.sentenceAt, 1);
  assert.equal(row?.breathId, undefined);
  assert.equal(row?.breathCount, undefined);
  const kept = row?.kept ?? [];
  assert.equal(kept.includes("s0-31"), false);
  assert.equal(
    kept.some((entry) => typeof entry === "object" && entry.workId === "colonels-dream"),
    true,
  );

  const olderPartial = remapAliasedWorkIds({
    progress: {
      "the-colonel-s-dream": { lastOpenedAt: 2, breathIndex: 0, sentenceAt: 3 },
      "colonels-dream": { lastOpenedAt: 6, breathIndex: 11, sentenceAt: 2 },
    },
  });
  const keptFull = olderPartial.progress?.["colonels-dream"] as { breathIndex?: number; sentenceAt?: number };
  assert.equal(keptFull?.breathIndex, 11);
  assert.equal(keptFull?.sentenceAt, 2);
});

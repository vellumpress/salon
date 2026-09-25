import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Work } from "./literature.ts";
import { preferLoadedWork, spineChapters } from "./spine-nav.ts";

function breath(sceneId: string, n: number, text = sceneId) {
  return { id: `${sceneId}-${n}`, sceneId, text };
}

function sit(): Work {
  return {
    id: "a-sit",
    title: "A sit",
    author: "Host",
    year: "1905",
    note: "",
    minutes: 5,
    cover: "",
    coverAlt: "",
    scenes: [
      { id: "s0", title: "One", place: "One", reentry: "a", prompt: "" },
      { id: "s1", title: "Two", place: "Two", reentry: "b", prompt: "" },
    ],
    breaths: [breath("s0", 0), breath("s1", 0)],
  };
}

test("a short sit keeps later chapters locked until the bind is complete", () => {
  const work = sit();
  const early = spineChapters(work, 0, false);
  assert.equal(early[0]?.open, true);
  assert.equal(early[1]?.open, false);
  const done = spineChapters(work, 0, true);
  assert.equal(done.every((chapter) => chapter.open), true);
});

test("House of Mirth spine names both books and opens every chapter", () => {
  const work = JSON.parse(
    readFileSync(new URL("./catalog/texts/the-house-of-mirth.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(work.scenes.length, 31);
  assert.equal(work.breaths.length, 6465);

  const chapters = spineChapters(work, 0, true);
  assert.equal(chapters.length, 29);
  assert.equal(chapters[0]?.place, "Book I · Chapter 1");
  assert.equal(chapters[9]?.place, "Book I · Chapter 10");
  assert.equal(chapters[14]?.place, "Book I · Chapter 15");
  assert.equal(chapters[15]?.place, "Book II · Chapter 1");
  assert.equal(chapters[28]?.place, "Book II · Chapter 14");
  assert.equal(
    chapters.every((chapter) => chapter.open),
    true,
  );
  assert.equal(
    chapters.some((chapter) => /THE END|GUTENBERG|transcriber/i.test(chapter.place)),
    false,
  );

  const chapter10 = work.breaths[chapters[9]!.start];
  const bookTwo = work.breaths[chapters[15]!.start];
  assert.match(chapter10?.text ?? "", /autumn dragged on monotonously/);
  assert.match(bookTwo?.text ?? "", /Monte Carlo/);

  const locked = spineChapters(work, 0, false);
  assert.equal(locked[0]?.open, true);
  assert.equal(locked[1]?.open, false);
  assert.equal(locked[9]?.open, false);
  assert.equal(locked[15]?.open, false);
});

test("a full bind replaces a shorter opening and not the other way around", () => {
  const opening = JSON.parse(
    readFileSync(new URL("./catalog/openings/the-house-of-mirth.json", import.meta.url), "utf8"),
  ) as Work;
  const full = JSON.parse(
    readFileSync(new URL("./catalog/texts/the-house-of-mirth.json", import.meta.url), "utf8"),
  ) as Work;
  assert.ok(opening.breaths.length < 40);
  assert.equal(opening.scenes.length, 1);
  assert.equal(preferLoadedWork(opening, full)?.breaths.length, full.breaths.length);
  assert.equal(preferLoadedWork(full, opening)?.breaths.length, full.breaths.length);
  assert.equal(preferLoadedWork(undefined, opening), opening);
});

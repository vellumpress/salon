import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Work } from "./literature.ts";
import { breathsFor } from "./literature.ts";
import { openingBreathIndex } from "./opening-scene.ts";

function load(id: string): Work {
  return JSON.parse(readFileSync(new URL(`./catalog/texts/${id}.json`, import.meta.url), "utf8")) as Work;
}

function work(scenes: { id: string; title: string; front?: boolean; lines: string[] }[]): Work {
  return {
    id: "sample",
    title: "Sample",
    author: "Host",
    year: "1894",
    note: "",
    minutes: 5,
    cover: "",
    coverAlt: "",
    scenes: scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      place: scene.title,
      reentry: scene.lines[0] ?? "",
      prompt: "A word from this stretch.",
      ...(scene.front ? { front: true } : {}),
    })),
    breaths: scenes.flatMap((scene) => breathsFor(scene.id, scene.lines)),
  };
}

test("The Real Charlotte opens on the August Sunday, not the publication note", () => {
  const book = load("the-real-charlotte");
  const at = openingBreathIndex(book);
  assert.equal(book.scenes[0]?.title, "Publication note");
  assert.equal(book.scenes[0]?.id, "s0");
  assert.match(book.breaths[0]?.text ?? "", /^Note: First published by Ward & Downey/);
  assert.equal(book.breaths[0]?.id, "s0-0");
  assert.match(book.breaths[at]?.text ?? "", /^An August Sunday afternoon/);
  assert.equal(book.breaths[at]?.sceneId, "s1");
  assert.ok(at > 0);
});

test("Gone to Earth opens on the hills, not the dedication", () => {
  const book = load("gone-to-earth");
  const at = openingBreathIndex(book);
  assert.equal(book.scenes[0]?.title, "Dedication");
  assert.equal(book.scenes[0]?.id, "s0");
  assert.match(book.breaths[0]?.text ?? "", /To him whose presence is home/);
  assert.equal(book.breaths[0]?.id, "s0-0");
  assert.match(book.breaths[at]?.text ?? "", /^Small feckless clouds were hurried/);
  assert.equal(book.breaths[at]?.sceneId, "s1");
  assert.ok(at > 0);
});

test("a book with no front matter still opens on its first breath", () => {
  const book = load("pembroke");
  const at = openingBreathIndex(book);
  assert.equal(at, 0);
  assert.equal(book.scenes[0]?.title, "Chapter I");
  assert.match(book.breaths[0]?.text ?? "", /^At half-past six o'clock/);
  assert.equal(book.breaths[at]?.id, book.breaths[0]?.id);
});

test("a leading front: true scene is skipped and a later tag is not", () => {
  const tagged = work([
    { id: "notice", title: "Notice", front: true, lines: ["Page back for this notice."] },
    { id: "prose", title: "The road", lines: ["The road was empty at dawn."] },
  ]);
  const at = openingBreathIndex(tagged);
  assert.equal(at, 1);
  assert.equal(tagged.scenes[0]?.id, "notice");
  assert.equal(tagged.breaths[0]?.id, "notice-0");
  assert.equal(tagged.breaths[at]?.text, "The road was empty at dawn.");

  const proseFirst = work([
    { id: "prose", title: "The road", lines: ["The road was empty at dawn."] },
    { id: "later", title: "Note", front: true, lines: ["A note after the prose."] },
  ]);
  assert.equal(openingBreathIndex(proseFirst), 0);
  assert.equal(proseFirst.breaths[0]?.text, "The road was empty at dawn.");
});

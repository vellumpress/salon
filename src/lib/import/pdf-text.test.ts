import assert from "node:assert/strict";
import test from "node:test";
import { splitEmphasis } from "../emphasized-text.ts";
import { SCANNED_PDF } from "./messages.ts";
import { workFromPdfPages } from "./pdf-text.ts";

test("pdf lines join hyphenation and keep printed quotes", () => {
  const work = workFromPdfPages({
    title: "A morning",
    author: "Ada",
    source: "morning.pdf",
    pages: [
      {
        lines: [
          { text: "The beau-", size: 12 },
          { text: "tiful morning began when she said \"Stay.\"", size: 12 },
        ],
      },
    ],
  });
  const text = work.breaths.map((breath) => breath.text).join(" ");
  assert.match(text, /beautiful morning/);
  assert.match(text, /"Stay\."/);
  assert.equal(work.scenes.length, 1);
  assert.equal(work.scenes[0]?.title, "Part 1");
  assert.equal(work.breaths[0]?.sceneId, work.scenes[0]?.id);
});

test("pdf drops repeated headers, footers, and page numbers", () => {
  const pages = [1, 2, 3, 4].map((n) => ({
    lines: [
      { text: "The Running Head", size: 10 },
      { text: `A unique sentence number ${n} is here.`, size: 12 },
      { text: String(n), size: 10 },
    ],
  }));
  const work = workFromPdfPages({
    title: "Novel",
    author: "Ada",
    source: "novel.pdf",
    pages,
  });
  const text = work.breaths.map((breath) => breath.text).join("\n");
  assert.doesNotMatch(text, /Running Head/);
  assert.doesNotMatch(text, /^\d+$/m);
  assert.equal(work.breaths.length, 4);
  assert.match(text, /sentence number 3/);
});

test("pdf large-font lines become scenes and italics stay marked", () => {
  const work = workFromPdfPages({
    title: "Two chapters",
    author: "Ada",
    source: "two.pdf",
    pages: [
      {
        lines: [
          { text: "Chapter One", size: 22 },
          { text: "The door opened.", size: 12 },
          { text: "She spoke softly.", size: 12, italic: true },
        ],
      },
      {
        lines: [
          { text: "Chapter Two", size: 22 },
          { text: "The road continued.", size: 12 },
        ],
      },
    ],
  });
  assert.deepEqual(
    work.scenes.map((scene) => scene.title),
    ["Chapter One", "Chapter Two"],
  );
  const italic = work.breaths.find((breath) => breath.text.includes("softly"));
  assert.ok(italic);
  assert.ok(splitEmphasis(italic.text).some((part) => part.type === "em" && part.value === "She spoke softly."));
  assert.equal(work.breaths.filter((breath) => breath.sceneId === "s0").length, 2);
  assert.equal(work.breaths.filter((breath) => breath.sceneId === "s1").length, 1);
});

test("pdf outline headings split pages when the font does not", () => {
  const work = workFromPdfPages({
    title: "Outlined",
    author: "Ada",
    source: "outline.pdf",
    outline: [
      { title: "Chapter One", page: 1 },
      { title: "Chapter Two", page: 2 },
    ],
    pages: [
      { lines: [{ text: "Once there was a house.", size: 12 }] },
      { lines: [{ text: "Then the house was quiet.", size: 12 }] },
    ],
  });
  assert.deepEqual(
    work.scenes.map((scene) => scene.title),
    ["Chapter One", "Chapter Two"],
  );
  assert.match(work.breaths[0]?.text ?? "", /Once there was a house/);
  assert.match(work.breaths[1]?.text ?? "", /house was quiet/);
});

test("pdf without headings falls back to length", () => {
  const lines = Array.from({ length: 45 }, (_, i) => ({
    text: `Sentence number ${i} ends here.`,
    size: 12,
  }));
  const work = workFromPdfPages({
    title: "Long",
    author: "Ada",
    source: "long.pdf",
    pages: [{ lines }],
  });
  assert.equal(work.scenes.length, 2);
  assert.equal(work.scenes[0]?.title, "Part 1");
  assert.equal(work.scenes[1]?.title, "Part 2");
  assert.equal(work.breaths.length, 45);
  assert.equal(work.breaths.filter((breath) => breath.sceneId === "s0").length, 40);
});

test("a pdf with no words is reported as a scan", () => {
  assert.throws(
    () =>
      workFromPdfPages({
        title: "Scan",
        author: "",
        source: "scan.pdf",
        pages: [
          { lines: [{ text: "1", size: 10 }] },
          { lines: [{ text: "2", size: 10 }] },
        ],
      }),
    (err: unknown) => err instanceof Error && err.message === SCANNED_PDF,
  );
});

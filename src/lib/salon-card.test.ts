import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cardFill, cardReadPath, cardReadUrl, CARD_HEIGHT, CARD_WIDTH, paintSalonCard } from "./salon-card.ts";

test("cardFill follows the work's Mondrian plane", () => {
  assert.equal(cardFill({ text: "x", title: "Passing", author: "Nella Larsen", workId: "passing" }), "red");
  assert.equal(cardFill({ text: "x", title: "We", author: "Zamyatin", workId: "we" }), "yellow");
  assert.equal(cardFill({ text: "x", title: "A", author: "B", fill: "forest" }), "forest");
});

test("cardReadPath is a Pages-safe reader deep link", () => {
  assert.equal(cardReadPath({ workId: "passing", at: 12 }), "/read/passing?at=12");
});

test("cardReadUrl is absolute under the Pages base", () => {
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string } } }).window = {
    location: { origin: "https://vellumpress.github.io" },
  };
  try {
    assert.equal(
      cardReadUrl({ workId: "passing", at: 12 }),
      "https://vellumpress.github.io/salon/read/passing?at=12",
    );
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});

test("paintSalonCard draws a framed card without throwing", () => {
  const calls: string[] = [];
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "alphabetic",
    fillRect: () => {
      calls.push("rect");
    },
    fillText: () => {
      calls.push("text");
    },
    measureText: (text: string) => ({ width: text.length * 20 }),
  } as unknown as CanvasRenderingContext2D;
  paintSalonCard(
    ctx,
    {
      text: "The envelope is still unopened.",
      title: "Passing",
      author: "Nella Larsen",
      workId: "passing",
    },
    CARD_WIDTH,
    CARD_HEIGHT,
  );
  assert.ok(calls.includes("rect"));
  assert.ok(calls.includes("text"));
});

test("Salon card share opens native share before any hosted persist", () => {
  const source = readFileSync(new URL("../components/salon-card-share.tsx", import.meta.url), "utf8");
  const shareAt = source.indexOf("shareOrCopy(");
  const persistAt = source.indexOf("createSentenceShare(");
  assert.ok(shareAt > -1);
  assert.match(source, /cardReadUrl/);
  if (persistAt > -1) {
    assert.ok(shareAt < persistAt);
    assert.match(source, /liveBackendEnabled/);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { cardFill, cardReadPath, CARD_HEIGHT, CARD_WIDTH, paintSalonCard } from "./salon-card.ts";

test("cardFill follows the work's Mondrian plane", () => {
  assert.equal(cardFill({ text: "x", title: "Passing", author: "Nella Larsen", workId: "passing" }), "red");
  assert.equal(cardFill({ text: "x", title: "We", author: "Zamyatin", workId: "we" }), "yellow");
  assert.equal(cardFill({ text: "x", title: "A", author: "B", fill: "forest" }), "forest");
});

test("cardReadPath is a Pages-safe reader deep link", () => {
  assert.equal(cardReadPath({ workId: "passing", at: 12 }), "/read/passing?at=12");
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

import assert from "node:assert/strict";
import test from "node:test";
import { splitEmphasis } from "../emphasized-text.ts";
import { workFromArticleHtml } from "./html-text.ts";
import { PAGE_EMPTY } from "./messages.ts";

test("html headings become scenes and emphasis becomes italics", () => {
  const work = workFromArticleHtml({
    title: "The Article",
    author: "Ada Lovelace",
    source: "https://example.com/story",
    html: `
      <h1>The Article</h1>
      <p>She said "hello" in a <em>quiet</em> voice.</p>
      <h2>Second</h2>
      <p>The <i>river</i> kept moving.</p>
      <h3>Third</h3>
      <p>The _bank_ stayed where it was.</p>
    `,
  });
  assert.deepEqual(
    work.scenes.map((scene) => scene.title),
    ["The Article", "Second", "Third"],
  );
  const hello = work.breaths.find((breath) => breath.text.includes("hello"));
  assert.ok(hello);
  assert.match(hello.text, /"hello"/);
  assert.ok(splitEmphasis(hello.text).some((part) => part.type === "em" && part.value === "quiet"));
  const river = work.breaths.find((breath) => breath.text.includes("river"));
  assert.ok(river);
  assert.ok(splitEmphasis(river.text).some((part) => part.type === "em" && part.value === "river"));
  const bank = work.breaths.find((breath) => breath.text.includes("bank"));
  assert.ok(bank);
  assert.ok(splitEmphasis(bank.text).some((part) => part.type === "em" && part.value === "bank"));
  assert.equal(work.author, "Ada Lovelace");
  assert.match(work.note, /example\.com\/story/);
});

test("html without headings falls back to length and keeps quotes", () => {
  const html = Array.from({ length: 45 }, (_, i) => `<p>Sentence number ${i} ends with "care."</p>`).join("");
  const work = workFromArticleHtml({
    title: "Notes",
    author: "Ada",
    source: "https://example.com/notes",
    html,
  });
  assert.equal(work.scenes.length, 2);
  assert.equal(work.scenes[0]?.title, "Part 1");
  assert.equal(work.scenes[1]?.title, "Part 2");
  assert.match(work.breaths[0]?.text ?? "", /"care\."/);
  assert.equal(work.breaths.length, 45);
});

test("empty or walled html is a friendly error", () => {
  assert.throws(
    () =>
      workFromArticleHtml({
        title: "",
        author: "",
        source: "https://example.com/paywall",
        html: "<html><body><nav>Subscribe</nav></body></html>",
      }),
    (err: unknown) => err instanceof Error && err.message === PAGE_EMPTY,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { wordmarkInk, wordmarkStop } from "./brand.ts";
import {
  APP_BASE_PATH,
  APP_DESCRIPTION,
  APP_NAME,
  WORDMARK,
  publicUrl,
  salonShareText,
  salonShareTitle,
  withBase,
} from "./site.ts";

test("withBase prefixes the Pages subdirectory and does not double it", () => {
  assert.equal(withBase("/read/passing?at=12"), `${APP_BASE_PATH}/read/passing?at=12`);
  assert.equal(withBase("/salon/read/passing?at=12"), `${APP_BASE_PATH}/read/passing?at=12`);
});

test("publicUrl is origin + Pages base when window is present", () => {
  const prev = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { location: { origin: string } } }).window = {
    location: { origin: "https://vellumpress.github.io" },
  };
  try {
    assert.equal(
      publicUrl("/read/passing?at=12"),
      "https://vellumpress.github.io/salon/read/passing?at=12",
    );
    assert.equal(
      publicUrl("https://vellumpress.github.io/salon/club/invite/tok_en-123456"),
      "https://vellumpress.github.io/salon/club/invite/tok_en-123456",
    );
  } finally {
    if (prev === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = prev;
  }
});

test("share copy keeps tbr lowercase on the title and the body", () => {
  assert.equal(APP_NAME, "tbr");
  assert.equal(APP_NAME, APP_NAME.toLowerCase());
  assert.equal(salonShareTitle("Passing"), "Passing · tbr");
  assert.equal(salonShareTitle("tbr"), "tbr");
  assert.match(salonShareText("The envelope is still unopened."), /tbr/);
  // Guard: share copy must not bring the retired product name back.
  assert.doesNotMatch(salonShareText("The envelope is still unopened."), /TBR|Vellum|Salon/);
  assert.match(salonShareText("The envelope is still unopened."), /envelope/);
  const site = JSON.parse(readFileSync(new URL("./og/site.json", import.meta.url), "utf8"));
  assert.equal(site.title, APP_NAME);
  assert.equal(site.description, APP_DESCRIPTION);
  assert.match(APP_DESCRIPTION, /^tbr\./);
  assert.equal(WORDMARK, "tbr.");
});

test("wordmark colors follow the sheet and the homepage mark has no gloss", () => {
  assert.equal(wordmarkInk("paper"), "ink");
  assert.equal(wordmarkStop("paper"), "oxblood");
  for (const surface of ["forest", "navy", "blue", "oxblood", "ink"] as const) {
    assert.equal(wordmarkInk(surface), "paper", surface);
    assert.equal(wordmarkStop(surface), "olive", surface);
  }
  assert.equal(wordmarkInk("olive"), "ink");
  assert.equal(wordmarkStop("olive"), "ink");

  const wordmark = readFileSync(new URL("../components/wordmark.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../routes/index.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(wordmark, /wordmark-stop/);
  assert.doesNotMatch(wordmark, /to be read/i);
  assert.doesNotMatch(wordmark, /wordmark-tagline|wordmark-lockup/);
  assert.doesNotMatch(home, /to be read/i);
  assert.match(home, /<Wordmark/);
  assert.match(css, /--color-oxblood:\s*#4b2a28/);
  assert.doesNotMatch(css, /wordmark-tagline/);
});

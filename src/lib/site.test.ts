import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  APP_BASE_PATH,
  APP_DESCRIPTION,
  APP_NAME,
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
  assert.doesNotMatch(salonShareText("The envelope is still unopened."), /TBR|Vellum|Salon/);
  assert.match(salonShareText("The envelope is still unopened."), /envelope/);
  const site = JSON.parse(readFileSync(new URL("./og/site.json", import.meta.url), "utf8"));
  assert.equal(site.title, APP_NAME);
  assert.equal(site.description, APP_DESCRIPTION);
  assert.match(APP_DESCRIPTION, /^tbr\./);
});

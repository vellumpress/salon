import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(rel: string) {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

test("place chip is wired on home, shelf, rituals, Adapted, You, and reader preface", () => {
  const featured = read("../../components/featured-strip.tsx");
  const strip = read("../../components/works-strip.tsx");
  const search = read("../../components/shelf-search.tsx");
  const rituals = read("../../routes/rituals.tsx");
  const adapted = read("../../routes/adapted.tsx");
  const favorites = read("../../components/favorite-works.tsx");
  const reader = read("../../components/chamber-reader.tsx");
  const css = read("../../styles.css");

  assert.match(featured, /<PlaceChip /);
  assert.match(strip, /<PlaceChip /);
  assert.match(search, /<PlaceChip /);
  assert.match(rituals, /<PlaceChip /);
  assert.match(adapted, /<PlaceChip /);
  assert.match(favorites, /<PlaceChip /);
  assert.match(reader, /<PlaceChip /);
  assert.match(css, /\.place-chip\s*\{/);
  assert.match(css, /\.place-chip-mark\s*\{/);
});

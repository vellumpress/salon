import assert from "node:assert/strict";
import test from "node:test";
import {
  YOU_HERO_PALETTE_KEY,
  YOU_HERO_PALETTES,
  acquireYouHeroPalette,
  nextYouHeroPaletteIndex,
  parseYouHeroPaletteIndex,
  releaseYouHeroPalette,
  resetYouHeroPaletteHold,
  youHeroPaletteAt,
  type PaletteStore,
} from "./you-hero-palette.ts";

function memoryStore(initial?: Record<string, string>): PaletteStore & { data: Record<string, string> } {
  const data = { ...(initial ?? {}) };
  return {
    data,
    getItem(key) {
      return data[key] ?? null;
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

test("You hero palettes are Mondrian accents on paper", () => {
  assert.deepEqual(
    YOU_HERO_PALETTES.map((row) => row.ring),
    ["yellow", "red", "blue", "forest", "ink"],
  );
});

test("parseYouHeroPaletteIndex wraps and rejects junk", () => {
  assert.equal(parseYouHeroPaletteIndex(null), null);
  assert.equal(parseYouHeroPaletteIndex(""), null);
  assert.equal(parseYouHeroPaletteIndex("red"), null);
  assert.equal(parseYouHeroPaletteIndex("0"), 0);
  assert.equal(parseYouHeroPaletteIndex("4"), 4);
  assert.equal(parseYouHeroPaletteIndex("5"), 0);
  assert.equal(parseYouHeroPaletteIndex("-1"), 4);
});

test("first visit starts on yellow and persists the index", () => {
  const store = memoryStore();
  assert.equal(nextYouHeroPaletteIndex(store), 0);
  assert.equal(store.data[YOU_HERO_PALETTE_KEY], "0");
  assert.equal(youHeroPaletteAt(0).id, "yellow");
});

test("consecutive visits rotate and do not repeat the last palette", () => {
  const store = memoryStore({ [YOU_HERO_PALETTE_KEY]: "0" });
  const seen: string[] = [];
  for (let i = 0; i < YOU_HERO_PALETTES.length; i++) {
    seen.push(youHeroPaletteAt(nextYouHeroPaletteIndex(store)).id);
  }
  assert.equal(seen[0], "red");
  assert.deepEqual(seen, ["red", "blue", "forest", "ink", "yellow"]);
  assert.equal(store.data[YOU_HERO_PALETTE_KEY], "0");
});

test("missing storage stays on the first palette", () => {
  assert.equal(nextYouHeroPaletteIndex(null), 0);
});

test("acquire holds the same palette across a quick remount", async () => {
  resetYouHeroPaletteHold();
  const store = memoryStore({ [YOU_HERO_PALETTE_KEY]: "1" });
  const first = acquireYouHeroPalette(store);
  releaseYouHeroPalette();
  const second = acquireYouHeroPalette(store);
  assert.equal(first.id, second.id);
  assert.equal(first.id, "blue");
  resetYouHeroPaletteHold();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const third = acquireYouHeroPalette(store);
  assert.notEqual(third.id, first.id);
  resetYouHeroPaletteHold();
});

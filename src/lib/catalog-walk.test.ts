import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readableIds } from "./catalog/shelf.ts";
import {
  CATALOG_WALK_ANCHORS,
  CATALOG_WALK_SAMPLE_SIZE,
  bookIdFromCatalogPath,
  catalogIdsFromDiff,
  catalogWalkMode,
  isPageGotoTimeout,
  resolveEpochDay,
  rotatingSample,
  selectCatalogWalk,
  usableDiffBase,
  utcEpochDay,
} from "./catalog-walk.ts";

const textsDir = join(dirname(fileURLToPath(import.meta.url)), "catalog/texts");

function numbered(count: number) {
  return Array.from({ length: count }, (_, index) => `b${String(index).padStart(3, "0")}`);
}

test("catalog walk mode stays full unless the deploy asks for a sample", () => {
  assert.equal(catalogWalkMode(undefined), "full");
  assert.equal(catalogWalkMode(""), "full");
  assert.equal(catalogWalkMode("full"), "full");
  assert.equal(catalogWalkMode("Full"), "full");
  assert.equal(catalogWalkMode("sample"), "sample");
});

test("epoch day follows UTC midnight", () => {
  const late = utcEpochDay(new Date("2026-10-09T23:30:00.000Z"));
  const early = utcEpochDay(new Date("2026-10-09T00:30:00.000Z"));
  const next = utcEpochDay(new Date("2026-10-10T00:30:00.000Z"));
  assert.equal(late, early);
  assert.equal(next, early + 1);
  assert.equal(resolveEpochDay("20370", new Date("2026-10-09T00:00:00.000Z")), 20370);
  assert.equal(resolveEpochDay("nope", new Date("2026-10-09T00:30:00.000Z")), early);
});

test("diff bases are revs, not shell", () => {
  assert.equal(usableDiffBase("HEAD^"), "HEAD^");
  assert.equal(usableDiffBase("HEAD~2"), "HEAD~2");
  assert.equal(usableDiffBase("abc1234"), "abc1234");
  assert.equal(usableDiffBase("0000000000000000000000000000000000000000"), null);
  assert.equal(usableDiffBase("HEAD^;touch"), null);
  assert.equal(usableDiffBase("--output=/tmp/x"), null);
  assert.equal(usableDiffBase(""), null);
  assert.equal(usableDiffBase(undefined), null);
});

test("catalog paths become book ids", () => {
  assert.equal(
    bookIdFromCatalogPath("src/lib/catalog/texts/the-trespasser.json"),
    "the-trespasser",
  );
  assert.equal(
    bookIdFromCatalogPath("src/lib/catalog/texts/{old-name => the-goose-man}.json"),
    "the-goose-man",
  );
  assert.equal(bookIdFromCatalogPath("src/lib/catalog/openings/falcon.json"), null);
  assert.equal(bookIdFromCatalogPath("src/lib/catalog/shelf.ts"), null);
});

test("diff text keeps added, changed, and renamed books", () => {
  const diff = [
    "M\tsrc/lib/catalog/texts/falcon.json",
    "A\tsrc/lib/catalog/texts/new-book.json",
    "D\tsrc/lib/catalog/texts/old-book.json",
    "R100\tsrc/lib/catalog/texts/old-name.json\tsrc/lib/catalog/texts/the-goose-man.json",
    "src/lib/catalog/texts/dona-perfecta.json",
    "M\tsrc/lib/catalog/shelf.ts",
    "M\tsrc/lib/catalog/openings/falcon.json",
  ].join("\n");
  assert.deepEqual(catalogIdsFromDiff(diff), [
    "falcon",
    "new-book",
    "old-book",
    "old-name",
    "the-goose-man",
    "dona-perfecta",
  ]);
});

test("the rotating window is fixed for a day and tiles the catalog", () => {
  const ids = numbered(100);
  const day0 = rotatingSample(ids, 40, 0);
  const day1 = rotatingSample(ids, 40, 1);
  const day2 = rotatingSample(ids, 40, 2);
  assert.equal(day0.length, 40);
  assert.equal(day0[0], "b000");
  assert.equal(day0[39], "b039");
  assert.equal(day1[0], "b040");
  assert.equal(day1[39], "b079");
  assert.equal(day2[0], "b080");
  assert.equal(day2[19], "b099");
  assert.equal(day2[20], "b000");
  assert.deepEqual(rotatingSample(ids, 40, 2), day2);
  const seen = new Set<string>();
  for (let day = 0; day < 5; day += 1) {
    for (const id of rotatingSample(ids, 40, day)) seen.add(id);
  }
  assert.equal(seen.size, ids.length);
});

test("a sample walk is changed books, anchors, and the day's window", () => {
  const ids = [...numbered(100), ...CATALOG_WALK_ANCHORS];
  const selected = selectCatalogWalk({
    ids,
    changed: ["b050", "missing-book", "falcon"],
    epochDay: 0,
    mode: "sample",
  });
  assert.equal(selected[0], "b050");
  assert.equal(selected.includes("missing-book"), false);
  for (const anchor of CATALOG_WALK_ANCHORS) assert.ok(selected.includes(anchor), anchor);
  assert.equal(new Set(selected).size, selected.length);
  assert.ok(selected.length >= CATALOG_WALK_SAMPLE_SIZE);
  assert.ok(selected.length <= CATALOG_WALK_SAMPLE_SIZE + CATALOG_WALK_ANCHORS.length + 1);
  const again = selectCatalogWalk({
    ids,
    changed: ["b050", "missing-book", "falcon"],
    epochDay: 0,
    mode: "sample",
  });
  assert.deepEqual(again, selected);
});

test("a full walk is every id, once, sorted", () => {
  assert.deepEqual(
    selectCatalogWalk({
      ids: ["b", "a", "a"],
      changed: ["nope"],
      epochDay: 4,
      mode: "full",
    }),
    ["a", "b"],
  );
});

test("a page.goto timeout is retryable and a step miss is not", () => {
  assert.equal(
    isPageGotoTimeout(
      new Error(
        'page.goto: Timeout 30000ms exceeded.\nCall log:\n  - navigating to "http://127.0.0.1:8080/salon/read/the-trespasser?at=189"',
      ),
    ),
    true,
  );
  assert.equal(
    isPageGotoTimeout(
      new Error("the-trespasser back: index 188 scroll 12, expected 188 after 1 (from 189)"),
    ),
    false,
  );
  assert.equal(isPageGotoTimeout(new Error("locator.waitFor: Timeout 30000ms exceeded.")), false);
  assert.equal(
    isPageGotoTimeout(new Error("page.waitForFunction: Timeout 30000ms exceeded.")),
    false,
  );
});

test("catalog walk anchors are readable books on disk", () => {
  const ids = new Set(readableIds());
  assert.deepEqual(
    [...CATALOG_WALK_ANCHORS],
    ["the-house-of-mirth", "the-goose-man", "dona-perfecta", "falcon"],
  );
  for (const id of CATALOG_WALK_ANCHORS) {
    assert.equal(ids.has(id), true, id);
    assert.equal(existsSync(join(textsDir, `${id}.json`)), true, id);
  }
});

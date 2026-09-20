import assert from "node:assert/strict";
import test from "node:test";
import { favoriteWorks, resolveFavoriteWork, YOU_PREVIEW } from "./favorites.ts";

test("YOU_PREVIEW is a short You-page slice", () => {
  assert.equal(YOU_PREVIEW, 3);
});

test("resolveFavoriteWork uses the shelf title and author", () => {
  const passing = resolveFavoriteWork("passing");
  assert.equal(passing.id, "passing");
  assert.equal(passing.title, "Passing");
  assert.equal(passing.author, "Nella Larsen");
});

test("resolveFavoriteWork keeps unknown ids so a heart can be unset", () => {
  const missing = resolveFavoriteWork("not-a-work");
  assert.deepEqual(missing, {
    id: "not-a-work",
    title: "not-a-work",
    author: "",
  });
});

test("favoriteWorks is newest first and unique", () => {
  const rows = favoriteWorks(["passing", "we", "passing", "dalloway"]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ["dalloway", "passing", "we"],
  );
  assert.equal(rows[0]?.title, "Mrs Dalloway");
  assert.equal(rows[1]?.author, "Nella Larsen");
});

test("favoriteWorks skips empty ids", () => {
  assert.deepEqual(favoriteWorks(["", "we"]), [{
    id: "we",
    title: "We",
    author: "Yevgeny Zamyatin (tr. Gregory Zilboorg)",
  }]);
});

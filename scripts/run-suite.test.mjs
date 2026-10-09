import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import {
  allTsFiles,
  filesFor,
  shardFiles,
  smokeDefaults,
  smokeFiles,
  unitFiles,
} from "./run-suite.mjs";

test("unit and smoke partition every TypeScript test", () => {
  const unit = unitFiles();
  assert.equal(unit.length + smokeFiles.length, allTsFiles.length);
  assert.equal(new Set([...unit, ...smokeFiles]).size, allTsFiles.length);
  for (const file of allTsFiles) assert.equal(existsSync(file), true, file);
  assert.ok(smokeFiles.includes("src/lib/reader-back-tap.test.ts"));
  assert.ok(smokeFiles.includes("src/lib/reader-sit-resume.test.ts"));
  assert.ok(smokeFiles.includes("src/lib/you-score-open.test.ts"));
  assert.ok(smokeFiles.includes("src/lib/reader-tap-stress.test.ts"));
  assert.ok(unit.includes("src/lib/share-codec.test.ts"));
  assert.ok(unit.includes("src/lib/invite-share.test.ts"));
  assert.ok(unit.includes("src/lib/salon-card.test.ts"));
  assert.ok(unit.includes("src/lib/you-score-paint.test.ts"));
  assert.equal(unit.includes("src/lib/reader-tap-stress.test.ts"), false);
});

test("the two slow smoke files fall in different shards", () => {
  const first = shardFiles(smokeFiles, "1/2");
  const second = shardFiles(smokeFiles, "2/2");
  assert.equal(first.length + second.length, smokeFiles.length);
  assert.equal(new Set([...first, ...second]).size, smokeFiles.length);
  assert.ok(first.includes("src/lib/reader-back-tap.test.ts"));
  assert.ok(second.includes("src/lib/social-rooms.e2e.test.ts"));
  assert.equal(first.includes("src/lib/social-rooms.e2e.test.ts"), false);
  assert.deepEqual(filesFor("smoke"), smokeFiles);
  assert.throws(() => shardFiles(smokeFiles, "3/2"), /out of range/);
  assert.deepEqual(shardFiles(smokeFiles), smokeFiles);
});

test("smoke defaults keep the long runs off the deploy path", () => {
  assert.deepEqual(smokeDefaults({}), { TAP_STRESS: "skip", CATALOG_WALK: "sample" });
  assert.deepEqual(smokeDefaults({ TAP_STRESS: "skip", CATALOG_WALK: "sample" }), {
    TAP_STRESS: "skip",
    CATALOG_WALK: "sample",
  });
  assert.equal(smokeDefaults({ CATALOG_WALK: "full" }).CATALOG_WALK, "full");
});

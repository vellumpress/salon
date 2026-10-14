import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Work } from "../literature.ts";
import { MERGE_STOP_CUTS, MERGE_STOP_INDEX } from "./merge-stop-index.ts";
import { collectStopChecks } from "./merge-stops.ts";
import { ritualSitBounds } from "./ritual-sit-measure.ts";

test("reader merge stops are every opening sit and ritual end with a later breath", () => {
  const { checks, stops, cuts } = collectStopChecks();
  assert.deepEqual(MERGE_STOP_INDEX, stops);
  assert.deepEqual(MERGE_STOP_CUTS, cuts);
  const problems = checks.filter((check) => check.problem);
  assert.deepEqual(
    problems.map((check) => `${check.kind} ${check.id}: ${check.problem}`),
    [],
  );

  const openings = checks.filter((check) => check.kind === "opening" && !check.problem);
  const rituals = checks.filter((check) => check.kind === "ritual" && !check.problem);
  assert.ok(openings.length > 0);
  assert.ok(rituals.length > 0);
  for (const check of checks) {
    if (check.problem) continue;
    assert.ok(check.breaths.some((breath) => breath.index === check.stop), check.id);
    const tail = check.breaths[check.breaths.length - 1]!;
    assert.ok(tail.index === check.stop || tail.index === check.stop + 1, `${check.id} ${check.kind}`);
    const listed = MERGE_STOP_INDEX[check.id] ?? [];
    if (tail.index === check.stop + 1) assert.ok(listed.includes(check.stop), `${check.kind} ${check.id}`);
    else assert.ok(!listed.includes(check.stop), `${check.kind} ${check.id} has no later breath`);
  }

  const garman = openings.find((check) => check.id === "garman-and-worse");
  assert.ok(garman);
  assert.equal(garman.stop, 27);
  assert.equal(garman.breaths[0]?.index, 0);
  assert.equal(garman.breaths.at(-1)?.index, 28);
  assert.ok(garman.breaths.find((breath) => breath.index === 27)?.text.endsWith("exactitude."));
  assert.deepEqual(MERGE_STOP_INDEX["garman-and-worse"], [27]);

  const cabala = openings.find((check) => check.id === "the-cabala");
  assert.ok(cabala?.cut);
  const cabalaBreath = cabala.breaths.find((breath) => breath.index === cabala.stop);
  assert.ok(cabalaBreath);
  assert.ok(cabalaBreath.text.slice(0, cabala.cut).trimEnd().endsWith("generates legend."));
  assert.ok(cabalaBreath.text.length > cabala.cut);
  assert.deepEqual(MERGE_STOP_CUTS["the-cabala"], [[cabala.stop, cabala.cut]]);

  for (const id of ["tales-from-the-fjeld", "tales-by-polish-authors"]) {
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
    const opening = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as Work;
    const bounds = ritualSitBounds(full, opening);
    assert.equal(bounds.source, "at-scene", id);
    assert.ok(bounds.end > bounds.start, id);
    assert.ok(bounds.end < full.breaths.length - 1, id);
    assert.ok(MERGE_STOP_INDEX[id]?.includes(bounds.end), id);
    const ritual = rituals.find((check) => check.id === id);
    assert.equal(ritual?.stop, bounds.end);
    assert.equal(ritual?.breaths.at(-1)?.index, bounds.end + 1);
  }

  console.log(
    `merge stops: ${openings.length} opening sits, ${rituals.length} ritual ends, ${Object.keys(stops).length} books with a later breath`,
  );
});

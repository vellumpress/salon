import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { migrateReadingClock } from "./active-read.ts";
import { hourglassCopy } from "./score-hourglass.ts";
import { deriveReadingStats } from "./reading-stats.ts";
import { remapAliasedWorkIds } from "./work-id-alias.ts";

function paint(input: Parameters<typeof deriveReadingStats>[0]) {
  const reading = deriveReadingStats(input);
  const daily = reading.readingModel.daily;
  const copy = hourglassCopy({
    kind: daily.kind,
    total: daily.total,
    label: daily.label,
    hide: false,
    paused: false,
    learning: Boolean(daily.learningNote),
    scored: daily.contributors.some((part) => part.status === "scored" && part.value != null),
  });
  assert.equal(daily.contributors.length, 6);
  assert.ok(copy.primary.trim().length > 0, `empty primary for ${daily.kind}`);
  assert.notEqual(copy.primary, "NaN");
  assert.ok(copy.primary === "Rest" || copy.primary === "Still learning" || copy.primary === "Quick visit" || copy.primary === "Paused" || /^\d+$/.test(copy.primary));
  return copy;
}

test("a missing or empty history still paints a score", () => {
  const empty = paint({ progress: {}, favorites: [] });
  assert.equal(empty.primary, "Rest");
  assert.equal(empty.sand, null);

  paint({
    progress: undefined as never,
    favorites: undefined as never,
    sitHistory: undefined,
    worksTouchedByDay: undefined,
    readingMinutesByDay: undefined,
  });
});

test("legacy null rows, a NaN ledger, and a non-array history still paint a score", () => {
  const copy = paint({
    progress: { passing: null as never, "": null as never },
    favorites: "nope" as never,
    sitHistory: [null as never, { workId: "passing", minutes: Number.NaN, endedAt: Number.NaN } as never],
    worksTouchedByDay: { "2020-01-01": 5 as never, "2020-01-02": "passing" as never },
    readingMinutesByDay: { "2020-01-01": Number.NaN, "2020-01-02": "nope" as never },
    advancesByDay: { "2020-01-01": Number.NaN },
    togetherKeeps: [null as never],
    hostedSits: [null as never, { workId: "passing" } as never],
    joined: null as never,
  });
  assert.ok(copy.primary === "Rest" || copy.primary === "Still learning" || /^\d+$/.test(copy.primary));
});

test("a corrupt saved snapshot migrates without throwing", () => {
  const remapped = remapAliasedWorkIds({
    progress: { passing: null as never, immoralist: { lastOpenedAt: 5, kept: [] } },
    favorites: "immoralist" as never,
    sitHistory: [null as never, { workId: "immoralist" }],
    worksTouchedByDay: { "2020-01-01": "passing" as never, "2020-01-02": ["immoralist"] },
    togetherKeeps: [null as never],
    hostedSits: [{ workId: "three-plays" }],
  });
  assert.equal(remapped.sitHistory?.[0]?.workId, "the-immoralist");
  assert.equal(remapped.hostedSits?.[0]?.workId, "three-plays-incl-henry-iv");
  assert.equal(remapped.progress?.passing, undefined);
  assert.equal(remapped.worksTouchedByDay?.["2020-01-01"], undefined);
  assert.deepEqual(remapped.worksTouchedByDay?.["2020-01-02"], ["the-immoralist"]);

  const clock = migrateReadingClock(
    {
      sitHistory: [null as never, { workId: "passing", minutes: 12, endedAt: 10 }],
      activeReadVersion: 0,
    },
    0,
  );
  assert.equal(clock.sitHistory?.length, 1);
  assert.equal(clock.sitHistory?.[0]?.minutes, 0);
});

test("You paints the score from local data and does not blank the first view", () => {
  const page = readFileSync(new URL("../routes/profile.index.tsx", import.meta.url), "utf8");
  const you = readFileSync(new URL("../components/you-reading.tsx", import.meta.url), "utf8");
  assert.match(page, /PagesShell/);
  assert.match(page, /useLayoutEffect/);
  assert.match(page, /deriveReadingStats\(/);
  assert.doesNotMatch(page, /isPending/);
  assert.doesNotMatch(page, /use-reader-session/);
  assert.doesNotMatch(page, /use-favorite-sync/);
  assert.match(you, /<ScoreHourglass /);
  assert.doesNotMatch(you, /min-h-40 bg-ink/);
  assert.doesNotMatch(you, /from "@\/lib\/use-reader-session"/);
  assert.doesNotMatch(you, /kept-sentences/);
});

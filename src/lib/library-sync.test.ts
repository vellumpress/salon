import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  emptyShelf,
  mergeShelves,
  shelfFromState,
  shelfHasReading,
  type ReaderShelf,
  type ShelfProgress,
} from "./library-sync.ts";

function progress(partial: Partial<ShelfProgress> & Pick<ShelfProgress, "breathIndex" | "lastOpenedAt">): ShelfProgress {
  return {
    sittingStartedAt: null,
    keywords: {},
    kept: [],
    completedAt: null,
    entered: false,
    ...partial,
  };
}

function shelf(partial: Partial<ReaderShelf>): ReaderShelf {
  return { ...emptyShelf(), ...partial };
}

test("an empty phone does not erase a shelf, and an empty shelf does not erase the phone", () => {
  const local = shelf({ favorites: ["the-house-of-mirth"] });
  const remote = shelf({ favorites: ["bertha-garlan", "the-house-of-mirth"] });
  assert.deepEqual(mergeShelves(local, emptyShelf()).favorites, ["the-house-of-mirth"]);
  assert.deepEqual(mergeShelves(emptyShelf(), remote).favorites, ["bertha-garlan", "the-house-of-mirth"]);
  assert.deepEqual(mergeShelves(local, remote).favorites, ["the-house-of-mirth", "bertha-garlan"]);
  assert.equal(shelfHasReading(emptyShelf()), false);
  assert.equal(shelfHasReading(local), true);
});

test("kept lines union and the further place in the book wins", () => {
  const local = shelf({
    progress: {
      "bertha-garlan": progress({
        breathIndex: 4,
        breathId: "s0-4",
        lastOpenedAt: 200,
        kept: ["s0-3"],
        entered: true,
      }),
    },
  });
  const remote = shelf({
    progress: {
      "bertha-garlan": progress({
        breathIndex: 12,
        breathId: "s0-12",
        lastOpenedAt: 100,
        kept: [{ v: 1, id: "s0-9", text: "A kept line.", workId: "bertha-garlan", title: "Bertha Garlan", author: "Arthur Schnitzler", savedAt: 90 }],
        completedAt: 80,
      }),
    },
    readingMinutesByDay: { "2026-10-11": 4 },
    worksTouchedByDay: { "2026-10-11": ["bertha-garlan"] },
    sitHistory: [{ workId: "bertha-garlan", minutes: 12, endedAt: 50 }],
    lastActiveReadAt: 100,
  });
  const merged = mergeShelves(
    shelf({
      ...local,
      readingMinutesByDay: { "2026-10-11": 9 },
      worksTouchedByDay: { "2026-10-11": ["the-house-of-mirth"] },
      sitHistory: [
        { workId: "bertha-garlan", minutes: 12, endedAt: 50 },
        { workId: "quicksand", minutes: 8, endedAt: 70 },
      ],
      lastActiveReadAt: 40,
    }),
    remote,
  );
  const row = merged.progress["bertha-garlan"]!;
  assert.equal(row.breathIndex, 12);
  assert.equal(row.breathId, "s0-12");
  assert.equal(row.lastOpenedAt, 200);
  assert.equal(row.entered, true);
  assert.equal(row.completedAt, 80);
  assert.deepEqual(
    row.kept.map((entry) => (typeof entry === "string" ? entry : entry.id)),
    ["s0-3", "s0-9"],
  );
  assert.equal(merged.readingMinutesByDay["2026-10-11"], 9);
  assert.deepEqual(merged.worksTouchedByDay["2026-10-11"], ["the-house-of-mirth", "bertha-garlan"]);
  assert.deepEqual(
    merged.sitHistory.map((sit) => sit.workId),
    ["bertha-garlan", "quicksand"],
  );
  assert.equal(merged.lastActiveReadAt, 100);
});

test("the shelf snapshot has no email and sign-out does not delete it", () => {
  const snap = shelfFromState({
    favorites: ["quicksand"],
    taste: "quiet novels",
  });
  assert.equal("email" in snap, false);
  assert.equal(snap.favorites[0], "quicksand");
  const sync = readFileSync(new URL("../components/remote-sync.tsx", import.meta.url), "utf8");
  const session = readFileSync(new URL("./use-reader-session.ts", import.meta.url), "utf8");
  assert.match(sync, /reconcileShelf/);
  assert.doesNotMatch(sync, /library"\)\.delete|from\("library"\)\.delete|localStorage\.clear|removeItem\("vellum-v1"\)/);
  assert.doesNotMatch(session, /vellum-v1|localStorage\.clear/);
  const sql = readFileSync(new URL("../../supabase/migrations/20261011230000_reader_library.sql", import.meta.url), "utf8");
  assert.match(sql, /for select to authenticated/);
  assert.doesNotMatch(sql, /for delete/);
  assert.doesNotMatch(sql, /to anon/);
});

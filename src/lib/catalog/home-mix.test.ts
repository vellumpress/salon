import assert from "node:assert/strict";
import test from "node:test";
import { CLASSIC_LOCAL_WORKS } from "./full-pdf.ts";
import { blurbFor } from "./blurbs.ts";
import {
  descriptionOwners,
  emptyMixHistory,
  homeMixRows,
  HOME_MIX_MAX_ROWS,
  isGhostStories,
  isSeaWork,
  mixHistoryFromState,
  mixTimeLabel,
  sharedDescriptionIds,
  type MixHistory,
} from "./home-mix.ts";
import { SHELF, shelfWork } from "./shelf.ts";

const DAY = "2026-10-13";

const READ = ["the-house-of-mirth", "botchan", "naomi"] as const;

function readThree(): MixHistory {
  return mixHistoryFromState({
    progress: {
      "the-house-of-mirth": {
        lastOpenedAt: 1,
        entered: true,
        completedAt: 30,
        kept: [{ id: "line" }],
        activeMs: 180 * 60000,
      },
      botchan: {
        lastOpenedAt: 2,
        entered: true,
        completedAt: 20,
        kept: [],
        activeMs: 90 * 60000,
      },
      naomi: {
        lastOpenedAt: 3,
        entered: true,
        completedAt: 10,
        kept: [],
        activeMs: 40 * 60000,
      },
    },
    favorites: [],
    sitHistory: [
      { workId: "the-house-of-mirth", minutes: 180 },
      { workId: "botchan", minutes: 90 },
      { workId: "naomi", minutes: 40 },
    ],
  });
}

test("a new reader gets a starter row and no personal shelf", () => {
  const rows = homeMixRows(emptyMixHistory(), DAY);
  assert.equal(rows[0]?.title, "Start here");
  assert.equal(rows[0]?.id, "start");
  assert.equal(rows[1]?.title, "Short stories");
  assert.equal(rows[2]?.title, "Novels");
  assert.ok(["Stories from Japan", "France"].includes(rows[3]?.title ?? ""), rows[3]?.title);
  const leadPlace = rows.findIndex((row) => row.id === "place:jp" || row.id === "place:fr");
  const hungary = rows.findIndex((row) => row.id === "place:hu");
  assert.equal(leadPlace, 3);
  if (hungary >= 0) assert.ok(hungary > leadPlace);
  for (const row of rows) {
    if (row.id.startsWith("place:")) assert.ok(row.cards.length >= 6, row.title);
  }
  assert.ok(rows.length >= 6 && rows.length <= HOME_MIX_MAX_ROWS);
  assert.equal(
    rows.some((row) => /because you read|more like what you finish/i.test(row.title)),
    false,
  );
  assert.equal(rows.some((row) => /\bfeatured\b|to be read/i.test(row.title)), false);
});

test("House of Mirth, Botchan, and Naomi lead with personal rows", () => {
  const rows = homeMixRows(readThree(), DAY);
  assert.ok(rows.length >= 6 && rows.length <= HOME_MIX_MAX_ROWS);
  assert.equal(rows[0]?.title, "Because you read The House of Mirth");
  assert.equal(rows.some((row) => row.title === "More like what you finish"), true);
  assert.equal(rows.some((row) => row.id === "start"), false);
  const personal = rows.findIndex((row) => row.id === "finish" || row.id.startsWith("place:") || row.id.startsWith("form:") || row.id.startsWith("genre:"));
  const because = rows.findIndex((row) => row.id.startsWith("because:"));
  assert.ok(because >= 0 && because < personal);
  assert.equal(
    rows.some((row) => row.cards.some((card) => card.work.id === "the-house-of-mirth" && row.id.startsWith("because:"))),
    false,
  );
});

test("the same day repeats and the next day moves", () => {
  const history = readThree();
  const first = homeMixRows(history, DAY).map((row) => `${row.title}:${row.cards.map((card) => card.work.id).join(",")}`);
  const again = homeMixRows(history, DAY).map((row) => `${row.title}:${row.cards.map((card) => card.work.id).join(",")}`);
  assert.deepEqual(again, first);
  const next = homeMixRows(history, "2026-10-14").map((row) => `${row.title}:${row.cards.map((card) => card.work.id).join(",")}`);
  assert.notDeepEqual(next, first);
});

test("held and unreleased titles stay off every row", () => {
  const held = new Set(["unhuman-tour-kusamakura", "kusamakura-unhuman-tour"]);
  for (const day of [DAY, "2026-10-14", "2026-01-01"]) {
    for (const history of [emptyMixHistory(), readThree()]) {
      for (const row of homeMixRows(history, day)) {
        for (const card of row.cards) {
          assert.equal(held.has(card.work.id), false, `${day} ${row.title}`);
        }
      }
    }
  }
});

test("a repeated description, or the seed book's own line, never lands on a card", () => {
  const shared = sharedDescriptionIds([
    { id: "a", blurb: "A hot-headed teacher who refuses the provincial game." },
    { id: "b", blurb: "A hot-headed teacher who refuses the provincial game." },
    { id: "c", blurb: "A mountain walk that keeps its own sentence." },
  ]);
  assert.equal(shared.has("a"), true);
  assert.equal(shared.has("b"), true);
  assert.equal(shared.has("c"), false);

  const key = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
  for (const history of [emptyMixHistory(), readThree()]) {
    for (const row of homeMixRows(history, DAY)) {
      const seen = new Set<string>();
      for (const card of row.cards) {
        const owners = descriptionOwners(card.blurb);
        assert.deepEqual(owners, [card.work.id], card.work.id);
        assert.equal(seen.has(key(card.blurb)), false, row.title);
        seen.add(key(card.blurb));
      }
      if (!row.id.startsWith("because:")) continue;
      const seedId = row.id.slice("because:".length);
      const seed = SHELF.find((work) => work.id === seedId);
      assert.ok(seed, seedId);
      const seedLine = key(blurbFor(seed!));
      for (const card of row.cards) {
        assert.notEqual(card.work.id, seedId);
        assert.notEqual(key(card.blurb), seedLine, card.work.id);
      }
    }
  }
});

test("every card has a description and a real time", () => {
  for (const history of [emptyMixHistory(), readThree()]) {
    for (const row of homeMixRows(history, DAY)) {
      assert.ok(row.cards.length >= 4, row.title);
      const ids = new Set<string>();
      for (const card of row.cards) {
        assert.ok(card.work.title.trim(), row.title);
        assert.ok(card.blurb.trim().length >= 24, card.work.id);
        assert.match(card.time, /^\d+ min$|^\d+h(?: \d+m)?$/);
        assert.equal(card.time, mixTimeLabel(card.work.minutes));
        assert.equal(ids.has(card.work.id), false);
        ids.add(card.work.id);
      }
    }
  }
});

test("ghost and sea rows only use books the catalog already names", () => {
  const ghosts = CLASSIC_LOCAL_WORKS.filter(isGhostStories);
  const seas = CLASSIC_LOCAL_WORKS.filter(isSeaWork);
  assert.ok(ghosts.length >= 5);
  assert.ok(seas.length >= 5);
  assert.equal(ghosts.every((work) => work.form === "stories"), true);
  assert.equal(ghosts.some((work) => work.id === "ghosts"), false);
  assert.equal(seas.some((work) => work.id === "the-willows"), false);
  assert.equal(seas.some((work) => work.id === "flower-sin"), false);
  assert.ok(ghosts.some((work) => work.id === "ghost-stories-of-an-antiquary"));
  assert.ok(seas.some((work) => work.id === "moby-dick"));
  assert.ok(seas.some((work) => work.id === "the-sea-wolf"));
});

test("signed-in shelf fields and local history build the same rows", () => {
  const local = readThree();
  const synced = mixHistoryFromState({
    progress: {
      "the-house-of-mirth": { lastOpenedAt: 1, entered: true, completedAt: 30, kept: ["a"], activeMs: 0 },
      botchan: { lastOpenedAt: 2, entered: true, completedAt: 20, kept: [], activeMs: 0 },
      naomi: { lastOpenedAt: 3, entered: true, completedAt: 10, kept: [], activeMs: 0 },
    },
    favorites: [],
    sitHistory: [
      { workId: "the-house-of-mirth", minutes: 180 },
      { workId: "botchan", minutes: 90 },
      { workId: "naomi", minutes: 40 },
    ],
  });
  assert.deepEqual(
    homeMixRows(synced, DAY).map((row) => row.id),
    homeMixRows(local, DAY).map((row) => row.id),
  );
  assert.ok(shelfWork("the-house-of-mirth"));
  assert.ok(shelfWork("botchan"));
  assert.ok(shelfWork("naomi"));
});

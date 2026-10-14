import assert from "node:assert/strict";
import test from "node:test";
import { DEDUPED_CATALOG } from "./index.ts";
import { PLACED_WORKS } from "../literature-geo.ts";
import { blurbFor } from "./blurbs.ts";
import { GUEST_CURATORS, curatedPicks } from "./curated.ts";
import { homeMixRows, mixHistoryFromState } from "./home-mix.ts";
import { prefaceFor } from "./prefaces.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";
import { notableAuthors } from "../notable-authors.ts";
import { RITUAL_LANES, worksForRitualLane } from "./rituals.ts";
import { readableIds, searchShelf, SHELF, shelfWork } from "./shelf.ts";
import { FULL_TEXT_WORKS } from "./full-pdf.ts";
import { cardReadPath } from "../salon-card.ts";
import { decodeQuoteCard, encodeQuoteCard, quoteReadPath } from "../quote-share.ts";
import { canonicalWorkId, remapAliasedWorkIds } from "../work-id-alias.ts";
import { dayKey } from "../day-key.ts";

const STUBS = ["home-world", "the-colonels-dream"] as const;
const LIVE = {
  "home-world": "the-home-and-the-world",
  "the-colonels-dream": "colonels-dream",
} as const;

test("textless stubs are off every list and follow the local book", () => {
  for (const id of STUBS) {
    const live = LIVE[id];
    assert.equal(SHELF.some((item) => item.id === id), false, id);
    assert.equal(canonicalWorkId(id), live, id);
    assert.equal(shelfWork(id)?.id, live, id);
    assert.equal(shelfWork(id)?.local, true, id);
    assert.equal(readableIds().includes(id), false, id);
    assert.equal(FULL_TEXT_WORKS.some((item) => item.id === id), false, id);
    assert.equal(DEDUPED_CATALOG.some((item) => item.id === id), false, id);
    assert.equal(PLACED_WORKS.some((item) => item.id === id), false, id);
    assert.equal(searchShelf(shelfWork(live)?.title ?? id).some((item) => item.id === id), false, id);
    assert.equal(STORED_PREFACES[id], undefined, id);
    assert.equal(blurbFor(id), blurbFor(live), id);
    assert.doesNotMatch(blurbFor(id), /devotion as quiet attention|color line as a social science/i, id);
    assert.equal(prefaceFor(id), prefaceFor(live), id);
    assert.equal(cardReadPath({ workId: id, at: 3 }), `/read/${live}?at=3`, id);
    const token = encodeQuoteCard({
      workId: id,
      at: 2,
      text: "A sentence from the local book.",
      title: "Stub",
      author: "Stub",
    });
    assert.equal(decodeQuoteCard(token)?.w, live, id);
    assert.equal(quoteReadPath({ w: id, i: 2 }), `/read/${live}?at=2`, id);
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${lane.id} ${id}`);
      assert.equal(worksForRitualLane(lane).some((item) => item.id === id), false, `${lane.id} ${id}`);
    }
    for (const curator of GUEST_CURATORS) {
      for (const pick of curatedPicks(curator)) {
        assert.notEqual(pick.workId, id, pick.key);
        assert.notEqual(pick.shelfId, id, pick.key);
      }
    }
    for (const author of notableAuthors()) {
      assert.equal(author.books.some((book) => book.id === id), false, author.slug);
    }
  }

  const rows = homeMixRows(mixHistoryFromState(null), dayKey(Date.parse("2026-10-14T12:00:00Z")));
  const mixIds = rows.flatMap((row) => row.cards.map((card) => card.work.id));
  for (const id of STUBS) assert.equal(mixIds.includes(id), false, id);

  assert.deepEqual(
    searchShelf("The Home and the World").map((item) => item.id),
    ["the-home-and-the-world"],
  );
  const colonels = searchShelf("The Colonel's Dream").map((item) => item.id);
  assert.equal(colonels.includes("the-colonels-dream"), false);
  assert.equal(colonels.includes("colonels-dream"), true);
  assert.equal(colonels.includes("the-colonel-s-dream"), true);

  const progress: Record<string, { lastOpenedAt: number; kept: string[] }> = {
    "home-world": { lastOpenedAt: 9, kept: ["mirror"] },
    "the-colonels-dream": { lastOpenedAt: 4, kept: ["broadway"] },
  };
  const remapped = remapAliasedWorkIds({
    progress,
    favorites: ["home-world", "the-colonels-dream"],
    readingNow: { id: "home-world" },
    lastShuffle: "the-colonels-dream",
  });
  assert.equal(remapped.progress?.["the-home-and-the-world"]?.lastOpenedAt, 9);
  assert.deepEqual(remapped.progress?.["the-home-and-the-world"]?.kept, ["mirror"]);
  assert.equal(remapped.progress?.["colonels-dream"]?.lastOpenedAt, 4);
  assert.equal(remapped.readingNow?.id, "the-home-and-the-world");
  assert.equal(remapped.lastShuffle, "colonels-dream");
  assert.equal(remapped.favorites?.includes("home-world"), false);
  assert.equal(remapped.favorites?.includes("the-colonels-dream"), false);
});

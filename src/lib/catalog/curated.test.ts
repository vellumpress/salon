import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { isEnReadableOff } from "./en-rights.ts";
import { isLocalBound } from "./full-pdf.ts";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import { shelfWork } from "./shelf.ts";
import {
  GUEST_CURATORS,
  curatedPicks,
  curatedReadableId,
  curatedShelfTitle,
  curatedSitCount,
  curatedSitIds,
  curatedStripCopy,
  guestCurator,
} from "./curated.ts";

const emmeline = guestCurator("emmeline-clein");

test("Emmeline Clein is the first guest curator", () => {
  assert.ok(emmeline);
  assert.equal(GUEST_CURATORS.length, 1);
  assert.equal(emmeline.slug, "emmeline-clein");
  assert.match(emmeline.note, /urban scenescapes/);
  assert.match(emmeline.note, /women writers/);
});

test("Emmeline’s readable sits are verified English binds", () => {
  assert.ok(emmeline);
  const ids = curatedSitIds(emmeline);
  assert.deepEqual(ids, [
    "basilio",
    "blacker",
    "lady-macbeth",
    "the-wanderer",
    "naomi",
    "odessa",
    "the-late-mattia-pascal",
    "madmen",
    "a-lost-lady",
    "jacob-s-room",
    "the-last-man",
    "summer",
    "herland",
    "the-tenant-of-wildfell-hall",
  ]);
  assert.equal(curatedSitCount(emmeline), 14);
  assert.equal(curatedStripCopy().pitch, "Guest lists · Emmeline Clein · 14 sits");

  for (const id of ids) {
    assert.equal(curatedReadableId(id), id, id);
    assert.equal(isLocalBound(id), true, id);
    assert.equal(isEnReadableOff(id), false, id);
    assert.equal(existsSync(new URL(`./texts/${id}.json`, import.meta.url)), true, id);
    const text = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as { breaths?: { text?: string }[] };
    const opening = text.breaths?.[0]?.text ?? "";
    assert.match(opening, /[A-Za-z]{3}/, id);
    assert.doesNotMatch(opening, /Il arriva chez nous/, id);
  }
});

test("titles without an English sit stay listed and do not open", () => {
  assert.ok(emmeline);
  const picks = curatedPicks(emmeline);
  const closed = picks.filter((pick) => !pick.workId);
  assert.deepEqual(
    closed.map((pick) => pick.key),
    [
      "savoy",
      "envy",
      "nettles",
      "wild-geese",
      "one-no-one",
      "santa",
      "quiroga",
    ],
  );
  for (const pick of closed) {
    assert.equal(curatedReadableId(pick.workId), undefined, pick.key);
    assert.ok(pick.shelfId, pick.key);
    assert.ok(shelfWork(pick.shelfId), pick.key);
    assert.ok(pick.unavailable, pick.key);
    assert.equal(isLocalBound(pick.shelfId), false, pick.key);
  }
  assert.equal(curatedReadableId("cousin-basilio"), undefined);
  assert.equal(curatedReadableId("meaulnes"), undefined);
  assert.equal(curatedReadableId("mattia"), undefined);
  assert.equal(isLocalBound("the-wanderer"), true);
  assert.equal(isLocalBound("the-late-mattia-pascal"), true);
});

test("Tanizaki and Pirandello keep her or, and only shelf English sits link", () => {
  assert.ok(emmeline);
  const tanizaki = emmeline.groups[0]?.entries.find((entry) => entry.pick.key === "naomi");
  const pirandello = emmeline.groups[0]?.entries.find((entry) => entry.pick.key === "one-no-one");
  assert.equal(tanizaki?.alt?.key, "nettles");
  assert.equal(curatedReadableId(tanizaki?.pick.workId), "naomi");
  assert.equal(curatedReadableId(tanizaki?.alt?.workId), undefined);
  assert.equal(curatedReadableId(pirandello?.pick.workId), undefined);
  assert.equal(curatedReadableId(pirandello?.alt?.workId), "the-late-mattia-pascal");
  assert.equal(pirandello?.alt?.title, "The Late Mattia Pascal");
});

test("Cousin Basílio opens the shelf sit Dragon’s Teeth, not a modern EN id", () => {
  assert.ok(emmeline);
  const pick = curatedPicks(emmeline).find((item) => item.key === "cousin-basilio");
  assert.ok(pick);
  assert.equal(pick.workId, "basilio");
  assert.equal(pick.title, "Cousin Basílio");
  assert.match(shelfWork("basilio")?.title ?? "", /^Dragon/);
  assert.equal(curatedShelfTitle(pick), shelfWork("basilio")?.title);
  assert.equal(curatedPicks(emmeline).some((item) => item.workId === "cousin-basilio"), false);

  const meaulnes = curatedPicks(emmeline).find((item) => item.key === "meaulnes");
  assert.ok(meaulnes);
  assert.equal(meaulnes.workId, "the-wanderer");
  assert.equal(meaulnes.title, "Le Grand Meaulnes");
  assert.equal(curatedShelfTitle(meaulnes), "The Wanderer");
  assert.equal(curatedPicks(emmeline).some((item) => item.workId === "meaulnes"), false);
});

test("other linked titles use the shelf title, so no extra sit name appears", () => {
  assert.ok(emmeline);
  for (const pick of curatedPicks(emmeline)) {
    if (pick.key === "cousin-basilio" || pick.key === "meaulnes") continue;
    if (!pick.shelfId) continue;
    assert.equal(shelfWork(pick.shelfId)?.title, pick.title, pick.key);
    if (pick.workId) assert.equal(curatedShelfTitle(pick), undefined, pick.key);
  }
});

test("curated guest lists do not write Recommend or the homepage classics strip", () => {
  const src = readFileSync(new URL("./curated.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /FEATURED_CAROUSEL|NEXT_FEATURED|RITUAL_LANES|recommend/);
  const strip = readFileSync(new URL("../../components/curated-strip.tsx", import.meta.url), "utf8");
  const hub = readFileSync(new URL("../../routes/curated.tsx", import.meta.url), "utf8");
  const list = readFileSync(new URL("../../routes/curated_.$slug.tsx", import.meta.url), "utf8");
  for (const file of [strip, hub, list]) {
    assert.doesNotMatch(file, /\/curator(?!ed)|FEATURED|ADAPTED_WORKS/);
    assert.match(file, /\/curated/);
  }
  assert.match(list, /curatedReadableId/);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("madmen"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("naomi"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("basilio"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import { ADAPTED_BY_SALON_IDS, NEXT_FEATURED_TRACK_IDS } from "./curatorial.ts";
import { RITUAL_LANES } from "./rituals.ts";
import { SHELF, shelfWork } from "./shelf.ts";
import { REGION_SHAPES } from "./region-shapes.ts";
import { placeFor, placeForId, surfacedPlaceWorkIds } from "./places.ts";

test("named settings keep reader-friendly labels and real regions", () => {
  const expect = {
    quicksand: { label: "Naxos / South", region: "us-south" },
    "attendants-confession": { label: "Brazil", region: "br" },
    rashomon: { label: "Kyoto / Japan", region: "jp" },
    "high-wind-jamaica": { label: "Jamaica", region: "jm" },
    "noli-me-tangere": { label: "Manila", region: "ph" },
    botchan: { label: "Tokyo", region: "jp" },
    "the-house-of-mirth": { label: "New York", region: "us" },
    silhouettes: { label: "Dieppe", region: "fr" },
    "a-room-with-a-view": { label: "Florence", region: "it" },
    passing: { label: "Harlem", region: "us" },
    naomi: { label: "Tokyo", region: "jp" },
    dalloway: { label: "London", region: "gb" },
    "miss-brill-adapted": { label: "Menton / French Riviera", region: "fr" },
    "prefer-not": { label: "New York", region: "us" },
    "late-season": { label: "Yalta / Moscow", region: "ru" },
    "between-the-drop-and-the-water": {
      label: "Hudson River, New York",
      region: "us",
    },
    "he-woke-changed": { label: "Prague", region: "cz" },
    "the-pattern": { label: "Hudson, New York", region: "us" },
    "a-coat-worthy-of-respect": { label: "St. Petersburg", region: "ru" },
    "what-she-borrowed": { label: "Paris", region: "fr" },
    "it-was-not-nervousness": { label: "East London", region: "gb" },
    "during-carnival": { label: "Venice", region: "it" },
    "what-we-sold": { label: "London", region: "gb" },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = shelfWork(id);
    assert.ok(work, id);
    assert.deepEqual(placeFor(work!), want, id);
  }
});

test("Featured, Next, and ritual-lane works all resolve a place with a silhouette", () => {
  const missing: string[] = [];
  const shapeless: string[] = [];
  for (const id of surfacedPlaceWorkIds()) {
    const work = shelfWork(id);
    if (!work) {
      missing.push(`${id} (missing shelf)`);
      continue;
    }
    const place = placeFor(work);
    if (!place) missing.push(id);
    else if (!REGION_SHAPES[place.region]) shapeless.push(`${id}=${place.region}`);
  }
  assert.deepEqual(missing, [], `missing place: ${missing.join("; ")}`);
  assert.deepEqual(shapeless, [], `no silhouette: ${shapeless.join("; ")}`);
  assert.ok(FEATURED_CAROUSEL_IDS.length > 0);
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("quicksand"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("attendants-confession"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("rashomon"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("high-wind-jamaica"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("noli-me-tangere"));
  assert.ok(RITUAL_LANES.some((lane) => lane.workIds.includes("silhouettes")));
});

test("Adapted by Salon keeps exactly three America-set remakes", () => {
  const america = ADAPTED_BY_SALON_IDS.filter((id) => {
    const work = shelfWork(id);
    assert.ok(work, id);
    const place = placeFor(work!);
    assert.ok(place, id);
    return place!.region === "us" || place!.region === "us-south";
  });
  assert.deepEqual(
    america,
    ["prefer-not", "between-the-drop-and-the-water", "the-pattern"],
  );
  assert.equal(ADAPTED_BY_SALON_IDS.length, 11);
  assert.equal(america.length, 3);
});

test("unknown geography is omitted instead of inventing a city", () => {
  assert.equal(
    placeFor({ id: "not-a-real-work", author: "Nobody On The Shelf", language: "Klingon" }),
    null,
  );
  assert.equal(placeForId("not-a-real-work"), null);
});

test("country fallback stays a country, not a map hub city", () => {
  const work = SHELF.find((item) => item.id === "seven-brothers");
  assert.ok(work);
  const place = placeFor(work!);
  assert.ok(place);
  assert.equal(place!.label, "Finland");
  assert.equal(place!.region, "fi");
});

test("every region used by the shelf has a shape", () => {
  const missing: string[] = [];
  for (const work of SHELF) {
    const place = placeFor(work);
    if (!place) continue;
    if (!REGION_SHAPES[place.region]) missing.push(`${work.id}=${place.region}`);
  }
  assert.deepEqual(missing, [], missing.join("; "));
});

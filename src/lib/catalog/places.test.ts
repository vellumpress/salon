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
    vera: { label: "Cornwall", region: "gb" },
    "on-a-chinese-screen": { label: "China", region: "cn" },
    futility: { label: "Petersburg coast", region: "ru" },
    "poison-tree": { label: "Bengal", region: "in" },
    "trooper-peter-halket": { label: "Mashonaland", region: "za" },
    "the-home-and-the-world": { label: "Bengal", region: "in" },
    "the-immoralist": { label: "France", region: "fr" },
    "where-angels-fear-to-tread": { label: "England → Italy", region: "it" },
    "the-gadfly": { label: "Pisa", region: "it" },
    "letters-of-a-javanese-princess": { label: "Java — Japara", region: "id" },
    "blood-and-sand": { label: "Madrid", region: "es" },
    ecstasy: { label: "The Hague / Scheveningen", region: "nl" },
    "an-outcast-of-the-islands": { label: "Malay Archipelago", region: "id" },
    "the-underdogs": { label: "Mexico — sierra", region: "mx" },
    "diary-of-a-chambermaid": { label: "Paris", region: "fr" },
    "the-painted-veil": { label: "Hong Kong orbit", region: "cn" },
    "the-good-soldier": { label: "Bad Nauheim", region: "de" },
    "growth-of-the-soil": { label: "Norway", region: "no" },
    "nada-the-lily": { label: "Zululand", region: "za" },
    "all-quiet-on-the-western-front": { label: "Western Front", region: "fr" },
    we: { label: "One State / glass city", region: "ru" },
    "the-story-of-gosta-berling": { label: "Sweden — Värmland", region: "se" },
    thais: { label: "Egypt — Thebaid / Nile", region: "eg" },
    demian: { label: "Germany — little-town Latin school", region: "de" },
    "death-comes-for-the-archbishop": { label: "New Mexico — arid red hills", region: "us" },
    "the-getting-of-wisdom": { label: "Australia — Melbourne orbit", region: "au" },
    bliss: { label: "London", region: "gb" },
    "a-hundred-and-seventy-chinese-poems": { label: "China", region: "cn" },
    dubliners: { label: "Dublin", region: "ie" },
    gitanjali: { label: "Bengal", region: "in" },
    "martin-bircks-youth": { label: "Stockholm", region: "se" },
    botchan: { label: "Tokyo", region: "jp" },
    "enchanted-april": { label: "Italy", region: "it" },
    "the-bridge-of-san-luis-rey": { label: "Peru", region: "pe" },
    "mr-fortunes-maggot": { label: "Fanua", region: "ws" },
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
    "bliss-tokyo": { label: "Tokyo", region: "jp" },
    "open-window-singapore": { label: "Singapore", region: "sg" },
    "story-of-an-hour-buenos-aires": { label: "Buenos Aires", region: "ar" },
    "masque-rio": { label: "Rio de Janeiro", region: "br" },
    "boule-de-suif-istanbul": { label: "Istanbul", region: "tr" },
    "happy-prince-hong-kong": { label: "Hong Kong", region: "hk" },
    "hunger-artist-milan": { label: "Milan", region: "it" },
    "the-nose-cape-town": { label: "Cape Town", region: "za" },
    "queen-of-spades-paris": { label: "Paris", region: "fr" },
    "decapitated-chicken-lisbon": { label: "Lisbon", region: "pt" },
    "madame-bovary-tokyo": { label: "Tokyo", region: "jp" },
    "dorian-gray-shanghai": { label: "Shanghai", region: "cn" },
    "anna-karenina-milan": { label: "Milan", region: "it" },
    "jane-eyre-singapore": { label: "Singapore", region: "sg" },
    "pride-prejudice-buenos-aires": { label: "Buenos Aires", region: "ar" },
    "dracula-istanbul": { label: "Istanbul", region: "tr" },
    "crime-punishment-cape-town": { label: "Cape Town", region: "za" },
    "age-of-innocence-venice": { label: "Venice", region: "it" },
    "tess-lisbon": { label: "Lisbon", region: "pt" },
    "scarlet-letter-kyoto": { label: "Kyoto", region: "jp" },
    "wuthering-heights-rio": { label: "Rio de Janeiro", region: "br" },
    "garden-party-barcelona": { label: "Barcelona", region: "es" },
    "usher-prague": { label: "Prague", region: "cz" },
    "araby-seville": { label: "Seville", region: "es" },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = shelfWork(id);
    assert.ok(work, id);
    assert.deepEqual(placeFor(work!), want, id);
  }
});

test("Locked recommend, Next, and ritual-lane works all resolve a place with a silhouette", () => {
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
  assert.deepEqual(FEATURED_CAROUSEL_IDS, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.equal(NEXT_FEATURED_TRACK_IDS.includes("quicksand"), false);
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("attendants-confession"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("rashomon"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("high-wind-jamaica"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("noli-me-tangere"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("vera"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("on-a-chinese-screen"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("futility"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("trooper-peter-halket"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("the-home-and-the-world"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("the-immoralist"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("where-angels-fear-to-tread"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-gadfly"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("letters-of-a-javanese-princess"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("blood-and-sand"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("ecstasy"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("an-outcast-of-the-islands"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-underdogs"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("diary-of-a-chambermaid"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-painted-veil"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-good-soldier"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("growth-of-the-soil"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("nada-the-lily"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("all-quiet-on-the-western-front"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("we"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-story-of-gosta-berling"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("thais"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("demian"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("death-comes-for-the-archbishop"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-getting-of-wisdom"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("bliss"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("a-hundred-and-seventy-chinese-poems"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("dubliners"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("gitanjali"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("martin-bircks-youth"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("poison-tree"), false);
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
    ["the-pattern", "between-the-drop-and-the-water", "prefer-not"],
  );
  assert.equal(ADAPTED_BY_SALON_IDS.length, 14);
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

test("every shelf work resolves a place with a silhouette", () => {
  const missing: string[] = [];
  const shapeless: string[] = [];
  for (const work of SHELF) {
    const place = placeFor(work);
    if (!place) missing.push(`${work.id} (${work.author}, ${work.language})`);
    else if (!REGION_SHAPES[place.region]) shapeless.push(`${work.id}=${place.region}`);
  }
  assert.deepEqual(missing, [], `missing place: ${missing.join("; ")}`);
  assert.deepEqual(shapeless, [], `no silhouette: ${shapeless.join("; ")}`);
});

test("The Purple Land and Hudson setting overrides chip honestly", () => {
  assert.deepEqual(placeForId("the-purple-land"), { label: "Uruguay", region: "uy" });
  assert.deepEqual(placeForId("green-mansions"), { label: "Guyana", region: "gy" });
  assert.deepEqual(placeForId("a-crystal-age"), { label: "England", region: "gb" });
  assert.deepEqual(placeForId("beowulf"), { label: "England", region: "gb" });
});

test("former no-place shelf rows now resolve a country chip", () => {
  const expect: Record<string, { label: string; region: string }> = {
    fishke: { label: "Belarus", region: "by" },
    quiroga: { label: "Uruguay", region: "uy" },
    breakdown: { label: "Palestine", region: "ps" },
    dybbuk: { label: "Ukraine", region: "ua" },
    iphigenia: { label: "Venezuela", region: "ve" },
    tropic: { label: "Guyana", region: "gy" },
    barbara: { label: "Venezuela", region: "ve" },
    "mama-blanca": { label: "Venezuela", region: "ve" },
    guatemala: { label: "Guatemala", region: "gt" },
    beowulf: { label: "England", region: "gb" },
    "song-of-songs": { label: "Israel", region: "il" },
    "malay-annals-sejarah-melayu": { label: "Malaysia", region: "my" },
    "kim-van-kieu-tan-truyen-the-tale-of-kieu": { label: "Vietnam", region: "vn" },
    "the-purple-land": { label: "Uruguay", region: "uy" },
    azul: { label: "Nicaragua", region: "ni" },
    "malay-sketches": { label: "Malaysia", region: "my" },
    "in-court-and-kampong": { label: "Malaysia", region: "my" },
    "laos-folk-lore-of-farther-india": { label: "Laos", region: "la" },
    "the-literature-of-arabia": { label: "Iraq", region: "iq" },
    "green-mansions": { label: "Guyana", region: "gy" },
    "cantos-de-vida-y-esperanza": { label: "Nicaragua", region: "ni" },
    "the-book-of-the-birds-paksi-pakaranam": { label: "Thailand", region: "th" },
    "the-epic-of-gilgamesh": { label: "Iraq", region: "iq" },
    "west-african-folk-tales": { label: "Ghana", region: "gh" },
    "south-american-jungle-tales": { label: "Uruguay", region: "uy" },
    "the-autobiography-of-munshi-abdullah-hikayat-abd": { label: "Malaysia", region: "my" },
    "letters-of-a-javanese-princess": { label: "Java — Japara", region: "id" },
    "the-garden-of-bright-waters": { label: "Iraq", region: "iq" },
    "a-crystal-age": { label: "England", region: "gb" },
  };
  for (const [id, want] of Object.entries(expect)) {
    const work = shelfWork(id);
    assert.ok(work, id);
    assert.deepEqual(placeFor(work!), want, id);
  }
});

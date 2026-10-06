import assert from "node:assert/strict";
import test from "node:test";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import { ADAPTED_BY_SALON_IDS, NEXT_FEATURED_TRACK_IDS } from "./curatorial.ts";
import { RITUAL_LANES } from "./rituals.ts";
import { SHELF, shelfWork } from "./shelf.ts";
import { REGION_SHAPES } from "./region-shapes.ts";
import { chipOnlyLabel, CHIP_ONLY_PLACE, NO_PRINTED_PLACE, placeFor, placeForId, surfacedPlaceWorkIds } from "./places.ts";

test("named settings keep reader-friendly labels and real regions", () => {
  const expect = {
    quicksand: { label: "Naxos / South", region: "us-south" },
    "attendants-confession": { label: "Brazil", region: "br" },
    rashomon: { label: "Kyoto / Japan", region: "jp" },
    "high-wind-jamaica": { label: "Jamaica", region: "jm" },
    "noli-me-tangere": { label: "Manila", region: "ph" },
    vera: { label: "Cornwall", region: "gb" },
    "on-a-chinese-screen": { label: "China", region: "cn" },
    futility: { label: "Simbirsk", region: "ru" },
    "poison-tree": { label: "Bengal", region: "in" },
    "trooper-peter-halket": { label: "Mashonaland", region: "za" },
    "the-home-and-the-world": { label: "Bengal", region: "in" },
    "the-hidden-force": { label: "Labuwangi", region: "id" },
    hunger: { label: "Kristiania", region: "no" },
    "jude-the-obscure": { label: "Marygreen", region: "gb" },
    "the-immoralist": { label: "France", region: "fr" },
    "where-angels-fear-to-tread": { label: "Charing Cross → Tuscany", region: "it" },
    "the-gadfly": { label: "Pisa", region: "it" },
    "letters-of-a-javanese-princess": { label: "Java — Japara", region: "id" },
    "blood-and-sand": { label: "Madrid", region: "es" },
    ecstasy: { label: "The Hague / Scheveningen", region: "nl" },
    "an-outcast-of-the-islands": { label: "Malay Archipelago", region: "id" },
    "the-underdogs": { label: "Mexico — sierra", region: "mx" },
    "diary-of-a-chambermaid": { label: "Paris", region: "fr" },
    "the-painted-veil": { label: "Hong Kong orbit", region: "cn" },
    "the-good-soldier": { label: "Nauheim", region: "de" },
    "crime-and-punishment": { label: "Petersburg", region: "ru" },
    "uncle-silas": { label: "Bartram-Haugh", region: "ie" },
    "rise-of-david-levinsky": { label: "Lower East Side", region: "us" },
    "for-the-term-of-his-natural-life": { label: "Prison Ship", region: "au" },
    "bottle-imp": { label: "Hawaii", region: "ws" },
    "death-in-venice": { label: "Venice", region: "it" },
    "elmer-gantry": { label: "Cato", region: "us" },
    "colonels-dream": { label: "Clarendon", region: "us-south" },
    "hard-times": { label: "Coketown", region: "gb" },
    "great-god-pan": { label: "London", region: "gb" },
    manalive: { label: "Beacon House", region: "gb" },
    "captain-blood": { label: "Caribbean", region: "bb" },
    "the-monomaniac": { label: "Le Havre railway", region: "fr" },
    "tartarin-de-tarascon": { label: "Algeria", region: "dz" },
    "the-time-machine": { label: "Richmond", region: "gb" },
    "prisoner-of-zenda": { label: "Strelsau", region: "at" },
    kidnapped: { label: "Highlands", region: "gb" },
    "revolt-of-the-angels": { label: "St. Sulpice", region: "fr" },
    "children-of-the-soil": { label: "Kremen", region: "pl" },
    "the-invisible-man": { label: "Iping", region: "gb" },
    "the-village-in-the-jungle": { label: "Beddagama, Ceylon", region: "lk" },
    "the-joy-of-captain-ribot": { label: "Valencia", region: "es" },
    saracinesca: { label: "Rome", region: "it" },
    "the-torrents-of-spring": { label: "Frankfort", region: "de" },
    "the-bet": { label: "Russia", region: "ru" },
    "the-bitter-tea-of-general-yen": { label: "Shanghai", region: "cn" },
    "the-woman-of-andros": { label: "Brynos", region: "gr" },
    "bella-donna": { label: "London → Egypt", region: "eg" },
    "nina-balatka": { label: "Prague", region: "cz" },
    "la-lupa": { label: "Sicily", region: "it" },
    "a-farewell-to-arms": { label: "Italy", region: "it" },
    "alice-adams": { label: "US Midwest", region: "us" },
    "quartet": { label: "Paris", region: "fr" },
    "song-of-songs-sudermann": { label: "Germany → Berlin", region: "de" },
    "its-wavering-image": { label: "San Francisco (Chinatown)", region: "us" },
    "java-head": { label: "Salem", region: "us" },
    "sunshine-sketches-of-a-little-town": { label: "Mariposa", region: "ca" },
    "guest-the-one-eyed": { label: "Borg", region: "is" },
    "the-blind-musician": { label: "Volhynia", region: "ua" },
    "magnolia-flower": { label: "St. Johns River", region: "us-south" },
    "in-the-mountains": { label: "Mountainside chalet, Switzerland", region: "ch" },
    "the-two-countesses": { label: "Sebenberg Castle and Vienna", region: "at" },
    "el-ombu": { label: "Pampas near Chascomús", region: "ar" },
    "halil-the-pedlar": { label: "Istanbul", region: "tr" },
    "the-white-sand-path": { label: "West Flanders village", region: "be" },
    "liliecronas-home": { label: "Värmland, Sweden", region: "se" },
    "doctor-luke-of-the-labrador": { label: "Labrador coast", region: "ca" },
    "morrina": { label: "Madrid, Spain", region: "es" },
    "a-happy-boy": { label: "Norway", region: "no" },
    "the-desjardins": { label: "Viger, Quebec", region: "ca" },
    "gone-to-earth": { label: "Welsh border hills", region: "gb" },
    "the-real-charlotte": { label: "Dublin & Lismoyle, Ireland", region: "ie" },
    "pembroke": { label: "Pembroke, New England", region: "us" },
    "the-argonauts": { label: "Poland", region: "pl" },
    "at-the-roadside-station": { label: "Russia", region: "ru" },
    "the-will-to-live": { label: "Chambéry & La Vigie, Savoy", region: "fr" },
    "doom-castle": { label: "Argyll, Scottish Highlands", region: "gb" },
    "mayflower": { label: "The Cabanal, Valencia", region: "es" },
    "susan-proudleigh": { label: "Kingston, Jamaica → Colón, Panama", region: "jm" },
    "the-peat-moor": { label: "A peat moor on the Norwegian coast", region: "no" },
    "life-and-death-of-harriett-frean": { label: "London suburb", region: "gb" },
    "farewell-love": { label: "Naples", region: "it" },
    "the-son-of-his-mother": { label: "Berlin", region: "de" },
    "my-lady-nobody": { label: "Horstwyk", region: "nl" },
    "new-years-night": { label: "New South Wales", region: "au" },
    "the-old-house": { label: "Pest and Buda", region: "hu" },
    "the-sworn-brothers": { label: "Dalsfjord, Norway → Iceland", region: "no" },
    "dusty-answer": { label: "Thames-side → Cambridge", region: "gb" },
    "christine-of-the-hills": { label: "Dalmatia", region: "hr" },
    "the-story-of-a-woman": { label: "Bengal, India", region: "in" },
    "daughters-of-men": { label: "Athens & Tenos, Greece", region: "gr" },
    "the-bright-shawl": { label: "Havana, Cuba", region: "cu" },
    "irresolute-catherine": { label: "Wye hills near Brecon, Wales", region: "gb" },
    "the-old-room": { label: "Denmark", region: "dk" },
    "the-fur-coat": { label: "Sweden", region: "se" },
    "the-corsican-brothers": { label: "Sullacaro, Corsica", region: "fr" },
    "jocelyn": { label: "Mentone & Monte Carlo, the Riviera", region: "fr" },
    "the-woman-of-knockaloe": { label: "Knockaloe, by Peel, Isle of Man", region: "im" },
    "the-taking-of-the-redoubt": { label: "Cheverino redoubt", region: "ru" },
    "the-man-in-the-brown-suit": { label: "Paris, France", region: "fr" },
    "wang-the-ninth": { label: "Ten Li Hamlet", region: "cn" },
    "garram-the-hunter": { label: "the Hills and the Plains", region: "ng" },
    "his-dead-wifes-photograph": { label: "India", region: "in" },
    "the-face-in-the-abyss": { label: "Chupan", region: "pe" },
    "the-hoop": { label: "Russia", region: "ru" },
    "love-s-shadow": { label: "Knightsbridge, London", region: "gb" },
    "lewis-and-irene": { label: "Paris", region: "fr" },
    "a-monkey": { label: "Christiania", region: "no" },
    "the-golden-age": { label: "England", region: "gb" },
    "the-counterfeiters": { label: "Luxembourg Gardens, Paris", region: "fr" },
    "therese": { label: "Argelouse", region: "fr" },
    "elysium": { label: "Pall Mall, London", region: "gb" },
    "maximina": { label: "Pasajes", region: "es" },
    "love-among-the-chickens": { label: "London", region: "gb" },
    "muslin": { label: "Galway", region: "ie" },
    "the-fresco": { label: "Pekin", region: "cn" },
    "the-taoist-priest-of-lao-shan": { label: "Lao-shan", region: "cn" },
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
    "garden-party-barcelona": { label: "Barcelona", region: "es" },
    "usher-prague": { label: "Prague", region: "cz" },
    "araby-seville": { label: "Seville", region: "es" },
    "nacha-regules": { label: "Buenos Aires", region: "ar" },
    krakatit: { label: "Prague", region: "cz" },
    "the-peasants": { label: "Poland village", region: "pl" },
    cane: { label: "Georgia", region: "us-south" },
    "a-hero-of-our-time": { label: "Caucasus—Georgia", region: "ge" },
    "strange-tales": { label: "China", region: "cn" },
    "short-stories-from-the-balkans": { label: "Romania", region: "ro" },
    "the-awakening": { label: "Grand Isle", region: "us-south" },
    "a-few-figs-from-thistles": { label: "United States", region: "us" },
    tropic: { label: "Barbados", region: "bb" },
    "there-is-confusion": { label: "New York / Richmond", region: "us" },
    buddenbrooks: { label: "Lübeck", region: "de" },
    "miss-lulu-bett": { label: "Midwest", region: "us" },
    color: { label: "US lyric", region: "us" },
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
    if (!place) {
      if (!chipOnlyLabel(id) && !NO_PRINTED_PLACE.has(id)) missing.push(id); // NO_PRINTED_PLACE: the story prints no place; never invent one
    }
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
  assert.equal(NEXT_FEATURED_TRACK_IDS.includes("quicksand"), true);
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("attendants-confession"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("rashomon"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("high-wind-jamaica"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("noli-me-tangere"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("vera"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("on-a-chinese-screen"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("futility"), true);
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("trooper-peter-halket"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("the-home-and-the-world"));
  assert.ok(NEXT_FEATURED_TRACK_IDS.includes("the-immoralist"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("where-angels-fear-to-tread"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-gadfly"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("letters-of-a-javanese-princess"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("blood-and-sand"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("ecstasy"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("an-outcast-of-the-islands"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-underdogs"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("diary-of-a-chambermaid"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-painted-veil"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-good-soldier"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("growth-of-the-soil"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("nada-the-lily"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("all-quiet-on-the-western-front"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("we"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-story-of-gosta-berling"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("thais"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("demian"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("death-comes-for-the-archbishop"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-getting-of-wisdom"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("bliss"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("a-hundred-and-seventy-chinese-poems"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("dubliners"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("gitanjali"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("martin-bircks-youth"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("poison-tree"), false);
  assert.ok(RITUAL_LANES.some((lane) => lane.workIds.includes("silhouettes")));
});

test("Adapted by tbr keeps exactly three America-set remakes", () => {
  const america = ADAPTED_BY_SALON_IDS.filter((id) => {
    const work = shelfWork(id);
    assert.ok(work, id);
    const place = placeFor(work!);
    assert.ok(place, id);
    return place!.region === "us" || place!.region === "us-south";
  });
  assert.deepEqual(
    america,
    ["prefer-not", "the-pattern", "between-the-drop-and-the-water"],
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
    if (!place) {
      // NO_PRINTED_PLACE: the story prints no place; never invent one
      if (!chipOnlyLabel(work.id) && !NO_PRINTED_PLACE.has(work.id)) missing.push(`${work.id} (${work.author}, ${work.language})`);
    } else if (!REGION_SHAPES[place.region]) shapeless.push(`${work.id}=${place.region}`);
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
    tropic: { label: "Barbados", region: "bb" },
    barbara: { label: "Venezuela", region: "ve" },
    "mama-blanca": { label: "Venezuela", region: "ve" },
    guatemala: { label: "Guatemala", region: "gt" },
    beowulf: { label: "England", region: "gb" },
    "song-of-songs": { label: "Israel", region: "il" },
    "malay-annals-sejarah-melayu": { label: "Malaysia", region: "my" },
    "kim-van-kieu-tan-truyen-the-tale-of-kieu": { label: "Vietnam", region: "vn" },
    "the-purple-land": { label: "Uruguay", region: "uy" },
    azul: { label: "Nicaragua", region: "ni" },
    "malay-sketches": { label: "Malaya", region: "my" },
    "in-court-and-kampong": { label: "Malaysia", region: "my" },
    "laos-folk-lore-of-farther-india": { label: "Laos", region: "la" },
    "the-literature-of-arabia": { label: "Iraq", region: "iq" },
    "green-mansions": { label: "Guyana", region: "gy" },
    "cantos-de-vida-y-esperanza": { label: "Nicaragua", region: "ni" },
    "the-book-of-the-birds-paksi-pakaranam": { label: "Thailand", region: "th" },
    "the-epic-of-gilgamesh": { label: "Iraq", region: "iq" },
    "west-african-folk-tales": { label: "Gold Coast", region: "gh" },
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

test("the Isle of Man has its own key and silhouette, never England", () => {
  assert.ok(REGION_SHAPES.im?.d, "im shape");
  const work = shelfWork("the-woman-of-knockaloe");
  assert.ok(work);
  assert.deepEqual(placeFor(work!), { label: "Knockaloe, by Peel, Isle of Man", region: "im" });
  assert.doesNotMatch(placeFor(work!)?.label ?? "", /England/);
  const redoubt = shelfWork("the-taking-of-the-redoubt");
  assert.ok(redoubt);
  assert.deepEqual(placeFor(redoubt!), { label: "Cheverino redoubt", region: "ru" });
});

test("Nigeria has its own key and silhouette; South Africa, China and India reuse theirs", () => {
  assert.ok(REGION_SHAPES.ng?.d, "ng shape");
  const garram = shelfWork("garram-the-hunter");
  assert.ok(garram);
  assert.deepEqual(placeFor(garram!), { label: "the Hills and the Plains", region: "ng" });
  const brown = shelfWork("the-man-in-the-brown-suit");
  assert.ok(brown);
  assert.deepEqual(placeFor(brown!), { label: "Paris, France", region: "fr" });
  const wang = shelfWork("wang-the-ninth");
  assert.ok(wang);
  assert.deepEqual(placeFor(wang!), { label: "Ten Li Hamlet", region: "cn" });
  const photo = shelfWork("his-dead-wifes-photograph");
  assert.ok(photo);
  assert.deepEqual(placeFor(photo!), { label: "India", region: "in" });
});

test("POST-#225 places reuse Peru and Russia; no new region key", () => {
  assert.ok(REGION_SHAPES.pe?.d, "pe shape");
  assert.ok(REGION_SHAPES.ru?.d, "ru shape");
  const face = shelfWork("the-face-in-the-abyss");
  assert.ok(face);
  assert.deepEqual(placeFor(face!), { label: "Chupan", region: "pe" });
  const hoop = shelfWork("the-hoop");
  assert.ok(hoop);
  assert.deepEqual(placeFor(hoop!), { label: "Russia", region: "ru" });
});

test("chip-only settings carry a label but no country key and no silhouette", () => {
  assert.deepEqual(CHIP_ONLY_PLACE, { "mary-magdalen": "Tiberias, Galilee" });
  const mary = shelfWork("mary-magdalen");
  assert.ok(mary);
  assert.equal(placeFor(mary!), null);
  assert.equal(chipOnlyLabel("mary-magdalen"), "Tiberias, Galilee");
  assert.equal(chipOnlyLabel("the-face-in-the-abyss"), null);
  for (const id of Object.keys(CHIP_ONLY_PLACE)) assert.ok(shelfWork(id), id);
});

test("POST-#227 places reuse gb, fr and no; no new region key", () => {
  for (const key of ["gb", "fr", "no"] as const) assert.ok(REGION_SHAPES[key]?.d, `${key} shape`);
  assert.deepEqual(placeFor(shelfWork("love-s-shadow")!), { label: "Knightsbridge, London", region: "gb" });
  assert.deepEqual(placeFor(shelfWork("lewis-and-irene")!), { label: "Paris", region: "fr" });
  assert.deepEqual(placeFor(shelfWork("a-monkey")!), { label: "Christiania", region: "no" });
  for (const id of ["love-s-shadow", "lewis-and-irene", "a-monkey"]) assert.equal(CHIP_ONLY_PLACE[id], undefined, id);
});

test("POST-#228 place reuses fr; no new region key", () => {
  assert.ok(REGION_SHAPES.fr?.d, "fr shape");
  assert.deepEqual(placeFor(shelfWork("the-counterfeiters")!), { label: "Luxembourg Gardens, Paris", region: "fr" });
  assert.equal(CHIP_ONLY_PLACE["the-counterfeiters"], undefined);
  assert.deepEqual(placeFor(shelfWork("therese")!), { label: "Argelouse", region: "fr" });
  assert.equal(CHIP_ONLY_PLACE["therese"], undefined);
});

test("mid Rituals places reuse gb; no new region key; Elysium is a named chip, not chip-only", () => {
  assert.ok(REGION_SHAPES.gb?.d, "gb shape");
  assert.deepEqual(placeFor(shelfWork("elysium")!), { label: "Pall Mall, London", region: "gb" });
  assert.equal(CHIP_ONLY_PLACE["elysium"], undefined);
  assert.equal(NO_PRINTED_PLACE.has("elysium"), false);
});

test("POST-v3 Ritual: NO_PRINTED_PLACE is only Wedding-Day, and it resolves no chip and no country", () => {
  assert.deepEqual([...NO_PRINTED_PLACE], ["wedding-day"]);
  for (const id of NO_PRINTED_PLACE) {
    const work = shelfWork(id);
    assert.ok(work, id);
    assert.equal(placeFor(work!), null, id);
    assert.equal(placeForId(id), null, id);
    assert.equal(chipOnlyLabel(id), null, id);
    assert.equal(id in CHIP_ONLY_PLACE, false, id);
  }
});

test("Sun 4 Oct PM place reuses es; no new region key", () => {
  assert.ok(REGION_SHAPES.es?.d, "es shape");
  assert.deepEqual(placeFor(shelfWork("maximina")!), { label: "Pasajes", region: "es" });
  assert.equal(CHIP_ONLY_PLACE["maximina"], undefined);
});

test("Mon 5 Oct POST-#238 place reuses gb London; no new region key", () => {
  assert.ok(REGION_SHAPES.gb?.d, "gb shape");
  assert.deepEqual(placeFor(shelfWork("love-among-the-chickens")!), { label: "London", region: "gb" });
  assert.equal(CHIP_ONLY_PLACE["love-among-the-chickens"], undefined);
});

test("Tue 6 Oct AM place reuses ie; Galway; no new region key", () => {
  assert.ok(REGION_SHAPES.ie?.d, "ie shape");
  assert.deepEqual(placeFor(shelfWork("muslin")!), { label: "Galway", region: "ie" });
  assert.equal(CHIP_ONLY_PLACE["muslin"], undefined);
});

test("Mon 5 Oct mid Ritual place reuses cn; Pekin chip; no new region key", () => {
  assert.ok(REGION_SHAPES.cn?.d, "cn shape");
  assert.deepEqual(placeFor(shelfWork("the-fresco")!), { label: "Pekin", region: "cn" });
  assert.equal(CHIP_ONLY_PLACE["the-fresco"], undefined);
});

test("Mon 5 Oct PM Ritual place reuses cn; Lao-shan chip; no new region key", () => {
  assert.ok(REGION_SHAPES.cn?.d, "cn shape");
  assert.deepEqual(placeFor(shelfWork("the-taoist-priest-of-lao-shan")!), { label: "Lao-shan", region: "cn" });
  assert.equal(CHIP_ONLY_PLACE["the-taoist-priest-of-lao-shan"], undefined);
});

test("Tue 6 Oct walk place reuses gb; England; no new region key", () => {
  assert.ok(REGION_SHAPES.gb?.d, "gb shape");
  assert.deepEqual(placeFor(shelfWork("the-golden-age")!), { label: "England", region: "gb" });
  assert.equal(CHIP_ONLY_PLACE["the-golden-age"], undefined);
});

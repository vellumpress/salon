/**
 * Works whose text prints no place at all (Mira, POST-v3 Ritual): no chip and no country.
 * placeFor() and countryFor() stay null/empty for these ids; PlaceChip renders nothing.
 * countryFor() skips the author lookup for these ids (CoS final ruling, Sat 24 Oct 2026 CHAMELEON).
 * Lives in its own module so countries.ts can read it without importing places.ts (which imports countries.ts).
 */
export const NO_PRINTED_PLACE: ReadonlySet<string> = new Set([
  "wedding-day", // story prints no place; never invent one
  "bambi", // Mira Mon 19 Oct 2026 AM BAMBI: the forest is never named and the front matter names no country; no chip, no country
  "the-four-seasons", // Mira Tue 20 Oct 2026 AM EWALD: a cosmic fable set on "the earth" and an unnamed valley; Greenland and Italy appear once only as a climate aside in the Prologue; no chip
  "the-wall-opposite", // Mira Thu 22 Oct 2026 AM WALL: the story names no setting (a court, an ancestral mansion, "the village"); America appears only as the source of an inheritance; no chip, no country
  "a-work-of-art", // Mira Thu 22 Oct 2026 PM CHEKHOV: the town is never named ("the whole town knows her"); no chip, no country
  "teleshov-the-duel", // Mira Thu 22 Oct 2026 PM TELESHOV: no place is printed (a meadow, the regiment, Pelageia Petrovna's room); no chip, no country
  "chekhov-a-chameleon", // Mira Sat 24 Oct 2026 AM CHAMELEON: the market square, the timber-yard and the General's house are unnamed; "Petersburg or Moscow" is only a comparison; no chip, no country
  "chekhov-bad-weather", // Mira Sat 24 Oct 2026 AM BAD WEATHER: only "the town", the summer villa, the flat and the law-courts; no chip, no country
  "the-story-of-a-brahmadaitya", // Mira Sat 24 Oct 2026 PM BRAHMADAITYA: only "the village", its outskirts, the haunted banyan and the vakula-tree; no chip, no country
  "bjornson-the-father", // Mira Sun 25 Oct 2026 AM FATHER: only "his parish", the priest's study, the lake and the gards (Överaas, Storliden); no town or country is printed; no chip, no country
  "the-hedgehog-the-jackal-and-the-lion", // Mira Sun 25 Oct 2026 PM HEDGEHOG: only "a garden of onions", "the street" and "a young palm-tree"; no town, region or people is named; no chip, no country
  "do-not-trust-your-friend", // Mira Sun 25 Oct 2026 PM FRIEND: only "the Forest", the villages, Leopard's town and Rat's hole; the cut header's "Country of the Animals" is no place; no chip, no country
  "the-shipwrecked-sailor", // Mira Mon 26 Oct 2026 PM SAILOR: the island is never named ("this isle", "an island", "this isle of the blest"); Wawat, Senmut, Egypt, Punt and the mines are only origins, titles and routes; no chip, no country
  "the-story-of-the-two-neighbours", // Mira Mon 26 Oct 2026 PM NEIGHBOURS: no place is named, only "the same village", "a neighbouring town", the houses, the garden and the school-house; no chip, no country
  "the-misers-servant", // Mira Wed 28 Oct 2026 PM MISER: no place is named, only "the villagers", "the heads of the village", the low land, upland and rice lands; no chip, no country
  "the-sheep-brother", // Mira Thu 29 Oct 2026 PM SHEEP: no place is named, only "the mountains", "a strange place", "the royal castle", "the seashore" and "the whole city"; no chip, no country
  "the-story-of-bingo", // Mira Fri 30 Oct 2026 AM BINGO: no place is named, only "a big village", "the river", "the forest", "the cave", "the mountains" and "the country of the white people"; "Fan" in the heading is the people; no chip, no country
]);

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
]);

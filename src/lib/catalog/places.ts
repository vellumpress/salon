import { countryFor } from "./countries.ts";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import { ADAPTED_BY_SALON_IDS, NEXT_FEATURED_TRACK_IDS } from "./curatorial.ts";
import { RITUAL_LANES } from "./rituals.ts";
import { shelfWork, type ShelfWork } from "./shelf.ts";
import { REGION_SHAPES, type PlaceRegion } from "./region-shapes.ts";

/**
 * Reader-facing place of setting (or “from”) — not author origin and not
 * the Map’s language hubs. Short label + ISO-ish region for a silhouette.
 *
 * Resolution: per-work setting → country-of-origin fallback → omit.
 * Unknown / unplaceable works stay off chrome rather than inventing a city.
 */
export type WorkPlace = {
  label: string;
  region: PlaceRegion;
};

export type PlaceRef = Pick<ShelfWork, "id" | "author" | "language">;

/** Curated setting labels for locked recommend, Next, ritual lanes, and named examples. */
const WORK_PLACE: Record<string, WorkPlace> = {
  // Named examples / other local binds
  vengeance: { label: "Poland", region: "pl" },
  passing: { label: "Harlem", region: "us" },
  we: { label: "Russia", region: "ru" },
  berlin: { label: "Berlin", region: "de" },
  manhattan: { label: "New York", region: "us" },
  crime: { label: "Petersburg", region: "ru" },
  dorian: { label: "London", region: "gb" },
  bovary: { label: "France", region: "fr" },
  odessa: { label: "Odessa", region: "ua" },
  naomi: { label: "Tokyo", region: "jp" },
  dracula: { label: "England", region: "gb" },
  gold: { label: "New York", region: "us" },

  // Locked recommend order (live front door)
  "enchanted-april": { label: "Italy", region: "it" },
  "the-bridge-of-san-luis-rey": { label: "Peru", region: "pe" },
  "mr-fortunes-maggot": { label: "Fanua", region: "ws" },
  "the-house-of-mirth": { label: "New York", region: "us" },
  quicksand: { label: "Naxos / South", region: "us-south" },

  // Next / priority Host-a-sit queue
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

  // Named examples
  botchan: { label: "Tokyo", region: "jp" },
  silhouettes: { label: "Dieppe", region: "fr" },
  "a-room-with-a-view": { label: "Florence", region: "it" },

  // Ritual lanes (beyond locked recommend / Next)
  "bunner-sisters": { label: "New York", region: "us" },
  "the-weary-blues": { label: "Harlem", region: "us" },
  "kwaidan-stories-and-studies-of-strange-things": { label: "Japan", region: "jp" },
  carmilla: { label: "Styria", region: "at" },
  "hungry-hearts": { label: "New York", region: "us" },
  "in-our-time": { label: "Michigan", region: "us" },
  "the-wild-swans-at-coole": { label: "Ireland", region: "ie" },
  "the-listeners-and-other-poems": { label: "England", region: "gb" },
  "the-empty-house-and-other-ghost-stories": { label: "England", region: "gb" },
  "dark-of-the-moon": { label: "United States", region: "us" },
  "love-songs": { label: "United States", region: "us" },
  "the-house-of-souls": { label: "London", region: "gb" },
  wallpaper: { label: "United States", region: "us" },
  "the-rubaiyat-of-omar-khayyam": { label: "Persia", region: "ir" },
  "spring-and-all": { label: "United States", region: "us" },
  "a-few-figs-from-thistles": { label: "United States", region: "us" },
  "songs-of-innocence-and-of-experience": { label: "England", region: "gb" },
  "second-april": { label: "United States", region: "us" },
  "renascence-and-other-poems": { label: "United States", region: "us" },
  "mountain-interval": { label: "New England", region: "us" },
  gitanjali: { label: "India", region: "in" },
  "songs-of-kabir": { label: "India", region: "in" },
  "pictures-of-the-floating-world": { label: "Japan", region: "jp" },
  "the-garden-party-and-other-stories": { label: "New Zealand", region: "nz" },
  "bliss-and-other-stories": { label: "New Zealand", region: "nz" },
  "body-of-this-death": { label: "United States", region: "us" },
  orlando: { label: "England", region: "gb" },
  cheri: { label: "Paris", region: "fr" },
  dalloway: { label: "London", region: "gb" },
  "north-of-boston": { label: "New England", region: "us" },
  "chicago-poems": { label: "Chicago", region: "us" },
  "harlem-shadows": { label: "Harlem", region: "us" },
  "sour-grapes": { label: "United States", region: "us" },
  precipitations: { label: "New York", region: "us" },
  "flame-and-shadow": { label: "United States", region: "us" },
  "helen-of-troy-and-other-poems": { label: "United States", region: "us" },
  "spoon-river-anthology": { label: "Illinois", region: "us" },
  "death-comes-for-the-archbishop": { label: "New Mexico", region: "us" },
  "copper-sun": { label: "United States", region: "us" },
  "the-black-christ-and-other-poems": { label: "United States", region: "us" },

  // Frequent shelf settings (pitches / serialize) — still not invented cities
  banjo: { label: "Marseille", region: "fr" },
  "the-sun-also-rises": { label: "Paris", region: "fr" },
  gatsby: { label: "New York", region: "us" },
  "the-age-of-innocence": { label: "New York", region: "us" },
  "liza-of-lambeth": { label: "London", region: "gb" },
  "a-passage-to-india": { label: "India", region: "in" },
  "lolly-willowes": { label: "England", region: "gb" },
  "the-bridge-of-san-luis-rey": { label: "Peru", region: "pe" },
  "the-cherry-orchard": { label: "Russia", region: "ru" },
  "bel-ami": { label: "Paris", region: "fr" },
  liliom: { label: "Budapest", region: "hu" },
  "african-farm": { label: "South Africa", region: "za" },
  underdogs: { label: "Mexico", region: "mx" },
  "miss-julie": { label: "Sweden", region: "se" },
  "sister-carrie": { label: "Chicago", region: "us" },
  "my-antonia": { label: "Nebraska", region: "us" },
  "o-pioneers": { label: "Nebraska", region: "us" },
  "ethan-frome": { label: "New England", region: "us" },
  "winesburg-ohio": { label: "Ohio", region: "us" },
  "home-harlem": { label: "Harlem", region: "us" },
  "plum-bun": { label: "Philadelphia", region: "us" },
  kim: { label: "India", region: "in" },
  "plain-tales-from-the-hills": { label: "India", region: "in" },
  ulysses: { label: "Dublin", region: "ie" },
  dubliners: { label: "Dublin", region: "ie" },
  "a-portrait-of-the-artist-as-a-young-man": { label: "Dublin", region: "ie" },
  venice: { label: "Venice", region: "it" },
  malavoglia: { label: "Sicily", region: "it" },
  cat: { label: "Tokyo", region: "jp" },
  kokoro: { label: "Tokyo", region: "jp" },
  genji: { label: "Japan", region: "jp" },
  swann: { label: "France", region: "fr" },
  nana: { label: "Paris", region: "fr" },
  "after-the-divorce": { label: "Sardinia", region: "it" },

  // Adapted by Salon — remakes, not locked-recommend / Next classics
  // Mike hard rule: ≤1/3 America-set (exactly 3/11 US keepers).
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
};

/** Country-of-origin → reader label + silhouette when no setting override. */
const COUNTRY_PLACE: Record<string, WorkPlace> = {
  "United States": { label: "United States", region: "us" },
  "United Kingdom": { label: "England", region: "gb" },
  Ireland: { label: "Ireland", region: "ie" },
  Scotland: { label: "Scotland", region: "gb" },
  Wales: { label: "Wales", region: "gb" },
  France: { label: "France", region: "fr" },
  Germany: { label: "Germany", region: "de" },
  Austria: { label: "Austria", region: "at" },
  Russia: { label: "Russia", region: "ru" },
  Japan: { label: "Japan", region: "jp" },
  China: { label: "China", region: "cn" },
  Italy: { label: "Italy", region: "it" },
  Spain: { label: "Spain", region: "es" },
  Portugal: { label: "Portugal", region: "pt" },
  Brazil: { label: "Brazil", region: "br" },
  Mexico: { label: "Mexico", region: "mx" },
  Argentina: { label: "Argentina", region: "ar" },
  India: { label: "India", region: "in" },
  Iran: { label: "Persia", region: "ir" },
  "South Africa": { label: "South Africa", region: "za" },
  Australia: { label: "Australia", region: "au" },
  "New Zealand": { label: "New Zealand", region: "nz" },
  Canada: { label: "Canada", region: "ca" },
  Jamaica: { label: "Jamaica", region: "jm" },
  Hungary: { label: "Hungary", region: "hu" },
  Czechia: { label: "Czechia", region: "cz" },
  Poland: { label: "Poland", region: "pl" },
  Netherlands: { label: "Netherlands", region: "nl" },
  Belgium: { label: "Belgium", region: "be" },
  Sweden: { label: "Sweden", region: "se" },
  Norway: { label: "Norway", region: "no" },
  Denmark: { label: "Denmark", region: "dk" },
  Finland: { label: "Finland", region: "fi" },
  Greece: { label: "Greece", region: "gr" },
  Turkey: { label: "Turkey", region: "tr" },
  Ukraine: { label: "Ukraine", region: "ua" },
  Romania: { label: "Romania", region: "ro" },
  Korea: { label: "Korea", region: "kr" },
  Egypt: { label: "Egypt", region: "eg" },
  Lebanon: { label: "Lebanon", region: "lb" },
  Peru: { label: "Peru", region: "pe" },
  Philippines: { label: "Philippines", region: "ph" },
  Colombia: { label: "Colombia", region: "co" },
  Cuba: { label: "Cuba", region: "cu" },
  Iceland: { label: "Iceland", region: "is" },
  Uruguay: { label: "Uruguay", region: "uy" },
  Venezuela: { label: "Venezuela", region: "ve" },
  Guyana: { label: "Guyana", region: "gy" },
  Guatemala: { label: "Guatemala", region: "gt" },
  Nicaragua: { label: "Nicaragua", region: "ni" },
  Malaysia: { label: "Malaysia", region: "my" },
  Vietnam: { label: "Vietnam", region: "vn" },
  Laos: { label: "Laos", region: "la" },
  Thailand: { label: "Thailand", region: "th" },
  Indonesia: { label: "Indonesia", region: "id" },
  Iraq: { label: "Iraq", region: "iq" },
  Belarus: { label: "Belarus", region: "by" },
  Palestine: { label: "Palestine", region: "ps" },
  Israel: { label: "Israel", region: "il" },
  Ghana: { label: "Ghana", region: "gh" },
};

function withShape(place: WorkPlace | undefined): WorkPlace | null {
  if (!place) return null;
  if (!REGION_SHAPES[place.region]) return null;
  return place;
}

export function placeFor(work: PlaceRef): WorkPlace | null {
  const curated = withShape(WORK_PLACE[work.id]);
  if (curated) return curated;
  const country = countryFor(work);
  if (!country) return null;
  return withShape(COUNTRY_PLACE[country]);
}

export function placeForId(id: string): WorkPlace | null {
  const work = shelfWork(id);
  if (work) return placeFor(work);
  return withShape(WORK_PLACE[id]);
}

export function hasPlaceShape(region: string): region is PlaceRegion {
  return region in REGION_SHAPES;
}

/** Locked recommend + Next track + Adapted + ritual-lane ids (unique, catalog order). */
export function surfacedPlaceWorkIds(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [
    ...FEATURED_CAROUSEL_IDS,
    ...NEXT_FEATURED_TRACK_IDS,
    ...ADAPTED_BY_SALON_IDS,
  ]) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const lane of RITUAL_LANES) {
    for (const id of lane.workIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

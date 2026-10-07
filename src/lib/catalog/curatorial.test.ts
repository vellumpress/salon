import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { FEATURED_CAROUSEL_IDS, PITCHES } from "./pitches.ts";
import { PREFACES } from "./prefaces.ts";
import {
  ADAPTED_BY_SALON_IDS,
  curatorialTrack,
  isAdaptedBySalon,
  NEXT_FEATURED_TRACK_IDS,
} from "./curatorial.ts";
import { FIRST_SESSION_RITUAL_IDS, RITUAL_LANES, RITUAL_PITCHES, RITUAL_SIT_MINUTES, ritualPitchFor } from "./rituals.ts";
import { SHELF, shelfWork } from "./shelf.ts";
import { canonicalWorkId, remapAliasedWorkIds } from "../work-id-alias.ts";
import { blurbFor } from "./blurbs.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";
import { isBoundLocal, isEnReadableOff } from "./en-rights.ts";
import { isSectionBreak, splitEmphasis } from "../emphasized-text.ts";
import { countryFor } from "./countries.ts";
import { placeFor } from "./places.ts";
import { readerIntro } from "../reader-intro.ts";
import { openingBreathIndex } from "../opening-scene.ts";
import type { Work } from "../literature.ts";

/**
 * The card opening is the line a fresh Sit opens on: breath 0, or, when the
 * leading scenes are tagged front matter, the first line after them (a short
 * printed heading may sit between). Front matter stays in the book, so saved
 * breath indexes never move.
 */
function opensOnFirstLine(full: unknown, opening: string) {
  const work = full as Work;
  if ((work.breaths[0]?.text ?? "").startsWith(opening)) return true;
  const at = openingBreathIndex(work);
  for (let i = at; i <= at + 2 && i < work.breaths.length; i++) {
    const text = work.breaths[i]?.text ?? "";
    if (text.startsWith(opening)) return true;
    if (text.length > 60) return false;
  }
  return false;
}

/**
 * Bind-note metadata (texts/openings JSON `note`). Inventory and PG
 * reading-ease figures are kept here for the pipeline; reader copy no
 * longer carries them (see pipeline-leak.test.ts).
 */
function bindNote(id: string): string {
  for (const folder of ["texts", "openings"]) {
    const path = new URL(`./${folder}/${id}.json`, import.meta.url);
    if (existsSync(path)) return (JSON.parse(readFileSync(path, "utf8")) as { note?: string }).note ?? "";
  }
  return "";
}

type PackedSit = {
  title: string;
  note?: string;
  scenes: { title: string }[];
  breaths: { text: string }[];
};

test("Locked recommend order is April, Bridge, Maggot, then Mirth, then Quicksand", () => {
  assert.deepEqual(FEATURED_CAROUSEL_IDS, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("attendants-confession"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("rashomon"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("high-wind-jamaica"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("noli-me-tangere"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("vera"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("on-a-chinese-screen"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("futility"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("poison-tree"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("trooper-peter-halket"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-home-and-the-world"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("where-angels-fear-to-tread"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-gadfly"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-immoralist"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("letters-of-a-javanese-princess"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("blood-and-sand"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("ecstasy"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("an-outcast-of-the-islands"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-underdogs"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("diary-of-a-chambermaid"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-painted-veil"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-good-soldier"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("growth-of-the-soil"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("nada-the-lily"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("all-quiet-on-the-western-front"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("we"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-story-of-gosta-berling"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("thais"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("demian"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("death-comes-for-the-archbishop"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-getting-of-wisdom"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("bliss"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("a-hundred-and-seventy-chinese-poems"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("dubliners"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("gitanjali"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("martin-bircks-youth"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("harmonium"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("steppenwolf"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("second-april"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-bridge"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("miss-brill-adapted"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("prefer-not"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("late-season"), false);
  for (const id of FEATURED_CAROUSEL_IDS) {
    assert.equal(curatorialTrack(id), "featured", id);
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
  }
});

test("Next queue no longer lists Mirth or Quicksand", () => {
  assert.deepEqual([...NEXT_FEATURED_TRACK_IDS], [
    "attendants-confession",
    "rashomon",
    "high-wind-jamaica",
    "noli-me-tangere",
    "vera",
    "on-a-chinese-screen",
    "trooper-peter-halket",
    "the-home-and-the-world",
    "the-immoralist",
    "a-hero-of-our-time",
    "strange-tales",
    "short-stories-from-the-balkans",
    "the-awakening",
    "tropic",
    "there-is-confusion",
    "miss-lulu-bett",
    "the-three-impostors",
    "reginald",
    "last-poems-housman",
    "the-dynamiter",
    "candide",
    "the-toys-of-peace",
    "the-black-dog",
    "children-of-the-frost",
    "south-sea-tales",
    "fairies-and-fusiliers",
    "young-adventure",
    "the-tempers",
    "the-crescent-moon",
    "poems-by-emily-dickinson-series-one",
    "a-diversity-of-creatures",
    "an-american-tragedy",
    "bertha-garlan",
    "born-in-exile",
    "calvary",
    "charmides-and-other-poems",
    "cousin-betty",
    "dauber",
    "eugenie-grandet",
    "heart-of-darkness",
    "in-a-glass-darkly",
    "in-the-world",
    "indiana",
    "lady-windermeres-fan",
    "pans-garden",
    "peacock-pie",
    "prosas-profanas",
    "resurrection",
    "rosmersholm",
    "salome",
    "salt-water-ballads",
    "small-souls",
    "songs-and-satires",
    "tess-of-the-durbervilles",
    "the-ballad-of-the-white-horse",
    "the-colonel-s-dream",
    "the-comedienne",
    "the-crux",
    "the-dream",
    "the-gods-of-pegana",
    "the-grand-babylon-hotel",
    "the-hidden-force",
    "the-house-by-the-medlar-tree",
    "the-house-of-the-seven-gables",
    "the-jacket",
    "the-job",
    "the-magic-skin",
    "the-man-of-property",
    "the-napoleon-of-notting-hill",
    "the-party-and-other-stories",
    "the-pit",
    "the-poison-tree",
    "the-reign-of-greed",
    "the-rise-of-david-levinsky",
    "the-rise-of-silas-lapham",
    "the-road-to-the-open",
    "the-romance-of-the-milky-way",
    "the-three-taverns",
    "the-titan",
    "the-town-down-the-river",
    "the-veil-and-other-poems",
    "the-village",
    "the-wolves-of-god",
    "the-wonderful-adventures-of-nils",
    "theresa-raquin",
    "three-soldiers",
    "twilight-sleep",
    "virgin-soil",
    "wanderers",
    "white-jacket",
    "yekl",
    "zuleika-dobson",
    "all-quiet-on-the-western-front",
    "a-group-of-noble-dames",
    "captain-craig",
    "daniel-deronda",
    "day-and-night-stories",
    "fifty-one-tales",
    "jude-the-obscure",
    "les-villes-tentaculaires",
    "neue-gedichte",
    "over-the-brazier",
    "rolling-stones",
    "salammbo",
    "smoke-bellew",
    "songs-from-vagabondia",
    "songs-of-childhood",
    "ten-minute-stories",
    "the-everlasting-mercy",
    "the-golden-bowl",
    "the-rainbow",
    "the-sword-of-welleran",
    "time-and-the-gods",
    "a-changed-man",
    "ballads-of-a-bohemian",
    "ballads-of-a-cheechako",
    "crucial-instances",
    "filipino-popular-tales",
    "lost-illusions",
    "mogens",
    "more-songs-from-vagabondia",
    "rhymes-of-a-red-cross-man",
    "rhymes-of-a-rolling-stone",
    "songs-of-travel",
    "the-faith-of-men",
    "the-golden-whales-of-california",
    "the-hermit-and-the-wild-woman",
    "the-princess-casamassima",
    "the-son-of-the-wolf",
    "the-stolen-bacillus",
    "the-tragic-muse",
    "toilers-of-the-sea",
    "toward-the-gulf",
    "a-house-of-gentlefolk",
    "artists-wives",
    "blix",
    "emaux-et-camees",
    "eves-ransom",
    "fraternity",
    "hania",
    "indian-summer",
    "les-heures-claires",
    "les-trophees",
    "numa-roumestan",
    "royal-highness",
    "the-emancipated",
    "the-great-hunger",
    "the-patrician",
    "the-price-of-love",
    "the-private-papers-of-henry-ryecroft",
    "unhuman-tour-kusamakura",
    "ubirajara",
    "cecilia",
    "la-regenta",
    "los-pazos-de-ulloa",
    "nazarin",
    "the-octopus",
    "the-red-and-the-black",
    "alcools",
    "petersburg",
    "st-peter-s-umbrella",
    "caesar-or-nothing",
    "calligrammes",
    "martin-fierro",
    "the-complete-original-short-stories",
    "the-cabin",
    "les-chants-de-maldoror",
    "pan-tadeusz",
    "the-red-laugh",
    "before-adam",
    "bruges-la-morte",
    "casmurro",
    "les-civilises",
    "ein-landarzt",
    "hien-le-maboul",
    "knulp",
    "iracema",
    "tristana",
    "niels",
    "amor-de-perdicao",
    "das-stunden-buch",
    "misericordia",
    "the-mandarin",
    "policarpo",
    "quincas",
    "marianela",
    "pepita-jimenez",
    "a-illustre-casa-de-ramires",
    "an-iceland-fisherman",
    "aphrodite",
    "azul",
    "contes-cruels",
    "les-amours-jaunes",
    "libro-de-poemas",
    "on-the-eve",
    "papeis-avulsos",
    "piping-hot",
    "ramuntcho",
    "smoke",
    "the-fortune-of-the-rougons",
    "the-paying-guest",
    "the-triumph-of-death",
    "the-witch-and-other-stories",
    "therese-raquin",
    "tradiciones-peruanas",
    "watch-and-ward",
    "bay-a-book-of-poems",
    "black-spirits-and-white-a-book-of-ghost-stories",
    "fir-flower-tablets",
    "hugh-selwyn-mauberley",
    "os-lusiadas",
    "the-black-monk-and-other-stories",
    "the-heart-of-happy-hollow",
    "the-hesperides-and-noble-numbers",
    "the-horse-stealers-and-other-stories",
    "the-mystery-of-choice",
    "the-poems-of-emma-lazarus-volume-1",
    "weird-tales",
    "siddhartha",
    "faust-part-i",
    "the-divine-comedy",
    "eugene-onegin",
    "gilgamesh",
    "bontshe-the-silent",
    "shahnameh",
    "song-of-songs",
    "baudelaire-prose-and-poetry",
    "tales-grotesque-and-curious",
    "a-book-barnes",
    "a-spring-time-case",
    "jewish-children",
    "essays-and-soliloquies",
    "tragic-sense-of-life",
    "white-buildings",
    "three-plays",
    "the-sweet-miracle",
    "red-oleanders",
    "stories-from-tagore",
    "the-fugitive",
    "nationalism",
    "the-cycle-of-spring",
    "creative-unity",
    "the-lonely-way",
    "rootabaga-stories",
    "rootabaga-pigeons",
    "auguste-rodin",
    "lucky-pehr",
    "the-dream-play",
    "the-father",
    "easter",
    "the-inferno",
    "trafalgar",
    "saragossa",
    "leon-roch",
    "yiddish-short-stories",
    "tales-of-old-japan",
    "chinese-literature",
    "the-prose-tales",
    "self-determining-haiti",
    "leon-roch-vol-2",
    "miss-julia",
    "in-midsummer-days",
    "the-chinese-fairy-book",
    "japanese-fairy-world",
    "japanese-literature",
    "romances-of-old-japan",
    "warriors-of-old-japan",
    "a-history-of-chinese-literature",
    "the-civilization-of-china",
    "kimiko",
    "glimpses-of-unfamiliar-japan",
    "hebrew-literature",
    "the-history-of-yiddish-literature",
    "korean-folk-tales",
    "smoke-and-steel",
    "gods-trombones",
    "layla",
    "conference",
    "gentlemen-prefer-blondes",
    "of-one-blood",
    "maria-chapdelaine",
    "african-farm",
    "a-passage-to-india",
    "mhudi",
    "maria",
    "of-human-bondage",
    "green-mansions",
    "nada-the-lily",
    "death-comes-for-the-archbishop",
    "banjo",
    "nacha-regules",
    "enchanted-april",
    "quicksand",
    "underdogs",
    "lolly-willowes",
    "cheri",
    "all-quiet-on-the-western-front",
    "the-gadfly",
    "the-painted-veil",
    "growth-of-the-soil",
    "the-purple-land",
    "noli-me-tangere",
    "bread-givers",
    "the-story-of-gosta-berling",
    "a-hero-of-our-time",
    "after-the-divorce",
    "blood-and-sand",
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
    "basilio",
    "oblomov",
    "blacker",
    "a-lost-lady",
    "the-wanderer",
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
    "born-in-exile",
    "the-four-horsemen-of-the-apocalypse",
    "after-the-divorce",
    "virgin-soil",
    "the-sport-of-the-gods",
    "ramuntcho",
    "miss-lulu-bett",
    "the-pit",
    "royal-highness",
    "ramona",
    "almayers-folly",
    "the-crux",
    "daisy-miller",
    "south-wind",
    "the-village",
    "ditte-girl-alive",
    "candide",
    "iola-leroy",
    "esther-waters",
    "aphrodite",
    "erewhon",
    "ann-veronica",
    "the-great-hunger",
    "the-mysterious-stranger",
    "the-poison-tree",
    "cosmopolis",
    "the-woman-who-did",
    "billy-budd",
    "cousin-betty",
    "the-sorrows-of-satan",
    "the-king-of-schnorrers",
    "hania",
    "tess-of-the-durbervilles",
    "captains-courageous",
    "numa-roumestan",
    "dracula",
    "the-house-of-the-seven-gables",
    "heart-of-darkness",
    "toilers-of-the-sea",
    "indian-summer",
    "cabbages-and-kings",
    "picture-of-dorian-gray",
    "the-job",
    "reign-of-greed",
    "shadow-of-the-cathedral",
    "way-of-all-flesh",
    "family-at-gilje",
    "resurrection",
    "typee",
    "kangaroo",
    "casanovas-homecoming",
    "the-mother",
    "three-soldiers",
    "doctor-pascal",
    "in-the-world",
    "leila",
    "sister-carrie",
    "antic-hay",
    "spring-time-case",
    "eline-vere",
    "smoke",
    "niels-lyhne",
    "the-emancipated",
    "germinal",
    "kipps",
    "the-professor",
    "a-room-with-a-view",
    "martin-eden",
    "une-vie",
    "my-antonia",
    "look-back-on-happiness",
    "the-good-soldier",
    "crime-and-punishment",
    "uncle-silas",
    "rise-of-david-levinsky",
    "for-the-term-of-his-natural-life",
    "death-in-venice",
    "elmer-gantry",
    "colonels-dream",
    "hard-times",
    "manalive",
    "captain-blood",
    "the-monomaniac",
    "tartarin-de-tarascon",
    "prisoner-of-zenda",
    "kidnapped",
    "revolt-of-the-angels",
    "children-of-the-soil",
    "the-village-in-the-jungle",
    "the-joy-of-captain-ribot",
    "saracinesca",
    "the-torrents-of-spring",
    "the-bitter-tea-of-general-yen",
    "the-woman-of-andros",
    "bella-donna",
    "nina-balatka",
    "a-farewell-to-arms",
    "alice-adams",
    "quartet",
    "song-of-songs-sudermann",
    "java-head",
    "sunshine-sketches-of-a-little-town",
    "guest-the-one-eyed",
    "the-blind-musician",
    "in-the-mountains",
    "the-two-countesses",
    "el-ombu",
    "halil-the-pedlar",
    "liliecronas-home",
    "doctor-luke-of-the-labrador",
    "morrina",
    "a-happy-boy",
    "gone-to-earth",
    "the-real-charlotte",
    "pembroke",
    "the-argonauts",
    "the-will-to-live",
    "doom-castle",
    "mayflower",
    "susan-proudleigh",
    "life-and-death-of-harriett-frean",
    "farewell-love",
    "the-son-of-his-mother",
    "my-lady-nobody",
    "the-old-house",
    "the-sworn-brothers",
    "dusty-answer",
    "christine-of-the-hills",
    "daughters-of-men",
    "the-bright-shawl",
    "irresolute-catherine",
    "the-old-room",
    "the-corsican-brothers",
    "jocelyn",
    "the-woman-of-knockaloe",
    "the-man-in-the-brown-suit",
    "wang-the-ninth",
    "garram-the-hunter",
    "the-face-in-the-abyss",
    "mary-magdalen",
    "love-s-shadow",
    "lewis-and-irene",
    "the-counterfeiters",
    "therese",
    "maximina",
    "love-among-the-chickens",
    "muslin",
    "the-golden-age",
    "the-spoilt-child",
    "a-japanese-blossom",
    "strait-is-the-gate",
    "fraulein-schmidt-and-mr-anstruther",
  ]);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("buddenbrooks"), false);
  assert.equal(curatorialTrack("buddenbrooks"), "later");
  assert.equal(FEATURED_CAROUSEL_IDS.includes("buddenbrooks"), false);
  assert.equal(curatorialTrack("quicksand"), "featured");
  assert.equal(curatorialTrack("the-house-of-mirth"), "featured");
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("quicksand"), true);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-house-of-mirth"), false);
  assert.equal(curatorialTrack("attendants-confession"), "next");
  assert.equal(curatorialTrack("rashomon"), "next");
  assert.equal(curatorialTrack("high-wind-jamaica"), "next");
  assert.equal(curatorialTrack("noli-me-tangere"), "next");
  assert.equal(curatorialTrack("vera"), "next");
  assert.equal(curatorialTrack("on-a-chinese-screen"), "next");
  assert.equal(curatorialTrack("futility"), "next");
  assert.equal(curatorialTrack("trooper-peter-halket"), "next");
  assert.equal(curatorialTrack("the-home-and-the-world"), "next");
  assert.equal(curatorialTrack("the-immoralist"), "next");
  assert.equal(curatorialTrack("where-angels-fear-to-tread"), "later");
  assert.equal(curatorialTrack("the-gadfly"), "next");
  assert.equal(curatorialTrack("letters-of-a-javanese-princess"), "later");
  assert.equal(curatorialTrack("blood-and-sand"), "next");
  assert.equal(curatorialTrack("poison-tree"), "later");
  assert.equal(curatorialTrack("ecstasy"), "later");
  assert.equal(curatorialTrack("an-outcast-of-the-islands"), "later");
  assert.equal(curatorialTrack("the-underdogs"), "later");
  assert.equal(curatorialTrack("diary-of-a-chambermaid"), "later");
  assert.equal(curatorialTrack("the-painted-veil"), "next");
  assert.equal(curatorialTrack("the-good-soldier"), "next");
  assert.equal(curatorialTrack("growth-of-the-soil"), "next");
  assert.equal(curatorialTrack("nada-the-lily"), "next");
  assert.equal(curatorialTrack("all-quiet-on-the-western-front"), "next");
  assert.equal(curatorialTrack("we"), "later");
  assert.equal(curatorialTrack("the-story-of-gosta-berling"), "next");
  assert.equal(curatorialTrack("thais"), "later");
  assert.equal(curatorialTrack("demian"), "later");
  assert.equal(curatorialTrack("death-comes-for-the-archbishop"), "next");
  assert.equal(curatorialTrack("the-getting-of-wisdom"), "later");
  assert.equal(curatorialTrack("bliss"), "later");
  assert.equal(curatorialTrack("a-hundred-and-seventy-chinese-poems"), "later");
  assert.equal(curatorialTrack("dubliners"), "later");
  assert.equal(curatorialTrack("gitanjali"), "later");
  assert.equal(curatorialTrack("martin-bircks-youth"), "later");
  assert.equal(curatorialTrack("harmonium"), "later");
  assert.equal(curatorialTrack("steppenwolf"), "later");
});

test("Quicksand is a local before-sleep bind with no Gutenberg id", () => {
  const work = SHELF.find((item) => item.id === "quicksand");
  assert.ok(work);
  assert.equal(work.year, 1928);
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, undefined);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Helga Crane sat alone/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("quicksand"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("quicksand"),
    false,
  );
});

test("Adapted by tbr remakes are their own track — never locked recommend or Next", () => {
  assert.deepEqual(
    [...ADAPTED_BY_SALON_IDS],
    [
      "prefer-not",
      "bliss-tokyo",
      "masque-rio",
      "the-pattern",
      "garden-party-barcelona",
      "boule-de-suif-istanbul",
      "story-of-an-hour-buenos-aires",
      "late-season",
      "open-window-singapore",
      "miss-brill-adapted",
      "the-nose-cape-town",
      "usher-prague",
      "araby-seville",
      "between-the-drop-and-the-water",
    ],
  );
  for (const id of ADAPTED_BY_SALON_IDS) {
    assert.equal(isAdaptedBySalon(id), true, id);
    assert.equal(curatorialTrack(id), "adapted", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
  }
  assert.equal(curatorialTrack("enchanted-april"), "featured");
  assert.equal(curatorialTrack("quicksand"), "featured");
  const garden = SHELF.find((item) => item.id === "the-garden-party-and-other-stories");
  assert.ok(garden);
  assert.equal(garden!.title.startsWith("The Garden Party"), true);
  assert.equal(curatorialTrack("the-garden-party-and-other-stories"), "later");
  for (const id of [
    "madame-bovary-tokyo",
    "dorian-gray-shanghai",
    "anna-karenina-milan",
    "jane-eyre-singapore",
    "pride-prejudice-buenos-aires",
    "dracula-istanbul",
    "crime-punishment-cape-town",
    "age-of-innocence-venice",
    "tess-lisbon",
    "scarlet-letter-kyoto",
    "wuthering-heights-rio",
  ]) {
    assert.equal(SHELF.some((item) => item.id === id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.notEqual(curatorialTrack(id), "adapted", id);
    assert.notEqual(curatorialTrack(id), "featured", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
  }
});

test("The Attendant’s Confession is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "attendants-confession");
  assert.ok(work);
  assert.equal(work.year, 1881);
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 21040);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^So it really seems to you/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("attendants-confession"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("attendants-confession"),
    false,
  );
});

test("Rashōmon is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "rashomon");
  assert.ok(work);
  assert.equal(work.year, 1915);
  assert.equal(work.title, "Rashōmon");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 78105);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It was evening\./);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("rashomon"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("rashomon"),
    false,
  );
});

test("A High Wind in Jamaica is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "high-wind-jamaica");
  assert.ok(work);
  assert.equal(work.year, 1929);
  assert.equal(work.title, "A High Wind in Jamaica");
  assert.equal(work.author, "Richard Hughes");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 75530);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^One of the fruits of Emancipation/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("high-wind-jamaica"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("high-wind-jamaica"),
    false,
  );
});

test("Noli Me Tangere is a local unwind bind on Next", () => {
  const work = SHELF.find((item) => item.id === "noli-me-tangere");
  assert.ok(work);
  assert.equal(work.year, 1887);
  assert.equal(work.title, "Noli Me Tangere (The Social Cancer)");
  assert.equal(work.author, "José Rizal (tr. Charles Derbyshire)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 6737);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^On the last of October Don Santiago de los Santos/);
  const lane = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("noli-me-tangere"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("noli-me-tangere"),
    false,
  );
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "before-sleep")?.workIds.includes("noli-me-tangere"),
    false,
  );
  const stub = SHELF.find((item) => item.id === "the-social-cancer-noli-me-tangere");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.equal(stub.gutenberg, 20228);
  assert.notEqual(stub.id, work.id);
});

test("Vera is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "vera");
  assert.ok(work);
  assert.equal(work.year, 1921);
  assert.equal(work.title, "Vera");
  assert.equal(work.author, "Elizabeth von Arnim");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 34366);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^When the doctor had gone/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("vera"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("vera"),
    false,
  );
  assert.equal(isAdaptedBySalon("vera"), false);
  assert.equal(curatorialTrack("vera"), "next");
});

test("On a Chinese Screen is a local waking bind on Next", () => {
  const work = SHELF.find((item) => item.id === "on-a-chinese-screen");
  assert.ok(work);
  assert.equal(work.year, 1922);
  assert.equal(work.title, "On a Chinese Screen");
  assert.equal(work.author, "W. Somerset Maugham");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 48788);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^"I really think I can make something of it," she said/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("on-a-chinese-screen"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("on-a-chinese-screen"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("on-a-chinese-screen"), false);
  assert.equal(isAdaptedBySalon("on-a-chinese-screen"), false);
});

test("Futility is a local Next bind, not For you", () => {
  const work = SHELF.find((item) => item.id === "futility");
  assert.ok(work);
  assert.equal(work.year, 1922);
  assert.equal(work.title, "Futility");
  assert.equal(work.author, "William Gerhardie");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 77253);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^When the \*Simbirsk\*/);
  const lane = RITUAL_LANES.find((item) => item.id === "for-you");
  assert.equal(lane?.workIds.includes("futility"), false);
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "waking-up")?.workIds.includes("futility"),
    false,
  );
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("futility"),
    false,
  );
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("futility"), true);
  assert.equal(curatorialTrack("futility"), "next");
  assert.equal(FEATURED_CAROUSEL_IDS.includes("futility"), false);
});

test("The Poison Tree is a local unwind bind on Later, not Next", () => {
  const work = SHELF.find((item) => item.id === "poison-tree");
  assert.ok(work);
  assert.equal(work.year, 1884);
  assert.equal(work.title, "The Poison Tree");
  assert.equal(work.author, "Bankim Chandra Chatterjee (tr. Miriam S. Knight)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 17455);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Nagendra Natha Datta is about to travel by boat/);
  const lane = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("poison-tree"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("poison-tree"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("poison-tree"), false);
  assert.equal(curatorialTrack("poison-tree"), "later");
});

test("Trooper Peter Halket is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "trooper-peter-halket");
  assert.ok(work);
  assert.equal(work.year, 1897);
  assert.equal(work.title, "Trooper Peter Halket of Mashonaland");
  assert.equal(work.author, "Olive Schreiner");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 1431);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It was a dark night/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("trooper-peter-halket"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("trooper-peter-halket"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("trooper-peter-halket"), false);
  const stub = SHELF.find((item) => item.id === "trooper-peter-halket-of-mashonaland");
  assert.ok(stub);
  assert.equal(stub.local, true);
  assert.notEqual(stub.id, work.id);
  assert.equal(FEATURED_CAROUSEL_IDS.includes(stub.id), false);
});

test("Enchanted April is a local waking bind on locked recommend", () => {
  const work = SHELF.find((item) => item.id === "enchanted-april");
  assert.ok(work);
  assert.equal(work.year, 1922);
  assert.equal(work.title, "The Enchanted April");
  assert.equal(work.author, "Elizabeth von Arnim");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 16389);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^It began in a Woman/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("enchanted-april"));
  assert.equal(curatorialTrack("enchanted-april"), "featured");
});

test("Mr. Fortune’s Maggot is a local unwind bind on locked recommend", () => {
  const work = SHELF.find((item) => item.id === "mr-fortunes-maggot");
  assert.ok(work);
  assert.equal(work.year, 1927);
  assert.equal(work.title, "Mr. Fortune’s Maggot");
  assert.equal(work.author, "Sylvia Townsend Warner");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 79534);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Though the Reverend Timothy Fortune/);
  const lane = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("mr-fortunes-maggot"));
  assert.equal(curatorialTrack("mr-fortunes-maggot"), "featured");
});

test("House of Mirth stays on unwind and is locked recommend, not Next", () => {
  const work = SHELF.find((item) => item.id === "the-house-of-mirth");
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(curatorialTrack("the-house-of-mirth"), "featured");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(unwind?.workIds.includes("the-house-of-mirth"));
});

test("The Home and the World is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "the-home-and-the-world");
  assert.ok(work);
  assert.equal(work.year, 1916);
  assert.equal(work.title, "The Home and the World");
  assert.equal(work.author, "Rabindranath Tagore (tr. Surendranath Tagore)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 7166);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Mother, today there comes back to mind/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-home-and-the-world"));
  assert.ok(lane!.workIds.indexOf("the-home-and-the-world") > lane!.workIds.indexOf("quicksand"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("the-home-and-the-world"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-home-and-the-world"), false);
  assert.equal(curatorialTrack("the-home-and-the-world"), "next");
  const stub = SHELF.find((item) => item.id === "home-world");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("The Immoralist is a local before-sleep bind on Next", () => {
  const work = SHELF.find((item) => item.id === "the-immoralist");
  assert.ok(work);
  assert.equal(work.year, 1902);
  assert.equal(work.title, "The Immoralist");
  assert.equal(work.author, "André Gide (tr. Dorothy Bussy)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 78975);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^My dear friends, I knew you were faithful/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-immoralist"));
  assert.ok(lane!.workIds.indexOf("the-immoralist") > lane!.workIds.indexOf("the-home-and-the-world"));
  assert.ok(lane!.workIds.indexOf("the-immoralist") > lane!.workIds.indexOf("quicksand"));
  assert.equal(
    RITUAL_LANES.find((item) => item.id === "bite-sized")?.workIds.includes("the-immoralist"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-immoralist"), false);
  assert.equal(curatorialTrack("the-immoralist"), "next");
  assert.equal(SHELF.filter((item) => item.id === "immoralist").length, 0);
  assert.equal(SHELF.filter((item) => item.gutenberg === 78975).length, 1);
  assert.equal(canonicalWorkId("immoralist"), "the-immoralist");
  assert.equal(shelfWork("immoralist")?.id, work.id);
  assert.equal(shelfWork("immoralist"), work);
  assert.equal(STORED_PREFACES.immoralist, undefined);
  assert.match(
    RITUAL_PITCHES["the-immoralist"] ?? "",
    /The first reading is Michel’s opening letter to his friends, ending “…more simply than if I were talking to myself\. Listen:”$/,
  );
  assert.doesNotMatch(RITUAL_PITCHES["the-immoralist"] ?? "", /freedom line/);
  const book = JSON.parse(readFileSync(new URL("./texts/the-immoralist.json", import.meta.url), "utf8")) as {
    breaths: { text: string }[];
  };
  assert.equal(
    book.breaths[0]?.text.endsWith("more simply than if I were talking to myself. Listen:"),
    true,
  );
});

test("immoralist alias keeps saved progress, Kept lines, and the read link", () => {
  assert.equal(canonicalWorkId("the-immoralist"), "the-immoralist");
  assert.equal(`/read/${canonicalWorkId("immoralist")}`, "/read/the-immoralist");
  const remapped = remapAliasedWorkIds({
    progress: {
      immoralist: { lastOpenedAt: 20, kept: ["letter", "listen"] },
      "the-immoralist": { lastOpenedAt: 5, kept: ["listen", "friends"] },
    },
    favorites: ["immoralist", "the-immoralist", "dracula"],
    lastShuffle: "immoralist",
    readingNow: { id: "immoralist" },
    worksTouchedByDay: { "2026-10-07": ["immoralist", "the-immoralist"] },
    sitHistory: [{ workId: "immoralist" }],
    togetherKeeps: [{ workId: "immoralist" }],
    hostedSits: [{ workId: "immoralist" }],
  });
  assert.deepEqual(Object.keys(remapped.progress ?? {}), ["the-immoralist"]);
  assert.equal(remapped.progress?.["the-immoralist"]?.lastOpenedAt, 20);
  assert.deepEqual(remapped.progress?.["the-immoralist"]?.kept, ["letter", "listen", "friends"]);
  assert.deepEqual(remapped.favorites, ["the-immoralist", "dracula"]);
  assert.equal(remapped.lastShuffle, "the-immoralist");
  assert.equal(remapped.readingNow?.id, "the-immoralist");
  assert.deepEqual(remapped.worksTouchedByDay?.["2026-10-07"], ["the-immoralist"]);
  assert.equal(remapped.sitHistory?.[0]?.workId, "the-immoralist");
  assert.equal(remapped.togetherKeeps?.[0]?.workId, "the-immoralist");
  assert.equal(remapped.hostedSits?.[0]?.workId, "the-immoralist");
  assert.equal(ritualPitchFor("immoralist"), RITUAL_PITCHES["the-immoralist"]);
});

test("Letters of a Javanese Princess is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "letters-of-a-javanese-princess");
  assert.ok(work);
  assert.equal(work.year, 1920);
  assert.equal(work.title, "Letters of a Javanese Princess");
  assert.equal(work.author, "Raden Adjeng Kartini (tr. Agnes Louise Symmers)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 34647);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^I have longed to make the acquaintance/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("letters-of-a-javanese-princess"));
  assert.ok(
    lane!.workIds.indexOf("letters-of-a-javanese-princess") >
      lane!.workIds.indexOf("enchanted-april"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("letters-of-a-javanese-princess"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("letters-of-a-javanese-princess"), false);
  assert.equal(curatorialTrack("letters-of-a-javanese-princess"), "later");
});

test("Blood and Sand is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "blood-and-sand");
  assert.ok(work);
  assert.equal(work.year, 1908);
  assert.equal(work.title, "Blood and Sand");
  assert.equal(work.author, "Vicente Blasco Ibáñez (tr. Mrs. W. A. Gillespie)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 54222);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Juan Gallardo breakfasted early/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("blood-and-sand"));
  assert.ok(lane!.workIds.indexOf("blood-and-sand") > lane!.workIds.indexOf("letters-of-a-javanese-princess"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("blood-and-sand"), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("blood-and-sand"), false);
  assert.equal(curatorialTrack("blood-and-sand"), "next");
});

test("Where Angels Fear to Tread is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "where-angels-fear-to-tread");
  assert.ok(work);
  assert.equal(work.year, 1905);
  assert.equal(work.title, "Where Angels Fear to Tread");
  assert.equal(work.author, "E. M. Forster");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2948);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^They were all at Charing Cross/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("where-angels-fear-to-tread"));
  assert.ok(lane!.workIds.indexOf("where-angels-fear-to-tread") > lane!.workIds.indexOf("enchanted-april"));
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("where-angels-fear-to-tread"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("where-angels-fear-to-tread"), false);
  assert.equal(curatorialTrack("where-angels-fear-to-tread"), "later");
});

test("The Gadfly is a local before-sleep bind on Next, behind Home and the World", () => {
  const work = SHELF.find((item) => item.id === "the-gadfly");
  assert.ok(work);
  assert.equal(work.year, 1897);
  assert.equal(work.title, "The Gadfly");
  assert.equal(work.author, "Ethel Lilian Voynich");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 3431);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Arthur sat in the library/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-gadfly"));
  assert.ok(lane!.workIds.indexOf("the-gadfly") > lane!.workIds.indexOf("the-home-and-the-world"));
  assert.ok(lane!.workIds.indexOf("the-home-and-the-world") > lane!.workIds.indexOf("quicksand"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-gadfly"), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-gadfly"), false);
  assert.equal(curatorialTrack("the-gadfly"), "next");
});

test("Ecstasy is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "ecstasy");
  assert.ok(work);
  assert.equal(work.year, 1919);
  assert.equal(work.title, "Ecstasy");
  assert.equal(work.author, "Louis Couperus (tr. Alexander Teixeira de Mattos)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 37770);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Dolf Van Attema/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("ecstasy"));
  assert.ok(lane!.workIds.indexOf("ecstasy") > lane!.workIds.indexOf("the-gadfly"));
  assert.ok(lane!.workIds.indexOf("ecstasy") > lane!.workIds.indexOf("quicksand"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("ecstasy"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("ecstasy"), false);
  assert.equal(curatorialTrack("ecstasy"), "later");
  const stub = SHELF.find((item) => item.id === "ecstasy-a-study-of-happiness");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("An Outcast of the Islands is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "an-outcast-of-the-islands");
  assert.ok(work);
  assert.equal(work.year, 1896);
  assert.equal(work.title, "An Outcast of the Islands");
  assert.equal(work.author, "Joseph Conrad");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 638);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^When he stepped off the straight and narrow path/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("an-outcast-of-the-islands"));
  assert.ok(
    lane!.workIds.indexOf("an-outcast-of-the-islands") > lane!.workIds.indexOf("blood-and-sand"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("an-outcast-of-the-islands"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("an-outcast-of-the-islands"), false);
  assert.equal(curatorialTrack("an-outcast-of-the-islands"), "later");
});

test("The Underdogs is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-underdogs");
  assert.ok(work);
  assert.equal(work.year, 1929);
  assert.equal(work.title, "The Underdogs");
  assert.equal(work.author, "Mariano Azuela (tr. E. Munguía, Jr.)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 549);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^"That's no animal/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("the-underdogs"));
  assert.ok(lane!.workIds.indexOf("the-underdogs") > lane!.workIds.indexOf("an-outcast-of-the-islands"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-underdogs"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-underdogs"), false);
  assert.equal(curatorialTrack("the-underdogs"), "later");
  const stub = SHELF.find((item) => item.id === "underdogs");
  assert.ok(stub);
  assert.notEqual(stub.id, work.id);
});

test("The Diary of a Chambermaid is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "diary-of-a-chambermaid");
  assert.ok(work);
  assert.equal(work.year, 1900);
  assert.equal(work.title, "The Diary of a Chambermaid");
  assert.equal(work.author, "Octave Mirbeau");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 44303);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^To-day, September 14/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("diary-of-a-chambermaid"));
  assert.ok(lane!.workIds.indexOf("diary-of-a-chambermaid") > lane!.workIds.indexOf("the-underdogs"));
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("diary-of-a-chambermaid"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("diary-of-a-chambermaid"), false);
  assert.equal(curatorialTrack("diary-of-a-chambermaid"), "later");
  const stub = SHELF.find((item) => item.id === "a-chambermaid-s-diary");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("The Painted Veil is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-painted-veil");
  assert.ok(work);
  assert.equal(work.year, 1925);
  assert.equal(work.title, "The Painted Veil");
  assert.equal(work.author, "W. Somerset Maugham");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 64682);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^She gave a startled cry/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-painted-veil"));
  assert.ok(lane!.workIds.indexOf("the-painted-veil") > lane!.workIds.indexOf("ecstasy"));
  assert.ok(lane!.workIds.indexOf("the-painted-veil") > lane!.workIds.indexOf("quicksand"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-painted-veil"), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-painted-veil"), false);
  assert.equal(curatorialTrack("the-painted-veil"), "next");
});

test("The Good Soldier is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-good-soldier");
  assert.ok(work);
  assert.equal(work.year, 1915);
  assert.equal(work.title, "The Good Soldier");
  assert.equal(work.author, "Ford Madox Ford");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2775);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^This is the saddest story I have ever heard/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-good-soldier"));
  assert.ok(lane!.workIds.indexOf("the-good-soldier") > lane!.workIds.indexOf("the-painted-veil"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-good-soldier"), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-good-soldier"), false);
  assert.equal(curatorialTrack("the-good-soldier"), "next");
});

test("Growth of the Soil is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "growth-of-the-soil");
  assert.ok(work);
  assert.equal(work.year, 1917);
  assert.equal(work.title, "Growth of the Soil");
  assert.equal(work.author, "Knut Hamsun (tr. W. W. Worster)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 10984);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^The long, long road over the moors/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("growth-of-the-soil"));
  assert.ok(
    lane!.workIds.indexOf("growth-of-the-soil") > lane!.workIds.indexOf("diary-of-a-chambermaid"),
  );
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("growth-of-the-soil"), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("growth-of-the-soil"), false);
  assert.equal(curatorialTrack("growth-of-the-soil"), "next");
});

test("Nada the Lily is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "nada-the-lily");
  assert.ok(work);
  assert.equal(work.year, 1892);
  assert.equal(work.title, "Nada the Lily");
  assert.equal(work.author, "H. Rider Haggard");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 1207);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^You ask me, my father/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("nada-the-lily"));
  assert.ok(lane!.workIds.indexOf("nada-the-lily") > lane!.workIds.indexOf("the-painted-veil"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("nada-the-lily"), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("nada-the-lily"), false);
  assert.equal(curatorialTrack("nada-the-lily"), "next");
});

test("All Quiet on the Western Front is a local before-sleep Next lead, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "all-quiet-on-the-western-front");
  assert.ok(work);
  assert.equal(work.year, 1929);
  assert.equal(work.title, "All Quiet on the Western Front");
  assert.equal(work.author, "Erich Maria Remarque");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 75011);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^We are at rest five miles behind the front/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("all-quiet-on-the-western-front"));
  assert.ok(lane!.workIds.indexOf("all-quiet-on-the-western-front") > lane!.workIds.indexOf("nada-the-lily"));
  assert.ok(lane!.workIds.indexOf("all-quiet-on-the-western-front") > lane!.workIds.indexOf("quicksand"));
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("all-quiet-on-the-western-front"),
    true,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("all-quiet-on-the-western-front"), false);
  assert.equal(curatorialTrack("all-quiet-on-the-western-front"), "next");
});

test("We is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "we");
  assert.ok(work);
  assert.equal(work.year, 1924);
  assert.equal(work.title, "We");
  assert.equal(work.author, "Yevgeny Zamyatin (tr. Gregory Zilboorg)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 61963);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^I feel my cheeks are burning/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("we"));
  assert.ok(lane!.workIds.indexOf("we") > lane!.workIds.indexOf("growth-of-the-soil"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("we"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("we"), false);
  assert.equal(curatorialTrack("we"), "later");
});

test("The Story of Gösta Berling is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-story-of-gosta-berling");
  assert.ok(work);
  assert.equal(work.year, 1898);
  assert.equal(work.title, "The Story of Gösta Berling");
  assert.equal(work.author, "Selma Lagerlöf (tr. Pauline Bancroft Flach)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 56158);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^At last the minister stood in the pulpit/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("the-story-of-gosta-berling"));
  assert.ok(
    lane!.workIds.indexOf("the-story-of-gosta-berling") >
      lane!.workIds.indexOf("all-quiet-on-the-western-front"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-story-of-gosta-berling"),
    true,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-story-of-gosta-berling"), false);
  assert.equal(curatorialTrack("the-story-of-gosta-berling"), "next");
  const stub = SHELF.find((item) => item.id === "gosta");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.notEqual(stub.id, work.id);
});

test("Thaïs is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "thais");
  assert.ok(work);
  assert.equal(work.year, 1890);
  assert.equal(work.title, "Thaïs");
  assert.equal(work.author, "Anatole France (tr. Robert B. Douglas)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2078);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^In those days there were many hermits/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("thais"));
  assert.ok(lane!.workIds.indexOf("thais") > lane!.workIds.indexOf("the-story-of-gosta-berling"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("thais"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("thais"), false);
  assert.equal(curatorialTrack("thais"), "later");
});

test("Demian is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "demian");
  assert.ok(work);
  assert.equal(work.year, 1923);
  assert.equal(work.title, "Demian");
  assert.equal(work.author, "Hermann Hesse (tr. N. H. Priday)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 74222);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^I will begin my story with an event of the time when I was ten or eleven/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("demian"));
  assert.ok(lane!.workIds.indexOf("demian") > lane!.workIds.indexOf("thais"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("demian"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("demian"), false);
  assert.equal(curatorialTrack("demian"), "later");
});

test("Death Comes for the Archbishop is a local waking bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "death-comes-for-the-archbishop");
  assert.ok(work);
  assert.equal(work.year, 1927);
  assert.equal(work.title, "Death Comes for the Archbishop");
  assert.equal(work.author, "Willa Cather");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 69730);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^ONE afternoon in the autumn of 1851 a solitary horseman/);
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const mourning = RITUAL_LANES.find((item) => item.id === "soft-mourning");
  assert.ok(waking?.workIds.includes("death-comes-for-the-archbishop"));
  assert.ok(waking!.workIds.indexOf("death-comes-for-the-archbishop") > waking!.workIds.indexOf("we"));
  assert.equal(unwind?.workIds.includes("death-comes-for-the-archbishop"), true);
  assert.equal(mourning?.workIds.includes("death-comes-for-the-archbishop"), false);
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("death-comes-for-the-archbishop"),
    true,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("death-comes-for-the-archbishop"), false);
  assert.equal(curatorialTrack("death-comes-for-the-archbishop"), "next");
});

test("The Getting of Wisdom is a local waking Rituals bind, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "the-getting-of-wisdom");
  assert.ok(work);
  assert.equal(work.year, 1910);
  assert.equal(work.title, "The Getting of Wisdom");
  assert.equal(work.author, "Henry Handel Richardson");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 3728);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^The four children were lying on the grass/);
  const lane = RITUAL_LANES.find((item) => item.id === "waking-up");
  assert.ok(lane?.workIds.includes("the-getting-of-wisdom"));
  assert.ok(
    lane!.workIds.indexOf("the-getting-of-wisdom") >
      lane!.workIds.indexOf("death-comes-for-the-archbishop"),
  );
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-getting-of-wisdom"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-getting-of-wisdom"), false);
  assert.equal(curatorialTrack("the-getting-of-wisdom"), "later");
});

test("Bliss is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "bliss");
  assert.ok(work);
  assert.equal(work.year, 1920);
  assert.equal(work.title, "Bliss");
  assert.equal(work.author, "Katherine Mansfield");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 44385);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Although Bertha Young was thirty/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("bliss"));
  assert.ok(lane!.workIds.indexOf("bliss") > lane!.workIds.indexOf("demian"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("bliss"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("bliss"), false);
  assert.equal(curatorialTrack("bliss"), "later");
});

test("A Hundred and Seventy Chinese Poems is a local before-sleep Rituals bind, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "a-hundred-and-seventy-chinese-poems");
  assert.ok(work);
  assert.equal(work.year, 1918);
  assert.equal(work.title, "A Hundred and Seventy Chinese Poems");
  assert.equal(work.author, "Various (tr. Arthur Waley)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 42290);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^My bed is so empty/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("a-hundred-and-seventy-chinese-poems"));
  assert.ok(
    lane!.workIds.indexOf("a-hundred-and-seventy-chinese-poems") > lane!.workIds.indexOf("bliss"),
  );
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("a-hundred-and-seventy-chinese-poems"),
    false,
  );
  assert.equal(FEATURED_CAROUSEL_IDS.includes("a-hundred-and-seventy-chinese-poems"), false);
  assert.equal(curatorialTrack("a-hundred-and-seventy-chinese-poems"), "later");
});

test("Dubliners is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "dubliners");
  assert.ok(work);
  assert.equal(work.year, 1914);
  assert.equal(work.title, "Dubliners");
  assert.equal(work.author, "James Joyce");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 2814);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^North Richmond Street, being blind/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("dubliners"));
  assert.ok(lane!.workIds.indexOf("dubliners") > lane!.workIds.indexOf("a-hundred-and-seventy-chinese-poems"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("dubliners"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("dubliners"), false);
  assert.equal(curatorialTrack("dubliners"), "later");
});

test("Gitanjali is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "gitanjali");
  assert.ok(work);
  assert.equal(work.year, 1912);
  assert.equal(work.title, "Gitanjali");
  assert.equal(work.author, "Rabindranath Tagore");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 7164);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Thou hast made me endless/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("gitanjali"));
  assert.ok(lane!.workIds.indexOf("gitanjali") > lane!.workIds.indexOf("dubliners"));
  assert.equal(unwind?.workIds.includes("gitanjali"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("gitanjali"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("gitanjali"), false);
  assert.equal(curatorialTrack("gitanjali"), "later");
});

test("Harmonium is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "harmonium");
  assert.ok(work);
  assert.equal(work.year, 1923);
  assert.equal(work.title, "Harmonium");
  assert.equal(work.author, "Wallace Stevens");
  assert.equal(work.local, true);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^One must have a mind of winter/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  assert.ok(lane?.workIds.includes("harmonium"));
  assert.ok(lane!.workIds.indexOf("harmonium") > lane!.workIds.indexOf("martin-bircks-youth"));
  assert.equal(unwind?.workIds.includes("harmonium"), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("harmonium"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("harmonium"), false);
  assert.equal(curatorialTrack("harmonium"), "later");
});

test("Martin Birck's Youth is a local before-sleep bind on Next, not locked recommend", () => {
  const work = SHELF.find((item) => item.id === "martin-bircks-youth");
  assert.ok(work);
  assert.equal(work.year, 1930);
  assert.equal(work.title, "Martin Birck's Youth");
  assert.equal(work.author, "Hjalmar Söderberg (tr. Charles Wharton Stork)");
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 78363);
  assert.equal(isBoundLocal(work), true);
  assert.match(work.opening ?? "", /^Martin Birck was a little child/);
  const lane = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(lane?.workIds.includes("martin-bircks-youth"));
  assert.ok(lane!.workIds.indexOf("martin-bircks-youth") > lane!.workIds.indexOf("gitanjali"));
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("martin-bircks-youth"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("martin-bircks-youth"), false);
  assert.equal(curatorialTrack("martin-bircks-youth"), "later");
});

test("Steppenwolf stays off this Next / Rituals pack", () => {
  const work = SHELF.find((item) => item.id === "steppenwolf");
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.gutenberg, 75756);
  assert.equal(work.breaths, 770);
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("steppenwolf"), false, lane.id);
  }
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("steppenwolf"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("steppenwolf"), false);
});

test("Kusamakura alias stays off Next while the CLEAR Unhuman Tour bind is live", () => {
  for (const id of ["kusamakura-unhuman-tour"]) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, undefined, id);
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${id} ${lane.id}`);
    }
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
  }
});

test("tbr 8am CLEAR ×4 are local Next / Rituals binds, never Featured", () => {
  const expect = {
    krakatit: { lane: "before-sleep", opening: /^With the evening the fog/ },
    "the-peasants": { lane: "waking-up", opening: /Praised be Jesus Christ!/ },
    cane: { lane: "before-sleep", opening: /^Her skin is like dusk/ },
  } as const;
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.match(work!.opening ?? "", want.opening, id);
    const lane = RITUAL_LANES.find((item) => item.id === want.lane);
    assert.ok(lane?.workIds.includes(id), `${id} ${want.lane}`);
    const onNext = id === "the-peasants";
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), onNext, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), onNext ? "next" : "later", id);
  }
  assert.equal(forYou?.workIds.includes("cane"), false);
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(forYou!.workIds.includes("nacha-regules"), false);
  assert.equal(forYou!.workIds.includes("krakatit"), false);
  assert.equal(forYou!.workIds.includes("the-peasants"), false);
});

test("tbr noon CLEAR ×5 are local Next / Rituals binds, never Featured", () => {
  const expect = {
    "a-hero-of-our-time": {
      track: "next",
      opening: /^I was travelling post from Tiflis\./,
      breaths: 1526,
    },
    "strange-tales": {
      track: "next",
      opening: /^A Kiang-si gentleman, named Mêng Lung-t‘an/,
      breaths: 470,
    },
    "short-stories-from-the-balkans": {
      track: "next",
      opening: /^Leiba Zibal, proprietor of the little rest-house by Podeni/,
      breaths: 986,
    },
    "the-awakening": {
      track: "next",
      opening: /^A green and yellow parrot, which hung in a cage outside the door/,
      breaths: 1066,
    },
    "a-few-figs-from-thistles": {
      track: "later",
      opening: /^My candle burns at both ends;/,
      breaths: 66,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  assert.ok(sleep);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.match(work!.opening ?? "", want.opening, id);
    assert.ok(sleep!.workIds.includes(id), id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), want.track, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  const cycle = [
    "a-hero-of-our-time",
    "strange-tales",
    "short-stories-from-the-balkans",
    "the-awakening",
    "a-few-figs-from-thistles",
  ];
  const immoralist = sleep!.workIds.indexOf("the-immoralist");
  const gadfly = sleep!.workIds.indexOf("the-gadfly");
  for (const id of cycle) {
    const at = sleep!.workIds.indexOf(id);
    assert.ok(at > immoralist, `${id} ahead of Later pile`);
    assert.ok(at < gadfly, `${id} ahead of Later pile`);
  }
  assert.equal(waking?.workIds.includes("a-few-figs-from-thistles"), false);
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(forYou!.workIds.includes("cane"), false);
  assert.equal(forYou!.workIds.includes("the-awakening"), false);
  assert.equal(forYou!.workIds.includes("a-hero-of-our-time"), false);
  assert.equal(
    (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("a-few-figs-from-thistles"),
    false,
  );
  assert.equal(curatorialTrack("a-few-figs-from-thistles"), "later");
});

test("tbr PM CLEAR ×5 are local Next / Rituals binds, never Featured", () => {
  const expect = {
    tropic: {
      track: "next",
      opening: /^The whistle blew for eleven o'clock\.$/,
      breaths: 3258,
      forYou: false,
    },
    "there-is-confusion": {
      track: "next",
      opening: /^Joanna’s first consciousness/,
      breaths: 2005,
      forYou: true,
    },
    buddenbrooks: {
      track: "later",
      opening: /^“And--and--what comes next\?”$/,
      breaths: 1845,
      forYou: false,
    },
    "miss-lulu-bett": {
      track: "next",
      opening: /^The Deacons were at supper\.$/,
      breaths: 1712,
      forYou: true,
    },
    color: {
      track: "later",
      opening: /^I doubt not God is good, well-meaning, kind,$/,
      breaths: 1192,
      forYou: false,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  assert.ok(sleep);
  assert.ok(forYou);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.match(work!.opening ?? "", want.opening, id);
    assert.ok(sleep!.workIds.includes(id), id);
    assert.equal(forYou!.workIds.includes(id), want.forYou, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), want.track, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(
      (NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id),
      want.track === "next",
      id,
    );
  }
  const cycle = ["tropic", "there-is-confusion", "buddenbrooks", "miss-lulu-bett", "color"];
  const figs = sleep!.workIds.indexOf("a-few-figs-from-thistles");
  const gadfly = sleep!.workIds.indexOf("the-gadfly");
  let prev = figs;
  for (const id of cycle) {
    const at = sleep!.workIds.indexOf(id);
    assert.ok(at > prev, `${id} follows the PM cycle order`);
    assert.ok(at < gadfly, `${id} ahead of the Later pile`);
    prev = at;
  }
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(next.indexOf("tropic") > next.indexOf("the-awakening"));
  assert.ok(next.indexOf("there-is-confusion") > next.indexOf("tropic"));
  assert.ok(next.indexOf("miss-lulu-bett") > next.indexOf("there-is-confusion"));
  assert.equal(next.includes("buddenbrooks"), false);
  assert.equal(next.includes("color"), false);
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(forYou!.workIds.at(-20), "there-is-confusion");
  assert.equal(forYou!.workIds.at(-19), "miss-lulu-bett");
  assert.equal(forYou!.workIds.at(-18), "seven-brothers");
  assert.equal(forYou!.workIds.at(-17), "on-the-seaboard");
  assert.equal(forYou!.workIds.at(-16), "bel-ami");
  assert.equal(forYou!.workIds.at(-15), "hadji-murad");
  assert.equal(forYou!.workIds.at(-14), "anandamath");
  assert.equal(forYou!.workIds.at(-13), "thais");
  assert.equal(forYou!.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou!.workIds.at(-2), "generosity");
  assert.equal(sleep!.workIds[0], "quicksand");
});


test("BATCH-4 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-group-of-noble-dames": { opening: "King's-Hintock Court (said the narrator, turning over his memoranda for reference)--King's-Hintock C", breaths: 1152, scenes: 10, gutenberg: 3049 },
    "captain-craig": { opening: "I doubt if ten men in all Tilbury Town Had ever shaken hands with Captain Craig, Or called him by hi", breaths: 258, scenes: 16, gutenberg: 77544 },
    "daniel-deronda": { opening: "Men can do nothing without the make-believe of a beginning. Even science, the strict measurer, is ob", breaths: 4304, scenes: 70, gutenberg: 7469 },
    "day-and-night-stories": { opening: "\"*Je suis la première au rendez-vous. Je vous attends.*\"", breaths: 995, scenes: 15, gutenberg: 45964 },
    "fifty-one-tales": { opening: "Fame singing in the highways, and trifling as she sang, with sordid adventurers, passed the poet by.", breaths: 451, scenes: 49, gutenberg: 7838 },
    "jude-the-obscure": { opening: "The schoolmaster was leaving the village, and everybody seemed sorry.", breaths: 3562, scenes: 53, gutenberg: 153 },
    "les-villes-tentaculaires": { opening: "*Tous les chemins vont vers la ville.*", breaths: 520, scenes: 32, gutenberg: 45590 },
    "neue-gedichte": { opening: "Wie manches Mal durch das noch unbelaubte Gezweig ein Morgen durchsieht, der schon ganz im Frühling", breaths: 344, scenes: 64, gutenberg: 33863 },
    "over-the-brazier": { opening: "The youngest poet down the shelves was fumbling In a dim library, just behind the chair From which t", breaths: 89, scenes: 20, gutenberg: 47144 },
    "rolling-stones": { opening: "[This was the last work of O. Henry. The *Cosmopolitan Magazine* had ordered it from him and, after", breaths: 1496, scenes: 21, gutenberg: 3815 },
    "salammbo": { opening: "It was at Megara, a suburb of Carthage, in the gardens of Hamilcar. The soldiers whom he had command", breaths: 1924, scenes: 15, gutenberg: 1290 },
    "smoke-bellew": { opening: "I.", breaths: 1255, scenes: 6, gutenberg: 1596 },
    "songs-from-vagabondia": { opening: "VAGABONDIA.", breaths: 306, scenes: 7, gutenberg: 18238 },
    "songs-of-childhood": { opening: "As I lay awake in the white moonlight, I heard a sweet singing in the wood-- 'Out of bed, Sleepyhead", breaths: 332, scenes: 43, gutenberg: 23545 },
    "ten-minute-stories": { opening: "At the moorland cross-roads Martin stood examining the sign-post for several minutes in some bewilde", breaths: 833, scenes: 28, gutenberg: 72928 },
    "the-everlasting-mercy": { opening: "From ’41 to ’51 I was my folk’s contrary son; I bit my father’s hand right through And broke my mother’s heart in two.", breaths: 128, scenes: 2, gutenberg: 41467 },
    "the-golden-bowl": { opening: "The Prince had always liked his London, when it had come to him; he was one of the modern Romans who", breaths: 2497, scenes: 42, gutenberg: 4264 },
    "the-rainbow": { opening: "Chapter I. HOW TOM BRANGWEN MARRIED A POLISH LADY", breaths: 4518, scenes: 101, gutenberg: 28948 },
    "the-sword-of-welleran": { opening: "Where the great plain of Tarphet runs up, as the sea in estuaries, among the Cyresian mountains, the", breaths: 434, scenes: 11, gutenberg: 10806 },
    "time-and-the-gods": { opening: "Once when the gods were young and only Their swarthy servant Time was without age, the gods lay slee", breaths: 677, scenes: 20, gutenberg: 8183 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("zuleika-dobson");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.ok(sleep!.workIds.includes(id), id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows Tier A on Next`);
    prev = at;
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "jude-the-obscure",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(opensOnFirstLine(full, want.opening.slice(0, 40)), id);
  }
});


test("BATCH-5 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-changed-man": { opening: "A Committee Man of 'The Terror' Master John Horseleigh, Knight The Duke's Reappearance A Mere Interlude", breaths: 1806, scenes: 11, gutenberg: 3058 },
    "ballads-of-a-bohemian": { opening: "Alas! upon some starry height, The Gods of Excellence to please, This hand of mine will never smite The Harp of High Ser", breaths: 715, scenes: 67, gutenberg: 995 },
    "ballads-of-a-cheechako": { opening: "My rhymes are rough, and often in my rhyming I've drifted, silver-sailed, on seas of dream, Hearing afar the bells of El", breaths: 301, scenes: 20, gutenberg: 259 },
    "crucial-instances": { opening: "Have you ever questioned the long shuttered front of an old Italian house, that motionless mask, smooth, mute, equivocal", breaths: 1090, scenes: 7, gutenberg: 7516 },
    "filipino-popular-tales": { opening: "There was once an old woman who had an only son named Suan.", breaths: 1868, scenes: 82, gutenberg: 8299 },
    "lost-illusions": { opening: "At the time when this story opens, the Stanhope press and the ink-distributing roller were not as yet in general use in ", breaths: 660, scenes: 12, gutenberg: 13159 },
    "mogens": { opening: "SUMMER it was; in the middle of the day; in a corner of the enclosure. Immediately in front of it stood an old oaktree, ", breaths: 477, scenes: 4, gutenberg: 6765 },
    "more-songs-from-vagabondia": { opening: "What is the stir in the street? Hurry of feet! And after, A sound as of pipes and of tabers!", breaths: 385, scenes: 44, gutenberg: 18007 },
    "rhymes-of-a-red-cross-man": { opening: "With flowers of flame festoon the night.", breaths: 354, scenes: 62, gutenberg: 315 },
    "rhymes-of-a-rolling-stone": { opening: "_I sing no idle songs of dalliance days, No dreams Elysian inspire my rhyming; I have no Celia to enchant my lays, No pi", breaths: 348, scenes: 52, gutenberg: 309 },
    "songs-of-travel": { opening: "Give to me the life I love, Let the lave go by me, Give the jolly heaven above And the byway nigh me. Bed in the bush wi", breaths: 147, scenes: 37, gutenberg: 487 },
    "the-faith-of-men": { opening: "I wash my hands of him at the start. I cannot father his tales, nor will I be responsible for them. I make these prelimi", breaths: 781, scenes: 8, gutenberg: 1096 },
    "the-golden-whales-of-california": { opening: "Once, in the city of Kalamazoo, The gods went walking, two and two, With the friendly phœnix, the stars of Orion, The sp", breaths: 431, scenes: 47, gutenberg: 69969 },
    "the-hermit-and-the-wild-woman": { opening: "THE Hermit lived in a cave in the hollow of a hill. Below him was a glen, with a stream in a coppice of oaks and alders,", breaths: 1228, scenes: 7, gutenberg: 4533 },
    "the-princess-casamassima": { opening: "“Oh yes, I dare say I can find the child, if you would like to see him,” Miss Pynsent said; she had a fluttering wish to", breaths: 2952, scenes: 47, gutenberg: 64599 },
    "the-son-of-the-wolf": { opening: "'Carmen won't last more than a couple of days.' Mason spat out a chunk of ice and surveyed the poor animal ruefully, the", breaths: 742, scenes: 9, gutenberg: 2377 },
    "the-stolen-bacillus": { opening: "\"This again,\" said the Bacteriologist, slipping a glass slide under the microscope, \"is a preparation of the celebrated ", breaths: 790, scenes: 15, gutenberg: 12750 },
    "the-tragic-muse": { opening: "The people of France have made it no secret that those of England, as a general thing, are to their perception an inexpr", breaths: 3936, scenes: 51, gutenberg: 20085 },
    "toilers-of-the-sea": { opening: "Christmas Day in the year 182- was somewhat remarkable in the island of Guernsey. Snow fell on that day. In the Channel ", breaths: 3289, scenes: 95, gutenberg: 32338 },
    "toward-the-gulf": { opening: "DEAR OLD DICK THE ROOM OF MIRRORS THE LETTER CANTICLE OF THE RACE BLACK EAGLE RETURNS TO ST. JOE MY LIGHT WITH YOURS THE", breaths: 660, scenes: 43, gutenberg: 7845 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("time-and-the-gods");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.ok(sleep!.workIds.includes(id), id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows BATCH-4 on Next`);
    prev = at;
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "filipino-popular-tales" || id === "toilers-of-the-sea",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(opensOnFirstLine(full, want.opening.slice(0, 40)), id);
  }
});

test("BATCH-8 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-house-of-gentlefolk": { opening: "A bright spring day was fading into evening. High overhead in the clear heavens small rosy clouds se", breaths: 1083, scenes: 45, gutenberg: 5721 },
    "artists-wives": { opening: "*Stretched at full length, on the great divan of a studio, cigar in mouth, two friends--a poet and a", breaths: 337, scenes: 13, gutenberg: 22522 },
    "blix": { opening: "It had just struck nine from the cuckoo clock that hung over the mantelpiece in the dining-room, whe", breaths: 1234, scenes: 14, gutenberg: 401 },
    "emaux-et-camees": { opening: "(1794-1894)", breaths: 675, scenes: 62, gutenberg: 37733 },
    "eves-ransom": { opening: "On the station platform at Dudley Port, in the dusk of a February afternoon, half-a-dozen people wai", breaths: 1861, scenes: 27, gutenberg: 4297 },
    "fraternity": { opening: "In the afternoon of the last day of April, 190--, a billowy sea of little broken clouds crowned the ", breaths: 2812, scenes: 41, gutenberg: 2773 },
    "hania": { opening: "When old Mikolai on his death-bed left Hania to my guardianship and conscience, I was sixteen years of age;", breaths: 1090, scenes: 12, gutenberg: 36583 },
    "indian-summer": { opening: "Midway of the Ponte Vecchio at Florence, where three arches break the lines of the little jewellers'", breaths: 2495, scenes: 24, gutenberg: 7359 },
    "les-heures-claires": { opening: "Tissée en or dans l'air de soie!", breaths: 121, scenes: 30, gutenberg: 10061 },
    "les-trophees": { opening: "À Leconte de L'Isle", breaths: 663, scenes: 81, gutenberg: 14805 },
    "numa-roumestan": { opening: "That Sunday--it was a scorching hot Sunday in July at the time of the yearly competitions for the department--there was a great open-air festival held in the ancient amphitheatre of Aps in Provence.", breaths: 1651, scenes: 20, gutenberg: 69808 },
    "royal-highness": { opening: "The scene is the Albrechtstrasse, the main artery of the capital, which runs from Albrechtsplatz and the Old Schloss to", breaths: 1407, scenes: 10, gutenberg: 36028 },
    "the-emancipated": { opening: "By a window looking from Posillipo upon the Bay of Naples sat an English lady, engaged in letter-wri", breaths: 3897, scenes: 33, gutenberg: 4311 },
    "the-great-hunger": { opening: "For sheer havoc, there is no gale like a good northwester, when it roars in, through the long winter", breaths: 1744, scenes: 27, gutenberg: 2943 },
    "the-patrician": { opening: "Light, entering the vast room—a room so high that its carved ceiling refused itself to exact scrutin", breaths: 2176, scenes: 51, gutenberg: 2774 },
    "the-price-of-love": { opening: "In the evening dimness of old Mrs. Maldon's sitting-room stood the youthful virgin, Rachel Louisa Fl", breaths: 2475, scenes: 19, gutenberg: 12912 },
    "the-private-papers-of-henry-ryecroft": { opening: "I.", breaths: 480, scenes: 4, gutenberg: 1463 },
    "unhuman-tour-kusamakura": { opening: "Climbing the mountain, I was caught up into a train of thought.", breaths: 972, scenes: 13, gutenberg: 73131 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(curatorialTrack("mother"), "later");
  assert.equal(SHELF.find((item) => item.id === "mother")?.local, true);
  let prev = next.indexOf("toward-the-gulf");
  const quiet = next.indexOf("all-quiet-on-the-western-front");
  assert.ok(quiet >= 0 && prev > quiet);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.ok(sleep!.workIds.includes(id), id);
    assert.ok(sleep!.workIds.indexOf(id) > sleep!.workIds.indexOf("all-quiet-on-the-western-front"), id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows BATCH-5 on Next`);
    prev = at;
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "royal-highness" || id === "the-great-hunger" || id === "hania" || id === "numa-roumestan" || id === "indian-summer" || id === "the-emancipated",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(opensOnFirstLine(full, want.opening.slice(0, 40)), id);
  }
});

test("BATCH-9 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-illustre-casa-de-ramires": { opening: "Desde as quatro horas da tarde, no calor e silencio do domingo de Junho, o Fidalgo da Torre, em chin", breaths: 2387, scenes: 12, gutenberg: 23145 },
    "an-iceland-fisherman": { opening: "There they were, five huge, square-built seamen, drinking away together in the dismal cabin, which r", breaths: 952, scenes: 53, gutenberg: 2196 },
    "aphrodite": { opening: "On the quay at Alexandria a singing-girl was standing singing.", breaths: 1727, scenes: 32, gutenberg: 36378 },
    "azul": { opening: "¡Amigo! el cielo está opaco, el aire frío, el día triste. Un cuento alegre.., así como para distraer", breaths: 556, scenes: 38, gutenberg: 52894 },
    "contes-cruels": { opening: "«Le soldat prussien fait son café dans une lanterne sourde.»", breaths: 1882, scenes: 23, gutenberg: 62874 },
    "les-amours-jaunes": { opening: "Un poète ayant rimé, IMPRIMÉ Vit sa Muse dépourvue De marraine, et presque nue: Pas le plus petit mo", breaths: 1005, scenes: 107, gutenberg: 16883 },
    "libro-de-poemas": { opening: "Viento del Sur. Moreno, ardiente, Llegas sobre mi carne, Trayéndome semilla De brillantes Miradas, e", breaths: 609, scenes: 69, gutenberg: 75703 },
    "on-the-eve": { opening: "On one of the hottest days of the summer of 1853, in the shade of a tall lime-tree on the bank of th", breaths: 1251, scenes: 35, gutenberg: 6902 },
    "papeis-avulsos": { opening: "As chronicas da villa de ltaguahy dizem que em tempos remotos vivera alli um certo medico, o Dr. Sim", breaths: 1003, scenes: 11, gutenberg: 57001 },
    "piping-hot": { opening: "In the Rue Neuve-Saint-Augustin, a block of vehicles arrested the cab which was bringing Octave Mour", breaths: 3026, scenes: 18, gutenberg: 54686 },
    "ramuntcho": { opening: "The sad curlews, annunciators of the autumn, had just appeared in a mass in a gray squall, fleeing f", breaths: 894, scenes: 40, gutenberg: 9616 },
    "smoke": { opening: "On the 10th of August 1862, at four o'clock in the afternoon, a great number of people were throngin", breaths: 1238, scenes: 28, gutenberg: 40813 },
    "the-fortune-of-the-rougons": { opening: "On quitting Plassans by the Rome Gate, on the southern side of the town, you will find, on the right", breaths: 1429, scenes: 7, gutenberg: 5135 },
    "the-paying-guest": { opening: "It was Mumford who saw the advertisement and made the suggestion. His wife gave him a startled look.", breaths: 631, scenes: 9, gutenberg: 4298 },
    "the-triumph-of-death": { opening: "When she perceived a group of men leaning against the parapet and looking down into the street below", breaths: 2667, scenes: 43, gutenberg: 54272 },
    "the-witch-and-other-stories": { opening: "IT was approaching nightfall. The sexton, Savely Gykin, was lying in his huge bed in the hut adjoini", breaths: 1584, scenes: 15, gutenberg: 1944 },
    "therese-raquin": { opening: "Au bout de la rue Guénégaud, lorsqu'on vient des quais, on trouve le passage du Pont-Neuf, une sorte", breaths: 972, scenes: 32, gutenberg: 7461 },
    "tradiciones-peruanas": { opening: "Esta tradición no tiene otra fuente de autoridad que el relato del pueblo. Todos la conocen en el Cu", breaths: 1031, scenes: 23, gutenberg: 21282 },
    "watch-and-ward": { opening: "Roger Lawrence had come to town for the express purpose of doing a certain act, but as the hour for ", breaths: 663, scenes: 11, gutenberg: 72355 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("all-quiet-on-the-western-front");
  const sleepAnchor = sleep!.workIds.indexOf("all-quiet-on-the-western-front");
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.ok(sleep!.workIds.includes(id), id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows All Quiet on Next`);
    prev = at;
    assert.ok(sleep!.workIds.indexOf(id) > sleepAnchor, id);
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "an-iceland-fisherman" || id === "ramuntcho" || id === "aphrodite" || id === "smoke",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(opensOnFirstLine(full, want.opening.slice(0, 40)), id);
  }
});


test("BATCH-13 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "siddhartha": { opening: "In the shade of the house, in the sunshine of the riverbank near the boats, in the shade of the Sal-", breaths: 520, scenes: 12, gutenberg: 2500 },
    "faust-part-i": { opening: "Again ye come, ye hovering Forms! I find ye, As early to my clouded sight ye shone! Shall I attempt,", breaths: 1453, scenes: 28, gutenberg: 14591 },
    "the-divine-comedy": { opening: "Midway upon the journey of our life I found myself within a forest dark, For the straightforward pat", breaths: 4821, scenes: 100, gutenberg: 1004 },
    "eugene-onegin": { opening: "“My uncle’s goodness is extreme, If seriously he hath disease; He hath acquired the world’s esteem A", breaths: 530, scenes: 8, gutenberg: 23997 },
    "gilgamesh": { opening: "Gish sought to interpret the dream; Spoke to his mother: \"My mother, during my night I became strong", breaths: 416, scenes: 8, gutenberg: 11000 },
    "bontshe-the-silent": { opening: "Down here, in *this* world, Bontzye Shweig's death made no impression at all. Ask anyone you like wh", breaths: 99, scenes: 1, gutenberg: 37242 },
    "shahnameh": { opening: "O ye, who dwell in Youth's inviting bowers, Waste not, in useless joy, your fleeting hours, But rath", breaths: 118, scenes: 3, gutenberg: 10315 },
    "song-of-songs": { opening: "The scene of this division is in the royal tent of Solomon. The Shulamite, separated from her belove", breaths: 455, scenes: 5, gutenberg: 69329 },
    "baudelaire-prose-and-poetry": { opening: "The Moon, who is caprice itself, looked in through the window when you lay asleep in your cradle, an", breaths: 1124, scenes: 112, gutenberg: 47032 },
    "tales-grotesque-and-curious": { opening: "There was nobody at Ike-no-O who did not know about the nose of Zenchi Naigu. It was five or six inc", breaths: 41, scenes: 1, gutenberg: 78105 },
    "a-book-barnes": { opening: "Toward dusk, in the Summer of the year, a man dressed in a frock coat and top hat, and carrying a ca", breaths: 1635, scenes: 22, gutenberg: 60904 },
    "a-spring-time-case": { opening: "It was around the tolling of the fifth hour in the early evening that a fish monger, of the next str", breaths: 425, scenes: 5, gutenberg: 73132 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 12);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(sleep.workIds[0], "quicksand");
  assert.equal(isEnReadableOff("siddhartha"), false);
  let prev = next.indexOf("weird-tales");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  const sleepPrev = sleep.workIds.indexOf("weird-tales");
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  let sleepAt = sleepPrev;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows All Quiet on Next`);
    prev = at;
    const sit = sleep!.workIds.indexOf(id);
    assert.ok(sit > sleepAt, `${id} follows All Quiet on before-sleep`);
    sleepAt = sit;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening), id);
  }
});


test("BATCH-15 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "rootabaga-stories": { opening: "Gimme the Ax lived in a house where everything is the same as it always was.", breaths: 58, scenes: 1, gutenberg: 27085, scene: "How They Broke Away to Go to the Rootabaga Country" },
    "rootabaga-pigeons": { opening: "Blixie Bimber’s mother was chopping hash. And the hatchet broke. So Blixie started downtown with fif", breaths: 20, scenes: 1, gutenberg: 61553, scene: "The Skyscraper to the Moon" },
    "auguste-rodin": { opening: "Rodin has pronounced Rilke's essay the supreme interpretation of his work. A few years ago the sculp", breaths: 114, scenes: 2, gutenberg: 45605, scene: "Preface" },
    "lucky-pehr": { opening: "*Scene: A Room in the Church Tower.*", breaths: 917, scenes: 5, gutenberg: 8510, scene: "Act I" },
    "the-dream-play": { opening: "*The background represents cloud banks that resemble corroding slate cliffs with ruins of castles and fortresses*.", breaths: 1062, scenes: 2, gutenberg: 45375, scene: "Prologue" },
    "the-father": { opening: "[The sitting room at the Captain's. There is a door a little to the right at the back. In the middle of the room, a large, round table strewn with newspapers and magazines. To righ", breaths: 725, scenes: 3, gutenberg: 8499, scene: "Act I" },
    "easter": { opening: "[Thursday before Easter. The music before curtain is: Haydn: Sieben Worte des Erloesers. Introduction: Maestoso Adagio.]", breaths: 802, scenes: 3, gutenberg: 8500, scene: "Act I" },
    "the-inferno": { opening: "An American critic says \"Strindberg is the greatest subjectivist of all time.\" Certainly neither Aug", breaths: 650, scenes: 17, gutenberg: 44108, scene: "Introduction" },
    "trafalgar": { opening: "I trust that, before relating the important events of which I have been an eye-witness, I may be all", breaths: 556, scenes: 17, gutenberg: 47980, scene: "Chapter I" },
    "saragossa": { opening: "It was, I believe, the evening of the eighteenth when we saw Saragossa in the distance. As we entere", breaths: 1034, scenes: 31, gutenberg: 47769, scene: "Chapter I" },
    "leon-roch": { opening: "“*Ugoibea*, AUGUST 30th.", breaths: 1334, scenes: 32, gutenberg: 48752, scene: "Chapter I" },
    "yiddish-short-stories": { opening: "Somewhere many and many a year ago, a Jew breathed his last.", breaths: 94, scenes: 4, gutenberg: 77680, scene: "The Scales of Justice" },
    "tales-of-old-japan": { opening: "The books which have been written of late years about Japan have either been compiled from official ", breaths: 75, scenes: 2, gutenberg: 13015, scene: "The Forty-seven Rônins" },
    "chinese-literature": { opening: "\"To learn,\" said the Master, \"and then to practise opportunely what one has learnt--does not this br", breaths: 875, scenes: 5, gutenberg: 10056, scene: "Analects · Book I" },
    "the-prose-tales": { opening: "My father, Andrei Petrovitch Grineff, after having served in his youth under Count Münich,[1] quitte", breaths: 1034, scenes: 14, gutenberg: 55219, scene: "Chapter I · The Sergeant of the Guards" },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 15);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(sleep.workIds[0], "quicksand");
  const dante = SHELF.find((item) => item.id === "inferno");
  assert.ok(dante);
  assert.equal(dante.local, undefined);
  assert.equal(dante.gutenberg, undefined);
  assert.equal(next.includes("inferno"), false);
  assert.equal(next.includes("steppenwolf"), false);
  assert.ok(next.indexOf("the-red-room") > next.indexOf("the-comedienne"));
  assert.equal(next.includes("the-queen-of-spades-and-other-stories"), false);
  let prev = next.indexOf("the-lonely-way");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  const sleepPrev = sleep.workIds.indexOf("the-lonely-way");
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  let sleepAt = sleepPrev;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows All Quiet on Next`);
    prev = at;
    const sit = sleep!.workIds.indexOf(id);
    assert.ok(sit > sleepAt, `${id} follows All Quiet on before-sleep`);
    sleepAt = sit;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening), id);
  }
  const inferno = SHELF.find((item) => item.id === "the-inferno");
  assert.equal(inferno?.author.startsWith("August Strindberg"), true);
  assert.equal(inferno?.gutenberg, 44108);
});


test("BATCH-16 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "self-determining-haiti": { opening: "To know the reasons for the present political situation in Haiti, to understand why the United State", breaths: 22, scenes: 1, gutenberg: 35025 },
    "leon-roch-vol-2": { opening: "The crisis through which the house of Telleria was passing remained unsolved. In fact the catastroph", breaths: 1624, scenes: 25, gutenberg: 49272 },
    "miss-julia": { opening: "(A large kitchen: the ceiling and the side walls are hidden by draperies and hangings. The rear wall runs diagonally across the stage, from the left side and away from the spectato", breaths: 612, scenes: 3, gutenberg: 14347 },
    "in-midsummer-days": { opening: "In Midsummer days when in the countries of the North the earth is a bride, when the ground is full o", breaths: 78, scenes: 1, gutenberg: 6694 },
    "the-chinese-fairy-book": { opening: "Once upon a time there were two brothers, who lived in the same house. And the big brother listened ", breaths: 19, scenes: 1, gutenberg: 29939 },
    "japanese-fairy-world": { opening: "One of the greatest days in the calendar of old Japan was the seventh of July; or, as the Japanese p", breaths: 8, scenes: 1, gutenberg: 29337 },
    "japanese-literature": { opening: "In the reign of a certain Emperor, whose name is unknown to us, there was, among the Niogo[76] and K", breaths: 104, scenes: 1, gutenberg: 19264 },
    "romances-of-old-japan": { opening: "His old widowed mother would not die happy unless he were rehabilitated, and to this end he knew tha", breaths: 327, scenes: 1, gutenberg: 45933 },
    "warriors-of-old-japan": { opening: "Long, long ago there lived in Japan a man named Hachiro Tametomo, who became famous as the most skil", breaths: 58, scenes: 1, gutenberg: 41437 },
    "a-history-of-chinese-literature": { opening: "The date of the beginning of all things has been nicely calculated by Chinese chronologers. There wa", breaths: 9, scenes: 1, gutenberg: 43711 },
    "the-civilization-of-china": { opening: "It is a very common thing now-a-days to meet people who are going to \"China,\" which can be reached b", breaths: 35, scenes: 1, gutenberg: 2076 },
    "kimiko": { opening: "The name is on a paper-lantern at the entrance of a house in the Street of the Geisha.", breaths: 33, scenes: 5, gutenberg: 41579 },
    "glimpses-of-unfamiliar-japan": { opening: "'Do not fail to write down your first impressions as soon as possible,' said a kind English professo", breaths: 93, scenes: 1, gutenberg: 8130 },
    "hebrew-literature": { opening: "1. “From what time do we recite the Shemah(8) in the evening?” “From the hour the priests(9) enter (", breaths: 56, scenes: 1, gutenberg: 28369 },
    "the-history-of-yiddish-literature": { opening: "The literatures of the early Middle Ages were bilingual. The Catholic religion had brought with it t", breaths: 11, scenes: 1, gutenberg: 46729 },
    "korean-folk-tales": { opening: "In the days of King Sung-jong (A.D. 1488-1495) one of Korea's noted men became governor of Pyong-an ", breaths: 29, scenes: 1, gutenberg: 51002 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 16);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(sleep.workIds[0], "quicksand");
  for (const held of [
    "fifty-years-other-poems",
    "japanese-fairy-tales",
    "some-chinese-ghosts",
    "shadowings",
  ]) {
    assert.equal(next.includes(held), false, held);
    assert.equal(curatorialTrack(held), "later", held);
  }
  let prev = next.indexOf("the-prose-tales");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  const sleepPrev = sleep.workIds.indexOf("the-prose-tales");
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  let sleepAt = sleepPrev;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows All Quiet on Next`);
    prev = at;
    const sit = sleep!.workIds.indexOf(id);
    assert.ok(sit > sleepAt, `${id} follows All Quiet on before-sleep`);
    sleepAt = sit;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening), id);
  }
});

test("EXTRACTABLE-8 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "smoke-and-steel": {
      opening: "SMOKE of the fields in spring is one,",
      breaths: 2064,
      scenes: 201,
      scene: "Smoke and Steel",
    },
    "gods-trombones": {
      opening:
        "O Lord, we come this morning Knee-bowed and body-bent Before thy throne of grace. O Lord—this morning— Bow our hearts be",
      breaths: 147,
      scenes: 8,
      scene: "Listen, Lord—A Prayer",
    },
    layla: {
      opening:
        "Its power, its wond'rous power, in me. — No ancestors have I to boast ; The trace of my descent is lost. From Adam what ",
      breaths: 1345,
      scenes: 14,
      scene: "Invocation",
    },
    conference: {
      opening: "Once on a time from all the Circles seven",
      breaths: 1023,
      scenes: 35,
      scene: "Bird Parliament · Opening",
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 4);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(sleep.workIds[0], "quicksand");
  assert.equal(next.includes("the-poison-tree"), true);
  assert.equal(next.includes("anandamath"), false);
  assert.equal(forYou.workIds.includes("anandamath"), true);
  const stub = SHELF.find((item) => item.id === "god-s-trombones");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.equal(stub.gutenberg, undefined);
  let prev = next.indexOf("korean-folk-tales");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  const sleepPrev = sleep.workIds.indexOf("korean-folk-tales");
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  let sleepAt = sleepPrev;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.gutenberg, undefined, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.language, "English", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows All Quiet on Next`);
    prev = at;
    const sit = sleep!.workIds.indexOf(id);
    assert.ok(sit > sleepAt, `${id} follows All Quiet on before-sleep`);
    sleepAt = sit;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      title: string;
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening), id);
    assert.equal(JSON.stringify(full).includes("gutenberg.org"), false, id);
  }
  const birds = SHELF.find((item) => item.id === "conference");
  assert.match(birds?.title ?? "", /abridged/i);
  const abbey = SHELF.find((item) => item.id === "anandamath");
  assert.match(abbey?.title ?? "", /Abbey of Bliss/);
  assert.equal(abbey?.year, 1906);
});

test("Mira 8AM CLEAR ×5 are Recommend-only local binds, never Featured", () => {
  const nextExpect = {
    "gentlemen-prefer-blondes": {
      opening: "March 16th:",
      breaths: 280,
      scenes: 6,
      gutenberg: 66829,
      scene: "Chapter I",
    },
    "of-one-blood": {
      opening:
        "The recitations were over for the day. It was the first week in November and it had rained about eve",
      breaths: 1079,
      scenes: 24,
      gutenberg: 69255,
      scene: "Chapter I",
    },
    "maria-chapdelaine": {
      opening:
        "The door opened, and the men of the congregation began to come out of the church at Peribonka.",
      breaths: 762,
      scenes: 16,
      gutenberg: 4383,
      scene: "Chapter I · Peribonka",
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.ok(waking);
  assert.ok(walk);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(sleep.workIds[0], "quicksand");
  assert.equal(FEATURED_CAROUSEL_IDS.includes("gentlemen-prefer-blondes"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("lady-into-fox"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("seven-brothers"), false);
  assert.equal(next.includes("lady-into-fox"), false);
  assert.equal(next.includes("seven-brothers"), true);
  assert.equal(forYou.workIds.includes("lady-into-fox"), false);
  assert.equal(forYou.workIds.includes("gentlemen-prefer-blondes"), false);
  assert.equal(forYou.workIds.includes("seven-brothers"), true);
  assert.equal(curatorialTrack("seven-brothers"), "next");
  assert.equal(curatorialTrack("lady-into-fox"), "later");
  assert.ok(waking.workIds.includes("seven-brothers"));
  assert.ok(walk.workIds.includes("seven-brothers"));
  assert.equal(sleep.workIds.includes("seven-brothers"), true);
  assert.ok(sleep.workIds.includes("lady-into-fox"));
  let prev = next.indexOf("conference");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  let sleepAt = sleep.workIds.indexOf("conference");
  assert.ok(sleepAt > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  for (const [id, want] of Object.entries(nextExpect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(work!.language, "English", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows EXTRACTABLE-8 on Next`);
    prev = at;
    const sit = sleep!.workIds.indexOf(id);
    assert.ok(sit > sleepAt, `${id} follows EXTRACTABLE-8 on before-sleep`);
    sleepAt = sit;
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "maria-chapdelaine",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
      note?: string;
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening), id);
    assert.equal(JSON.stringify(full).includes("gutenberg.org"), false, id);
  }
  assert.equal(next.indexOf("gentlemen-prefer-blondes") < next.indexOf("of-one-blood"), true);
  assert.equal(next.indexOf("of-one-blood") < next.indexOf("maria-chapdelaine"), true);
  const maria = SHELF.find((item) => item.id === "maria-chapdelaine");
  assert.equal(maria?.gutenberg, 4383);
  assert.match(maria?.author ?? "", /Blake/);
  assert.equal(maria?.language, "English");
  const fox = SHELF.find((item) => item.id === "lady-into-fox");
  assert.ok(fox);
  assert.equal(fox!.local, true);
  assert.equal(fox!.gutenberg, 10337);
  assert.equal(fox!.breaths, 289);
  assert.equal(fox!.opening, "Wonderful or supernatural events are not so uncommon, rather they are irregular in their incidence. ");
  const foxFull = JSON.parse(readFileSync(new URL("./texts/lady-into-fox.json", import.meta.url), "utf8")) as {
    scenes: unknown[];
    breaths: { text: string }[];
  };
  assert.equal(foxFull.scenes.length, 8);
  assert.equal(foxFull.breaths.length, 289);
  assert.ok(foxFull.breaths[0]?.text.startsWith(fox!.opening ?? ""));
  const brothers = SHELF.find((item) => item.id === "seven-brothers");
  assert.ok(brothers);
  assert.equal(brothers!.gutenberg, 79566);
  assert.equal(brothers!.breaths, 2686);
  assert.match(brothers!.author, /Matson/);
  const brothersFull = JSON.parse(
    readFileSync(new URL("./texts/seven-brothers.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(brothersFull.breaths.length, 2686);
  assert.ok(brothersFull.breaths[0]?.text.startsWith(brothers!.opening ?? ""));
});

test("Generosity by Amber Later is For you only, never Featured", () => {
  const id = "generosity";
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work!.title, "Generosity");
  assert.equal(work!.author, "Amber Later");
  assert.equal(work!.local, true);
  assert.equal(work!.rights, "tbr");
  assert.equal(work!.gutenberg, undefined);
  assert.equal(work!.language, "English");
  assert.equal(work!.opening, "I should apologize.");
  assert.equal(work!.minutes, 33);
  assert.equal(work!.breaths, 85);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false);
  assert.equal(curatorialTrack(id), "later");
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false);
  assert.equal(isAdaptedBySalon(id), false);
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.deepEqual(forYou!.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(forYou!.workIds.includes(id), true);
  assert.equal(forYou!.workIds.at(-2), id);
  assert.equal(sleep!.workIds.includes(id), false);
  assert.equal(sleep!.workIds[0], "quicksand");
  assert.equal(existsSync(new URL("./openings/generosity.json", import.meta.url)), false);
  const full = JSON.parse(readFileSync(new URL("./texts/generosity.json", import.meta.url), "utf8")) as {
    rights?: string;
    source?: string;
    minutes?: number;
    scenes: { id: string; title: string; reentry: string }[];
    breaths: { text: string; sceneId: string }[];
    note?: string;
  };
  assert.equal(full.rights, undefined);
  assert.equal(full.source, undefined);
  assert.equal(full.minutes, 33);
  assert.equal(full.scenes.length, 8);
  assert.equal(full.scenes[0]?.title, "Generosity");
  assert.deepEqual(
    full.scenes.slice(1).map((scene) => scene.title),
    ["Poem I", "Poem II", "Poem III", "Poem IV", "Poem V", "Poem VI", "Poem VII"],
  );
  assert.equal(full.breaths.length, 85);
  assert.equal(full.breaths[0]?.text, "I should apologize.");
  const story = full.breaths.filter((breath) => breath.sceneId === "s0");
  assert.equal(story.at(-1)?.text, "I'm sorry.");
  assert.equal(full.breaths.filter((breath) => breath.text === "***").length, 0);
  assert.equal(full.scenes[1]?.reentry.startsWith("Without walls between rooms we slept in beds unseparated"), true);
  assert.equal(full.scenes[2]?.reentry.startsWith("Nighttime rain sluiced in the maze of your astounding mimicry."), true);
  assert.equal(full.scenes[7]?.reentry.startsWith("Moment of culture I remember falling on your lap"), true);
  assert.equal(
    full.breaths.at(-1)?.text.endsWith("Your lap and then it is absence I."),
    true,
  );
  assert.ok(full.breaths.some((breath) => breath.text === '"They all look the same, why this one?"'));
  assert.equal(JSON.stringify(full).includes("gutenberg.org"), false);
  assert.equal(/public domain|Project Gutenberg/i.test(full.note ?? ""), false);
  assert.equal(full.breaths.some((breath) => /^[A-Z][a-z]+: /.test(breath.text)), false);
});

test("Locked recommend five stay findable on ritual lanes, not a homepage rail", () => {
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  assert.ok(waking?.workIds.includes("enchanted-april"));
  assert.ok(unwind?.workIds.includes("the-bridge-of-san-luis-rey"));
  assert.ok(unwind?.workIds.includes("mr-fortunes-maggot"));
  assert.ok(unwind?.workIds.includes("the-house-of-mirth"));
  assert.ok(sleep?.workIds.includes("quicksand"));
  for (const id of FEATURED_CAROUSEL_IDS) {
    assert.equal(curatorialTrack(id), "featured", id);
  }
});

test("BATCH-11 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "ubirajara": { opening: "Pela marjem do grande rio caminha Jaguar\u00ea, o joven ca\u00e7ador.", breaths: 985, scenes: 9, gutenberg: 38496 },
    "cecilia": { opening: "*Tal es el fruto de la culpa, Tello, cosecha de dolor.*", breaths: 3963, scenes: 45, gutenberg: 28281 },
    "la-regenta": { opening: "La heroica ciudad dorm\u00eda la siesta. El viento Sur, caliente y perezoso, empujaba las nubes blanqueci", breaths: 5902, scenes: 30, gutenberg: 17073 },
    "los-pazos-de-ulloa": { opening: "Por m\u00e1s que el jinete trataba de sofrenarlo agarr\u00e1ndose con todas sus fuerzas a la \u00fanica rienda de c", breaths: 1293, scenes: 30, gutenberg: 18005 },
    "nazarin": { opening: "A un periodista de los de nuevo cu\u00f1o, de estos que designamos con el ex\u00f3tico nombre de *reporter*, d", breaths: 1162, scenes: 35, gutenberg: 73322 },
    "the-octopus": { opening: "Just after passing Caraher's saloon, on the County Road that ran south from Bonneville, and that div", breaths: 3563, scenes: 15, gutenberg: 268 },
    "the-red-and-the-black": { opening: "Put thousands together less bad, But the cage less gay.--*Hobbes*.", breaths: 3449, scenes: 74, gutenberg: 44747 },
    "alcools": { opening: "\u00c0 la fin tu es las de ce monde ancien", breaths: 542, scenes: 44, gutenberg: 15462 },
    "petersburg": { opening: "Apollon Apollonowitsch Ableuchow war von h\u00f6chst w\u00fcrdiger Abstammung: er hatte Adam zum Vorfahren geh", breaths: 4563, scenes: 8, gutenberg: 39919 },
    "st-peter-s-umbrella": { opening: "LITTLE VERONICA IS TAKEN AWAY.", breaths: 1856, scenes: 17, gutenberg: 31945 },
    "caesar-or-nothing": { opening: "*MARSEILLES!*", breaths: 3586, scenes: 46, gutenberg: 8444 },
    "calligrammes": { opening: "Comme c'\u00e9tait la veille du quatorze juillet Vers les quatre heures de l'apr\u00e8s-midi Je descendis dans", breaths: 424, scenes: 15, gutenberg: 55569 },
    "martin-fierro": { opening: "1 Aqu\u00ed me pongo a cantar Al comp\u00e1s de la vig\u00fcela, Que el hombre que lo desvela Una pena estraordinar", breaths: 395, scenes: 12, gutenberg: 14765 },
    "the-complete-original-short-stories": { opening: "For several days in succession fragments of a defeated army had passed through the town. They were m", breaths: 13590, scenes: 186, gutenberg: 3090 },
    "the-cabin": { opening: "The vast plain stretched out under the blue splendour of dawn, a broad sash of light which appeared ", breaths: 1205, scenes: 10, gutenberg: 38165 },
    "les-chants-de-maldoror": { opening: "Pl\u00fbt au ciel que le lecteur, enhardi et devenu momentan\u00e9ment f\u00e9roce comme ce qu'il lit, trouve, sans", breaths: 189, scenes: 6, gutenberg: 12005 },
    "pan-tadeusz": { opening: "GOSPODARSTWO.", breaths: 424, scenes: 5, gutenberg: 31536 },
    "the-red-laugh": { opening: "..... Horror and madness.", breaths: 459, scenes: 19, gutenberg: 62460 },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 18);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.equal(sleep.workIds[0], "quicksand");
  let prev = next.indexOf("unhuman-tour-kusamakura");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  const sleepPrev = sleep.workIds.indexOf("unhuman-tour-kusamakura");
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  let sleepAt = sleepPrev;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, `${id} follows All Quiet on Next`);
    prev = at;
    const sit = sleep!.workIds.indexOf(id);
    assert.ok(sit > sleepAt, `${id} follows All Quiet on before-sleep`);
    sleepAt = sit;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening), id);
  }
  for (const held of ["three-hundred-tang-poems", "the-bronze-horseman"]) {
    const work = SHELF.find((item) => item.id === held);
    assert.ok(work, held);
    assert.equal(work!.local, undefined, held);
    assert.equal(isBoundLocal(work!), false, held);
    assert.equal(next.includes(held), false, held);
    assert.equal(existsSync(new URL(`./texts/${held}.json`, import.meta.url)), false, held);
  }
});

test("BATCH-10 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "before-adam": { opening: "Pictures! Pictures! Pictures! Often, before I learned, did I wonder whence came the multitudes of pictures that thronged", breaths: 423, scenes: 18, gutenberg: 310, scene: "Chapter I" },
    "bruges-la-morte": { opening: "Hugues recommençait chaque soir le même itinéraire, suivant la ligne des quais, d'une marche indécise, un peu voûté déjà", breaths: 400, scenes: 14, gutenberg: 14911, scene: "Chapter II · Hugues recommençait chaque soir le même itinéraire, suivant la" },
    "casmurro": { opening: "Do titulo.", breaths: 1631, scenes: 90, gutenberg: 55752, scene: "Chapter I" },
    "les-civilises": { opening: "«Cap'taine Torral,» grogna Mévil à ses coureurs en redescendant.", breaths: 1844, scenes: 35, gutenberg: 47712, scene: "Chapter II" },
    "ein-landarzt": { opening: "Wir haben einen neuen Advokaten, den Dr. Bucephalus. In seinem Äußern erinnert wenig an die Zeit, da er noch Streitroß A", breaths: 120, scenes: 14, gutenberg: 21989, scene: "Der neue Advokat" },
    "hien-le-maboul": { opening: "Le clairon traversa la route, s’avança jusqu’au bord de la digue de pierres sèches et sonna le réveil. Les notes alertes", breaths: 1177, scenes: 22, gutenberg: 68588, scene: "Chapter II · Le clairon traversa la route, s’avança jusqu’au bord de la digue de" },
    "knulp": { opening: "Anfang der neunziger Jahre mußte unser Freund Knulp einmal mehrere Wochen im Spital liegen, und als er entlassen wurde, ", breaths: 648, scenes: 3, gutenberg: 17622, scene: "Vorfrühling" },
    "iracema": { opening: "Iracema passou entre as arvores, silenciosa como uma sombra: seu olhar scintillante coava entre as folhas, quaes frouxos", breaths: 968, scenes: 27, gutenberg: 67740, scene: "Chapter VII" },
    "tristana": { opening: "Resignada en absoluto no, porque más de una vez, en aquel año que precedió a lo que se va a referir, la linda figurilla ", breaths: 627, scenes: 28, gutenberg: 66979, scene: "Chapter II · Resignada en absoluto no, porque más de una vez, en aquel año que" },
    "niels": { opening: "She had the black, luminous eyes of the Blid family with delicate, straight eyebrows; she had their boldly shaped nose, ", breaths: 933, scenes: 14, gutenberg: 55389, scene: "Chapter I" },
    "amor-de-perdicao": { opening: "Domingos José Correia Botelho de Mesquita e Menezes, fidalgo de linhagem, e um dos mais antigos solarengos de Villa Real", breaths: 1569, scenes: 19, gutenberg: 16425, scene: "Part 1 · Chapter I" },
    "das-stunden-buch": { opening: "Da neigt sich die Stunde und rührt mich an mit klarem metallenem Schlag: mir zittern die Sinne.", breaths: 429, scenes: 309, gutenberg: 24288, scene: "Book I · Das Stunden-Buch" },
    "misericordia": { opening: "Dos caras, como algunas personas, tiene la parroquia de San Sebastián... mejor será decir la iglesia... dos caras que se", breaths: 1500, scenes: 40, gutenberg: 21831, scene: "Chapter I" },
    "the-mandarin": { opening: "Decorreu um mez.", breaths: 359, scenes: 7, gutenberg: 16384, scene: "Chapter II" },
    "policarpo": { opening: "Como de habito, Polycarpo Quaresma, mais conhecido por major Quaresma, bateu em casa ás 4 e 15 da tarde. Havia mais de v", breaths: 1966, scenes: 15, gutenberg: 67535, scene: "Part I · Chapter I · A Lição De Violão" },
    "quincas": { opening: "Rubião fitava a enseada,--eram oito horas da manhã. Quem o visse, com os polegares mettidos no cordão do chambre, á jane", breaths: 1829, scenes: 201, gutenberg: 55682, scene: "Chapter I" },
    "marianela": { opening: "The sun had set. After the brief interval of twilight the night fell calm and dark, and in its gloomy bosom the last sounds of a sleepy world died gently away. The traveller went forward on his way, hastening his step as night came on; the path he followed was narrow and worn by the constant tread of men and beasts, and led gently up a hill on whose verdant slopes grew picturesque clumps of wild cherry trees, beeches and oaks.--The reader perceives that we are in the north of Spain.", breaths: 1138, scenes: 22, gutenberg: 48818, scene: "Chapter I · Gone Astray" },
    "pepita-jimenez": { opening: "*22 de Marzo*.", breaths: 850, scenes: 3, gutenberg: 17223, scene: "Chapter I · Cartas de mi sobrino" },
  } as const;
  assert.equal(Object.keys(expect).length, 18);
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep && forYou);
  assert.deepEqual(forYou.workIds.slice(0, 3), ["the-house-of-mirth","quicksand","botchan"]);
  const inferno = SHELF.find((item) => item.id === "inferno");
  assert.ok(inferno && inferno.local !== true && inferno.gutenberg === undefined);
  assert.equal(next.includes("inferno"), false);
  let prev = next.indexOf("the-red-laugh");
  let sleepPrev = sleep.workIds.indexOf("the-red-laugh");
  const quiet = next.indexOf("all-quiet-on-the-western-front");
  assert.ok(quiet >= 0 && prev > quiet && sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work && work.local === true && isBoundLocal(work), id);
    assert.equal(work.opening, want.opening, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(forYou.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > prev, id);
    prev = at;
    const sleepAt = sleep.workIds.indexOf(id);
    assert.ok(sleepAt > sleepPrev, id);
    sleepPrev = sleepAt;
    assert.equal(
      existsSync(new URL("./openings/" + id + ".json", import.meta.url)),
      id === "marianela",
      id,
    );
    const full = JSON.parse(readFileSync(new URL("./texts/" + id + ".json", import.meta.url), "utf8"));
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.ok(opensOnFirstLine(full, want.opening), id);
  }
  const french = SHELF.find((item) => item.id === "meaulnes");
  assert.ok(french);
  assert.equal(french.local, true);
  assert.equal(french.language, "French");
  assert.equal(french.gutenberg, 5781);
  assert.equal(french.opening, "Il arriva chez nous un dimanche de novembre 189...");
  assert.equal(french.breaths, 1486);
  assert.equal(next.includes("meaulnes"), false);
  assert.equal(forYou.workIds.includes("meaulnes"), false);
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("meaulnes"), false, lane.id);
  }
  assert.equal(existsSync(new URL("./openings/meaulnes.json", import.meta.url)), false);
  assert.equal(existsSync(new URL("./texts/meaulnes.json", import.meta.url)), true);
});

test("BATCH-12 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "bay-a-book-of-poems": {
      opening: "SHADES SHALL I tell you, then, how it is?--",
      breaths: 178,
      scenes: 6,
      gutenberg: 22734,
    },
    "black-spirits-and-white-a-book-of-ghost-stories": {
      opening:
        "When in May, 1886, I found myself at last in Paris, I naturally determined to throw myself on the charity of an old chum of mine, Eugene Marie d'Ardeche, who had forsaken Boston a year or more ago on receiving word of th",
      breaths: 1058,
      scenes: 30,
      gutenberg: 26687,
    },
    "fir-flower-tablets": {
      opening:
        "Alas! Alas! The danger! The steepness! O Affliction! The Shu Road is as perilous and difficult as the way to the Green H",
      breaths: 281,
      scenes: 112,
      gutenberg: 48222,
    },
    "hugh-selwyn-mauberley": {
      opening:
        'FOR three years, out of key with his time, He strove to resuscitate the dead art Of poetry; to maintain "the sublime" In the old sense.',
      breaths: 88,
      scenes: 11,
      gutenberg: 23538,
    },
    "os-lusiadas": {
      opening:
        "1 As armas e os barões assinalados, Que da ocidental praia Lusitana, Por mares nunca de antes navegados, Passaram ainda ",
      breaths: 1104,
      scenes: 10,
      gutenberg: 3333,
    },
    "the-black-monk-and-other-stories": {
      opening:
        "Andrei Vasilyevitch Kovrin, Magister, had worn himself out, and unsettled his nerves. He made no effort to undergo regul",
      breaths: 1189,
      scenes: 11,
      gutenberg: 55307,
    },
    "the-heart-of-happy-hollow": {
      opening:
        "The law is usually supposed to be a stern mistress, not to be lightly wooed, and yielding only to the most ardent pursuit.",
      breaths: 2557,
      scenes: 2,
      gutenberg: 24716,
    },
    "the-hesperides-and-noble-numbers": {
      opening:
        "I sing of brooks, of blossoms, birds and bowers, Of April, May, of June and July-flowers; I sing of May-poles, hock-carts, wassails, wakes, Of bridegrooms, brides and of their bridal cakes; I write of youth, of love, and",
      breaths: 6846,
      scenes: 504,
      gutenberg: 22421,
    },
    "the-horse-stealers-and-other-stories": {
      opening:
        "A HOSPITAL assistant, called Yergunov, an empty-headed fellow, known throughout the district as a great braggart and dru",
      breaths: 1447,
      scenes: 22,
      gutenberg: 13409,
    },
    "the-mystery-of-choice": {
      opening: "The Purple Emperor watched me in silence.",
      breaths: 3855,
      scenes: 36,
      gutenberg: 46581,
    },
    "the-poems-of-emma-lazarus-volume-1": {
      opening:
        "Sweet empty sky of June without a stain, Faint, gray-blue dewy mists on far-off hills, Warm, yellow sunlight flooding mead and plain, That each dark copse and hollow overfills; The rippling laugh of unseen, rain-fed rill",
      breaths: 2972,
      scenes: 55,
      gutenberg: 3295,
    },
    "weird-tales": {
      opening:
        "Councillor Krespel was one of the strangest, oddest men I ever met with in my life. When I went to live in H---- for a t",
      breaths: 649,
      scenes: 6,
      gutenberg: 31377,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 12);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("watch-and-ward");
  let sleepPrev = sleep.workIds.indexOf("watch-and-ward");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > next.indexOf("all-quiet-on-the-western-front"), `${id} follows All Quiet on Next`);
    assert.ok(at > prev, `${id} follows BATCH-9 on Next`);
    prev = at;
    const sleepAt = sleep.workIds.indexOf(id);
    assert.ok(sleepAt > sleep.workIds.indexOf("all-quiet-on-the-western-front"), `${id} follows All Quiet before sleep`);
    assert.ok(sleepAt > sleepPrev, `${id} follows BATCH-9 before sleep`);
    sleepPrev = sleepAt;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(opensOnFirstLine(full, want.opening), id);
  }
});

test("BATCH-14 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "jewish-children": {
      opening: "Busie is a name; it is the short for Esther-Liba: Libusa: Busie. She is a year older than I, perhaps two years. And both of us together are no more than twenty ",
      breaths: 1432,
      scenes: 19,
      gutenberg: 27001,
    },
    "essays-and-soliloquies": {
      opening: "No writer ever stood less in need of an introduction than Miguel de Unamuno, for probably none ever revealed himself so naturally and so nakedly in his writings",
      breaths: 732,
      scenes: 21,
      gutenberg: 71260,
    },
    "tragic-sense-of-life": {
      opening: "*Homo sum; nihil humani a me alienum puto*, said the Latin playwright. And I would rather say, *Nullum hominem a me alienum puto*: I am a man; no other man do I",
      breaths: 1080,
      scenes: 12,
      gutenberg: 14636,
    },
    "white-buildings": {
      opening: "As silent as a mirror is believed Realities plunge in silence by....",
      breaths: 158,
      scenes: 23,
      gutenberg: 77837,
    },
    "three-plays": {
      opening: "*N.B. The Comedy is without acts or scenes. The performance is interrupted once, without the curtain being lowered, when the manager and the chief characters wi",
      breaths: 2733,
      scenes: 9,
      gutenberg: 42148,
    },
    "the-sweet-miracle": {
      opening: "luminous margins of the Lake of Tiberias; but the news of his miracles had already penetrated as far as Enganim, a rich city of strong battlements set among vin",
      breaths: 16,
      scenes: 1,
      gutenberg: 74802,
    },
    "red-oleanders": {
      opening: "*The Curtain rises on a window covered by a network of intricate pattern in front of the Palace.*",
      breaths: 1724,
      scenes: 50,
      gutenberg: 77892,
    },
    "stories-from-tagore": {
      opening: "My five years' old daughter Mini cannot live without chattering. I really believe that in all her life she has not wasted a minute in silence. Her mother is oft",
      breaths: 1030,
      scenes: 10,
      gutenberg: 33525,
    },
    "the-fugitive": {
      opening: "Darkly you sweep on, Eternal Fugitive, round whose bodiless rush stagnant space frets into eddying bubbles of light.",
      breaths: 930,
      scenes: 6,
      gutenberg: 7971,
    },
    "nationalism": {
      opening: "Man's history is being shaped according to the difficulties it encounters. These have offered us problems and claimed their solutions from us, the penalty of no",
      breaths: 181,
      scenes: 4,
      gutenberg: 40766,
    },
    "the-cycle-of-spring": {
      opening: "*The stage is on two levels: the higher, at the back, for the Song-preludes alone, concealed by a purple curtain; the lower only being discovered when the drop ",
      breaths: 1070,
      scenes: 5,
      gutenberg: 24607,
    },
    "creative-unity": {
      opening: "Civility is beauty of behaviour. It requires for its perfection patience, self-control, and an environment of leisure. For genuine courtesy is a creation, like ",
      breaths: 428,
      scenes: 10,
      gutenberg: 23136,
    },
    "the-lonely-way": {
      opening: "*The little garden attached to Professor Wegrat's house. It is almost surrounded by buildings, so that no outlook of any kind is to be had. At the right in the ",
      breaths: 2743,
      scenes: 12,
      gutenberg: 29745,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 13);
  assert.deepEqual(forYou.workIds.slice(0, 3), [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  let prev = next.indexOf("a-spring-time-case");
  let sleepPrev = sleep.workIds.indexOf("a-spring-time-case");
  assert.ok(prev > next.indexOf("all-quiet-on-the-western-front"));
  assert.ok(sleepPrev > sleep.workIds.indexOf("all-quiet-on-the-western-front"));
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.opening, want.opening, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou.workIds.includes(id), false, id);
    const at = next.indexOf(id);
    assert.ok(at > next.indexOf("all-quiet-on-the-western-front"), `${id} follows All Quiet on Next`);
    assert.ok(at > prev, `${id} follows BATCH-13 on Next`);
    prev = at;
    const sleepAt = sleep.workIds.indexOf(id);
    assert.ok(sleepAt > sleep.workIds.indexOf("all-quiet-on-the-western-front"), `${id} follows All Quiet before sleep`);
    assert.ok(sleepAt > sleepPrev, `${id} follows BATCH-13 before sleep`);
    sleepPrev = sleepAt;
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(opensOnFirstLine(full, want.opening), id);
  }
  const bertha = SHELF.find((item) => item.id === "bertha-garlan");
  assert.ok(bertha);
  assert.equal(bertha.local, true);
  assert.equal(bertha.breaths, 1269);
  assert.equal(bertha.gutenberg, 9955);
  assert.equal(bertha.opening, "She was walking slowly down the hill; not by the broad high road which wound its way towards the town, but by the narrow footpath between the trellises of the v");
  assert.equal(curatorialTrack("bertha-garlan"), "next");
  assert.equal(FEATURED_CAROUSEL_IDS.includes("bertha-garlan"), false);
  assert.equal(forYou.workIds.includes("bertha-garlan"), true);
  assert.ok(sleep.workIds.includes("bertha-garlan"));
  const berthaFull = JSON.parse(readFileSync(new URL("./texts/bertha-garlan.json", import.meta.url), "utf8")) as {
    scenes: { title: string }[];
    breaths: { text: string }[];
  };
  assert.equal(berthaFull.scenes.length, 11);
  assert.equal(berthaFull.breaths.length, 1269);
  assert.equal(berthaFull.scenes[0]?.title, "Chapter I");
  assert.ok((berthaFull.breaths[0]?.text ?? "").startsWith(bertha.opening ?? ""));
});

test("Mira NOON CLEAR sits on Next, For you, and Rituals, never Featured", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const rituals = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  for (const id of ["the-hidden-force", "the-immoralist", "high-wind-jamaica"]) {
    assert.equal(next.includes(id), true, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(next.includes("futility"), true);
  assert.equal(forYou?.workIds.includes("futility"), false);
  assert.equal(featured.includes("futility"), false);
  assert.equal(rituals?.workIds.includes("casanovas-homecoming"), true);
  assert.equal(next.includes("casanovas-homecoming"), true);
  assert.equal(forYou?.workIds.includes("casanovas-homecoming"), false);
  assert.equal(featured.includes("casanovas-homecoming"), false);
  const hidden = SHELF.find((item) => item.id === "the-hidden-force");
  assert.match(hidden?.opening ?? "", /^The full moon wore the hue of tragedy/);
  assert.equal(hidden?.breaths, 1323);
  assert.equal(hidden?.local, true);
  assert.equal(hidden?.gutenberg, 34725);
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
});

test("Mira NOON2 CLEAR sits on Next and For you, never Featured", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], cold);
  assert.equal(sleep?.workIds[0], "quicksand");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou?.workIds.at(-13), "thais");
  assert.equal(forYou?.workIds.at(-14), "anandamath");
  assert.equal(forYou?.workIds.at(-15), "hadji-murad");
  assert.equal(forYou?.workIds.at(-16), "bel-ami");
  assert.equal(forYou?.workIds.at(-17), "on-the-seaboard");

  const farm = SHELF.find((item) => item.id === "african-farm");
  assert.ok(farm);
  assert.equal(farm.local, true);
  assert.equal(farm.gutenberg, 1441);
  assert.equal(farm.breaths, 6189);
  assert.equal(farm.minutes, 1254);
  assert.equal(
    farm.opening,
    "The full African moon poured down its light from the blue sky into the wide, lonely plain.",
  );
  assert.ok(next.indexOf("african-farm") > next.indexOf("maria-chapdelaine"));
  assert.equal(next[next.indexOf("african-farm") + 1], "a-passage-to-india");
  assert.equal(next.includes("african-farm"), true);
  assert.equal(curatorialTrack("african-farm"), "next");
  assert.equal(featured.includes("african-farm"), false);
  assert.equal(forYou?.workIds.includes("african-farm"), false);
  assert.equal(sleep?.workIds[sleep.workIds.indexOf("african-farm") + 1], "a-passage-to-india");
  assert.equal(existsSync(new URL("./openings/african-farm.json", import.meta.url)), true);

  const nela = SHELF.find((item) => item.id === "marianela");
  assert.ok(nela);
  assert.equal(nela.local, true);
  assert.equal(nela.gutenberg, 48818);
  assert.equal(nela.breaths, 1138);
  assert.equal(nela.minutes, 695);
  assert.match(nela.opening ?? "", /^The sun had set\./);
  assert.match(nela.opening ?? "", /north of Spain\.$/);
  assert.equal(next.includes("marianela"), true);
  assert.equal(curatorialTrack("marianela"), "next");
  assert.equal(featured.includes("marianela"), false);
  assert.equal(forYou?.workIds.includes("marianela"), false);
  assert.equal(sleep?.workIds.includes("marianela"), true);
  assert.equal(existsSync(new URL("./openings/marianela.json", import.meta.url)), true);

  const sea = SHELF.find((item) => item.id === "on-the-seaboard");
  assert.ok(sea);
  assert.equal(sea.local, true);
  assert.equal(sea.gutenberg, 44184);
  assert.equal(sea.breaths, 1097);
  assert.equal(sea.minutes, 833);
  assert.match(sea.opening ?? "", /Goosestone bay/);
  assert.match(sea.opening ?? "", /began to sink\.$/);
  assert.equal(next.includes("on-the-seaboard"), false);
  assert.equal(curatorialTrack("on-the-seaboard"), "later");
  assert.equal(featured.includes("on-the-seaboard"), false);
  assert.equal(forYou?.workIds.includes("on-the-seaboard"), true);
  assert.ok((forYou?.workIds.indexOf("on-the-seaboard") ?? -1) > 2);
  assert.equal(sleep?.workIds.includes("on-the-seaboard"), true);
  assert.equal(walk?.workIds.includes("on-the-seaboard"), true);
  assert.equal(existsSync(new URL("./openings/on-the-seaboard.json", import.meta.url)), true);

  for (const held of ["siddhartha", "the-red-room"] as const) {
    assert.equal(featured.includes(held), false, held);
    assert.equal(forYou?.workIds.includes(held), false, held);
    assert.equal((cold as readonly string[]).includes(held), false, held);
  }
  const heldFarm = JSON.parse(
    readFileSync(new URL("./texts/african-farm.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: unknown[] };
  assert.equal(heldFarm.scenes.length, 36);
  assert.equal(heldFarm.breaths.length, 6189);
  assert.equal(heldFarm.breaths[0]?.text, farm.opening);
  assert.equal(heldFarm.breaths[1]?.text.startsWith("The dry, sandy earth"), true);
  assert.match(heldFarm.breaths[2]?.text ?? "", /milk-bushes/);
  const seaFull = JSON.parse(
    readFileSync(new URL("./texts/on-the-seaboard.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.equal(seaFull.scenes[0]?.title, "Chapter I");
  assert.equal(seaFull.breaths[0]?.text, sea.opening);
  assert.doesNotMatch(seaFull.breaths[0]?.text ?? "", /^Preface/);
  const nelaFull = JSON.parse(
    readFileSync(new URL("./texts/marianela.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(nelaFull.breaths.at(-1)?.text, "THE END.");
  assert.equal(nelaFull.breaths[0]?.text, nela.opening);
});

test("Mira 4PM CLEAR sits on Next, For you, and Rituals, never Featured", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], cold);
  assert.equal(sleep?.workIds[0], "quicksand");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou?.workIds.at(-13), "thais");
  assert.equal(forYou?.workIds.at(-14), "anandamath");
  assert.equal(forYou?.workIds.at(-15), "hadji-murad");
  assert.equal(forYou?.workIds.at(-16), "bel-ami");

  const expect = {
    "a-passage-to-india": {
      opening:
        "Except for the Marabar Caves—and they are twenty miles off—the city of Chandrapore presents nothing extraordinary.",
      breaths: 6951,
      scenes: 37,
      minutes: 1254,
      year: 1924,
      gutenberg: 61221,
      scene: "Part I: Mosque",
      lane: "next",
    },
    mhudi: {
      opening:
        "Two centuries ago the Bechuana tribes inhabited the extensive areas between Central Transvaal and the Kalahari Desert.",
      breaths: 2883,
      scenes: 24,
      minutes: 790,
      year: 1930,
      gutenberg: undefined,
      scene: "CHAPTER 1 · A Tragedy and its Vendetta",
      lane: "next",
    },
    maria: {
      opening:
        "I was still a mere boy when sent away from home to study in ⸻ College, founded a few years before in Bogotá, and then well known all through Colombia.",
      breaths: 2378,
      scenes: 59,
      minutes: 887,
      year: 1890,
      gutenberg: undefined,
      scene: "Chapter I",
      lane: "next",
    },
    "bel-ami": {
      opening: "After changing his five-franc piece Georges Duroy left the restaurant.",
      breaths: 4028,
      scenes: 22,
      minutes: 639,
      year: 1885,
      gutenberg: 3733,
      scene: "POVERTY",
      lane: "for-you",
    },
    magnhild: {
      opening:
        "The landscape has high, bold mountains, above which are just passing the remnants of a storm.",
      breaths: 2606,
      scenes: 14,
      minutes: 541,
      year: 1877,
      gutenberg: 33683,
      scene: "Chapter 1",
      lane: "rituals",
    },
  } as const;

  const passageAt = next.indexOf("a-passage-to-india");
  assert.equal(next[passageAt + 1], "mhudi");
  assert.equal(next[passageAt + 2], "maria");
  assert.equal(next[passageAt + 3], "of-human-bondage");
  assert.ok(passageAt > next.indexOf("african-farm"));
  assert.ok(next.indexOf("mhudi") > next.indexOf("a-passage-to-india"));
  assert.ok(next.indexOf("maria") > next.indexOf("mhudi"));
  assert.equal(next.indexOf("maria"), next.lastIndexOf("maria"));

  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.equal(work.opening, want.opening, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.minutes, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.language, "English", id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), true, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.equal(full.breaths[0]?.text, want.opening, id);
    assert.equal(opened.breaths[0]?.text, want.opening, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    if (id === "a-passage-to-india") assert.equal(full.scenes[1]?.title, "Chapter II");
    if (id === "maria") assert.notEqual(id, "marianela");
  }

  assert.equal(curatorialTrack("a-passage-to-india"), "next");
  assert.equal(curatorialTrack("mhudi"), "next");
  assert.equal(curatorialTrack("maria"), "next");
  assert.equal(curatorialTrack("bel-ami"), "later");
  assert.equal(curatorialTrack("magnhild"), "later");
  assert.equal(next.includes("bel-ami"), false);
  assert.equal(next.includes("magnhild"), false);
  assert.equal(forYou?.workIds.includes("a-passage-to-india"), false);
  assert.equal(forYou?.workIds.includes("mhudi"), false);
  assert.equal(forYou?.workIds.includes("maria"), false);
  assert.equal(forYou?.workIds.includes("magnhild"), false);
  assert.equal(forYou?.workIds.includes("bel-ami"), true);
  assert.ok((forYou?.workIds.indexOf("bel-ami") ?? 0) > 2);

  const sleepPassage = sleep?.workIds.indexOf("a-passage-to-india") ?? -1;
  assert.deepEqual(sleep?.workIds.slice(sleepPassage, sleepPassage + 5), [
    "a-passage-to-india",
    "mhudi",
    "maria",
    "bel-ami",
    "magnhild",
  ]);
  const unwindPassage = unwind?.workIds.indexOf("a-passage-to-india") ?? -1;
  assert.ok(unwindPassage >= 0);
  assert.equal(unwind?.workIds[unwindPassage + 1], "of-human-bondage");
  assert.ok((waking?.workIds.indexOf("mhudi") ?? -1) > (waking?.workIds.indexOf("seven-brothers") ?? 0));
  const walkBel = walk?.workIds.indexOf("bel-ami") ?? -1;
  assert.equal(walk?.workIds[walkBel + 1], "magnhild");
  assert.equal(walk?.workIds[walkBel + 2], "green-mansions");
  assert.equal(sleep?.workIds.includes("three-hundred-tang-poems"), false);
  assert.equal(sleep?.workIds.includes("the-bronze-horseman"), false);
  assert.equal(next.includes("three-hundred-tang-poems"), false);
  assert.equal(next.includes("the-bronze-horseman"), false);

  const nela = SHELF.find((item) => item.id === "marianela");
  const maria = SHELF.find((item) => item.id === "maria");
  assert.notEqual(maria?.opening, nela?.opening);
  assert.notEqual(maria?.gutenberg, nela?.gutenberg);
  assert.match(maria?.author ?? "", /Ogden/);
  assert.match(nela?.author ?? "", /Bell/);
});

test("Mira 6PM CLEAR sits on Next, For you, and Rituals, never Featured", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], cold);
  assert.equal(sleep?.workIds[0], "quicksand");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou?.workIds.at(-13), "thais");
  assert.equal(forYou?.workIds.at(-14), "anandamath");
  assert.equal(forYou?.workIds.at(-15), "hadji-murad");
  assert.equal(featured.includes("the-painted-veil"), false);
  assert.equal(featured.includes("high-wind-jamaica"), false);
  assert.equal(next.includes("the-painted-veil"), true);
  assert.notEqual(
    SHELF.find((item) => item.id === "the-painted-veil")?.opening,
    SHELF.find((item) => item.id === "of-human-bondage")?.opening,
  );

  const expect = {
    "of-human-bondage": {
      opening: "The day broke gray and dull.",
      breaths: 16199,
      scenes: 116,
      minutes: 3241,
      year: 1915,
      gutenberg: 351,
      scene: "Chapter I",
      lane: "next",
    },
    "green-mansions": {
      opening:
        "Now that we are cool, he said, and regret that we hurt each other, I am not sorry that it happened.",
      breaths: 2256,
      scenes: 22,
      minutes: 1063,
      year: 1904,
      gutenberg: 942,
      scene: "Chapter I",
      lane: "next",
    },
    "nada-the-lily": {
      opening:
        "You ask me, my father, to tell you the tale of the youth of Umslopogaas, holder of the iron Chieftainess, the axe Groan-maker, who was named Bulalio the Slaughterer, and of his love for Nada, the most beautiful of Zulu women.",
      breaths: 3260,
      scenes: 36,
      minutes: 1406,
      year: 1892,
      gutenberg: 1207,
      scene: "Chapter I · The Boy Chaka Prophesies",
      lane: "next",
    },
    "jamaica-anansi-stories": {
      opening: "One great hungry time.",
      breaths: 9040,
      scenes: 346,
      minutes: 1356,
      year: 1924,
      gutenberg: 72735,
      scene: "1. Tying Tiger · Hungry-time fish pot",
      lane: "rituals",
    },
    "hadji-murad": {
      opening:
        "I was returning home by the fields. It was midsummer; the hay harvest was over, and they were just beginning to reap the rye.",
      breaths: 1594,
      scenes: 25,
      minutes: 583,
      year: 1912,
      gutenberg: undefined,
      scene: "Opening · Thistle prologue",
      lane: "for-you",
    },
  } as const;

  const bondAt = next.indexOf("of-human-bondage");
  assert.equal(next[bondAt + 1], "green-mansions");
  assert.equal(next[bondAt + 2], "nada-the-lily");
  assert.equal(next.includes("hadji-murad"), false);
  assert.equal(next.includes("jamaica-anansi-stories"), false);
  assert.ok(bondAt > next.indexOf("maria"));
  const bondSleep = sleep?.workIds.indexOf("of-human-bondage") ?? -1;
  assert.deepEqual(sleep?.workIds.slice(bondSleep, bondSleep + 4), [
    "of-human-bondage",
    "green-mansions",
    "jamaica-anansi-stories",
    "hadji-murad",
  ]);
  assert.ok(unwind?.workIds.includes("of-human-bondage"));
  const greenWalk = walk?.workIds.indexOf("green-mansions") ?? -1;
  assert.deepEqual(walk?.workIds.slice(greenWalk, greenWalk + 2), ["green-mansions", "hadji-murad"]);
  assert.equal(
    bite?.workIds[(bite?.workIds.indexOf("casanovas-homecoming") ?? -1) + 1],
    "jamaica-anansi-stories",
  );
  assert.equal(forYou?.workIds.includes("of-human-bondage"), false);
  assert.equal(forYou?.workIds.includes("green-mansions"), false);
  assert.equal(forYou?.workIds.includes("nada-the-lily"), false);
  assert.equal(forYou?.workIds.includes("jamaica-anansi-stories"), false);
  assert.equal(next.includes("three-hundred-tang-poems"), false);
  assert.equal(next.includes("the-bronze-horseman"), false);

  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.equal(work.opening, want.opening, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.minutes, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.language, "English", id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal((cold as readonly string[]).includes(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), true, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.equal(full.breaths[0]?.text, want.opening, id);
    assert.equal(opened.breaths[0]?.text, want.opening, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    if (want.lane === "next") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal(next.includes(id), true, id);
      assert.equal(forYou?.workIds.includes(id), false, id);
    } else if (want.lane === "for-you") {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(next.includes(id), false, id);
      assert.equal(forYou?.workIds.includes(id), true, id);
      assert.ok((forYou?.workIds.indexOf(id) ?? 0) > 2, id);
    } else {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(next.includes(id), false, id);
      assert.equal(forYou?.workIds.includes(id), false, id);
      assert.equal(bite?.workIds.includes(id), true, id);
      assert.equal(sleep?.workIds.includes(id), true, id);
    }
  }

  const nada = SHELF.find((item) => item.id === "nada-the-lily");
  assert.match(nada?.intro ?? "", /Mopo/);
  assert.match(nada?.intro ?? "", /White Man/);
  assert.match(nada?.intro ?? "", /imperial romance/);
  assert.match(nada?.intro ?? "", /not ethnographic authority/);
  assert.doesNotMatch(nada?.intro ?? "", /Featured/);
  const hadji = SHELF.find((item) => item.id === "hadji-murad");
  assert.equal(hadji?.gutenberg, undefined);
  assert.match(hadji?.author ?? "", /Maude/);
});

test("Mira Wed 8AM CLEAR sits on Next, For you, and Rituals, never Featured", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], cold);
  assert.equal(sleep?.workIds[0], "quicksand");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou?.workIds.at(-13), "thais");
  assert.equal(forYou?.workIds.at(-14), "anandamath");
  assert.equal(next.includes("three-hundred-tang-poems"), false);
  assert.equal(next.includes("the-bronze-horseman"), false);
  assert.equal(sleep?.workIds.includes("three-hundred-tang-poems"), false);
  assert.equal(sleep?.workIds.includes("the-bronze-horseman"), false);

  const expect = {
    "death-comes-for-the-archbishop": {
      opening:
        "ONE afternoon in the autumn of 1851 a solitary horseman, followed by a pack-mule, was pushing through an arid stretch of country somewhere in central New Mexico.",
      breaths: 3410,
      scenes: 23,
      minutes: 833,
      year: 1927,
      gutenberg: 69730,
      scene: "THE CRUCIFORM TREE",
      lane: "next",
    },
    banjo: {
      opening:
        "Heaving along from side to side, like a sailor on the unsteady deck of a ship, Lincoln Agrippa Daily, familiarly known as Banjo, patrolled the magnificent length of the great breakwater of Marseilles, a banjo in his hand.",
      breaths: 6090,
      scenes: 25,
      minutes: 1144,
      year: 1929,
      gutenberg: undefined,
      scene: "I. The Ditch",
      lane: "next",
    },
    "nacha-regules": {
      opening:
        "An August night! Hot with the fever of her adolescence as a national capital, Buenos Aires was ablaze with millions of lights and rejoicing in noisy revelry.",
      breaths: 2268,
      scenes: 25,
      minutes: 974,
      year: 1922,
      gutenberg: 59441,
      scene: "Chapter I",
      lane: "next",
    },
    anandamath: {
      opening:
        "On a certain day in the year 1176 B.S-, the sun was shining hot in the village of Padachinha. The village was full of houses but you could find very few men there.",
      breaths: 1679,
      scenes: 47,
      minutes: 572,
      year: 1906,
      gutenberg: undefined,
      scene: "Part I · Chapter I",
      lane: "for-you",
    },
    "african-tragedy": {
      opening: "Two reasons made Robert Zulu leave teaching at Siam Village School.",
      breaths: 520,
      scenes: 5,
      minutes: 92,
      year: 1928,
      gutenberg: undefined,
      scene: "CHAPTER I · Evils Of Town Life",
      lane: "rituals",
    },
  } as const;

  const eightAt = next.indexOf("death-comes-for-the-archbishop");
  assert.equal(next[eightAt + 1], "banjo");
  assert.equal(next[eightAt + 2], "nacha-regules");
  assert.ok(eightAt > next.indexOf("nada-the-lily"));
  assert.equal(next.includes("anandamath"), false);
  assert.equal(next.includes("african-tragedy"), false);
  const sleepEight = sleep!.workIds.indexOf("death-comes-for-the-archbishop");
  assert.deepEqual(sleep?.workIds.slice(sleepEight, sleepEight + 5), [
    "death-comes-for-the-archbishop",
    "banjo",
    "nacha-regules",
    "african-tragedy",
    "anandamath",
  ]);
  assert.equal(unwind?.workIds.includes("death-comes-for-the-archbishop"), true);
  assert.equal(unwind?.workIds.includes("nacha-regules"), true);
  const walkEight = walk!.workIds.indexOf("death-comes-for-the-archbishop");
  assert.deepEqual(walk?.workIds.slice(walkEight, walkEight + 3), [
    "death-comes-for-the-archbishop",
    "banjo",
    "nacha-regules",
  ]);
  const biteBrazil = bite!.workIds.lastIndexOf("brazilian-tales");
  assert.equal(bite?.workIds[biteBrazil - 1], "african-tragedy");
  assert.equal(bite?.workIds[biteBrazil + 1], "tropic");
  const wakeEight = waking!.workIds.indexOf("african-tragedy");
  assert.equal(waking?.workIds[wakeEight + 1], "anandamath");
  assert.equal(forYou?.workIds.includes("death-comes-for-the-archbishop"), false);
  assert.equal(forYou?.workIds.includes("banjo"), false);
  assert.equal(forYou?.workIds.includes("nacha-regules"), false);
  assert.equal(forYou?.workIds.includes("african-tragedy"), false);

  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.equal(work.opening, want.opening, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.minutes, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.language, "English", id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal((cold as readonly string[]).includes(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), true, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.equal(full.breaths[0]?.text, want.opening, id);
    assert.equal(opened.breaths[0]?.text, want.opening, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    if (want.lane === "next") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal(next.includes(id), true, id);
      assert.equal(forYou?.workIds.includes(id), false, id);
    } else if (want.lane === "for-you") {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(next.includes(id), false, id);
      assert.equal(forYou?.workIds.includes(id), true, id);
      assert.ok((forYou?.workIds.indexOf(id) ?? 0) > 2, id);
    } else {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(next.includes(id), false, id);
      assert.equal(forYou?.workIds.includes(id), false, id);
      assert.equal(bite?.workIds.includes(id), true, id);
      assert.equal(sleep?.workIds.includes(id), true, id);
    }
  }

  const arch = SHELF.find((item) => item.id === "death-comes-for-the-archbishop");
  assert.match(arch?.intro ?? "", /Cruciform Tree/);
  assert.match(arch?.intro ?? "", /It opens at Book One, The Cruciform Tree/);
  assert.doesNotMatch(arch?.opening ?? "", /^ONE afternoon in the autumn of 1851 a solitary horseman was in Rome/);
  const banjo = SHELF.find((item) => item.id === "banjo");
  assert.match(banjo?.intro ?? "", /language is left as written/);
  assert.match(banjo?.intro ?? "", /dialect/);
  assert.equal(banjo?.gutenberg, undefined);
  const abbey = SHELF.find((item) => item.id === "anandamath");
  assert.match(abbey?.author ?? "", /Sen-Gupta/);
  assert.doesNotMatch(abbey?.intro ?? "", /Poison Tree/);
  assert.doesNotMatch(abbey?.intro ?? "", /no catalog number/);
  assert.equal(abbey?.gutenberg, undefined);
  const nacha = SHELF.find((item) => item.id === "nacha-regules");
  assert.match(nacha?.author ?? "", /Ongley/);
  assert.match(nacha?.intro ?? "", /not a light romance/);
  assert.match(nacha?.intro ?? "", /sex-work/);
  const tragedy = SHELF.find((item) => item.id === "african-tragedy");
  assert.match(tragedy?.opening ?? "", /^Two reasons made Robert Zulu leave teaching/);
  assert.doesNotMatch(tragedy?.opening ?? "", /EVILS OF TOWN LIFE/);
  assert.match(tragedy?.intro ?? "", /chapter boundary/);
  assert.match(tragedy?.intro ?? "", /that view is the book’s own/);
  assert.equal(tragedy?.gutenberg, undefined);
  for (const id of Object.keys(expect)) {
    assert.equal(featured.includes(id), false, id);
  }
});

test("Mira Noon Wed 23 Sep CLEAR sits on Next, For you, and Rituals, never a new Featured pin", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], cold);
  assert.equal(sleep?.workIds[0], "quicksand");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou?.workIds.at(-13), "thais");
  assert.equal(forYou?.workIds.at(-14), "anandamath");
  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.equal(next.includes("three-hundred-tang-poems"), false);
  assert.equal(next.includes("the-bronze-horseman"), false);
  assert.equal(next.includes("inferno"), false);
  const dante = SHELF.find((item) => item.id === "inferno");
  assert.equal(dante?.local, undefined);
  assert.equal(dante?.gutenberg, undefined);
  const noonAt = next.lastIndexOf("enchanted-april");
  assert.deepEqual(next.slice(noonAt, noonAt + 3), [
    "enchanted-april",
    "quicksand",
    "underdogs",
  ]);
  assert.equal(next[noonAt + 3], "lolly-willowes");
  assert.ok(next.indexOf("enchanted-april") > next.indexOf("nacha-regules"));
  assert.equal(next.includes("kwaidan-stories-and-studies-of-strange-things"), false);
  assert.equal(next.includes("thais"), false);
  const noonSleep = sleep!.workIds.lastIndexOf("enchanted-april");
  assert.deepEqual(sleep?.workIds.slice(noonSleep, noonSleep + 5), [
    "enchanted-april",
    "quicksand",
    "underdogs",
    "kwaidan-stories-and-studies-of-strange-things",
    "thais",
  ]);
  const noonWalk = walk!.workIds.lastIndexOf("enchanted-april");
  assert.deepEqual(walk?.workIds.slice(noonWalk, noonWalk + 3), [
    "enchanted-april",
    "quicksand",
    "underdogs",
  ]);
  const noonUnwind = unwind!.workIds.lastIndexOf("enchanted-april");
  assert.deepEqual(unwind?.workIds.slice(noonUnwind, noonUnwind + 2), [
    "enchanted-april",
    "underdogs",
  ]);
  assert.equal(bite?.workIds.includes("kwaidan-stories-and-studies-of-strange-things"), true);
  assert.equal(forYou?.workIds.includes("enchanted-april"), false);
  assert.equal(forYou?.workIds.includes("underdogs"), false);
  assert.equal(forYou?.workIds.includes("kwaidan-stories-and-studies-of-strange-things"), false);
  assert.equal(forYou?.workIds.includes("death-comes-for-the-archbishop"), false);
  assert.equal(forYou?.workIds.includes("banjo"), false);
  assert.equal(forYou?.workIds.includes("nacha-regules"), false);
  assert.equal(forYou?.workIds.includes("african-tragedy"), false);

  const expect = {
    "enchanted-april": {
      opening:
        "It began in a Woman’s Club in London on a February afternoon—an uncomfortable club, and a miserable afternoon—when Mrs. Wilkins, who had come down from Hampstead to shop and had lunched at her club, took up *The Times* from the table in the smoking-room, and running her listless eye down the Agony Column saw this:",
      breaths: 1540,
      scenes: 22,
      minutes: 96,
      year: 1922,
      gutenberg: 16389,
      scene: "Chapter 1",
      lane: "next-featured",
    },
    quicksand: {
      opening:
        "Helga Crane sat alone in her room, which at that hour, eight in the evening, was in soft gloom. Only a single reading lamp, dimmed by a great black and red shade, made a pool of light on the blue Chinese carpet, on the bright covers of the books which she had taken down from their long shelves, on the white pages of the opened one selected, on the shining brass bowl crowded with many-colored nasturtiums beside her on the low table, and on the oriental silk which covered the stool at her slim feet. It was a comfortable room, furnished with rare and intensely personal taste, flooded with Southern sun in the day, but shadowy just then with the drawn curtains and single shaded light. Large, too. So large that the spot where Helga sat was a small oasis in a desert of darkness. And eerily quiet. But that was what she liked after her taxing day's work, after the hard classes, in which she gave willingly and unsparingly of herself with no apparent return. She loved this tranquillity, this quiet, following the fret and strain of the long hours spent among fellow members of a carelessly unkind and gossiping faculty, following the strenuous rigidity of conduct required in this huge educational community of which she was an insignificant part. This was her rest, this intentional isolation for a short while in the evening, this little time in her own attractive room with her own books. To the rapping of other teachers, bearing fresh scandals, or seeking information, or other more concrete favors, or merely talk, at that hour Helga Crane never opened her door.",
      breaths: 685,
      scenes: 25,
      minutes: 160,
      year: 1928,
      gutenberg: undefined,
      scene: "Chapter I",
      lane: "next-featured",
    },
    underdogs: {
      opening: "That's no animal, I tell you!",
      breaths: 2899,
      scenes: 43,
      minutes: 362,
      year: 1915,
      gutenberg: 549,
      scene: "Part One · Chapter I",
      lane: "next",
    },
    "kwaidan-stories-and-studies-of-strange-things": {
      opening:
        "More than seven hundred years ago, at Dan-no-ura, in the Straits of Shimonoséki, was fought the last battle of the long contest between the Heiké, or Taira clan, and the Genji, or Minamoto clan.",
      breaths: 1643,
      scenes: 37,
      minutes: 205,
      year: 1904,
      gutenberg: 1210,
      scene: "The Story of Mimi-Nashi-Hōïchi",
      lane: "rituals",
    },
    thais: {
      opening:
        "In those days there were many hermits living in the desert. On both banks of the Nile numerous huts, built by these solitary dwellers, of branches held together by clay, were scattered at a little distance from each other, so that the inhabitants could live alone, and yet help one another in case of need. Churches, each surmounted by a cross, stood here and there amongst the huts, and the monks flocked to them at each festival to celebrate the services or to partake of the Communion. There were also, here and there on the banks of the river, monasteries, where the cenobites lived in separate cells, and only met together that they might the better enjoy their solitude.",
      breaths: 914,
      scenes: 3,
      minutes: 160,
      year: 1890,
      gutenberg: 2078,
      scene: "Part First — The Lotus",
      lane: "for-you",
    },
  } as const;

  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.equal(work.opening, want.opening, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.minutes, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.doesNotMatch(work.opening ?? "", /How beautiful the revolution|ANATOLE FRANCE/);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), true, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
      note?: string;
    };
    const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as {
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.equal(full.breaths[0]?.text, want.opening, id);
    assert.equal(opened.breaths[0]?.text, want.opening, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("6377"), false, id);
    if (want.lane === "next") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal(featured.includes(id), false, id);
      assert.equal(next.includes(id), true, id);
      assert.equal(forYou?.workIds.includes(id), false, id);
    } else if (want.lane === "next-featured") {
      assert.equal(curatorialTrack(id), "featured", id);
      assert.equal(featured.includes(id), true, id);
      assert.equal(next.includes(id), true, id);
    } else if (want.lane === "for-you") {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(featured.includes(id), false, id);
      assert.equal(next.includes(id), false, id);
      assert.equal(forYou?.workIds.includes(id), true, id);
      assert.ok((forYou?.workIds.indexOf(id) ?? 0) > 2, id);
    } else {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(featured.includes(id), false, id);
      assert.equal(next.includes(id), false, id);
      assert.equal(forYou?.workIds.includes(id), false, id);
      assert.equal(bite?.workIds.includes(id), true, id);
      assert.equal(sleep?.workIds.includes(id), true, id);
    }
  }

  const dogs = SHELF.find((item) => item.id === "underdogs");
  assert.match(dogs?.opening ?? "", /^That's no animal, I tell you!/);
  assert.doesNotMatch(dogs?.opening ?? "", /How beautiful the revolution/);
  assert.match(dogs?.intro ?? "", /Soldiers and violence are already in this stretch/);
  assert.equal(dogs?.gutenberg, 549);
  const thais = SHELF.find((item) => item.id === "thais");
  assert.equal(thais?.gutenberg, 2078);
  assert.match(thais?.opening ?? "", /hermits living in the desert/);
  assert.match(thais?.intro ?? "", /Lotus/);
  assert.doesNotMatch(thais?.opening ?? "", /ANATOLE FRANCE/);
  const kwaidan = SHELF.find((item) => item.id === "kwaidan-stories-and-studies-of-strange-things");
  assert.match(kwaidan?.intro ?? "", /One tale only/);
  assert.match(kwaidan?.intro ?? "", /Dan-no-ura/);
  const kwaidanText = readFileSync(
    new URL("./texts/kwaidan-stories-and-studies-of-strange-things.json", import.meta.url),
    "utf8",
  );
  assert.equal(/\[\d+\]/.test(kwaidanText), false);
});

test("Mira ~4:14 Wed 23 Sep CLEAR sits on Next and Rituals, never a new Featured pin", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const cold = ["the-house-of-mirth", "quicksand", "botchan"];
  assert.deepEqual(forYou?.workIds.slice(0, 3), cold);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], cold);
  assert.equal(sleep?.workIds[0], "quicksand");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.at(-12), "bunner-sisters");
  assert.equal(forYou?.workIds.at(-13), "thais");
  assert.equal(forYou?.workIds.at(-14), "anandamath");
  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  const four = next.lastIndexOf("lolly-willowes");
  assert.deepEqual(next.slice(four, four + 4), [
    "lolly-willowes",
    "cheri",
    "all-quiet-on-the-western-front",
    "the-gadfly",
  ]);
  assert.deepEqual(next.slice(four + 4, four + 7), [
    "the-painted-veil",
    "growth-of-the-soil",
    "the-purple-land",
  ]);
  assert.ok(next.indexOf("all-quiet-on-the-western-front") < next.indexOf("lolly-willowes"));
  assert.ok(next.lastIndexOf("all-quiet-on-the-western-front") > next.indexOf("cheri"));
  assert.equal(next.includes("brazilian-tales"), false);
  assert.equal(next.includes("the-painted-veil"), true);
  assert.equal(next.includes("three-hundred-tang-poems"), false);
  assert.equal(next.includes("the-bronze-horseman"), false);
  assert.equal(next.includes("inferno"), false);
  const sleepLolly = sleep!.workIds.lastIndexOf("lolly-willowes");
  assert.deepEqual(sleep?.workIds.slice(sleepLolly, sleepLolly + 5), [
    "lolly-willowes",
    "cheri",
    "all-quiet-on-the-western-front",
    "the-gadfly",
    "brazilian-tales",
  ]);
  const sleepVeil = sleep!.workIds.lastIndexOf("the-painted-veil");
  assert.deepEqual(sleep?.workIds.slice(sleepVeil, sleepVeil + 5), [
    "the-painted-veil",
    "growth-of-the-soil",
    "tropic",
    "bunner-sisters",
    "bread-givers",
  ]);
  const walkLolly = walk!.workIds.lastIndexOf("lolly-willowes");
  assert.deepEqual(walk?.workIds.slice(walkLolly, walkLolly + 4), [
    "lolly-willowes",
    "cheri",
    "all-quiet-on-the-western-front",
    "the-gadfly",
  ]);
  const walkVeil = walk!.workIds.lastIndexOf("the-painted-veil");
  assert.deepEqual(walk?.workIds.slice(walkVeil, walkVeil + 3), [
    "the-painted-veil",
    "growth-of-the-soil",
    "noli-me-tangere",
  ]);
  const unwindLolly = unwind!.workIds.lastIndexOf("lolly-willowes");
  assert.deepEqual(unwind?.workIds.slice(unwindLolly, unwindLolly + 4), [
    "lolly-willowes",
    "cheri",
    "all-quiet-on-the-western-front",
    "the-gadfly",
  ]);
  const unwindVeil = unwind!.workIds.lastIndexOf("the-painted-veil");
  assert.deepEqual(unwind?.workIds.slice(unwindVeil, unwindVeil + 3), [
    "the-painted-veil",
    "growth-of-the-soil",
    "noli-me-tangere",
  ]);
  const biteBrazil = bite!.workIds.lastIndexOf("brazilian-tales");
  assert.equal(bite?.workIds[biteBrazil - 1], "african-tragedy");
  assert.equal(bite?.workIds[biteBrazil + 1], "tropic");

  const expect = {
    "lolly-willowes": {
      opening:
        "When her father died, Laura Willowes went to live in London with her elder brother and his family.",
      breaths: 3174,
      scenes: 3,
      minutes: 397,
      year: 1926,
      gutenberg: 72223,
      scene: "Chapter I",
      lane: "next",
    },
    cheri: {
      opening: "“Léa. Give me your pearls.",
      breaths: 3116,
      scenes: 5,
      minutes: 390,
      year: 1920,
      gutenberg: undefined,
      scene: "CHAPTER I",
      lane: "next",
    },
    "all-quiet-on-the-western-front": {
      opening:
        "We are at rest five miles behind the front. Yesterday we were relieved, and now our bellies are full of beef and haricot beans. We are satisfied and at peace. Each man has another mess-tin full for the evening; and, what is more, there is a double ration of sausage and bread. That puts a man in fine trim. We have not had such luck as this for a long time. The cook with his carroty head is begging us to eat; he beckons with his ladle to every one that passes, and spoons him out a great dollop. He does not see how he can empty his stew-pot in time for coffee. Tjaden and Müller have produced two wash-basins and had them filled up to the brim as a reserve. In Tjaden this is voracity, in Müller it is foresight. Where Tjaden puts it all is a mystery, for he is and always will be as thin as a rake.",
      breaths: 1604,
      scenes: 12,
      minutes: 100,
      year: 1929,
      gutenberg: 75011,
      scene: "Chapter I",
      lane: "next",
    },
    "the-gadfly": {
      opening:
        "Arthur sat in the library of the theological seminary at Pisa, looking through a pile of manuscript sermons.",
      breaths: 6645,
      scenes: 26,
      minutes: 832,
      year: 1897,
      gutenberg: 3431,
      scene: "Part I · Chapter I",
      lane: "next",
    },
    "brazilian-tales": {
      opening:
        "Hamlet observes to Horatio that there are more things in heaven and earth than are dreamt of in our philosophy. This was the selfsame explanation that was given by beautiful Rita to her lover, Camillo, on a certain Friday of November, 1869, when Camillo laughed at her for having gone, the previous evening, to consult a fortune-teller. The only difference is that she made her explanation in other words.",
      breaths: 365,
      scenes: 6,
      minutes: 88,
      year: 1921,
      gutenberg: 21040,
      scene: "The Fortune-Teller",
      lane: "rituals",
    },
  } as const;

  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.equal(work.opening, want.opening, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.minutes, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.language, "English", id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal((cold as readonly string[]).includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), true, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes[0]?.title, want.scene, id);
    assert.equal(full.breaths[0]?.text, want.opening, id);
    assert.equal(opened.breaths[0]?.text, want.opening, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    if (want.lane === "next") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal(next.includes(id), true, id);
    } else {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal(next.includes(id), false, id);
      assert.equal(bite?.workIds.includes(id), true, id);
      assert.equal(sleep?.workIds.includes(id), true, id);
    }
  }

  const lolly = SHELF.find((item) => item.id === "lolly-willowes");
  const lollyOpen = readFileSync(new URL("./openings/lolly-willowes.json", import.meta.url), "utf8");
  assert.match(lollyOpen, /Of course,” said Caroline, “you will come to us\./);
  assert.match(lolly?.intro ?? "", /Of course, you will come to us/);
  assert.match(lolly?.intro ?? "", /Chapter I only/);
  assert.doesNotMatch(lolly?.intro ?? "", /Maggot/);
  const cheri = SHELF.find((item) => item.id === "cheri");
  assert.equal(cheri?.gutenberg, undefined);
  assert.match(cheri?.intro ?? "", /wrought-iron/);
  assert.match(cheri?.intro ?? "", /Janet Flanner’s English/);
  assert.doesNotMatch(cheri?.intro ?? "", /soft against|Bel-Ami/);
  assert.match(cheri?.intro ?? "", /kept boy are the story/);
  const quiet = SHELF.find((item) => item.id === "all-quiet-on-the-western-front");
  assert.match(quiet?.intro ?? "", /beef and haricot beans/);
  assert.match(quiet?.intro ?? "", /trench violence and period language about the enemy/);
  assert.doesNotMatch(quiet?.intro ?? "", /Warn the room|Host further/);
  assert.equal(quiet?.gutenberg, 75011);
  const gadfly = SHELF.find((item) => item.id === "the-gadfly");
  assert.match(gadfly?.intro ?? "", /Fragola/);
  assert.doesNotMatch(gadfly?.intro ?? "", /Enchanted April/);
  const tales = SHELF.find((item) => item.id === "brazilian-tales");
  assert.match(tales?.intro ?? "", /One tale only/);
  assert.match(tales?.intro ?? "", /Attendant's Confession/);
  assert.match(tales?.intro ?? "", /This reading ends with that tale/);
  assert.doesNotMatch(tales?.intro ?? "", /Tropic/);
  const talesOpen = JSON.parse(
    readFileSync(new URL("./openings/brazilian-tales.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[] };
  assert.equal(talesOpen.scenes.length, 1);
  assert.equal(talesOpen.scenes[0]?.title, "The Fortune-Teller · Brazil — Rio / Guarda-Velha Street");
  for (const held of [
    "death-comes-for-the-archbishop",
    "banjo",
    "nacha-regules",
    "anandamath",
    "african-tragedy",
    "enchanted-april",
    "quicksand",
    "underdogs",
    "kwaidan-stories-and-studies-of-strange-things",
    "thais",
  ]) {
    assert.equal(featured.includes(held) && held !== "enchanted-april" && held !== "quicksand", false);
  }
  assert.equal(next.includes("death-comes-for-the-archbishop"), true);
  assert.equal(next.includes("banjo"), true);
  assert.equal(next.includes("nacha-regules"), true);
  assert.equal(next.includes("enchanted-april"), true);
  assert.equal(next.includes("underdogs"), true);
  assert.equal(forYou?.workIds.includes("anandamath"), true);
  assert.equal(forYou?.workIds.includes("thais"), true);
  assert.equal(bite?.workIds.includes("african-tragedy"), true);
});

test("Mira midday Thu 24 Sep CLEAR sits on Next and Rituals, never a new Featured pin", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const cold = ["the-house-of-mirth", "quicksand", "botchan"] as const;
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [...cold]);
  assert.deepEqual(forYou?.workIds.slice(0, 3), [...cold]);
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-203, -199), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
  ]);
  assert.ok(next.indexOf("an-iceland-fisherman") < next.lastIndexOf("an-iceland-fisherman"));
  assert.equal(next.includes("irish-fairy-tales"), false);
  assert.equal(next.includes("three-hundred-tang-poems"), false);
  assert.equal(next.includes("the-bronze-horseman"), false);
  assert.equal(next.includes("inferno"), false);
  const rudin = SHELF.find((item) => item.id === "rudin");
  assert.equal(rudin?.local, undefined);
  assert.equal(rudin?.gutenberg, 75298);
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("rudin"), false, lane.id);
    assert.equal(lane.workIds.includes("three-hundred-tang-poems"), false, lane.id);
    assert.equal(lane.workIds.includes("the-bronze-horseman"), false, lane.id);
    assert.equal(lane.workIds.includes("inferno"), false, lane.id);
  }
  assert.deepEqual(sleep?.workIds.slice(-173, -168), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
    "irish-fairy-tales",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-198, -194), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
  ]);
  assert.deepEqual(walk?.workIds.slice(-158, -154), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
  ]);
  assert.equal(bite?.workIds.at(-3), "irish-fairy-tales");
  assert.equal(waking?.workIds.at(-45), "irish-fairy-tales");
  assert.ok((waking?.workIds.indexOf("the-peasants") ?? -1) >= 0);
  assert.equal(waking?.workIds.includes("a-hungarian-nabob"), false);
  for (const id of [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
    "irish-fairy-tales",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), true, id);
  }

  const peasants = SHELF.find((item) => item.id === "the-peasants");
  assert.equal(peasants?.gutenberg, 75846);
  assert.equal(peasants?.opening, "“Praised be Jesus Christ!”");
  assert.equal(peasants?.breaths, 2772);
  assert.equal(curatorialTrack("the-peasants"), "next");
  assert.equal(RITUAL_SIT_MINUTES["the-peasants"], 2);
  const peasantsOpen = JSON.parse(
    readFileSync(new URL("./openings/the-peasants.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(peasantsOpen.breaths[0]?.text, "“Praised be Jesus Christ!”");

  const nabob = SHELF.find((item) => item.id === "a-hungarian-nabob");
  assert.equal(nabob?.gutenberg, 20978);
  assert.equal(nabob?.opening, "An Oddity, 1822.");
  assert.equal(nabob?.breaths, 2337);
  assert.equal(curatorialTrack("a-hungarian-nabob"), "next");
  assert.equal(RITUAL_SIT_MINUTES["a-hungarian-nabob"], 8);
  const nabobOpen = JSON.parse(
    readFileSync(new URL("./openings/a-hungarian-nabob.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  const nabobEarly = nabobOpen.breaths.slice(0, 4).map((breath) => breath.text).join("\n");
  assert.match(nabobEarly, /\*puszta\*/);
  assert.match(nabobEarly, /\*csárda\*/);
  assert.doesNotMatch(nabobEarly, /_puszta_|_csárda_|_\[1\]_/);

  const iceland = SHELF.find((item) => item.id === "an-iceland-fisherman");
  assert.equal(iceland?.gutenberg, 2196);
  assert.equal(iceland?.year, 1886);
  assert.equal(iceland?.author, "Pierre Loti");
  assert.equal(iceland?.breaths, 952);
  assert.equal(curatorialTrack("an-iceland-fisherman"), "next");
  assert.equal(RITUAL_SIT_MINUTES["an-iceland-fisherman"], 5);
  const icelandOpen = JSON.parse(
    readFileSync(new URL("./openings/an-iceland-fisherman.json", import.meta.url), "utf8"),
  ) as { note?: string; breaths: { text: string }[] };
  assert.match(icelandOpen.breaths[0]?.text ?? "", /^There they were, five huge, square-built seamen/);
  assert.match(icelandOpen.note ?? "", /2196/);
  assert.doesNotMatch(iceland?.intro ?? "", /1886 only/);
  assert.ok((iceland?.intro ?? "").includes("Cambon’s English. Rough marriage talk and sea-labor desire."));
  assert.doesNotMatch(iceland?.intro ?? "", /189\d|190\d|191\d/);

  const flower = SHELF.find((item) => item.id === "the-song-of-the-blood-red-flower");
  assert.equal(flower?.gutenberg, 12935);
  assert.equal(flower?.author, "Johannes Linnankoski");
  assert.equal(curatorialTrack("the-song-of-the-blood-red-flower"), "next");
  assert.equal(RITUAL_SIT_MINUTES["the-song-of-the-blood-red-flower"], 8);
  const flowerOpen = JSON.parse(
    readFileSync(new URL("./openings/the-song-of-the-blood-red-flower.json", import.meta.url), "utf8"),
  ) as { note?: string; author?: string; breaths: { text: string }[] };
  assert.equal(flowerOpen.author, "Johannes Linnankoski");
  assert.match(flowerOpen.breaths[0]?.text ?? "", /strawberry sweet/);
  const flowerCopy = [
    flower?.intro ?? "",
    flower?.author ?? "",
    blurbFor("the-song-of-the-blood-red-flower"),
    RITUAL_PITCHES["the-song-of-the-blood-red-flower"] ?? "",
    STORED_PREFACES["the-song-of-the-blood-red-flower"] ?? "",
    flowerOpen.note ?? "",
  ].join("\n");
  assert.doesNotMatch(flowerCopy, /translated by|tr\./i);
  assert.doesNotMatch(flowerCopy, /translator/i);

  const irish = SHELF.find((item) => item.id === "irish-fairy-tales");
  assert.equal(irish?.gutenberg, 2892);
  assert.equal(curatorialTrack("irish-fairy-tales"), "later");
  assert.equal(RITUAL_SIT_MINUTES["irish-fairy-tales"], 5);
  const irishOpen = JSON.parse(
    readFileSync(new URL("./openings/irish-fairy-tales.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[]; breaths: { text: string }[] };
  const irishFull = JSON.parse(
    readFileSync(new URL("./texts/irish-fairy-tales.json", import.meta.url), "utf8"),
  ) as { scenes: { id: string; title: string }[]; breaths: { sceneId: string; text: string }[] };
  assert.equal(irishOpen.scenes.length, 1);
  assert.match(irishOpen.breaths[0]?.text ?? "", /^Finnian, the Abbott of Moville/);
  const chapter = irishFull.breaths.filter((breath) => breath.sceneId === irishFull.scenes[0]?.id);
  assert.equal(irishFull.scenes[0]?.title, "CHAPTER I");
  assert.deepEqual(
    irishOpen.breaths.map((breath) => breath.text),
    chapter.map((breath) => breath.text),
  );
  assert.match(irishOpen.breaths.at(-1)?.text ?? "", /Tuan, the son of Cairill/);
  assert.match(irish?.intro ?? "", /Chapter I only/);
});

test("Mira Thu eve 24 Sep CLEAR sits on Next, Rituals, and For you, never a new Featured pin", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const order = [
    "basilio",
    "oblomov",
    "the-lady-with-the-dog-and-other-stories",
    "zeno",
    "the-book-of-khalid",
  ] as const;

  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-199, -197), ["basilio", "oblomov"]);
  assert.equal(next.includes("krakatit"), false);
  assert.equal(next.includes("the-lady-with-the-dog-and-other-stories"), false);
  assert.equal(next.includes("zeno"), false);
  assert.equal(next.includes("the-book-of-khalid"), false);
  assert.deepEqual(sleep?.workIds.slice(-168, -163), [...order]);
  assert.deepEqual(unwind?.workIds.slice(-194, -192), ["basilio", "oblomov"]);
  assert.deepEqual(walk?.workIds.slice(-154, -152), ["basilio", "oblomov"]);
  assert.equal(bite?.workIds.at(-2), "the-lady-with-the-dog-and-other-stories");
  assert.deepEqual(waking?.workIds.slice(-44, -41), [
    "the-lady-with-the-dog-and-other-stories",
    "zeno",
    "the-book-of-khalid",
  ]);
  assert.equal(forYou?.workIds.at(-10), "zeno");
  assert.equal(forYou?.workIds.at(-9), "the-book-of-khalid");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(unwind?.workIds.includes("the-lady-with-the-dog-and-other-stories"), false);
  assert.equal(unwind?.workIds.includes("late-season"), true);
  assert.equal(sleep?.workIds.includes("late-season"), false);
  assert.equal(forYou?.workIds.includes("basilio"), false);
  assert.equal(forYou?.workIds.includes("oblomov"), false);

  for (const id of [
    "three-hundred-tang-poems",
    "the-bronze-horseman",
    "inferno",
    "krakatit",
  ]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(next.slice(-174, -172).includes(id), false, id);
  }
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("rudin"), false, lane.id);
    assert.equal(lane.workIds.includes("three-hundred-tang-poems"), false, lane.id);
    assert.equal(lane.workIds.includes("the-bronze-horseman"), false, lane.id);
    assert.equal(lane.workIds.includes("inferno"), false, lane.id);
  }
  const rudin = SHELF.find((item) => item.id === "rudin");
  assert.equal(rudin?.local, undefined);

  const expectOpen = {
    basilio: {
      title: "Dragon’s Teeth",
      gutenberg: 74442,
      breaths: 8194,
      opening: "The cuckoo-clock in the dining-room had just struck eleven.",
      em: "",
    },
    oblomov: {
      title: "Oblomov",
      gutenberg: 54700,
      breaths: 1212,
      opening: "One morning, in a flat in one of the great buildings in Gorokliovaia Street",
      em: "insouciance",
    },
    "the-lady-with-the-dog-and-other-stories": {
      title: "The Lady with the Dog",
      gutenberg: 13415,
      breaths: 1457,
      opening: "It was said that a new person had appeared on the sea-front",
      em: "béret",
    },
    zeno: {
      title: "Confessions of Zeno",
      gutenberg: 79453,
      breaths: 2442,
      opening: "When I spoke to the doctor about my weakness for smoking",
      em: "",
    },
    "the-book-of-khalid": {
      title: "The Book of Khalid",
      gutenberg: 29257,
      breaths: 4493,
      opening: "The City of Baal, or Baalbek, is between the desert and the deep sea.",
      em: "they",
    },
  } as const;

  for (const id of order) {
    const want = expectOpen[id];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.title, want.title, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(featured.includes(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    assert.equal(full.title, want.title, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    assert.equal(full.breaths[0]?.text.startsWith(want.opening.slice(0, 24)), true, id);
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.doesNotMatch(opened.note ?? "", /Salon|Vellum/);
    assert.doesNotMatch(full.note ?? "", /Salon|Vellum|Adapted by/);
    if (want.em) {
      const hit = opened.breaths.find((breath) => breath.text.includes(`*${want.em}*`));
      assert.ok(hit, `${id} *${want.em}*`);
      assert.ok(
        splitEmphasis(hit.text).some((part) => part.type === "em" && part.value === want.em),
        id,
      );
    }
  }

  const oblomovCopy = [
    SHELF.find((item) => item.id === "oblomov")?.title ?? "",
    SHELF.find((item) => item.id === "oblomov")?.intro ?? "",
    blurbFor("oblomov"),
    RITUAL_PITCHES.oblomov ?? "",
    STORED_PREFACES.oblomov ?? "",
  ].join("\n");
  assert.match(oblomovCopy, /abridged/i);
  assert.doesNotMatch(oblomovCopy, /complete|unabridged/i);
  const oblomovFull = JSON.parse(
    readFileSync(new URL("./texts/oblomov.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const oblomovNote = oblomovFull.note ?? "";
  assert.match(oblomovNote, /abridged/i);
  assert.doesNotMatch(oblomovNote, /complete|unabridged/i);
  assert.match(oblomovNote, /Hogarth/);
  assert.match(oblomovNote, /Public domain in the USA/);

  const basilio = SHELF.find((item) => item.id === "basilio");
  assert.equal(basilio?.title, "Dragon’s Teeth");
  assert.doesNotMatch(`${basilio?.title} ${basilio?.intro ?? ""}`, /Cousin Basilio/);
  const khalid = JSON.parse(
    readFileSync(new URL("./texts/the-book-of-khalid.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(khalid.scenes[0]?.title, "CHAPTER II");
  assert.equal(khalid.scenes.at(-1)?.title, "CHAPTER I");
  assert.equal(
    khalid.scenes.slice(0, 3).some((scene) => /^chapter i\b/i.test(scene.title)),
    false,
  );
  const zeno = JSON.parse(
    readFileSync(new URL("./texts/zeno.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(zeno.scenes[0]?.title, "The Last Cigarette");
  assert.equal(zeno.title, "Confessions of Zeno");
  assert.doesNotMatch(zeno.note ?? "", /Poggioli|Zeno.s Conscience/);
});

test("Mira Emmeline FULL EN sits on Next, Rituals, and For you, never Featured", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const order = [
    "blacker",
    "a-lost-lady",
    "lady-macbeth",
    "summer",
    "jacob-s-room",
    "the-tenant-of-wildfell-hall",
    "herland",
    "the-last-man",
  ] as const;

  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-197, -195), ["blacker", "a-lost-lady"]);
  assert.equal(next.at(-195), "the-wanderer");
  assert.equal(next.includes("basilio"), true);
  assert.equal(next.includes("lady-macbeth"), false);
  assert.equal(next.includes("summer"), false);
  assert.equal(next.includes("the-last-man"), false);
  assert.equal(next.includes("madmen"), false);
  assert.deepEqual(sleep?.workIds.slice(-163, -156), [
    "blacker",
    "a-lost-lady",
    "lady-macbeth",
    "summer",
    "jacob-s-room",
    "the-tenant-of-wildfell-hall",
    "herland",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-192, -190), ["blacker", "a-lost-lady"]);
  assert.deepEqual(walk?.workIds.slice(-152, -150), ["blacker", "a-lost-lady"]);
  assert.equal(unwind?.workIds.at(-190), "the-wanderer");
  assert.equal(walk?.workIds.at(-150), "the-wanderer");
  assert.equal(bite?.workIds.at(-1), "lady-macbeth");
  assert.deepEqual(waking?.workIds.slice(-41, -36), [
    "lady-macbeth",
    "summer",
    "jacob-s-room",
    "the-tenant-of-wildfell-hall",
    "herland",
  ]);
  assert.deepEqual(forYou?.workIds.slice(-8, -3), [
    "summer",
    "jacob-s-room",
    "the-tenant-of-wildfell-hall",
    "herland",
    "the-last-man",
  ]);
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.equal(forYou?.workIds.includes("naomi"), false);
  assert.equal(forYou?.workIds.includes("madmen"), false);
  assert.equal(forYou?.workIds.includes("blacker"), false);
  assert.equal(forYou?.workIds.includes("lady-macbeth"), false);

  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("madmen"), false, lane.id);
    assert.equal(lane.workIds.includes("naomi"), false, lane.id);
    assert.equal(lane.workIds.includes("meaulnes"), false, lane.id);
  }

  const expectOpen = {
    blacker: { gutenberg: 78747, opening: "More acutely than ever before Emma Lou began to feel" },
    "a-lost-lady": { gutenberg: 65636, opening: "Thirty or forty years ago, in one of those grey towns" },
    "lady-macbeth": { gutenberg: undefined, opening: "In our part of the country you sometimes meet people" },
    summer: { gutenberg: 166, opening: "A girl came out of lawyer Royall's house" },
    "jacob-s-room": { gutenberg: 5670, opening: "\"So of course,\" wrote Betty Flanders" },
    "the-tenant-of-wildfell-hall": { gutenberg: 969, opening: "You must go back with me to the autumn of 1827." },
    herland: { gutenberg: 32, opening: "This is written from memory, unfortunately." },
    "the-last-man": { gutenberg: 18247, opening: "I am the native of a sea-surrounded nook" },
  } as const;

  for (const id of order) {
    const want = expectOpen[id];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    assert.equal(work.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    assert.equal(full.breaths[0]?.text.startsWith(want.opening.slice(0, 24)), true, id);
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.ok(opened.breaths.length <= 48, id);
    const openScene = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id: string }[] };
    assert.equal(openScene.scenes[0]?.id, "sit-0", id);
    assert.doesNotMatch(`${opened.note ?? ""}\n${full.note ?? ""}\n${work.intro ?? ""}`, /Salon|Vellum/);
    assert.doesNotMatch(`${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}`, /Featured|Salon|Vellum|gutenberg|public domain/i);
    if (id !== "lady-macbeth") assert.equal(full.breaths.length > 100, true, id);
  }

  const macbeth = JSON.parse(
    readFileSync(new URL("./texts/lady-macbeth.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(JSON.stringify(macbeth).includes("gutenberg.org"), false);
  assert.equal(SHELF.find((item) => item.id === "lady-macbeth")?.gutenberg, undefined);
  assert.equal(curatorialTrack("lady-macbeth"), "later");
  assert.equal(curatorialTrack("blacker"), "next");
  assert.equal(curatorialTrack("a-lost-lady"), "next");
  assert.equal(curatorialTrack("the-last-man"), "later");
  assert.equal(curatorialTrack("basilio"), "next");
  assert.equal(RITUAL_SIT_MINUTES["lady-macbeth"], 5);
  const basilio = SHELF.find((item) => item.id === "basilio");
  assert.equal(basilio?.gutenberg, 74442);
  assert.equal(basilio?.title, "Dragon’s Teeth");
  assert.equal(SHELF.find((item) => item.id === "naomi")?.local, true);

  const wanderer = SHELF.find((item) => item.id === "the-wanderer");
  assert.ok(wanderer);
  assert.equal(wanderer.local, true);
  assert.equal(wanderer.language, "English");
  assert.equal(wanderer.gutenberg, undefined);
  assert.equal(wanderer.year, 1928);
  assert.equal(wanderer.breaths, 1513);
  assert.match(wanderer.opening ?? "", /189…/);
  assert.equal(featured.includes("the-wanderer"), false);
  assert.equal(curatorialTrack("the-wanderer"), "next");
  assert.equal(forYou?.workIds.includes("the-wanderer"), false);
  const wandererFull = JSON.parse(
    readFileSync(new URL("./texts/the-wanderer.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const wandererOpen = JSON.parse(
    readFileSync(new URL("./openings/the-wanderer.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(wandererFull.breaths.length, 1513);
  assert.equal(wandererFull.scenes.length, 46);
  assert.ok(wandererFull.breaths.length > wandererOpen.breaths.length);
  assert.equal(wandererFull.breaths[0]?.text, wandererOpen.breaths[0]?.text);
  assert.equal((wandererOpen.scenes[0] as { id?: string } | undefined)?.id, "sit-0");
  assert.match(wandererFull.breaths[0]?.text ?? "", /189…/);
  assert.equal(JSON.stringify(wandererFull).includes("gutenberg.org"), false);

  const pascal = SHELF.find((item) => item.id === "the-late-mattia-pascal");
  const italian = SHELF.find((item) => item.id === "mattia");
  assert.ok(pascal && italian);
  assert.equal(pascal.local, true);
  assert.equal(pascal.language, "English");
  assert.equal(pascal.gutenberg, undefined);
  assert.equal(pascal.year, 1923);
  assert.equal(pascal.breaths, 1887);
  assert.equal(italian.local, undefined);
  assert.equal(italian.language, "Italian");
  assert.equal(italian.gutenberg, undefined);
  assert.equal(featured.includes("the-late-mattia-pascal"), false);
  assert.equal(curatorialTrack("the-late-mattia-pascal"), "later");
  assert.equal(forYou?.workIds.at(-3), "the-late-mattia-pascal");
  assert.equal(next.includes("the-late-mattia-pascal"), false);
  const pascalFull = JSON.parse(
    readFileSync(new URL("./texts/the-late-mattia-pascal.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const pascalOpen = JSON.parse(
    readFileSync(new URL("./openings/the-late-mattia-pascal.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(pascalFull.breaths.length, 1887);
  assert.equal(pascalFull.scenes.length, 19);
  assert.ok(pascalFull.breaths.length > pascalOpen.breaths.length);
  assert.equal(pascalFull.breaths[0]?.text, pascalOpen.breaths[0]?.text);
  assert.equal((pascalOpen.scenes[0] as { id?: string } | undefined)?.id, "sit-0");
  assert.match(pascalFull.breaths[0]?.text ?? "", /my name: Mattia Pascal/);
  assert.doesNotMatch(`${wanderer.intro ?? ""}\n${pascal.intro ?? ""}`, /Salon|Vellum|Featured|gutenberg|public domain/i);
});

test("Mira Fri ~10:04 CLEAR is Next lead Cabala, then Reuben and Sun, with Trooper and Garden Party on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-194, -191), [
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
  ]);
  assert.equal(next.at(-195), "the-wanderer");
  assert.equal(next.includes("trooper-peter-halket-of-mashonaland"), false);
  assert.equal(next.includes("the-garden-party-and-other-stories"), false);
  assert.equal(next.includes("trooper-peter-halket"), true);
  assert.ok(next.indexOf("mhudi") < next.indexOf("the-cabala"));
  assert.ok(next.indexOf("african-farm") < next.indexOf("the-cabala"));
  assert.ok(next.indexOf("nada-the-lily") < next.indexOf("the-cabala"));
  assert.notEqual(
    next.indexOf("the-sun-also-rises"),
    next.indexOf("blood-and-sand"),
  );
  assert.equal(next.includes("blood-and-sand"), true);
  assert.equal(featured.includes("the-bridge-of-san-luis-rey"), true);
  assert.equal(curatorialTrack("the-bridge-of-san-luis-rey"), "featured");

  assert.deepEqual(sleep?.workIds.slice(-154, -151), [
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
  ]);
  assert.equal(unwind?.workIds.at(-187), "the-sun-also-rises");
  assert.equal(walk?.workIds.at(-147), "the-sun-also-rises");
  assert.equal(sleep?.workIds.includes("trooper-peter-halket-of-mashonaland"), true);
  assert.equal(waking?.workIds.at(-35), "the-garden-party-and-other-stories");
  assert.equal(unwind?.workIds.includes("the-garden-party-and-other-stories"), true);
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");

  const lanes = {
    "the-cabala": "next",
    "reuben-sachs": "next",
    "the-sun-also-rises": "next",
    "trooper-peter-halket-of-mashonaland": "later",
    "the-garden-party-and-other-stories": "later",
  } as const;
  const opens = {
    "the-cabala": {
      gutenberg: 68105,
      year: 1926,
      breaths: 579,
      opening: "The train that first carried me into Rome was late",
      stop: "The air of Naples generates legend.",
    },
    "reuben-sachs": {
      gutenberg: 74419,
      year: 1888,
      breaths: 1669,
      opening: "Reuben Sachs was the pride of his family.",
      stop: "must marry money.",
    },
    "the-sun-also-rises": {
      gutenberg: 67138,
      year: 1926,
      breaths: 7771,
      opening: "Robert Cohn was once middleweight boxing champion of Princeton.",
      stop: "improved his nose.",
    },
    "trooper-peter-halket-of-mashonaland": {
      gutenberg: 1431,
      year: 1897,
      breaths: 411,
      opening: "It was a dark night",
      stop: "destroyed a native settlement.",
    },
    "the-garden-party-and-other-stories": {
      gutenberg: 1429,
      year: 1922,
      breaths: 5114,
      opening: "Very early morning.",
      stop: "out of sight.",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 48, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    if (id === "the-garden-party-and-other-stories") {
      assert.match(opened.scenes[0]?.title ?? "", /At the Bay/);
      assert.doesNotMatch(opened.breaths[0]?.text ?? "", /And after all the weather was ideal/);
      const em = opened.breaths.find((breath) => breath.text.includes("*whare*"));
      assert.ok(em, "whare italics");
      assert.ok(splitEmphasis(em.text).some((part) => part.type === "em" && part.value === "whare"));
    }
  }

  assert.doesNotMatch(RITUAL_PITCHES.bliss ?? "", /title story Bliss only/);
  assert.equal(curatorialTrack("bliss"), "later");
  assert.equal((next as readonly string[]).includes("bliss"), false);

  for (const id of [
    "savoy",
    "envy",
    "nettles",
    "wild-geese",
    "santa",
    "one-no-one",
    "quiroga",
    "madmen",
  ]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(next.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    for (const lane of RITUAL_LANES) {
      if (id === "madmen") assert.equal(lane.workIds.includes(id), false, lane.id);
    }
  }
});

test("Mira Fri ~2:04 noon CLEAR is Next lead Man of Property, then Awakening and Theresa, with Angels on For you and Cane on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-191, -188), [
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
  ]);
  assert.deepEqual(next.slice(-194, -191), [
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
  ]);
  assert.equal(next.includes("where-angels-fear-to-tread"), false);
  assert.equal(next.includes("cane"), false);
  assert.equal(next.includes("trooper-peter-halket-of-mashonaland"), false);
  assert.equal(next.includes("the-garden-party-and-other-stories"), false);

  assert.deepEqual(sleep?.workIds.slice(-151, -148), [
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
  ]);
  assert.equal(unwind?.workIds.at(-184), "theresa-raquin");
  assert.equal(walk?.workIds.at(-144), "theresa-raquin");
  assert.equal(waking?.workIds.at(-34), "cane");
  assert.equal(waking?.workIds.at(-35), "the-garden-party-and-other-stories");
  assert.equal(forYou?.workIds.at(-1), "where-angels-fear-to-tread");
  assert.equal(forYou?.workIds.at(-2), "generosity");
  assert.equal(forYou?.workIds.includes("cane"), false);
  assert.equal(forYou?.workIds.includes("the-awakening"), false);
  assert.equal(forYou?.workIds.includes("the-man-of-property"), false);
  assert.equal(forYou?.workIds.includes("theresa-raquin"), false);
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.equal(sleep?.workIds.includes("cane"), true);

  const lanes = {
    "the-man-of-property": "next",
    "the-awakening": "next",
    theresa: "next",
    "where-angels-fear-to-tread": "later",
    cane: "later",
  } as const;
  const opens = {
    "the-man-of-property": {
      gutenberg: 2559,
      year: 1906,
      breaths: 2798,
      scenes: 32,
      minutes: 7,
      opening: "Those privileged to be present at a family festival of the Forsytes",
      stop: "paid that visit in that hat?",
    },
    "the-awakening": {
      gutenberg: 160,
      year: 1899,
      breaths: 1066,
      scenes: 39,
      minutes: 5,
      opening: "A green and yellow parrot, which hung in a cage outside the door",
      stop: "bonbons and peanuts.",
    },
    "theresa-raquin": {
      gutenberg: 6626,
      year: 1867,
      breaths: 1150,
      scenes: 32,
      minutes: 5,
      opening: "At the end of the Rue Guénégaud",
      stop: "disdainful indifference.",
    },
    "where-angels-fear-to-tread": {
      gutenberg: 2948,
      year: 1905,
      breaths: 1302,
      scenes: 10,
      minutes: 4,
      opening: "They were all at Charing Cross",
      stop: "footwarmer",
    },
    cane: {
      gutenberg: 60093,
      year: 1923,
      breaths: 909,
      scenes: 29,
      minutes: 4,
      opening: "Her skin is like dusk on the eastern horizon",
      stop: "Goes down...",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const key = id === "theresa" ? "theresa-raquin" : id;
    const want = opens[key as keyof typeof opens];
    const work = SHELF.find((item) => item.id === key);
    assert.ok(work, key);
    assert.equal(work.local, true, key);
    assert.equal(work.year, want.year, key);
    assert.equal(work.gutenberg, want.gutenberg, key);
    assert.equal(work.breaths, want.breaths, key);
    assert.equal(RITUAL_SIT_MINUTES[key], want.minutes, key);
    assert.equal(featured.includes(key), false, key);
    assert.equal(isAdaptedBySalon(key), false, key);
    assert.equal(curatorialTrack(key), track, key);
    assert.match(work.opening ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${key}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${key}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    assert.equal(full.breaths.length, want.breaths, key);
    assert.equal(full.scenes.length, want.scenes, key);
    assert.ok(full.breaths.length > opened.breaths.length, key);
    assert.ok(opened.breaths.length <= 48, key);
    assert.equal(opened.scenes[0]?.id, "sit-0", key);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, key);
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, key);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, key);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(key)}\n${RITUAL_PITCHES[key] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      key,
    );
  }

  const property = JSON.parse(
    readFileSync(new URL("./openings/the-man-of-property.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const hat = property.breaths.find((breath) => breath.text.includes("*I*"));
  assert.ok(hat, "grey-hat italics");
  assert.ok(splitEmphasis(hat.text).some((part) => part.type === "em" && part.value === "I"));
  assert.doesNotMatch(property.breaths[0]?.text ?? "", /Macander|Irene|Soames/);
  const propertyFull = JSON.parse(
    readFileSync(new URL("./texts/the-man-of-property.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.match(propertyFull.scenes[0]?.title ?? "", /At Home/);
  assert.doesNotMatch(propertyFull.breaths[0]?.text ?? "", /Macander/);

  const caneOpen = JSON.parse(
    readFileSync(new URL("./openings/cane.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(caneOpen.scenes[0]?.title ?? "", /Karintha/);
  assert.equal(caneOpen.scenes.length, 1);
  assert.doesNotMatch(
    caneOpen.breaths.map((breath) => breath.text).join(" "),
    /Becky|Fern|Esther|Waldo Frank|FOREWORD/i,
  );
});

test("Mira Fri ~4:14 afternoon CLEAR is Next lead Confusion, then Pointed Roofs, Silas, and Indiana, with Wonder on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-188, -184), [
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
  ]);
  assert.deepEqual(next.slice(-191, -188), [
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
  ]);
  assert.equal(next.includes("the-book-of-wonder"), false);
  assert.equal(next.includes("the-cabala"), true);
  assert.equal(forYou?.workIds.includes("pointed-roofs"), false);
  assert.equal(forYou?.workIds.includes("the-rise-of-silas-lapham"), false);
  assert.equal(forYou?.workIds.includes("indiana"), false);
  assert.equal(forYou?.workIds.includes("the-book-of-wonder"), false);
  assert.equal(forYou?.workIds.includes("there-is-confusion"), true);
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-148, -144), [
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
  ]);
  assert.equal(unwind?.workIds.at(-180), "indiana");
  assert.equal(walk?.workIds.at(-140), "indiana");
  assert.equal(waking?.workIds.at(-33), "the-book-of-wonder");
  assert.equal(waking?.workIds.at(-34), "cane");
  assert.equal(curatorialTrack("the-book-of-wonder"), "later");
  assert.equal(featured.includes("mr-fortunes-maggot"), true);
  assert.equal(waking?.workIds.includes("carmilla"), false);

  const lanes = {
    "there-is-confusion": "next",
    "pointed-roofs": "next",
    "the-rise-of-silas-lapham": "next",
    indiana: "next",
    "the-book-of-wonder": "later",
  } as const;
  const opens = {
    "there-is-confusion": {
      gutenberg: 78915,
      year: 1924,
      breaths: 2005,
      scenes: 36,
      minutes: 8,
      opening: "Joanna’s first consciousness of the close understanding",
      stop: "maybe he put out a fire",
    },
    "pointed-roofs": {
      gutenberg: 3019,
      year: 1915,
      breaths: 1166,
      scenes: 10,
      minutes: 4,
      opening: "Miriam left the gaslit hall and went slowly upstairs.",
      stop: "governessing and old age",
    },
    "the-rise-of-silas-lapham": {
      gutenberg: 154,
      year: 1885,
      breaths: 2998,
      scenes: 27,
      minutes: 7,
      opening: "When Bartley Hubbard went to interview Silas Lapham",
      stop: "mineral paint on the old farm yourself",
    },
    indiana: {
      gutenberg: 63445,
      year: 1832,
      breaths: 1280,
      scenes: 31,
      minutes: 6,
      opening: "On a certain cool, rainy evening in autumn, in a small château in Brie",
      stop: "fitting subject for Rembrandt",
    },
    "the-book-of-wonder": {
      gutenberg: 7477,
      year: 1912,
      breaths: 218,
      scenes: 16,
      minutes: 9,
      opening: "Come with me, ladies and gentlemen who are in any wise weary of London",
      stop: "These were his wedding bells.",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 48, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const roofs = JSON.parse(
    readFileSync(new URL("./openings/pointed-roofs.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(roofs.breaths.map((breath) => breath.text).join("\n").includes("Beresford"), false);
  assert.match(roofs.breaths.map((breath) => breath.text).join("\n"), /Fraeulein/);
  assert.match(roofs.breaths.map((breath) => breath.text).join("\n"), /Saratoga trunk/);
  const perfectly = roofs.breaths.find((breath) => breath.text.includes("*perfectly*"));
  assert.ok(perfectly, "perfectly italics");
  assert.ok(splitEmphasis(perfectly.text).some((part) => part.type === "em" && part.value === "perfectly"));

  const wonder = JSON.parse(
    readFileSync(new URL("./openings/the-book-of-wonder.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(wonder.scenes[0]?.title ?? "", /Bride of the Man-Horse/);
  assert.doesNotMatch(
    wonder.breaths.map((breath) => breath.text).join("\n"),
    /Thangobrind/,
  );

  const indianaOpen = JSON.parse(
    readFileSync(new URL("./openings/indiana.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(indianaOpen.scenes[0]?.title ?? "", /Part First/);
  assert.doesNotMatch(
    indianaOpen.breaths.map((breath) => breath.text).join("\n"),
    /PREFACE|illustration/i,
  );

  const silas = JSON.parse(
    readFileSync(new URL("./openings/the-rise-of-silas-lapham.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.match(silas.breaths[0]?.text ?? "", /Solid Men of Boston/);
  assert.doesNotMatch(silas.breaths[0]?.text ?? "", /^THE Rise/);
});

test("Mira Fri ~7:14 evening CLEAR is Next lead Hidden Force, then Home, Hunger, and Jude, with Dubliners Araby on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-184, -180), [
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
  ]);
  assert.deepEqual(next.slice(-188, -184), [
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
  ]);
  assert.deepEqual(next.slice(-191, -188), [
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
  ]);
  assert.equal(next.includes("the-cabala"), true);
  assert.equal(next.includes("dubliners"), false);
  assert.equal(forYou?.workIds.includes("the-hidden-force"), false);
  assert.equal(forYou?.workIds.includes("the-home-and-the-world"), false);
  assert.equal(forYou?.workIds.includes("hunger"), false);
  assert.equal(forYou?.workIds.includes("jude-the-obscure"), false);
  assert.equal(forYou?.workIds.includes("dubliners"), false);
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-144, -140), [
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
  ]);
  assert.equal(unwind?.workIds.at(-176), "jude-the-obscure");
  assert.equal(walk?.workIds.at(-136), "jude-the-obscure");
  assert.equal(unwind?.workIds.at(-180), "indiana");
  assert.equal(waking?.workIds.at(-32), "dubliners");
  assert.equal(waking?.workIds.at(-33), "the-book-of-wonder");
  assert.equal(featured.includes("enchanted-april"), true);
  assert.equal(curatorialTrack("dubliners"), "later");
  assert.equal(curatorialTrack("anandamath"), "later");
  assert.equal(curatorialTrack("the-home-and-the-world"), "next");
  assert.notEqual(
    SHELF.find((item) => item.id === "the-home-and-the-world")?.gutenberg,
    SHELF.find((item) => item.id === "anandamath")?.gutenberg,
  );

  const lanes = {
    "the-hidden-force": "next",
    "the-home-and-the-world": "next",
    hunger: "next",
    "jude-the-obscure": "next",
    dubliners: "later",
  } as const;
  const opens = {
    "the-hidden-force": {
      gutenberg: 34725,
      year: 1900,
      breaths: 1323,
      scenes: 32,
      minutes: 5,
      opening: "The full moon wore the hue of tragedy that evening.",
      stop: "a small monument with a pointed spire.",
    },
    "the-home-and-the-world": {
      gutenberg: 7166,
      year: 1916,
      breaths: 1461,
      scenes: 12,
      minutes: 6,
      opening: "Mother, today there comes back to mind the vermilion mark",
      stop: "through the path of the metre.",
    },
    hunger: {
      gutenberg: 8387,
      year: 1890,
      breaths: 1239,
      scenes: 4,
      minutes: 5,
      opening: "It was during the time I wandered about and starved in Christiania",
      stop: "each trifling incident that crossed or vanished from my path impress me.",
    },
    "jude-the-obscure": {
      gutenberg: 153,
      year: 1895,
      breaths: 3562,
      scenes: 53,
      minutes: 6,
      opening: "The schoolmaster was leaving the village, and everybody seemed sorry.",
      stop: "eighteen-penny cast-iron crosses warranted to last five years.",
    },
    dubliners: {
      gutenberg: 2814,
      year: 1914,
      breaths: 1671,
      scenes: 15,
      minutes: 12,
      opening: "North Richmond Street, being blind",
      stop: "my eyes burned with anguish and anger.",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit;
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 48, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const hidden = JSON.parse(
    readFileSync(new URL("./openings/the-hidden-force.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const hiddenJoin = hidden.breaths.map((breath) => breath.text).join("\n");
  assert.match(hiddenJoin, /Lange Laan/);
  assert.match(hiddenJoin, /Residency/);
  assert.doesNotMatch(hiddenJoin, /Translator's Note|CONTENTS/i);

  const home = JSON.parse(
    readFileSync(new URL("./openings/the-home-and-the-world.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const homeJoin = home.breaths.map((breath) => breath.text).join("\n");
  assert.match(homeJoin, /vermilion/);
  assert.match(homeJoin, /ideal wife/);
  assert.doesNotMatch(homeJoin, /Eldred/);

  const hungerOpen = JSON.parse(
    readFileSync(new URL("./openings/hunger.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const hungerJoin = hungerOpen.breaths.map((breath) => breath.text).join("\n");
  assert.match(hungerJoin, /attic/);
  assert.match(hungerJoin, /strike six/);
  assert.doesNotMatch(hungerJoin, /Björkman|Bjorkman/);

  const jude = JSON.parse(
    readFileSync(new URL("./openings/jude-the-obscure.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(jude.scenes[0]?.title ?? "", /Marygreen/);
  assert.doesNotMatch(jude.breaths[0]?.text ?? "", /^Part First AT MARYGREEN/);

  const araby = JSON.parse(
    readFileSync(new URL("./openings/dubliners.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.equal(araby.scenes[0]?.title, "Araby");
  assert.equal(araby.scenes.length, 1);
  assert.doesNotMatch(
    araby.breaths.map((breath) => breath.text).join("\n"),
    /Gabriel Conroy|The Dead/,
  );

  assert.equal(next.includes("ecstasy"), false);
  assert.notEqual(
    SHELF.find((item) => item.id === "the-hidden-force")?.gutenberg,
    SHELF.find((item) => item.id === "ecstasy")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "hunger")?.gutenberg,
    SHELF.find((item) => item.id === "growth-of-the-soil")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "jude-the-obscure")?.gutenberg,
    SHELF.find((item) => item.id === "tess-of-the-durbervilles")?.gutenberg,
  );
  assert.equal(waking?.workIds.includes("irish-fairy-tales"), true);
  assert.notEqual(waking?.workIds.at(-31), "irish-fairy-tales");
  assert.equal(waking?.workIds.at(-31), "strange-tales");
});

test("Mira Fri ~6PM CLEAR is Next lead High Wind, then Vera, Futility, and The Comedienne, with Strange Tales Painted Wall on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-180, -176), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.deepEqual(next.slice(-184, -180), [
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
  ]);
  assert.equal(next.includes("strange-tales"), true);
  assert.equal(next.slice(-180, -176).includes("strange-tales"), false);
  for (const id of [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
    "strange-tales",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-140, -136), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-175, -171), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.deepEqual(walk?.workIds.slice(-135, -131), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.equal(waking?.workIds.at(-31), "strange-tales");
  assert.equal(waking?.workIds.at(-32), "dubliners");
  assert.equal(curatorialTrack("strange-tales"), "next");
  assert.equal(curatorialTrack("futility"), "next");
  assert.notEqual(
    SHELF.find((item) => item.id === "high-wind-jamaica")?.gutenberg,
    SHELF.find((item) => item.id === "jamaica-anansi-stories")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "vera")?.gutenberg,
    SHELF.find((item) => item.id === "enchanted-april")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "futility")?.gutenberg,
    SHELF.find((item) => item.id === "hunger")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "the-comedienne")?.gutenberg,
    SHELF.find((item) => item.id === "the-peasants")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "strange-tales")?.gutenberg,
    SHELF.find((item) => item.id === "kwaidan-stories-and-studies-of-strange-things")?.gutenberg,
  );

  const lanes = {
    "high-wind-jamaica": "next",
    vera: "next",
    futility: "next",
    "the-comedienne": "next",
    "strange-tales": "next",
  } as const;
  const opens = {
    "high-wind-jamaica": {
      gutenberg: 75530,
      year: 1929,
      breaths: 1487,
      scenes: 10,
      minutes: 5,
      opening: "One of the fruits of Emancipation in the West Indian islands",
      stop: "as ready to eat snakes as ever.",
    },
    vera: {
      gutenberg: 34366,
      year: 1921,
      breaths: 1725,
      scenes: 32,
      minutes: 6,
      opening: "When the doctor had gone, and the two women from the village",
      stop: "towards the gate again.",
    },
    futility: {
      gutenberg: 77253,
      year: 1922,
      breaths: 1522,
      scenes: 33,
      minutes: 6,
      opening: "When the \\*Simbirsk\\*, of the Russian Volunteer Fleet",
      stop: "Nikolai Vasilievich\\?",
    },
    "the-comedienne": {
      gutenberg: 25760,
      year: 1896,
      breaths: 3096,
      scenes: 11,
      minutes: 6,
      opening: "Bukowiec, a station on the Dombrowa railroad",
      stop: "peasant-like distrust.",
    },
    "strange-tales": {
      gutenberg: 43629,
      year: 1880,
      breaths: 470,
      scenes: 152,
      minutes: 5,
      opening: "A Kiang-si gentleman, named Mêng Lung-t‘an",
      stop: "went away.",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[] };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 48, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    if (id === "futility") {
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
      assert.equal(full.breaths[1]?.text, opened.breaths[0]?.text, id);
      assert.doesNotMatch(opened.breaths.map((breath) => breath.text).join("\n"), /Wharton|preface/i);
      assert.doesNotMatch(
        full.breaths.slice(0, 4).map((breath) => breath.text).join("\n"),
        /Wharton/,
      );
    } else {
      assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const wind = JSON.parse(
    readFileSync(new URL("./openings/high-wind-jamaica.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const windJoin = wind.breaths.map((breath) => breath.text).join("\n");
  assert.match(windJoin, /Ferndale/);
  assert.match(windJoin, /negress/);
  assert.doesNotMatch(wind.breaths[0]?.text ?? "", /^A HIGH WIND|^Title|^CHAPTER/i);

  const comedienne = JSON.parse(
    readFileSync(new URL("./openings/the-comedienne.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.doesNotMatch(
    comedienne.breaths.map((breath) => breath.text).join("\n"),
    /Publishers’ Note|Publishers' Note/,
  );

  const painted = JSON.parse(
    readFileSync(new URL("./openings/strange-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.equal(painted.scenes[0]?.title, "The Painted Wall");
  assert.doesNotMatch(
    painted.breaths.map((breath) => breath.text).join("\n"),
    /Giles’ Introduction|Giles's Introduction|INTRODUCTION/,
  );
  const studio = JSON.parse(
    readFileSync(new URL("./texts/strange-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.ok(studio.scenes.length > 1);
  assert.ok(
    studio.scenes.some((scene) => /Examination for the Post of Guardian Angel/.test(scene.title ?? "")),
  );
});

test("Mira Sat AM CLEAR is Next lead Moon and Sixpence, then Brilliant Career, Plumed Serpent, and Red Room, with Fortune-Teller on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-176, -172), [
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
  ]);
  assert.deepEqual(next.slice(-180, -176), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.equal(next.includes("brazilian-tales"), false);
  assert.equal(next.slice(-176, -172).includes("brazilian-tales"), false);
  for (const id of [
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
    "brazilian-tales",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-136, -132), [
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-171, -167), [
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
  ]);
  assert.deepEqual(walk?.workIds.slice(-131, -127), [
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
  ]);
  assert.equal(waking?.workIds.at(-30), "brazilian-tales");
  assert.equal(waking?.workIds.at(-31), "strange-tales");
  assert.equal(curatorialTrack("the-moon-and-sixpence"), "next");
  assert.equal(curatorialTrack("brazilian-tales"), "later");
  assert.notEqual(
    SHELF.find((item) => item.id === "the-moon-and-sixpence")?.gutenberg,
    SHELF.find((item) => item.id === "the-painted-veil")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "my-brilliant-career")?.gutenberg,
    SHELF.find((item) => item.id === "the-getting-of-wisdom")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "the-plumed-serpent")?.gutenberg,
    SHELF.find((item) => item.id === "underdogs")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "the-red-room")?.gutenberg,
    SHELF.find((item) => item.id === "hunger")?.gutenberg,
  );
  assert.notEqual(
    SHELF.find((item) => item.id === "the-red-room")?.gutenberg,
    SHELF.find((item) => item.id === "the-inferno")?.gutenberg,
  );
  assert.equal(SHELF.find((item) => item.id === "brazilian-tales")?.gutenberg, 21040);
  assert.equal(SHELF.find((item) => item.id === "attendants-confession")?.gutenberg, 21040);
  assert.notEqual(
    SHELF.find((item) => item.id === "brazilian-tales")?.opening,
    SHELF.find((item) => item.id === "attendants-confession")?.opening,
  );

  const lanes = {
    "the-moon-and-sixpence": "next",
    "my-brilliant-career": "next",
    "the-plumed-serpent": "next",
    "the-red-room": "next",
    "brazilian-tales": "later",
  } as const;
  const opens = {
    "the-moon-and-sixpence": {
      gutenberg: 222,
      year: 1919,
      breaths: 1726,
      scenes: 58,
      minutes: 7,
      opening: "I confess that when first I made acquaintance with Charles Strickland",
      stop: "Rev\\. Robert Strickland is not",
    },
    "my-brilliant-career": {
      gutenberg: 11620,
      year: 1901,
      breaths: 1819,
      scenes: 38,
      minutes: 6,
      opening: "“Boo, hoo! Ow, ow; Oh! oh! Me’ll die",
      stop: "Caddagat",
    },
    "the-plumed-serpent": {
      gutenberg: 73677,
      year: 1926,
      breaths: 4982,
      scenes: 27,
      minutes: 6,
      opening: "It was the Sunday after Easter",
      stop: "Owen disapproved",
    },
    "the-red-room": {
      gutenberg: 37039,
      year: 1879,
      breaths: 2953,
      scenes: 30,
      minutes: 6,
      opening: "It was an evening in the beginning of May",
      stop: "St\\. Clara",
    },
    "brazilian-tales": {
      gutenberg: 21040,
      year: 1921,
      breaths: 365,
      scenes: 6,
      minutes: 12,
      opening: "Hamlet observes to Horatio",
      stop: "Villela made no reply",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[] };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 62, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|SPECIAL NOTICE|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const fortune = JSON.parse(
    readFileSync(new URL("./openings/brazilian-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(fortune.scenes[0]?.title ?? "", /Fortune-Teller/);
  assert.doesNotMatch(
    fortune.breaths.map((breath) => breath.text).join("\n"),
    /Attendant|INTRODUCTION|Goldberg/,
  );
  const cycle = JSON.parse(
    readFileSync(new URL("./texts/brazilian-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.equal(cycle.scenes[0]?.title, "The Fortune-Teller");
  assert.ok(cycle.scenes.some((scene) => /Attendant/.test(scene.title ?? "")));
  assert.equal(SHELF.find((item) => item.id === "the-red-room")?.language, "English");
  assert.match(SHELF.find((item) => item.id === "the-red-room")?.author ?? "", /Schleussner/);
});

test("Mira Sat MIDDAY CLEAR is Next lead Green Carnation, then Hajji, Purple Land, and Ballantrae, with Gaspar Ruiz on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-172, -168), [
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
  ]);
  assert.deepEqual(next.slice(-176, -172), [
    "the-moon-and-sixpence",
    "my-brilliant-career",
    "the-plumed-serpent",
    "the-red-room",
  ]);
  assert.equal(next.includes("a-set-of-six"), false);
  assert.equal(next.slice(-172, -168).includes("a-set-of-six"), false);
  for (const id of [
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
    "a-set-of-six",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-132, -128), [
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-167, -163), [
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
  ]);
  assert.deepEqual(walk?.workIds.slice(-127, -123), [
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
  ]);
  assert.equal(waking?.workIds.at(-29), "a-set-of-six");
  assert.equal(waking?.workIds.at(-30), "brazilian-tales");
  assert.equal(curatorialTrack("the-green-carnation"), "next");
  assert.equal(curatorialTrack("hajji-baba"), "next");
  assert.equal(curatorialTrack("the-purple-land"), "next");
  assert.equal(curatorialTrack("the-master-of-ballantrae"), "next");
  assert.equal(curatorialTrack("a-set-of-six"), "later");
  assert.notEqual(
    SHELF.find((item) => item.id === "the-purple-land")?.gutenberg,
    SHELF.find((item) => item.id === "green-mansions")?.gutenberg,
  );
  assert.equal(SHELF.find((item) => item.id === "the-purple-land")?.year, 1885);

  const lanes = {
    "the-green-carnation": "next",
    "hajji-baba": "next",
    "the-purple-land": "next",
    "the-master-of-ballantrae": "next",
    "a-set-of-six": "later",
  } as const;
  const opens = {
    "the-green-carnation": {
      gutenberg: 24499,
      year: 1894,
      breaths: 847,
      scenes: 15,
      minutes: 6,
      opening: "He slipped a green carnation into his evening coat",
      stop: "Lady Locke--Lord Reginald Hastings",
    },
    "hajji-baba": {
      gutenberg: 21331,
      year: 1824,
      breaths: 1809,
      scenes: 80,
      minutes: 5,
      opening: "My father, Kerbelai Hassan, was one of the most celebrated barbers of Ispahan",
      stop: "inauspicious circumstances",
    },
    "the-purple-land": {
      gutenberg: 7132,
      year: 1885,
      breaths: 1220,
      scenes: 29,
      minutes: 6,
      opening: "Three chapters in the story of my life",
      stop: "felt offended at what we had done",
    },
    "the-master-of-ballantrae": {
      gutenberg: 864,
      year: 1889,
      breaths: 1241,
      scenes: 12,
      minutes: 6,
      opening: "The full truth of this odd matter",
      stop: "ride by his King’s bridle",
    },
    "a-set-of-six": {
      gutenberg: 2305,
      year: 1908,
      breaths: 1336,
      scenes: 6,
      minutes: 6,
      opening: "A revolutionary war raises many strange characters",
      stop: "the detachment was running away",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[] };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 62, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const gaspar = JSON.parse(
    readFileSync(new URL("./openings/a-set-of-six.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.equal(gaspar.scenes[0]?.title, "Gaspar Ruiz");
  assert.doesNotMatch(
    gaspar.breaths.map((breath) => breath.text).join("\n"),
    /Author’s Note|The Informer|Il Conde/,
  );
  const cycle = JSON.parse(
    readFileSync(new URL("./texts/a-set-of-six.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.equal(cycle.scenes[0]?.title, "Gaspar Ruiz");
  assert.ok(cycle.scenes.some((scene) => scene.title === "The Informer"));
  assert.ok(cycle.scenes.some((scene) => scene.title === "Il Conde"));
  assert.match(SHELF.find((item) => item.id === "hajji-baba")?.intro ?? "", /Period Orientalism is left as printed/);
  assert.match(SHELF.find((item) => item.id === "hajji-baba")?.intro ?? "", /1824/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "hajji-baba")?.intro ?? "", /1895|this printing/);
  assert.ok((SHELF.find((item) => item.id === "hajji-baba")?.intro ?? "").includes("Morier’s novel, first published in 1824."));
});

test("Mira Sat AFTERNOON CLEAR is Next lead Hill of Dreams, then African Farm, The Imperialist, and Kim, with Mogens on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-168, -164), [
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
  ]);
  assert.deepEqual(next.slice(-172, -168), [
    "the-green-carnation",
    "hajji-baba",
    "the-purple-land",
    "the-master-of-ballantrae",
  ]);
  assert.equal(next.includes("mogens-and-other-stories"), false);
  assert.equal(next.includes("african-farm"), true);
  assert.ok(next.indexOf("african-farm") < next.indexOf("the-story-of-an-african-farm"));
  for (const id of [
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
    "mogens-and-other-stories",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-128, -124), [
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-163, -159), [
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
  ]);
  assert.deepEqual(walk?.workIds.slice(-123, -119), [
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
  ]);
  assert.equal(waking?.workIds.at(-28), "mogens-and-other-stories");
  assert.equal(waking?.workIds.at(-29), "a-set-of-six");
  assert.equal(curatorialTrack("the-hill-of-dreams"), "next");
  assert.equal(curatorialTrack("the-story-of-an-african-farm"), "next");
  assert.equal(curatorialTrack("the-imperialist"), "next");
  assert.equal(curatorialTrack("kim"), "next");
  assert.equal(curatorialTrack("mogens-and-other-stories"), "later");
  assert.equal(curatorialTrack("calvary"), "next");
  assert.equal(SHELF.find((item) => item.id === "african-farm")?.breaths, 6189);
  assert.equal(SHELF.find((item) => item.id === "mogens")?.breaths, 477);
  assert.equal(SHELF.find((item) => item.id === "the-imperialist")?.year, 1904);
  assert.equal(SHELF.find((item) => item.id === "mogens-and-other-stories")?.year, 1882);

  const lanes = {
    "the-hill-of-dreams": "next",
    "the-story-of-an-african-farm": "next",
    "the-imperialist": "next",
    kim: "next",
    "mogens-and-other-stories": "later",
  } as const;
  const opens = {
    "the-hill-of-dreams": {
      gutenberg: 13969,
      year: 1907,
      breaths: 443,
      scenes: 7,
      minutes: 6,
      opening: "There was a glow in the sky as if great furnace doors were opened",
      stop: "awful furnace doors were being opened",
    },
    "the-story-of-an-african-farm": {
      gutenberg: 1441,
      year: 1883,
      breaths: 2330,
      scenes: 27,
      minutes: 6,
      opening: "The full African moon poured down its light",
      stop: "He grovelled on the floor",
    },
    "the-imperialist": {
      gutenberg: 5301,
      year: 1904,
      breaths: 1372,
      scenes: 33,
      minutes: 7,
      opening: "old Mother Beggarlegs",
      stop: "outlawry the delightful fact",
    },
    kim: {
      gutenberg: 2226,
      year: 1901,
      breaths: 2574,
      scenes: 15,
      minutes: 6,
      opening: "astride the gun Zam Zammah",
      stop: "ask the Curator to explain",
    },
    "mogens-and-other-stories": {
      gutenberg: 6765,
      year: 1882,
      breaths: 476,
      scenes: 4,
      minutes: 6,
      opening: "Summer it was; in the middle of the day",
      stop: "all the way along the hedge",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[] };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.ok(opened.breaths.length <= 62, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const imperialist = JSON.parse(
    readFileSync(new URL("./openings/the-imperialist.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(imperialist.breaths[0]?.text.trim().split(/\s+/).length, 585);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-imperialist")?.intro ?? "", /585|first breath/);
  assert.ok((SHELF.find((item) => item.id === "the-imperialist")?.intro ?? "").endsWith("Duncan’s 1904 novel, Elgin, Ontario."));
  assert.match(SHELF.find((item) => item.id === "kim")?.intro ?? "", /period racial language, left as printed/);
  assert.match(
    imperialist.breaths.map((breath) => breath.text).join("\n") +
      JSON.parse(readFileSync(new URL("./openings/kim.json", import.meta.url), "utf8")).breaths
        .map((breath: { text: string }) => breath.text)
        .join("\n"),
    /half-caste|natives/,
  );

  const mogensOpen = JSON.parse(
    readFileSync(new URL("./openings/mogens-and-other-stories.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(mogensOpen.scenes[0]?.title ?? "", /Mogens/);
  assert.doesNotMatch(
    mogensOpen.breaths.map((breath) => breath.text).join("\n"),
    /Introduction|The Plague in Bergamo|Mrs\. Fonss/,
  );
  const mogensCycle = JSON.parse(
    readFileSync(new URL("./texts/mogens-and-other-stories.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(mogensCycle.scenes[0]?.title, "Mogens");
  assert.ok(mogensCycle.scenes.some((scene) => scene.title === "The Plague in Bergamo"));
  assert.ok(mogensCycle.scenes.some((scene) => scene.title === "There Should Have Been Roses"));
  assert.ok(mogensCycle.scenes.some((scene) => scene.title === "Mrs. Fonss"));
  assert.equal(mogensCycle.year, "1882 / 1921");
});

test("Mira Sat EVENING CLEAR is Next lead Road to the Open, then Calvary, Anna, and Small Souls, with Bontzye on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-164, -160), [
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
  ]);
  assert.deepEqual(next.slice(-168, -164), [
    "the-hill-of-dreams",
    "the-story-of-an-african-farm",
    "the-imperialist",
    "kim",
  ]);
  assert.equal(next.includes("stories-and-pictures"), false);
  assert.ok(next.indexOf("the-road-to-the-open") < next.lastIndexOf("the-road-to-the-open"));
  assert.ok(next.indexOf("calvary") < next.lastIndexOf("calvary"));
  assert.ok(next.indexOf("small-souls") < next.lastIndexOf("small-souls"));
  assert.equal(next.includes("bontshe-the-silent"), true);
  assert.ok(next.indexOf("bontshe-the-silent") < next.lastIndexOf("the-road-to-the-open"));
  for (const id of [
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
    "stories-and-pictures",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-124, -120), [
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-159, -155), [
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
  ]);
  assert.deepEqual(walk?.workIds.slice(-119, -115), [
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
  ]);
  assert.equal(waking?.workIds.at(-27), "stories-and-pictures");
  assert.equal(waking?.workIds.at(-28), "mogens-and-other-stories");
  assert.equal(curatorialTrack("the-road-to-the-open"), "next");
  assert.equal(curatorialTrack("calvary"), "next");
  assert.equal(curatorialTrack("anna-of-the-five-towns"), "next");
  assert.equal(curatorialTrack("small-souls"), "next");
  assert.equal(curatorialTrack("stories-and-pictures"), "later");
  assert.equal(curatorialTrack("bontshe-the-silent"), "next");
  assert.equal(SHELF.find((item) => item.id === "bontshe-the-silent")?.breaths, 99);
  assert.equal(SHELF.find((item) => item.id === "bertha-garlan")?.breaths, 1269);

  const lanes = {
    "the-road-to-the-open": "next",
    calvary: "next",
    "anna-of-the-five-towns": "next",
    "small-souls": "next",
    "stories-and-pictures": "later",
  } as const;
  const opens = {
    "the-road-to-the-open": {
      gutenberg: 45895,
      year: 1908,
      breaths: 2729,
      scenes: 9,
      minutes: 6,
      opening: "George von Wergenthin sat at table quite alone",
      stop: "nothing at all to do with his musical career",
    },
    calvary: {
      gutenberg: 48773,
      year: 1886,
      breaths: 1342,
      scenes: 12,
      minutes: 6,
      opening: "I was born one evening in October at Saint-Michel-les-Hêtres",
      stop: "thoughts which birds ever inspired in him",
    },
    "anna-of-the-five-towns": {
      gutenberg: 35505,
      year: 1902,
      breaths: 1655,
      scenes: 14,
      minutes: 6,
      opening: "The yard was all silent and empty",
      stop: "finally began to read her book",
    },
    "small-souls": {
      gutenberg: 34021,
      year: 1901,
      breaths: 2972,
      scenes: 39,
      minutes: 7,
      opening: "It was pouring with rain",
      stop: "good-bye for the present, Karel",
    },
    "stories-and-pictures": {
      gutenberg: 37242,
      year: 1894,
      breaths: 3115,
      scenes: 26,
      minutes: 12,
      opening: "Down here, in \\*this\\* world, Bontzye Shweig",
      stop: "the prosecutor laughed",
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[] };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const anna = JSON.parse(
    readFileSync(new URL("./openings/anna-of-the-five-towns.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(anna.breaths[0]?.text.trim().split(/\s+/).length, 371);
  assert.doesNotMatch(SHELF.find((item) => item.id === "anna-of-the-five-towns")?.intro ?? "", /371|first breath/);
  assert.ok((SHELF.find((item) => item.id === "anna-of-the-five-towns")?.intro ?? "").endsWith("Bennett’s 1902 novel."));
  assert.doesNotMatch(SHELF.find((item) => item.id === "anna-of-the-five-towns")?.intro ?? "", /not London/);
  const calvaryOpen = JSON.parse(
    readFileSync(new URL("./openings/calvary.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.doesNotMatch(calvaryOpen.breaths.map((breath) => breath.text).join("\n"), /Paris/);
  assert.match(SHELF.find((item) => item.id === "calvary")?.intro ?? "", /Orne/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "calvary")?.intro ?? "", /Paris/);
  const pictures = JSON.parse(
    readFileSync(new URL("./openings/stories-and-pictures.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(pictures.scenes[0]?.title ?? "", /Bontzye Shweig/);
  assert.equal(pictures.breaths.length, 99);
  const cycle = JSON.parse(
    readFileSync(new URL("./texts/stories-and-pictures.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.equal(cycle.scenes[0]?.title, "Bontzye Shweig");
  assert.ok(cycle.scenes.some((scene) => scene.title === "If Not Higher"));
  assert.equal(cycle.scenes.some((scene) => /glossary/i.test(scene.title ?? "")), false);
  const silent = JSON.parse(
    readFileSync(new URL("./texts/bontshe-the-silent.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(silent.scenes.length, 1);
  assert.equal(silent.breaths.length, 99);
});

test("Mira Sat 6PM CLEAR is Next lead White Jacket, then Nightingale, Chapdelaine, and Medlar, with Suan on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-160, -156), [
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
  ]);
  assert.deepEqual(next.slice(-164, -160), [
    "the-road-to-the-open",
    "calvary",
    "anna-of-the-five-towns",
    "small-souls",
  ]);
  assert.equal(next.slice(-160, -156).includes("filipino-popular-tales"), false);
  assert.equal(next.includes("filipino-popular-tales"), true);
  assert.ok(next.indexOf("white-jacket") < next.lastIndexOf("white-jacket"));
  assert.ok(next.indexOf("maria-chapdelaine") < next.lastIndexOf("maria-chapdelaine"));
  assert.ok(
    next.indexOf("the-house-by-the-medlar-tree") < next.lastIndexOf("the-house-by-the-medlar-tree"),
  );
  assert.equal(next.indexOf("a-japanese-nightingale"), next.lastIndexOf("a-japanese-nightingale"));
  assert.ok(next.indexOf("filipino-popular-tales") < next.lastIndexOf("white-jacket"));
  for (const id of [
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
    "filipino-popular-tales",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-120, -116), [
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-155, -151), [
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
  ]);
  assert.deepEqual(walk?.workIds.slice(-115, -111), [
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
  ]);
  assert.equal(waking?.workIds.at(-26), "filipino-popular-tales");
  assert.equal(waking?.workIds.at(-27), "stories-and-pictures");
  assert.equal(curatorialTrack("white-jacket"), "next");
  assert.equal(curatorialTrack("a-japanese-nightingale"), "next");
  assert.equal(curatorialTrack("maria-chapdelaine"), "next");
  assert.equal(curatorialTrack("the-house-by-the-medlar-tree"), "next");
  assert.equal(curatorialTrack("filipino-popular-tales"), "next");
  assert.equal(SHELF.find((item) => item.id === "malavoglia")?.breaths, 1304);

  const lanes = {
    "white-jacket": "next",
    "a-japanese-nightingale": "next",
    "maria-chapdelaine": "next",
    "the-house-by-the-medlar-tree": "next",
    "filipino-popular-tales": "next",
  } as const;
  const opens = {
    "white-jacket": {
      gutenberg: 10712,
      year: 1850,
      breaths: 1994,
      scenes: 93,
      minutes: 4,
      opening: "It was not a \\*very\\* white jacket",
      stop: "White Lady of Avenel",
      firstWords: 18,
    },
    "a-japanese-nightingale": {
      gutenberg: 63181,
      year: 1901,
      breaths: 932,
      scenes: 18,
      minutes: 6,
      opening: "The last rays of sunset were tingeing the land",
      stop: "waiting for the end",
      firstWords: 90,
    },
    "maria-chapdelaine": {
      gutenberg: 4383,
      year: 1913,
      breaths: 762,
      scenes: 16,
      minutes: 6,
      opening: "The door opened, and the men of the congregation",
      stop: "grown up together from infancy",
      firstWords: 18,
    },
    "the-house-by-the-medlar-tree": {
      gutenberg: 54684,
      year: 1881,
      breaths: 1303,
      scenes: 15,
      minutes: 6,
      opening: "Once the Malavoglia were as numerous",
      stop: "forgot their aching hearts",
      firstWords: 233,
    },
    "filipino-popular-tales": {
      gutenberg: 8299,
      year: 1921,
      breaths: 1868,
      scenes: 82,
      minutes: 3,
      opening: "There was once an old woman who had an only son named Suan",
      stop: "nobody doubted Suan's merit",
      firstWords: 99,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const jacket = JSON.parse(
    readFileSync(new URL("./openings/white-jacket.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(jacket.scenes[0]?.title ?? "", /Callao/);
  assert.doesNotMatch(jacket.breaths.map((breath) => breath.text).join("\n"), /^NOTE\b/m);
  const night = JSON.parse(
    readFileSync(new URL("./openings/a-japanese-nightingale.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.doesNotMatch(
    night.breaths.map((breath) => breath.text).join("\n"),
    /ILLUSTRATIONS|LIST OF ILLUSTRATIONS/,
  );
  const mariaOpen = JSON.parse(
    readFileSync(new URL("./openings/maria-chapdelaine.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.doesNotMatch(mariaOpen.breaths.map((breath) => breath.text).join("\n"), /Ite, missa est/);
  const mariaFull = JSON.parse(
    readFileSync(new URL("./texts/maria-chapdelaine.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(mariaFull.year, "1913 / 1921");
  const medlarOpen = JSON.parse(
    readFileSync(new URL("./openings/the-house-by-the-medlar-tree.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.doesNotMatch(medlarOpen.breaths.map((breath) => breath.text).join("\n"), /Howells/);
  const medlarFull = JSON.parse(
    readFileSync(new URL("./texts/the-house-by-the-medlar-tree.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(medlarFull.year, "1881 / 1890");
  const suan = JSON.parse(
    readFileSync(new URL("./openings/filipino-popular-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(suan.scenes[0]?.title ?? "", /Suan/);
  assert.equal(suan.breaths.length, 14);
  assert.doesNotMatch(suan.breaths.map((breath) => breath.text).join("\n"), /Charcoal-Maker/);
  const tales = JSON.parse(
    readFileSync(new URL("./texts/filipino-popular-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(tales.scenes[0]?.title ?? "", /Suan/);
  assert.ok(tales.scenes.some((scene) => scene.title === "The Charcoal-Maker Who Became King"));
  assert.equal(tales.scenes.some((scene) => /notes/i.test(scene.title ?? "")), false);
});

test("Mira Sun AM CLEAR is Next lead Marrow, then Zuleika, Eugenie, and Seven Brothers, with Laos on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-156, -152), [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
  ]);
  assert.deepEqual(next.slice(-160, -156), [
    "white-jacket",
    "a-japanese-nightingale",
    "maria-chapdelaine",
    "the-house-by-the-medlar-tree",
  ]);
  assert.equal(next.slice(-156, -152).includes("laos-folk-lore"), false);
  assert.equal(next.includes("laos-folk-lore"), false);
  assert.ok(next.indexOf("zuleika-dobson") < next.lastIndexOf("zuleika-dobson"));
  assert.ok(next.indexOf("eugenie-grandet") < next.lastIndexOf("eugenie-grandet"));
  assert.equal(next.indexOf("the-marrow-of-tradition"), next.lastIndexOf("the-marrow-of-tradition"));
  assert.equal(next.indexOf("seven-brothers"), next.lastIndexOf("seven-brothers"));
  assert.ok(next.indexOf("white-jacket") < next.lastIndexOf("the-marrow-of-tradition"));
  for (const id of [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "laos-folk-lore",
  ]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.includes("seven-brothers"), true);
  assert.equal(featured.includes("seven-brothers"), false);
  assert.equal(isAdaptedBySalon("seven-brothers"), false);
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-116, -112), [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-151, -147), [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
  ]);
  assert.deepEqual(walk?.workIds.slice(-111, -107), [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
  ]);
  assert.ok((sleep?.workIds.indexOf("eugenie-grandet") ?? -1) < (sleep?.workIds.lastIndexOf("eugenie-grandet") ?? -1));
  assert.ok((sleep?.workIds.indexOf("zuleika-dobson") ?? -1) < (sleep?.workIds.lastIndexOf("zuleika-dobson") ?? -1));
  assert.ok((walk?.workIds.indexOf("seven-brothers") ?? -1) < (walk?.workIds.lastIndexOf("seven-brothers") ?? -1));
  assert.ok((waking?.workIds.indexOf("seven-brothers") ?? -1) >= 0);
  assert.equal(waking?.workIds.indexOf("seven-brothers"), waking?.workIds.lastIndexOf("seven-brothers"));
  assert.equal(waking?.workIds.at(-25), "laos-folk-lore");
  assert.equal(waking?.workIds.at(-26), "filipino-popular-tales");
  assert.equal(curatorialTrack("the-marrow-of-tradition"), "next");
  assert.equal(curatorialTrack("zuleika-dobson"), "next");
  assert.equal(curatorialTrack("eugenie-grandet"), "next");
  assert.equal(curatorialTrack("seven-brothers"), "next");
  assert.equal(curatorialTrack("laos-folk-lore"), "later");
  const priorLaos = SHELF.find((item) => item.id === "laos-folk-lore-of-farther-india");
  assert.equal(priorLaos?.opening, "Tales of the Jungle");
  assert.equal(priorLaos?.breaths, 1113);

  const lanes = {
    "the-marrow-of-tradition": "next",
    "zuleika-dobson": "next",
    "eugenie-grandet": "next",
    "seven-brothers": "next",
    "laos-folk-lore": "later",
  } as const;
  const opens = {
    "the-marrow-of-tradition": {
      gutenberg: 11228,
      year: 1901,
      breaths: 1554,
      scenes: 37,
      minutes: 7,
      opening: "Stay here beside her, major",
      stop: "Julia goes",
      firstWords: 29,
    },
    "zuleika-dobson": {
      gutenberg: 1845,
      year: 1911,
      breaths: 1446,
      scenes: 24,
      minutes: 6,
      opening: "That old bell, presage of a train",
      stop: "city of their penance",
      firstWords: 94,
    },
    "eugenie-grandet": {
      gutenberg: 1715,
      year: 1833,
      breaths: 1382,
      scenes: 14,
      minutes: 6,
      opening: "There are houses in certain provincial towns",
      stop: "biography of Monsieur Grandet himself",
      firstWords: 88,
    },
    "seven-brothers": {
      gutenberg: 79566,
      year: 1870,
      breaths: 2686,
      scenes: 14,
      minutes: 6,
      opening: "Jukola Farm, in the south of the province of Häme",
      stop: "a voice which sang",
      firstWords: 195,
    },
    "laos-folk-lore": {
      gutenberg: 35564,
      year: 1899,
      breaths: 520,
      scenes: 48,
      minutes: 2,
      opening: "Deep in the forest of the North",
      stop: "these one hundred years",
      firstWords: 45,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const marrow = JSON.parse(
    readFileSync(new URL("./openings/the-marrow-of-tradition.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(marrow.scenes[0]?.title ?? "", /Wilmington/);
  assert.match(marrow.breaths[0]?.text ?? "", /not he needed/);
  assert.doesNotMatch(marrow.breaths.map((breath) => breath.text).join("\n"), /Lamb/);
  const marrowFull = JSON.parse(
    readFileSync(new URL("./texts/the-marrow-of-tradition.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(marrowFull.year, "1901");
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-marrow-of-tradition")?.intro ?? "", /not Georgia/);
  const zuleika = JSON.parse(
    readFileSync(new URL("./openings/zuleika-dobson.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.doesNotMatch(zuleika.breaths.map((breath) => breath.text).join("\n"), /\bNOTE\b|ILLI ALMAE/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "zuleika-dobson")?.intro ?? "", /not London/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "zuleika-dobson")?.intro ?? "", /Potteries/);
  const eugenie = JSON.parse(
    readFileSync(new URL("./openings/eugenie-grandet.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string };
  assert.doesNotMatch(eugenie.breaths.map((breath) => breath.text).join("\n"), /To Maria|Paris/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "eugenie-grandet")?.intro ?? "", /Saumur is not the Orne/);
  assert.equal(eugenie.year, "1833");
  const brothersFull = JSON.parse(
    readFileSync(new URL("./texts/seven-brothers.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(brothersFull.year, "1870 / 1929");
  assert.doesNotMatch(SHELF.find((item) => item.id === "seven-brothers")?.intro ?? "", /do not inflate/);
  const laos = JSON.parse(
    readFileSync(new URL("./openings/laos-folk-lore.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(laos.scenes[0]?.title ?? "", /A Child of The Woods/);
  assert.equal(laos.breaths.length, 4);
  const laosFull = JSON.parse(
    readFileSync(new URL("./texts/laos-folk-lore.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(laosFull.year, "1899");
  assert.equal(laosFull.scenes[0]?.title, "A Child of The Woods");
  assert.ok(laosFull.scenes.length > 1);
  assert.doesNotMatch(SHELF.find((item) => item.id === "laos-folk-lore")?.intro ?? "", /not Pampanga/);
});

test("Mira POST-#169 CLEAR is Next lead Born in Exile, then Four Horsemen, After the Divorce, and Virgin Soil, with Hungry Hearts Wings on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "born-in-exile",
    "the-four-horsemen-of-the-apocalypse",
    "after-the-divorce",
    "virgin-soil",
  ] as const;

  assert.deepEqual(next.slice(-152, -148), [...tail]);
  assert.deepEqual(next.slice(-156, -152), [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
  ]);
  assert.equal(next.slice(-148, -144).includes("hungry-hearts"), false);
  assert.equal(next.includes("hungry-hearts"), false);
  assert.ok(next.indexOf("born-in-exile") < next.lastIndexOf("born-in-exile"));
  assert.ok(next.indexOf("after-the-divorce") < next.lastIndexOf("after-the-divorce"));
  assert.ok(next.indexOf("virgin-soil") < next.lastIndexOf("virgin-soil"));
  assert.equal(
    next.indexOf("the-four-horsemen-of-the-apocalypse"),
    next.lastIndexOf("the-four-horsemen-of-the-apocalypse"),
  );
  assert.ok(next.lastIndexOf("seven-brothers") < next.lastIndexOf("born-in-exile"));
  for (const id of [...tail, "hungry-hearts"]) {
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.includes("seven-brothers"), true);
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-112, -108), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-147, -143), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-107, -103), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-116, -112), [
    "the-marrow-of-tradition",
    "zuleika-dobson",
    "eugenie-grandet",
    "seven-brothers",
  ]);
  assert.ok((sleep?.workIds.indexOf("born-in-exile") ?? -1) < (sleep?.workIds.lastIndexOf("born-in-exile") ?? -1));
  assert.ok((sleep?.workIds.indexOf("virgin-soil") ?? -1) < (sleep?.workIds.lastIndexOf("virgin-soil") ?? -1));
  assert.ok((sleep?.workIds.indexOf("after-the-divorce") ?? -1) < (sleep?.workIds.lastIndexOf("after-the-divorce") ?? -1));
  assert.ok((unwind?.workIds.indexOf("after-the-divorce") ?? -1) < (unwind?.workIds.lastIndexOf("after-the-divorce") ?? -1));
  assert.ok((walk?.workIds.indexOf("after-the-divorce") ?? -1) < (walk?.workIds.lastIndexOf("after-the-divorce") ?? -1));
  assert.equal(waking?.workIds.at(-24), "hungry-hearts");
  assert.equal(waking?.workIds.at(-25), "laos-folk-lore");
  assert.equal(waking?.workIds.indexOf("hungry-hearts"), waking?.workIds.lastIndexOf("hungry-hearts"));
  assert.equal(curatorialTrack("born-in-exile"), "next");
  assert.equal(curatorialTrack("the-four-horsemen-of-the-apocalypse"), "next");
  assert.equal(curatorialTrack("after-the-divorce"), "next");
  assert.equal(curatorialTrack("virgin-soil"), "next");
  assert.equal(curatorialTrack("hungry-hearts"), "later");

  const lanes = {
    "born-in-exile": "next",
    "the-four-horsemen-of-the-apocalypse": "next",
    "after-the-divorce": "next",
    "virgin-soil": "next",
    "hungry-hearts": "later",
  } as const;
  const opens = {
    "born-in-exile": {
      gutenberg: 4526,
      year: 1892,
      breaths: 3774,
      scenes: 30,
      minutes: 6,
      opening: "The summer day in 1874",
      stop: "gazed in that direction with speculative eyes",
      firstWords: 250,
    },
    "the-four-horsemen-of-the-apocalypse": {
      gutenberg: 1484,
      year: 1916,
      breaths: 2093,
      scenes: 16,
      minutes: 7,
      opening: "In 1870 Marcelo Desnoyers was nineteen",
      stop: "prophesy all sorts of misfortune",
      firstWords: 89,
    },
    "after-the-divorce": {
      gutenberg: 39834,
      year: 1902,
      breaths: 1618,
      scenes: 17,
      minutes: 5,
      opening: "Nineteen Hundred and Seven",
      stop: "suggestion of a pair of shapely legs",
      firstWords: 88,
    },
    "virgin-soil": {
      gutenberg: 2466,
      year: 1877,
      breaths: 2521,
      scenes: 38,
      minutes: 6,
      opening: "At one o’clock in the afternoon",
      stop: "persistently unfriendly to me",
      firstWords: 89,
    },
    "hungry-hearts": {
      gutenberg: 41232,
      year: 1920,
      breaths: 1554,
      scenes: 10,
      minutes: 12,
      opening: "My heart chokes in me like in a prison",
      stop: "opened the wings of your soul",
      firstWords: 31,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "the-four-horsemen-of-the-apocalypse") {
      const start = full.breaths.findIndex((breath) => breath.text === opened.breaths[0]?.text);
      assert.ok(start > 0, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[start + i]?.text, opened.breaths[i]?.text, `${id} host ${i}`);
      }
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    } else {
      assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const exile = JSON.parse(
    readFileSync(new URL("./openings/born-in-exile.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.match(exile.scenes[0]?.title ?? "", /Kingsmill/);
  assert.equal(exile.year, "1892");
  assert.doesNotMatch(SHELF.find((item) => item.id === "born-in-exile")?.intro ?? "", /not Oxford/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "born-in-exile")?.intro ?? "", /Potteries/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "born-in-exile")?.intro ?? "", /lead stays/);
  const horsemen = JSON.parse(
    readFileSync(new URL("./openings/the-four-horsemen-of-the-apocalypse.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.match(horsemen.scenes[0]?.title ?? "", /Madariaga/);
  assert.equal(horsemen.year, "1916 / 1918");
  assert.equal(horsemen.breaths.length, 14);
  const horsemenFull = JSON.parse(
    readFileSync(new URL("./texts/the-four-horsemen-of-the-apocalypse.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.match(horsemenFull.scenes[0]?.title ?? "", /Tryst/);
  assert.equal(horsemenFull.year, "1916 / 1918");
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-four-horsemen-of-the-apocalypse")?.intro ?? "", /not Uruguay/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-four-horsemen-of-the-apocalypse")?.intro ?? "", /do not inflate/);
  const divorce = JSON.parse(
    readFileSync(new URL("./texts/after-the-divorce.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(divorce.year, "1902 / 1905");
  assert.doesNotMatch(SHELF.find((item) => item.id === "after-the-divorce")?.intro ?? "", /not Sicily/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "after-the-divorce")?.intro ?? "", /No score is invented/);
  const soil = JSON.parse(
    readFileSync(new URL("./texts/virgin-soil.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(soil.year, "1877");
  assert.doesNotMatch(SHELF.find((item) => item.id === "virgin-soil")?.intro ?? "", /No Townsend year/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "virgin-soil")?.intro ?? "", /do not inflate/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "virgin-soil")?.intro ?? "", /Futility/);
  const wings = JSON.parse(
    readFileSync(new URL("./openings/hungry-hearts.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(wings.scenes[0]?.title ?? "", /Wings/);
  assert.equal(wings.breaths.length, 167);
  const hearts = JSON.parse(
    readFileSync(new URL("./texts/hungry-hearts.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(hearts.year, "1920");
  assert.equal(hearts.scenes[0]?.title, "Wings");
  assert.ok(hearts.scenes.some((scene) => scene.title === "Hunger"));
  assert.doesNotMatch(SHELF.find((item) => item.id === "hungry-hearts")?.intro ?? "", /not Laos/);
  assert.match(SHELF.find((item) => item.id === "hungry-hearts")?.intro ?? "", /just Wings/);
});

test("Mira POST-#170 CLEAR is Next lead The Sport of the Gods, then Ramuntcho, Miss Lulu Bett, and The Pit, with Reginald on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "the-sport-of-the-gods",
    "ramuntcho",
    "miss-lulu-bett",
    "the-pit",
  ] as const;
  const prior = [
    "born-in-exile",
    "the-four-horsemen-of-the-apocalypse",
    "after-the-divorce",
    "virgin-soil",
  ] as const;

  assert.deepEqual(next.slice(-148, -144), [...tail]);
  assert.deepEqual(next.slice(-152, -148), [...prior]);
  assert.equal(next.slice(-148, -144).includes("reginald"), false);
  assert.ok(next.indexOf("miss-lulu-bett") < next.lastIndexOf("miss-lulu-bett"));
  assert.ok(next.indexOf("ramuntcho") < next.lastIndexOf("ramuntcho"));
  assert.ok(next.indexOf("the-pit") < next.lastIndexOf("the-pit"));
  assert.equal(next.indexOf("the-sport-of-the-gods"), next.lastIndexOf("the-sport-of-the-gods"));
  assert.ok(next.lastIndexOf("virgin-soil") < next.lastIndexOf("the-sport-of-the-gods"));
  assert.equal(next.indexOf("reginald"), next.lastIndexOf("reginald"));
  assert.ok(next.indexOf("reginald") < next.lastIndexOf("the-sport-of-the-gods"));
  for (const id of [...tail, "reginald"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
  }
  assert.equal(forYou?.workIds.includes("miss-lulu-bett"), true);
  assert.equal(forYou?.workIds.includes("the-sport-of-the-gods"), false);
  assert.equal(forYou?.workIds.includes("ramuntcho"), false);
  assert.equal(forYou?.workIds.includes("the-pit"), false);
  assert.equal(forYou?.workIds.includes("reginald"), false);
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-108, -104), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-143, -139), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-103, -99), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-112, -108), [...prior]);
  assert.ok((sleep?.workIds.indexOf("miss-lulu-bett") ?? -1) < (sleep?.workIds.lastIndexOf("miss-lulu-bett") ?? -1));
  assert.ok((sleep?.workIds.indexOf("the-pit") ?? -1) < (sleep?.workIds.lastIndexOf("the-pit") ?? -1));
  assert.ok((sleep?.workIds.indexOf("ramuntcho") ?? -1) < (sleep?.workIds.lastIndexOf("ramuntcho") ?? -1));
  assert.equal(sleep?.workIds.includes("reginald"), true);
  assert.equal(unwind?.workIds.includes("reginald"), false);
  assert.equal(walk?.workIds.includes("reginald"), false);
  assert.equal(waking?.workIds.at(-23), "reginald");
  assert.equal(waking?.workIds.at(-24), "hungry-hearts");
  assert.equal(waking?.workIds.indexOf("reginald"), waking?.workIds.lastIndexOf("reginald"));
  assert.equal(curatorialTrack("the-sport-of-the-gods"), "next");
  assert.equal(curatorialTrack("ramuntcho"), "next");
  assert.equal(curatorialTrack("miss-lulu-bett"), "next");
  assert.equal(curatorialTrack("the-pit"), "next");
  assert.equal(curatorialTrack("reginald"), "next");

  const lanes = {
    "the-sport-of-the-gods": "next",
    ramuntcho: "next",
    "miss-lulu-bett": "next",
    "the-pit": "next",
    reginald: "next",
  } as const;
  const opens = {
    "the-sport-of-the-gods": {
      gutenberg: 17854,
      year: 1902,
      breaths: 885,
      scenes: 18,
      minutes: 5,
      opening: "Fiction has said so much",
      stop: "white waistcoat",
      firstWords: 51,
    },
    ramuntcho: {
      gutenberg: 9616,
      year: 1897,
      breaths: 894,
      scenes: 40,
      minutes: 8,
      opening: "The sad curlews",
      stop: "gowns embroidered in white silk",
      firstWords: 85,
    },
    "miss-lulu-bett": {
      gutenberg: 10429,
      year: 1920,
      breaths: 1712,
      scenes: 6,
      minutes: 6,
      opening: "The Deacons were at supper",
      stop: "conjugal rebuking",
      firstWords: 41,
    },
    "the-pit": {
      gutenberg: 4382,
      year: 1903,
      breaths: 2845,
      scenes: 10,
      minutes: 6,
      opening: "At eight o'clock",
      stop: "lose the whole overture",
      firstWords: 115,
    },
    reginald: {
      gutenberg: 2830,
      year: 1904,
      breaths: 234,
      scenes: 15,
      minutes: 6,
      opening: "I did it--I who should have known better",
      stop: "apricot tie",
      firstWords: 20,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const sport = JSON.parse(
    readFileSync(new URL("./openings/the-sport-of-the-gods.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.match(sport.scenes[0]?.title ?? "", /Hamiltons/);
  assert.equal(sport.year, "1902");
  assert.equal(sport.breaths.length, 16);
  const sportFull = JSON.parse(
    readFileSync(new URL("./texts/the-sport-of-the-gods.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(sportFull.scenes[0]?.title ?? "", /Hamiltons/);
  assert.ok(sportFull.scenes.some((scene) => /New York/.test(scene.title ?? "")));
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-sport-of-the-gods")?.intro ?? "", /not Wilmington/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-sport-of-the-gods")?.intro ?? "", /lead stays/);
  const ramuntcho = JSON.parse(
    readFileSync(new URL("./texts/ramuntcho.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(ramuntcho.year, "1897");
  assert.match(ramuntcho.author ?? "", /Henri Pene du Bois/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ramuntcho")?.intro ?? "", /No English year/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ramuntcho")?.intro ?? "", /do not inflate/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ramuntcho")?.intro ?? "", /no For you seat/);
  const lulu = JSON.parse(
    readFileSync(new URL("./texts/miss-lulu-bett.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(lulu.year, "1920");
  assert.match(bindNote("miss-lulu-bett"), /Appleton 1920/);
  assert.match(bindNote("miss-lulu-bett"), /PG header 1921/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "miss-lulu-bett")?.intro ?? "", /For you seat stays/);
  const pit = JSON.parse(
    readFileSync(new URL("./openings/the-pit.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(pit.scenes[0]?.title ?? "", /Chicago/);
  assert.equal(pit.breaths.length, 15);
  assert.match(SHELF.find((item) => item.id === "the-pit")?.intro ?? "", /Chicago/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-pit")?.intro ?? "", /No score is invented/);
  const reginald = JSON.parse(
    readFileSync(new URL("./openings/reginald.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(reginald.scenes[0]?.title ?? "", /Reginald/);
  assert.equal(reginald.breaths.length, 29);
  const reginaldFull = JSON.parse(
    readFileSync(new URL("./texts/reginald.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(reginaldFull.year, "1904");
  assert.equal(reginaldFull.scenes[0]?.title, "Reginald");
  assert.ok(reginaldFull.scenes.some((scene) => scene.title === "Reginald on Christmas Presents"));
  assert.match(SHELF.find((item) => item.id === "reginald")?.intro ?? "", /just the title sketch/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "reginald")?.intro ?? "", /Soft London/);
});

test("Mira POST-#171 CLEAR is Next lead Royal Highness, then Ramona, Almayer’s Folly, and The Crux, with The Black Dog on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "royal-highness",
    "ramona",
    "almayers-folly",
    "the-crux",
  ] as const;
  const prior = [
    "the-sport-of-the-gods",
    "ramuntcho",
    "miss-lulu-bett",
    "the-pit",
  ] as const;

  assert.deepEqual(next.slice(-144, -140), [...tail]);
  assert.deepEqual(next.slice(-148, -144), [...prior]);
  assert.equal(next.slice(-144, -140).includes("the-black-dog"), false);
  assert.ok(next.indexOf("royal-highness") < next.lastIndexOf("royal-highness"));
  assert.ok(next.indexOf("the-crux") < next.lastIndexOf("the-crux"));
  assert.equal(next.indexOf("ramona"), next.lastIndexOf("ramona"));
  assert.equal(next.indexOf("almayers-folly"), next.lastIndexOf("almayers-folly"));
  assert.equal(next.indexOf("the-black-dog"), next.lastIndexOf("the-black-dog"));
  assert.ok(next.lastIndexOf("the-pit") < next.lastIndexOf("royal-highness"));
  assert.ok(next.indexOf("the-black-dog") < next.lastIndexOf("royal-highness"));
  for (const id of [...tail, "the-black-dog"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-104, -100), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-139, -135), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-99, -95), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-108, -104), [...prior]);
  assert.ok((sleep?.workIds.indexOf("royal-highness") ?? -1) < (sleep?.workIds.lastIndexOf("royal-highness") ?? -1));
  assert.ok((sleep?.workIds.indexOf("the-crux") ?? -1) < (sleep?.workIds.lastIndexOf("the-crux") ?? -1));
  assert.equal(sleep?.workIds.includes("the-black-dog"), true);
  assert.equal(unwind?.workIds.includes("the-black-dog"), false);
  assert.equal(walk?.workIds.includes("the-black-dog"), false);
  assert.equal(waking?.workIds.at(-22), "the-black-dog");
  assert.equal(waking?.workIds.at(-23), "reginald");
  assert.equal(waking?.workIds.indexOf("the-black-dog"), waking?.workIds.lastIndexOf("the-black-dog"));
  assert.equal(curatorialTrack("royal-highness"), "next");
  assert.equal(curatorialTrack("ramona"), "next");
  assert.equal(curatorialTrack("almayers-folly"), "next");
  assert.equal(curatorialTrack("the-crux"), "next");
  assert.equal(curatorialTrack("the-black-dog"), "next");

  const lanes = {
    "royal-highness": "next",
    ramona: "next",
    "almayers-folly": "next",
    "the-crux": "next",
    "the-black-dog": "next",
  } as const;
  const opens = {
    "royal-highness": {
      gutenberg: 36028,
      year: 1909,
      breaths: 1407,
      scenes: 10,
      minutes: 4,
      opening: "The scene is the Albrechtstrasse",
      stop: "burden of his Highness",
      firstWords: 129,
    },
    ramona: {
      gutenberg: 2802,
      year: 1884,
      breaths: 2193,
      scenes: 26,
      minutes: 6,
      opening: "It was sheep-shearing time",
      stop: "Virgin only knows what he won't do",
      firstWords: 97,
    },
    "almayers-folly": {
      gutenberg: 720,
      year: 1895,
      breaths: 844,
      scenes: 12,
      minutes: 6,
      opening: "Kaspar! Makan!",
      stop: "yellow fingers of the attentive Chinamen",
      firstWords: 2,
    },
    "the-crux": {
      gutenberg: 38551,
      year: 1911,
      breaths: 1613,
      scenes: 12,
      minutes: 5,
      opening: 'The "Foote Girls" were bustling',
      stop: "scandalizing the quiet town",
      firstWords: 78,
    },
    "the-black-dog": {
      gutenberg: 61016,
      year: 1923,
      breaths: 1504,
      scenes: 18,
      minutes: 12,
      opening: "Having pocketed his fare",
      stop: "But he does not do so",
      firstWords: 123,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const royal = JSON.parse(
    readFileSync(new URL("./openings/royal-highness.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string; author?: string };
  assert.match(royal.scenes[0]?.title ?? "", /Prelude/);
  assert.equal(royal.year, "1909");
  assert.equal(royal.breaths.length, 8);
  assert.match(royal.author ?? "", /A\. Cecil Curtis/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "royal-highness")?.intro ?? "", /not Ramona/);
  assert.match(SHELF.find((item) => item.id === "royal-highness")?.intro ?? "", /1916/);
  assert.match(SHELF.find((item) => item.id === "royal-highness")?.intro ?? "", /grey great-coats/);
  const ramona = JSON.parse(
    readFileSync(new URL("./texts/ramona.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(ramona.year, "1884");
  assert.doesNotMatch(SHELF.find((item) => item.id === "ramona")?.intro ?? "", /not Oakley/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ramona")?.intro ?? "", /not the Midwest/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ramona")?.intro ?? "", /not Chicago/);
  const almayer = JSON.parse(
    readFileSync(new URL("./texts/almayers-folly.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(almayer.year, "1895");
  assert.equal(almayer.author, "Joseph Conrad");
  assert.doesNotMatch(SHELF.find((item) => item.id === "almayers-folly")?.intro ?? "", /not Gaspar/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "almayers-folly")?.intro ?? "", /do not inflate/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "almayers-folly")?.intro ?? "", /no For you seat/);
  const crux = JSON.parse(
    readFileSync(new URL("./openings/the-crux.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(crux.scenes[0]?.title ?? "", /The Back Way/);
  assert.match(crux.scenes[0]?.title ?? "", /New England/);
  assert.equal(crux.breaths.length, 24);
  assert.match(SHELF.find((item) => item.id === "the-crux")?.intro ?? "", /New England before Colorado/);
  const dog = JSON.parse(
    readFileSync(new URL("./openings/the-black-dog.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(dog.scenes[0]?.title ?? "", /The Black Dog/);
  assert.equal(dog.breaths.length, 235);
  const dogFull = JSON.parse(
    readFileSync(new URL("./texts/the-black-dog.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(dogFull.year, "1923");
  assert.equal(dogFull.scenes[0]?.title, "The Black Dog");
  assert.ok(dogFull.scenes.some((scene) => scene.title === "Alas, Poor Bollington!"));
  assert.match(SHELF.find((item) => item.id === "the-black-dog")?.intro ?? "", /just the title tale/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-black-dog")?.intro ?? "", /after Reginald/);
});

test("Mira POST-#172 CLEAR is Next lead Daisy Miller, then South Wind, The Village, and Ditte, with Bernice on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "daisy-miller",
    "south-wind",
    "the-village",
    "ditte-girl-alive",
  ] as const;
  const prior = [
    "royal-highness",
    "ramona",
    "almayers-folly",
    "the-crux",
  ] as const;

  assert.deepEqual(next.slice(-140, -136), [...tail]);
  assert.deepEqual(next.slice(-144, -140), [...prior]);
  assert.equal(next.includes("flappers-and-philosophers"), false);
  assert.equal(next.indexOf("daisy-miller"), next.lastIndexOf("daisy-miller"));
  assert.equal(next.indexOf("south-wind"), next.lastIndexOf("south-wind"));
  assert.equal(next.indexOf("ditte-girl-alive"), next.lastIndexOf("ditte-girl-alive"));
  assert.ok(next.indexOf("the-village") < next.lastIndexOf("the-village"));
  assert.ok(next.lastIndexOf("the-crux") < next.lastIndexOf("daisy-miller"));
  for (const id of [...tail, "flappers-and-philosophers"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-100, -96), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-135, -131), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-95, -91), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-104, -100), [...prior]);
  assert.ok((sleep?.workIds.indexOf("the-village") ?? -1) < (sleep?.workIds.lastIndexOf("the-village") ?? -1));
  assert.equal(unwind?.workIds.indexOf("the-village"), unwind?.workIds.lastIndexOf("the-village"));
  assert.equal(walk?.workIds.indexOf("the-village"), walk?.workIds.lastIndexOf("the-village"));
  assert.equal(sleep?.workIds.includes("flappers-and-philosophers"), false);
  assert.equal(unwind?.workIds.includes("flappers-and-philosophers"), false);
  assert.equal(walk?.workIds.includes("flappers-and-philosophers"), false);
  assert.equal(waking?.workIds.at(-21), "flappers-and-philosophers");
  assert.equal(waking?.workIds.at(-22), "the-black-dog");
  assert.equal(
    waking?.workIds.indexOf("flappers-and-philosophers"),
    waking?.workIds.lastIndexOf("flappers-and-philosophers"),
  );
  assert.equal(curatorialTrack("daisy-miller"), "next");
  assert.equal(curatorialTrack("south-wind"), "next");
  assert.equal(curatorialTrack("the-village"), "next");
  assert.equal(curatorialTrack("ditte-girl-alive"), "next");
  assert.equal(curatorialTrack("flappers-and-philosophers"), "later");

  const lanes = {
    "daisy-miller": "next",
    "south-wind": "next",
    "the-village": "next",
    "ditte-girl-alive": "next",
    "flappers-and-philosophers": "later",
  } as const;
  const opens = {
    "daisy-miller": {
      gutenberg: 208,
      year: 1878,
      breaths: 535,
      scenes: 2,
      minutes: 6,
      opening: "At the little town of Vevey",
      stop: "one of the best",
      firstWords: 331,
      openBreaths: 14,
    },
    "south-wind": {
      gutenberg: 4508,
      year: 1917,
      breaths: 2110,
      scenes: 40,
      minutes: 7,
      opening: "The bishop was feeling rather sea-sick",
      stop: "refreshingly different",
      firstWords: 10,
      openBreaths: 16,
    },
    "the-village": {
      gutenberg: 59981,
      year: 1910,
      breaths: 1026,
      scenes: 48,
      minutes: 6,
      opening: "The great-grandfather of the Krasoffs",
      stop: "dram-shop",
      firstWords: 93,
      openBreaths: 9,
    },
    "ditte-girl-alive": {
      gutenberg: 31496,
      year: 1917,
      breaths: 1598,
      scenes: 32,
      minutes: 9,
      opening: "It has always been considered a sign of good birth",
      stop: "rainy day",
      firstWords: 50,
      openBreaths: 20,
    },
    "flappers-and-philosophers": {
      gutenberg: 4368,
      year: 1920,
      breaths: 2180,
      scenes: 8,
      minutes: 12,
      opening: "After dark on Saturday night",
      stop: "moonlit street",
      firstWords: 78,
      openBreaths: 304,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    if (id === "daisy-miller") {
      assert.ok(want.firstWords > 250, id);
    } else {
      assert.ok(want.firstWords <= 250, id);
    }
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
  }

  const daisy = JSON.parse(
    readFileSync(new URL("./openings/daisy-miller.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string; author?: string };
  assert.match(daisy.scenes[0]?.title ?? "", /Vevey/);
  assert.equal(daisy.year, "1878");
  assert.equal(daisy.author, "Henry James");
  assert.doesNotMatch(SHELF.find((item) => item.id === "daisy-miller")?.intro ?? "", /not South Wind/);
  assert.match(SHELF.find((item) => item.id === "daisy-miller")?.intro ?? "", /Rome comes later/);
  const wind = JSON.parse(
    readFileSync(new URL("./texts/south-wind.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(wind.year, "1917");
  assert.equal(wind.author, "Norman Douglas");
  assert.doesNotMatch(SHELF.find((item) => item.id === "south-wind")?.intro ?? "", /not Sicily/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "south-wind")?.intro ?? "", /not Sardinia/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "south-wind")?.intro ?? "", /Launch shelf is no/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "south-wind")?.intro ?? "", /do not inflate/);
  const village = JSON.parse(
    readFileSync(new URL("./texts/the-village.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(village.year, "1910");
  assert.match(village.author ?? "", /Isabel Florence Hapgood/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-village")?.intro ?? "", /not Petersburg/);
  assert.match(SHELF.find((item) => item.id === "the-village")?.intro ?? "", /1923/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-village")?.intro ?? "", /grim/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-village")?.intro ?? "", /do not inflate/);
  const ditte = JSON.parse(
    readFileSync(new URL("./texts/ditte-girl-alive.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(ditte.year, "1917");
  assert.match(ditte.author ?? "", /Asta and Rowland Kenney/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ditte-girl-alive")?.intro ?? "", /not Mogens/);
  assert.match(SHELF.find((item) => item.id === "ditte-girl-alive")?.intro ?? "", /1920/);
  const bernice = JSON.parse(
    readFileSync(new URL("./openings/flappers-and-philosophers.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(bernice.scenes[0]?.title ?? "", /Bernice Bobs Her Hair/);
  assert.equal(bernice.scenes.length, 1);
  assert.equal(bernice.breaths.length, 304);
  const berniceFull = JSON.parse(
    readFileSync(new URL("./texts/flappers-and-philosophers.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(berniceFull.year, "1920");
  assert.equal(berniceFull.scenes[0]?.title, "Bernice Bobs Her Hair");
  assert.ok(berniceFull.scenes.some((scene) => scene.title === "The Offshore Pirate"));
  assert.match(SHELF.find((item) => item.id === "flappers-and-philosophers")?.intro ?? "", /just Bernice Bobs Her Hair/);
  assert.match(SHELF.find((item) => item.id === "flappers-and-philosophers")?.intro ?? "", /The other tales follow in the book\./);
  assert.doesNotMatch(SHELF.find((item) => item.id === "flappers-and-philosophers")?.intro ?? "", /Launch shelf is no/);
});

test("Mira MIDDAY CLEAR is Next lead Candide, then Iola Leroy, Esther Waters, and Aphrodite, with Spider Tales on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["candide", "iola-leroy", "esther-waters", "aphrodite"] as const;
  const prior = ["daisy-miller", "south-wind", "the-village", "ditte-girl-alive"] as const;

  assert.deepEqual(next.slice(-136, -132), [...tail]);
  assert.deepEqual(next.slice(-140, -136), [...prior]);
  assert.equal(next.includes("west-african-folk-tales"), false);
  assert.ok(next.indexOf("candide") < next.lastIndexOf("candide"));
  assert.ok(next.indexOf("aphrodite") < next.lastIndexOf("aphrodite"));
  assert.equal(next.indexOf("iola-leroy"), next.lastIndexOf("iola-leroy"));
  assert.equal(next.indexOf("esther-waters"), next.lastIndexOf("esther-waters"));
  assert.ok(next.lastIndexOf("ditte-girl-alive") < next.lastIndexOf("candide"));
  for (const id of [...tail, "west-african-folk-tales"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-96, -92), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-131, -127), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-91, -87), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-100, -96), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-135, -131), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-95, -91), [...prior]);
  assert.ok((sleep?.workIds.indexOf("candide") ?? -1) < (sleep?.workIds.lastIndexOf("candide") ?? -1));
  assert.ok((sleep?.workIds.indexOf("aphrodite") ?? -1) < (sleep?.workIds.lastIndexOf("aphrodite") ?? -1));
  assert.equal(unwind?.workIds.indexOf("candide"), unwind?.workIds.lastIndexOf("candide"));
  assert.equal(walk?.workIds.indexOf("candide"), walk?.workIds.lastIndexOf("candide"));
  assert.equal(sleep?.workIds.includes("west-african-folk-tales"), true);
  assert.equal(unwind?.workIds.includes("west-african-folk-tales"), false);
  assert.equal(walk?.workIds.includes("west-african-folk-tales"), false);
  assert.equal(waking?.workIds.at(-20), "west-african-folk-tales");
  assert.equal(waking?.workIds.at(-21), "flappers-and-philosophers");
  assert.ok(
    (waking?.workIds.indexOf("west-african-folk-tales") ?? -1) <
      (waking?.workIds.lastIndexOf("west-african-folk-tales") ?? -1),
  );
  assert.equal(curatorialTrack("candide"), "next");
  assert.equal(curatorialTrack("iola-leroy"), "next");
  assert.equal(curatorialTrack("esther-waters"), "next");
  assert.equal(curatorialTrack("aphrodite"), "next");
  assert.equal(curatorialTrack("west-african-folk-tales"), "later");

  const lanes = {
    candide: "next",
    "iola-leroy": "next",
    "esther-waters": "next",
    aphrodite: "next",
    "west-african-folk-tales": "later",
  } as const;
  const opens = {
    candide: {
      gutenberg: 19942,
      year: 1759,
      breaths: 738,
      scenes: 30,
      minutes: 4,
      opening: "In a castle of Westphalia",
      stop: "all possible castles",
      firstWords: 108,
      openBreaths: 8,
    },
    "iola-leroy": {
      gutenberg: 12352,
      year: 1892,
      breaths: 1615,
      scenes: 33,
      minutes: 8,
      opening: "Good mornin', Bob",
      stop: "prayer-meetin",
      firstWords: 7,
      openBreaths: 32,
    },
    "esther-waters": {
      gutenberg: 8157,
      year: 1894,
      breaths: 3145,
      scenes: 48,
      minutes: 6,
      opening: "She stood on the platform watching the receding train",
      stop: "heart of the silence",
      firstWords: 52,
      openBreaths: 7,
    },
    aphrodite: {
      gutenberg: 36378,
      year: 1896,
      breaths: 1727,
      scenes: 32,
      minutes: 10,
      opening: "On the quay at Alexandria",
      stop: "Night fell upon the quays",
      firstWords: 21,
      openBreaths: 108,
    },
    "west-african-folk-tales": {
      gutenberg: 66923,
      year: 1917,
      breaths: 383,
      scenes: 36,
      minutes: 2,
      opening: "In the olden days all the stories",
      stop: "Anansi tales",
      firstWords: 32,
      openBreaths: 5,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string; author?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (id !== "west-african-folk-tales") {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (id === "candide") {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const candide = JSON.parse(
    readFileSync(new URL("./texts/candide.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(candide.year, "1759");
  assert.equal(candide.author, "Voltaire");
  assert.doesNotMatch(candide.author ?? "", /trans/i);
  assert.doesNotMatch(SHELF.find((item) => item.id === "candide")?.intro ?? "", /not the Mann court/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "candide")?.intro ?? "", /No translator is invented/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "candide")?.intro ?? "", /not Aphrodite/);

  const iola = JSON.parse(
    readFileSync(new URL("./texts/iola-leroy.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(iola.year, "1892");
  assert.equal(iola.author, "Frances E. W. Harper");
  assert.doesNotMatch(SHELF.find((item) => item.id === "iola-leroy")?.intro ?? "", /1893|title page/);
  assert.ok((SHELF.find((item) => item.id === "iola-leroy")?.intro ?? "").endsWith("Frances E. W. Harper’s novel, 1892."));
  assert.doesNotMatch(SHELF.find((item) => item.id === "iola-leroy")?.intro ?? "", /not Dunbar/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "iola-leroy")?.intro ?? "", /not Chesnutt/);

  const esther = JSON.parse(
    readFileSync(new URL("./texts/esther-waters.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(esther.year, "1894");
  assert.equal(esther.author, "George Moore");
  assert.doesNotMatch(SHELF.find((item) => item.id === "esther-waters")?.intro ?? "", /1899|imprint/);
  assert.ok((SHELF.find((item) => item.id === "esther-waters")?.intro ?? "").endsWith("George Moore’s novel, 1894."));
  assert.doesNotMatch(SHELF.find((item) => item.id === "esther-waters")?.intro ?? "", /not The Heavenly Twins/);

  const aphrodite = JSON.parse(
    readFileSync(new URL("./texts/aphrodite.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(aphrodite.year, "1896");
  assert.equal(aphrodite.author, "Pierre Louÿs");
  assert.doesNotMatch(aphrodite.author ?? "", /trans/i);
  assert.match(aphrodite.scenes[0]?.title ?? "", /On the Quay at Alexandria/);
  assert.ok(aphrodite.scenes.some((scene) => /Chrysis/.test(scene.title ?? "")));
  assert.match(SHELF.find((item) => item.id === "aphrodite")?.intro ?? "", /Chapter II/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "aphrodite")?.intro ?? "", /No translator is invented/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "aphrodite")?.intro ?? "", /do not inflate/);

  const spider = JSON.parse(
    readFileSync(new URL("./openings/west-african-folk-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(spider.scenes[0]?.title ?? "", /Spider Tales/);
  assert.equal(spider.scenes.length, 1);
  assert.equal(spider.breaths.length, 5);
  const spiderFull = JSON.parse(
    readFileSync(new URL("./texts/west-african-folk-tales.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(spiderFull.year, "1917");
  assert.match(spiderFull.scenes[0]?.title ?? "", /Spider Tales/);
  assert.ok(spiderFull.scenes.some((scene) => /How Wisdom Became/.test(scene.title ?? "")));
  assert.match(SHELF.find((item) => item.id === "west-african-folk-tales")?.intro ?? "", /just How We Got the Name ‘Spider Tales’|just How We Got the Name 'Spider Tales'/);
  assert.match(SHELF.find((item) => item.id === "west-african-folk-tales")?.intro ?? "", /The other tales follow in the book\./);
  assert.doesNotMatch(SHELF.find((item) => item.id === "west-african-folk-tales")?.intro ?? "", /Launch shelf is no/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "west-african-folk-tales")?.intro ?? "", /not Caribbean Anansi/);
});

test("Mira POST-#174 CLEAR is Next lead Erewhon, then Ann Veronica, The Great Hunger, and The Mysterious Stranger, with The Law of Life on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["erewhon", "ann-veronica", "the-great-hunger", "the-mysterious-stranger"] as const;
  const prior = ["candide", "iola-leroy", "esther-waters", "aphrodite"] as const;

  assert.deepEqual(next.slice(-132, -128), [...tail]);
  assert.deepEqual(next.slice(-136, -132), [...prior]);
  assert.equal(next.includes("children-of-the-frost"), true);
  assert.equal(next.indexOf("children-of-the-frost"), next.lastIndexOf("children-of-the-frost"));
  assert.equal(next.indexOf("erewhon"), next.lastIndexOf("erewhon"));
  assert.equal(next.indexOf("ann-veronica"), next.lastIndexOf("ann-veronica"));
  assert.equal(next.indexOf("the-mysterious-stranger"), next.lastIndexOf("the-mysterious-stranger"));
  assert.ok(next.indexOf("the-great-hunger") < next.lastIndexOf("the-great-hunger"));
  assert.ok(next.lastIndexOf("aphrodite") < next.lastIndexOf("erewhon"));
  for (const id of [...tail, "children-of-the-frost"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-92, -88), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-127, -123), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-87, -83), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-96, -92), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-131, -127), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-91, -87), [...prior]);
  assert.ok((sleep?.workIds.indexOf("the-great-hunger") ?? -1) < (sleep?.workIds.lastIndexOf("the-great-hunger") ?? -1));
  assert.equal(unwind?.workIds.indexOf("the-great-hunger"), unwind?.workIds.lastIndexOf("the-great-hunger"));
  assert.equal(walk?.workIds.indexOf("the-great-hunger"), walk?.workIds.lastIndexOf("the-great-hunger"));
  assert.equal(sleep?.workIds.includes("children-of-the-frost"), true);
  assert.equal(unwind?.workIds.includes("children-of-the-frost"), false);
  assert.equal(walk?.workIds.includes("children-of-the-frost"), false);
  assert.equal(waking?.workIds.at(-19), "children-of-the-frost");
  assert.equal(waking?.workIds.at(-20), "west-african-folk-tales");
  assert.equal(
    waking?.workIds.indexOf("children-of-the-frost"),
    waking?.workIds.lastIndexOf("children-of-the-frost"),
  );
  assert.equal(curatorialTrack("erewhon"), "next");
  assert.equal(curatorialTrack("ann-veronica"), "next");
  assert.equal(curatorialTrack("the-great-hunger"), "next");
  assert.equal(curatorialTrack("the-mysterious-stranger"), "next");
  assert.equal(curatorialTrack("children-of-the-frost"), "next");

  const lanes = {
    erewhon: "next",
    "ann-veronica": "next",
    "the-great-hunger": "next",
    "the-mysterious-stranger": "next",
    "children-of-the-frost": "next",
  } as const;
  const opens = {
    erewhon: {
      gutenberg: 1906,
      year: 1872,
      breaths: 607,
      scenes: 29,
      minutes: 6,
      opening: "If the reader will excuse me",
      stop: "rank and coarse",
      firstWords: 86,
      openBreaths: 9,
    },
    "ann-veronica": {
      gutenberg: 524,
      year: 1909,
      breaths: 2507,
      scenes: 17,
      minutes: 6,
      opening: "One Wednesday afternoon in late September",
      stop: "thinking in undertones",
      firstWords: 115,
      openBreaths: 18,
    },
    "the-great-hunger": {
      gutenberg: 2943,
      year: 1916,
      breaths: 1744,
      scenes: 27,
      minutes: 6,
      opening: "For sheer havoc, there is no gale like a good northwester",
      stop: "when it came up",
      firstWords: 152,
      openBreaths: 16,
    },
    "the-mysterious-stranger": {
      gutenberg: 3186,
      year: 1916,
      breaths: 609,
      scenes: 11,
      minutes: 6,
      opening: "It was in 1590",
      stop: "Father Adolf",
      firstWords: 95,
      openBreaths: 8,
    },
    "children-of-the-frost": {
      gutenberg: 10736,
      year: 1902,
      breaths: 1029,
      scenes: 10,
      minutes: 12,
      opening: "Old Koskoosh listened greedily",
      stop: "law of life",
      firstWords: 121,
      openBreaths: 22,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { title?: string }[]; year?: string; author?: string };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (id === "erewhon" || id === "ann-veronica" || id === "children-of-the-frost") {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (id === "erewhon" || id === "children-of-the-frost") {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const erewhon = JSON.parse(
    readFileSync(new URL("./texts/erewhon.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; title?: string };
  assert.equal(erewhon.year, "1872");
  assert.equal(erewhon.author, "Samuel Butler");
  assert.equal(erewhon.title, "Erewhon; Or, Over the Range");
  assert.doesNotMatch(erewhon.author ?? "", /trans/i);
  assert.doesNotMatch(SHELF.find((item) => item.id === "erewhon")?.intro ?? "", /not Candide/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "erewhon")?.intro ?? "", /The lead is this book/);
  assert.match(SHELF.find((item) => item.id === "erewhon")?.intro ?? "", /Waste Lands/);

  const ann = JSON.parse(
    readFileSync(new URL("./texts/ann-veronica.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(ann.year, "1909");
  assert.equal(ann.author, "H. G. Wells");
  assert.doesNotMatch(ann.author ?? "", /trans/i);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ann-veronica")?.intro ?? "", /Launch shelf is no/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ann-veronica")?.intro ?? "", /not Esther Waters/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "ann-veronica")?.intro ?? "", /do not inflate/);

  const hunger = JSON.parse(
    readFileSync(new URL("./texts/the-great-hunger.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(hunger.year, "1916");
  assert.match(hunger.author ?? "", /Johan Bojer/);
  assert.match(hunger.author ?? "", /Worster/);
  assert.match(hunger.author ?? "", /Archer/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-great-hunger")?.intro ?? "", /not Hamsun/);
  assert.match(SHELF.find((item) => item.id === "the-great-hunger")?.intro ?? "", /1916/);

  const stranger = JSON.parse(
    readFileSync(new URL("./texts/the-mysterious-stranger.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(stranger.year, "1916");
  assert.equal(stranger.author, "Mark Twain");
  assert.equal(stranger.scenes.length, 11);
  assert.match(stranger.scenes[0]?.title ?? "", /Chapter 1/);
  assert.equal(stranger.scenes.some((scene) => /Fable|Deceitful Turkey|McWilliams/i.test(scene.title ?? "")), false);
  assert.match(SHELF.find((item) => item.id === "the-mysterious-stranger")?.intro ?? "", /novella only/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-mysterious-stranger")?.intro ?? "", /Launch shelf is no/);
  assert.match(SHELF.find((item) => item.id === "the-mysterious-stranger")?.intro ?? "", /Eseldorf/);

  const law = JSON.parse(
    readFileSync(new URL("./openings/children-of-the-frost.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(law.scenes[0]?.title ?? "", /Law of Life/);
  assert.equal(law.scenes.length, 1);
  assert.equal(law.breaths.length, 22);
  const frost = JSON.parse(
    readFileSync(new URL("./texts/children-of-the-frost.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(frost.year, "1902");
  assert.match(frost.scenes[0]?.title ?? "", /Law of Life/);
  assert.ok(frost.scenes.some((scene) => /In the Forests of the North/.test(scene.title ?? "")));
  assert.match(SHELF.find((item) => item.id === "children-of-the-frost")?.intro ?? "", /just The Law of Life/);
  assert.match(SHELF.find((item) => item.id === "children-of-the-frost")?.intro ?? "", /The other tales follow in the book\./);
});

test("Mira POST-#175 CLEAR is Next lead The Poison Tree, then Cosmopolis, The Woman Who Did, and Billy Budd, with A Malay Romance on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["the-poison-tree", "cosmopolis", "the-woman-who-did", "billy-budd"] as const;
  const prior = ["erewhon", "ann-veronica", "the-great-hunger", "the-mysterious-stranger"] as const;

  assert.deepEqual(next.slice(-128, -124), [...tail]);
  assert.deepEqual(next.slice(-132, -128), [...prior]);
  assert.equal(next.includes("malay-sketches"), false);
  assert.ok(next.indexOf("the-poison-tree") < next.lastIndexOf("the-poison-tree"));
  assert.equal(next.indexOf("cosmopolis"), next.lastIndexOf("cosmopolis"));
  assert.equal(next.indexOf("the-woman-who-did"), next.lastIndexOf("the-woman-who-did"));
  assert.equal(next.indexOf("billy-budd"), next.lastIndexOf("billy-budd"));
  assert.ok(next.lastIndexOf("the-mysterious-stranger") < next.lastIndexOf("the-poison-tree"));
  for (const id of [...tail, "malay-sketches"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-88, -84), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-123, -119), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-83, -79), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-92, -88), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-127, -123), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-87, -83), [...prior]);
  assert.equal(sleep?.workIds.indexOf("the-poison-tree"), sleep?.workIds.lastIndexOf("the-poison-tree"));
  assert.equal(unwind?.workIds.indexOf("cosmopolis"), unwind?.workIds.lastIndexOf("cosmopolis"));
  assert.equal(walk?.workIds.indexOf("billy-budd"), walk?.workIds.lastIndexOf("billy-budd"));
  assert.equal(sleep?.workIds.includes("malay-sketches"), false);
  assert.equal(unwind?.workIds.includes("malay-sketches"), false);
  assert.equal(walk?.workIds.includes("malay-sketches"), false);
  assert.equal(waking?.workIds.at(-18), "malay-sketches");
  assert.equal(waking?.workIds.at(-19), "children-of-the-frost");
  assert.equal(waking?.workIds.indexOf("malay-sketches"), waking?.workIds.lastIndexOf("malay-sketches"));
  assert.equal(curatorialTrack("the-poison-tree"), "next");
  assert.equal(curatorialTrack("cosmopolis"), "next");
  assert.equal(curatorialTrack("the-woman-who-did"), "next");
  assert.equal(curatorialTrack("billy-budd"), "next");
  assert.equal(curatorialTrack("malay-sketches"), "later");
  assert.equal(curatorialTrack("poison-tree"), "later");
  assert.equal((next as readonly string[]).includes("poison-tree"), false);
  assert.equal(unwind?.workIds.includes("poison-tree"), true);

  const lanes = {
    "the-poison-tree": "next",
    cosmopolis: "next",
    "the-woman-who-did": "next",
    "billy-budd": "next",
    "malay-sketches": "later",
  } as const;
  const opens = {
    "the-poison-tree": {
      gutenberg: 17455,
      year: 1884,
      breaths: 970,
      scenes: 40,
      minutes: 9,
      opening: "Nagendra Natha Datta is about to travel by boat",
      stop: "went forth from the doorway",
      firstWords: 78,
      openBreaths: 12,
    },
    cosmopolis: {
      gutenberg: 3967,
      year: 1892,
      breaths: 1041,
      scenes: 12,
      minutes: 6,
      opening: "Although the narrow stall",
      stop: "for collecting",
      firstWords: 166,
      openBreaths: 7,
    },
    "the-woman-who-did": {
      gutenberg: 4396,
      year: 1895,
      breaths: 517,
      scenes: 24,
      minutes: 6,
      opening: "Mrs Dewsbury",
      stop: "one-sided culture",
      firstWords: 219,
      openBreaths: 13,
    },
    "billy-budd": {
      gutenberg: 76513,
      year: 1924,
      breaths: 317,
      scenes: 27,
      minutes: 6,
      opening: "In the time before steamships",
      stop: "looking straight at the host",
      firstWords: 225,
      openBreaths: 7,
    },
    "malay-sketches": {
      gutenberg: 76055,
      year: 1895,
      breaths: 807,
      scenes: 22,
      minutes: 12,
      opening: "A quarter of a century ago",
      stop: "killed her",
      firstWords: 63,
      openBreaths: 38,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.ok(full.breaths.length > opened.breaths.length, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "malay-sketches") {
      const romance = full.scenes.find((scene) => /A Malay Romance/.test(scene.title ?? ""));
      assert.ok(romance, id);
      const block = full.breaths.filter((breath) => breath.sceneId === romance?.id);
      assert.equal(block.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(block[i]?.text, opened.breaths[i]?.text, `${id} romance ${i}`);
      }
      assert.match(full.scenes[0]?.title ?? "", /Real Malay/);
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    } else {
      assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (id !== "cosmopolis") {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const poison = JSON.parse(
    readFileSync(new URL("./texts/the-poison-tree.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; title?: string };
  assert.equal(poison.year, "1884");
  assert.match(poison.author ?? "", /Miriam S\. Knight/);
  assert.match(poison.title ?? "", /Tale of Hindu Life in Bengal/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-poison-tree")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-poison-tree")?.intro ?? "", /Home and the World/);
  assert.match(SHELF.find((item) => item.id === "the-poison-tree")?.intro ?? "", /1873/);
  const later = JSON.parse(
    readFileSync(new URL("./texts/poison-tree.json", import.meta.url), "utf8"),
  ) as { id?: string; breaths: unknown[] };
  assert.equal(later.id, "poison-tree");
  assert.equal(later.breaths.length, 3090);

  const cosmo = JSON.parse(
    readFileSync(new URL("./texts/cosmopolis.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(cosmo.year, "1892");
  assert.equal(cosmo.author, "Paul Bourget");
  assert.doesNotMatch(cosmo.author ?? "", /trans/i);
  assert.doesNotMatch(SHELF.find((item) => item.id === "cosmopolis")?.intro ?? "", /No translator is invented/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "cosmopolis")?.intro ?? "", /not Capri/);

  const woman = JSON.parse(
    readFileSync(new URL("./texts/the-woman-who-did.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(woman.year, "1895");
  assert.equal(woman.author, "Grant Allen");
  assert.doesNotMatch(woman.author ?? "", /trans/i);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-woman-who-did")?.intro ?? "", /not Ann Veronica/);

  const billy = JSON.parse(
    readFileSync(new URL("./texts/billy-budd.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(billy.year, "1924");
  assert.equal(billy.author, "Herman Melville");
  assert.doesNotMatch(billy.author ?? "", /trans/i);
  assert.match(billy.scenes[0]?.title ?? "", /Chapter I/);
  assert.equal(billy.scenes.some((scene) => /Daniel Orme|other prose/i.test(scene.title ?? "")), false);
  assert.match(SHELF.find((item) => item.id === "billy-budd")?.intro ?? "", /just Billy Budd, Foretopman/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "billy-budd")?.intro ?? "", /not White Jacket/);

  const romance = JSON.parse(
    readFileSync(new URL("./openings/malay-sketches.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(romance.scenes[0]?.title ?? "", /A Malay Romance/);
  assert.equal(romance.scenes.length, 1);
  assert.equal(romance.breaths.length, 38);
  const sketches = JSON.parse(
    readFileSync(new URL("./texts/malay-sketches.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[]; year?: string };
  assert.equal(sketches.year, "1895");
  assert.match(sketches.scenes[0]?.title ?? "", /Real Malay/);
  assert.ok(sketches.scenes.some((scene) => /A Malay Romance/.test(scene.title ?? "")));
  assert.match(SHELF.find((item) => item.id === "malay-sketches")?.intro ?? "", /just A Malay Romance/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "malay-sketches")?.intro ?? "", /Launch shelf is no/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "malay-sketches")?.intro ?? "", /do not inflate/);
});

test("Mira POST-#176 CLEAR is Next lead Cousin Betty, then Sorrows of Satan, King of Schnorrers, and Hania, with The Toys of Peace on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["cousin-betty", "the-sorrows-of-satan", "the-king-of-schnorrers", "hania"] as const;
  const prior = ["the-poison-tree", "cosmopolis", "the-woman-who-did", "billy-budd"] as const;

  assert.deepEqual(next.slice(-124, -120), [...tail]);
  assert.deepEqual(next.slice(-128, -124), [...prior]);
  assert.equal(next.includes("the-toys-of-peace"), true);
  assert.ok(next.indexOf("cousin-betty") < next.lastIndexOf("cousin-betty"));
  assert.ok(next.indexOf("hania") < next.lastIndexOf("hania"));
  assert.equal(next.indexOf("the-sorrows-of-satan"), next.lastIndexOf("the-sorrows-of-satan"));
  assert.equal(next.indexOf("the-king-of-schnorrers"), next.lastIndexOf("the-king-of-schnorrers"));
  assert.ok(next.lastIndexOf("billy-budd") < next.lastIndexOf("cousin-betty"));
  for (const id of [...tail, "the-toys-of-peace"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-84, -80), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-119, -115), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-79, -75), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-88, -84), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-123, -119), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-83, -79), [...prior]);
  assert.equal(sleep?.workIds.indexOf("cousin-betty"), sleep?.workIds.lastIndexOf("cousin-betty"));
  assert.equal(unwind?.workIds.indexOf("hania"), unwind?.workIds.lastIndexOf("hania"));
  assert.equal(walk?.workIds.indexOf("the-king-of-schnorrers"), walk?.workIds.lastIndexOf("the-king-of-schnorrers"));
  assert.equal(waking?.workIds.at(-17), "the-toys-of-peace");
  assert.equal(waking?.workIds.at(-18), "malay-sketches");
  assert.equal(curatorialTrack("cousin-betty"), "next");
  assert.equal(curatorialTrack("the-sorrows-of-satan"), "next");
  assert.equal(curatorialTrack("the-king-of-schnorrers"), "next");
  assert.equal(curatorialTrack("hania"), "next");
  assert.equal(curatorialTrack("the-toys-of-peace"), "next");

  const lanes = {
    "cousin-betty": "next",
    "the-sorrows-of-satan": "next",
    "the-king-of-schnorrers": "next",
    hania: "next",
    "the-toys-of-peace": "next",
  } as const;
  const opens = {
    "cousin-betty": {
      gutenberg: 1749,
      year: 1846,
      breaths: 3652,
      scenes: 67,
      minutes: 6,
      opening: "One day, about the middle of July 1838",
      stop: "at her command",
      firstWords: 46,
      openBreaths: 24,
    },
    "the-sorrows-of-satan": {
      gutenberg: 42332,
      year: 1895,
      breaths: 2303,
      scenes: 42,
      minutes: 7,
      opening: "Do you know what it is to be poor",
      stop: "immediately dismissed",
      firstWords: 294,
      openBreaths: 3,
    },
    "the-king-of-schnorrers": {
      gutenberg: 38413,
      year: 1894,
      breaths: 1168,
      scenes: 6,
      minutes: 6,
      opening: "Lord George Gordon",
      stop: "having seen before",
      firstWords: 160,
      openBreaths: 9,
    },
    hania: {
      gutenberg: 36583,
      year: 1897,
      breaths: 1090,
      scenes: 12,
      minutes: 5,
      opening: "old Mikolai",
      stop: "feeling of tenderness",
      firstWords: 33,
      openBreaths: 8,
    },
    "the-toys-of-peace": {
      gutenberg: 1477,
      year: 1919,
      breaths: 49,
      scenes: 1,
      minutes: 9,
      opening: "Harvey",
      stop: "begun too late",
      firstWords: 38,
      openBreaths: 49,
    },
  } as const;

  for (const [id, track] of Object.entries(lanes)) {
    const want = opens[id as keyof typeof opens];
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(curatorialTrack(id), track, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    if (id === "the-sorrows-of-satan") {
      assert.ok(want.firstWords > 250, id);
    } else {
      assert.ok(want.firstWords <= 250, id);
    }
    if (id === "the-toys-of-peace") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      assert.equal(full.breaths[0]?.text, opened.breaths[0]?.text, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.equal(JSON.stringify(opened).includes("\u0000"), false, id);
    assert.equal(JSON.stringify(full).includes("\u0000"), false, id);
    assert.doesNotMatch(joined, /TABLE OF CONTENTS|^CONTENTS\b/im, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    if (id !== "hania") {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const betty = JSON.parse(
    readFileSync(new URL("./texts/cousin-betty.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(betty.year, "1846");
  assert.match(betty.author ?? "", /James Waring/);
  assert.match(SHELF.find((item) => item.id === "cousin-betty")?.opening ?? "", /\*Milords\*/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "cousin-betty")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "cousin-betty")?.intro ?? "", /Saumur/);

  const sorrows = JSON.parse(
    readFileSync(new URL("./texts/the-sorrows-of-satan.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(sorrows.year, "1895");
  assert.equal(sorrows.author, "Marie Corelli");
  assert.doesNotMatch(sorrows.author ?? "", /trans/i);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-sorrows-of-satan")?.intro ?? "", /not The Woman Who Did/);

  const king = JSON.parse(
    readFileSync(new URL("./texts/the-king-of-schnorrers.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(king.year, "1894");
  assert.equal(king.author, "Israel Zangwill");
  assert.equal(king.scenes.length, 6);
  assert.equal(king.scenes.some((scene) => /grotesque/i.test(scene.title ?? "")), false);
  assert.match(SHELF.find((item) => item.id === "the-king-of-schnorrers")?.intro ?? "", /King only/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-king-of-schnorrers")?.intro ?? "", /Pale Bontzye/);
  const grotesques = SHELF.find((item) => item.id === "the-king-of-schnorrers-grotesques-and-fantasies");
  assert.equal(grotesques?.breaths, 6611);
  assert.equal(grotesques?.title, "The King of Schnorrers: Grotesques and Fantasies");

  const hania = JSON.parse(
    readFileSync(new URL("./texts/hania.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(hania.year, "1897");
  assert.match(hania.author ?? "", /Jeremiah Curtin/);
  assert.equal(hania.scenes.some((scene) => /Prologue|Tartar/i.test(scene.title ?? "")), false);
  assert.match(SHELF.find((item) => item.id === "hania")?.intro ?? "", /just the Hania novella/);
  assert.match(SHELF.find((item) => item.id === "hania")?.intro ?? "", /1876/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "hania")?.intro ?? "", /not The Peasants/);

  const toys = JSON.parse(
    readFileSync(new URL("./texts/the-toys-of-peace.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(toys.year, "1919");
  assert.equal(toys.author, "Saki");
  assert.equal(toys.scenes.length, 1);
  assert.match(toys.scenes[0]?.title ?? "", /The Toys of Peace/);
  assert.match(SHELF.find((item) => item.id === "the-toys-of-peace")?.intro ?? "", /just The Toys of Peace/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-toys-of-peace")?.intro ?? "", /not Reginald/);
});

test("Mira POST-#177 CLEAR is Next lead Tess, then Captains Courageous, Numa Roumestan, and Dracula, with The Tug of Love on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["tess-of-the-durbervilles", "captains-courageous", "numa-roumestan", "dracula"] as const;
  const prior = ["cousin-betty", "the-sorrows-of-satan", "the-king-of-schnorrers", "hania"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-120, -116), [...tail]);
  assert.deepEqual(next.slice(-124, -120), [...prior]);
  assert.equal(next.includes("the-tug-of-love"), false);
  assert.ok(next.indexOf("tess-of-the-durbervilles") < next.lastIndexOf("tess-of-the-durbervilles"));
  assert.ok(next.indexOf("numa-roumestan") < next.lastIndexOf("numa-roumestan"));
  assert.equal(next.indexOf("captains-courageous"), next.lastIndexOf("captains-courageous"));
  assert.equal(next.indexOf("dracula"), next.lastIndexOf("dracula"));
  assert.ok(next.lastIndexOf("hania") < next.lastIndexOf("tess-of-the-durbervilles"));
  for (const id of [...tail, "the-tug-of-love"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-80, -76), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-115, -111), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-75, -71), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-84, -80), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-119, -115), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-79, -75), [...prior]);
  assert.equal(sleep?.workIds.indexOf("tess-of-the-durbervilles"), sleep?.workIds.lastIndexOf("tess-of-the-durbervilles"));
  assert.equal(unwind?.workIds.indexOf("numa-roumestan"), unwind?.workIds.lastIndexOf("numa-roumestan"));
  assert.equal(walk?.workIds.indexOf("dracula"), walk?.workIds.lastIndexOf("dracula"));
  assert.equal(waking?.workIds.at(-16), "the-tug-of-love");
  assert.equal(waking?.workIds.at(-17), "the-toys-of-peace");
  assert.equal(curatorialTrack("tess-of-the-durbervilles"), "next");
  assert.equal(curatorialTrack("captains-courageous"), "next");
  assert.equal(curatorialTrack("numa-roumestan"), "next");
  assert.equal(curatorialTrack("dracula"), "next");
  assert.equal(curatorialTrack("the-tug-of-love"), "later");

  const opens = {
    "tess-of-the-durbervilles": {
      gutenberg: 110,
      year: 1891,
      breaths: 3216,
      scenes: 59,
      minutes: 6,
      opening: "On an evening in the latter part of May",
      stop: "came near",
      firstWords: 133,
      openBreaths: 35,
    },
    "captains-courageous": {
      gutenberg: 2225,
      year: 1897,
      breaths: 1286,
      scenes: 10,
      minutes: 6,
      opening: "The weather door of the smoking-room",
      stop: "went quietly to sleep",
      firstWords: 27,
      openBreaths: 34,
    },
    "numa-roumestan": {
      gutenberg: 69808,
      year: 1881,
      breaths: 1651,
      scenes: 20,
      minutes: 6,
      opening: "That Sunday--it was a scorching hot Sunday",
      stop: "is that his wife",
      firstWords: 59,
      openBreaths: 25,
    },
    dracula: {
      gutenberg: 345,
      year: 1897,
      breaths: 1940,
      scenes: 27,
      minutes: 6,
      opening: "\\*3 May\\. Bistritz\\.\\*",
      stop: "returned with a letter",
      firstWords: 117,
      openBreaths: 8,
    },
    "the-tug-of-love": {
      gutenberg: 28982,
      year: 1907,
      breaths: 91,
      scenes: 1,
      minutes: 8,
      opening: "When Elias Goldenberg",
      stop: "My angel",
      firstWords: 41,
      openBreaths: 91,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "the-tug-of-love") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    if (id !== "captains-courageous") {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const tess = JSON.parse(
    readFileSync(new URL("./texts/tess-of-the-durbervilles.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(tess.year, "1891");
  assert.equal(tess.author, "Thomas Hardy");
  assert.doesNotMatch(SHELF.find((item) => item.id === "tess-of-the-durbervilles")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "tess-of-the-durbervilles")?.intro ?? "", /not Jude/);

  const captains = JSON.parse(
    readFileSync(new URL("./texts/captains-courageous.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(captains.year, "1897");
  assert.equal(captains.author, "Rudyard Kipling");
  assert.doesNotMatch(SHELF.find((item) => item.id === "captains-courageous")?.intro ?? "", /not Kim/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "captains-courageous")?.intro ?? "", /Grand Banks/);

  const numa = JSON.parse(
    readFileSync(new URL("./texts/numa-roumestan.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(numa.year, "1881");
  assert.match(numa.author ?? "", /Charles De Kay/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "numa-roumestan")?.intro ?? "", /Provence/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "numa-roumestan")?.intro ?? "", /Cousin Betty/);

  const dracula = JSON.parse(
    readFileSync(new URL("./openings/dracula.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(dracula.scenes[0]?.title ?? "", /Transylvania/);
  assert.match(dracula.breaths[0]?.text ?? "", /Bistritz/);
  assert.match(SHELF.find((item) => item.id === "dracula")?.intro ?? "", /Transylvania/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "dracula")?.intro ?? "", /Eseldorf/);

  const tug = JSON.parse(
    readFileSync(new URL("./texts/the-tug-of-love.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(tug.year, "1907");
  assert.equal(tug.author, "Israel Zangwill");
  assert.equal(tug.scenes.length, 1);
  assert.match(tug.scenes[0]?.title ?? "", /The Tug of Love/);
  assert.match(SHELF.find((item) => item.id === "the-tug-of-love")?.intro ?? "", /just The Tug of Love/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-tug-of-love")?.intro ?? "", /Schnorrers/);
});

test("Mira POST-#178 CLEAR is Next lead Seven Gables, then Heart of Darkness, Toilers of the Sea, and Indian Summer, with A Slav Soul on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "the-house-of-the-seven-gables",
    "heart-of-darkness",
    "toilers-of-the-sea",
    "indian-summer",
  ] as const;
  const prior = ["tess-of-the-durbervilles", "captains-courageous", "numa-roumestan", "dracula"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-116, -112), [...tail]);
  assert.deepEqual(next.slice(-120, -116), [...prior]);
  assert.equal(next.includes("a-slav-soul"), false);
  for (const id of tail) {
    assert.ok(next.indexOf(id) < next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("dracula") < next.lastIndexOf("the-house-of-the-seven-gables"));
  for (const id of [...tail, "a-slav-soul"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-76, -72), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-111, -107), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-71, -67), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-80, -76), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-115, -111), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-75, -71), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-15), "a-slav-soul");
  assert.equal(waking?.workIds.at(-16), "the-tug-of-love");
  assert.equal(curatorialTrack("the-house-of-the-seven-gables"), "next");
  assert.equal(curatorialTrack("heart-of-darkness"), "next");
  assert.equal(curatorialTrack("toilers-of-the-sea"), "next");
  assert.equal(curatorialTrack("indian-summer"), "next");
  assert.equal(curatorialTrack("a-slav-soul"), "later");

  const opens = {
    "the-house-of-the-seven-gables": {
      gutenberg: 77,
      year: 1851,
      breaths: 932,
      scenes: 21,
      minutes: 6,
      opening: "Halfway down a by-street",
      stop: "blood to drink",
      firstWords: 105,
      openBreaths: 4,
    },
    "heart-of-darkness": {
      gutenberg: 219,
      year: 1902,
      breaths: 198,
      scenes: 3,
      minutes: 5,
      opening: "The Nellie, a cruising yawl",
      stop: "lurid glare under the stars",
      firstWords: 51,
      openBreaths: 7,
    },
    "toilers-of-the-sea": {
      gutenberg: 32338,
      year: 1866,
      breaths: 3289,
      scenes: 95,
      minutes: 2,
      opening: "Christmas Day in the year 182-",
      stop: "take no heed of her",
      firstWords: 36,
      openBreaths: 2,
    },
    "indian-summer": {
      gutenberg: 7359,
      year: 1886,
      breaths: 2495,
      scenes: 24,
      minutes: 6,
      opening: "Midway of the Ponte Vecchio",
      stop: "things undreamed of",
      firstWords: 154,
      openBreaths: 4,
    },
    "a-slav-soul": {
      gutenberg: 57036,
      year: 1916,
      breaths: 63,
      scenes: 1,
      minutes: 12,
      opening: "The farther I go back in my memory",
      stop: "truly Slav soul",
      firstWords: 123,
      openBreaths: 63,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "a-slav-soul") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (fullJoined.includes("*")) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (joined.includes("*")) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const gables = JSON.parse(
    readFileSync(new URL("./texts/the-house-of-the-seven-gables.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(gables.year, "1851");
  assert.equal(gables.author, "Nathaniel Hawthorne");
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-house-of-the-seven-gables")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-house-of-the-seven-gables")?.intro ?? "", /not Dracula/);
  assert.match(SHELF.find((item) => item.id === "the-house-of-the-seven-gables")?.intro ?? "", /Pyncheon Elm/);

  const heart = JSON.parse(
    readFileSync(new URL("./texts/heart-of-darkness.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(heart.year, "1902");
  assert.equal(heart.author, "Joseph Conrad");
  assert.match(SHELF.find((item) => item.id === "heart-of-darkness")?.intro ?? "", /1902/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "heart-of-darkness")?.intro ?? "", /not Borneo/);
  assert.match(SHELF.find((item) => item.id === "heart-of-darkness")?.intro ?? "", /Congo/);

  const toilers = JSON.parse(
    readFileSync(new URL("./texts/toilers-of-the-sea.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(toilers.year, "1866");
  assert.match(toilers.author ?? "", /W\. Moy Thomas/);
  assert.match(SHELF.find((item) => item.id === "toilers-of-the-sea")?.intro ?? "", /Guernsey/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "toilers-of-the-sea")?.intro ?? "", /Grand Banks/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "toilers-of-the-sea")?.intro ?? "", /Provence/);

  const summer = JSON.parse(
    readFileSync(new URL("./texts/indian-summer.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(summer.year, "1886");
  assert.equal(summer.author, "William Dean Howells");
  assert.match(SHELF.find((item) => item.id === "indian-summer")?.intro ?? "", /Florence/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "indian-summer")?.intro ?? "", /Silas Lapham/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "indian-summer")?.intro ?? "", /Capri/);

  const slav = JSON.parse(
    readFileSync(new URL("./texts/a-slav-soul.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(slav.year, "1916");
  assert.match(slav.author ?? "", /Rosa Savary Graham/);
  assert.equal(slav.scenes.length, 1);
  assert.match(slav.scenes[0]?.title ?? "", /A Slav Soul/);
  assert.match(SHELF.find((item) => item.id === "a-slav-soul")?.intro ?? "", /just A Slav Soul/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "a-slav-soul")?.intro ?? "", /Virgin Soil/);
  const slavOpen = JSON.parse(
    readFileSync(new URL("./openings/a-slav-soul.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(slavOpen.scenes[0]?.title ?? "", /Russia/);
});

test("Mira POST-#179 CLEAR is Next lead Cabbages and Kings, then Dorian Gray, The Job, and Reign of Greed, with A Cross Line on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "cabbages-and-kings",
    "picture-of-dorian-gray",
    "the-job",
    "reign-of-greed",
  ] as const;
  const prior = [
    "the-house-of-the-seven-gables",
    "heart-of-darkness",
    "toilers-of-the-sea",
    "indian-summer",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-112, -108), [...tail]);
  assert.deepEqual(next.slice(-116, -112), [...prior]);
  assert.equal(next.includes("a-cross-line"), false);
  assert.ok(next.indexOf("the-job") < next.lastIndexOf("the-job"));
  for (const id of ["cabbages-and-kings", "picture-of-dorian-gray", "reign-of-greed"] as const) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.equal(next.includes("the-reign-of-greed"), true);
  assert.equal(next.includes("the-reign-of-greed-el-filibusterismo"), false);
  assert.ok(next.lastIndexOf("indian-summer") < next.lastIndexOf("cabbages-and-kings"));
  for (const id of [...tail, "a-cross-line"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-72, -68), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-107, -103), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-67, -63), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-76, -72), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-111, -107), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-71, -67), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-14), "a-cross-line");
  assert.equal(waking?.workIds.at(-15), "a-slav-soul");
  assert.equal(curatorialTrack("cabbages-and-kings"), "next");
  assert.equal(curatorialTrack("picture-of-dorian-gray"), "next");
  assert.equal(curatorialTrack("the-job"), "next");
  assert.equal(curatorialTrack("reign-of-greed"), "next");
  assert.equal(curatorialTrack("a-cross-line"), "later");

  const opens = {
    "cabbages-and-kings": {
      gutenberg: 2777,
      year: 1904,
      breaths: 1114,
      scenes: 19,
      minutes: 4,
      opening: "They will tell you in Anchuria",
      stop: "unhonoured mound",
      firstWords: 68,
      openBreaths: 10,
    },
    "picture-of-dorian-gray": {
      gutenberg: 174,
      year: 1891,
      breaths: 1491,
      scenes: 20,
      minutes: 4,
      opening: "The studio was filled with the rich odour of roses",
      stop: "not in the least like him",
      firstWords: 44,
      openBreaths: 11,
    },
    "the-job": {
      gutenberg: 25474,
      year: 1917,
      breaths: 1641,
      scenes: 23,
      minutes: 4,
      opening: "Captain Lew Golden",
      stop: "Panama, Pennsylvania",
      firstWords: 62,
      openBreaths: 11,
    },
    "reign-of-greed": {
      gutenberg: 10676,
      year: 1891,
      breaths: 2269,
      scenes: 39,
      minutes: 3,
      opening: "One morning in December the steamer Tabo",
      stop: "lazy boy",
      firstWords: 171,
      openBreaths: 4,
    },
    "a-cross-line": {
      gutenberg: 74778,
      year: 1894,
      breaths: 171,
      scenes: 1,
      minutes: 12,
      opening: "The rather flat notes of a man's voice",
      stop: "do it myself",
      firstWords: 63,
      openBreaths: 171,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "a-cross-line") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (fullJoined.includes("*")) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (joined.includes("*")) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const cabbages = JSON.parse(
    readFileSync(new URL("./texts/cabbages-and-kings.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(cabbages.year, "1904");
  assert.equal(cabbages.author, "O. Henry");
  assert.doesNotMatch(SHELF.find((item) => item.id === "cabbages-and-kings")?.intro ?? "", /The lead is this book/);
  assert.match(SHELF.find((item) => item.id === "cabbages-and-kings")?.intro ?? "", /Anchuria/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "cabbages-and-kings")?.intro ?? "", /Four Horsemen/);

  const dorian = JSON.parse(
    readFileSync(new URL("./texts/picture-of-dorian-gray.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(dorian.year, "1891");
  assert.equal(dorian.author, "Oscar Wilde");
  assert.match(SHELF.find((item) => item.id === "picture-of-dorian-gray")?.intro ?? "", /1890/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "picture-of-dorian-gray")?.intro ?? "", /not Dracula/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "picture-of-dorian-gray")?.intro ?? "", /Seven Gables/);

  const job = JSON.parse(
    readFileSync(new URL("./texts/the-job.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(job.year, "1917");
  assert.equal(job.author, "Sinclair Lewis");
  assert.match(SHELF.find((item) => item.id === "the-job")?.intro ?? "", /Panama, Pennsylvania/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-job")?.intro ?? "", /not Salem/);

  const reign = JSON.parse(
    readFileSync(new URL("./texts/reign-of-greed.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(reign.year, "1891");
  assert.match(reign.author ?? "", /Charles E\. Derbyshire/);
  assert.match(SHELF.find((item) => item.id === "reign-of-greed")?.intro ?? "", /Pasig/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "reign-of-greed")?.intro ?? "", /Noli/);
  assert.match(SHELF.find((item) => item.id === "reign-of-greed")?.intro ?? "", /1912/);

  const cross = JSON.parse(
    readFileSync(new URL("./texts/a-cross-line.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(cross.year, "1894");
  assert.equal(cross.author, "George Egerton");
  assert.equal(cross.scenes.length, 1);
  assert.match(cross.scenes[0]?.title ?? "", /A Cross Line/);
  assert.match(SHELF.find((item) => item.id === "a-cross-line")?.intro ?? "", /just A Cross Line/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "a-cross-line")?.intro ?? "", /Heavenly Twins/);
  const crossOpen = JSON.parse(
    readFileSync(new URL("./openings/a-cross-line.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(crossOpen.scenes[0]?.title ?? "", /England/);
});

test("Mira POST-#180 CLEAR is Next lead The Shadow of the Cathedral, then Way of All Flesh, Family at Gilje, and Resurrection, with The Beckoning Fair One on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "shadow-of-the-cathedral",
    "way-of-all-flesh",
    "family-at-gilje",
    "resurrection",
  ] as const;
  const prior = [
    "cabbages-and-kings",
    "picture-of-dorian-gray",
    "the-job",
    "reign-of-greed",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-108, -104), [...tail]);
  assert.deepEqual(next.slice(-112, -108), [...prior]);
  assert.equal(next.includes("widdershins"), false);
  assert.ok(next.indexOf("resurrection") < next.lastIndexOf("resurrection"));
  for (const id of ["shadow-of-the-cathedral", "way-of-all-flesh", "family-at-gilje"] as const) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.equal(next.includes("the-shadow-of-the-cathedral"), false);
  assert.equal(next.includes("the-way-of-all-flesh"), false);
  assert.equal(next.includes("the-family-at-gilje"), false);
  assert.ok(next.lastIndexOf("reign-of-greed") < next.lastIndexOf("shadow-of-the-cathedral"));
  for (const id of [...tail, "widdershins"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-68, -64), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-103, -99), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-63, -59), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-72, -68), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-107, -103), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-67, -63), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-13), "widdershins");
  assert.equal(waking?.workIds.at(-14), "a-cross-line");
  assert.equal(curatorialTrack("shadow-of-the-cathedral"), "next");
  assert.equal(curatorialTrack("way-of-all-flesh"), "next");
  assert.equal(curatorialTrack("family-at-gilje"), "next");
  assert.equal(curatorialTrack("resurrection"), "next");
  assert.equal(curatorialTrack("widdershins"), "later");

  const opens = {
    "shadow-of-the-cathedral": {
      gutenberg: 12041,
      year: 1903,
      breaths: 1162,
      scenes: 10,
      minutes: 4,
      opening: "The dawn was just rising",
      stop: "chief glories",
      firstWords: 81,
      openBreaths: 8,
    },
    "way-of-all-flesh": {
      gutenberg: 2084,
      year: 1903,
      breaths: 1499,
      scenes: 86,
      minutes: 4,
      opening: "When I was a small boy",
      stop: "fragrant to myself",
      firstWords: 104,
      openBreaths: 6,
    },
    "family-at-gilje": {
      gutenberg: 55646,
      year: 1883,
      breaths: 1487,
      scenes: 14,
      minutes: 4,
      opening: "It was a clear, cold afternoon",
      stop: "plenty of fuel",
      firstWords: 67,
      openBreaths: 11,
    },
    resurrection: {
      gutenberg: 1938,
      year: 1899,
      breaths: 3621,
      scenes: 129,
      minutes: 4,
      opening: "Though hundreds of thousands",
      stop: "comply with any order",
      firstWords: 62,
      openBreaths: 10,
    },
    widdershins: {
      gutenberg: 14168,
      year: 1911,
      breaths: 567,
      scenes: 12,
      minutes: 12,
      opening: "The three or four",
      stop: "mortuary lay that way",
      firstWords: 157,
      openBreaths: 567,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "widdershins") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} tale ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (fullJoined.includes("*")) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (joined.includes("*")) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const shadow = JSON.parse(
    readFileSync(new URL("./texts/shadow-of-the-cathedral.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(shadow.year, "1903");
  assert.match(shadow.author ?? "", /Mrs\. W\. A\. Gillespie/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "shadow-of-the-cathedral")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "shadow-of-the-cathedral")?.intro ?? "", /Four Horsemen/);
  assert.match(SHELF.find((item) => item.id === "shadow-of-the-cathedral")?.intro ?? "", /1909/);

  const way = JSON.parse(
    readFileSync(new URL("./texts/way-of-all-flesh.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(way.year, "1903");
  assert.equal(way.author, "Samuel Butler");
  assert.doesNotMatch(SHELF.find((item) => item.id === "way-of-all-flesh")?.intro ?? "", /Erewhon/);
  assert.match(SHELF.find((item) => item.id === "way-of-all-flesh")?.intro ?? "", /Paleham/);

  const gilje = JSON.parse(
    readFileSync(new URL("./texts/family-at-gilje.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(gilje.year, "1883");
  assert.match(gilje.author ?? "", /Samuel Coffin Eastman/);
  assert.match(SHELF.find((item) => item.id === "family-at-gilje")?.intro ?? "", /1920/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "family-at-gilje")?.intro ?? "", /Hamsun/);

  const risen = JSON.parse(
    readFileSync(new URL("./texts/resurrection.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(risen.year, "1899");
  assert.match(risen.author ?? "", /Louise Maude/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "resurrection")?.intro ?? "", /Hadji Murad/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "resurrection")?.intro ?? "", /Virgin Soil/);

  const fair = JSON.parse(
    readFileSync(new URL("./texts/widdershins.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(fair.year, "1911");
  assert.equal(fair.author, "Oliver Onions");
  assert.equal(fair.title, "The Beckoning Fair One");
  assert.equal(fair.scenes.length, 12);
  assert.match(fair.scenes[0]?.title ?? "", /Beckoning Fair One/);
  assert.match(SHELF.find((item) => item.id === "widdershins")?.intro ?? "", /just The Beckoning Fair One/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "widdershins")?.intro ?? "", /Seven Gables/);
  const fairOpen = JSON.parse(
    readFileSync(new URL("./openings/widdershins.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(fairOpen.scenes[0]?.title ?? "", /England/);
});

test("Mira POST-#181 CLEAR is Next lead Typee, then Kangaroo, Casanova’s Homecoming, and The Mother, with Lord Arthur Savile’s Crime on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const bite = RITUAL_LANES.find((item) => item.id === "bite-sized");
  const tail = [
    "typee",
    "kangaroo",
    "casanovas-homecoming",
    "the-mother",
  ] as const;
  const prior = [
    "shadow-of-the-cathedral",
    "way-of-all-flesh",
    "family-at-gilje",
    "resurrection",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(next.slice(-104, -100), [...tail]);
  assert.deepEqual(next.slice(-108, -104), [...prior]);
  assert.equal(next.includes("lord-arthur-saviles-crime"), false);
  assert.equal(next.includes("woman-and-the-priest"), false);
  assert.equal(next.includes("lord-arthur-savile-s-crime"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("resurrection") < next.lastIndexOf("typee"));
  for (const id of [...tail, "lord-arthur-saviles-crime"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-64, -60), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-99, -95), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-59, -55), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-68, -64), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-103, -99), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-63, -59), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(bite?.workIds.includes("casanovas-homecoming"), true);
  assert.equal(waking?.workIds.at(-12), "lord-arthur-saviles-crime");
  assert.equal(waking?.workIds.at(-13), "widdershins");
  assert.equal(curatorialTrack("typee"), "next");
  assert.equal(curatorialTrack("kangaroo"), "next");
  assert.equal(curatorialTrack("casanovas-homecoming"), "next");
  assert.equal(curatorialTrack("the-mother"), "next");
  assert.equal(curatorialTrack("lord-arthur-saviles-crime"), "later");
  assert.equal(curatorialTrack("white-jacket"), "next");
  assert.equal(curatorialTrack("billy-budd"), "next");
  assert.equal(curatorialTrack("the-moon-and-sixpence"), "next");
  assert.equal(curatorialTrack("my-brilliant-career"), "next");
  assert.equal(curatorialTrack("the-plumed-serpent"), "next");
  assert.equal(curatorialTrack("the-road-to-the-open"), "next");
  assert.equal(curatorialTrack("after-the-divorce"), "next");
  assert.equal(curatorialTrack("picture-of-dorian-gray"), "next");
  assert.ok(next.indexOf("white-jacket") < next.indexOf("typee"));
  assert.ok(next.indexOf("picture-of-dorian-gray") < next.indexOf("typee"));
  assert.ok(SHELF.some((item) => item.id === "lord-arthur-savile-s-crime"));

  const opens = {
    typee: {
      gutenberg: 1900,
      year: 1846,
      breaths: 1057,
      scenes: 34,
      minutes: 10,
      opening: "Six months at sea",
      stop: "corresponding with their rank",
      firstWords: 200,
      openBreaths: 17,
    },
    kangaroo: {
      gutenberg: 59848,
      year: 1923,
      breaths: 3401,
      scenes: 18,
      minutes: 9,
      opening: "A bunch of workmen",
      stop: "native word",
      firstWords: 111,
      openBreaths: 66,
    },
    "casanovas-homecoming": {
      gutenberg: 9310,
      year: 1918,
      breaths: 544,
      scenes: 12,
      minutes: 5,
      opening: "Casanova was in his fifty-third year",
      stop: "dust of the roadway",
      firstWords: 155,
      openBreaths: 5,
    },
    "the-mother": {
      gutenberg: 77111,
      year: 1920,
      breaths: 761,
      scenes: 14,
      minutes: 7,
      opening: "To-night again Paul",
      stop: "swallowed him up",
      firstWords: 10,
      openBreaths: 23,
    },
    "lord-arthur-saviles-crime": {
      gutenberg: 773,
      year: 1891,
      breaths: 226,
      scenes: 6,
      minutes: 12,
      opening: "It was Lady Windermere",
      stop: "nonsense in all my life",
      firstWords: 162,
      openBreaths: 226,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "lord-arthur-saviles-crime") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} tale ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    // Typee keeps PG footnote asterisks. Emphasis is paired *…* only.
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const typee = JSON.parse(
    readFileSync(new URL("./texts/typee.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(typee.year, "1846");
  assert.equal(typee.author, "Herman Melville");
  assert.doesNotMatch(SHELF.find((item) => item.id === "typee")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "typee")?.intro ?? "", /White Jacket/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "typee")?.intro ?? "", /Moon and Sixpence/);

  const roo = JSON.parse(
    readFileSync(new URL("./texts/kangaroo.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(roo.year, "1923");
  assert.equal(roo.author, "D. H. Lawrence");
  assert.doesNotMatch(SHELF.find((item) => item.id === "kangaroo")?.intro ?? "", /Brilliant Career/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "kangaroo")?.intro ?? "", /Plumed Serpent/);

  const casa = JSON.parse(
    readFileSync(new URL("./texts/casanovas-homecoming.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(casa.year, "1918");
  assert.match(casa.author ?? "", /Eden and Cedar Paul/);
  assert.match(SHELF.find((item) => item.id === "casanovas-homecoming")?.intro ?? "", /1922/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "casanovas-homecoming")?.intro ?? "", /Bertha Garlan/);

  const mother = JSON.parse(
    readFileSync(new URL("./texts/the-mother.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(mother.year, "1920");
  assert.match(mother.author ?? "", /Mary G\. Steegmann/);
  assert.match(SHELF.find((item) => item.id === "the-mother")?.intro ?? "", /1923/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-mother")?.intro ?? "", /After the Divorce/);

  const lord = JSON.parse(
    readFileSync(new URL("./texts/lord-arthur-saviles-crime.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(lord.year, "1891");
  assert.equal(lord.author, "Oscar Wilde");
  assert.equal(lord.title, "Lord Arthur Savile’s Crime");
  assert.equal(lord.scenes.length, 6);
  assert.match(lord.scenes[0]?.title ?? "", /Lord Arthur Savile/);
  assert.match(SHELF.find((item) => item.id === "lord-arthur-saviles-crime")?.intro ?? "", /just Lord Arthur Savile’s Crime/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "lord-arthur-saviles-crime")?.intro ?? "", /Dorian Gray/);
  const lordOpen = JSON.parse(
    readFileSync(new URL("./openings/lord-arthur-saviles-crime.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(lordOpen.scenes[0]?.title ?? "", /England/);
});

test("Mira POST-#182 CLEAR is Next lead Three Soldiers, then Doctor Pascal, In the World, and Leila, with CHARAN on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "three-soldiers",
    "doctor-pascal",
    "in-the-world",
    "leila",
  ] as const;
  const prior = [
    "typee",
    "kangaroo",
    "casanovas-homecoming",
    "the-mother",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-100, -96), [...tail]);
  assert.deepEqual(next.slice(-104, -100), [...prior]);
  assert.equal(next.includes("charan"), false);
  assert.ok(next.indexOf("three-soldiers") < next.lastIndexOf("three-soldiers"));
  assert.ok(next.indexOf("in-the-world") < next.lastIndexOf("in-the-world"));
  for (const id of ["doctor-pascal", "leila"] as const) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("the-mother") < next.lastIndexOf("three-soldiers"));
  for (const id of [...tail, "charan"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-60, -56), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-95, -91), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-55, -51), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-64, -60), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-99, -95), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-59, -55), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-11), "charan");
  assert.equal(waking?.workIds.at(-12), "lord-arthur-saviles-crime");
  assert.equal(curatorialTrack("three-soldiers"), "next");
  assert.equal(curatorialTrack("doctor-pascal"), "next");
  assert.equal(curatorialTrack("in-the-world"), "next");
  assert.equal(curatorialTrack("leila"), "next");
  assert.equal(curatorialTrack("charan"), "later");
  assert.equal(curatorialTrack("typee"), "next");
  assert.ok(SHELF.some((item) => item.id === "korean-folk-tales"));
  assert.equal(SHELF.filter((item) => item.id === "charan").length, 1);

  const opens = {
    "three-soldiers": {
      gutenberg: 6362,
      year: 1921,
      breaths: 4709,
      scenes: 29,
      minutes: 4,
      opening: "The company stood at attention",
      stop: "feel important, truculent",
      firstWords: 147,
      openBreaths: 21,
    },
    "doctor-pascal": {
      gutenberg: 10720,
      year: 1893,
      breaths: 1848,
      scenes: 14,
      minutes: 4,
      opening: "In the heat of the glowing July afternoon",
      stop: "time of Louis XV",
      firstWords: 88,
      openBreaths: 10,
    },
    "in-the-world": {
      gutenberg: 55502,
      year: 1916,
      breaths: 3828,
      scenes: 20,
      minutes: 4,
      opening: "I went out into the world",
      stop: "turned neck downward",
      firstWords: 57,
      openBreaths: 27,
    },
    leila: {
      gutenberg: 78258,
      year: 1910,
      breaths: 2322,
      scenes: 17,
      minutes: 4,
      opening: "Signorina",
      stop: "recent fright",
      firstWords: 66,
      openBreaths: 25,
    },
    charan: {
      gutenberg: 51002,
      year: 1913,
      breaths: 28,
      scenes: 1,
      minutes: 12,
      opening: "In the days of King Sung-jong",
      stop: "high office",
      firstWords: 50,
      openBreaths: 28,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "charan") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} tale ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const soldiers = JSON.parse(
    readFileSync(new URL("./texts/three-soldiers.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(soldiers.year, "1921");
  assert.equal(soldiers.author, "John Dos Passos");
  assert.doesNotMatch(SHELF.find((item) => item.id === "three-soldiers")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "three-soldiers")?.intro ?? "", /Provence or Paris/);
  assert.match(bindNote("three-soldiers"), /Inventory 86/);

  const pascal = JSON.parse(
    readFileSync(new URL("./texts/doctor-pascal.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(pascal.year, "1893");
  assert.match(pascal.author ?? "", /Mary J\. Serrano/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "doctor-pascal")?.intro ?? "", /Theresa Raquin/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "doctor-pascal")?.intro ?? "", /Plassans/);
  assert.match(bindNote("doctor-pascal"), /Inventory 83/);

  const world = JSON.parse(
    readFileSync(new URL("./texts/in-the-world.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(world.year, "1916");
  assert.match(world.author ?? "", /Gertrude M\. Foakes/);
  assert.match(SHELF.find((item) => item.id === "in-the-world")?.intro ?? "", /1917/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "in-the-world")?.intro ?? "", /Resurrection/);
  assert.match(bindNote("in-the-world"), /Inventory 86/);

  const leila = JSON.parse(
    readFileSync(new URL("./texts/leila.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(leila.year, "1910");
  assert.match(leila.author ?? "", /Mary Prichard Agnetti/);
  assert.match(SHELF.find((item) => item.id === "leila")?.intro ?? "", /1911/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "leila")?.intro ?? "", /The Mother/);
  assert.match(bindNote("leila"), /Inventory 83/);

  const charan = JSON.parse(
    readFileSync(new URL("./texts/charan.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(charan.year, "1913");
  assert.match(charan.author ?? "", /James S\. Gale/);
  assert.equal(charan.title, "CHARAN");
  assert.equal(charan.scenes.length, 1);
  assert.match(charan.scenes[0]?.title ?? "", /CHARAN/);
  assert.match(SHELF.find((item) => item.id === "charan")?.intro ?? "", /just CHARAN/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "charan")?.intro ?? "", /Beckoning Fair One/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "charan")?.intro ?? "", /Lord Arthur Savile/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "charan")?.intro ?? "", /Inventory \d+/);
  const charanOpen = JSON.parse(
    readFileSync(new URL("./openings/charan.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(charanOpen.scenes[0]?.title ?? "", /Korea/);
});

test("Mira POST-#183 CLEAR is Next lead Sister Carrie, then Antic Hay, A spring-time case, and Eline Vere, with The Hungry Stones on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "sister-carrie",
    "antic-hay",
    "spring-time-case",
    "eline-vere",
  ] as const;
  const prior = [
    "three-soldiers",
    "doctor-pascal",
    "in-the-world",
    "leila",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-96, -92), [...tail]);
  assert.deepEqual(next.slice(-100, -96), [...prior]);
  assert.equal(next.includes("hungry-stones"), false);
  assert.equal(next.includes("a-spring-time-case"), true);
  assert.ok(next.indexOf("a-spring-time-case") < next.indexOf("spring-time-case"));
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("leila") < next.lastIndexOf("sister-carrie"));
  for (const id of [...tail, "hungry-stones"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-56, -52), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-91, -87), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-51, -47), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-60, -56), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-95, -91), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-55, -51), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-10), "hungry-stones");
  assert.equal(waking?.workIds.at(-11), "charan");
  assert.equal(curatorialTrack("sister-carrie"), "next");
  assert.equal(curatorialTrack("antic-hay"), "next");
  assert.equal(curatorialTrack("spring-time-case"), "next");
  assert.equal(curatorialTrack("eline-vere"), "next");
  assert.equal(curatorialTrack("hungry-stones"), "later");
  assert.equal(curatorialTrack("a-spring-time-case"), "next");
  assert.equal(curatorialTrack("three-soldiers"), "next");
  assert.equal(SHELF.filter((item) => item.id === "sister-carrie").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "antic-hay").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "spring-time-case").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "eline-vere").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "hungry-stones").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "a-spring-time-case").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-hungry-stones-and-other-stories").length, 1);
  assert.equal(SHELF.find((item) => item.id === "a-spring-time-case")?.gutenberg, 73132);
  assert.equal(SHELF.find((item) => item.id === "a-spring-time-case")?.breaths, 425);
  assert.equal(SHELF.find((item) => item.id === "a-spring-time-case")?.year, 1915);
  assert.equal(SHELF.find((item) => item.id === "the-hungry-stones-and-other-stories")?.breaths, 748);
  assert.equal(SHELF.find((item) => item.id === "the-hungry-stones-and-other-stories")?.gutenberg, 2518);

  const opens = {
    "sister-carrie": {
      gutenberg: 233,
      year: 1900,
      breaths: 4850,
      scenes: 47,
      minutes: 4,
      opening: "When Caroline Meeber boarded the afternoon train",
      stop: "She answered",
      firstWords: 154,
      openBreaths: 7,
    },
    "antic-hay": {
      gutenberg: 60483,
      year: 1923,
      breaths: 1886,
      scenes: 22,
      minutes: 4,
      opening: "Gumbril, Theodore Gumbril Junior",
      stop: "caro nome",
      firstWords: 71,
      openBreaths: 12,
    },
    "spring-time-case": {
      gutenberg: 73132,
      year: 1927,
      breaths: 397,
      scenes: 5,
      minutes: 4,
      opening: "tolling of the fifth hour",
      stop: "soft glow on the paper",
      firstWords: 235,
      openBreaths: 8,
    },
    "eline-vere": {
      gutenberg: 66911,
      year: 1889,
      breaths: 2941,
      scenes: 30,
      minutes: 4,
      opening: "They were close to each other in the dining-room",
      stop: "sadder expression",
      firstWords: 49,
      openBreaths: 23,
    },
    "hungry-stones": {
      gutenberg: 2518,
      year: 1916,
      breaths: 55,
      scenes: 1,
      minutes: 12,
      opening: "returning to Calcutta from our Puja trip",
      stop: "theosophist kinsman",
      firstWords: 277,
      openBreaths: 55,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    if (id === "hungry-stones") {
      assert.ok(want.firstWords > 250, id);
    } else {
      assert.ok(want.firstWords <= 250, id);
    }
    if (id === "hungry-stones") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} tale ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const carrie = JSON.parse(
    readFileSync(new URL("./texts/sister-carrie.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(carrie.year, "1900");
  assert.equal(carrie.author, "Theodore Dreiser");
  assert.doesNotMatch(SHELF.find((item) => item.id === "sister-carrie")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "sister-carrie")?.intro ?? "", /The Pit/);
  assert.match(SHELF.find((item) => item.id === "sister-carrie")?.intro ?? "", /Chicago/);
  assert.match(bindNote("sister-carrie"), /Inventory 80/);

  const hay = JSON.parse(
    readFileSync(new URL("./texts/antic-hay.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(hay.year, "1923");
  assert.equal(hay.author, "Aldous Huxley");
  assert.doesNotMatch(SHELF.find((item) => item.id === "antic-hay")?.intro ?? "", /Way of All Flesh/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "antic-hay")?.intro ?? "", /Lord Arthur/);
  assert.match(bindNote("antic-hay"), /Inventory 84/);

  const spring = JSON.parse(
    readFileSync(new URL("./texts/spring-time-case.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(spring.year, "1927");
  assert.match(spring.author ?? "", /Z\. Tamotsu Iwado/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "spring-time-case")?.intro ?? "", /Naomi/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "spring-time-case")?.intro ?? "", /CHARAN/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "spring-time-case")?.intro ?? "", /No wider inventory score/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "spring-time-case")?.intro ?? "", /Inventory \d+/);

  const eline = JSON.parse(
    readFileSync(new URL("./texts/eline-vere.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(eline.year, "1889");
  assert.match(eline.author ?? "", /J\. T\. Grein/);
  assert.match(SHELF.find((item) => item.id === "eline-vere")?.intro ?? "", /1892/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "eline-vere")?.intro ?? "", /Small Souls/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "eline-vere")?.intro ?? "", /Hidden Force/);
  assert.match(bindNote("eline-vere"), /Inventory 67/);

  const stones = JSON.parse(
    readFileSync(new URL("./texts/hungry-stones.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(stones.year, "1916");
  assert.equal(stones.author, "Rabindranath Tagore");
  assert.equal(stones.title, "The Hungry Stones");
  assert.equal(stones.scenes.length, 1);
  assert.match(stones.scenes[0]?.title ?? "", /Hungry Stones/);
  assert.match(SHELF.find((item) => item.id === "hungry-stones")?.intro ?? "", /just The Hungry Stones/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "hungry-stones")?.intro ?? "", /Poison Tree/);
  assert.match(SHELF.find((item) => item.id === "hungry-stones")?.intro ?? "", /several hands/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "hungry-stones")?.intro ?? "", /277|first breath/);
  assert.ok((SHELF.find((item) => item.id === "hungry-stones")?.intro ?? "").endsWith("Rabindranath Tagore’s 1916 tale. The preface is several hands."));
  const stonesOpen = JSON.parse(
    readFileSync(new URL("./openings/hungry-stones.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(stonesOpen.scenes[0]?.title ?? "", /Bengal/);
});

test("Mira POST-#184 CLEAR is Next lead Smoke, then Niels Lyhne, The Emancipated, and Germinal, with Our Lady of the Pillar on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["smoke", "niels-lyhne", "the-emancipated", "germinal"] as const;
  const prior = ["sister-carrie", "antic-hay", "spring-time-case", "eline-vere"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-92, -88), [...tail]);
  assert.deepEqual(next.slice(-96, -92), [...prior]);
  assert.equal(next.includes("our-lady-of-the-pillar"), false);
  for (const id of ["smoke", "the-emancipated"] as const) {
    assert.ok(next.indexOf(id) < next.lastIndexOf(id), id);
  }
  for (const id of ["niels-lyhne", "germinal"] as const) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("eline-vere") < next.lastIndexOf("smoke"));
  for (const id of [...tail, "our-lady-of-the-pillar"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-52, -48), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-87, -83), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-47, -43), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-56, -52), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-91, -87), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-51, -47), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-9), "our-lady-of-the-pillar");
  assert.equal(waking?.workIds.at(-10), "hungry-stones");
  assert.equal(curatorialTrack("smoke"), "next");
  assert.equal(curatorialTrack("niels-lyhne"), "next");
  assert.equal(curatorialTrack("the-emancipated"), "next");
  assert.equal(curatorialTrack("germinal"), "next");
  assert.equal(curatorialTrack("our-lady-of-the-pillar"), "later");
  assert.equal(curatorialTrack("sister-carrie"), "next");
  assert.equal(curatorialTrack("three-soldiers"), "next");
  assert.equal(SHELF.filter((item) => item.id === "smoke").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "niels-lyhne").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-emancipated").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "germinal").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "our-lady-of-the-pillar").length, 1);

  const opens = {
    smoke: {
      gutenberg: 40813,
      year: 1867,
      breaths: 1238,
      scenes: 28,
      minutes: 6,
      opening: "10th of August 1862",
      stop: "boredom consuming them",
      firstWords: 168,
      openBreaths: 2,
    },
    "niels-lyhne": {
      gutenberg: 55389,
      year: 1880,
      breaths: 895,
      scenes: 14,
      minutes: 5,
      opening: "black, luminous eyes",
      stop: "Lyhne households",
      firstWords: 73,
      openBreaths: 12,
    },
    "the-emancipated": {
      gutenberg: 4311,
      year: 1890,
      breaths: 3897,
      scenes: 33,
      minutes: 4,
      opening: "window looking from Posillipo",
      stop: "you understand me",
      firstWords: 251,
      openBreaths: 5,
    },
    germinal: {
      gutenberg: 56528,
      year: 1885,
      breaths: 3153,
      scenes: 40,
      minutes: 4,
      opening: "starless sky",
      stop: "foot of the platform",
      firstWords: 103,
      openBreaths: 12,
    },
    "our-lady-of-the-pillar": {
      gutenberg: 56670,
      year: 1906,
      breaths: 28,
      scenes: 4,
      minutes: 12,
      opening: "In 1474",
      stop: "rulers of Castile",
      firstWords: 49,
      openBreaths: 28,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    if (id === "the-emancipated") {
      assert.ok(want.firstWords > 250, id);
    } else {
      assert.ok(want.firstWords <= 250, id);
    }
    if (id === "our-lady-of-the-pillar") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} tale ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const smoke = JSON.parse(
    readFileSync(new URL("./texts/smoke.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(smoke.year, "1867");
  assert.match(smoke.author ?? "", /Constance Garnett/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "smoke")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "smoke")?.intro ?? "", /In the World/);
  assert.match(SHELF.find((item) => item.id === "smoke")?.intro ?? "", /Baden/);
  assert.match(SHELF.find((item) => item.id === "smoke")?.intro ?? "", /1906/);
  assert.match(bindNote("smoke"), /Inventory 76/);

  const niels = JSON.parse(
    readFileSync(new URL("./texts/niels-lyhne.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(niels.year, "1880");
  assert.match(niels.author ?? "", /Hanna Astrup Larsen/);
  assert.match(SHELF.find((item) => item.id === "niels-lyhne")?.intro ?? "", /1919/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "niels-lyhne")?.intro ?? "", /Mogens/);
  assert.match(bindNote("niels-lyhne"), /Inventory 67/);

  const emancipated = JSON.parse(
    readFileSync(new URL("./texts/the-emancipated.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(emancipated.year, "1890");
  assert.equal(emancipated.author, "George Gissing");
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-emancipated")?.intro ?? "", /Born in Exile/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-emancipated")?.intro ?? "", /Leila/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-emancipated")?.intro ?? "", /251|first breath/);
  assert.ok((SHELF.find((item) => item.id === "the-emancipated")?.intro ?? "").endsWith("George Gissing’s 1890 novel. Naples is secular."));
  assert.match(bindNote("the-emancipated"), /Inventory 81/);

  const germinal = JSON.parse(
    readFileSync(new URL("./texts/germinal.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(germinal.year, "1885");
  assert.match(germinal.author ?? "", /Havelock Ellis/);
  assert.match(SHELF.find((item) => item.id === "germinal")?.intro ?? "", /Montsou/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "germinal")?.intro ?? "", /Doctor Pascal/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "germinal")?.intro ?? "", /Three Soldiers/);
  assert.match(bindNote("germinal"), /Inventory 71/);

  const pillar = JSON.parse(
    readFileSync(new URL("./texts/our-lady-of-the-pillar.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(pillar.year, "1906");
  assert.match(pillar.author ?? "", /Edgar Prestage/);
  assert.equal(pillar.title, "Our Lady of the Pillar");
  assert.equal(pillar.scenes.length, 4);
  assert.match(pillar.scenes[0]?.title ?? "", /Our Lady of the Pillar/);
  assert.match(SHELF.find((item) => item.id === "our-lady-of-the-pillar")?.intro ?? "", /just Our Lady of the Pillar/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "our-lady-of-the-pillar")?.intro ?? "", /Dragon/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "our-lady-of-the-pillar")?.intro ?? "", /Toledo/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "our-lady-of-the-pillar")?.intro ?? "", /No wider inventory score/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "our-lady-of-the-pillar")?.intro ?? "", /Inventory \d+/);
  const pillarOpen = JSON.parse(
    readFileSync(new URL("./openings/our-lady-of-the-pillar.json", import.meta.url), "utf8"),
  ) as PackedSit & { scenes: { title?: string }[] };
  assert.match(pillarOpen.scenes[0]?.title ?? "", /Segovia/);

  const carrie = JSON.parse(
    readFileSync(new URL("./texts/sister-carrie.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(carrie.year, "1900");
  const soldiers = JSON.parse(
    readFileSync(new URL("./texts/three-soldiers.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(soldiers.year, "1921");
});

test("Mira POST-#185 CLEAR is Next lead Kipps, then The Professor, A Room with a View, and Martin Eden, with Madame Heurtebise on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["kipps", "the-professor", "a-room-with-a-view", "martin-eden"] as const;
  const prior = ["smoke", "niels-lyhne", "the-emancipated", "germinal"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-88, -84), [...tail]);
  assert.deepEqual(next.slice(-92, -88), [...prior]);
  assert.equal(next.includes("madame-heurtebise"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("germinal") < next.lastIndexOf("kipps"));
  for (const id of [...tail, "madame-heurtebise"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-48, -44), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-83, -79), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-43, -39), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-52, -48), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-87, -83), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-47, -43), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-8), "madame-heurtebise");
  assert.equal(waking?.workIds.at(-9), "our-lady-of-the-pillar");
  assert.equal(curatorialTrack("kipps"), "next");
  assert.equal(curatorialTrack("the-professor"), "next");
  assert.equal(curatorialTrack("a-room-with-a-view"), "next");
  assert.equal(curatorialTrack("martin-eden"), "next");
  assert.equal(curatorialTrack("madame-heurtebise"), "later");
  assert.equal(curatorialTrack("smoke"), "next");
  assert.equal(curatorialTrack("ann-veronica"), "next");
  assert.equal(SHELF.filter((item) => item.id === "kipps").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-professor").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "a-room-with-a-view").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "martin-eden").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "madame-heurtebise").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "artists-wives").length, 1);
  assert.equal(SHELF.find((item) => item.id === "artists-wives")?.gutenberg, 22522);
  assert.equal(SHELF.find((item) => item.id === "artists-wives")?.breaths, 337);

  const opens = {
    kipps: {
      gutenberg: 39162,
      year: 1905,
      breaths: 2879,
      scenes: 18,
      minutes: 4,
      opening: "aunt and uncle",
      stop: "forbidden region",
      firstWords: 190,
      openBreaths: 4,
    },
    "the-professor": {
      gutenberg: 1028,
      year: 1857,
      breaths: 1314,
      scenes: 25,
      minutes: 4,
      opening: "old school acquaintance",
      stop: "hope or comfort",
      firstWords: 30,
      openBreaths: 7,
    },
    "a-room-with-a-view": {
      gutenberg: 2641,
      year: 1908,
      breaths: 2146,
      scenes: 20,
      minutes: 4,
      opening: "south rooms with a view",
      stop: "half an hour",
      firstWords: 43,
      openBreaths: 22,
    },
    "martin-eden": {
      gutenberg: 1056,
      year: 1909,
      breaths: 2226,
      scenes: 46,
      minutes: 4,
      opening: "latch-key",
      stop: "approaching too near",
      firstWords: 96,
      openBreaths: 6,
    },
    "madame-heurtebise": {
      gutenberg: 22522,
      year: 1874,
      breaths: 17,
      scenes: 1,
      minutes: 11,
      opening: "artist's wife",
      stop: "smile of the shopwoman",
      firstWords: 93,
      openBreaths: 17,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "madame-heurtebise") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const kipps = JSON.parse(
    readFileSync(new URL("./texts/kipps.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(kipps.year, "1905");
  assert.equal(kipps.author, "H. G. Wells");
  assert.doesNotMatch(SHELF.find((item) => item.id === "kipps")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "kipps")?.intro ?? "", /Ann Veronica/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "kipps")?.intro ?? "", /Antic Hay/);
  assert.match(SHELF.find((item) => item.id === "kipps")?.intro ?? "", /New Romney/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "kipps")?.intro ?? "", /1906|imprint/);
  assert.ok((SHELF.find((item) => item.id === "kipps")?.intro ?? "").endsWith("H. G. Wells’s 1905 novel."));
  assert.match(bindNote("kipps"), /Inventory 79/);

  const professor = JSON.parse(
    readFileSync(new URL("./texts/the-professor.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(professor.year, "1857");
  assert.equal(professor.author, "Charlotte Brontë");
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-professor")?.intro ?? "", /Wildfell/);
  assert.match(bindNote("the-professor"), /Inventory 77/);

  const room = JSON.parse(
    readFileSync(new URL("./texts/a-room-with-a-view.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(room.year, "1908");
  assert.equal(room.author, "E. M. Forster");
  assert.doesNotMatch(SHELF.find((item) => item.id === "a-room-with-a-view")?.intro ?? "", /Where Angels Fear/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "a-room-with-a-view")?.intro ?? "", /Leila/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "a-room-with-a-view")?.intro ?? "", /Florence/);
  assert.match(bindNote("a-room-with-a-view"), /Inventory 75/);

  const martin = JSON.parse(
    readFileSync(new URL("./texts/martin-eden.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(martin.year, "1909");
  assert.equal(martin.author, "Jack London");
  assert.doesNotMatch(SHELF.find((item) => item.id === "martin-eden")?.intro ?? "", /Law of Life/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "martin-eden")?.intro ?? "", /Sister Carrie/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "martin-eden")?.intro ?? "", /Oakland/);
  assert.match(bindNote("martin-eden"), /Inventory 75/);

  const heurtebise = JSON.parse(
    readFileSync(new URL("./texts/madame-heurtebise.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(heurtebise.year, "1874");
  assert.match(heurtebise.author ?? "", /Laura Ensor/);
  assert.equal(heurtebise.title, "Madame Heurtebise");
  assert.equal(heurtebise.scenes.length, 1);
  assert.match(heurtebise.scenes[0]?.title ?? "", /Madame Heurtebise/);
  assert.match(SHELF.find((item) => item.id === "madame-heurtebise")?.intro ?? "", /just Madame Heurtebise/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "madame-heurtebise")?.intro ?? "", /Numa Roumestan/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "madame-heurtebise")?.intro ?? "", /Nabob/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "madame-heurtebise")?.intro ?? "", /Germinal/);
  assert.match(bindNote("madame-heurtebise"), /Inventory 80/);

  const smoke = JSON.parse(
    readFileSync(new URL("./texts/smoke.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(smoke.year, "1867");
  const carrie = JSON.parse(
    readFileSync(new URL("./texts/sister-carrie.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(carrie.year, "1900");
  const soldiers = JSON.parse(
    readFileSync(new URL("./texts/three-soldiers.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(soldiers.year, "1921");
});

test("Mira POST-#186 CLEAR is Next lead Une Vie, then My Ántonia, Look Back on Happiness, and The Good Soldier, with The Father of Yoto on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["une-vie", "my-antonia", "look-back-on-happiness", "the-good-soldier"] as const;
  const prior = ["kipps", "the-professor", "a-room-with-a-view", "martin-eden"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-84, -80), [...tail]);
  assert.deepEqual(next.slice(-88, -84), [...prior]);
  assert.equal(next.includes("father-of-yoto"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("martin-eden") < next.lastIndexOf("une-vie"));
  for (const id of [...tail, "father-of-yoto"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-44, -40), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-79, -75), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-39, -35), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-48, -44), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-83, -79), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-43, -39), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-7), "father-of-yoto");
  assert.equal(waking?.workIds.at(-8), "madame-heurtebise");
  assert.equal(curatorialTrack("une-vie"), "next");
  assert.equal(curatorialTrack("my-antonia"), "next");
  assert.equal(curatorialTrack("look-back-on-happiness"), "next");
  assert.equal(curatorialTrack("the-good-soldier"), "next");
  assert.equal(curatorialTrack("father-of-yoto"), "later");
  assert.equal(curatorialTrack("kipps"), "next");
  assert.equal(curatorialTrack("bel-ami"), "later");
  assert.equal(SHELF.filter((item) => item.id === "une-vie").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "my-antonia").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "look-back-on-happiness").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-good-soldier").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "father-of-yoto").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "limehouse-nights").length, 1);
  assert.equal(SHELF.find((item) => item.id === "limehouse-nights")?.gutenberg, 63073);
  assert.equal(SHELF.find((item) => item.id === "limehouse-nights")?.breaths, 3692);
  assert.equal(SHELF.find((item) => item.id === "father-of-yoto")?.gutenberg, 63073);

  const opens = {
    "une-vie": {
      gutenberg: 7114,
      year: 1883,
      breaths: 1226,
      scenes: 14,
      minutes: 5,
      opening: "weather was most distressing",
      stop: "inundated the highway",
      firstWords: 582,
      openBreaths: 2,
    },
    "my-antonia": {
      gutenberg: 242,
      year: 1918,
      breaths: 1065,
      scenes: 45,
      minutes: 5,
      opening: "midland plain",
      stop: "we followed them",
      firstWords: 122,
      openBreaths: 9,
    },
    "look-back-on-happiness": {
      gutenberg: 8445,
      year: 1912,
      breaths: 1818,
      scenes: 38,
      minutes: 3,
      opening: "gone to the forest",
      stop: "sits watching me",
      firstWords: 6,
      openBreaths: 10,
    },
    "the-good-soldier": {
      gutenberg: 2775,
      year: 1915,
      breaths: 768,
      scenes: 19,
      minutes: 4,
      opening: "saddest story",
      stop: "out of their heads",
      firstWords: 136,
      openBreaths: 6,
    },
    "father-of-yoto": {
      gutenberg: 63073,
      year: 1916,
      breaths: 42,
      scenes: 1,
      minutes: 12,
      opening: "Sweet human hearts",
      stop: "fragrantly than I",
      firstWords: 64,
      openBreaths: 42,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    if (id === "une-vie") {
      assert.ok(want.firstWords > 250, id);
      assert.doesNotMatch(work.intro ?? "", /582|first breath|no separate translator/);
      assert.ok((work.intro ?? "").endsWith("Guy de Maupassant, in Albert M. C. McMaster and A. E. Henderson’s English, 1883."));
    } else {
      assert.ok(want.firstWords <= 250, id);
    }
    if (id === "father-of-yoto") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const une = JSON.parse(
    readFileSync(new URL("./texts/une-vie.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(une.year, "1883");
  assert.match(une.author ?? "", /McMaster/);
  assert.match(une.author ?? "", /Henderson/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "une-vie")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "une-vie")?.intro ?? "", /Bel-Ami/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "une-vie")?.intro ?? "", /Germinal/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "une-vie")?.intro ?? "", /Normandy/);
  assert.match(bindNote("une-vie"), /Inventory 81/);

  const antonia = JSON.parse(
    readFileSync(new URL("./texts/my-antonia.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(antonia.year, "1918");
  assert.equal(antonia.author, "Willa Cather");
  assert.doesNotMatch(SHELF.find((item) => item.id === "my-antonia")?.intro ?? "", /Death Comes/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "my-antonia")?.intro ?? "", /Martin Eden/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "my-antonia")?.intro ?? "", /Sister Carrie/);
  assert.match(bindNote("my-antonia"), /Inventory 79/);

  const look = JSON.parse(
    readFileSync(new URL("./texts/look-back-on-happiness.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(look.year, "1912");
  assert.match(look.author ?? "", /Paula Wiking/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "look-back-on-happiness")?.intro ?? "", /Gilje/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "look-back-on-happiness")?.intro ?? "", /Niels/);
  assert.match(bindNote("look-back-on-happiness"), /Inventory 84/);

  const soldier = JSON.parse(
    readFileSync(new URL("./texts/the-good-soldier.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(soldier.year, "1915");
  assert.equal(soldier.author, "Ford Madox Ford");
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-good-soldier")?.intro ?? "", /Kipps/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-good-soldier")?.intro ?? "", /Antic Hay/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-good-soldier")?.intro ?? "", /Smoke/);
  assert.match(SHELF.find((item) => item.id === "the-good-soldier")?.intro ?? "", /Nauheim/);
  assert.match(bindNote("the-good-soldier"), /Inventory 72/);

  const yoto = JSON.parse(
    readFileSync(new URL("./texts/father-of-yoto.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(yoto.year, "1916");
  assert.equal(yoto.author, "Thomas Burke");
  assert.equal(yoto.title, "The Father of Yoto");
  assert.equal(yoto.scenes.length, 1);
  assert.match(yoto.scenes[0]?.title ?? "", /Father of Yoto/);
  assert.match(SHELF.find((item) => item.id === "father-of-yoto")?.intro ?? "", /just The Father of Yoto/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "father-of-yoto")?.intro ?? "", /Heurtebise/);
  assert.match(bindNote("father-of-yoto"), /Inventory 76/);

  const kipps = JSON.parse(
    readFileSync(new URL("./texts/kipps.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(kipps.year, "1905");
});

test("Mira POST-#187 CLEAR is Next lead Crime and Punishment, then Uncle Silas, The Rise of David Levinsky, and For the Term of His Natural Life, with The Bottle Imp on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["crime-and-punishment", "uncle-silas", "rise-of-david-levinsky", "for-the-term-of-his-natural-life"] as const;
  const prior = ["une-vie", "my-antonia", "look-back-on-happiness", "the-good-soldier"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-80, -76), [...tail]);
  assert.deepEqual(next.slice(-84, -80), [...prior]);
  assert.equal(next.includes("bottle-imp"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("the-good-soldier") < next.lastIndexOf("crime-and-punishment"));
  for (const id of [...tail, "bottle-imp"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-40, -36), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-75, -71), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-35, -31), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-44, -40), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-79, -75), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-39, -35), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-6), "bottle-imp");
  assert.equal(waking?.workIds.at(-7), "father-of-yoto");
  assert.equal(curatorialTrack("crime-and-punishment"), "next");
  assert.equal(curatorialTrack("uncle-silas"), "next");
  assert.equal(curatorialTrack("rise-of-david-levinsky"), "next");
  assert.equal(curatorialTrack("for-the-term-of-his-natural-life"), "next");
  assert.equal(curatorialTrack("bottle-imp"), "later");
  assert.equal(curatorialTrack("une-vie"), "next");
  assert.equal(curatorialTrack("the-rise-of-david-levinsky"), "next");
  assert.equal(SHELF.filter((item) => item.id === "crime-and-punishment").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "uncle-silas").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "rise-of-david-levinsky").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "for-the-term-of-his-natural-life").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "bottle-imp").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-rise-of-david-levinsky").length, 1);

  const opens = {
    "crime-and-punishment": {
      gutenberg: 2554,
      year: 1866,
      breaths: 3897,
      scenes: 41,
      minutes: 5,
      opening: "exceptionally hot evening",
      stop: "akin to terror had overtaken him",
      firstWords: 33,
      openBreaths: 7,
    },
    "uncle-silas": {
      gutenberg: 14851,
      year: 1864,
      breaths: 4264,
      scenes: 65,
      minutes: 5,
      opening: "It was winter",
      stop: "loyal housekeeper",
      firstWords: 143,
      openBreaths: 10,
    },
    "rise-of-david-levinsky": {
      gutenberg: 2803,
      year: 1917,
      breaths: 3990,
      scenes: 93,
      minutes: 4,
      opening: "metamorphosis",
      stop: "father's spirit",
      firstWords: 126,
      openBreaths: 9,
    },
    "for-the-term-of-his-natural-life": {
      gutenberg: 3424,
      year: 1874,
      breaths: 3335,
      scenes: 75,
      minutes: 4,
      opening: "breathless stillness",
      stop: "transportation for life",
      firstWords: 35,
      openBreaths: 9,
    },
    "bottle-imp": {
      gutenberg: 329,
      year: 1893,
      breaths: 246,
      scenes: 1,
      minutes: 12,
      opening: "Island of Hawaii",
      stop: "Bright House",
      firstWords: 116,
      openBreaths: 246,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    if (id === "bottle-imp") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} sketch ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const crime = JSON.parse(
    readFileSync(new URL("./texts/crime-and-punishment.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(crime.year, "1866");
  assert.match(crime.author ?? "", /Constance Garnett/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "crime-and-punishment")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "crime-and-punishment")?.intro ?? "", /Petersburg/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "crime-and-punishment")?.intro ?? "", /Smoke/);
  assert.match(bindNote("crime-and-punishment"), /Inventory 79/);

  const uncle = JSON.parse(
    readFileSync(new URL("./texts/uncle-silas.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(uncle.year, "1864");
  assert.equal(uncle.author, "Joseph Sheridan Le Fanu");
  assert.doesNotMatch(SHELF.find((item) => item.id === "uncle-silas")?.intro ?? "", /Irish Fairy Tales/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "uncle-silas")?.intro ?? "", /Widdershins/);
  assert.match(bindNote("uncle-silas"), /Inventory 73/);

  const lev = JSON.parse(
    readFileSync(new URL("./texts/rise-of-david-levinsky.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(lev.year, "1917");
  assert.equal(lev.author, "Abraham Cahan");
  assert.doesNotMatch(SHELF.find((item) => item.id === "rise-of-david-levinsky")?.intro ?? "", /Hungry Hearts/);
  assert.match(bindNote("rise-of-david-levinsky"), /Inventory 90/);

  const life = JSON.parse(
    readFileSync(new URL("./texts/for-the-term-of-his-natural-life.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(life.year, "1874");
  assert.equal(life.author, "Marcus Clarke");
  assert.match(life.scenes[0]?.title ?? "", /Prison Ship/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "for-the-term-of-his-natural-life")?.intro ?? "", /Kangaroo/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "for-the-term-of-his-natural-life")?.intro ?? "", /Brilliant Career/);
  assert.match(bindNote("for-the-term-of-his-natural-life"), /Inventory 70/);

  const bottle = JSON.parse(
    readFileSync(new URL("./texts/bottle-imp.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(bottle.year, "1893");
  assert.equal(bottle.author, "Robert Louis Stevenson");
  assert.equal(bottle.title, "The Bottle Imp");
  assert.equal(bottle.scenes.length, 1);
  assert.match(bottle.scenes[0]?.title ?? "", /Bottle Imp/);
  assert.match(SHELF.find((item) => item.id === "bottle-imp")?.intro ?? "", /just The Bottle Imp/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "bottle-imp")?.intro ?? "", /Skip the/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "bottle-imp")?.intro ?? "", /Typee/);
  assert.match(bindNote("bottle-imp"), /Inventory 78/);

  const une = JSON.parse(
    readFileSync(new URL("./texts/une-vie.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(une.year, "1883");
});


test("Mira POST-#188 CLEAR is Next lead Death in Venice, then Elmer Gantry, The Colonel's Dream, and Hard Times, with The Great God Pan on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["death-in-venice", "elmer-gantry", "colonels-dream", "hard-times"] as const;
  const prior = ["crime-and-punishment", "uncle-silas", "rise-of-david-levinsky", "for-the-term-of-his-natural-life"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-76, -72), [...tail]);
  assert.deepEqual(next.slice(-80, -76), [...prior]);
  assert.equal(next.includes("great-god-pan"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("for-the-term-of-his-natural-life") < next.lastIndexOf("death-in-venice"));
  for (const id of [...tail, "great-god-pan"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-36, -32), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-71, -67), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-31, -27), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-40, -36), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-75, -71), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-35, -31), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-5), "great-god-pan");
  assert.equal(waking?.workIds.at(-6), "bottle-imp");
  assert.equal(curatorialTrack("death-in-venice"), "next");
  assert.equal(curatorialTrack("elmer-gantry"), "next");
  assert.equal(curatorialTrack("colonels-dream"), "next");
  assert.equal(curatorialTrack("hard-times"), "next");
  assert.equal(curatorialTrack("great-god-pan"), "later");
  assert.equal(curatorialTrack("crime-and-punishment"), "next");
  assert.equal(curatorialTrack("the-colonels-dream"), "later");
  assert.equal(curatorialTrack("the-great-god-pan"), "later");
  assert.equal(SHELF.filter((item) => item.id === "death-in-venice").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "elmer-gantry").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "colonels-dream").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "hard-times").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "great-god-pan").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-colonels-dream").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-great-god-pan").length, 1);
  assert.equal(SHELF.find((item) => item.id === "the-colonels-dream")?.local, undefined);
  assert.equal(SHELF.find((item) => item.id === "the-great-god-pan")?.breaths, 1038);
  assert.equal(SHELF.find((item) => item.id === "the-great-god-pan")?.minutes, 130);

  const opens = {
    "death-in-venice": {
      gutenberg: 66073,
      year: 1912,
      breaths: 161,
      scenes: 5,
      minutes: 5,
      shelfMinutes: 141,
      opening: "spring afternoon",
      stop: "purport of this emotion",
      firstWords: 152,
      openBreaths: 5,
    },
    "elmer-gantry": {
      gutenberg: 72609,
      year: 1927,
      breaths: 3647,
      scenes: 33,
      minutes: 5,
      shelfMinutes: 759,
      opening: "Old Home Sample Room",
      stop: "search of it",
      firstWords: 50,
      openBreaths: 22,
    },
    "colonels-dream": {
      gutenberg: 19746,
      year: 1905,
      breaths: 1488,
      scenes: 35,
      minutes: 5,
      shelfMinutes: 419,
      opening: "French and Company",
      stop: "placed it to his ear",
      firstWords: 79,
      openBreaths: 11,
    },
    "hard-times": {
      gutenberg: 786,
      year: 1854,
      breaths: 2255,
      scenes: 37,
      minutes: 5,
      shelfMinutes: 514,
      opening: "Facts",
      stop: "bleed white",
      firstWords: 77,
      openBreaths: 23,
    },
    "great-god-pan": {
      gutenberg: 389,
      year: 1894,
      breaths: 318,
      scenes: 8,
      minutes: 12,
      shelfMinutes: 12,
      opening: "glad you came",
      stop: "her companions",
      firstWords: 18,
      openBreaths: 318,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.ok((full.breaths[0]?.text ?? "").startsWith(work.opening ?? "\u0000"), id);
    if (id === "great-god-pan") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} novella ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
    if (id === "elmer-gantry") {
      const flat = fullJoined.replace(/\s+/g, " ");
      assert.match(flat, /Old Home Sample Room/);
      assert.match(joined.replace(/\s+/g, " "), /Old Home Sample Room/);
    }
  }

  const venice = JSON.parse(
    readFileSync(new URL("./texts/death-in-venice.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(venice.year, "1912");
  assert.match(venice.author ?? "", /Kenneth Burke/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "death-in-venice")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "death-in-venice")?.intro ?? "", /Venice/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "death-in-venice")?.intro ?? "", /Royal Highness/);
  assert.match(bindNote("death-in-venice"), /Inventory 76/);

  const elmer = JSON.parse(
    readFileSync(new URL("./texts/elmer-gantry.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(elmer.year, "1927");
  assert.equal(elmer.author, "Sinclair Lewis");
  assert.doesNotMatch(SHELF.find((item) => item.id === "elmer-gantry")?.intro ?? "", /The Job/);
  assert.match(bindNote("elmer-gantry"), /Inventory 81/);

  const colonel = JSON.parse(
    readFileSync(new URL("./texts/colonels-dream.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(colonel.year, "1905");
  assert.equal(colonel.author, "Charles W. Chesnutt");
  assert.doesNotMatch(SHELF.find((item) => item.id === "colonels-dream")?.intro ?? "", /Marrow of Tradition/);
  assert.match(SHELF.find((item) => item.id === "colonels-dream")?.intro ?? "", /Clarendon/);
  assert.match(bindNote("colonels-dream"), /Inventory 85/);

  const hard = JSON.parse(
    readFileSync(new URL("./texts/hard-times.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(hard.year, "1854");
  assert.equal(hard.author, "Charles Dickens");
  assert.doesNotMatch(SHELF.find((item) => item.id === "hard-times")?.intro ?? "", /Coketown/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "hard-times")?.intro ?? "", /Kipps/);
  assert.match(bindNote("hard-times"), /Inventory 76/);

  const pan = JSON.parse(
    readFileSync(new URL("./texts/great-god-pan.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(pan.year, "1894");
  assert.equal(pan.author, "Arthur Machen");
  assert.equal(pan.title, "The Great God Pan");
  assert.equal(pan.scenes.length, 8);
  assert.match(pan.scenes[0]?.title ?? "", /Experiment/);
  assert.match(SHELF.find((item) => item.id === "great-god-pan")?.intro ?? "", /just The Great God Pan/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "great-god-pan")?.intro ?? "", /Hill of Dreams/);
  assert.match(bindNote("great-god-pan"), /Inventory 93/);

  const crime = JSON.parse(
    readFileSync(new URL("./texts/crime-and-punishment.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(crime.year, "1866");
});

test("Mira POST-#189 CLEAR is Next lead Manalive, then Captain Blood, The Monomaniac, and Tartarin de Tarascon, with The Time Machine on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["manalive", "captain-blood", "the-monomaniac", "tartarin-de-tarascon"] as const;
  const prior = ["death-in-venice", "elmer-gantry", "colonels-dream", "hard-times"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-72, -68), [...tail]);
  assert.deepEqual(next.slice(-76, -72), [...prior]);
  assert.equal(next.includes("the-time-machine"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("hard-times") < next.lastIndexOf("manalive"));
  for (const id of [...tail, "the-time-machine"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-32, -28), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-67, -63), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-27, -23), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-36, -32), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-71, -67), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-31, -27), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-4), "the-time-machine");
  assert.equal(waking?.workIds.at(-5), "great-god-pan");
  assert.equal(curatorialTrack("manalive"), "next");
  assert.equal(curatorialTrack("captain-blood"), "next");
  assert.equal(curatorialTrack("the-monomaniac"), "next");
  assert.equal(curatorialTrack("tartarin-de-tarascon"), "next");
  assert.equal(curatorialTrack("the-time-machine"), "later");
  assert.equal(curatorialTrack("death-in-venice"), "next");
  assert.equal(SHELF.filter((item) => item.id === "manalive").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "captain-blood").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-monomaniac").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "tartarin-de-tarascon").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-time-machine").length, 1);

  const opens = {
    manalive: {
      gutenberg: 1718,
      year: 1912,
      breaths: 901,
      scenes: 10,
      minutes: 5,
      shelfMinutes: 288,
      opening: "unreasonable happiness",
      stop: "long-expected pantomime",
      firstWords: 337,
      openBreaths: 5,
    },
    "captain-blood": {
      gutenberg: 1965,
      year: 1922,
      breaths: 2648,
      scenes: 31,
      minutes: 5,
      shelfMinutes: 564,
      opening: "geraniums",
      stop: "indifferently skilled",
      firstWords: 32,
      openBreaths: 11,
    },
    "the-monomaniac": {
      gutenberg: 57038,
      year: 1890,
      breaths: 2292,
      scenes: 12,
      minutes: 5,
      shelfMinutes: 677,
      opening: "white wine",
      stop: "dying with hunger",
      firstWords: 63,
      openBreaths: 12,
    },
    "tartarin-de-tarascon": {
      gutenberg: 2375,
      year: 1872,
      breaths: 300,
      scenes: 30,
      minutes: 5,
      shelfMinutes: 125,
      opening: "Tartarin de Tarascon",
      stop: "rarest of creatures",
      firstWords: 31,
      openBreaths: 12,
    },
    "the-time-machine": {
      gutenberg: 35,
      year: 1895,
      breaths: 307,
      scenes: 17,
      minutes: 12,
      shelfMinutes: 12,
      opening: "Time Traveller",
      stop: "heart of man",
      firstWords: 128,
      openBreaths: 307,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    if (id !== "manalive") assert.ok(want.firstWords <= 250, id);
    assert.ok((full.breaths[0]?.text ?? "").startsWith(work.opening ?? "\u0000"), id);
    if (id === "the-time-machine") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} novel ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const lead = JSON.parse(
    readFileSync(new URL("./texts/manalive.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(lead.year, "1912");
  assert.equal(lead.author, "G. K. Chesterton");
  assert.doesNotMatch(SHELF.find((item) => item.id === "manalive")?.intro ?? "", /The lead is this book/);
  assert.match(SHELF.find((item) => item.id === "manalive")?.intro ?? "", /Beacon House/);
  assert.match(bindNote("manalive"), /PG reading-ease 77\.9/);

  const blood = JSON.parse(
    readFileSync(new URL("./texts/captain-blood.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(blood.year, "1922");
  assert.equal(blood.author, "Rafael Sabatini");
  assert.doesNotMatch(SHELF.find((item) => item.id === "captain-blood")?.intro ?? "", /Caribbean/);
  assert.match(bindNote("captain-blood"), /PG reading-ease 81\.2/);

  const mono = JSON.parse(
    readFileSync(new URL("./texts/the-monomaniac.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(mono.year, "1890");
  assert.match(mono.author ?? "", /Edward Vizetelly/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-monomaniac")?.intro ?? "", /Germinal/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-monomaniac")?.intro ?? "", /railway/);
  assert.match(bindNote("the-monomaniac"), /PG reading-ease 78\.5/);

  const tart = JSON.parse(
    readFileSync(new URL("./texts/tartarin-de-tarascon.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(tart.year, "1872");
  assert.match(tart.author ?? "", /Oliver C\. Colt/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "tartarin-de-tarascon")?.intro ?? "", /Algeria/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "tartarin-de-tarascon")?.intro ?? "", /Heurtebise/);
  assert.match(bindNote("tartarin-de-tarascon"), /PG reading-ease 78\.0/);

  const machine = JSON.parse(
    readFileSync(new URL("./texts/the-time-machine.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(machine.year, "1895");
  assert.equal(machine.author, "H. G. Wells");
  assert.equal(machine.title, "The Time Machine");
  assert.equal(machine.scenes.length, 17);
  assert.match(SHELF.find((item) => item.id === "the-time-machine")?.intro ?? "", /just The Time Machine/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-time-machine")?.intro ?? "", /Kipps/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-time-machine")?.intro ?? "", /PG reading-ease is easy/);

  const venice = JSON.parse(
    readFileSync(new URL("./texts/death-in-venice.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(venice.year, "1912");
});

test("Mira POST-#190 CLEAR is Next lead The Prisoner of Zenda, then Kidnapped, The Revolt of the Angels, and Children of the Soil, with The Invisible Man on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["prisoner-of-zenda", "kidnapped", "revolt-of-the-angels", "children-of-the-soil"] as const;
  const prior = ["manalive", "captain-blood", "the-monomaniac", "tartarin-de-tarascon"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-68, -64), [...tail]);
  assert.deepEqual(next.slice(-72, -68), [...prior]);
  assert.equal(next.includes("the-invisible-man"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("tartarin-de-tarascon") < next.lastIndexOf("prisoner-of-zenda"));
  for (const id of [...tail, "the-invisible-man"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(sleep?.workIds.slice(-28, -24), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-63, -59), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-23, -19), [...tail]);
  assert.deepEqual(sleep?.workIds.slice(-32, -28), [...prior]);
  assert.deepEqual(unwind?.workIds.slice(-67, -63), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-27, -23), [...prior]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.indexOf(id), sleep?.workIds.lastIndexOf(id), id);
    assert.equal(unwind?.workIds.indexOf(id), unwind?.workIds.lastIndexOf(id), id);
    assert.equal(walk?.workIds.indexOf(id), walk?.workIds.lastIndexOf(id), id);
  }
  assert.equal(waking?.workIds.at(-3), "the-invisible-man");
  assert.equal(waking?.workIds.at(-4), "the-time-machine");
  assert.equal(curatorialTrack("prisoner-of-zenda"), "next");
  assert.equal(curatorialTrack("kidnapped"), "next");
  assert.equal(curatorialTrack("revolt-of-the-angels"), "next");
  assert.equal(curatorialTrack("children-of-the-soil"), "next");
  assert.equal(curatorialTrack("the-invisible-man"), "later");
  assert.equal(curatorialTrack("manalive"), "next");
  assert.equal(SHELF.filter((item) => item.id === "prisoner-of-zenda").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "kidnapped").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "revolt-of-the-angels").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "children-of-the-soil").length, 1);
  assert.equal(SHELF.filter((item) => item.id === "the-invisible-man").length, 1);

  const opens = {
    "prisoner-of-zenda": {
      gutenberg: 95,
      year: 1894,
      breaths: 1716,
      scenes: 22,
      minutes: 5,
      shelfMinutes: 268,
      opening: "Rudolf",
      stop: "dark eyes are the commoner",
      firstWords: 16,
      openBreaths: 27,
    },
    kidnapped: {
      gutenberg: 421,
      year: 1886,
      breaths: 1519,
      scenes: 30,
      minutes: 5,
      shelfMinutes: 399,
      opening: "year of grace 1751",
      stop: "its inhabitants",
      firstWords: 98,
      openBreaths: 12,
    },
    "revolt-of-the-angels": {
      gutenberg: 32596,
      year: 1914,
      breaths: 1161,
      scenes: 35,
      minutes: 5,
      shelfMinutes: 365,
      opening: "d'Esparvieu",
      stop: "did not lack charm",
      firstWords: 50,
      openBreaths: 12,
    },
    "children-of-the-soil": {
      gutenberg: 44939,
      year: 1895,
      breaths: 5660,
      scenes: 69,
      minutes: 6,
      shelfMinutes: 1300,
      opening: "Kremen",
      stop: "hanging lamp",
      firstWords: 106,
      openBreaths: 16,
    },
    "the-invisible-man": {
      gutenberg: 5230,
      year: 1897,
      breaths: 1111,
      scenes: 29,
      minutes: 12,
      shelfMinutes: 12,
      opening: "Bramblehurst",
      stop: "until he dies",
      firstWords: 169,
      openBreaths: 1111,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.ok(want.firstWords <= 250, id);
    assert.ok((full.breaths[0]?.text ?? "").startsWith(work.opening ?? "\u0000"), id);
    if (id === "the-invisible-man") {
      assert.equal(full.breaths.length, opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} novel ${i}`);
      }
    } else {
      assert.ok(full.breaths.length > opened.breaths.length, id);
      for (let i = 0; i < opened.breaths.length; i += 1) {
        assert.equal(full.breaths[i]?.text, opened.breaths[i]?.text, `${id} prefix ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(JSON.stringify(full).includes("_"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const lead = JSON.parse(
    readFileSync(new URL("./texts/prisoner-of-zenda.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(lead.year, "1894");
  assert.equal(lead.author, "Anthony Hope");
  assert.doesNotMatch(SHELF.find((item) => item.id === "prisoner-of-zenda")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "prisoner-of-zenda")?.intro ?? "", /Strelsau/);
  assert.match(bindNote("prisoner-of-zenda"), /PG reading-ease 90\.1/);

  const highlands = JSON.parse(
    readFileSync(new URL("./texts/kidnapped.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(highlands.year, "1886");
  assert.equal(highlands.author, "Robert Louis Stevenson");
  assert.doesNotMatch(SHELF.find((item) => item.id === "kidnapped")?.intro ?? "", /Highlands/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "kidnapped")?.intro ?? "", /Bottle Imp/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "kidnapped")?.intro ?? "", /Ballantrae/);
  assert.match(bindNote("kidnapped"), /PG reading-ease 83\.1/);

  const angels = JSON.parse(
    readFileSync(new URL("./texts/revolt-of-the-angels.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(angels.year, "1914");
  assert.match(angels.author ?? "", /Emilie Jackson/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "revolt-of-the-angels")?.intro ?? "", /Thaïs/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "revolt-of-the-angels")?.intro ?? "", /Heurtebise/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "revolt-of-the-angels")?.intro ?? "", /Tartarin/);
  assert.match(bindNote("revolt-of-the-angels"), /PG reading-ease 68\.1/);

  const soil = JSON.parse(
    readFileSync(new URL("./texts/children-of-the-soil.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(soil.year, "1895");
  assert.match(soil.author ?? "", /Jeremiah Curtin/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "children-of-the-soil")?.intro ?? "", /Hania/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "children-of-the-soil")?.intro ?? "", /Quo Vadis/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "children-of-the-soil")?.intro ?? "", /Comedienne/);
  assert.match(bindNote("children-of-the-soil"), /PG reading-ease 77\.3/);

  const invisible = JSON.parse(
    readFileSync(new URL("./texts/the-invisible-man.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(invisible.year, "1897");
  assert.equal(invisible.author, "H. G. Wells");
  assert.equal(invisible.title, "The Invisible Man");
  assert.equal(invisible.scenes.length, 29);
  assert.match(SHELF.find((item) => item.id === "the-invisible-man")?.intro ?? "", /just The Invisible Man/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-invisible-man")?.intro ?? "", /Time Machine/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-invisible-man")?.intro ?? "", /Kipps/);
  assert.match(bindNote("the-invisible-man"), /PG reading-ease 83\.2/);

  const alive = JSON.parse(
    readFileSync(new URL("./texts/manalive.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(alive.year, "1912");
});

test("Mira POST-#191 CLEAR is Next lead The Village in the Jungle, then Ribot, Saracinesca, and The Torrents of Spring, with The Bet on before-sleep Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "the-village-in-the-jungle",
    "the-joy-of-captain-ribot",
    "saracinesca",
    "the-torrents-of-spring",
  ] as const;
  const prior = ["prisoner-of-zenda", "kidnapped", "revolt-of-the-angels", "children-of-the-soil"] as const;
  const sleepTail = [
    "the-joy-of-captain-ribot",
    "saracinesca",
    "the-torrents-of-spring",
    "the-bet",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-64, -60), [...tail]);
  assert.deepEqual(next.slice(-68, -64), [...prior]);
  assert.equal(next.includes("the-bet"), false);
  assert.equal(next.includes("the-invisible-man"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("children-of-the-soil") < next.lastIndexOf("the-village-in-the-jungle"));
  for (const id of [...tail, "the-bet"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-59, -55), [...tail]);
  assert.deepEqual(walk?.workIds.slice(-19, -15), [...tail]);
  assert.deepEqual(unwind?.workIds.slice(-63, -59), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-23, -19), [...prior]);
  assert.deepEqual(sleep?.workIds.slice(-24, -20), [...sleepTail]);
  assert.deepEqual(sleep?.workIds.slice(-28, -24), [...prior]);
  assert.equal(sleep?.workIds.includes("the-village-in-the-jungle"), false);
  assert.equal(unwind?.workIds.includes("the-bet"), false);
  assert.equal(walk?.workIds.includes("the-bet"), false);
  assert.equal(waking?.workIds.at(-3), "the-invisible-man");
  assert.equal(curatorialTrack("the-village-in-the-jungle"), "next");
  assert.equal(curatorialTrack("the-joy-of-captain-ribot"), "next");
  assert.equal(curatorialTrack("saracinesca"), "next");
  assert.equal(curatorialTrack("the-torrents-of-spring"), "next");
  assert.equal(curatorialTrack("the-bet"), "later");
  assert.equal(curatorialTrack("children-of-the-soil"), "next");
  assert.equal(curatorialTrack("prisoner-of-zenda"), "next");

  const opens = {
    "the-village-in-the-jungle": {
      gutenberg: 60627,
      year: 1913,
      breaths: 1078,
      scenes: 11,
      minutes: 7,
      shelfMinutes: 334,
      opening: "Beddagama",
      stop: "least suspicious sound",
      firstWords: 203,
      openBreaths: 6,
      openAt: 1,
    },
    "the-joy-of-captain-ribot": {
      gutenberg: 38293,
      year: 1900,
      breaths: 1304,
      scenes: 19,
      minutes: 7,
      shelfMinutes: 314,
      opening: "Malaga",
      stop: "murmured with emotion",
      firstWords: 80,
      openBreaths: 43,
      openAt: 8,
    },
    saracinesca: {
      gutenberg: 13757,
      year: 1887,
      breaths: 2717,
      scenes: 35,
      minutes: 9,
      shelfMinutes: 767,
      opening: "six o'clock",
      stop: "please himself",
      firstWords: 334,
      openBreaths: 6,
      openAt: 12,
    },
    "the-torrents-of-spring": {
      gutenberg: 9911,
      year: 1897,
      breaths: 1057,
      scenes: 46,
      minutes: 8,
      shelfMinutes: 248,
      opening: "two o'clock",
      stop: "twisted round his neck",
      firstWords: 41,
      openBreaths: 12,
      openAt: 2,
    },
    "the-bet": {
      gutenberg: 1732,
      year: null,
      breaths: 40,
      scenes: 2,
      minutes: 12,
      shelfMinutes: 12,
      opening: "dark autumn night",
      stop: "fireproof safe",
      firstWords: 104,
      openBreaths: 40,
      openAt: 0,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, want.year == null ? "" : String(want.year), id);
    assert.equal(opened.year, want.year == null ? "" : String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop, "i"));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.equal(opened.breaths[0]?.text.includes("\n"), false, id);
    const slice = full.breaths.slice(want.openAt, want.openAt + opened.breaths.length);
    assert.equal(slice.length, opened.breaths.length, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(slice[i]?.text, opened.breaths[i]?.text, `${id} open ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(fullJoined.includes("_"), false, id);
    assert.equal(joined.includes("--"), false, id);
    assert.equal(fullJoined.includes("--"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const village = JSON.parse(
    readFileSync(new URL("./texts/the-village-in-the-jungle.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; breaths: { text: string }[] };
  assert.equal(village.year, "1913");
  assert.equal(village.author, "Leonard Woolf");
  assert.match(SHELF.find((item) => item.id === "the-village-in-the-jungle")?.intro ?? "", /katty/);
  assert.match(SHELF.find((item) => item.id === "the-village-in-the-jungle")?.intro ?? "", /chena/);
  assert.match(SHELF.find((item) => item.id === "the-village-in-the-jungle")?.intro ?? "", /grim ending/);
  assert.match(bindNote("the-village-in-the-jungle"), /PG reading-ease 82\.0/);
  const villageOpen = JSON.parse(
    readFileSync(new URL("./openings/the-village-in-the-jungle.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(villageOpen.breaths.map((breath) => breath.text).join("\n").includes("I've given you all"), false);

  const ribot = JSON.parse(
    readFileSync(new URL("./texts/the-joy-of-captain-ribot.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string };
  assert.equal(ribot.year, "1900");
  assert.match(ribot.author ?? "", /Minna Caroline Smith/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-joy-of-captain-ribot")?.intro ?? "", /Baxter|Marti|named in the About|Accents stay/);
  assert.ok((SHELF.find((item) => item.id === "the-joy-of-captain-ribot")?.intro ?? "").endsWith("Armando Palacio Valdés, in Minna Caroline Smith’s English, 1900."));
  assert.match(bindNote("the-joy-of-captain-ribot"), /PG reading-ease 70\.8/);
  const ribotOpen = JSON.parse(
    readFileSync(new URL("./openings/the-joy-of-captain-ribot.json", import.meta.url), "utf8"),
  ) as PackedSit;
  const ribotOpenText = ribotOpen.breaths.map((breath) => breath.text).join("\n");
  assert.equal(ribotOpenText.includes("Baxter"), false);
  assert.equal(ribotOpenText.includes("war-ships"), false);
  assert.equal(/Senor/.test(ribotOpenText), false);

  const sara = JSON.parse(
    readFileSync(new URL("./texts/saracinesca.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; scenes: { title?: string }[] };
  assert.equal(sara.year, "1887");
  assert.equal(sara.author, "F. Marion Crawford");
  assert.match(sara.scenes[1]?.title ?? "", /Chapter I/);
  assert.match(sara.scenes[2]?.title ?? "", /Chapter II/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "saracinesca")?.intro ?? "", /334 words|first breath|stays in the book/);
  assert.ok((SHELF.find((item) => item.id === "saracinesca")?.intro ?? "").endsWith("F. Marion Crawford’s 1887 novel. Reputation, marriage, and gossip in Roman high society."));
  assert.match(bindNote("saracinesca"), /PG reading-ease 69\.4/);
  const saraOpen = JSON.parse(
    readFileSync(new URL("./openings/saracinesca.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(saraOpen.breaths[0]?.text.trim().split(/\s+/).length, 334);
  assert.equal(saraOpen.breaths[0]?.text.includes("\n"), false);

  const torrents = JSON.parse(
    readFileSync(new URL("./texts/the-torrents-of-spring.json", import.meta.url), "utf8"),
  ) as { year?: string; author?: string; breaths: { text: string }[] };
  assert.equal(torrents.year, "1897");
  assert.match(torrents.author ?? "", /Constance Garnett/);
  const torrentsText = torrents.breaths.map((breath) => breath.text).join("\n");
  assert.equal(torrentsText.includes("First Love"), false);
  assert.equal(torrentsText.includes("Mumu"), false);
  assert.equal(torrentsText.includes("Frankfurt"), false);
  assert.match(torrents.breaths.at(-1)?.text ?? "", /preparing to go to America/);
  assert.match(SHELF.find((item) => item.id === "the-torrents-of-spring")?.intro ?? "", /Frankfort/);
  assert.match(bindNote("the-torrents-of-spring"), /PG reading-ease 79\.5/);

  const bet = JSON.parse(
    readFileSync(new URL("./texts/the-bet.json", import.meta.url), "utf8"),
  ) as PackedSit & { year?: string; author?: string };
  assert.equal(bet.year, "");
  assert.match(bet.author ?? "", /Constance Garnett/);
  assert.equal(SHELF.find((item) => item.id === "the-bet")?.year, null);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-bet")?.intro ?? "", /No year is cited/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-bet")?.intro ?? "", /In Exile/);
  assert.match(bindNote("the-bet"), /PG reading-ease 80\.2/);
  assert.match(bet.breaths[0]?.text ?? "", /^It was a dark autumn night/);
  assert.match(bet.breaths.at(-1)?.text ?? "", /fireproof safe/);

  const soil = JSON.parse(
    readFileSync(new URL("./texts/children-of-the-soil.json", import.meta.url), "utf8"),
  ) as { year?: string };
  assert.equal(soil.year, "1895");
});

test("Mira POST-#192 CLEAR is Next lead The Bitter Tea of General Yen, then Andros, Bella Donna, and Nina Balatka, with La Lupa on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "the-bitter-tea-of-general-yen",
    "the-woman-of-andros",
    "bella-donna",
    "nina-balatka",
  ] as const;
  const prior = [
    "the-village-in-the-jungle",
    "the-joy-of-captain-ribot",
    "saracinesca",
    "the-torrents-of-spring",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-60, -56), [...tail]);
  assert.deepEqual(next.slice(-64, -60), [...prior]);
  assert.equal(next.includes("la-lupa"), false);
  assert.equal(next.includes("the-bet"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
  }
  assert.ok(next.lastIndexOf("the-torrents-of-spring") < next.lastIndexOf("the-bitter-tea-of-general-yen"));
  for (const id of [...tail, "la-lupa"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-55, -51), [
    "the-bitter-tea-of-general-yen",
    "the-woman-of-andros",
    "bella-donna",
    "la-lupa",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-59, -55), [...prior]);
  assert.deepEqual(walk?.workIds.slice(-15, -13), [
    "the-bitter-tea-of-general-yen",
    "la-lupa",
  ]);
  assert.equal(walk?.workIds.includes("nina-balatka"), false);
  assert.deepEqual(walk?.workIds.slice(-19, -15), [...prior]);
  assert.deepEqual(sleep?.workIds.slice(-20, -18), ["the-woman-of-andros", "bella-donna"]);
  assert.deepEqual(sleep?.workIds.slice(-24, -20), [
    "the-joy-of-captain-ribot",
    "saracinesca",
    "the-torrents-of-spring",
    "the-bet",
  ]);
  assert.equal(sleep?.workIds.includes("the-bitter-tea-of-general-yen"), false);
  assert.equal(sleep?.workIds.includes("nina-balatka"), false);
  assert.equal(sleep?.workIds.includes("la-lupa"), false);
  assert.equal(sleep?.workIds.includes("the-village-in-the-jungle"), false);
  assert.equal(unwind?.workIds.includes("nina-balatka"), false);
  assert.equal(walk?.workIds.includes("the-woman-of-andros"), false);
  assert.equal(walk?.workIds.includes("bella-donna"), false);
  assert.equal(waking?.workIds.at(-2), "nina-balatka");
  assert.equal(waking?.workIds.filter((id) => id === "nina-balatka").length, 1);
  for (const lane of RITUAL_LANES) {
    if (lane.id === "waking-up") continue;
    assert.equal(lane.workIds.includes("nina-balatka"), false, lane.id);
  }
  assert.equal(waking?.workIds.at(-3), "the-invisible-man");
  assert.equal(waking?.workIds.includes("the-bitter-tea-of-general-yen"), false);
  assert.equal(waking?.workIds.includes("the-woman-of-andros"), false);
  assert.equal(waking?.workIds.includes("bella-donna"), false);
  assert.equal(waking?.workIds.includes("la-lupa"), false);
  assert.equal(curatorialTrack("the-bitter-tea-of-general-yen"), "next");
  assert.equal(curatorialTrack("the-woman-of-andros"), "next");
  assert.equal(curatorialTrack("bella-donna"), "next");
  assert.equal(curatorialTrack("nina-balatka"), "next");
  assert.equal(curatorialTrack("la-lupa"), "later");
  assert.equal(curatorialTrack("the-torrents-of-spring"), "next");
  assert.equal(curatorialTrack("the-bet"), "later");

  const opens = {
    "the-bitter-tea-of-general-yen": {
      gutenberg: 78108,
      year: 1930,
      breaths: 1270,
      scenes: 24,
      minutes: 8,
      shelfMinutes: 300,
      opening: "transience",
      stop: "Valentine",
      firstWords: 125,
      openBreaths: 23,
      openAt: 0,
    },
    "the-woman-of-andros": {
      gutenberg: 78024,
      year: 1930,
      breaths: 336,
      scenes: 9,
      minutes: 11,
      shelfMinutes: 110,
      opening: "The earth sighed",
      stop: "priest in Pamphilus",
      firstWords: 181,
      openBreaths: 37,
      openAt: 1,
    },
    "bella-donna": {
      gutenberg: 17698,
      year: 1908,
      breaths: 5989,
      scenes: 44,
      minutes: 8,
      shelfMinutes: 875,
      opening: "Doctor Meyer Isaacson",
      stop: "supreme activity",
      firstWords: 143,
      openBreaths: 20,
      openAt: 0,
    },
    "nina-balatka": {
      gutenberg: 8897,
      year: 1866,
      breaths: 1589,
      scenes: 16,
      minutes: 8,
      shelfMinutes: 363,
      opening: "maiden of Prague",
      stop: "smile of welcome",
      firstWords: 24,
      openBreaths: 9,
      openAt: 0,
    },
    "la-lupa": {
      gutenberg: 37979,
      year: 1896,
      breaths: 51,
      scenes: 1,
      minutes: 9,
      shelfMinutes: 9,
      opening: "no longer young",
      stop: "stammered Nanni",
      firstWords: 50,
      openBreaths: 51,
      openAt: 0,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; year?: string; author?: string };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      author?: string;
      breaths: { text: string; sceneId?: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(opened.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    assert.equal(opened.breaths[0]?.text.includes("\n"), false, id);
    const slice = full.breaths.slice(want.openAt, want.openAt + opened.breaths.length);
    assert.equal(slice.length, opened.breaths.length, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(slice[i]?.text, opened.breaths[i]?.text, `${id} open ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(fullJoined.includes("_"), false, id);
    assert.equal(joined.includes("--"), false, id);
    assert.equal(fullJoined.includes("--"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    if (/\*[^*\n]+\*/.test(joined)) {
      assert.equal(splitEmphasis(joined).some((part) => part.type === "em"), true, id);
    }
  }

  const yen = JSON.parse(
    readFileSync(new URL("./texts/the-bitter-tea-of-general-yen.json", import.meta.url), "utf8"),
  ) as { author?: string; scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(yen.author, "Grace Zaring Stone");
  assert.equal(yen.scenes[0]?.title, "Chapter I");
  assert.match(yen.breaths[0]?.text ?? "", /transience/);
  assert.equal((yen.breaths[0]?.text ?? "").includes("transcience"), false);
  assert.match(SHELF.find((item) => item.id === "the-bitter-tea-of-general-yen")?.intro ?? "", /coolie/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-bitter-tea-of-general-yen")?.intro ?? "", /The lead is this book/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "the-bitter-tea-of-general-yen")?.intro ?? "", /none is cited/);

  const andros = JSON.parse(
    readFileSync(new URL("./texts/the-woman-of-andros.json", import.meta.url), "utf8"),
  ) as { author?: string; scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(andros.author, "Thornton Wilder");
  assert.equal(andros.scenes[0]?.title, "Epigraph");
  assert.equal(andros.scenes[1]?.title, "Section I");
  assert.match(andros.breaths[0]?.text ?? "", /first part of this novel/);
  const androsOpen = JSON.parse(
    readFileSync(new URL("./openings/the-woman-of-andros.json", import.meta.url), "utf8"),
  ) as PackedSit;
  assert.equal(androsOpen.breaths[0]?.text.includes("first part of this novel"), false);
  assert.match(androsOpen.breaths[0]?.text ?? "", /^The earth sighed/);

  const nina = JSON.parse(
    readFileSync(new URL("./texts/nina-balatka.json", import.meta.url), "utf8"),
  ) as { author?: string; scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(nina.author, "Anthony Trollope");
  assert.equal(nina.scenes[0]?.title, "Volume I · Chapter I");
  const ninaText = nina.breaths.map((breath) => breath.text).join("\n");
  assert.equal(ninaText.includes("Loewenstein"), false);
  assert.equal(ninaText.includes("2003"), false);
  assert.match(nina.breaths[0]?.text ?? "", /^Nina Balatka was a maiden of Prague/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "nina-balatka")?.intro ?? "", /2003 introduction is out/);
  assert.match(bindNote("nina-balatka"), /PG reading-ease 88\.4/);

  const lupa = JSON.parse(
    readFileSync(new URL("./texts/la-lupa.json", import.meta.url), "utf8"),
  ) as { author?: string; year?: string; breaths: { text: string }[] };
  assert.equal(lupa.author, "Giovanni Verga (trans. Nathan Haskell Dole)");
  assert.equal(lupa.year, "1896");
  const lupaText = lupa.breaths.map((breath) => breath.text).join("\n");
  assert.match(lupa.breaths.at(-1)?.text ?? "", /stammered Nanni/);
  assert.match(lupaText, /Carabaneers/);
  assert.equal(/\bGesu\b/.test(lupaText), false);
  assert.match(lupaText, /Gesù/);
  assert.match(SHELF.find((item) => item.id === "la-lupa")?.intro ?? "", /axe/);
  assert.doesNotMatch(SHELF.find((item) => item.id === "la-lupa")?.intro ?? "", /not I Malavoglia/);
  assert.match(bindNote("la-lupa"), /PG reading-ease 80\.0/);
});

test("Mira POST-#197 CLEAR is Next lead A Farewell to Arms, then Alice Adams, Quartet, and The Song of Songs, with Its Wavering Image on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "a-farewell-to-arms",
    "alice-adams",
    "quartet",
    "song-of-songs-sudermann",
  ] as const;
  const prior = [
    "the-bitter-tea-of-general-yen",
    "the-woman-of-andros",
    "bella-donna",
    "nina-balatka",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-56, -52), [...tail]);
  assert.deepEqual(next.slice(-60, -56), [...prior]);
  assert.equal(next.includes("its-wavering-image"), false);
  assert.equal(next.includes("la-lupa"), false);
  assert.ok(next.includes("song-of-songs"));
  assert.ok(next.indexOf("song-of-songs") < next.indexOf("song-of-songs-sudermann"));
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack("its-wavering-image"), "later");
  assert.ok(next.lastIndexOf("nina-balatka") < next.lastIndexOf("a-farewell-to-arms"));
  for (const id of [...tail, "its-wavering-image"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-51, -46), [
    "a-farewell-to-arms",
    "alice-adams",
    "quartet",
    "song-of-songs-sudermann",
    "its-wavering-image",
  ]);
  assert.deepEqual(walk?.workIds.slice(-13, -12), ["a-farewell-to-arms"]);
  assert.equal(walk?.workIds.includes("alice-adams"), false);
  assert.equal(walk?.workIds.includes("quartet"), false);
  assert.equal(walk?.workIds.includes("song-of-songs-sudermann"), false);
  assert.equal(walk?.workIds.includes("its-wavering-image"), false);
  assert.deepEqual(sleep?.workIds.slice(-18, -15), [
    "alice-adams",
    "song-of-songs-sudermann",
    "its-wavering-image",
  ]);
  assert.equal(sleep?.workIds.includes("a-farewell-to-arms"), false);
  assert.equal(sleep?.workIds.includes("quartet"), false);
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const bible = SHELF.find((item) => item.id === "song-of-songs");
  assert.equal(bible?.gutenberg, 69329);
  assert.equal(SHELF.filter((item) => item.id === "song-of-songs-sudermann").length, 1);

  const opens = {
    "a-farewell-to-arms": {
      gutenberg: 75201,
      year: 1929,
      breaths: 4117,
      scenes: 41,
      minutes: 10,
      shelfMinutes: 442,
      opening: "late summer of that year",
      stop: "Good-night",
      firstWords: 126,
      openBreaths: 42,
      openAt: 0,
      openScenes: 1,
    },
    "alice-adams": {
      gutenberg: 980,
      year: 1921,
      breaths: 2351,
      scenes: 25,
      minutes: 10,
      shelfMinutes: 422,
      opening: "old-fashioned man",
      stop: "no novelty",
      firstWords: 134,
      openBreaths: 41,
      openAt: 0,
      openScenes: 1,
    },
    quartet: {
      gutenberg: 78572,
      year: 1928,
      breaths: 1592,
      scenes: 24,
      minutes: 11,
      shelfMinutes: 223,
      opening: "half-past five",
      stop: "being happy",
      firstWords: 64,
      openBreaths: 83,
      openAt: 2,
      openScenes: 1,
    },
    "song-of-songs-sudermann": {
      gutenberg: 34791,
      year: 1909,
      breaths: 6039,
      scenes: 45,
      minutes: 9,
      shelfMinutes: 874,
      opening: "fourteen years old",
      stop: "log of wood",
      firstWords: 14,
      openBreaths: 52,
      openAt: 0,
      openScenes: 1,
    },
    "its-wavering-image": {
      gutenberg: 62940,
      year: 1912,
      breaths: 56,
      scenes: 4,
      minutes: 8,
      shelfMinutes: 8,
      opening: "half white, half Chinese",
      stop: "was comforted",
      firstWords: 71,
      openBreaths: 56,
      openAt: 0,
      openScenes: 4,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      breaths: { text: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, want.openScenes, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    const slice = full.breaths.slice(want.openAt, want.openAt + opened.breaths.length);
    assert.equal(slice.length, opened.breaths.length, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(slice[i]?.text, opened.breaths[i]?.text, `${id} open ${i}`);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(fullJoined.includes("_"), false, id);
    assert.equal(joined.includes("--"), false, id);
    assert.equal(fullJoined.includes("--"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    for (const breath of full.breaths) {
      if (!isSectionBreak(breath.text)) continue;
      assert.equal(breath.text.trim(), "* * * * *", id);
      assert.equal(
        splitEmphasis(breath.text).map((part) => part.value).join("").includes("*"),
        false,
        id,
      );
    }
    for (const breath of full.breaths) {
      if (!breath.text.includes("—") && !breath.text.includes("——")) continue;
      const rendered = splitEmphasis(breath.text).map((part) => part.value).join("");
      assert.equal(rendered.includes("—"), breath.text.includes("—"), id);
      assert.equal(rendered.includes("——"), breath.text.includes("——"), id);
      break;
    }
  }

  const farewell = JSON.parse(
    readFileSync(new URL("./texts/a-farewell-to-arms.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(farewell.scenes[0]?.title, "Book I · Chapter I");
  assert.equal(farewell.scenes[1]?.title, "Book I · Chapter II");
  assert.equal(farewell.scenes.at(-1)?.title, "Book V · Chapter XLI");
  assert.match(farewell.breaths[0]?.text ?? "", /^In the late summer of that year/);
  assert.equal(farewell.breaths.filter((breath) => breath.text.includes("——")).length, 22);

  const alice = JSON.parse(
    readFileSync(new URL("./texts/alice-adams.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[] };
  assert.equal(alice.scenes[0]?.title, "Chapter I");
  assert.equal(alice.scenes.at(-1)?.title, "Chapter XXV");

  const quartet = JSON.parse(
    readFileSync(new URL("./texts/quartet.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(quartet.scenes[0]?.title, "Epigraph");
  assert.equal(quartet.scenes[1]?.title, "Chapter One");
  assert.equal(quartet.scenes.at(-1)?.title, "Chapter Twenty-Three");
  assert.equal(quartet.breaths.filter((breath) => isSectionBreak(breath.text)).length, 67);
  assert.match(quartet.breaths.map((breath) => breath.text).join("\n"), /She begun/);

  const song = JSON.parse(
    readFileSync(new URL("./texts/song-of-songs-sudermann.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(song.scenes[0]?.title, "Part I · Chapter I");
  assert.equal(song.scenes[22]?.title, "Part I · Chapter XXIII");
  assert.equal(song.scenes[23]?.title, "Part II · Chapter I");
  assert.equal(song.scenes.at(-1)?.title, "Part II · Chapter XXII");
  assert.equal(song.breaths.filter((breath) => isSectionBreak(breath.text)).length, 46);
  assert.doesNotMatch(SHELF.find((item) => item.id === "song-of-songs-sudermann")?.intro ?? "", /not the Song of Songs from the Bible/);

  const pan = JSON.parse(
    readFileSync(new URL("./texts/its-wavering-image.json", import.meta.url), "utf8"),
  ) as { title?: string; scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(pan.title, '"Its Wavering Image"');
  assert.equal(pan.scenes.map((scene) => scene.title).join("|"), "Section I|Section II|Section III|Section IV");
  assert.equal(pan.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  assert.match(pan.breaths.at(-1)?.text ?? "", /was comforted/);
  assert.match(SHELF.find((item) => item.id === "its-wavering-image")?.intro ?? "", /Mrs\. Spring Fragrance/);
});

test("Mira POST-#204 CLEAR is Next lead Java Head, then Sunshine Sketches, Guest the One-Eyed, and The Blind Musician, with Magnolia Flower on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "java-head",
    "sunshine-sketches-of-a-little-town",
    "guest-the-one-eyed",
    "the-blind-musician",
  ] as const;
  const prior = [
    "a-farewell-to-arms",
    "alice-adams",
    "quartet",
    "song-of-songs-sudermann",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-52, -48), [...tail]);
  assert.deepEqual(next.slice(-56, -52), [...prior]);
  assert.equal(next.includes("magnolia-flower"), false);
  assert.equal(next.includes("its-wavering-image"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack("magnolia-flower"), "later");
  assert.ok(next.lastIndexOf("song-of-songs-sudermann") < next.lastIndexOf("java-head"));
  for (const id of [...tail, "magnolia-flower"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-46, -41), [
    "java-head",
    "sunshine-sketches-of-a-little-town",
    "guest-the-one-eyed",
    "the-blind-musician",
    "magnolia-flower",
  ]);
  assert.deepEqual(walk?.workIds.slice(-12, -11), ["sunshine-sketches-of-a-little-town"]);
  assert.equal(walk?.workIds.includes("java-head"), false);
  assert.equal(walk?.workIds.includes("guest-the-one-eyed"), false);
  assert.equal(walk?.workIds.includes("the-blind-musician"), false);
  assert.equal(walk?.workIds.includes("magnolia-flower"), false);
  assert.deepEqual(sleep?.workIds.slice(-15, -13), [
    "sunshine-sketches-of-a-little-town",
    "the-blind-musician",
  ]);
  assert.equal(sleep?.workIds.includes("java-head"), false);
  assert.equal(sleep?.workIds.includes("guest-the-one-eyed"), false);
  assert.equal(sleep?.workIds.includes("magnolia-flower"), false);
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "java-head": {
      gutenberg: 9865,
      year: 1918,
      breaths: 969,
      scenes: 11,
      minutes: 10,
      shelfMinutes: 332,
      opening: "Very late indeed in May",
      stop: "piano scales instead of a half",
      firstWords: 119,
      openBreaths: 26,
      openAt: 2,
      openScenes: 1,
      country: "United States",
      place: "Salem",
      author: "Joseph Hergesheimer",
    },
    "sunshine-sketches-of-a-little-town": {
      gutenberg: 3533,
      year: 1912,
      breaths: 942,
      scenes: 13,
      minutes: 10,
      shelfMinutes: 300,
      opening: "I don't know whether you know Mariposa",
      stop: "much as it does in other places",
      firstWords: 33,
      openBreaths: 17,
      openAt: 12,
      openScenes: 1,
      country: "Canada",
      place: "Mariposa",
      author: "Stephen Leacock",
    },
    "guest-the-one-eyed": {
      gutenberg: 62455,
      year: 1922,
      breaths: 2973,
      scenes: 41,
      minutes: 12,
      shelfMinutes: 526,
      opening: "Snow, snow, snow!",
      stop: "feeling of manhood, of responsibility",
      firstWords: 3,
      openBreaths: 89,
      openAt: 0,
      openScenes: 1,
      country: "Iceland",
      place: "Borg",
      author: "Gunnar Gunnarsson (tr. W. W. Worster)",
    },
    "the-blind-musician": {
      gutenberg: 59497,
      year: 1891,
      breaths: 517,
      scenes: 50,
      minutes: 9,
      shelfMinutes: 174,
      opening: "At the hour of midnight",
      stop: "gazed at the child more and more frequently",
      firstWords: 112,
      openBreaths: 30,
      openAt: 0,
      openScenes: 1,
      country: "Ukraine",
      place: "Volhynia",
      author: "Vladimir Korolenko (tr. Aline Delano)",
    },
    "magnolia-flower": {
      gutenberg: 77621,
      year: 1925,
      breaths: 87,
      scenes: 2,
      minutes: 10,
      shelfMinutes: 10,
      opening: "The brook laughed and sang",
      stop: "loved you and me, somehow",
      firstWords: 25,
      openBreaths: 87,
      openAt: 0,
      openScenes: 2,
      country: "United States",
      place: "St. Johns River",
      author: "Zora Neale Hurston",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.opening));
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      breaths: { text: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, want.openScenes, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.opening));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    const slice = full.breaths.slice(want.openAt, want.openAt + opened.breaths.length);
    assert.equal(slice.length, opened.breaths.length, id);
    const norm = (value: string) => value.replace(/\[\d+\]/g, "").replace(/^Note: /, "").trim();
    for (let i = 0; i < opened.breaths.length; i += 1) {
      const left = opened.breaths[i]?.text ?? "";
      const right = slice[i]?.text ?? "";
      if (id === "the-blind-musician") {
        assert.equal(norm(left), norm(right), `${id} open ${i}`);
      } else {
        assert.equal(left, right, `${id} open ${i}`);
      }
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(fullJoined.includes("_"), false, id);
    assert.equal(joined.includes("--"), false, id);
    assert.equal(fullJoined.includes("--"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    for (const breath of full.breaths) {
      if (!isSectionBreak(breath.text)) continue;
      assert.equal(breath.text.trim(), "* * * * *", id);
    }
  }

  const java = JSON.parse(
    readFileSync(new URL("./texts/java-head.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(java.scenes[0]?.title, "Epigraph");
  assert.equal(java.scenes[1]?.title, "Section I");
  assert.equal(java.scenes.at(-1)?.title, "Section X");
  assert.match(java.breaths[2]?.text ?? "", /^Very late indeed in May/);
  assert.equal(java.breaths.some((breath) => breath.text.includes("rerepeated")), false);

  const sun = JSON.parse(
    readFileSync(new URL("./texts/sunshine-sketches-of-a-little-town.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[] };
  assert.deepEqual(
    sun.scenes.map((scene) => scene.title),
    [
      "Preface",
      "Ch ONE: The Hostelry of Mr. Smith",
      "Ch TWO: The Speculations of Jefferson Thorpe",
      "Ch THREE: The Marine Excursions of the Knights of Pythias",
      "Ch FOUR: The Ministrations of the Rev. Mr. Drone",
      "Ch FIVE: The Whirlwind Campaign in Mariposa",
      "Ch SIX: The Beacon on the Hill",
      "Ch SEVEN: The Extraordinary Entanglement of Mr. Pupkin",
      "Ch EIGHT: The Fore-ordained Attachment of Zena Pepperleigh and Peter Pupkin",
      "Ch NINE: The Mariposa Bank Mystery",
      "Ch TEN: The Great Election in Missinaba County",
      "Ch ELEVEN: The Candidacy of Mr. Smith",
      "Ch TWELVE: L'Envoi. The Train to Mariposa",
    ],
  );

  const guest = JSON.parse(
    readFileSync(new URL("./texts/guest-the-one-eyed.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(guest.scenes[0]?.title, "Book I · Ormarr Ørlygsson · Chapter I");
  assert.equal(guest.scenes.at(-1)?.title, "Book IV · The Young Eagle · Chapter XII");
  assert.equal(guest.breaths.filter((breath) => isSectionBreak(breath.text)).length, 50);
  assert.equal(guest.breaths.some((breath) => breath.text.trim().split(/\s+/).length > 350), false);

  const blind = JSON.parse(
    readFileSync(new URL("./texts/the-blind-musician.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(blind.scenes[0]?.title, "Chapter I · The Blind Infant. The Family · § I");
  assert.equal(blind.scenes[2]?.title, "Chapter I · The Blind Infant. The Family · § III");
  assert.equal(blind.scenes.at(-1)?.title, "Epilogue");
  assert.equal(blind.breaths.some((breath) => /\[\d+\]/.test(breath.text)), false);
  assert.equal(blind.breaths.filter((breath) => breath.text.startsWith("Note: ")).length, 17);

  const flower = JSON.parse(
    readFileSync(new URL("./texts/magnolia-flower.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.deepEqual(
    flower.scenes.map((scene) => scene.title),
    ["Opening", "The River's Story"],
  );
  assert.equal(flower.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  assert.match(flower.breaths.at(-1)?.text ?? "", /loved you and me, somehow/);
});


test("Mira POST-#206 CLEAR is Next lead In the Mountains, then The Two Countesses, El Ombú, and Halil the Pedlar, with The White Sand-Path on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "in-the-mountains",
    "the-two-countesses",
    "el-ombu",
    "halil-the-pedlar",
  ] as const;
  const prior = [
    "java-head",
    "sunshine-sketches-of-a-little-town",
    "guest-the-one-eyed",
    "the-blind-musician",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-48, -44), [...tail]);
  assert.deepEqual(next.slice(-52, -48), [...prior]);
  assert.equal(next.includes("the-white-sand-path"), false);
  assert.equal(next.includes("magnolia-flower"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack("the-white-sand-path"), "later");
  assert.ok(next.lastIndexOf("the-blind-musician") < next.lastIndexOf("in-the-mountains"));
  for (const id of [...tail, "the-white-sand-path"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-41, -37), [
    "in-the-mountains",
    "the-two-countesses",
    "el-ombu",
    "halil-the-pedlar",
  ]);
  assert.equal(unwind?.workIds.includes("the-white-sand-path"), false);
  assert.deepEqual(walk?.workIds.slice(-11, -9), ["the-two-countesses", "halil-the-pedlar"]);
  assert.equal(walk?.workIds.includes("in-the-mountains"), false);
  assert.equal(walk?.workIds.includes("el-ombu"), false);
  assert.equal(walk?.workIds.includes("the-white-sand-path"), false);
  assert.deepEqual(sleep?.workIds.slice(-13, -11), ["in-the-mountains", "the-white-sand-path"]);
  assert.equal(sleep?.workIds.includes("the-two-countesses"), false);
  assert.equal(sleep?.workIds.includes("el-ombu"), false);
  assert.equal(sleep?.workIds.includes("halil-the-pedlar"), false);
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "in-the-mountains": {
      gutenberg: 35072,
      year: 1920,
      breaths: 1224,
      scenes: 71,
      minutes: 11,
      shelfMinutes: 288,
      shelfOpening: "I want to be quiet now",
      firstBreath: "I want to be quiet now",
      stop: "C'était affreux",
      firstWords: 6,
      openBreaths: 20,
      openAt: 0,
      openScenes: 1,
      country: "Switzerland",
      place: "Mountainside chalet, Switzerland",
      author: "Elizabeth von Arnim",
    },
    "the-two-countesses": {
      gutenberg: 76750,
      year: 1893,
      breaths: 704,
      scenes: 9,
      minutes: 7,
      shelfMinutes: 116,
      shelfOpening: "The shooting season is over",
      firstBreath: "Note: Sebenberg Castle",
      stop: "Note: Your Muschi",
      firstWords: 5,
      openBreaths: 43,
      openAt: 0,
      openScenes: 1,
      country: "Austria",
      place: "Sebenberg Castle and Vienna",
      author: "Marie von Ebner-Eschenbach (tr. Ellen Waugh)",
    },
    "el-ombu": {
      gutenberg: 60541,
      year: 1902,
      breaths: 404,
      scenes: 15,
      minutes: 7,
      shelfMinutes: 189,
      shelfOpening: "This history of a house that had been",
      firstBreath: "This history of a house that had been",
      stop: "mourned for her in his heart",
      firstWords: 60,
      openBreaths: 9,
      openAt: 0,
      openScenes: 1,
      country: "Argentina",
      place: "Pampas near Chascomús",
      author: "W. H. Hudson",
    },
    "halil-the-pedlar": {
      gutenberg: 17597,
      year: 1901,
      breaths: 1325,
      scenes: 13,
      minutes: 8,
      shelfMinutes: 287,
      shelfOpening: "Time out of mind",
      firstBreath: "Time out of mind",
      stop: "foot-passenger below",
      firstWords: 23,
      openBreaths: 23,
      openAt: 0,
      openScenes: 1,
      country: "Turkey",
      place: "Istanbul",
      author: "Mór Jókai (tr. R. Nisbet Bain)",
    },
    "the-white-sand-path": {
      gutenberg: 8437,
      year: 1915,
      breaths: 45,
      scenes: 1,
      minutes: 10,
      shelfMinutes: 10,
      shelfOpening: "devil of a scapegrace",
      firstBreath: "devil of a scapegrace",
      stop: "Never again was I shut up in the loft",
      firstWords: 128,
      openBreaths: 45,
      openAt: 0,
      openScenes: 1,
      country: "Belgium",
      place: "West Flanders village",
      author: "Stijn Streuvels (tr. Alexander Teixeira de Mattos)",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.ok(placeFor(work)?.region, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      breaths: { text: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, want.openScenes, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    const slice = full.breaths.slice(want.openAt, want.openAt + opened.breaths.length);
    assert.equal(slice.length, opened.breaths.length, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, slice[i]?.text, `${id} open ${i}`);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("\r"), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
    }
    const joined = opened.breaths.map((breath) => breath.text).join("\n");
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(joined.includes("_"), false, id);
    assert.equal(fullJoined.includes("_"), false, id);
    assert.equal(joined.includes("--"), false, id);
    assert.equal(fullJoined.includes("--"), false, id);
    assert.doesNotMatch(
      `${work.intro ?? ""}\n${blurbFor(id)}\n${RITUAL_PITCHES[id] ?? ""}\n${STORED_PREFACES[id] ?? ""}`,
      /Salon|Vellum|Featured|gutenberg|public domain/i,
      id,
    );
    if (/\*[^*\n]+\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    for (const breath of full.breaths) {
      if (!isSectionBreak(breath.text)) continue;
      assert.equal(breath.text.trim(), "* * * * *", id);
    }
  }

  const mountains = JSON.parse(
    readFileSync(new URL("./texts/in-the-mountains.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.deepEqual(mountains.scenes.map((scene) => scene.title), ["July 22nd", "July 23rd", "July 24th", "July 25th", "July 26th", "July 27th", "July 28th", "July 29th", "July 30th", "July 31st", "August 1st", "August 2nd", "August 3rd", "August 4th", "August 5th", "August 6th", "August 7th", "August 8th", "August 9th", "August 10th", "August 11th", "August 12th", "August 13th", "August 14th", "August 20th", "August 21st", "August 22nd", "August 23rd", "August 24th", "August 25th", "August 26th", "August 27th", "August 28th", "August 29th", "August 30th", "August 31st", "September 1st", "September 2nd", "September 3rd", "September 4th", "September 5th", "September 6th", "September 7th", "September 10th", "September 12th", "September 19th", "September 20th", "September 21st", "September 22nd", "September 23rd", "September 24th", "September 25th", "September 26th", "September 27th", "September 28th", "September 29th", "September 30th", "October 1st", "October 2nd", "October 3rd", "October 4th", "October 5th", "October 6th", "October 7th", "October 8th", "October 9th", "October 10th", "October 11th", "October 12th", "October 13th", "October 15th"]);
  assert.equal(mountains.scenes.length, 71);
  assert.equal(new Set(mountains.scenes.map((scene) => scene.title)).size, 71);
  assert.equal(mountains.breaths.some((breath) => breath.text.includes("blacks bird")), false);

  const countesses = JSON.parse(
    readFileSync(new URL("./texts/the-two-countesses.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.deepEqual(countesses.scenes.map((scene) => scene.title), ["Countess Muschi · Letter 1", "Countess Muschi · Letter 2", "Countess Muschi · Letter 3", "Countess Muschi · Letter 4", "Countess Muschi · Letter 5", "Countess Muschi · Letter 6", "Countess Paula", "Countess Paula · My Memoirs", "Epilogue"]);
  assert.equal(countesses.breaths.filter((breath) => breath.text.startsWith("Note: ")).length, 12);

  const ombu = JSON.parse(
    readFileSync(new URL("./texts/el-ombu.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.deepEqual(ombu.scenes.map((scene) => scene.title), ["El Ombú · I", "El Ombú · II", "El Ombú · III", "El Ombú · IV", "El Ombú · VI", "El Ombú · VII", "El Ombú · VIII", "Story of a Piebald Horse", "Niño Diablo", "Marta Riquelme · I", "Marta Riquelme · II", "Marta Riquelme · III", "Marta Riquelme · IV", "Marta Riquelme · V", "Appendix to El Ombú · The English Invasion and the Game of El Pato"]);
  assert.equal(ombu.scenes.some((scene) => scene.title === "El Ombú · V"), false);

  const halil = JSON.parse(
    readFileSync(new URL("./texts/halil-the-pedlar.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.deepEqual(halil.scenes.map((scene) => scene.title), ["Chapter I · The Pedlar", "Chapter II · Guel-Bejaze—The White Rose", "Chapter III · Sultan Achmed", "Chapter IV · The Slave of the Slave-Girl", "Chapter V · The Camp", "Chapter VI · The Bursting Forth of the Storm", "Chapter VII · Tulip-Bulbs and Human Heads", "Chapter VIII · A Topsy-Turvy World", "Chapter IX · The Setting and the Rising Sun", "Chapter X · The Feast of Halwet", "Chapter XI · Glimpses into the Future", "Chapter XII · Human Hopes", "Chapter XIII · The Empty Place"]);
  assert.equal(halil.breaths.filter((breath) => breath.text.startsWith("Note: ")).length, 18);
  assert.equal(halil.breaths.some((breath) => breath.text.trim().split(/\s+/).length > 350), false);

  const sand = JSON.parse(
    readFileSync(new URL("./texts/the-white-sand-path.json", import.meta.url), "utf8"),
  ) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.deepEqual(sand.scenes.map((scene) => scene.title), ["The White Sand-Path"]);
  assert.match(sand.breaths.at(-1)?.text ?? "", /Never again was I shut up in the loft/);
  assert.match(sand.breaths.map((breath) => breath.text).join("\n"), /\*murder\*/);
});

test("Mira POST-#210 CLEAR is Next lead Liliecrona's Home, then Doctor Luke, Morriña, and A Happy Boy, with The Desjardins on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "liliecronas-home",
    "doctor-luke-of-the-labrador",
    "morrina",
    "a-happy-boy",
  ] as const;
  const prior = [
    "in-the-mountains",
    "the-two-countesses",
    "el-ombu",
    "halil-the-pedlar",
  ] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-44, -40), [...tail]);
  assert.deepEqual(next.slice(-48, -44), [...prior]);
  assert.equal(next.includes("the-desjardins"), false);
  assert.equal(next.includes("the-white-sand-path"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack("the-desjardins"), "later");
  assert.ok(next.lastIndexOf("halil-the-pedlar") < next.lastIndexOf("liliecronas-home"));
  for (const id of [...tail, "the-desjardins"]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-37, -34), [
    "liliecronas-home",
    "doctor-luke-of-the-labrador",
    "morrina",
  ]);
  assert.equal(unwind?.workIds.includes("a-happy-boy"), false);
  assert.equal(unwind?.workIds.includes("the-desjardins"), false);
  assert.deepEqual(walk?.workIds.slice(-9, -7), [
    "doctor-luke-of-the-labrador",
    "a-happy-boy",
  ]);
  assert.equal(walk?.workIds.includes("liliecronas-home"), false);
  assert.equal(walk?.workIds.includes("morrina"), false);
  assert.equal(walk?.workIds.includes("the-desjardins"), false);
  assert.deepEqual(sleep?.workIds.slice(-11, -8), [
    "liliecronas-home",
    "a-happy-boy",
    "the-desjardins",
  ]);
  assert.equal(sleep?.workIds.includes("doctor-luke-of-the-labrador"), false);
  assert.equal(sleep?.workIds.includes("morrina"), false);
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "liliecronas-home": {
      gutenberg: 76681,
      year: 1914,
      breaths: 1098,
      scenes: 18,
      minutes: 10,
      shelfMinutes: 344,
      shelfOpening: "On Christmas Day, 1880",
      firstBreath: "On Christmas Day, 1880",
      stop: "another buffet or two from the storm-wind",
      firstWords: 36,
      openBreaths: 36,
      country: "Sweden",
      place: "Värmland, Sweden",
      author: "Selma Lagerlöf (tr. Anna Barwell)",
      firstScene: "Chapter I · The Storm-Wind",
      lastScene: "Chapter XVIII · The Home",
    },
    "doctor-luke-of-the-labrador": {
      gutenberg: 19981,
      year: 1904,
      breaths: 2052,
      scenes: 28,
      minutes: 4,
      shelfMinutes: 319,
      shelfOpening: "A cluster of islands, lying off the cape",
      firstBreath: "A cluster of islands, lying off the cape",
      stop: "whatever the gale that blew",
      firstWords: 102,
      openBreaths: 11,
      country: "Canada",
      place: "Labrador coast",
      author: "Norman Duncan",
      firstScene: "Chapter I · Our Harbour",
      lastScene: "Chapter XXVIII · In Harbour",
    },
    morrina: {
      gutenberg: 54742,
      year: 1891,
      breaths: 708,
      scenes: 23,
      minutes: 8,
      shelfMinutes: 232,
      shelfOpening: "If the apartment which Doña Nogueira",
      firstBreath: "If the apartment which Doña Nogueira",
      stop: "Eat, child, eat; flesh makes flesh",
      firstWords: 73,
      openBreaths: 16,
      country: "Spain",
      place: "Madrid, Spain",
      author: "Emilia Pardo Bazán (tr. Mary J. Serrano)",
      firstScene: "Chapter I",
      lastScene: "Chapter XXIII",
    },
    "a-happy-boy": {
      gutenberg: 12633,
      year: 1881,
      breaths: 939,
      scenes: 12,
      minutes: 7,
      shelfMinutes: 157,
      shelfOpening: "His name was Oyvind",
      firstBreath: "His name was Oyvind",
      stop: "no longer as happy with it as before",
      firstWords: 51,
      openBreaths: 58,
      country: "Norway",
      place: "Norway",
      author: "Bjørnstjerne Bjørnson (tr. Rasmus B. Anderson)",
      firstScene: "Chapter I",
      lastScene: "Chapter XII",
    },
    "the-desjardins": {
      gutenberg: 48998,
      year: 1896,
      breaths: 32,
      scenes: 1,
      minutes: 10,
      shelfMinutes: 10,
      shelfOpening: "Just at the foot of the hill",
      firstBreath: "Just at the foot of the hill",
      stop: "preparations for the invasion of Russia",
      firstWords: 176,
      openBreaths: 32,
      country: "Canada",
      place: "Viger, Quebec",
      author: "Duncan Campbell Scott",
      firstScene: "The Desjardins",
      lastScene: "The Desjardins",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    if (id === "morrina") {
      assert.match(work.intro ?? "", /implied suicide/);
      assert.match(RITUAL_PITCHES[id] ?? "", /^A heads-up before you start: the son seduces the maid/);
      assert.match(blurbFor(id), /implied suicide/);
      assert.match(
        readerIntro({
          id,
          title: work.title,
          author: work.author,
          year: String(work.year),
          note: work.intro ?? "",
          minutes: work.minutes,
          cover: "",
          coverAlt: "",
          scenes: [],
          breaths: [],
        }),
        /implied suicide/,
      );
    } else {
      assert.equal(RITUAL_PITCHES[id], work.intro, id);
    }
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.ok(placeFor(work)?.region, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      breaths: { text: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    const slice = full.breaths.slice(0, opened.breaths.length);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, slice[i]?.text, `${id} open ${i}`);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(/seduces the maid|implied suicide/i.test(breath.text), false, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(fullJoined.includes("--"), false, id);
    if (/\*[A-Za-z][^*\n]*\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
  }

  const luke = JSON.parse(
    readFileSync(new URL("./texts/doctor-luke-of-the-labrador.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(luke.breaths.some((breath) => breath.text.includes("—")), true);
  assert.equal(luke.breaths[0]?.text.includes("—"), true);
  const morrinaOpen = JSON.parse(
    readFileSync(new URL("./openings/morrina.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(morrinaOpen.breaths.map((breath) => breath.text).join("\n"), /\*Mater amabilis\*/);
});

test("Mira POST-#212 CLEAR is Next lead Gone to Earth, then The Real Charlotte, Pembroke, and The Argonauts, with At the Roadside Station on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "gone-to-earth",
    "the-real-charlotte",
    "pembroke",
    "the-argonauts",
  ] as const;
  const prior = [
    "liliecronas-home",
    "doctor-luke-of-the-labrador",
    "morrina",
    "a-happy-boy",
  ] as const;
  const ritualOnly = "at-the-roadside-station";

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-40, -36), [...tail]);
  assert.deepEqual(next.slice(-44, -40), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(next.includes("the-desjardins"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  assert.ok(next.lastIndexOf("a-happy-boy") < next.lastIndexOf("gone-to-earth"));
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(walk?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-34, -30), [...tail]);
  assert.equal(unwind?.workIds.includes(ritualOnly), false);
  assert.deepEqual(sleep?.workIds.slice(-8, -7), [ritualOnly]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  for (const lane of RITUAL_LANES) {
    const seated = lane.id === "before-sleep";
    assert.equal(lane.workIds.includes(ritualOnly), seated, lane.id);
  }
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "gone-to-earth": {
      gutenberg: 7055,
      year: 1917,
      breaths: 2956,
      scenes: 37,
      minutes: 10,
      shelfMinutes: 407,
      shelfOpening: "Small feckless clouds were hurried",
      firstBreath: "Small feckless clouds were hurried",
      stop: "hunted and snared and destroyed",
      firstWords: 38,
      openBreaths: 45,
      openAt: 1,
      country: "England",
      place: "Welsh border hills",
      region: "gb",
      author: "Mary Webb",
      firstScene: "Dedication",
      lastScene: "Chapter 36",
      note: /pursues Hazel sexually/,
    },
    "the-real-charlotte": {
      gutenberg: 59138,
      year: 1894,
      breaths: 2372,
      scenes: 52,
      minutes: 10,
      shelfMinutes: 741,
      shelfOpening: "An August Sunday afternoon",
      firstBreath: "An August Sunday afternoon",
      stop: "won't tell on you this time",
      firstWords: 143,
      openBreaths: 27,
      openAt: 1,
      country: "Ireland",
      place: "Dublin & Lismoyle, Ireland",
      region: "ie",
      author: "E. Œ. Somerville & Martin Ross",
      firstScene: "Publication note",
      lastScene: "Chapter LI",
      note: null,
    },
    pembroke: {
      gutenberg: 17428,
      year: 1894,
      breaths: 2126,
      scenes: 14,
      minutes: 9,
      shelfMinutes: 394,
      shelfOpening: "At half-past six o'clock",
      firstBreath: "At half-past six o'clock",
      stop: "caught Charlotte's hands and kissed her",
      firstWords: 46,
      openBreaths: 32,
      openAt: 0,
      country: "United States",
      place: "Pembroke, New England",
      region: "us",
      author: "Mary E. Wilkins Freeman",
      firstScene: "Chapter I",
      lastScene: "Chapter XIV",
      note: /Ephraim, dies after his mother beats him/,
    },
    "the-argonauts": {
      gutenberg: 20537,
      year: 1901,
      breaths: 1898,
      scenes: 11,
      minutes: 9,
      shelfMinutes: 431,
      shelfOpening: "It was the mansion of a millionaire",
      firstBreath: "It was the mansion of a millionaire",
      stop: "sleepless in winning knowledge",
      firstWords: 163,
      openBreaths: 17,
      openAt: 0,
      country: "Poland",
      place: "Poland",
      region: "pl",
      author: "Eliza Orzeszko (tr. Jeremiah Curtin)",
      firstScene: "Chapter I",
      lastScene: "Chapter XI",
      note: null,
    },
    "at-the-roadside-station": {
      gutenberg: 49598,
      year: 1916,
      breaths: 15,
      scenes: 1,
      minutes: 9,
      shelfMinutes: 9,
      shelfOpening: "It was early spring when I went to the bungalow",
      firstBreath: "It was early spring when I went to the bungalow",
      stop: "He was so terribly bored",
      firstWords: 81,
      openBreaths: 15,
      openAt: 0,
      country: "Russia",
      place: "Russia",
      region: "ru",
      author: "Leonid Andreyev (tr. W. H. Lowe)",
      firstScene: "At the Roadside Station",
      lastScene: "At the Roadside Station",
      note: null,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    if (want.note) {
      assert.match(work.intro ?? "", want.note);
      assert.match(blurbFor(id), want.note);
      assert.match(
        readerIntro({
          id,
          title: work.title,
          author: work.author,
          year: String(work.year),
          note: work.intro ?? "",
          minutes: work.minutes,
          cover: "",
          coverAlt: "",
          scenes: [],
          breaths: [],
        }),
        want.note,
      );
    }
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as PackedSit & { scenes: { id?: string; title?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as {
      scenes: { id?: string; title?: string }[];
      year?: string;
      breaths: { text: string }[];
    };
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
    }
    if (want.openAt > 0) {
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(/pursues Hazel sexually|blood sport|fox-hunt tragedy|dies after his mother beats him/i.test(breath.text), false, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[A-Za-z][^*\n]*\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
  }

  const luke = JSON.parse(
    readFileSync(new URL("./texts/doctor-luke-of-the-labrador.json", import.meta.url), "utf8"),
  ) as { note?: string; breaths: { id?: string; text: string }[] };
  const lukeOpen = JSON.parse(
    readFileSync(new URL("./openings/doctor-luke-of-the-labrador.json", import.meta.url), "utf8"),
  ) as { note?: string; breaths: { text: string }[] };
  assert.match(luke.note ?? "", /double hyphens set as em dashes/);
  assert.match(lukeOpen.note ?? "", /double hyphens set as em dashes/);
  assert.equal(luke.breaths.length, 2052);
  assert.match(luke.breaths[0]?.text ?? "", /^A cluster of islands, lying off the cape, made the shelter of our harbour\./);
  assert.equal(luke.breaths[1000]?.id, "s15-133");
  assert.match(luke.breaths[1000]?.text ?? "", /^"Happy\? That's the word, Davy\./);
  assert.equal(lukeOpen.breaths[0]?.text, luke.breaths[0]?.text);
});

test("Mira POST-#213 CLEAR is Next lead The Will to Live, then Doom Castle, Mayflower, and Susan Proudleigh, with The Peat Moor on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "the-will-to-live",
    "doom-castle",
    "mayflower",
    "susan-proudleigh",
  ] as const;
  const prior = [
    "gone-to-earth",
    "the-real-charlotte",
    "pembroke",
    "the-argonauts",
  ] as const;
  const ritualOnly = "the-peat-moor";

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-36, -32), [...tail]);
  assert.deepEqual(next.slice(-40, -36), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(next.includes("at-the-roadside-station"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  assert.ok(next.lastIndexOf("the-argonauts") < next.lastIndexOf("the-will-to-live"));
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-30, -26), [...tail]);
  assert.equal(unwind?.workIds.includes(ritualOnly), false);
  assert.deepEqual(walk?.workIds.slice(-7, -6), ["doom-castle"]);
  for (const id of ["the-will-to-live", "mayflower", "susan-proudleigh", ritualOnly]) {
    assert.equal(walk?.workIds.includes(id), false, id);
  }
  assert.deepEqual(sleep?.workIds.slice(-7, -6), [ritualOnly]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  for (const lane of RITUAL_LANES) {
    const seated = lane.id === "before-sleep";
    assert.equal(lane.workIds.includes(ritualOnly), seated, lane.id);
  }
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "the-will-to-live": {
      gutenberg: 71923,
      year: 1915,
      breaths: 2166,
      scenes: 19,
      minutes: 9,
      shelfMinutes: 373,
      shelfOpening: "From the summit of the hill",
      firstBreath: "From the summit of the hill",
      stop: "claiming nothing",
      firstWords: 33,
      openBreaths: 40,
      openAt: 7,
      country: "France",
      place: "Chambéry & La Vigie, Savoy",
      region: "fr",
      author: "Henry Bordeaux (tr. Pitts Duffield)",
      firstScene: "Dedication",
      lastScene: "Part III · Chapter IX · The Will to Live",
      note: /elopes with a married woman/,
    },
    "doom-castle": {
      gutenberg: 21333,
      year: 1901,
      breaths: 1822,
      scenes: 41,
      minutes: 10,
      shelfMinutes: 485,
      shelfOpening: "It was an afternoon in autumn",
      firstBreath: "It was an afternoon in autumn",
      stop: "thicket break again behind him",
      firstWords: 133,
      openBreaths: 24,
      openAt: 0,
      country: "Scotland",
      place: "Argyll, Scottish Highlands",
      region: "gb",
      author: "Neil Munro",
      firstScene: "Chapter I · Count Victor comes to a strange country",
      lastScene: "Chapter XLI · Conclusion",
      note: null,
    },
    mayflower: {
      gutenberg: 29577,
      year: 1921,
      breaths: 579,
      scenes: 10,
      minutes: 10,
      shelfMinutes: 310,
      shelfOpening: "The morning of that day",
      firstBreath: "The morning of that day",
      stop: "money to make her start",
      firstWords: 53,
      openBreaths: 25,
      openAt: 0,
      country: "Spain",
      place: "The Cabanal, Valencia",
      region: "es",
      author: "Vicente Blasco Ibáñez (tr. Arthur Livingston)",
      firstScene: "Chapter I · The Widow's Tavern",
      lastScene: 'Chapter X · "and Still They Say Fish Comes High!"',
      note: /beats his wife/,
    },
    "susan-proudleigh": {
      gutenberg: 56335,
      year: 1915,
      breaths: 1522,
      scenes: 27,
      minutes: 6,
      shelfMinutes: 398,
      shelfOpening: "“I know I ’ave enemies,”",
      firstBreath: "“I know I ’ave enemies,”",
      stop: "her significant words",
      firstWords: 35,
      openBreaths: 10,
      openAt: 1,
      country: "Jamaica",
      place: "Kingston, Jamaica → Colón, Panama",
      region: "jm",
      author: "Herbert G. de Lisser",
      firstScene: "Publication note",
      lastScene: "Book III · Chapter IX · Jones Speaks in the Predicate",
      note: /Chinaman/,
    },
    "the-peat-moor": {
      gutenberg: 8663,
      year: 1891,
      breaths: 44,
      scenes: 1,
      minutes: 7,
      shelfMinutes: 7,
      shelfOpening: "High over the heathery wastes flew a wise old raven",
      firstBreath: "High over the heathery wastes flew a wise old raven",
      stop: "ear which it had buried",
      firstWords: 10,
      openBreaths: 44,
      openAt: 0,
      country: "Norway",
      place: "A peat moor on the Norwegian coast",
      region: "no",
      author: "Alexander Kielland",
      firstScene: "The Peat Moor",
      lastScene: "The Peat Moor",
      note: null,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    if (want.note) {
      assert.match(work.intro ?? "", want.note);
      assert.match(blurbFor(id), want.note);
      assert.match(
        readerIntro({
          id,
          title: work.title,
          author: work.author,
          year: String(work.year),
          note: work.intro ?? "",
          minutes: work.minutes,
          cover: "",
          coverAlt: "",
          scenes: [],
          breaths: [],
        }),
        want.note,
      );
    }
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
    }
    if (want.openAt > 0) {
      assert.equal(full.scenes[0]?.front, true, id);
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(
        /elopes with a married woman|beats his wife|deaths at sea|Chinaman|period language/i.test(breath.text),
        false,
        id,
      );
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[A-Za-z][^*\n]*\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
  }
});

test("Mira POST-#217 CLEAR is Next lead Life and Death of Harriett Frean, then Farewell Love!, The Son of His Mother, and My Lady Nobody, with New Year's Night on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "life-and-death-of-harriett-frean",
    "farewell-love",
    "the-son-of-his-mother",
    "my-lady-nobody",
  ] as const;
  const prior = [
    "the-will-to-live",
    "doom-castle",
    "mayflower",
    "susan-proudleigh",
  ] as const;
  const ritualOnly = "new-years-night";

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-32, -28), [...tail]);
  assert.deepEqual(next.slice(-36, -32), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(next.includes("the-peat-moor"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  assert.ok(next.lastIndexOf("susan-proudleigh") < next.lastIndexOf("life-and-death-of-harriett-frean"));
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(walk?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-26, -22), [...tail]);
  assert.equal(unwind?.workIds.includes(ritualOnly), false);
  assert.deepEqual(walk?.workIds.slice(-7, -6), ["doom-castle"]);
  assert.deepEqual(sleep?.workIds.slice(-6, -5), [ritualOnly]);
  assert.deepEqual(sleep?.workIds.slice(-7, -6), ["the-peat-moor"]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  for (const lane of RITUAL_LANES) {
    const seated = lane.id === "before-sleep";
    assert.equal(lane.workIds.includes(ritualOnly), seated, lane.id);
    for (const id of tail) {
      assert.equal(lane.workIds.includes(id), lane.id === "unwind", `${id} ${lane.id}`);
    }
  }
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "life-and-death-of-harriett-frean": {
      gutenberg: 9298,
      year: 1922,
      breaths: 778,
      scenes: 15,
      minutes: 9,
      shelfMinutes: 106,
      shelfOpening: "Pussycat, Pussycat, where have you been",
      firstBreath: "Pussycat, Pussycat, where have you been",
      stop: "think God would do",
      firstWords: 31,
      openBreaths: 57,
      openAt: 0,
      country: "England",
      place: "London suburb",
      region: "gb",
      author: "May Sinclair",
      firstScene: "Chapter I",
      lastScene: "Chapter XV",
      note: null,
    },
    "farewell-love": {
      gutenberg: 54619,
      year: 1906,
      breaths: 2377,
      scenes: 13,
      minutes: 4,
      shelfMinutes: 319,
      shelfOpening: "Motionless under the white coverlet",
      firstBreath: "Motionless under the white coverlet",
      stop: "He leapt over the little wall",
      firstWords: 20,
      openBreaths: 28,
      openAt: 2,
      country: "Italy",
      place: "Naples",
      region: "it",
      author: "Matilde Serao (tr. Aline Harland)",
      firstScene: "Dedication",
      lastScene: "Part II · Chapter V",
      note: /shoots herself/,
    },
    "the-son-of-his-mother": {
      gutenberg: 30732,
      year: 1913,
      breaths: 1943,
      scenes: 18,
      minutes: 9,
      shelfMinutes: 518,
      shelfOpening: "The husband and wife were of a literary turn of mind",
      firstBreath: "The husband and wife were of a literary turn of mind",
      stop: "high up among the Alps in Switzerland",
      firstWords: 84,
      openBreaths: 22,
      openAt: 0,
      country: "Germany",
      place: "Berlin",
      region: "de",
      author: "Clara Viebig (tr. H. Raahauge)",
      firstScene: "Book I · Chapter I",
      lastScene: "Book III · Chapter XVIII",
      note: /dies of an illness/,
    },
    "my-lady-nobody": {
      gutenberg: 49903,
      year: 1895,
      breaths: 3941,
      scenes: 50,
      minutes: 10,
      shelfMinutes: 656,
      shelfOpening: "It was a white-hot July morning",
      firstBreath: "It was a white-hot July morning",
      stop: "turned in the trenches and fell asleep again",
      firstWords: 69,
      openBreaths: 46,
      openAt: 2,
      country: "Netherlands",
      place: "Horstwyk",
      region: "nl",
      author: "Maarten Maartens",
      firstScene: "Dedication",
      lastScene: "Part III · Chapter XLIX · Face to face with herself",
      note: /suicide attempt over debt/,
    },
    "new-years-night": {
      gutenberg: 1313,
      year: 1900,
      breaths: 53,
      scenes: 1,
      minutes: 9,
      shelfMinutes: 12,
      shelfOpening: "It was dark enough for anything in Dead Man's Gap",
      firstBreath: "It was dark enough for anything in Dead Man's Gap",
      stop: "far-away stars in the depth of it",
      firstWords: 241,
      openBreaths: 36,
      openAt: 0,
      country: "Australia",
      place: "New South Wales",
      region: "au",
      author: "Henry Lawson",
      firstScene: "New Year's Night",
      lastScene: "New Year's Night",
      note: null,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    if (want.note) {
      assert.match(work.intro ?? "", want.note);
      assert.match(blurbFor(id), want.note);
      assert.match(
        readerIntro({
          id,
          title: work.title,
          author: work.author,
          year: String(work.year),
          note: work.intro ?? "",
          minutes: work.minutes,
          cover: "",
          coverAlt: "",
          scenes: [],
          breaths: [],
        }),
        want.note,
      );
    }
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
    }
    if (want.openAt > 0) {
      assert.equal(full.scenes[0]?.front, true, id);
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(
        /shoots herself|dies of an illness|period stereotype|suicide attempt over debt|Aceh/i.test(breath.text),
        false,
        id,
      );
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[A-Za-z][^*\n]*\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
  }

  const lady = JSON.parse(
    readFileSync(new URL("./texts/my-lady-nobody.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(
    lady.scenes.find((scene) => scene.title.includes("Chapter XVIII"))?.title,
    "Part II · Chapter XVIII · The duty of a parent",
  );
  const ladyOpen = JSON.parse(
    readFileSync(new URL("./openings/my-lady-nobody.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(ladyOpen.breaths[0]?.text ?? "", /^It was a white-hot July morning\./);
  const farewellOpen = JSON.parse(
    readFileSync(new URL("./openings/farewell-love.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(farewellOpen.breaths.at(-1)?.text, "He leapt over the little wall.");
});

test("Mira POST-#218 CLEAR is Next lead The Old House, then The Sworn Brothers, Dusty Answer, and Christine of the Hills, with The Story of a Woman on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "the-old-house",
    "the-sworn-brothers",
    "dusty-answer",
    "christine-of-the-hills",
  ] as const;
  const prior = [
    "life-and-death-of-harriett-frean",
    "farewell-love",
    "the-son-of-his-mother",
    "my-lady-nobody",
  ] as const;
  const ritualOnly = "the-story-of-a-woman";
  const unwindTail = ["the-old-house", "the-sworn-brothers", "dusty-answer"] as const;
  const commuteTail = ["the-sworn-brothers", "christine-of-the-hills"] as const;

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-28, -24), [...tail]);
  assert.deepEqual(next.slice(-32, -28), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(next.includes("new-years-night"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  assert.ok(next.lastIndexOf("my-lady-nobody") < next.lastIndexOf("the-old-house"));
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-22, -19), [...unwindTail]);
  assert.equal(unwind?.workIds.includes("christine-of-the-hills"), false);
  assert.equal(unwind?.workIds.includes(ritualOnly), false);
  assert.deepEqual(walk?.workIds.slice(-6, -4), [...commuteTail]);
  assert.equal(walk?.workIds.includes("the-old-house"), false);
  assert.equal(walk?.workIds.includes("dusty-answer"), false);
  assert.equal(walk?.workIds.includes(ritualOnly), false);
  assert.deepEqual(sleep?.workIds.slice(-5, -4), [ritualOnly]);
  assert.deepEqual(sleep?.workIds.slice(-6, -5), ["new-years-night"]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes(ritualOnly), lane.id === "before-sleep", lane.id);
    assert.equal(lane.workIds.includes("the-old-house"), lane.id === "unwind", lane.id);
    assert.equal(lane.workIds.includes("dusty-answer"), lane.id === "unwind", lane.id);
    assert.equal(
      lane.workIds.includes("the-sworn-brothers"),
      lane.id === "unwind" || lane.id === "on-a-walk",
      lane.id,
    );
    assert.equal(lane.workIds.includes("christine-of-the-hills"), lane.id === "on-a-walk", lane.id);
  }
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "the-old-house": {
      gutenberg: 66344,
      year: 1922,
      breaths: 1836,
      scenes: 19,
      minutes: 7,
      shelfMinutes: 310,
      shelfOpening: "It was evening",
      firstBreath: "It was evening",
      stop: "sailed angrily back into the darkness of the corridor",
      firstWords: 52,
      openBreaths: 34,
      openAt: 0,
      country: "Hungary",
      place: "Pest and Buda",
      region: "hu",
      author: "Cécile Tormay (tr. Emil Torday)",
      firstScene: "Chapter I",
      lastScene: "Chapter XIX",
      note: /1849 siege/,
    },
    "the-sworn-brothers": {
      gutenberg: 62123,
      year: 1921,
      breaths: 1194,
      scenes: 36,
      minutes: 9,
      shelfMinutes: 461,
      shelfOpening: "In the red light of the fire",
      firstBreath: "In the red light of the fire",
      stop: "confidential crackling of the fire was the only sound audible",
      firstWords: 68,
      openBreaths: 23,
      openAt: 0,
      country: "Iceland",
      place: "Dalsfjord, Norway → Iceland",
      region: "no",
      author: "Gunnar Gunnarsson (tr. William Emmé & Claud Field)",
      firstScene: "Book I · Chapter I",
      lastScene: "Book III · Chapter XII",
      note: /pagan sacrifice/,
    },
    "dusty-answer": {
      gutenberg: 72642,
      year: 1927,
      breaths: 3867,
      scenes: 39,
      minutes: 9,
      shelfMinutes: 524,
      shelfOpening: "When Judith was eighteen",
      firstBreath: "When Judith was eighteen",
      stop: "Judith suddenly made up some poetry",
      firstWords: 147,
      openBreaths: 29,
      openAt: 3,
      country: "England",
      place: "Thames-side → Cambridge",
      region: "gb",
      author: "Rosamond Lehmann",
      firstScene: "Epigraph and dedication",
      lastScene: "Part five · Chapter 7",
      note: /half-caste/,
    },
    "christine-of-the-hills": {
      gutenberg: 72678,
      year: 1897,
      breaths: 837,
      scenes: 26,
      minutes: 10,
      shelfMinutes: 277,
      shelfOpening: "We had been sailing for some hours",
      firstBreath: "We had been sailing for some hours",
      stop: "God was good to you in sending you to me",
      firstWords: 40,
      openBreaths: 28,
      openAt: 0,
      country: "Croatia",
      place: "Dalmatia",
      region: "hr",
      author: "Max Pemberton",
      firstScene: "Prologue · The pavilion of the island",
      lastScene: "Chapter XXV · The end of the story",
      note: /predatory guardian/,
    },
    "the-story-of-a-woman": {
      gutenberg: 71004,
      year: 1908,
      breaths: 47,
      scenes: 1,
      minutes: 7,
      shelfMinutes: 7,
      shelfOpening: "Now Dokhio, the Father of Durga",
      firstBreath: "Now Dokhio, the Father of Durga",
      stop: "was what she said",
      firstWords: 78,
      openBreaths: 47,
      openAt: 0,
      country: "India",
      place: "Bengal, India",
      region: "in",
      author: "Cornelia Sorabji",
      firstScene: "The Story of a Woman",
      lastScene: "The Story of a Woman",
      note: null,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    if (want.note) {
      assert.match(work.intro ?? "", want.note);
      assert.match(blurbFor(id), want.note);
      assert.match(
        readerIntro({
          id,
          title: work.title,
          author: work.author,
          year: String(work.year),
          note: work.intro ?? "",
          minutes: work.minutes,
          cover: "",
          coverAlt: "",
          scenes: [],
          breaths: [],
        }),
        want.note,
      );
    }
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
    }
    if (want.openAt > 0) {
      assert.equal(full.scenes[0]?.front, true, id);
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(
        /1849 siege|pagan sacrifice|half-caste|predatory guardian|whippings/i.test(breath.text),
        false,
        id,
      );
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[A-Za-z][^*\n]*\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    assert.equal(fullJoined.includes("* * *"), full.breaths.some((breath) => isSectionBreak(breath.text)), id);
  }

  const oldHouse = JSON.parse(
    readFileSync(new URL("./texts/the-old-house.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(oldHouse.breaths.filter((breath) => breath.text.startsWith("Note:")).length, 2);
  assert.equal(oldHouse.breaths.some((breath) => /^[12]$/.test(breath.text.trim())), false);
  assert.ok(oldHouse.breaths.filter((breath) => isSectionBreak(breath.text)).length >= 2);
  assert.match(oldHouse.breaths.map((breath) => breath.text).join("\n"), /SEBASTIAN ULWING \/ CITY CLOCKMAKER/);
  assert.match(oldHouse.breaths.map((breath) => breath.text).join("\n"), /IRODA\./);

  const sworn = JSON.parse(
    readFileSync(new URL("./texts/the-sworn-brothers.json", import.meta.url), "utf8"),
  ) as Work;
  const swornText = sworn.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/[“”]/.test(swornText), false);
  assert.equal(swornText.includes('"'), true);

  const dusty = JSON.parse(
    readFileSync(new URL("./texts/dusty-answer.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(dusty.scenes[0]?.front, true);
  assert.equal(openingBreathIndex(dusty), 3);
  const dustyOpen = JSON.parse(
    readFileSync(new URL("./openings/dusty-answer.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(isSectionBreak(dusty.breaths[3 + dustyOpen.breaths.length]?.text ?? ""), true);

  const story = JSON.parse(
    readFileSync(new URL("./texts/the-story-of-a-woman.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(story.scenes.length, 1);
  assert.equal(story.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
});

test("Mira POST-#221 CLEAR is Next lead Daughters of Men, then The Bright Shawl, Irresolute Catherine, and The Old Room, with The Fur Coat on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = [
    "daughters-of-men",
    "the-bright-shawl",
    "irresolute-catherine",
    "the-old-room",
  ] as const;
  const prior = [
    "the-old-house",
    "the-sworn-brothers",
    "dusty-answer",
    "christine-of-the-hills",
  ] as const;
  const ritualOnly = "the-fur-coat";

  assert.deepEqual(featured, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  assert.deepEqual(next.slice(-24, -20), [...tail]);
  assert.deepEqual(next.slice(-28, -24), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(next.includes("the-story-of-a-woman"), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  assert.ok(next.lastIndexOf("christine-of-the-hills") < next.lastIndexOf("daughters-of-men"));
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
  }
  assert.equal(forYou?.workIds.slice(0, 3).join(), "the-house-of-mirth,quicksand,botchan");
  assert.deepEqual(unwind?.workIds.slice(-19, -15), [...tail]);
  assert.equal(unwind?.workIds.includes(ritualOnly), false);
  assert.deepEqual(walk?.workIds.slice(-4, -3), [ "the-bright-shawl" ]);
  assert.deepEqual(walk?.workIds.slice(-6, -4), ["the-sworn-brothers", "christine-of-the-hills"]);
  assert.equal(walk?.workIds.includes("daughters-of-men"), false);
  assert.equal(walk?.workIds.includes("the-old-room"), false);
  assert.deepEqual(sleep?.workIds.slice(-4, -3), [ritualOnly]);
  assert.deepEqual(sleep?.workIds.slice(-5, -4), ["the-story-of-a-woman"]);
  for (const id of tail) {
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes(ritualOnly), lane.id === "before-sleep", lane.id);
    assert.equal(lane.workIds.includes("daughters-of-men"), lane.id === "unwind", lane.id);
    assert.equal(lane.workIds.includes("irresolute-catherine"), lane.id === "unwind", lane.id);
    assert.equal(lane.workIds.includes("the-old-room"), lane.id === "unwind", lane.id);
    assert.equal(
      lane.workIds.includes("the-bright-shawl"),
      lane.id === "unwind" || lane.id === "on-a-walk",
      lane.id,
    );
  }
  assert.equal(waking?.workIds.at(-2), "nina-balatka");

  const opens = {
    "daughters-of-men": {
      gutenberg: 65098,
      year: 1892,
      breaths: 1999,
      scenes: 33,
      minutes: 4,
      shelfMinutes: 476,
      shelfOpening: "The Austrian embassy at Athens",
      firstBreath: "The Austrian embassy at Athens",
      stop: "ready to sink with shame the instant a strange woman looked at him",
      firstWords: 206,
      openBreaths: 4,
      openAt: 6,
      country: "Greece",
      place: "Athens & Tenos, Greece",
      region: "gr",
      author: "Hannah Lynch",
      firstScene: "Dedication",
      lastScene: "Chapter XXXII · Conclusion",
      note: /worse than the Jews/,
    },
    "the-bright-shawl": {
      gutenberg: 31898,
      year: 1922,
      breaths: 480,
      scenes: 33,
      minutes: 6,
      shelfMinutes: 219,
      shelfOpening: "When Howard Gage had gone",
      firstBreath: "When Howard Gage had gone",
      stop: "like Andalusia incarnate",
      firstWords: 93,
      openBreaths: 12,
      openAt: 1,
      country: "Cuba",
      place: "Havana, Cuba",
      region: "cu",
      author: "Joseph Hergesheimer",
      firstScene: "Dedication",
      lastScene: "",
      note: /firing squads/,
    },
    "irresolute-catherine": {
      gutenberg: 57503,
      year: 1908,
      breaths: 402,
      scenes: 6,
      minutes: 8,
      shelfMinutes: 121,
      shelfOpening: "A dull patter of sheep's hurrying feet",
      firstBreath: "A dull patter of sheep's hurrying feet",
      stop: "spoke well for the strength of his feelings",
      firstWords: 118,
      openBreaths: 17,
      openAt: 0,
      country: "Wales",
      place: "Wye hills near Brecon, Wales",
      region: "gb",
      author: "Violet Jacob",
      firstScene: "Chapter I · Bethesda",
      lastScene: "Chapter VI · Catherine opens the gate",
      note: null,
    },
    "the-old-room": {
      gutenberg: 62883,
      year: 1908,
      breaths: 1667,
      scenes: 25,
      minutes: 8,
      shelfMinutes: 219,
      shelfOpening: "The room looks out upon the square",
      firstBreath: "The room looks out upon the square",
      stop: "And his wife was Fru Adelheid",
      firstWords: 22,
      openBreaths: 32,
      openAt: 22,
      country: "Denmark",
      place: "Denmark",
      region: "dk",
      author: "Carl Ewald (tr. Alexander Teixeira de Mattos)",
      firstScene: "Dedication and preface",
      lastScene: "Part II · Cordt’s son · Chapter XXIV",
      note: /murder-suicide/,
    },
    "the-fur-coat": {
      gutenberg: 64808,
      year: 1923,
      breaths: 30,
      scenes: 1,
      minutes: 7,
      shelfMinutes: 7,
      shelfOpening: "It was a cold winter that year",
      firstBreath: "It was a cold winter that year",
      stop: "the last seconds of happiness I have known in my life",
      firstWords: 95,
      openBreaths: 30,
      openAt: 0,
      country: "Sweden",
      place: "Sweden",
      region: "se",
      author: "Hjalmar Söderberg (tr. Charles Wharton Stork)",
      firstScene: "The Fur Coat",
      lastScene: "The Fur Coat",
      note: null,
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.equal(SHELF.filter((item) => item.id === id).length, 1, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.match(work.opening ?? "", new RegExp(want.shelfOpening));
    assert.equal(PITCHES[id], work.intro, id);
    assert.equal(PREFACES[id], work.intro, id);
    assert.equal(STORED_PREFACES[id], work.intro, id);
    assert.equal(RITUAL_PITCHES[id], work.intro, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
    if (want.note) {
      assert.match(work.intro ?? "", want.note);
      assert.match(blurbFor(id), want.note);
      assert.match(
        readerIntro({
          id,
          title: work.title,
          author: work.author,
          year: String(work.year),
          note: work.intro ?? "",
          minutes: work.minutes,
          cover: "",
          coverAlt: "",
          scenes: [],
          breaths: [],
        }),
        want.note,
      );
    }
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    if (id === "the-bright-shawl") {
      assert.equal(full.scenes.filter((scene) => scene.title === "" && scene.place === "").length, 32, id);
    } else {
      assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    }
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.match(opened.breaths[0]?.text ?? "", new RegExp(want.firstBreath));
    assert.match(opened.breaths.at(-1)?.text ?? "", new RegExp(want.stop));
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
    }
    if (want.openAt > 0) {
      assert.equal(full.scenes[0]?.front, true, id);
      assert.notEqual(full.breaths[0]?.text, opened.breaths[0]?.text, id);
    }
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
    }
    for (const breath of opened.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(
        /worse than the Jews|firing squads|period race language|murder-suicide|frank talk of infidelity/i.test(breath.text),
        false,
        id,
      );
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (/\*[A-Za-z][^*\n]*\*/.test(fullJoined)) {
      assert.equal(splitEmphasis(fullJoined).some((part) => part.type === "em"), true, id);
    }
    assert.equal(fullJoined.includes("* * *"), full.breaths.some((breath) => isSectionBreak(breath.text)), id);
    if (id === "the-bright-shawl" || id === "irresolute-catherine") {
      assert.equal(/[“”]/.test(fullJoined), false, id);
      assert.equal(fullJoined.includes('"'), true, id);
    } else {
      assert.equal(fullJoined.includes('"'), false, id);
      assert.equal(/[“”]/.test(fullJoined), true, id);
    }
  }

  const daughters = JSON.parse(
    readFileSync(new URL("./texts/daughters-of-men.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(daughters.scenes[0]?.front, true);
  assert.equal(openingBreathIndex(daughters), 6);
  assert.equal(daughters.breaths.filter((breath) => isSectionBreak(breath.text)).length, 3);

  const shawl = JSON.parse(
    readFileSync(new URL("./texts/the-bright-shawl.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(shawl.scenes[0]?.front, true);
  assert.equal(openingBreathIndex(shawl), 1);
  assert.equal(shawl.scenes.filter((scene) => scene.title === "").length, 32);

  const room = JSON.parse(
    readFileSync(new URL("./texts/the-old-room.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(room.scenes[0]?.front, true);
  assert.equal(room.scenes.every((scene) => scene.place === ""), true);
  assert.equal(openingBreathIndex(room), 22);

  const coat = JSON.parse(
    readFileSync(new URL("./texts/the-fur-coat.json", import.meta.url), "utf8"),
  ) as Work;
  assert.equal(coat.scenes.length, 1);
  assert.equal(coat.scenes[0]?.place, "");
  assert.equal(coat.breaths.filter((breath) => isSectionBreak(breath.text)).length, 3);
  assert.equal(coat.breaths.length, coat.breaths.filter((breath) => breath.sceneId === "s0").length);
});

test("Mira POST-#222 CLEAR is Next lead The Corsican Brothers, then Jocelyn and The Woman of Knockaloe, with The Taking of the Redoubt on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["the-corsican-brothers", "jocelyn", "the-woman-of-knockaloe"] as const;
  const prior = ["daughters-of-men", "the-bright-shawl", "irresolute-catherine", "the-old-room"] as const;
  const ritualOnly = "the-taking-of-the-redoubt";

  assert.deepEqual(next.slice(-20, -17), [...tail]);
  assert.deepEqual(next.slice(-24, -20), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(next.includes("pearl-of-pearl-island"), false);
  assert.equal(SHELF.some((item) => item.gutenberg === 15259), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  assert.deepEqual(unwind?.workIds.slice(-15, -11), ["the-corsican-brothers", "jocelyn", "the-woman-of-knockaloe", "the-taking-of-the-redoubt"]);
  assert.deepEqual(walk?.workIds.slice(-3, -2), ["the-corsican-brothers"]);
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes(ritualOnly), lane.id === "unwind", lane.id);
    assert.equal(lane.workIds.includes("jocelyn"), lane.id === "unwind", lane.id);
    assert.equal(lane.workIds.includes("the-woman-of-knockaloe"), lane.id === "unwind", lane.id);
    assert.equal(lane.workIds.includes("the-corsican-brothers"), lane.id === "unwind" || lane.id === "on-a-walk", lane.id);
  }

  const opens = {
    "the-corsican-brothers": {
      gutenberg: 41881,
      year: 1880,
      author: "Alexandre Dumas (tr. Henry Frith)",
      breaths: 1389,
      scenes: 21,
      shelfMinutes: 148,
      minutes: 9,
      openBreaths: 67,
      openAt: 1,
      firstWords: 11,
      firstBreath: "In the beginning of March, 1841, I was travelling in Corsica.",
      lastBreath: "I profited by this gracious invitation to idleness—one of the most agreeable which can be extended to a traveller.",
      firstScene: "Dedication",
      lastScene: "Chapter XX",
      country: "France",
      place: "Sullacaro, Corsica",
      region: "fr",
      note: /pistol duels/,
      quotes: "straight",
    },
    "jocelyn": {
      gutenberg: 73672,
      year: 1898,
      author: "John Galsworthy",
      breaths: 1084,
      scenes: 29,
      shelfMinutes: 284,
      minutes: 10,
      openBreaths: 34,
      openAt: 2,
      firstWords: 107,
      firstBreath: "A light laugh came floating into the sunshine through the green shutters of a room in the Hôtel Milano. It grated on Giles Legard, who sat on the stone terrace outside, face to face with a naked fact for, perhaps, the first time in ten years. He uncrossed his legs, finished his coffee, and rose listlessly, looking down the dried river bed towards the smooth sea. He was alone with the sunlight, and it laid bare his face with a convincing stare. The indifferent, gentle egotism of the man had recoiled before the meaning of things for so long, that the reality painted itself upon him harshly.",
      lastBreath: "He had pursuits; for instance, he occasionally went over to Monte Carlo and gambled mildly, he made annual shooting trips to Algeria or Morocco, and he was continually yachting round the coast; but of work, nothing; of love—nothing!",
      firstScene: "Dedication and epigraph",
      lastScene: "Part III · Chapter XXVIII",
      country: "France",
      place: "Mentone & Monte Carlo, the Riviera",
      region: "fr",
      note: /morphia overdose/,
      quotes: "curly",
    },
    "the-woman-of-knockaloe": {
      gutenberg: 66932,
      year: 1923,
      author: "Hall Caine",
      breaths: 1078,
      scenes: 19,
      shelfMinutes: 156,
      minutes: 8,
      openBreaths: 50,
      openAt: 8,
      firstWords: 49,
      firstBreath: "Knockaloe is a large farm on the west of the Isle of Man, a little to the south of the fishing town of Peel. From the farmstead I can see the harbour and the breakwater, with the fishing boats moored within and the broad curve of the sea outside.",
      lastBreath: "“You’re hard, woman, you’re hard,” he says.",
      firstScene: "Epigraphs",
      lastScene: "Conclusion",
      country: "Isle of Man",
      place: "Knockaloe, by Peel, Isle of Man",
      region: "im",
      note: /double suicide/,
      quotes: "curly",
    },
    "the-taking-of-the-redoubt": {
      gutenberg: 67643,
      year: 1903,
      author: "Prosper Mérimée (tr. George Burnham Ives)",
      breaths: 50,
      scenes: 1,
      shelfMinutes: 9,
      minutes: 9,
      openBreaths: 50,
      openAt: 0,
      firstWords: 53,
      firstBreath: "A military friend of mine, who died of a fever in Greece a few years ago, told me one day about the first action in which he took part. His story made such an impression on me that I wrote it down from memory as soon as I had time. Here it is:",
      lastBreath: "1829.",
      firstScene: "The Taking of the Redoubt",
      lastScene: "The Taking of the Redoubt",
      country: "Russia",
      place: "Cheverino redoubt",
      region: "ru",
      note: /graphic sentence/,
      quotes: "curly",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.ok(want.minutes <= 10, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    assert.doesNotMatch(placeFor(work)?.label ?? "", /England/, id);
    assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
    assert.match(work.intro ?? "", want.note, id);
    assert.doesNotMatch(work.intro ?? "", /PG reading-ease/, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.equal(opened.breaths[0]?.text, want.firstBreath, id);
    assert.equal(opened.breaths.at(-1)?.text, want.lastBreath, id);
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
      assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false, id);
    }
    if (want.openAt > 0) assert.equal(full.scenes[0]?.front, true, id);
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
      assert.ok(breath.text.trim().split(/\s+/).length <= 350, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (want.quotes === "straight") {
      assert.equal(/[“”]/.test(fullJoined), false, id);
    } else {
      assert.equal(fullJoined.includes('"'), false, id);
      assert.equal(/[“”]/.test(fullJoined), true, id);
    }
  }

  const knockaloe = JSON.parse(readFileSync(new URL("./texts/the-woman-of-knockaloe.json", import.meta.url), "utf8")) as Work;
  assert.deepEqual(knockaloe.scenes.filter((scene) => scene.front).map((scene) => scene.title), ["Epigraphs", "Introductory"]);
  assert.equal(knockaloe.breaths.filter((breath) => breath.text.startsWith("Note: ")).length, 1);
  const jocelyn = JSON.parse(readFileSync(new URL("./texts/jocelyn.json", import.meta.url), "utf8")) as Work;
  assert.equal(jocelyn.breaths.filter((breath) => isSectionBreak(breath.text)).length, 3);
  const redoubt = JSON.parse(readFileSync(new URL("./texts/the-taking-of-the-redoubt.json", import.meta.url), "utf8")) as Work;
  assert.equal(redoubt.scenes.length, 1);
  assert.equal(redoubt.breaths.at(-1)?.text, "1829.");
  assert.equal(redoubt.breaths.some((breath) => breath.text.includes("B——")), true);
  assert.equal(redoubt.breaths.some((breath) => breath.text.includes("----")), false);
});

test("Mira POST-#224 CLEAR is Next lead The Man in the Brown Suit, then Wang the Ninth and Garram the Hunter, with His Dead Wife's Photograph on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["the-man-in-the-brown-suit", "wang-the-ninth", "garram-the-hunter"] as const;
  const prior = ["the-corsican-brothers", "jocelyn", "the-woman-of-knockaloe"] as const;
  const ritualOnly = "his-dead-wifes-photograph";

  assert.deepEqual(next.slice(-17, -14), [...tail]);
  assert.deepEqual(next.slice(-20, -17), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(SHELF.some((item) => item.gutenberg === 72086), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  assert.deepEqual(unwind?.workIds.slice(-11, -7), ["the-man-in-the-brown-suit", "wang-the-ninth", "garram-the-hunter", "his-dead-wifes-photograph"]);
  assert.deepEqual(walk?.workIds.slice(-3, -2), ["the-corsican-brothers"]);
  for (const lane of RITUAL_LANES) {
    for (const id of [...tail, ritualOnly]) {
      assert.equal(lane.workIds.includes(id), lane.id === "unwind", `${lane.id} ${id}`);
    }
  }

  const opens = {
    "the-man-in-the-brown-suit": {
      gutenberg: 61168,
      year: 1924,
      author: "Agatha Christie",
      breaths: 2595,
      scenes: 38,
      shelfMinutes: 375,
      minutes: 8,
      openBreaths: 67,
      openAt: 1,
      firstWords: 91,
      firstBreath: "Nadina, the Russian dancer who had taken Paris by storm, swayed to the sound of the applause, bowed and bowed again. Her narrow black eyes narrowed themselves still more, the long line of her scarlet mouth curved faintly upwards. Enthusiastic Frenchmen continued to beat the ground appreciatively as the curtain fell with a swish, hiding the reds and blues and magentas of the bizarre *décors*. In a swirl of blue and orange draperies the dancer left the stage. A bearded gentleman received her enthusiastically in his arms. It was the Manager.",
      lastBreath: "“I am quite sure of him. He is inefficient, but perfectly trustworthy.” She paused, and then added in an indifferent tone of voice: “As a matter of fact, he happens to be my husband.”",
      firstScene: "Dedication",
      lastScene: "Chapter XXXVI",
      country: "South Africa",
      place: "Paris, France",
      region: "fr",
      note: /Rand strike/,
      quotes: "curly",
    },
    "wang-the-ninth": {
      gutenberg: 37376,
      year: 1920,
      author: "B. L. Putnam Weale",
      breaths: 1039,
      scenes: 29,
      shelfMinutes: 256,
      minutes: 7,
      openBreaths: 29,
      openAt: 3,
      firstWords: 113,
      firstBreath: "Wang the Ninth was born a few years before the end of the nineteenth century in a village called prosaically in the vernacular Ten Li Hamlet because it lay ten *li* or Chinese miles from the great imperial highway. He was the eighth child; that was why, according to immemorial custom, he was called the Ninth, since the numeral eight added to his patronymic signified that opprobrious epithet term \"tortoise,\" a nickname which no Chinese could survive. When he was little more than three and scarcely weaned (for the children of this land are suckled until they can run) he was unceremoniously put on a creaking wheelbarrow and trundled off into the unknown.",
      lastBreath: "Then it sank back content on the straw in the basket, and the father seizing the handles of the wheelbarrow pushed clumsily on.",
      firstScene: "Preface",
      lastScene: "Chapter XXVIII",
      country: "China",
      place: "Ten Li Hamlet",
      region: "cn",
      note: /children are sold/,
      quotes: "straight",
    },
    "garram-the-hunter": {
      gutenberg: 79229,
      year: 1930,
      author: "Herbert Best",
      breaths: 662,
      scenes: 24,
      shelfMinutes: 208,
      minutes: 5,
      openBreaths: 13,
      openAt: 1,
      firstWords: 89,
      firstBreath: "Garram stopped silently in midstride and listened. On each side the narrow path beaten through the parched, straw-like grass by the feet of different game animals, trees, gnarled and stunted by the annual forest fires, hid all the view. Heat from the midday tropical sun beat down into the breezeless African bush and made the perspiration run down the silken black skin of the young hunter, down the uplifted foot as he paused, leg raised in midstride, down the worn hollow of the path in the red brick-like clay.",
      lastBreath: "A blow instantly fatal. The great beast, killed in full gallop, thudded upon the ground. The boy with one spring alighted unhurt and smiling in the dust of the fall. For a moment he stood so, half sorry for his fine opponent, then turned to the work on hand.",
      firstScene: "Dedication",
      lastScene: "Chapter XXIII · Home again",
      country: "Nigeria",
      place: "the Hills and the Plains",
      region: "ng",
      note: /slave raids/,
      quotes: "curly",
    },
    "his-dead-wifes-photograph": {
      gutenberg: 17113,
      year: 1917,
      author: "S. Mukerji",
      breaths: 33,
      scenes: 1,
      shelfMinutes: 10,
      minutes: 10,
      openBreaths: 33,
      openAt: 0,
      firstWords: 54,
      firstBreath: "This story created a sensation when it was first told. It appeared in the papers and many big Physicists and Natural Philosophers were, at least so they thought, able to explain the phenomenon. I shall narrate the event and also tell the reader what explanation was given, and let him draw his own conclusions.",
      lastBreath: "It is now over seven years since the event mentioned above happened; and the dead girl has never appeared again. I would very much like to have a photograph of the two ladies taken once more; but I have never ventured to approach Smith with the proposal. In fact, I learnt photography myself with a view to take the photograph of the two ladies, but as I have said, I have never been able to speak to Smith about my intention, and probably never shall. The L10, that I spent on my cheap photographic outfit may be a waste. But I have learnt an art which though rather costly for my limited means is nevertheless an art worth learning.",
      firstScene: "His Dead Wife's Photograph",
      lastScene: "His Dead Wife's Photograph",
      country: "India",
      place: "India",
      region: "in",
      note: /childbirth/,
      quotes: "straight",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.ok(want.minutes <= 10, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    assert.doesNotMatch(placeFor(work)?.label ?? "", /England/, id);
    assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
    assert.match(work.intro ?? "", want.note, id);
    assert.doesNotMatch(work.intro ?? "", /PG reading-ease/, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.equal(opened.breaths[0]?.text, want.firstBreath, id);
    assert.equal(opened.breaths.at(-1)?.text, want.lastBreath, id);
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
      assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false, id);
    }
    if (want.openAt > 0) assert.equal(full.scenes[0]?.front, true, id);
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.replace("Father ---- M.A.", "").includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
      assert.ok(breath.text.trim().split(/\s+/).length <= 350, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (want.quotes === "straight") {
      assert.equal(/[“”]/.test(fullJoined), false, id);
    } else {
      assert.equal(fullJoined.includes('"'), false, id);
      assert.equal(/[“”]/.test(fullJoined), true, id);
    }
  }

  const read = (id: string) => JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const brown = read("the-man-in-the-brown-suit");
  assert.deepEqual(brown.scenes.filter((scene) => scene.front).map((scene) => scene.title), ["Dedication"]);
  assert.equal(brown.scenes[1]?.title, "Prologue");
  assert.equal(brown.breaths.some((breath) => breath.text.includes("——")), false);
  assert.equal(brown.breaths.some((breath) => /[.,;:]\*(?![A-Za-z*])/.test(breath.text)), false);
  const wang = read("wang-the-ninth");
  assert.deepEqual(wang.scenes.filter((scene) => scene.front).map((scene) => scene.title), ["Preface"]);
  assert.equal(wang.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  const garram = read("garram-the-hunter");
  assert.deepEqual(garram.scenes.filter((scene) => scene.front).map((scene) => scene.title), ["Dedication"]);
  assert.equal(garram.scenes[1]?.title, "Chapter I · A hunter and his dog");
  assert.equal(garram.breaths.filter((breath) => isSectionBreak(breath.text)).length, 3);
  assert.equal(garram.breaths.some((breath) => /\[Illustration/i.test(breath.text)), false);
  const photo = read(ritualOnly);
  assert.equal(photo.scenes.length, 1);
  assert.equal(photo.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  assert.equal(isSectionBreak(photo.breaths[2]?.text ?? ""), true);
  assert.equal(photo.breaths[1]?.text, "This was what happened.");
  assert.equal(photo.breaths.filter((breath) => breath.text.includes("Father ---- M.A.,")).length, 1);
  assert.equal(photo.breaths.some((breath) => breath.text.includes("The L10, that I spent")), true);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(photo.breaths.reduce((n, breath) => n + (isSectionBreak(breath.text) ? 0 : breath.text.trim().split(/\s+/).length), 0) / 200));
});

test("Mira POST-#225 CLEAR is Next lead The Face in the Abyss, then Mary Magdalen, with The Hoop on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["the-face-in-the-abyss", "mary-magdalen"] as const;
  const prior = ["the-man-in-the-brown-suit", "wang-the-ninth", "garram-the-hunter"] as const;
  const ritualOnly = "the-hoop";

  assert.deepEqual(next.slice(-14, -12), [...tail]);
  assert.deepEqual(next.slice(-17, -14), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  for (const cut of [66274, 79040]) assert.equal(SHELF.some((item) => item.gutenberg === cut), false, String(cut));
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  assert.deepEqual(unwind?.workIds.slice(-7, -4), ["the-face-in-the-abyss", "mary-magdalen", "the-hoop"]);
  assert.deepEqual(walk?.workIds.slice(-3, -2), ["the-corsican-brothers"]);
  for (const lane of RITUAL_LANES) {
    for (const id of [...tail, ritualOnly]) {
      assert.equal(lane.workIds.includes(id), lane.id === "unwind", `${lane.id} ${id}`);
    }
  }

  const opens = {
    "the-face-in-the-abyss": {
      gutenberg: 79106,
      year: 1923,
      author: "A. Merritt",
      breaths: 822,
      scenes: 9,
      shelfMinutes: 165,
      minutes: 8,
      openBreaths: 20,
      openAt: 0,
      firstWords: 77,
      firstBreath: "It has been just three years since I met Nicholas Graydon in the little Andean village of Chupan, high on the eastern slopes of the Peruvian uplands. I had stopped there to renew my supplies, expecting to stay not more than a day or two. But after my *arrieros* had unlimbered my luggage from the two burros, and I entered the unusually clean and commodious *posada*, its keeper told me that another North American was stopping there.",
      lastBreath: "And so I tell it, reconstructing it from his reticences as well as his confidences, since only so may a full measure of judgment of that story be gained.",
      firstScene: "Chapter I · Out of the haunted hills",
      lastScene: "Chapter IX · \"I am going back to her!\"",
      country: "Peru",
      place: "Chupan",
      region: "pe",
      note: /strangling attack/,
      quotes: "straight",
    },
    "mary-magdalen": {
      gutenberg: 31510,
      year: 1891,
      author: "Edgar Saltus",
      breaths: 746,
      scenes: 10,
      shelfMinutes: 177,
      minutes: 8,
      openBreaths: 23,
      openAt: 0,
      firstWords: 5,
      firstBreath: "“Three to one on Scarlet!”",
      lastBreath: "“Dear God,” he muttered, in answer to an anterior thought, “it would be the birthday of my life.”",
      firstScene: "Chapter I",
      lastScene: "Chapter X",
      country: "",
      place: null,
      region: null,
      note: /John the Baptist is beheaded/,
      quotes: "curly",
    },
    "the-hoop": {
      gutenberg: 48452,
      year: 1916,
      author: "Fyodor Sologub (tr. John Cournos)",
      breaths: 44,
      scenes: 1,
      shelfMinutes: 7,
      minutes: 7,
      openBreaths: 44,
      openAt: 0,
      firstWords: 93,
      firstBreath: "A woman was taking her morning stroll in a lonely suburban street; a boy of four was with her. She was young and smart and she was smiling brightly; she was casting affectionate glances at her son, whose red cheeks beamed with happiness. The boy was bowling a hoop; a large, new, bright yellow hoop. He ran after his hoop awkwardly, laughed uproariously with joy, thrust forward his plump little legs, bare at the knee, and flourished his stick. He needn’t have raised his stick so high above his head—but what of that?",
      lastBreath: "His memories soothed him. He, too, had been a child; he, too, had laughed and scampered across the green grass, among the dark trees—his beloved mother had followed him with her eyes.",
      firstScene: "The Hoop",
      lastScene: "The Hoop",
      country: "Russia",
      place: "Russia",
      region: "ru",
      note: /dies at the end, peacefully/,
      quotes: "curly",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.ok(want.minutes <= 10, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.equal(countryFor(work), want.country, id);
    if (want.place === null) {
      assert.equal(placeFor(work), null, id);
    } else {
      assert.equal(placeFor(work)?.label, want.place, id);
      assert.equal(placeFor(work)?.region, want.region, id);
    }
    assert.doesNotMatch(placeFor(work)?.label ?? "", /England/, id);
    assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
    assert.match(work.intro ?? "", want.note, id);
    assert.doesNotMatch(work.intro ?? "", /PG reading-ease/, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.equal(opened.breaths[0]?.text, want.firstBreath, id);
    assert.equal(opened.breaths.at(-1)?.text, want.lastBreath, id);
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
      assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false, id);
    }
    if (want.openAt > 0) assert.equal(full.scenes[0]?.front, true, id);
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
      assert.ok(breath.text.trim().split(/\s+/).length <= 350, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (want.quotes === "straight") {
      assert.equal(/[“”]/.test(fullJoined), false, id);
    } else {
      assert.equal(fullJoined.includes('"'), false, id);
      assert.equal(/[“”]/.test(fullJoined), true, id);
    }
  }

  const read = (id: string) => JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const face = read("the-face-in-the-abyss");
  assert.equal(face.scenes.some((scene) => scene.front), false);
  assert.equal(face.scenes[0]?.title, "Chapter I · Out of the haunted hills");
  assert.equal(face.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  assert.equal(face.breaths.some((breath) => /ARGOSY|Argosy|this office/.test(breath.text)), false);
  assert.equal(face.breaths.some((breath) => /[.,;:]\*(?![A-Za-z*])/.test(breath.text)), false);
  const mary = read("mary-magdalen");
  assert.equal(mary.breaths.some((breath) => /^[IVXL]+\.$/.test(breath.text)), false);
  assert.equal(mary.breaths.some((breath) => /FINIS|Finis/.test(breath.text)), false);
  assert.equal(countryFor(SHELF.find((item) => item.id === "mary-magdalen")!), "");
  const hoop = read(ritualOnly);
  assert.equal(hoop.scenes.length, 1);
  assert.equal(hoop.breaths.filter((breath) => isSectionBreak(breath.text)).length, 6);
  assert.equal(hoop.breaths.some((breath) => /^[IVX]+$/.test(breath.text)), false);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(hoop.breaths.reduce((n, breath) => n + (isSectionBreak(breath.text) ? 0 : breath.text.trim().split(/\s+/).length), 0) / 200));
});

test("Mira POST-#227 CLEAR is Next lead Love's Shadow, then Lewis and Irene, with A Monkey on Rituals only", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["love-s-shadow", "lewis-and-irene"] as const;
  const prior = ["garram-the-hunter", "the-face-in-the-abyss", "mary-magdalen"] as const;
  const ritualOnly = "a-monkey";

  assert.deepEqual(next.slice(-12, -10), [...tail]);
  assert.deepEqual(next.slice(-15, -12), [...prior]);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(SHELF.filter((item) => item.gutenberg === 14593).length, 1);   // Old Dances (same volume) is not used
  assert.equal(SHELF.filter((item) => item.author.startsWith("Alexander Kielland")).length, 3);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
  }
  assert.equal(curatorialTrack(ritualOnly), "later");
  for (const id of [...tail, ritualOnly]) {
    assert.equal(featured.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  assert.deepEqual(unwind?.workIds.slice(-4, -2), ["love-s-shadow", "a-monkey"]);
  assert.deepEqual(walk?.workIds.slice(-3, -2), ["the-corsican-brothers"]);
  for (const lane of RITUAL_LANES) {
    for (const id of [...tail, ritualOnly]) {
      assert.equal(lane.workIds.includes(id), id !== "lewis-and-irene" && lane.id === "unwind", `${lane.id} ${id}`);
    }
  }

  const opens = {
    "love-s-shadow": {
      gutenberg: 9786,
      year: 1908,
      author: "Ada Leverson",
      breaths: 2157,
      scenes: 40,
      shelfMinutes: 277,
      minutes: 8,
      openBreaths: 57,
      openAt: 2,
      firstWords: 20,
      firstBreath: "'There's only one thing I must really implore you, Edith,' said Bruce anxiously. '*Don't* make me late at the office!'",
      lastBreath: "Hyacinth laughed, kissed her, and went out. Anne followed her graceful figure with disapproving, admiring eyes.",
      firstScene: "Epigraph",
      lastScene: "Chapter XXXIX · The Solution",
      country: "United Kingdom",
      place: "Knightsbridge, London",
      region: "gb",
      note: /no deaths on the page/,
      quotes: "straight",
    },
    "lewis-and-irene": {
      gutenberg: 71047,
      year: 1925,
      author: "Paul Morand (tr. Vyvyan Beresford Holland)",
      breaths: 680,
      scenes: 44,
      shelfMinutes: 162,
      minutes: 7,
      openBreaths: 29,
      openAt: 0,
      firstWords: 3,
      firstBreath: "\"Fifteen,\" said Lewis.",
      lastBreath: "In one year Lewis trebled his business interests and succeeded in getting hold of the controlling number of shares. Where before everything was done clandestinely (Lewis could almost hear Monsieur Vandémanque's: \"good wine needs no bush\"), all business was now conducted in the full glare of publicity; whereas before only one telephone line connected the Rue Scribe with the Bourse, now there were eighteen lines devoted solely to foreign exchange dealing. Lewis was now managing the Franco-African Bank and its affiliated companies practically without control, the Ætas Assurance Company, which was expanding enormously since its new re-insurance contract with Lloyds, and the Fidius Research Corporation (chemical products, commercial rubber, phosphates, oxygen).",
      firstScene: "Part I · Chapter I",
      lastScene: "Part III · Chapter XVIII",
      country: "France",
      place: "Paris",
      region: "fr",
      note: /dies of shock/,
      quotes: "straight",
    },
    "a-monkey": {
      gutenberg: 14593,
      year: 1896,
      author: "Alexander Kielland (tr. R. L. Cassie)",
      breaths: 48,
      scenes: 1,
      shelfMinutes: 9,
      minutes: 9,
      openBreaths: 48,
      openAt: 0,
      firstWords: 31,
      firstBreath: "Yes, it was really a monkey that had nearly procured me 'Laudabilis' in my final law examination. As it was, I only got 'Haud'; but, after all, this was pretty creditable.",
      lastBreath: "'A monkey!' I replied.",
      firstScene: "A Monkey",
      lastScene: "A Monkey",
      country: "Norway",
      place: "Christiania",
      region: "no",
      note: /no hazards/,
      quotes: "straight",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], want.minutes, id);
    assert.ok(want.minutes <= 10, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.equal(countryFor(work), want.country, id);
    if (want.place === null) {
      assert.equal(placeFor(work), null, id);
    } else {
      assert.equal(placeFor(work)?.label, want.place, id);
      assert.equal(placeFor(work)?.region, want.region, id);
    }
    assert.doesNotMatch(placeFor(work)?.label ?? "", /England/, id);
    assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
    assert.match(work.intro ?? "", want.note, id);
    assert.doesNotMatch(work.intro ?? "", /PG reading-ease/, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.equal(opened.breaths[0]?.text, want.firstBreath, id);
    assert.equal(opened.breaths.at(-1)?.text, want.lastBreath, id);
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
      assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false, id);
    }
    if (want.openAt > 0) assert.equal(full.scenes[0]?.front, true, id);
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
      assert.ok(breath.text.trim().split(/\s+/).length <= 350, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    if (want.quotes === "straight") {
      assert.equal(/[“”]/.test(fullJoined), false, id);
    } else {
      assert.equal(fullJoined.includes('"'), false, id);
      assert.equal(/[“”]/.test(fullJoined), true, id);
    }
  }

  const read = (id: string) => JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const love = read("love-s-shadow");
  assert.equal(love.scenes[0]?.title, "Epigraph");
  assert.equal(love.scenes[0]?.front, true);
  assert.equal(love.scenes[1]?.title, "Chapter I · Hyacinth");
  assert.equal(love.scenes.length, 40);
  assert.equal(love.breaths.some((breath) => /OTTLEYS|\[Illustration|First Published/.test(breath.text)), false);
  assert.equal(love.breaths.some((breath) => /[‘’]/.test(breath.text)), false);
  const lewis = read("lewis-and-irene");
  assert.equal(lewis.scenes[0]?.title, "Part I · Chapter I");
  assert.equal(lewis.scenes.at(-1)?.title, "Part III · Chapter XVIII");
  assert.equal(lewis.breaths[0]?.text, '"Fifteen," said Lewis.');
  const lewisJoined = lewis.breaths.map((breath) => breath.text).join("\n");
  assert.deepEqual(lewisJoined.match(/\bsalon\b/gi), ["salon", "Salon"]);
  assert.equal(lewis.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  assert.equal(lewis.breaths.some((breath) => /^PART /.test(breath.text)), false);
  const monkey = read(ritualOnly);
  assert.equal(monkey.scenes.length, 1);
  assert.equal(monkey.scenes[0]?.title, "A Monkey");
  assert.equal(monkey.breaths.filter((breath) => isSectionBreak(breath.text)).length, 1);
  assert.deepEqual(monkey.breaths.filter((breath) => breath.text.startsWith("Note: ")).map((breath) => breath.text), ["Note: A second-class pass.", "Note: A third-class pass.", "Note: A principal street of Christiania.", "Note: Dan. v. 25."]);
  assert.equal(monkey.breaths.some((breath) => breath.text.includes("[Footnote")), false);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(monkey.breaths.reduce((n, breath) => n + (isSectionBreak(breath.text) ? 0 : breath.text.trim().split(/\s+/).length), 0) / 200));
});

test("Mira POST-#228 CLEAR is Next carefully lead The Counterfeiters, after Lewis and Irene", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const tail = ["the-counterfeiters"] as const;
  const prior = ["mary-magdalen", "love-s-shadow", "lewis-and-irene"] as const;

  assert.deepEqual(next.slice(-10, -9), [...tail]);
  assert.deepEqual(next.slice(-13, -10), [...prior]);
  assert.deepEqual(SHELF.filter((item) => item.author.startsWith("André Gide")).map((item) => item.id).sort(), ["strait-is-the-gate", "the-counterfeiters", "the-immoralist"]);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(forYou?.workIds.includes(id), false, id);
    assert.equal(waking?.workIds.includes(id), false, id);
    assert.equal(sleep?.workIds.includes(id), false, id);
  }
  assert.deepEqual(unwind?.workIds.slice(-3, -2), ["a-monkey"]);
  assert.deepEqual(walk?.workIds.slice(-3, -2), ["the-corsican-brothers"]);
  for (const lane of RITUAL_LANES) {
    for (const id of tail) {
      assert.equal(lane.workIds.includes(id), false, `${lane.id} ${id}`);
    }
  }

  const opens = {
    "the-counterfeiters": {
      gutenberg: 76965,
      year: 1927,
      author: "André Gide (tr. Dorothy Bussy)",
      breaths: 2666,
      scenes: 46,
      shelfMinutes: 596,
      minutes: 10,
      openBreaths: 42,
      openAt: 2,
      firstWords: 141,
      firstBreath: "“The time has now come for me to hear a step in the passage,” said Bernard to himself. He raised his head and listened. Nothing! His father and elder brother were away at the law-courts; his mother paying visits; his sister at a concert; as for his small brother Caloub—the youngest—he was safely shut up for the whole afternoon in his day-school. Bernard Profitendieu had stayed at home to cram for his “*bachot*”; he had only three more weeks before him. His family respected his solitude—not so the demon! Although Bernard had stripped off his coat, he was stifling. The window that looked on to the street stood open, but it let in nothing but heat. His forehead was streaming. A drop of perspiration came dripping from his nose and fell on to the letter he was holding in his hand.",
      lastBreath: "“No, no! No statues, no statues!” said Olivier absent-mindedly; and then, seeing the other’s disappointed face: “Well, old fellow, if you bring it off, it’ll be splendid!” he exclaimed warmly.",
      firstScene: "Dedication",
      lastScene: "Part III · Chapter XX · Edouard’s Journal",
      country: "France",
      place: "Luxembourg Gardens, Paris",
      region: "fr",
      note: /shoots himself in class with a pistol his classmates loaded as a dare/,
      quotes: "curly",
    },
  } as const;

  for (const [id, want] of Object.entries(opens)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work.local, true, id);
    assert.equal(work.year, want.year, id);
    assert.equal(work.author, want.author, id);
    assert.equal(work.gutenberg, want.gutenberg, id);
    assert.equal(work.breaths, want.breaths, id);
    assert.equal(work.minutes, want.shelfMinutes, id);
    assert.equal(RITUAL_SIT_MINUTES[id], undefined, id);
    assert.ok(want.minutes <= 10, id);
    assert.equal(SHELF.filter((item) => item.gutenberg === want.gutenberg).length, 1, id);
    assert.equal(countryFor(work), want.country, id);
    assert.equal(placeFor(work)?.label, want.place, id);
    assert.equal(placeFor(work)?.region, want.region, id);
    assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
    assert.match(work.intro ?? "", want.note, id);
    const headsUp =
      "A heads-up before you start: later in the novel, a schoolboy shoots himself in class with a pistol his classmates loaded as a dare. Two other characters attempt suicide, one woman is presumed drowned, a girl dies of illness, and a shipwreck story describes people drowning. Adult men pursue adolescent boys, there is adultery, and the book has period slurs and a journal passage that generalizes about Catholics, Jews and Protestants. All of it is left as printed. The first sitting contains none of the deaths or slurs.";
    assert.equal(blurbFor(id), headsUp, id);
    assert.ok((work.intro ?? "").includes(headsUp), id);
    assert.ok(
      readerIntro({
        id,
        title: work.title,
        author: work.author,
        year: String(work.year ?? ""),
        note: work.intro ?? "",
        minutes: work.minutes,
        cover: "",
        coverAlt: "",
        scenes: [],
        breaths: [],
      }).includes(headsUp),
      id,
    );
    assert.doesNotMatch(work.intro ?? "", /PG reading-ease/, id);
    const opened = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { id?: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as Work;
    assert.equal(full.year, String(want.year), id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.scenes[0]?.title, want.firstScene, id);
    assert.equal(full.scenes.at(-1)?.title, want.lastScene, id);
    assert.equal(new Set(full.scenes.map((scene) => scene.title)).size, want.scenes, id);
    assert.equal(openingBreathIndex(full), want.openAt, id);
    assert.equal(full.scenes[0]?.front, true, id);
    assert.equal(opened.scenes[0]?.id, "sit-0", id);
    assert.equal(opened.scenes.length, 1, id);
    assert.equal(opened.breaths.length, want.openBreaths, id);
    assert.equal(opened.breaths[0]?.text, want.firstBreath, id);
    assert.equal(opened.breaths.at(-1)?.text, want.lastBreath, id);
    assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, want.firstWords, id);
    for (let i = 0; i < opened.breaths.length; i += 1) {
      assert.equal(opened.breaths[i]?.text, full.breaths[want.openAt + i]?.text, `${id} open ${i}`);
      assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false, id);
    }
    assert.equal(Math.round(opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0) / 200), want.minutes, id);
    for (const breath of full.breaths) {
      assert.equal(breath.text.includes("\n"), false, id);
      assert.equal(breath.text.includes("--"), false, id);
      assert.equal(/_[A-Za-z]/.test(breath.text), false, id);
      assert.ok(breath.text.trim().split(/\s+/).length <= 350, id);
    }
    const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
    assert.equal(fullJoined.includes('"'), false, id);
    assert.equal(/[“”]/.test(fullJoined), true, id);
  }

  const read = (id: string) => JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const book = read("the-counterfeiters");
  assert.equal(book.scenes[0]?.title, "Dedication");
  assert.deepEqual(book.breaths.filter((breath) => breath.sceneId === book.scenes[0]?.id).map((breath) => breath.text), ["I dedicate this, my first novel, to Roger Martin du Gard in token of profound friendship", "A. G."]);
  assert.equal(book.scenes[1]?.title, "Part I · Chapter I · The Luxembourg Gardens");
  assert.equal(book.scenes.find((scene) => scene.title.startsWith("Part II · Chapter I ·"))?.title, "Part II · Chapter I · From Bernard to Olivier");
  assert.equal(book.scenes.find((scene) => scene.title.startsWith("Part III · Chapter I ·"))?.title, "Part III · Chapter I · Edouard’s Journal: Oscar Molinier");
  assert.equal(book.scenes.length, 46);
  assert.equal(book.scenes.filter((scene) => /^Part [IVX]+ · Chapter [IVXL]+ · \S/.test(scene.title)).length, 45);
  assert.equal(book.scenes.filter((scene) => scene.title.endsWith(" · Edouard’s Journal")).length, 1);
  assert.equal(book.breaths.filter((breath) => isSectionBreak(breath.text)).length, 2);
  assert.deepEqual(book.breaths.filter((breath) => breath.text.startsWith("Note: ")).map((breath) => breath.text), ["Note: Schoolboy’s slang for the *baccalauréat* examination.", "Note: In English in the original.", "Note: Robert here makes a pun impossible to translate. *Dessalé* (literally *unsalted*) is a slang expression meaning something like *unscrupulous*. —Translator’s note.", "Note: The state records of each individual citizen, in which are noted the legal facts of his existence.", "Note: *De toutes les passions, celle qui est la plus inconnue à nous-mêmes, c’est la paresse; elle est la plus ardente et la plus maligne de toutes, quoique sa violence soit insensible et que les dommages qu’elle cause soient très-cachés.... Le repos de la paresse est un charme secret de l’âme qui suspend soudainement les plus ardentes poursuites et les plus opiniâtres résolutions. Pour donner enfin la véritable idée de cette passion, il faut dire que la paresse est comme une béatitude de l’âme, qui la console de toutes ses pertes et qui lui tient lieu de tous ses biens*. La Rochefoucauld.", "Note: *Es-tu vase funèbre attendant quelques pleurs?*", "Note: In English in the original."]);
  assert.equal(book.breaths[2]?.text.startsWith("“The time has now come"), true);
  assert.equal(book.breaths[2 + 1]?.text, "Note: Schoolboy’s slang for the *baccalauréat* examination.");
  assert.equal(book.breaths.some((breath) => /FOOTNOTES|\[Footnote|\[\d+\]|Other books|KNOPF|GALLIMARD|CONTENTS|Elzevir/.test(breath.text)), false);
  assert.equal(book.breaths.some((breath) => /^(FIRST|SECOND|THIRD) PART/.test(breath.text)), false);
});

test("Thérèse sits on Next carefully immediately after The Counterfeiters", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const tail = ["therese"] as const;
  assert.deepEqual(next.slice(-9, -8), [...tail]);
  assert.deepEqual(next.slice(-10, -9), ["the-counterfeiters"]);
  assert.deepEqual(FEATURED_CAROUSEL_IDS, [
    "enchanted-april",
    "the-bridge-of-san-luis-rey",
    "mr-fortunes-maggot",
    "the-house-of-mirth",
    "quicksand",
  ]);
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Mauriac")).map((item) => item.id), ["therese"]);
  assert.equal(SHELF.some((item) => item.gutenberg === 79006), false);
  for (const id of tail) {
    assert.equal(next.indexOf(id), next.lastIndexOf(id), id);
    assert.equal(curatorialTrack(id), "next", id);
    assert.equal(featured.includes(id), false, id);
    assert.equal(RITUAL_SIT_MINUTES[id], undefined, id);
  }
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes("therese"), false, lane.id);
  }

  const work = SHELF.find((item) => item.id === "therese");
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.year, 1928);
  assert.equal(work.author, "François Mauriac (tr. Eric Sutton)");
  assert.equal(work.gutenberg, 73670);
  assert.equal(work.breaths, 480);
  assert.equal(work.minutes, 183);
  assert.equal(work.opening, "The lawyer opened a door.");
  assert.equal(countryFor(work), "France");
  assert.equal(placeFor(work)?.label, "Argelouse");
  assert.equal(placeFor(work)?.region, "fr");
  assert.equal(SHELF.filter((item) => item.gutenberg === 73670).length, 1);
  const headsUp = "A heads-up before you start: Thérèse has been tried for trying to poison her husband with arsenic, and the novel goes back over how she did it. Her family talks with open antisemitism and makes generalizations about race, she thinks about suicide, an aunt dies, a mother dies in childbirth, and Thérèse is shut away in the house until she wastes away. All of it is left as printed. The first sitting covers only her acquittal.";
  assert.equal(blurbFor("therese"), headsUp);
  assert.ok((work.intro ?? "").includes(headsUp));
  assert.doesNotMatch(work.intro ?? "", /PG reading-ease/);
  assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/);
  assert.ok(
    readerIntro({
      id: "therese",
      title: work.title,
      author: work.author,
      year: String(work.year ?? ""),
      note: work.intro ?? "",
      minutes: work.minutes,
      cover: "",
      coverAlt: "",
      scenes: [],
      breaths: [],
    }).includes(headsUp),
  );

  const opened = JSON.parse(readFileSync(new URL("./openings/therese.json", import.meta.url), "utf8")) as {
    scenes: { id?: string }[];
    breaths: { text: string }[];
  };
  const full = JSON.parse(readFileSync(new URL("./texts/therese.json", import.meta.url), "utf8")) as Work;
  assert.equal(full.year, "1928");
  assert.equal(full.breaths.length, 480);
  assert.equal(full.scenes.length, 14);
  assert.equal(full.scenes[0]?.title, "Epigraph and preface");
  assert.equal(full.scenes[0]?.front, true);
  assert.equal(full.scenes.at(-1)?.title, "Chapter XIII");
  assert.deepEqual(full.scenes.slice(1).map((scene) => scene.title), ["Chapter I", "Chapter II", "Chapter III", "Chapter IV", "Chapter V", "Chapter VI", "Chapter VII", "Chapter VIII", "Chapter IX", "Chapter X", "Chapter XI", "Chapter XII", "Chapter XIII"]);
  assert.equal(openingBreathIndex(full), 9);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.scenes[0]?.id, "sit-0");
  assert.equal(opened.breaths.length, 23);
  assert.equal(opened.breaths[0]?.text, "The lawyer opened a door. Thérèse Desqueyroux, as she stood in that remote corridor of the law-courts, felt the fog upon her face and inhaled it deeply. She was afraid some one might be waiting for her, and hesitated to go out. A man with his coat collar turned up appeared from the shadow of a plane tree, and she recognised her father.");
  assert.equal(opened.breaths.at(-1)?.text, "They had walked on again by this time, and Thérèse did not hear Duros’ answer. She inhaled the damp night air once more as though she were afraid of choking; and suddenly there came before her mind the unknown face of her maternal grandmother Julie Bellade: it was indeed unknown, for neither the Larroque nor the Desqueyroux families possessed a single likeness of her, and nothing was known about her except that she had one day disappeared. Thérèse realised that she too might have been wiped out of existence, and later on not even her little daughter Marie would have been allowed to find in an album the likeness of one who had brought her into the world. At that moment Marie was already asleep in a room at Argelouse, where Thérèse would arrive late that evening: she would listen in the darkness to the murmur of that childish slumber; she would lean over the bed and her lips would drink in the sweetness of that sleeping life like a draught of clear water.");
  assert.equal(opened.breaths[0]?.text.trim().split(/\s+/).length, 63);
  for (let i = 0; i < opened.breaths.length; i += 1) {
    assert.equal(opened.breaths[i]?.text, full.breaths[9 + i]?.text, `therese open ${i}`);
    assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false);
  }
  assert.equal(Math.round(opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0) / 200), 5);
  assert.deepEqual(full.breaths.filter((breath) => breath.sceneId === full.scenes[0]?.id).map((breath) => breath.text), ["Lord have pity, O have pity on those who know not what they do. O Creator of the world, can there be any in whom the image of humanity is destroyed, even in the eyes of Him, who alone knows why they exist, HOW THEY HAVE MADE THEMSELVES WHAT THEY ARE, and how they could have made themselves otherwise.", "Charles Baudelaire.", "*I shall be told, Thérèse, that you do not exist, but I know you do, for I have been watching you for years, and I have often stopped you and unmasked you as you passed me by*.", "*When I was young, I remember seeing your little white thin-lipped face, as you stood in a stifling Assize Court, at the mercy of lawyers not half so pitiless as the fine ladies who had come to see your agony*.", "*Later on, I found you in the drawing-room of a country house, looking drawn and pale, bored by the attentions of your aged parents and your simple-minded husband. “But what can be the matter with her?” said they: “she has everything she can possibly want.”*", "*Since then, I have so often admired you as you passed that strong hand of yours so wearily across your firm broad brow. I have so often seen you prowling, like a wild animal, back and forwards behind the living bars of the family in which you are imprisoned, watching me with your evil melancholy eyes*.", "*Many will be surprised that I have been able to conceive a creature yet more odious than all my other heroines. Why, they ask, do I never write about good kind people in whose hearts there is no secret? Alas! where there is no secret there is no story; and I know the secrets of those hearts that are tainted with the clay that covers them*.", "*I could have wished, Thérèse, that sorrow should bring you to God; and I have long wanted you to be worthy of the name of Saint Locusta. But many, though they believe in the downfall and redemption of our poor tormented souls, would have cried “Sacrilege.”*", "*I can only hope that on that street where I bid you farewell you are not alone*."]);
  assert.equal(full.breaths[0]?.text.includes("HOW THEY HAVE MADE THEMSELVES WHAT THEY ARE"), true);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 29);
  assert.equal(full.breaths.filter((breath) => breath.sceneId === "s1" && isSectionBreak(breath.text)).length, 0);
  assert.equal(full.breaths.some((breath) => /BONI|LIVERIGHT|COPYRIGHT|THE END|Transcriber/.test(breath.text)), false);
  const preface = full.breaths[2]?.text ?? "";
  assert.equal(/_[A-Za-z]/.test(preface), false);
  assert.equal(preface.endsWith("*."), true);
  assert.deepEqual(splitEmphasis(preface), [
    { type: "em", value: preface.slice(1, -2) },
    { type: "text", value: "." },
  ]);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const fullJoined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(fullJoined.includes('"'), false);
  assert.equal(/[“”]/.test(fullJoined), true);
});

test("Mira POST-v3 Ritual: Wedding-Day is a Host-only unwind story, after A Monkey, never Featured, no Next, no place", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const ritualOnly = "wedding-day";
  assert.deepEqual(unwind?.workIds.slice(-3, -1), ["a-monkey", ritualOnly]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(ritualOnly), lane.id === "unwind", lane.id);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(featured.includes(ritualOnly), false);
  assert.equal(curatorialTrack(ritualOnly), "later");
  const work = SHELF.find((item) => item.id === ritualOnly);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Wedding-Day");
  assert.equal(work.author, "Gerald Bullett");
  assert.equal(work.year, 1923);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 74101);
  assert.equal(work.breaths, 20);
  assert.equal(work.minutes, 6);
  assert.equal(SHELF.filter((item) => item.gutenberg === 74101).length, 1);
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Bullett")).map((item) => item.id), [ritualOnly]);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], 6);
  assert.match(RITUAL_PITCHES[ritualOnly] ?? "", /This reading is just “Wedding-Day”/);
  assert.match(work.intro ?? "", /A heads-up before you start: no hazards/);
  assert.doesNotMatch(work.intro ?? "", /PG reading-ease 75\.0 is for the whole volume/);
  assert.doesNotMatch(`${work.intro ?? ""}\n${RITUAL_PITCHES[ritualOnly] ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|England|London/);
  assert.equal(countryFor(work), "");
  assert.equal(placeFor(work), null);
  const card =
    "On his wedding morning Bert cuts off his moustache while the cab waits, just to feel free.";
  assert.equal(card.includes("!"), false);
  assert.equal(/heads-up/i.test(card), false);
  assert.equal(blurbFor(work), card);
  assert.equal(PITCHES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(STORED_PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  const full = JSON.parse(readFileSync(new URL(`./texts/${ritualOnly}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${ritualOnly}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 1);
  assert.equal(full.scenes[0]?.title, "Wedding-Day");
  assert.equal(full.scenes[0]?.front, undefined);
  assert.equal(openingBreathIndex(full), 0);
  assert.equal(full.breaths.length, 20);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 0);
  assert.equal(full.breaths[0]?.text.startsWith("Wedding-day. It was curiously unreal."), true);
  assert.equal(full.breaths.at(-1)?.text.endsWith("The forty years began."), true);
  assert.equal(opened.scenes.length, 1);
  assert.deepEqual(opened.breaths.map((breath) => breath.text), full.breaths.map((breath) => breath.text));
  const words = full.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1233);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(words / 200));
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(joined.includes('"'), false);
  assert.equal(/[‘’]/.test(joined), true);
  assert.equal(/--|_[A-Za-z]|\n/.test(full.breaths.map((breath) => breath.text).join(" ")), false);
  for (const breath of full.breaths) assert.ok(breath.text.trim().split(/\s+/).length <= 350);
});

test("Mira mid Rituals: Elysium is a Host-only before-sleep story, after The Fur Coat, never Featured, no Next, Pall Mall", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const ritualOnly = "elysium";
  assert.deepEqual(sleep?.workIds.slice(-4, -2), ["the-fur-coat", ritualOnly]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(ritualOnly), lane.id === "before-sleep", lane.id);
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(featured.includes(ritualOnly), false);
  assert.equal(curatorialTrack(ritualOnly), "later");
  const work = SHELF.find((item) => item.id === ritualOnly);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Elysium");
  assert.equal(work.author, "R. B. Cunninghame Graham");
  assert.equal(work.year, 1916);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 47930);
  assert.equal(work.breaths, 9);
  assert.equal(work.minutes, 5);
  assert.equal(SHELF.filter((item) => item.gutenberg === 47930).length, 1);
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Cunninghame")).map((item) => item.id), [ritualOnly]);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], 5);
  assert.match(RITUAL_PITCHES[ritualOnly] ?? "", /This reading is just “Elysium”/);
  const headsUp = "A heads-up before you start: the First World War sits just behind this story. The soldier is home from the front in Flanders on five days' leave.";
  assert.equal(blurbFor(work), headsUp);
  assert.ok((work.intro ?? "").includes(headsUp));
  assert.ok((RITUAL_PITCHES[ritualOnly] ?? "").includes(headsUp));
  assert.equal(PITCHES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(STORED_PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.doesNotMatch(`${work.intro ?? ""}\n${RITUAL_PITCHES[ritualOnly] ?? ""}\n${blurbFor(work)}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|finery|trench|goes back/i);
  assert.equal(countryFor(work), "United Kingdom");
  assert.deepEqual(placeFor(work), { label: "Pall Mall, London", region: "gb" });
  const full = JSON.parse(readFileSync(new URL(`./texts/${ritualOnly}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${ritualOnly}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 1);
  assert.equal(full.scenes[0]?.title, "Elysium");
  assert.equal(full.scenes[0]?.front, undefined);
  assert.equal(openingBreathIndex(full), 0);
  assert.equal(full.breaths.length, 9);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 0);
  assert.equal(full.breaths[0]?.text.startsWith("The Triad came into my life"), true);
  assert.equal(full.breaths.at(-1)?.text.endsWith("and theirs led straight to Elysium, for five long days."), true);
  assert.equal(opened.scenes.length, 1);
  assert.deepEqual(opened.breaths.map((breath) => breath.text), full.breaths.map((breath) => breath.text));
  const words = full.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1037);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(words / 200));
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/["']/.test(joined), false);
  assert.equal(/[“”]/.test(joined), true);
  for (const kept of ["’eroes", "you remember ’im.", "’ee done his bit", "’Old it the right side up", "Athenæum", "a building or a monument—taking it", "St. James’s Square", "Pall Mall"]) assert.ok(joined.includes(kept), kept);
  assert.equal(/THE |Athenaeum|  |--|_[A-Za-z]|\n/.test(full.breaths.map((breath) => breath.text).join(" ")), false);
  for (const breath of full.breaths) assert.ok(breath.text.trim().split(/\s+/).length <= 350);
});

test("Mira Sun 4 Oct PM: Maximina sits on Next carefully immediately after Thérèse, never Featured, off every Ritual lane, Pasajes", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "maximina";
  assert.deepEqual(next.slice(-11, -7), ["lewis-and-irene", "the-counterfeiters", "therese", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(id), false, laneId);
  }
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => item.author.startsWith("Armando Palacio Valdés")).map((item) => item.id).sort(), ["maximina", "the-joy-of-captain-ribot"]);
  assert.equal(SHELF.some((item) => /riverita/i.test(`${item.id} ${item.title}`)), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Maximina");
  assert.equal(work.author, "Armando Palacio Valdés (trans. Nathan Haskell Dole)");
  assert.equal(work.year, 1888);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 33244);
  assert.equal(work.breaths, 3423);
  assert.equal(work.minutes, 571);
  assert.equal(SHELF.filter((item) => item.gutenberg === 33244).length, 1);
  assert.equal(countryFor(work), "Spain");
  assert.deepEqual(placeFor(work), { label: "Pasajes", region: "es" });
  assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/);
  for (const key of ["heads-up", "gives birth", "forces his attentions", "razor to her own throat", "revolvers are drawn", "shoots himself in the head", "Maximina dies of a fever", "grief and religious despair", "death from measles", "period slur", "generalization about women", "left as printed"]) assert.ok((work.intro ?? "").includes(key), key);
  const shelfHeadsUp = "A heads-up before you start: later chapters include a suicide, an attempted assault, and a death from fever.";
  assert.ok((work.intro ?? "").includes(shelfHeadsUp));
  assert.ok(
    readerIntro({
      id,
      title: work.title,
      author: work.author,
      year: String(work.year ?? ""),
      note: work.intro ?? "",
      minutes: work.minutes,
      cover: "",
      coverAlt: "",
      scenes: [],
      breaths: [],
    }).includes(shelfHeadsUp),
  );
  const card =
    "A heads-up before you start: later in the novel, a man forces his attentions on Maximina and she holds a razor to her own throat to make him leave. A young man shoots himself in the head and dies, blind, twelve days later. Maximina gives birth, and near the end she dies of a fever. A child's death from measles is recalled, revolvers are drawn, and the word gypsy appears twice as a period slur. All of it is left as printed. The first sitting covers only the homecoming and the engagement party in Pasajes.";
  assert.equal(blurbFor(work), card);
  assert.equal(card.includes("!"), false);
  assert.doesNotMatch(work.intro ?? "", /PG reading-ease 78\.1 is for the whole book/);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1888");
  assert.equal(full.breaths.length, 3423);
  assert.deepEqual(full.scenes.map((scene) => scene.title), ["Chapter I", "Chapter II", "Chapter III", "Chapter IV", "Chapter V", "Chapter VI", "Chapter VII", "Chapter VIII", "Chapter IX", "Chapter X", "Chapter XI", "Chapter XII", "Chapter XIII", "Chapter XIV", "Chapter XV", "Chapter XVI", "Chapter XVII", "Chapter XVIII", "Chapter XIX", "Chapter XX", "Chapter XXI", "Chapter XXII", "Chapter XXIII", "Chapter XXIV", "Chapter XXV", "Chapter XXVI", "Chapter XXVII", "Chapter XXVIII", "Chapter XXIX", "Chapter XXX", "Chapter XXXI"]);
  assert.equal(full.scenes.some((scene) => scene.front), false);
  assert.equal(openingBreathIndex(full), 0);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 59);
  assert.equal(opened.breaths[0]?.text.startsWith("Miguel reached Pasajes late Friday afternoon."), true);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("discoursing long and learnedly on the seriousness of this tie."), true);
  for (let i = 0; i < opened.breaths.length; i += 1) {
    assert.equal(opened.breaths[i]?.text, full.breaths[i]?.text, `open ${i}`);
    assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false);
  }
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1762);
  assert.equal(Math.round(words / 200), 9);
  assert.ok(Math.round(words / 200) <= 10);
  assert.deepEqual(opened.breaths.filter((breath) => breath.text.startsWith("Note: ")).map((breath) => breath.text), ["Note: Foolish maiden.", "Note: She says *Usted esta* instead of *tu estas*."]);
  assert.deepEqual(full.breaths.filter((breath) => breath.text.startsWith("Note: ")).map((breath) => breath.text), ["Note: Foolish maiden.", "Note: She says *Usted esta* instead of *tu estas*.", "Note: Galicia is the northwestern province of Spain.", "Note: Using *Usted*, contraction for *Vuestra merced*; literally, your grace.", "Note: Brigadier-General Rivera's widow, Miguel's step-mother.", "Note: *El buen Retiro*, a public park and drive in Madrid, formerly the pleasure ground of the Spanish kings.", "Note: *El reservado del Suizo*.", "Note: Lady-killers, literally, drivers of cattle.", "Note: *Hasta manana*, literally, till morning.", "Note: Dollars: *pesos duros* or *pesos fuertos* is the full expression. It contains twenty *reales*.", "Note: Twenty-five dollars.", "Note: Equivalent to Mr. Such-an-one.", "Note: Sweetmeats made of flour, sugar, and rose-water.", "Note: Academia de Estado Mayor.", "Note: *De tre manera lo se esi... percurador, porcurador, precurador*.", "Note: Almost corresponding to our vulgar \"son of a gun.\"", "Note: *Pasacalle*; song with guitar accompaniment sung on the street.", "Note: *Bonita*, *graciosa*, *elegante*, *encantadora*.", "Note: *Tertulia*.", "Note: All Madrid apartments have a small opening, called *ventanilla*, in the entrance door.", "Note: A word similar in meaning to our \"sympathetic,\" but not quite synonymous; more akin to \"congenial.\"", "Note: Lucia Poblacion, *la generala* of \"Riverita,\" was the lady to whom Miguel, when a young man, had been quite too attentive.", "Note: *Guindillas*, red peppers.", "Note: *Novillada*, bull-driving.", "Note: Bull-fighter who uses a long knife.", "Note: Little Manuela.", "Note: *Cabayero for caballero*.", "Note: *Onza de oro*, $16.", "Note: *Seo morral*; *seo*, vulgar for senor.", "Note: Senorito de *bomba*.", "Note: A native of Biscay; a Basque.", "Note: *Santander*, known to the sailors as St. Andrew's, is a seaport on the Bay of Biscay; *astillero* means, originally, a shipyard.", "Note: Diminutive of Ana (Anna).", "Note: From *cerveceria*, a tavern or alehouse.", "Note: Carlos II., *el Hechizado*, reigned over Spain 1665-1700.", "Note: Literally, Enamels and Cameos.", "Note: The central square in Madrid.", "Note: *Rota de la Nunciatura Apostolica*, a supreme ecclesiastical court of last appeal in Spain, composed of judges nominated by the king and confirmed by the Pope.", "Note: *Ayuntamiento*, municipal council in Spanish towns.", "Note: *Diputacion provincial*, district assembly.", "Note: Spanish nickname for an old man.", "Note: A kind of pulse much affected by the Spanish.", "Note: *Chiquirritin*, affectionate diminutive of *chiquetin*, little one.", "Note: Civil magistrates, judges or mayors.", "Note: *Ea, ea, ea*, / *iQue gallina tan fea!* / *iComo se sube al palo!* / *iComo se balancea!*", "Note: *Lyones*, in Spanish.", "Note: In Spanish, *rena*, a big rock; a slang expression.", "Note: A Spanish weight of twenty-five pounds.", "Note: *Perro nuevo y perro viejo, / Nunca han hecho buen trebejo*. Literally: young dog and old dog never play together well.", "Note: \"Barley Square,\" formerly famous for its executions.", "Note: The *ayuntamiento*; consisting of *alcalde*, or mayor, and the *regidores*, or aldermen.", "Note: The collective name of the town or district authorities.", "Note: $175.00.", "Note: In Spain the *estanquillos*, where snuff and tobacco are sold, are under special government license.", "Note: A skin dressed and lined with pitch, made for carrying wine.", "Note: *Prima instancia*.", "Note: The Madrid Ateneo or Athenaeum, the literary headquarters of Spain.", "Note: *Majadero*.", "Note: The Guipuzcoana, native of the province of Guipuzcoa.", "Note: *Falua*.", "Note: *Casa de socorro*.", "Note: $300.00."]);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 0);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]|\[\d+\]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/[“”‘’]/.test(joined), false);
  assert.equal(/Doña|señorito|Señor/.test(joined), false);
  assert.ok(joined.includes("Dona Rosalia") && joined.includes("senorito"));
  assert.ok(joined.includes("JULIA / (Bujia Extrafina)."));
  assert.equal(/CROWELL|COPYRIGHT|FOOTNOTES|END OF THE NOVEL|PENALTA|Gutenberg/.test(joined), false);
  assert.equal(full.breaths.at(-1)?.text, "\"That is true,\" replied the secretary, raising his handkerchief to his eyes.");
});

test("Mira Mon 5 Oct POST-#238: Love Among the Chickens is plain Next after Maximina, never Featured, off every Ritual lane, London", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "love-among-the-chickens";
  assert.deepEqual(next.slice(-10, -6), ["the-counterfeiters", "therese", "maximina", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Wodehouse")).map((item) => item.id), [id]);
  assert.equal(SHELF.some((item) => /ukridge|chickens/i.test(`${item.id} ${item.title}`) && item.id !== id), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Love Among the Chickens");
  assert.equal(work.author, "P. G. Wodehouse");
  assert.equal(work.year, 1920);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 3829);
  assert.equal(work.breaths, 1614);
  assert.equal(work.minutes, 251);
  assert.equal(SHELF.filter((item) => item.gutenberg === 3829).length, 1);
  assert.equal(countryFor(work), "United Kingdom");
  assert.deepEqual(placeFor(work), { label: "London", region: "gb" });
  assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/);
  assert.doesNotMatch(work.intro ?? "", /PG reading-ease 84\.6 is for the whole book/);
  assert.doesNotMatch(work.intro ?? "", /the year is|front of the book/);
  assert.ok((work.intro ?? "").endsWith("This is the 1920 version, which Wodehouse’s dedication says was practically re-written from the 1906 book. Twenty-three chapters."));
  const card =
    "Ukridge drops in on Garnet's London lodgings with that powerful voice, and Garnet knows his quiet morning is over.";
  assert.equal(card.includes("!"), false);
  assert.equal(/heads-up/i.test(card), false);
  assert.equal(blurbFor(work), card);
  assert.equal(PITCHES[id], work.intro);
  assert.equal(PREFACES[id], work.intro);
  assert.equal(STORED_PREFACES[id], work.intro);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1920");
  assert.equal(full.breaths.length, 1614);
  assert.deepEqual(full.scenes.map((scene) => scene.title), ["Dedication", "Chapter I · A Letter with a Postscript", "Chapter II · Mr. and Mrs. S. F. Ukridge", "Chapter III · Waterloo Station, Some Fellow-Travellers, and a Girl with Brown Hair", "Chapter IV · The Arrival", "Chapter V · Buckling to", "Chapter VI · Mr. Garnet's Narrative—Has to Do with a Reunion", "Chapter VII · The Entente Cordiale Is Sealed", "Chapter VIII · A Little Dinner At Ukridge's", "Chapter IX · Dies Irae", "Chapter X · I Enlist the Services of a Minion", "Chapter XI · The Brave Preserver", "Chapter XII · Some Emotions and Yellow Lupin", "Chapter XIII · Tea and Tennis", "Chapter XIV · A Council of War", "Chapter XV · The Arrival of Nemesis", "Chapter XVI · A Chance Meeting", "Chapter XVII · Of a Sentimental Nature", "Chapter XVIII · Ukridge Gives Me Advice", "Chapter XIX · Asking Papa", "Chapter XX · Scientific Golf", "Chapter XXI · The Calm Before the Storm", "Chapter XXII · The Storm Breaks", "Chapter XXIII · After the Storm"]);
  assert.equal(full.scenes[0]?.front, true);
  assert.equal(full.scenes[0]?.title, "Dedication");
  assert.equal(openingBreathIndex(full), 7);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 33);
  assert.equal(opened.breaths[0]?.text.startsWith('"A gentleman called to see you when you were out last night, sir," said'), true);
  assert.equal(opened.breaths.at(-1)?.text, "Stanley Featherstonehaugh Ukridge was in my midst.");
  for (let i = 0; i < opened.breaths.length; i += 1) {
    assert.equal(opened.breaths[i]?.text, full.breaths[openingBreathIndex(full) + i]?.text, `open ${i}`);
    assert.equal(/heads-up/i.test(opened.breaths[i]?.text ?? ""), false);
  }
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1044);
  assert.equal(Math.round(words / 200), 5);
  assert.ok(Math.round(words / 200) <= 10);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 12);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/[“”‘’]/.test(joined), false);
  assert.ok(joined.includes("\"Garnet! Where are you, laddie? Garnet!! GARNET!!!!!\""));
  assert.equal(/CONTENTS|Gutenberg|Produced by|THE END|Al Haines/.test(joined), false);
  assert.equal(full.breaths.at(-1)?.text, "\"A duck farm, laddie! And run it without water. My theory is, you see, that ducks get thin by taking exercise and swimming about all over the place, so that, if you kept them always on land, they'd get jolly fat in about half the time—and no trouble and expense. See? What? Not a flaw in it, old horse! I've thought the whole thing out.\" He took my arm affectionately. \"Now, listen. We'll say that the profits of the first year at a conservative estimate...\"");
});

test("Mira Mon 5 Oct mid Ritual: The Fresco is a Host-only before-sleep story, after Elysium, never Featured, no Next, Pekin", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const ritualOnly = "the-fresco";
  assert.deepEqual(sleep?.workIds.slice(-3, -1), ["elysium", ritualOnly]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(ritualOnly), lane.id === "before-sleep", lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(ritualOnly), laneId === "before-sleep", laneId);
  }
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(featured.includes(ritualOnly), false);
  assert.equal(curatorialTrack(ritualOnly), "later");
  const work = SHELF.find((item) => item.id === ritualOnly);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "The Fresco");
  assert.equal(work.author, "Pu Songling (trans. G. Soulié de Morant)");
  assert.equal(work.year, 1913);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 37766);
  assert.equal(work.breaths, 38);
  assert.equal(work.minutes, 5);
  assert.equal(SHELF.filter((item) => item.gutenberg === 37766).length, 1);
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Pu Songling")).map((item) => item.id).sort(), ["strange-tales", "the-fresco", "the-taoist-priest-of-lao-shan"].sort());
  assert.equal(SHELF.some((item) => /souli|lodge of leisures|fresco/i.test(`${item.id} ${item.title} ${item.author}`) && item.id !== ritualOnly), false);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], 5);
  assert.match(RITUAL_PITCHES[ritualOnly] ?? "", /This reading is just “The Fresco”/);
  assert.equal(/heads-up/i.test(RITUAL_PITCHES[ritualOnly] ?? ""), false);
  assert.equal(blurbFor(work), "Two students lose themselves in Pekin's lanes, enter a temple, and one follows a goddess who steps out of a fresco.");
  assert.equal(/heads-up/i.test(blurbFor(work)), false);
  assert.ok((work.intro ?? "").includes("This reading is just “The Fresco”"));
  assert.equal(PITCHES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(STORED_PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.doesNotMatch(`${work.intro ?? ""}\n${RITUAL_PITCHES[ritualOnly] ?? ""}\n${blurbFor(work)}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/);
  assert.equal(countryFor(work), "China");
  assert.deepEqual(placeFor(work), { label: "Pekin", region: "cn" });
  const full = JSON.parse(readFileSync(new URL(`./texts/${ritualOnly}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${ritualOnly}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 1);
  assert.equal(full.scenes[0]?.title, "The Fresco");
  assert.equal(full.scenes[0]?.front, undefined);
  assert.equal(openingBreathIndex(full), 0);
  assert.equal(full.breaths.length, 38);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 0);
  assert.equal(full.breaths[0]?.text.startsWith("In the Great Highway of Eternal Fixity,"), true);
  assert.equal(full.breaths.at(-1)?.text.endsWith('waiting for you in your village."'), true);
  assert.equal(opened.scenes.length, 1);
  assert.deepEqual(opened.breaths.map((breath) => breath.text), full.breaths.map((breath) => breath.text));
  const words = full.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1046);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(words / 200));
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/[“”‘’]/.test(joined), false);
  assert.equal(/--|_[A-Za-z]|\n/.test(full.breaths.map((breath) => breath.text).join(" ")), false);
  assert.ok(joined.includes("Pekin"));
  assert.equal(/DWARF HUNTERS|Gutenberg|HOUGHTON|PREFACE|LODGE OF LEISURES/.test(joined), false);
  for (const breath of full.breaths) assert.ok(breath.text.trim().split(/\s+/).length <= 350);
});

test("Mira Mon 5 Oct PM Ritual: The Taoist Priest of Lao-shan is a Host-only unwind story, after Wedding-Day, never Featured, no Next, Lao-shan", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const ritualOnly = "the-taoist-priest-of-lao-shan";
  assert.deepEqual(unwind?.workIds.slice(-2), ["wedding-day", ritualOnly]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(ritualOnly), lane.id === "unwind", lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(ritualOnly), laneId === "unwind", laneId);
  }
  assert.equal(next.includes(ritualOnly), false);
  assert.equal(featured.includes(ritualOnly), false);
  assert.equal(curatorialTrack(ritualOnly), "later");
  const work = SHELF.find((item) => item.id === ritualOnly);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "The Taoist Priest of Lao-shan");
  assert.equal(work.author, "Pu Songling (trans. Herbert A. Giles)");
  assert.equal(work.year, 1880);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 43627);
  assert.equal(work.breaths, 11);
  assert.equal(work.minutes, 6);
  assert.equal(SHELF.filter((item) => item.gutenberg === 43627).length, 1);
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Pu Songling")).map((item) => item.id).sort(), ["strange-tales", "the-fresco", ritualOnly].sort());
  assert.equal(SHELF.some((item) => item.gutenberg === 43629 && item.id !== "strange-tales"), false);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], 6);
  assert.match(RITUAL_PITCHES[ritualOnly] ?? "", /This reading is just “The Taoist Priest of Lao-shan”/);
  assert.equal(/heads-up/i.test(RITUAL_PITCHES[ritualOnly] ?? ""), false);
  assert.equal(blurbFor(work), "Wang learns to walk through walls at Lao-shan, brags at home, and finishes in a heap on the floor.");
  assert.equal(/heads-up/i.test(blurbFor(work)), false);
  assert.ok((work.intro ?? "").includes("This reading is just “The Taoist Priest of Lao-shan”"));
  assert.equal(PITCHES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.equal(STORED_PREFACES[ritualOnly], RITUAL_PITCHES[ritualOnly]);
  assert.doesNotMatch(`${work.intro ?? ""}\n${RITUAL_PITCHES[ritualOnly] ?? ""}\n${blurbFor(work)}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/);
  assert.equal(countryFor(work), "China");
  assert.deepEqual(placeFor(work), { label: "Lao-shan", region: "cn" });
  const full = JSON.parse(readFileSync(new URL(`./texts/${ritualOnly}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${ritualOnly}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 1);
  assert.equal(full.scenes[0]?.title, "The Taoist Priest of Lao-shan");
  assert.equal(full.scenes[0]?.front, undefined);
  assert.equal(openingBreathIndex(full), 0);
  assert.equal(full.breaths.length, 11);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 0);
  assert.equal(full.breaths[0]?.text.startsWith("There lived in our village a Mr. Wang,"), true);
  assert.equal(full.breaths.at(-1)?.text.endsWith("base ingratitude."), true);
  assert.equal(full.breaths.filter((breath) => breath.text.startsWith("Note:")).length, 3);
  assert.equal(opened.scenes.length, 1);
  assert.deepEqual(opened.breaths.map((breath) => breath.text), full.breaths.map((breath) => breath.text));
  const words = full.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1293);
  assert.equal(RITUAL_SIT_MINUTES[ritualOnly], Math.round(words / 200));
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.ok(/[“”]/.test(joined));
  assert.equal(/--|_[A-Za-z]|\n/.test(full.breaths.map((breath) => breath.text).join(" ")), false);
  assert.ok(joined.includes("Lao-shan"));
  assert.equal(/FOOTNOTES|BUDDHIST PRIEST|Gutenberg|DE LA RUE|CHINESE STUDIO/.test(joined), false);
  for (const breath of full.breaths) assert.ok(breath.text.trim().split(/\s+/).length <= 350);
});

test("Mira Tue 6 Oct AM: Muslin is plain Next after Love Among the Chickens, never Featured, off every Ritual lane, Galway", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "muslin";
  assert.deepEqual(next.slice(-8, -5), ["maximina", "love-among-the-chickens", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => item.author === "George Moore").map((item) => item.id), ["esther-waters", id]);
  assert.equal(SHELF.filter((item) => item.gutenberg === 14659).length, 1);
  assert.equal(SHELF.some((item) => /muslin/i.test(`${item.id} ${item.title}`) && item.id !== id), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Muslin");
  assert.equal(work.author, "George Moore");
  assert.equal(work.year, 1915);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 14659);
  assert.equal(work.breaths, 1892);
  assert.equal(work.minutes, 491);
  assert.equal(countryFor(work), "Ireland");
  assert.deepEqual(placeFor(work), { label: "Galway", region: "ie" });
  assert.doesNotMatch(`${work.intro ?? ""}\n${work.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bsit\b/);
  assert.doesNotMatch(work.intro ?? "", /the year is|this text follows/);
  assert.ok((work.intro ?? "").endsWith("The novel first appeared in 1886 as A Drama in Muslin; this is Moore’s 1915 version. Twenty-nine chapters."));
  const card = "Prize day at a hilltop convent: clever, plain Alice and her lovely sister Olive are about to leave school for the ballrooms of Galway.";
  assert.equal(card.includes("!"), false);
  assert.equal(blurbFor(work), card);
  assert.equal(PITCHES[id], work.intro);
  assert.equal(PREFACES[id], work.intro);
  assert.equal(STORED_PREFACES[id], work.intro);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { id?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1915");
  assert.equal(full.breaths.length, 1892);
  assert.equal(full.scenes.length, 30);
  assert.equal(full.scenes[0]?.title, "Preface");
  assert.equal(full.scenes[0]?.front, true);
  assert.deepEqual(full.scenes.slice(1).map((scene) => scene.title).slice(0, 3), ["Chapter I", "Chapter II", "Chapter III"]);
  assert.equal(full.scenes.at(-1)?.title, "Chapter XXIX");
  const at = openingBreathIndex(full);
  assert.equal(full.breaths[at]?.text.startsWith(work.opening ?? "\u0000"), true);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 27);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(full.breaths[at + opened.breaths.length]?.text.startsWith("It was a large room with six windows"), true);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("until the bell was rung for the children to assemble in the school-hall."), true);
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1530);
  assert.equal(Math.round(words / 200), 8);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/Gutenberg|Produced by|Proofread|THE END|eBook|PREFACE/.test(joined), false);
  assert.equal(full.breaths.at(-1)?.text, "'Well, dear, I hope you have come to live with us, or at any rate to pay us a long visit.'");
});

test("Mira Tue 6 Oct: The Golden Age is Next carefully after muslin, on-a-walk only (Alarums and Excursions), never Featured, England", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const id = "the-golden-age";
  assert.deepEqual(next.slice(-6, -4), ["muslin", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  assert.deepEqual(walk?.workIds.slice(-3, -1), ["the-corsican-brothers", id]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), lane.id === "on-a-walk", lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(id), laneId === "on-a-walk", laneId);
  }
  assert.deepEqual(SHELF.filter((item) => item.author.includes("Grahame")).map((item) => item.id), [id]);
  assert.equal(SHELF.filter((item) => item.gutenberg === 291).length, 1);
  assert.equal(SHELF.some((item) => /golden age|alarums/i.test(`${item.id} ${item.title}`) && item.id !== id), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "The Golden Age");
  assert.equal(work.author, "Kenneth Grahame");
  assert.equal(work.year, 1895);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 291);
  assert.equal(work.breaths, 498);
  assert.equal(work.minutes, 179);
  assert.equal(countryFor(work), "United Kingdom");
  assert.deepEqual(placeFor(work), { label: "England", region: "gb" });
  assert.equal(RITUAL_SIT_MINUTES[id], 9);
  assert.match(RITUAL_PITCHES[id] ?? "", /^“Alarums and Excursions” is one complete story from The Golden Age — /);
  assert.equal(work.intro, RITUAL_PITCHES[id]);
  assert.equal(PITCHES[id], RITUAL_PITCHES[id]);
  assert.equal(PREFACES[id], RITUAL_PITCHES[id]);
  assert.equal(STORED_PREFACES[id], RITUAL_PITCHES[id]);
  assert.doesNotMatch(work.intro ?? "", /the year is|One story; the book continues/);
  assert.ok((work.intro ?? "").endsWith("Bright and comic, made for walking. An English village and the fields beyond it."));
  const card = "A heads-up before you start: one boy's war talk repeats a period stereotype about Indians, and later stories play at Indians; it's left as printed. Two boys trail a troop of soldiers through the village, sure a battle is coming, and get lost in the rain until the old doctor drives them home.";
  assert.ok(readFileSync(new URL("./blurbs.ts", import.meta.url), "utf8").includes("\"A heads-up before you start: one boy's war talk repeats a period stereotype about Indians, and later stories play at Indians; it's left as printed. Two boys trail a troop of soldiers through the village, sure a battle is coming, and get lost in the rain until the old doctor drives them home.\""));
  assert.equal(blurbFor(work), card);
  assert.match(blurbFor(work), /^A heads-up before you start: .*Indians.*\. Two boys trail a troop of soldiers .*drives them home\.$/);
  assert.doesNotMatch(`${work.intro ?? ""}\n${card}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\b(?:sit|sits|sitting|reading|readings)\b|\bskip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { id?: string; title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1895");
  assert.equal(full.breaths.length, 498);
  assert.deepEqual(full.scenes.map((scene) => scene.title), ["Epigraph", "Alarums and Excursions", "Prologue: The Olympians", "A Holiday", "A White-Washed Uncle", "The Finding of the Princess", "Sawdust and Sin", "“Young Adam Cupid”", "The Burglars", "A Harvesting", "Snowbound", "What They Talked About", "The Argonauts", "The Roman Road", "The Secret Drawer", "“Exit Tyrannus”", "The Blue Room", "A Falling Out", "“Lusisti Satis”"]);
  assert.equal(full.scenes[0]?.front, true);
  assert.equal(full.scenes.filter((scene) => scene.front).length, 1);
  const at = openingBreathIndex(full);
  assert.equal(full.breaths[at]?.sceneId, "s3");
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.scenes[0]?.title, "Alarums and Excursions");
  assert.equal(opened.breaths.length, 39);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(full.breaths[at + opened.breaths.length]?.sceneId, "s0");
  assert.equal(full.breaths[at + opened.breaths.length]?.text.startsWith("Looking back to those days of old"), true);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("to the fact that the battle had been postponed."), true);
  assert.ok(opened.breaths.some((breath) => breath.text.includes("they scalp you first")));
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1865);
  assert.equal(RITUAL_SIT_MINUTES[id], Math.round(words / 200));
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/Gutenberg|Produced by|Contents:|eBook|THE GOLDEN AGE|PROLOGUE/.test(joined), false);
  assert.equal(full.breaths.at(-1)?.text, "And perhaps we have reason to be very grateful that, both as children and long afterwards, we are never allowed to guess how the absorbing pursuit of the moment will appear, not only to others, but to ourselves, a very short time hence. So we pass, with a gusto and a heartiness that to an onlooker would seem almost pathetic, from one droll devotion to another misshapen passion; and who shall care to play Rhadamanthus, to appraise the record, and to decide how much of it is solid achievement, and how much the merest child's play?");
});

test("Mira Tue 6 Oct MID: The Spoilt Child is Next carefully after the-golden-age, never Featured, off every Ritual lane, Vaidyabati", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "the-spoilt-child";
  assert.deepEqual(next.slice(-5, -3), ["the-golden-age", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => /Mitra|Mitter/i.test(item.author)).map((item) => item.id), [id]);
  assert.equal(SHELF.filter((item) => item.gutenberg === 69173).length, 1);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "The Spoilt Child");
  assert.equal(work.author, "Peary Chand Mitra (tr. G. D. Oswell)");
  assert.equal(work.year, 1893);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 69173);
  assert.equal(work.breaths, 684);
  assert.equal(work.minutes, 368);
  assert.equal(countryFor(work), "India");
  assert.deepEqual(placeFor(work), { label: "Vaidyabati", region: "in" });
  const card = "A heads-up before you start: the opening chapter shows a spoilt boy scratching and biting his tutors, throwing live charcoal, and setting a Persian teacher's beard alight while calling him \"Mussulman\"; characters mock a Brahman tutor, and the father repeats the slight just after this chapter. Later chapters carry more period slights against Muslims, Kulin marriage customs, a second marriage, and the father's death on the page. All of it is left as printed.";
  assert.equal(blurbFor(work), card);
  assert.match(blurbFor(work), /^A heads-up before you start:/);
  assert.equal(PITCHES[id], work.intro);
  assert.equal(PREFACES[id], work.intro);
  assert.equal(STORED_PREFACES[id], work.intro);
  assert.doesNotMatch(work.intro ?? "", /the year is|Thacker/);
  assert.ok((work.intro ?? "").endsWith("All of it is left as printed. The Bengali original, Alaler Gharer Dulal, first appeared in book form in 1858. Thirty chapters."));
  assert.doesNotMatch(`${work.intro ?? ""}\n${card}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bsit\b|\bSkip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1893");
  assert.equal(full.breaths.length, 684);
  assert.equal(full.scenes[0]?.front, true);
  assert.equal(full.scenes.filter((scene) => scene.front).length, 2);
  assert.equal(full.scenes[2]?.title.startsWith("Chapter I"), true);
  const at = openingBreathIndex(full);
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 9);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("*Tauba! Tauba!*\""), true);
  assert.ok(opened.breaths.some((breath) => breath.text.includes("Mussulman")));
  assert.equal(opened.breaths.every((breath) => !/\[\d+\]/.test(breath.text)), true);
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1961);
  assert.equal(Math.round(words / 200), 10);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
});

test("Mira Tue 6 Oct MID: Winnie-the-Pooh is waking-up only (Chapter II), never Featured, no Next, the forest", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const id = "winnie-the-pooh";
  assert.deepEqual(waking?.workIds.slice(-2), ["nina-balatka", id]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), lane.id === "waking-up", lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep", "waking-up"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(id), laneId === "waking-up", laneId);
  }
  assert.equal(next.includes(id), false);
  assert.equal(featured.includes(id), false);
  assert.equal(curatorialTrack(id), "later");
  assert.deepEqual(SHELF.filter((item) => item.author === "A. A. Milne").map((item) => item.id), [id]);
  assert.equal(SHELF.filter((item) => item.gutenberg === 67098).length, 1);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Winnie-the-Pooh");
  assert.equal(work.author, "A. A. Milne");
  assert.equal(work.year, 1926);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 67098);
  assert.equal(work.breaths, 1068);
  assert.equal(work.minutes, 112);
  assert.equal(countryFor(work), "United Kingdom");
  assert.deepEqual(placeFor(work), { label: "the forest", region: "gb" });
  assert.equal(RITUAL_SIT_MINUTES[id], 7);
  assert.match(RITUAL_PITCHES[id] ?? "", /Pooh Goes Visiting/);
  assert.equal(work.intro, RITUAL_PITCHES[id]);
  assert.equal(PITCHES[id], RITUAL_PITCHES[id]);
  assert.equal(PREFACES[id], RITUAL_PITCHES[id]);
  assert.equal(STORED_PREFACES[id], RITUAL_PITCHES[id]);
  assert.equal(blurbFor(work), "Fresh from his morning exercises and a brand-new hum, Pooh drops in on Rabbit for a little something, and eats just a little too much to leave.");
  assert.doesNotMatch(`${work.intro ?? ""}\n${blurbFor(work)}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bsit\b|\bSkip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1926");
  assert.deepEqual(full.scenes.map((scene) => scene.title), ["Dedication", "Introduction", "Chapter II. In Which Pooh Goes Visiting and Gets into a Tight Place", "Chapter I. In Which We Are Introduced to Winnie-the-Pooh and Some Bees, and the Stories Begin", "Chapter III. In Which Pooh and Piglet Go Hunting and Nearly Catch a Woozle", "Chapter IV. In Which Eeyore Loses a Tail and Pooh Finds One", "Chapter V. In Which Piglet Meets a Heffalump", "Chapter VI. In Which Eeyore Has a Birthday and Gets Two Presents", "Chapter VII. In Which Kanga and Baby Roo Come to the Forest, and Piglet Has a Bath", "Chapter VIII. In Which Christopher Robin Leads an Expotition to the North Pole", "Chapter IX. In Which Piglet Is Entirely Surrounded by Water", "Chapter X. In Which Christopher Robin Gives a Pooh Party, and We Say Good-Bye"]);
  assert.equal(full.scenes[0]?.front, true);
  assert.equal(full.scenes[1]?.front, true);
  assert.equal(full.scenes[2]?.title.startsWith("Chapter II"), true);
  const at = openingBreathIndex(full);
  assert.equal(full.breaths[at]?.sceneId, "s1");
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 79);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("Silly old Bear!\""), true);
  assert.ok(opened.breaths.some((breath) => breath.text.includes("Tra-la-la") && breath.text.includes(" / ")));
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1453);
  assert.equal(RITUAL_SIT_MINUTES[id], Math.round(words / 200));
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
});

test("Mira Tue 6 Oct PM: A Japanese Blossom is Next carefully after the-spoilt-child, never Featured, off every Ritual lane, Japan", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "a-japanese-blossom";
  assert.deepEqual(next.slice(-4, -2), ["the-spoilt-child", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => /Onoto Watanna|Winnifred Eaton/i.test(item.author)).map((item) => item.id).sort(), ["a-japanese-nightingale", id].sort());
  assert.equal(SHELF.filter((item) => item.gutenberg === 64924).length, 1);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "A Japanese Blossom");
  assert.equal(work.author, "Onoto Watanna (Winnifred Eaton)");
  assert.equal(work.year, 1906);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 64924);
  assert.equal(work.breaths, 1076);
  assert.equal(work.minutes, 159);
  assert.equal(countryFor(work), "Canada");
  assert.deepEqual(placeFor(work), { label: "Japan", region: "jp" });
  const card = "A heads-up before you start: in the opening chapter the eldest son calls the new American stepmother a \"barbarian\" and dreams she is a fox-woman; a pail of water is thrown in a crying child's face. Later chapters include a teasing \"Jappy Jap\" nursery rhyme, Russo-Japanese War material, and deaths on the page. All of it is left as printed.";
  assert.equal(blurbFor(work), card);
  assert.match(blurbFor(work), /^A heads-up before you start:/);
  assert.equal(PITCHES[id], work.intro);
  assert.equal(PREFACES[id], work.intro);
  assert.equal(STORED_PREFACES[id], work.intro);
  assert.doesNotMatch(work.intro ?? "", /the year is|Harper/);
  assert.ok((work.intro ?? "").endsWith("All of it is left as printed. Twenty-nine chapters."));
  assert.doesNotMatch(`${work.intro ?? ""}\n${card}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bsit\b|\bSkip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1906");
  assert.equal(full.breaths.length, 1076);
  assert.equal(full.scenes.length, 29);
  assert.equal(full.scenes[0]?.title, "Chapter I");
  const at = openingBreathIndex(full);
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 42);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("and soon he was to have it!"), true);
  assert.ok(opened.breaths.some((breath) => breath.text.includes("barbarian")));
  assert.ok(opened.breaths.some((breath) => breath.text.includes("fox-woman")));
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1602);
  assert.equal(Math.round(words / 200), 8);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
});

test("Mira Tue 6 Oct PM: The Mist is before-sleep only after the-fresco, never Featured, no Next, the glade", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const id = "the-mist";
  assert.deepEqual(sleep?.workIds.slice(-2), ["the-fresco", id]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), lane.id === "before-sleep", lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep", "waking-up"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(id), laneId === "before-sleep", laneId);
  }
  assert.equal(next.includes(id), false);
  assert.equal(featured.includes(id), false);
  assert.equal(curatorialTrack(id), "later");
  assert.deepEqual(SHELF.filter((item) => /Carl Ewald/i.test(item.author)).map((item) => item.id).sort(), ["the-old-room", id].sort());
  assert.equal(SHELF.filter((item) => item.gutenberg === 62910).length, 1);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "The Mist");
  assert.equal(work.author, "Carl Ewald (tr. Alexander Teixeira de Mattos)");
  assert.equal(work.year, 1907);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 62910);
  assert.equal(work.breaths, 50);
  assert.equal(work.minutes, 9);
  assert.equal(countryFor(work), "Denmark");
  assert.deepEqual(placeFor(work), { label: "the glade", region: "dk" });
  assert.equal(RITUAL_SIT_MINUTES[id], 9);
  assert.match(RITUAL_PITCHES[id] ?? "", /The Mist/);
  assert.equal(work.intro, RITUAL_PITCHES[id]);
  assert.equal(PITCHES[id], RITUAL_PITCHES[id]);
  assert.equal(PREFACES[id], RITUAL_PITCHES[id]);
  assert.equal(STORED_PREFACES[id], RITUAL_PITCHES[id]);
  assert.equal(blurbFor(work), "After sunset, mist rises over a quiet village meadow and tells a night-flower how he is dew, cloud, and spring-water in turn — until morning blows him away.");
  assert.doesNotMatch(`${work.intro ?? ""}\n${blurbFor(work)}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bSkip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1907");
  assert.equal(full.scenes.length, 1);
  assert.equal(full.breaths.length, 50);
  assert.equal(full.scenes[0]?.title, "The Mist");
  const at = openingBreathIndex(full);
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 50);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("And he laughed."), true);
  assert.ok(opened.breaths.some((breath) => breath.text.includes("glade")));
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1752);
  assert.equal(RITUAL_SIT_MINUTES[id], Math.round(words / 200));
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
});

test("Mira Wed 7 Oct AM: Fräulein Schmidt and Mr. Anstruther is plain Next after a-japanese-blossom, never Featured, off every Ritual lane, Jena", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "fraulein-schmidt-and-mr-anstruther";
  assert.deepEqual(next.slice(-3), ["a-japanese-blossom", "strait-is-the-gate", id]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => item.author === "Elizabeth von Arnim").map((item) => item.id).sort(), ["enchanted-april", "in-the-mountains", "vera", id].sort());
  assert.equal(SHELF.filter((item) => item.gutenberg === 35282).length, 1);
  assert.equal(SHELF.some((item) => /schmidt|anstruther/i.test(`${item.id} ${item.title}`) && item.id !== id), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Fräulein Schmidt and Mr. Anstruther");
  assert.equal(work.author, "Elizabeth von Arnim");
  assert.equal(work.year, 1907);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 35282);
  assert.equal(work.breaths, 1382);
  assert.equal(work.minutes, 431);
  assert.equal(countryFor(work), "Germany");
  assert.deepEqual(placeFor(work), { label: "Jena", region: "de" });
  const card = "An hour after the English student lodging with her family suddenly proposes, Rose-Marie sits in the unlit room in Jena and writes him the first of her letters before he has even reached London.";
  assert.equal(blurbFor(work), card);
  assert.doesNotMatch(card, /heads-up/i);
  assert.equal(PITCHES[id], work.intro);
  assert.equal(PREFACES[id], work.intro);
  assert.equal(STORED_PREFACES[id], work.intro);
  assert.doesNotMatch(work.intro ?? "", /the year is|title page|printed date|Quotes stay/);
  assert.ok((work.intro ?? "").endsWith("It was first published as by the author of “Elizabeth and Her German Garden.” The whole novel is told in Rose-Marie's letters, eighty-one of them, each under its date."));
  assert.match(work.intro ?? "", /told in Rose-Marie's letters/);
  assert.doesNotMatch(`${work.intro ?? ""}\n${card}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bsit\b|\bSkip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue|\blane\b|EN only|Next carefully/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { id?: string; title?: string; place?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1907");
  assert.equal(full.breaths.length, 1382);
  assert.equal(full.scenes.length, 81);
  assert.equal(full.scenes.some((scene) => scene.front === true), false);
  assert.deepEqual(full.scenes.slice(0, 3).map((scene) => scene.title), ["Letter I", "Letter II", "Letter III"]);
  assert.equal(full.scenes[0]?.place, "Jena, Nov. 6th.");
  assert.equal(full.scenes[24]?.title, "Letter XXV");
  assert.equal(full.scenes.at(-1)?.title, "Letter LXXXI");
  const at = openingBreathIndex(full);
  assert.equal(at, 0);
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.deepEqual(opened.scenes.map((scene) => scene.title), ["Letter I", "Letter II"]);
  assert.equal(opened.breaths.length, 18);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(full.breaths[at + opened.breaths.length]?.text.startsWith("Dear Roger,—I can't leave you alone, you see."), true);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("Thank God, say I, for mornings."), true);
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1650);
  assert.equal(Math.round(words / 200), 8);
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/Gutenberg|Produced by|THE END|eBook|SCRIBNER|ROSE-MARIE/.test(joined), false);
  assert.equal(full.breaths.at(-1)?.text, "I shall not write again.");
});

test("Mira Wed 7 Oct MID: The Dancing-Master is on-a-walk only after the-golden-age, never Featured, no Next, Paris", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");
  const id = "the-dancing-master";
  assert.deepEqual(walk?.workIds.slice(-2), ["the-golden-age", id]);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), lane.id === "on-a-walk", lane.id);
  for (const laneId of ["unwind", "on-a-walk", "before-sleep", "waking-up"]) {
    const lane = RITUAL_LANES.find((item) => item.id === laneId);
    assert.ok(lane, laneId);
    assert.equal(lane.workIds.includes(id), laneId === "on-a-walk", laneId);
  }
  assert.equal(next.includes(id), false);
  assert.equal(featured.includes(id), false);
  assert.equal(curatorialTrack(id), "later");
  assert.deepEqual(SHELF.filter((item) => /Halévy|Halevy/i.test(item.author)).map((item) => item.id), [id]);
  assert.equal(SHELF.filter((item) => item.gutenberg === 15465).length, 1);
  assert.equal(SHELF.some((item) => /dancing-master|parisian points/i.test(`${item.id} ${item.title}`) && item.id !== id), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "The Dancing-Master");
  assert.equal(work.author, "Ludovic Halévy (tr. Edith V.B. Matthews)");
  assert.equal(work.year, 1894);
  assert.equal(work.form, "stories");
  assert.equal(work.gutenberg, 15465);
  assert.equal(work.breaths, 39);
  assert.equal(work.minutes, 10);
  assert.equal(countryFor(work), "France");
  assert.deepEqual(placeFor(work), { label: "Paris", region: "fr" });
  assert.equal(RITUAL_SIT_MINUTES[id], 10);
  assert.match(RITUAL_PITCHES[id] ?? "", /^“The Dancing-Master” is one complete story from Parisian Points of View — /);
  assert.equal(work.intro, RITUAL_PITCHES[id]);
  assert.equal(PITCHES[id], RITUAL_PITCHES[id]);
  assert.equal(PREFACES[id], RITUAL_PITCHES[id]);
  assert.equal(STORED_PREFACES[id], RITUAL_PITCHES[id]);
  assert.doesNotMatch(work.intro ?? "", /the year is|copyright|stay in French|line by line/);
  assert.ok((work.intro ?? "").endsWith("while waltzing. Amused and brisk, for a walk. Paris."));
  assert.match(work.intro ?? "", /It ends “…withstood the shock of this avalanche of dancers\.”/);
  const card = "A heads-up before you start: frank period talk of sizing up a partner's figure. Backstage at the opera, a dancing-master dressed as a bishop explains why France needs more waltzing.";
  assert.equal(blurbFor(work), card);
  assert.match(blurbFor(work), /^A heads-up before you start: /);
  assert.doesNotMatch(`${work.intro ?? ""}\n${card}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\b(?:sit|sits|sitting|reading|readings)\b|\bskip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue|\blane\b|EN only|Next carefully/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1894");
  assert.equal(full.scenes.length, 1);
  assert.equal(full.scenes[0]?.title, "The Dancing-Master");
  assert.equal(full.breaths.length, 39);
  const at = openingBreathIndex(full);
  assert.equal(at, 0);
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.breaths.length, 39);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("withstood the shock of this avalanche of dancers."), true);
  assert.equal(full.breaths.at(-1)?.text, "She took my arm, and we went off together, while the excellent Morin, with gravity and dignity beneath his sacred ornaments, withstood the shock of this avalanche of dancers.");
  assert.ok(full.breaths.some((breath) => breath.text === "\"*Du sang! que Judas succombe!* / *Du sang! Dansons sur leur tombe!* / *Du sang! Voila l'hécatombe* / *Que Dieu nous demande encor!*\""));
  assert.ok(full.breaths.some((breath) => breath.text === "\"*Effleurer la glace* / *Sans laisser de trace.*\""));
  assert.ok(full.breaths.some((breath) => breath.text.includes("He is the little B——'s dancing-master.")));
  const gap = full.breaths.findIndex((breath) => breath.text.startsWith("We had arrived at this point in that interesting conversation"));
  assert.equal(full.breaths[gap - 1]?.text, "\"I know, I know.\"");
  assert.equal(full.breaths.some((breath) => isSectionBreak(breath.text)), false);
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1944);
  assert.equal(RITUAL_SIT_MINUTES[id], Math.round(words / 200));
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-z]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/Gutenberg|Produced by|eBook|THE DANCING-MASTER|THE CIRCUS CHARGER|After George had related/.test(joined), false);
});

test("Mira Wed 7 Oct PM: Strait Is the Gate is in Next just before Fräulein Schmidt (never first, never the tail), never Featured, off every Ritual lane, Fongueusemare", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const id = "strait-is-the-gate";
  assert.deepEqual(next.slice(-3), ["a-japanese-blossom", id, "fraulein-schmidt-and-mr-anstruther"]);
  assert.equal(next.indexOf(id), next.lastIndexOf(id));
  assert.notEqual(next[0], id);
  assert.equal(next.at(-1), "fraulein-schmidt-and-mr-anstruther");
  assert.equal(next.indexOf(id) + 1, next.indexOf("fraulein-schmidt-and-mr-anstruther"));
  assert.equal(curatorialTrack(id), "next");
  assert.equal(featured.includes(id), false);
  for (const lane of RITUAL_LANES) assert.equal(lane.workIds.includes(id), false, lane.id);
  assert.equal(RITUAL_SIT_MINUTES[id], undefined);
  assert.equal(RITUAL_PITCHES[id], undefined);
  assert.deepEqual(SHELF.filter((item) => item.author.startsWith("André Gide")).map((item) => item.id).sort(), ["the-counterfeiters", "the-immoralist", id].sort());
  assert.equal(SHELF.filter((item) => item.gutenberg === 79693).length, 1);
  assert.equal(SHELF.some((item) => /strait is the gate|porte [ée]troite/i.test(item.title) && item.id !== id), false);
  const work = SHELF.find((item) => item.id === id);
  assert.ok(work);
  assert.equal(work.local, true);
  assert.equal(work.title, "Strait Is the Gate");
  assert.equal(work.author, "André Gide (tr. Dorothy Bussy)");
  assert.equal(work.year, 1924);
  assert.equal(work.form, "novel");
  assert.equal(work.gutenberg, 79693);
  assert.equal(work.breaths, 967);
  assert.equal(work.minutes, 206);
  assert.equal(countryFor(work), "France");
  assert.deepEqual(placeFor(work), { label: "Fongueusemare", region: "fr" });
  const card = "A heads-up before you start: an aunt makes a sexual advance on the boy; her Martinique roots are told in period terms; family members die. He loves Alissa, who prefers holiness.";
  assert.equal(blurbFor(work), card);
  assert.match(blurbFor(work), /^A heads-up before you start: an aunt makes a sexual advance on the boy; /);
  assert.equal(PITCHES[id], work.intro);
  assert.equal(PREFACES[id], work.intro);
  assert.equal(STORED_PREFACES[id], work.intro);
  assert.doesNotMatch(work.intro ?? "", /the year is|title page|Quotes stay|breaks kept/);
  assert.ok((work.intro ?? "").endsWith("there are deaths in the family later in the book. Eight chapters, then Alissa’s journal."));
  assert.match(work.intro ?? "", /ending “…who afterwards became my friend\.”/);
  assert.doesNotMatch(`${work.intro ?? ""}\n${card}`, /\bFeatured(?:-track)?\b|\bFEATURED\b|\bsit\b|\bSkip\b|\bHost\b|Gutenberg|Vellum|Salon|Mira|Thea|pile|slate|queue|\blane\b|EN only|Next carefully/i);
  const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as Work;
  const opened = JSON.parse(readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8")) as { scenes: { id?: string; title?: string }[]; breaths: { text: string }[] };
  assert.equal(full.year, "1924");
  assert.equal(full.breaths.length, 967);
  assert.deepEqual(full.scenes.map((scene) => scene.title), ["Dedication", "Chapter I", "Chapter I, continued", "Chapter II", "Chapter III", "Chapter IV", "Chapter V", "Chapter VI", "Chapter VII", "Chapter VIII", "Alissa’s journal"]);
  assert.equal(full.scenes[0]?.front, true);
  assert.equal(full.scenes.filter((scene) => scene.front).length, 1);
  assert.equal(full.breaths[0]?.text, "To M. A. G.");
  const at = openingBreathIndex(full);
  assert.equal(at, 1);
  assert.equal(full.breaths[at]?.sceneId, "s0");
  assert.equal(full.breaths[at]?.text, work.opening);
  assert.equal(opened.scenes.length, 1);
  assert.equal(opened.scenes[0]?.title, "Chapter I");
  assert.equal(opened.breaths.length, 16);
  for (let i = 0; i < opened.breaths.length; i += 1) assert.equal(opened.breaths[i]?.text, full.breaths[at + i]?.text, `open ${i}`);
  assert.equal(opened.breaths.at(-1)?.text.endsWith("who afterwards became my friend."), true);
  assert.equal(full.breaths[at + opened.breaths.length]?.sceneId, "s1");
  assert.equal(full.breaths[at + opened.breaths.length]?.text.startsWith("Lucile Bucolin took very little share in our life;"), true);
  const words = opened.breaths.reduce((n, breath) => n + breath.text.trim().split(/\s+/).length, 0);
  assert.equal(words, 1736);
  assert.equal(Math.round(words / 200), 9);
  assert.equal(full.breaths.filter((breath) => breath.text === "* * * * *").length, 69);
  assert.equal(full.breaths.filter((breath) => isSectionBreak(breath.text)).length, 70);
  assert.ok(full.breaths.some((breath) => breath.text.startsWith("“‘That strain again,—it had a dying fall: / Oh, it came o’er my ear like the sweet south, / ")));
  assert.ok(full.breaths.some((breath) => breath.text === "‘*Le meilleur moment des amours / N’est pas quand on dit: je t’aime....*’"));
  for (const breath of full.breaths) {
    assert.equal(breath.text.includes("\n"), false);
    assert.equal(breath.text.includes("--"), false);
    assert.equal(/_[A-Za-zÀ-ÿ]/.test(breath.text), false);
    assert.ok(breath.text.trim().split(/\s+/).length <= 350);
  }
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(/Gutenberg|Produced by|eBook|ALISSA’S JOURNAL|TORONTO|PRINTED IN/.test(joined), false);
  assert.equal(full.breaths.at(-1)?.text, "A servant came in, bringing the lamp.");
});

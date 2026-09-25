import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import {
  ADAPTED_BY_SALON_IDS,
  curatorialTrack,
  isAdaptedBySalon,
  NEXT_FEATURED_TRACK_IDS,
} from "./curatorial.ts";
import { FIRST_SESSION_RITUAL_IDS, RITUAL_LANES, RITUAL_PITCHES, RITUAL_SIT_MINUTES } from "./rituals.ts";
import { SHELF } from "./shelf.ts";
import { blurbFor } from "./blurbs.ts";
import { STORED_PREFACES } from "./prefaces-stored.ts";
import { isBoundLocal, isEnReadableOff } from "./en-rights.ts";
import { splitEmphasis } from "../emphasized-text.ts";

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
    "our-lady-of-the-pillar",
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
  assert.equal(curatorialTrack("the-good-soldier"), "later");
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
  const stub = SHELF.find((item) => item.id === "immoralist");
  assert.ok(stub);
  assert.equal(stub.local, undefined);
  assert.equal(stub.language, "English");
  assert.equal(stub.gutenberg, 78975);
  assert.notEqual(stub.id, work.id);
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
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes("the-good-soldier"), false);
  assert.equal(FEATURED_CAROUSEL_IDS.includes("the-good-soldier"), false);
  assert.equal(curatorialTrack("the-good-soldier"), "later");
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
  assert.ok(lane!.workIds.indexOf("nada-the-lily") > lane!.workIds.indexOf("the-good-soldier"));
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
      breaths: 3259,
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
    "the-everlasting-mercy": { opening: "Produced by Al Haines.", breaths: 210, scenes: 1, gutenberg: 41467 },
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
    assert.ok(full.breaths[0]?.text.startsWith(want.opening.slice(0, 40)), id);
  }
});


test("BATCH-5 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-changed-man": { opening: "A Committee Man of 'The Terror' Master John Horseleigh, Knight The Duke's Reappearance A Mere Interlude", breaths: 1806, scenes: 11, gutenberg: 3058 },
    "ballads-of-a-bohemian": { opening: "Alas! upon some starry height, The Gods of Excellence to please, This hand of mine will never smite The Harp of High Ser", breaths: 732, scenes: 67, gutenberg: 995 },
    "ballads-of-a-cheechako": { opening: "My rhymes are rough, and often in my rhyming I've drifted, silver-sailed, on seas of dream, Hearing afar the bells of El", breaths: 301, scenes: 20, gutenberg: 259 },
    "crucial-instances": { opening: "Have you ever questioned the long shuttered front of an old Italian house, that motionless mask, smooth, mute, equivocal", breaths: 1090, scenes: 7, gutenberg: 7516 },
    "filipino-popular-tales": { opening: "Narrated by Macaria Garcia. The story is popular among the Pampangans.", breaths: 3055, scenes: 79, gutenberg: 8299 },
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
    "toilers-of-the-sea": { opening: "Christmas Day in the year 182- was somewhat remarkable in the island of Guernsey. Snow fell on that day. In the Channel ", breaths: 2319, scenes: 71, gutenberg: 32338 },
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
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening.slice(0, 40)), id);
  }
});

test("BATCH-8 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-house-of-gentlefolk": { opening: "A bright spring day was fading into evening. High overhead in the clear heavens small rosy clouds se", breaths: 1083, scenes: 45, gutenberg: 5721 },
    "artists-wives": { opening: "*Stretched at full length, on the great divan of a studio, cigar in mouth, two friends--a poet and a", breaths: 338, scenes: 13, gutenberg: 22522 },
    "blix": { opening: "It had just struck nine from the cuckoo clock that hung over the mantelpiece in the dining-room, whe", breaths: 1235, scenes: 14, gutenberg: 401 },
    "emaux-et-camees": { opening: "(1794-1894)", breaths: 675, scenes: 62, gutenberg: 37733 },
    "eves-ransom": { opening: "On the station platform at Dudley Port, in the dusk of a February afternoon, half-a-dozen people wai", breaths: 1862, scenes: 27, gutenberg: 4297 },
    "fraternity": { opening: "In the afternoon of the last day of April, 190--, a billowy sea of little broken clouds crowned the ", breaths: 2813, scenes: 41, gutenberg: 2773 },
    "hania": { opening: "When old Mikolai on his death-bed left Hania to my guardianship and conscience, I was sixteen years ", breaths: 3617, scenes: 9, gutenberg: 36583 },
    "indian-summer": { opening: "Midway of the Ponte Vecchio at Florence, where three arches break the lines of the little jewellers'", breaths: 2499, scenes: 24, gutenberg: 7359 },
    "les-heures-claires": { opening: "Tissée en or dans l'air de soie!", breaths: 122, scenes: 30, gutenberg: 10061 },
    "les-trophees": { opening: "À Leconte de L'Isle", breaths: 664, scenes: 81, gutenberg: 14805 },
    "numa-roumestan": { opening: "TO THE ARENA!", breaths: 1787, scenes: 20, gutenberg: 69808 },
    "royal-highness": { opening: "Artillery salvos were fired when the various new-fangled means of communication in the capital sprea", breaths: 1411, scenes: 9, gutenberg: 36028 },
    "the-emancipated": { opening: "By a window looking from Posillipo upon the Bay of Naples sat an English lady, engaged in letter-wri", breaths: 3897, scenes: 33, gutenberg: 4311 },
    "the-great-hunger": { opening: "For sheer havoc, there is no gale like a good northwester, when it roars in, through the long winter", breaths: 1756, scenes: 27, gutenberg: 2943 },
    "the-patrician": { opening: "Light, entering the vast room—a room so high that its carved ceiling refused itself to exact scrutin", breaths: 2176, scenes: 51, gutenberg: 2774 },
    "the-price-of-love": { opening: "In the evening dimness of old Mrs. Maldon's sitting-room stood the youthful virgin, Rachel Louisa Fl", breaths: 2475, scenes: 19, gutenberg: 12912 },
    "the-private-papers-of-henry-ryecroft": { opening: "I.", breaths: 534, scenes: 4, gutenberg: 1463 },
    "unhuman-tour-kusamakura": { opening: "Climbing the mountain, I was caught up into a train of thought.", breaths: 1013, scenes: 13, gutenberg: 73131 },
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
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening.slice(0, 40)), id);
  }
});

test("BATCH-9 CLEAR inventory binds are local Next / before-sleep sits, never Featured", () => {
  const expect = {
    "a-illustre-casa-de-ramires": { opening: "Desde as quatro horas da tarde, no calor e silencio do domingo de Junho, o Fidalgo da Torre, em chin", breaths: 2387, scenes: 12, gutenberg: 23145 },
    "an-iceland-fisherman": { opening: "There they were, five huge, square-built seamen, drinking away together in the dismal cabin, which r", breaths: 952, scenes: 53, gutenberg: 2196 },
    "aphrodite": { opening: "She lay upon her bosom, with her elbows in front of her, her legs wide apart and her cheek resting o", breaths: 1864, scenes: 35, gutenberg: 36378 },
    "azul": { opening: "¡Amigo! el cielo está opaco, el aire frío, el día triste. Un cuento alegre.., así como para distraer", breaths: 556, scenes: 38, gutenberg: 52894 },
    "contes-cruels": { opening: "«Le soldat prussien fait son café dans une lanterne sourde.»", breaths: 1882, scenes: 23, gutenberg: 62874 },
    "les-amours-jaunes": { opening: "Un poète ayant rimé, IMPRIMÉ Vit sa Muse dépourvue De marraine, et presque nue: Pas le plus petit mo", breaths: 1005, scenes: 107, gutenberg: 16883 },
    "libro-de-poemas": { opening: "Viento del Sur. Moreno, ardiente, Llegas sobre mi carne, Trayéndome semilla De brillantes Miradas, e", breaths: 609, scenes: 69, gutenberg: 75703 },
    "on-the-eve": { opening: "On one of the hottest days of the summer of 1853, in the shade of a tall lime-tree on the bank of th", breaths: 1251, scenes: 35, gutenberg: 6902 },
    "papeis-avulsos": { opening: "As chronicas da villa de ltaguahy dizem que em tempos remotos vivera alli um certo medico, o Dr. Sim", breaths: 1003, scenes: 11, gutenberg: 57001 },
    "piping-hot": { opening: "In the Rue Neuve-Saint-Augustin, a block of vehicles arrested the cab which was bringing Octave Mour", breaths: 3026, scenes: 18, gutenberg: 54686 },
    "ramuntcho": { opening: "The sad curlews, annunciators of the autumn, had just appeared in a mass in a gray squall, fleeing f", breaths: 895, scenes: 40, gutenberg: 9616 },
    "smoke": { opening: "On the 10th of August 1862, at four o’clock in the afternoon, a great number of people were throngin", breaths: 1239, scenes: 28, gutenberg: 40813 },
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
      id === "an-iceland-fisherman",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.ok(full.breaths.length >= 3, id);
    assert.ok(full.breaths[0]?.text.startsWith(want.opening.slice(0, 40)), id);
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
    "a-spring-time-case": { opening: "It was around the tolling of the fifth hour in the early evening that a fish monger, of the next str", breaths: 448, scenes: 5, gutenberg: 73132 },
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
    "auguste-rodin": { opening: "Rodin has pronounced Rilke's essay the supreme interpretation of his work. A few years ago the sculp", breaths: 115, scenes: 2, gutenberg: 45605, scene: "Preface" },
    "lucky-pehr": { opening: "SCENE: A Room in the Church Tower.", breaths: 924, scenes: 5, gutenberg: 8510, scene: "Act I" },
    "the-dream-play": { opening: "*The background represents cloud banks that resemble corroding slate cliffs with ruins of castles an", breaths: 1085, scenes: 2, gutenberg: 45375, scene: "Prologue" },
    "the-father": { opening: "[The sitting room at the Captain's. There is a door a little to the right at the back. In the middle", breaths: 727, scenes: 3, gutenberg: 8499, scene: "Act I" },
    "easter": { opening: "[Thursday before Easter. The music before curtain is: Haydn: Sieben Worte des Erloesers. Introductio", breaths: 807, scenes: 3, gutenberg: 8500, scene: "Act I" },
    "the-inferno": { opening: "An American critic says \"Strindberg is the greatest subjectivist of all time.\" Certainly neither Aug", breaths: 651, scenes: 17, gutenberg: 44108, scene: "Introduction" },
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
  assert.equal(next.includes("the-red-room"), false);
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
    "miss-julia": { opening: "(A large kitchen: the ceiling and the side walls are hidden by draperies and hangings. The rear wall", breaths: 613, scenes: 3, gutenberg: 14347 },
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
      breaths: 749,
      scenes: 16,
      gutenberg: 4383,
      scene: "Chapter I",
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
  assert.equal(next.includes("seven-brothers"), false);
  assert.equal(forYou.workIds.includes("lady-into-fox"), false);
  assert.equal(forYou.workIds.includes("gentlemen-prefer-blondes"), false);
  assert.equal(forYou.workIds.includes("seven-brothers"), true);
  assert.equal(curatorialTrack("seven-brothers"), "later");
  assert.equal(curatorialTrack("lady-into-fox"), "later");
  assert.ok(waking.workIds.includes("seven-brothers"));
  assert.ok(walk.workIds.includes("seven-brothers"));
  assert.equal(sleep.workIds.includes("seven-brothers"), false);
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
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
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
  assert.equal(brothers!.breaths, 2693);
  assert.match(brothers!.author, /Matson/);
  const brothersFull = JSON.parse(
    readFileSync(new URL("./texts/seven-brothers.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(brothersFull.breaths.length, 2693);
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
    "cecilia": { opening: "*Tal es el fruto de la culpa, Tello, cosecha de dolor.*", breaths: 3966, scenes: 45, gutenberg: 28281 },
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
    "knulp": { opening: "Anfang der neunziger Jahre mußte unser Freund Knulp einmal mehrere Wochen im Spital liegen, und als er entlassen wurde, ", breaths: 656, scenes: 3, gutenberg: 17622, scene: "Vorfrühling" },
    "iracema": { opening: "Iracema passou entre as arvores, silenciosa como uma sombra: seu olhar scintillante coava entre as folhas, quaes frouxos", breaths: 968, scenes: 27, gutenberg: 67740, scene: "Chapter VII" },
    "tristana": { opening: "Resignada en absoluto no, porque más de una vez, en aquel año que precedió a lo que se va a referir, la linda figurilla ", breaths: 627, scenes: 28, gutenberg: 66979, scene: "Chapter II · Resignada en absoluto no, porque más de una vez, en aquel año que" },
    "niels": { opening: "She had the black, luminous eyes of the Blid family with delicate, straight eyebrows; she had their boldly shaped nose, ", breaths: 933, scenes: 14, gutenberg: 55389, scene: "Chapter I" },
    "amor-de-perdicao": { opening: "Domingos José Correia Botelho de Mesquita e Menezes, fidalgo de linhagem, e um dos mais antigos solarengos de Villa Real", breaths: 1569, scenes: 19, gutenberg: 16425, scene: "Part 1 · Chapter I" },
    "das-stunden-buch": { opening: "Produced by Markus Brenner and the Online Distributed Proofreading Team at http://www.pgdp.net", breaths: 430, scenes: 309, gutenberg: 24288, scene: "Book I · Produced by Markus Brenner and the Online Distributed" },
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
    assert.ok((full.breaths[0]?.text ?? "").startsWith(want.opening), id);
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
      opening: "SHADES Shall I tell you, then, how it is?--",
      breaths: 178,
      scenes: 6,
      gutenberg: 22734,
    },
    "black-spirits-and-white-a-book-of-ghost-stories": {
      opening:
        "When in May, 1886, I found myself at last in Paris, I naturally determined to throw myself on the charity of an old chum of mine, Eugene Marie d'Ardeche, who had forsaken Boston a year or more ago on receiving word of th",
      breaths: 1305,
      scenes: 40,
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
      breaths: 89,
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
      breaths: 2559,
      scenes: 2,
      gutenberg: 24716,
    },
    "the-hesperides-and-noble-numbers": {
      opening:
        "I sing of brooks, of blossoms, birds and bowers, Of April, May, of June and July-flowers; I sing of May-poles, hock-carts, wassails, wakes, Of bridegrooms, brides and of their bridal cakes; I write of youth, of love, and",
      breaths: 6886,
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
      breaths: 3864,
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
    assert.ok((full.breaths[0]?.text ?? "").startsWith(want.opening), id);
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
      breaths: 752,
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
    "our-lady-of-the-pillar": {
      opening: "In 1474, a year abounding in divine favours for all Christendom, when King Henry IV. reigned in Castile, there came to live in the city of Segovia, where he had",
      breaths: 29,
      scenes: 1,
      gutenberg: 56670,
    },
    "the-sweet-miracle": {
      opening: "luminous margins of the Lake of Tiberias; but the news of his miracles had already penetrated as far as Enganim, a rich city of strong battlements set among vin",
      breaths: 16,
      scenes: 1,
      gutenberg: 74802,
    },
    "red-oleanders": {
      opening: "*The Curtain rises on a window covered by a network of intricate pattern in front of the Palace.*",
      breaths: 1729,
      scenes: 50,
      gutenberg: 77892,
    },
    "stories-from-tagore": {
      opening: "My five years' old daughter Mini cannot live without chattering. I really believe that in all her life she has not wasted a minute in silence. Her mother is oft",
      breaths: 1037,
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
      breaths: 3085,
      scenes: 9,
      gutenberg: 29745,
    },
  } as const;
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  assert.ok(sleep);
  assert.ok(forYou);
  assert.equal(Object.keys(expect).length, 14);
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
    assert.ok((full.breaths[0]?.text ?? "").startsWith(want.opening), id);
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
  assert.equal(next.includes("casanovas-homecoming"), false);
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
      breaths: 6962,
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
      breaths: 4163,
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
      breaths: 16207,
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
      breaths: 2257,
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
      breaths: 9059,
      scenes: 347,
      minutes: 1356,
      year: 1924,
      gutenberg: 72735,
      scene: "1. Tying Tiger · Hungry-time fish pot",
      lane: "rituals",
    },
    "hadji-murad": {
      opening:
        "I was returning home by the fields. It was midsummer; the hay harvest was over, and they were just beginning to reap the rye.",
      breaths: 1595,
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
      breaths: 3444,
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
      breaths: 2271,
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
      breaths: 1680,
      scenes: 47,
      minutes: 572,
      year: 1906,
      gutenberg: undefined,
      scene: "Part I · Chapter I",
      lane: "for-you",
    },
    "african-tragedy": {
      opening: "Two reasons made Robert Zulu leave teaching at Siam Village School.",
      breaths: 521,
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
  assert.match(arch?.intro ?? "", /Rome prologue/);
  assert.doesNotMatch(arch?.opening ?? "", /^ONE afternoon in the autumn of 1851 a solitary horseman was in Rome/);
  const banjo = SHELF.find((item) => item.id === "banjo");
  assert.match(banjo?.intro ?? "", /do not sanitize/);
  assert.match(banjo?.intro ?? "", /dialect/);
  assert.equal(banjo?.gutenberg, undefined);
  const abbey = SHELF.find((item) => item.id === "anandamath");
  assert.match(abbey?.author ?? "", /Sen-Gupta/);
  assert.match(abbey?.intro ?? "", /Poison Tree/);
  assert.match(abbey?.intro ?? "", /no catalog number/);
  assert.equal(abbey?.gutenberg, undefined);
  const nacha = SHELF.find((item) => item.id === "nacha-regules");
  assert.match(nacha?.author ?? "", /Ongley/);
  assert.match(nacha?.intro ?? "", /do not sanitize/);
  assert.match(nacha?.intro ?? "", /sex-work/);
  const tragedy = SHELF.find((item) => item.id === "african-tragedy");
  assert.match(tragedy?.opening ?? "", /^Two reasons made Robert Zulu leave teaching/);
  assert.doesNotMatch(tragedy?.opening ?? "", /EVILS OF TOWN LIFE/);
  assert.match(tragedy?.intro ?? "", /chapter boundary/);
  assert.match(tragedy?.intro ?? "", /do not sanitize/);
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
      scene: "That's no animal, I tell you!",
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
  assert.match(dogs?.intro ?? "", /do not sanitize/);
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
    "the-purple-land",
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
    "the-purple-land",
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
    "the-purple-land",
  ]);
  const biteBrazil = bite!.workIds.lastIndexOf("brazilian-tales");
  assert.equal(bite?.workIds[biteBrazil - 1], "african-tragedy");
  assert.equal(bite?.workIds[biteBrazil + 1], "tropic");

  const expect = {
    "lolly-willowes": {
      opening:
        "When her father died, Laura Willowes went to live in London with her elder brother and his family.",
      breaths: 3176,
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
      breaths: 6653,
      scenes: 26,
      minutes: 832,
      year: 1897,
      gutenberg: 3431,
      scene: "CHAPTER I.",
      lane: "next",
    },
    "brazilian-tales": {
      opening:
        "So it really seems to you that what happened to me in 1860 is worth while writing down? Very well. I'll tell you the story, but on the condition that you do not divulge it before my death. You'll not have to wait long--a week at most; I am a marked man.",
      breaths: 361,
      scenes: 6,
      minutes: 220,
      year: 1921,
      gutenberg: 21040,
      scene: "The Attendant's Confession",
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
  assert.match(lolly?.intro ?? "", /Maggot/);
  const cheri = SHELF.find((item) => item.id === "cheri");
  assert.equal(cheri?.gutenberg, undefined);
  assert.match(cheri?.intro ?? "", /wrought-iron/);
  assert.match(cheri?.intro ?? "", /no catalog number/);
  assert.match(cheri?.intro ?? "", /Bel-Ami/);
  assert.match(cheri?.intro ?? "", /do not sanitize/);
  const quiet = SHELF.find((item) => item.id === "all-quiet-on-the-western-front");
  assert.match(quiet?.intro ?? "", /beef and haricot beans/);
  assert.match(quiet?.intro ?? "", /not sanitize/);
  assert.match(quiet?.intro ?? "", /Warn the room if you Host further/);
  assert.equal(quiet?.gutenberg, 75011);
  const gadfly = SHELF.find((item) => item.id === "the-gadfly");
  assert.match(gadfly?.intro ?? "", /Fragola/);
  assert.match(gadfly?.intro ?? "", /Enchanted April/);
  const tales = SHELF.find((item) => item.id === "brazilian-tales");
  assert.match(tales?.intro ?? "", /One tale only/);
  assert.match(tales?.intro ?? "", /Attendant's Confession/);
  assert.match(tales?.intro ?? "", /tale boundary/);
  assert.match(tales?.intro ?? "", /Tropic/);
  const talesOpen = JSON.parse(
    readFileSync(new URL("./openings/brazilian-tales.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[] };
  assert.equal(talesOpen.scenes.length, 1);
  assert.equal(talesOpen.scenes[0]?.title, "The Attendant's Confession");
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
  assert.deepEqual(next.slice(-27, -23), [
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
  assert.deepEqual(sleep?.workIds.slice(-37, -32), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
    "irish-fairy-tales",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-27, -23), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
  ]);
  assert.deepEqual(walk?.workIds.slice(-27, -23), [
    "the-peasants",
    "a-hungarian-nabob",
    "an-iceland-fisherman",
    "the-song-of-the-blood-red-flower",
  ]);
  assert.equal(bite?.workIds.at(-3), "irish-fairy-tales");
  assert.equal(waking?.workIds.at(-15), "irish-fairy-tales");
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
  assert.equal(nabob?.breaths, 2347);
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
  assert.match(iceland?.intro ?? "", /1886 only/);
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
  assert.deepEqual(next.slice(-23, -21), ["basilio", "oblomov"]);
  assert.equal(next.includes("krakatit"), false);
  assert.equal(next.includes("the-lady-with-the-dog-and-other-stories"), false);
  assert.equal(next.includes("zeno"), false);
  assert.equal(next.includes("the-book-of-khalid"), false);
  assert.deepEqual(sleep?.workIds.slice(-32, -27), [...order]);
  assert.deepEqual(unwind?.workIds.slice(-23, -21), ["basilio", "oblomov"]);
  assert.deepEqual(walk?.workIds.slice(-23, -21), ["basilio", "oblomov"]);
  assert.equal(bite?.workIds.at(-2), "the-lady-with-the-dog-and-other-stories");
  assert.deepEqual(waking?.workIds.slice(-14, -11), [
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
    assert.equal(next.slice(-2).includes(id), false, id);
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
      breaths: 8199,
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
      breaths: 2436,
      opening: "When I spoke to the doctor about my weakness for smoking",
      em: "",
    },
    "the-book-of-khalid": {
      title: "The Book of Khalid",
      gutenberg: 29257,
      breaths: 4509,
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
  assert.deepEqual(next.slice(-21, -19), ["blacker", "a-lost-lady"]);
  assert.equal(next.at(-19), "the-wanderer");
  assert.equal(next.includes("basilio"), true);
  assert.equal(next.includes("lady-macbeth"), false);
  assert.equal(next.includes("summer"), false);
  assert.equal(next.includes("the-last-man"), false);
  assert.equal(next.includes("madmen"), false);
  assert.deepEqual(sleep?.workIds.slice(-27, -20), [
    "blacker",
    "a-lost-lady",
    "lady-macbeth",
    "summer",
    "jacob-s-room",
    "the-tenant-of-wildfell-hall",
    "herland",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-21, -19), ["blacker", "a-lost-lady"]);
  assert.deepEqual(walk?.workIds.slice(-21, -19), ["blacker", "a-lost-lady"]);
  assert.equal(unwind?.workIds.at(-19), "the-wanderer");
  assert.equal(walk?.workIds.at(-19), "the-wanderer");
  assert.equal(bite?.workIds.at(-1), "lady-macbeth");
  assert.deepEqual(waking?.workIds.slice(-11, -6), [
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

  assert.deepEqual(next.slice(-18, -15), [
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
  ]);
  assert.equal(next.at(-19), "the-wanderer");
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

  assert.deepEqual(sleep?.workIds.slice(-18, -15), [
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
  ]);
  assert.equal(unwind?.workIds.at(-16), "the-sun-also-rises");
  assert.equal(walk?.workIds.at(-16), "the-sun-also-rises");
  assert.equal(sleep?.workIds.includes("trooper-peter-halket-of-mashonaland"), true);
  assert.equal(waking?.workIds.at(-5), "the-garden-party-and-other-stories");
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
      breaths: 1673,
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
      breaths: 5117,
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

  assert.match(RITUAL_PITCHES.bliss ?? "", /title story Bliss only/);
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

  assert.deepEqual(next.slice(-15, -12), [
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
  ]);
  assert.deepEqual(next.slice(-18, -15), [
    "the-cabala",
    "reuben-sachs",
    "the-sun-also-rises",
  ]);
  assert.equal(next.includes("where-angels-fear-to-tread"), false);
  assert.equal(next.includes("cane"), false);
  assert.equal(next.includes("trooper-peter-halket-of-mashonaland"), false);
  assert.equal(next.includes("the-garden-party-and-other-stories"), false);

  assert.deepEqual(sleep?.workIds.slice(-15, -12), [
    "the-man-of-property",
    "the-awakening",
    "theresa-raquin",
  ]);
  assert.equal(unwind?.workIds.at(-13), "theresa-raquin");
  assert.equal(walk?.workIds.at(-13), "theresa-raquin");
  assert.equal(waking?.workIds.at(-4), "cane");
  assert.equal(waking?.workIds.at(-5), "the-garden-party-and-other-stories");
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

  assert.deepEqual(next.slice(-12, -8), [
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
  ]);
  assert.deepEqual(next.slice(-15, -12), [
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
  assert.deepEqual(sleep?.workIds.slice(-12, -8), [
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
  ]);
  assert.equal(unwind?.workIds.at(-9), "indiana");
  assert.equal(walk?.workIds.at(-9), "indiana");
  assert.equal(waking?.workIds.at(-3), "the-book-of-wonder");
  assert.equal(waking?.workIds.at(-4), "cane");
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

  assert.deepEqual(next.slice(-8, -4), [
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
  ]);
  assert.deepEqual(next.slice(-12, -8), [
    "there-is-confusion",
    "pointed-roofs",
    "the-rise-of-silas-lapham",
    "indiana",
  ]);
  assert.deepEqual(next.slice(-15, -12), [
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
  assert.deepEqual(sleep?.workIds.slice(-8, -4), [
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
  ]);
  assert.equal(unwind?.workIds.at(-5), "jude-the-obscure");
  assert.equal(walk?.workIds.at(-5), "jude-the-obscure");
  assert.equal(unwind?.workIds.at(-9), "indiana");
  assert.equal(waking?.workIds.at(-2), "dubliners");
  assert.equal(waking?.workIds.at(-3), "the-book-of-wonder");
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
  assert.notEqual(waking?.workIds.at(-1), "irish-fairy-tales");
  assert.equal(waking?.workIds.at(-1), "strange-tales");
});

test("Mira Fri ~6PM CLEAR is Next lead High Wind, then Vera, Futility, and The Comedienne, with Strange Tales Painted Wall on Rituals", () => {
  const next = NEXT_FEATURED_TRACK_IDS as readonly string[];
  const featured = FEATURED_CAROUSEL_IDS as readonly string[];
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  const sleep = RITUAL_LANES.find((item) => item.id === "before-sleep");
  const waking = RITUAL_LANES.find((item) => item.id === "waking-up");
  const unwind = RITUAL_LANES.find((item) => item.id === "unwind");
  const walk = RITUAL_LANES.find((item) => item.id === "on-a-walk");

  assert.deepEqual(next.slice(-4), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.deepEqual(next.slice(-8, -4), [
    "the-hidden-force",
    "the-home-and-the-world",
    "hunger",
    "jude-the-obscure",
  ]);
  assert.equal(next.includes("strange-tales"), true);
  assert.equal(next.slice(-4).includes("strange-tales"), false);
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
  assert.deepEqual(sleep?.workIds.slice(-4), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.deepEqual(unwind?.workIds.slice(-4), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.deepEqual(walk?.workIds.slice(-4), [
    "high-wind-jamaica",
    "vera",
    "futility",
    "the-comedienne",
  ]);
  assert.equal(waking?.workIds.at(-1), "strange-tales");
  assert.equal(waking?.workIds.at(-2), "dubliners");
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

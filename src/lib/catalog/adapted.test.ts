import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import {
  ADAPTED_BY_SALON_IDS,
  curatorialTrack,
  isAdaptedBySalon,
  NEXT_FEATURED_TRACK_IDS,
} from "./curatorial.ts";
import {
  ADAPTED_WORKS,
  CLASSIC_LOCAL_WORKS,
  featuredWorks,
  FULL_TEXT_WORKS,
  LOCAL_WORKS,
  withLocalBound,
} from "./full-pdf.ts";
import { FIRST_SESSION_RITUAL_IDS, RITUAL_LANES, type RitualLane } from "./rituals.ts";
import { SHELF, searchShelf, shelfWork } from "./shelf.ts";
import { isBoundLocal } from "./en-rights.ts";
import { placeFor } from "./places.ts";
import { readerIntro } from "../reader-intro.ts";
import type { Work } from "../literature.ts";

const LANE: Record<string, "unwind" | "before-sleep" | "waking-up"> = {
  "miss-brill-adapted": "unwind",
  "prefer-not": "unwind",
  "late-season": "unwind",
  "between-the-drop-and-the-water": "before-sleep",
  "he-woke-changed": "unwind",
  "the-pattern": "before-sleep",
  "a-coat-worthy-of-respect": "unwind",
  "what-she-borrowed": "unwind",
  "it-was-not-nervousness": "before-sleep",
  "during-carnival": "before-sleep",
  "what-we-sold": "unwind",
  "bliss-tokyo": "unwind",
  "open-window-singapore": "waking-up",
  "story-of-an-hour-buenos-aires": "before-sleep",
  "masque-rio": "before-sleep",
  "boule-de-suif-istanbul": "unwind",
  "happy-prince-hong-kong": "before-sleep",
  "hunger-artist-milan": "unwind",
  "the-nose-cape-town": "waking-up",
  "queen-of-spades-paris": "before-sleep",
  "decapitated-chicken-lisbon": "before-sleep",
};

const EXPECT = {
  "miss-brill-adapted": {
    title: "Katherine Mansfield, Miss Brill recast",
    opening: /^Miss Brill put on her coat the way other people put on a face/,
    last: /the city kept casting itself without her/,
    place: { label: "Menton / French Riviera", region: "fr" },
    credit: /After Mansfield, Miss Brill, 1920/,
    scene: /river park/i,
  },
  "prefer-not": {
    title: "Herman Melville, Bartleby recast",
    opening: /^I am a man who believes in soft walls and quieter victories/,
    last: /a gentle workplace could always find a door/,
    place: { label: "New York", region: "us" },
    credit: /After Melville, Bartleby, 1853/,
    scene: /screen/i,
  },
  "late-season": {
    title: "Anton Chekhov, The Lady with the Dog recast",
    opening: /^Dmitri Gurov came to Cape May in September/,
    last: /harder to put down/,
    place: { label: "Yalta / Moscow", region: "ru" },
    credit: /After Chekhov, The Lady with the Dog, 1899/,
    scene: /off season/i,
  },
  "between-the-drop-and-the-water": {
    title: "Ambrose Bierce, An Occurrence at Owl Creek Bridge recast",
    opening: /^Peyton Farquhar stood on the edge of the condemned pier/,
    last: /let him go home/,
    place: { label: "Hudson River, New York", region: "us" },
    credit: /After Bierce, An Occurrence at Owl Creek Bridge, 1890/,
    scene: /pier/i,
  },
  "he-woke-changed": {
    title: "Franz Kafka, The Metamorphosis recast",
    opening: /^Gregor Samsa woke from uneasy dreams and found himself changed/,
    last: /someone else's problem/,
    place: { label: "Prague", region: "cz" },
    credit: /After Kafka, The Metamorphosis, 1915/,
    scene: /apartment/i,
  },
  "the-pattern": {
    title: "Charlotte Perkins Gilman, The Yellow Wallpaper recast",
    opening: /^John said the country would fix me/,
    last: /did not try to hold anyone in/,
    place: { label: "Hudson, New York", region: "us" },
    credit: /After Gilman, The Yellow Wallpaper, 1892/,
    scene: /wallpaper/i,
  },
  "a-coat-worthy-of-respect": {
    title: "Nikolai Gogol, The Overcoat recast",
    opening: /^Akaky Akakievich Petrovich/,
    last: /impossible to ignore/,
    place: { label: "St. Petersburg", region: "ru" },
    credit: /After Gogol, The Overcoat, 1842/,
    scene: /coat/i,
  },
  "what-she-borrowed": {
    title: "Guy de Maupassant, The Necklace recast",
    opening: /^Mathilde Loisel believed she had been born for better rooms/,
    last: /impossible even to hate cleanly/,
    place: { label: "Paris", region: "fr" },
    credit: /After Maupassant, The Necklace, 1884/,
    scene: /gala/i,
  },
  "it-was-not-nervousness": {
    title: "Edgar Allan Poe, The Tell-Tale Heart recast",
    opening: /^Listen\. I can tell this calmly/,
    last: /it is his heart/,
    place: { label: "East London", region: "gb" },
    credit: /After Poe, The Tell-Tale Heart, 1843/,
    scene: /walk-up/i,
  },
  "during-carnival": {
    title: "Edgar Allan Poe, The Cask of Amontillado recast",
    opening: /^I did not announce what Fortunato had done to me/,
    last: /bells went quiet/,
    place: { label: "Venice", region: "it" },
    credit: /After Poe, The Cask of Amontillado, 1846/,
    scene: /cellar/i,
  },
  "what-we-sold": {
    title: "O. Henry, The Gift of the Magi recast",
    opening: /^Della counted the jar twice on Christmas Eve morning/,
    last: /did not need to be correct to be true/,
    place: { label: "London", region: "gb" },
    credit: /After O\. Henry, The Gift of the Magi, 1905/,
    scene: /christmas/i,
  },
  "bliss-tokyo": {
    title: "Katherine Mansfield, Bliss recast",
    opening: /^Bertha felt it in the elevator/,
    last: /pear tree look suddenly like stage dressing/,
    place: { label: "Tokyo", region: "jp" },
    credit: /After Mansfield, Bliss, 1918/,
    scene: /omotesando/i,
  },
  "open-window-singapore": {
    title: "Saki, The Open Window recast",
    opening: /^Framton Nuttel arrived with letters of introduction/,
    last: /afternoon were still a simple thing/,
    place: { label: "Singapore", region: "sg" },
    credit: /After Saki, The Open Window, 1914/,
    scene: /veranda/i,
  },
  "story-of-an-hour-buenos-aires": {
    title: "Kate Chopin, The Story of an Hour recast",
    opening: /^They told her carefully/,
    last: /The key turned in the latch/,
    place: { label: "Buenos Aires", region: "ar" },
    credit: /After Chopin, The Story of an Hour, 1894/,
    scene: /recoleta/i,
  },
  "masque-rio": {
    title: "Edgar Allan Poe, The Masque of the Red Death recast",
    opening: /^While the fever moved through the favelas/,
    last: /changed genres without telling the cast/,
    place: { label: "Rio de Janeiro", region: "br" },
    credit: /After Poe, The Masque of the Red Death, 1842/,
    scene: /hillside|compound/i,
  },
  "boule-de-suif-istanbul": {
    title: "Guy de Maupassant, Boule de Suif recast",
    opening: /^The private van left/,
    last: /inconvenience that made endurance possible/,
    place: { label: "Istanbul", region: "tr" },
    credit: /After Maupassant, Boule de Suif, 1880/,
    scene: /van/i,
  },
  "happy-prince-hong-kong": {
    title: "Oscar Wilde, The Happy Prince recast",
    opening: /^High above Victoria Harbour the Happy Prince/,
    last: /what his gold was for/,
    place: { label: "Hong Kong", region: "hk" },
    credit: /After Wilde, The Happy Prince, 1888/,
    scene: /harbour/i,
  },
  "hunger-artist-milan": {
    title: "Franz Kafka, A Hunger Artist recast",
    opening: /^In Brera they gave him a glass box/,
    last: /refusal was an art/,
    place: { label: "Milan", region: "it" },
    credit: /After Kafka, A Hunger Artist, 1922/,
    scene: /brera/i,
  },
  "the-nose-cape-town": {
    title: "Nikolai Gogol, The Nose recast",
    opening: /^Collegiate Assessor Kovalev/,
    last: /exact as a held breath/,
    place: { label: "Cape Town", region: "za" },
    credit: /After Gogol, The Nose, 1836/,
    scene: /long street/i,
  },
  "queen-of-spades-paris": {
    title: "Alexander Pushkin, The Queen of Spades recast",
    opening: /^Hermann was not rich enough for the 8th arrondissement/,
    last: /exact as a held breath/,
    place: { label: "Paris", region: "fr" },
    credit: /After Pushkin, The Queen of Spades, 1834/,
    scene: /cards/i,
  },
  "decapitated-chicken-lisbon": {
    title: "Horacio Quiroga, The Decapitated Chicken recast",
    opening: /^The villa stood white above the Tagus/,
    last: /exact as a held breath/,
    place: { label: "Lisbon", region: "pt" },
    credit: /After Quiroga, The Decapitated Chicken, 1909/,
    scene: /villa|tagus/i,
  },
  "madame-bovary-tokyo": {
    title: "Gustave Flaubert, Madame Bovary recast",
    opening: /^Haruto Mori’s white coat hung by the door of the Asaka condo/,
    last: /ledgered, unmoved/,
    place: { label: "Tokyo", region: "jp" },
    credit: /After Flaubert, Madame Bovary, 1857/,
    scene: /clinic coat/i,
  },
} as const;

test("Adapted remakes are local sits with source credit, not locked recommend", () => {
  const unwind = RITUAL_LANES.find((lane) => lane.id === "unwind");
  const beforeSleep = RITUAL_LANES.find((lane) => lane.id === "before-sleep");
  const waking = RITUAL_LANES.find((lane) => lane.id === "waking-up");
  assert.ok(unwind);
  assert.ok(beforeSleep);
  assert.ok(waking);
  const lanes: Record<"unwind" | "before-sleep" | "waking-up", RitualLane> = {
    unwind,
    "before-sleep": beforeSleep,
    "waking-up": waking,
  };
  for (const id of ADAPTED_BY_SALON_IDS) {
    const want = EXPECT[id];
    const work = shelfWork(id);
    assert.ok(work, id);
    assert.equal(work.title, want.title, id);
    assert.equal(work.author, "Salon", id);
    assert.equal(work.year, 2026, id);
    assert.equal(work.local, true, id);
    assert.equal(work.gutenberg, undefined, id);
    assert.equal(isBoundLocal(work), true, id);
    assert.match(work.opening ?? "", want.opening, id);
    assert.equal(curatorialTrack(id), "adapted", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    const lane = LANE[id];
    if (lane) {
      const home = lanes[lane];
      assert.ok(home.workIds.includes(id), `${id} ${lane}`);
      for (const [name, other] of Object.entries(lanes) as [
        "unwind" | "before-sleep" | "waking-up",
        RitualLane,
      ][]) {
        if (name === lane) continue;
        assert.equal(other.workIds.includes(id), false, `${id} not ${name}`);
      }
    } else {
      for (const [name, other] of Object.entries(lanes) as [
        "unwind" | "before-sleep" | "waking-up",
        RitualLane,
      ][]) {
        assert.equal(other.workIds.includes(id), false, `${id} not a timed sit in ${name}`);
      }
    }
    assert.deepEqual(placeFor(work), want.place, id);

    const copy = readerIntro({
      id: work.id,
      title: work.title,
      author: work.author,
      year: String(work.year),
      note: work.intro ?? "",
      minutes: work.minutes,
      cover: "",
      coverAlt: "",
      scenes: [],
      breaths: [],
    } satisfies Work);
    assert.match(copy, want.credit, `${id} intro`);
    assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i, id);

    const packed = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { title: string; scenes: { title: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as { title: string; breaths: { text: string }[] };
    assert.equal(packed.title, want.title, `${id} opening title`);
    assert.equal(full.title, want.title, `${id} text title`);
    assert.match(packed.scenes[0]?.title ?? "", want.scene, id);
    assert.match(packed.breaths[0]?.text ?? "", want.opening, id);
    assert.match(packed.breaths.at(-1)?.text ?? "", want.last, id);
    assert.equal(full.breaths.length, packed.breaths.length, `${id} full sit`);
    assert.equal(work.breaths, packed.breaths.length, `${id} shelf breaths`);
    const joined = packed.breaths.map((breath) => breath.text).join(" ");
    assert.doesNotMatch(joined, /project gutenberg|transcriber/i, id);
  }
});

test("Adapted remakes do not keep remake nicknames as the display title", () => {
  const banned = [
    "The Bench at Four",
    "Prefer Not",
    "Late Season",
    "Between the Drop and the Water",
    "He Woke Changed",
    "The Pattern",
    "A Coat Worthy of Respect",
    "What She Borrowed",
    "It Was Not Nervousness",
    "During Carnival",
    "What We Sold",
    "Bartleby, the Scrivener after",
    "Miss Brill after",
    "Bartleby after",
    "The Lady with the Dog after",
    "An Occurrence at Owl Creek Bridge after",
    "The Metamorphosis after",
    "The Yellow Wallpaper after",
    "The Overcoat after",
    "The Necklace after",
    "The Tell-Tale Heart after",
    "The Cask of Amontillado after",
    "The Gift of the Magi after",
    "The Silver Pear",
    "The Open Veranda",
    "The Hour Above Recoleta",
    "The Masque Above the Bay",
    "What the Van Required",
    "Gold Leaf Over Harbour",
    "The Fast in Brera",
    "The Nose on Long Street",
    "Three Cards in the Huitieme",
    "The Villa Above the Tagus",
    "Bliss after",
    "The Open Window after",
    "The Story of an Hour after",
    "The Masque of the Red Death after",
    "Boule de Suif after",
    "The Happy Prince after",
    "A Hunger Artist after",
    "The Nose after",
    "The Queen of Spades after",
    "The Decapitated Chicken after",
    "The Ceiling Rectangle",
    "Ginza After Rain",
    "Fluorescent Honesty",
    "Madame Bovary after",
  ];
  for (const id of ADAPTED_BY_SALON_IDS) {
    const title = shelfWork(id)?.title ?? "";
    assert.ok(title.endsWith(" recast"), `${id} ends with recast`);
    assert.doesNotMatch(title, / after$/, `${id} not after`);
    assert.equal(banned.includes(title), false, `${id} ${title}`);
  }
});

test("classic Miss Brill collection stays on the shelf beside the remake", () => {
  const classic = SHELF.find((item) => item.id === "the-garden-party-and-other-stories");
  const remake = SHELF.find((item) => item.id === "miss-brill-adapted");
  assert.ok(classic);
  assert.ok(remake);
  assert.notEqual(classic!.id, remake!.id);
  assert.equal(remake!.title, "Katherine Mansfield, Miss Brill recast");
});

test("Locked recommend order stays the locked five titles", () => {
  assert.deepEqual(
    featuredWorks().map((item) => item.id),
    [...FEATURED_CAROUSEL_IDS],
  );
  assert.equal(featuredWorks().every((item) => !isAdaptedBySalon(item.id)), true);
});

test("homepage classics strip does not mix in Adapted remakes", () => {
  const adapted = new Set<string>(ADAPTED_BY_SALON_IDS);
  assert.deepEqual(
    ADAPTED_WORKS.map((item) => item.id),
    [...ADAPTED_BY_SALON_IDS],
  );
  assert.equal(
    CLASSIC_LOCAL_WORKS.some((item) => adapted.has(item.id)),
    false,
  );
  assert.ok(LOCAL_WORKS.some((item) => item.id === "miss-brill-adapted"));
  assert.ok(CLASSIC_LOCAL_WORKS.some((item) => item.id === "passing"));
  assert.ok(LOCAL_WORKS.some((item) => item.id === "the-pattern"));
  assert.ok(LOCAL_WORKS.some((item) => item.id === "he-woke-changed"));
});

test("homepage search is local binds only — no Gutenberg-only dead ends", () => {
  const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
  assert.match(home, /useShelfSearch\("local"\)/);
  assert.doesNotMatch(home, /useShelfSearch\("fullPdf"\)/);

  assert.equal(LOCAL_WORKS.length, 437);
  assert.ok(LOCAL_WORKS.every((item) => isBoundLocal(item)));
  assert.ok(FULL_TEXT_WORKS.length > LOCAL_WORKS.length);

  const crime = SHELF.find((item) => item.id === "crime");
  assert.ok(crime);
  assert.equal(isBoundLocal(crime), false);
  assert.ok(crime.gutenberg);
  assert.equal(
    withLocalBound(searchShelf("crime and punishment")).some((item) => item.id === "crime"),
    false,
  );

  assert.ok(
    withLocalBound(searchShelf("house of mirth")).some((item) => item.id === "the-house-of-mirth"),
  );
});

test("homepage Adapted surface is a gateway, not a drifting remake strip", () => {
  const src = readFileSync(new URL("../../components/adapted-strip.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
  const lane = readFileSync(new URL("../../routes/adapted.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

  assert.match(src, /to=["']\/adapted["']/);
  assert.match(src, /ADAPTED_WORKS/);
  assert.doesNotMatch(src, /STRIP_DRIFT|stripDriftDelta|stripItems|adapted-scroller/);
  assert.doesNotMatch(src, /to=["']\/read\/\$workId["']/);
  assert.doesNotMatch(src, /FEATURED_CAROUSEL|NEXT_FEATURED|CLASSIC_LOCAL_WORKS/);
  assert.doesNotMatch(home, /FeaturedStrip|featured-strip|cell-featured|Featured/);
  assert.match(home, /<AdaptedStrip \/>/);
  assert.match(home, /Rituals/);
  assert.match(home, /Read together/);
  assert.doesNotMatch(css, /\.cell-featured|\.featured-kicker/);
  assert.match(lane, /ADAPTED_WORKS/);
  assert.match(lane, /to=["']\/read\/\$workId["']/);
  assert.doesNotMatch(lane, /FEATURED_CAROUSEL|stripDriftDelta|adapted-scroller|\bFeatured\b/);
  assert.doesNotMatch(src, /\bFeatured\b/);
  assert.doesNotMatch(css, /\.adapted-scroller/);
});

function listSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSource(path));
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(path);
  }
  return out;
}

function withoutComments(src: string) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("routes and components have no reader-facing Featured label", () => {
  const here = fileURLToPath(new URL("../..", import.meta.url));
  const hits: string[] = [];
  for (const folder of ["routes", "components"]) {
    for (const file of listSource(join(here, folder))) {
      const code = withoutComments(readFileSync(file, "utf8"));
      const quoted = [...code.matchAll(/(["'`])(?:\\.|(?!\1)[\s\S])*?\1/g)].map((m) => m[0]);
      const jsx = [...code.matchAll(/>([^<{]{1,200})</g)].map((m) => m[1] ?? "");
      for (const chunk of [...quoted, ...jsx]) {
        if (/\bFeatured(?:-track)?\b|\bFEATURED\b/.test(chunk)) {
          hits.push(`${file.slice(here.length + 1)}: ${chunk.trim().slice(0, 100)}`);
        }
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("Madame Bovary Tokyo is one Adapted book, not three timed sits", () => {
  const id = "madame-bovary-tokyo";
  const gone = [
    "madame-bovary-tokyo-waking",
    "madame-bovary-tokyo-unwind",
    "madame-bovary-tokyo-before-sleep",
  ] as const;
  assert.equal(isAdaptedBySalon(id), true);
  assert.equal(curatorialTrack(id), "adapted");
  assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false);
  assert.equal((FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(id), false);
  for (const sibling of gone) {
    assert.equal(isAdaptedBySalon(sibling), false, sibling);
    assert.equal(shelfWork(sibling), undefined, sibling);
  }
  for (const lane of RITUAL_LANES) {
    assert.equal(lane.workIds.includes(id), false, lane.id);
    for (const sibling of gone) {
      assert.equal(lane.workIds.includes(sibling), false, `${sibling} ${lane.id}`);
    }
  }
  const classic = SHELF.find((item) => item.id === "bovary");
  assert.ok(classic);
  assert.equal(classic!.title, "Madame Bovary");
  assert.notEqual(classic!.id, id);

  const packed = JSON.parse(
    readFileSync(new URL("./openings/madame-bovary-tokyo.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string }[] };
  assert.match(packed.note, /self-poisoning/);
  assert.match(packed.note, /Warn the room before you Host it/);
  assert.match(packed.note, /Ginza/);
  assert.doesNotMatch(packed.note, /Host note \(required|Featured/i);
  assert.equal(packed.scenes.length, 24);
  assert.match(packed.scenes[0]?.title ?? "", /Clinic Coat/i);
  assert.ok(packed.scenes.some((scene) => /Hotel Glass/i.test(scene.title)));
  assert.ok(packed.scenes.some((scene) => /Channel Under the Shelf/i.test(scene.title)));
  assert.ok(packed.scenes.some((scene) => /Tokyo Continues/i.test(scene.title)));

  const work = shelfWork(id);
  assert.ok(work);
  assert.match(work!.intro ?? "", /self-poisoning/);
  assert.match(work!.intro ?? "", /Warn the room before you Host it/i);
});

test("Adapted remakes are whole stories — never waking/unwind/before-sleep siblings", () => {
  const sitSuffix = /-(waking|unwind|before-sleep)$/;
  assert.deepEqual(
    ADAPTED_BY_SALON_IDS.filter((id) => sitSuffix.test(id)),
    [],
  );
  assert.equal(ADAPTED_BY_SALON_IDS.length, 22);
  const titles = ADAPTED_BY_SALON_IDS.map((id) => {
    const work = shelfWork(id);
    assert.ok(work, id);
    return work!.title;
  });
  assert.equal(new Set(titles).size, titles.length, "one remake title = one id");

  const here = fileURLToPath(new URL(".", import.meta.url));
  for (const id of ADAPTED_BY_SALON_IDS) {
    for (const suffix of ["waking", "unwind", "before-sleep"] as const) {
      const sibling = `${id}-${suffix}`;
      assert.equal(isAdaptedBySalon(sibling), false, sibling);
      assert.equal(shelfWork(sibling), undefined, sibling);
      assert.equal(existsSync(join(here, "openings", `${sibling}.json`)), false, sibling);
      assert.equal(existsSync(join(here, "texts", `${sibling}.json`)), false, sibling);
    }
  }
  for (const lane of RITUAL_LANES) {
    const spliced = lane.workIds.filter(
      (id) => isAdaptedBySalon(id) && sitSuffix.test(id),
    );
    assert.deepEqual(spliced, [], lane.id);
  }

  const priorAndGlam = [
    "miss-brill-adapted",
    "prefer-not",
    "late-season",
    "between-the-drop-and-the-water",
    "he-woke-changed",
    "the-pattern",
    "a-coat-worthy-of-respect",
    "what-she-borrowed",
    "it-was-not-nervousness",
    "during-carnival",
    "what-we-sold",
    "bliss-tokyo",
    "open-window-singapore",
    "story-of-an-hour-buenos-aires",
    "masque-rio",
    "boule-de-suif-istanbul",
    "happy-prince-hong-kong",
    "hunger-artist-milan",
    "the-nose-cape-town",
    "queen-of-spades-paris",
    "decapitated-chicken-lisbon",
  ] as const;
  assert.deepEqual([...ADAPTED_BY_SALON_IDS.slice(0, 21)], [...priorAndGlam]);
  for (const id of priorAndGlam) {
    assert.ok(LANE[id], `${id} stays one whole remake on a ritual lane`);
    assert.equal(sitSuffix.test(id), false, id);
  }
});

test("glam-10 remakes use Mira city reseats, not raw Gutenberg extracts", () => {
  const bliss = readFileSync(new URL("./texts/bliss-tokyo.json", import.meta.url), "utf8");
  const framton = readFileSync(new URL("./texts/open-window-singapore.json", import.meta.url), "utf8");
  const louise = readFileSync(
    new URL("./texts/story-of-an-hour-buenos-aires.json", import.meta.url),
    "utf8",
  );
  assert.match(bliss, /Omotesando/);
  assert.match(framton, /Bukit Timah/);
  assert.match(louise, /Recoleta/);
  assert.doesNotMatch(bliss, /Although Bertha Young was thirty/);
  assert.doesNotMatch(framton, /My aunt will be down presently, Mr. Nuttel/);
  assert.doesNotMatch(louise, /Knowing that Mrs. Mallard was afflicted/);
});

test("batch-2 remakes use Mira open-ats, not raw keep-as-is extracts", () => {
  const gregor = readFileSync(new URL("./texts/he-woke-changed.json", import.meta.url), "utf8");
  const pattern = readFileSync(new URL("./texts/the-pattern.json", import.meta.url), "utf8");
  const nerve = readFileSync(new URL("./texts/it-was-not-nervousness.json", import.meta.url), "utf8");
  assert.doesNotMatch(gregor, /When Gregor Samsa woke one morning/);
  assert.doesNotMatch(gregor, /transformed in his bed/);
  assert.match(gregor, /would not fit under the covers/);
  assert.match(pattern, /locked gate/);
  assert.match(nerve, /Roosevelt/);
});

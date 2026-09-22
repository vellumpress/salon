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
import {
  FIRST_SESSION_RITUAL_IDS,
  RITUAL_LANES,
  RITUAL_PITCHES,
  type RitualLane,
} from "./rituals.ts";
import { SHELF, searchShelf, shelfWork } from "./shelf.ts";
import { isBoundLocal } from "./en-rights.ts";
import { placeFor } from "./places.ts";
import { readerIntro } from "../reader-intro.ts";
import type { Work } from "../literature.ts";

const LANE: Record<string, "unwind" | "before-sleep" | "waking-up"> = {
  "bliss-tokyo": "unwind",
  "masque-rio": "before-sleep",
  "the-pattern": "before-sleep",
  "garden-party-barcelona": "unwind",
  "boule-de-suif-istanbul": "unwind",
  "story-of-an-hour-buenos-aires": "before-sleep",
  "late-season": "unwind",
  "open-window-singapore": "waking-up",
  "miss-brill-adapted": "unwind",
  "the-nose-cape-town": "waking-up",
  "usher-prague": "before-sleep",
  "araby-seville": "before-sleep",
  "between-the-drop-and-the-water": "before-sleep",
  "prefer-not": "unwind",
};

const EXPECT = {
  "miss-brill-adapted": {
    title: "Katherine Mansfield, Miss Brill recast",
    opening: /^Miss Brill put on her coat the way other people put on a face/,
    last: /Menton kept casting itself without her/,
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
    opening: /^Dmitri Gurov came to Yalta in September/,
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
  "the-pattern": {
    title: "Charlotte Perkins Gilman, The Yellow Wallpaper recast",
    opening: /^John said the country would fix me/,
    last: /did not try to hold anyone in/,
    place: { label: "Hudson, New York", region: "us" },
    credit: /After Gilman, The Yellow Wallpaper, 1892/,
    scene: /wallpaper/i,
  },
  "bliss-tokyo": {
    title: "Katherine Mansfield, Bliss recast",
    opening: /^Haruka felt it in the elevator/,
    last: /pear tree look suddenly like stage dressing/,
    place: { label: "Tokyo", region: "jp" },
    credit: /After Mansfield, Bliss, 1918/,
    scene: /omotesando/i,
  },
  "open-window-singapore": {
    title: "Saki, The Open Window recast",
    opening: /^Adrian Tan arrived with letters of introduction/,
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
    opening: /^While the fever moved through the favelas and the hospital corridors like a red rumor with teeth, Príncipe Otávio/,
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
  "the-nose-cape-town": {
    title: "Nikolai Gogol, The Nose recast",
    opening: /^Senior Assessor van Wyk/,
    last: /exact as a held breath/,
    place: { label: "Cape Town", region: "za" },
    credit: /After Gogol, The Nose, 1836/,
    scene: /long street/i,
  },
  "garden-party-barcelona": {
    title: "Katherine Mansfield, The Garden Party recast",
    opening: /^They were still deciding where the marquee should go/,
    last: /could not yet carry home/,
    place: { label: "Barcelona", region: "es" },
    credit: /After Mansfield, The Garden Party, 1922/,
    scene: /sarri[aà]|lawn/i,
  },
  "usher-prague": {
    title: "Edgar Allan Poe, The Fall of the House of Usher recast",
    opening: /^I received Radek Uher/,
    last: /share one death, and keep it/,
    place: { label: "Prague", region: "cz" },
    credit: /After Poe, The Fall of the House of Usher, 1839/,
    scene: /vltava/i,
  },
  "araby-seville": {
    title: "James Joyce, Araby recast",
    opening: /^North Richmond Street had been a blind street in Joyce/,
    last: /ordinary failure of wanting/,
    place: { label: "Seville", region: "es" },
    credit: /After Joyce, Araby, 1914/,
    scene: /pureza/i,
  },
} as const;

const CUT_SHORT_IDS = [
  "he-woke-changed",
  "a-coat-worthy-of-respect",
  "what-she-borrowed",
  "it-was-not-nervousness",
  "during-carnival",
  "what-we-sold",
  "happy-prince-hong-kong",
  "hunger-artist-milan",
  "queen-of-spades-paris",
  "decapitated-chicken-lisbon",
] as const;

const NOVEL_REMAKE_IDS = [
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
] as const;

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
    "The Party in Sarrià",
    "The House Above the Vltava",
    "The Stall After Closing",
    "The Garden Party after",
    "The Fall of the House of Usher after",
    "Araby after",
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
  assert.equal(
    CLASSIC_LOCAL_WORKS.some((item) => item.author === "Salon"),
    false,
  );
  for (const id of NOVEL_REMAKE_IDS) {
    assert.equal(ADAPTED_WORKS.some((item) => item.id === id), false, id);
    assert.equal(CLASSIC_LOCAL_WORKS.some((item) => item.id === id), false, id);
  }
});

test("homepage search is local binds only — no Gutenberg-only dead ends", () => {
  const home = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
  assert.match(home, /useShelfSearch\("local"\)/);
  assert.doesNotMatch(home, /useShelfSearch\("fullPdf"\)/);

  assert.equal(LOCAL_WORKS.length, 715);
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

test("Madame Bovary Tokyo is soft-held off Adapted — not Featured, not a timed sit", () => {
  const id = "madame-bovary-tokyo";
  const gone = [
    "madame-bovary-tokyo-waking",
    "madame-bovary-tokyo-unwind",
    "madame-bovary-tokyo-before-sleep",
  ] as const;
  assert.equal(isAdaptedBySalon(id), false);
  assert.notEqual(curatorialTrack(id), "adapted");
  assert.notEqual(curatorialTrack(id), "featured");
  assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false);
  assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false);
  assert.equal((FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(id), false);
  assert.equal(ADAPTED_WORKS.some((item) => item.id === id), false);
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
  assert.equal(packed.scenes.length, 3);
  assert.match(packed.scenes[0]?.title ?? "", /Asaka/i);
  assert.ok(packed.scenes.some((scene) => /Hotel Glass/i.test(scene.title)));
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
  assert.equal(ADAPTED_BY_SALON_IDS.length, 14);
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

  const shortRemakes = [
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
  ] as const;
  assert.deepEqual([...ADAPTED_BY_SALON_IDS], [...shortRemakes]);
  for (const id of shortRemakes) {
    assert.ok(LANE[id], `${id} stays one whole remake on a ritual lane`);
    assert.equal(sitSuffix.test(id), false, id);
  }
  for (const id of NOVEL_REMAKE_IDS) {
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(LANE[id], undefined, `${id} is not a timed sit`);
    assert.equal(sitSuffix.test(id), false, id);
  }
});

test("FINAL LOCK KEEP 14 is live Adapted; CUT shorts and uninvented remakes stay off", () => {
  const uninvented = [
    "the-kiss-nice",
    "jewels-monaco",
    "nightingale-vienna",
    "rappaccini-florence",
    "tobermory-rome",
    "miss-brill-remake",
  ] as const;
  assert.equal(ADAPTED_WORKS.length, 14);
  assert.deepEqual(
    ADAPTED_WORKS.map((item) => item.id),
    [...ADAPTED_BY_SALON_IDS],
  );
  for (const id of CUT_SHORT_IDS) {
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.notEqual(curatorialTrack(id), "adapted", id);
    assert.notEqual(curatorialTrack(id), "featured", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(ADAPTED_WORKS.some((item) => item.id === id), false, id);
    assert.equal(CLASSIC_LOCAL_WORKS.some((item) => item.id === id), false, id);
    assert.equal(id in RITUAL_PITCHES, false, `${id} leftover ritual pitch`);
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${id} ${lane.id}`);
    }
  }
  for (const id of uninvented) {
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.equal(shelfWork(id), undefined, id);
    assert.equal(ADAPTED_WORKS.some((item) => item.id === id), false, id);
  }
  assert.equal(isAdaptedBySalon("miss-brill-adapted"), true);
  assert.equal(shelfWork("miss-brill-adapted")?.title, "Katherine Mansfield, Miss Brill recast");
});

test("novel remakes stay off Adapted, Featured, and ritual lanes", () => {
  const hostRequired = new Set([
    "madame-bovary-tokyo",
    "dorian-gray-shanghai",
    "anna-karenina-milan",
    "jane-eyre-singapore",
    "dracula-istanbul",
    "crime-punishment-cape-town",
    "tess-lisbon",
    "scarlet-letter-kyoto",
    "wuthering-heights-rio",
  ]);
  const classics: Record<string, { id: string; title: string }> = {
    "madame-bovary-tokyo": { id: "bovary", title: "Madame Bovary" },
    "dorian-gray-shanghai": { id: "dorian", title: "The Picture of Dorian Gray" },
    "anna-karenina-milan": { id: "anna", title: "Anna Karenina" },
    "dracula-istanbul": { id: "dracula", title: "Dracula" },
    "crime-punishment-cape-town": { id: "crime", title: "Crime and Punishment" },
    "age-of-innocence-venice": { id: "the-age-of-innocence", title: "The Age of Innocence" },
  };
  for (const id of NOVEL_REMAKE_IDS) {
    assert.equal(isAdaptedBySalon(id), false, id);
    assert.notEqual(curatorialTrack(id), "adapted", id);
    assert.notEqual(curatorialTrack(id), "featured", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal((FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(id), false, id);
    assert.equal(ADAPTED_WORKS.some((item) => item.id === id), false, id);
    assert.equal(CLASSIC_LOCAL_WORKS.some((item) => item.id === id), false, id);
    assert.equal(id in RITUAL_PITCHES, false, `${id} leftover ritual pitch`);
    for (const suffix of ["waking", "unwind", "before-sleep"] as const) {
      const sibling = `${id}-${suffix}`;
      assert.equal(isAdaptedBySalon(sibling), false, sibling);
      assert.equal(shelfWork(sibling), undefined, sibling);
    }
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${id} ${lane.id}`);
    }
    const packed = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { note: string; scenes: { title: string }[]; breaths: { text: string }[] };
    const full = JSON.parse(
      readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
    ) as { breaths: { text: string }[] };
    assert.ok(packed.scenes.length >= 1, id);
    assert.equal(full.breaths.length, packed.breaths.length, `${id} full sit`);
    assert.doesNotMatch(packed.note, /Host note \(required|Featured/i, id);
    if (hostRequired.has(id)) {
      assert.match(packed.note, /Warn the room before you Host it/, id);
      assert.match(shelfWork(id)?.intro ?? "", /warn the room before you Host it/i, id);
    } else {
      assert.doesNotMatch(packed.note, /Host it|Hosting/i, id);
      assert.doesNotMatch(shelfWork(id)?.intro ?? "", /Host it|Hosting/i, id);
    }
    const classic = classics[id];
    if (classic) {
      const source = SHELF.find((item) => item.id === classic.id);
      assert.ok(source, classic.id);
      assert.equal(source!.title, classic.title);
      assert.notEqual(source!.id, id);
    }
  }
});

test("novels-glam-10 remakes use Mira city reseats, not raw Gutenberg extracts", () => {
  const dorian = readFileSync(new URL("./texts/dorian-gray-shanghai.json", import.meta.url), "utf8");
  const anna = readFileSync(new URL("./texts/anna-karenina-milan.json", import.meta.url), "utf8");
  const jane = readFileSync(new URL("./texts/jane-eyre-singapore.json", import.meta.url), "utf8");
  const pride = readFileSync(
    new URL("./texts/pride-prejudice-buenos-aires.json", import.meta.url),
    "utf8",
  );
  const dracula = readFileSync(new URL("./texts/dracula-istanbul.json", import.meta.url), "utf8");
  const crime = readFileSync(
    new URL("./texts/crime-punishment-cape-town.json", import.meta.url),
    "utf8",
  );
  const age = readFileSync(new URL("./texts/age-of-innocence-venice.json", import.meta.url), "utf8");
  const tess = readFileSync(new URL("./texts/tess-lisbon.json", import.meta.url), "utf8");
  const scarlet = readFileSync(new URL("./texts/scarlet-letter-kyoto.json", import.meta.url), "utf8");
  const wuthering = readFileSync(
    new URL("./texts/wuthering-heights-rio.json", import.meta.url),
    "utf8",
  );
  assert.match(dorian, /Huangpu/);
  assert.match(dorian, /Bai Sheng|Du Yan/);
  assert.match(anna, /Via della Spiga/);
  assert.match(anna, /Anna Valenti/);
  assert.match(jane, /Katong/);
  assert.match(jane, /Mei-Lin Teo/);
  assert.match(pride, /Recoleta|Alvear/);
  assert.match(pride, /Elena Benítez|Sra\. Benítez/);
  assert.match(dracula, /Bosphorus|yalı/);
  assert.match(dracula, /Yunus Akman/);
  assert.match(crime, /Long Street|Table Mountain/);
  assert.match(crime, /Ruan Steyn/);
  assert.match(age, /Fenice/);
  assert.match(age, /Niccolò Archi/);
  assert.match(tess, /Alentejo|Tagus/);
  assert.match(tess, /Teresa Duarte|João Duarte/);
  assert.match(scarlet, /Kyoto/);
  assert.match(scarlet, /Hisako/);
  assert.match(wuthering, /Rio/);
  assert.match(wuthering, /Heitor|Catarina/);
  assert.doesNotMatch(wuthering, /Mr\. Lockwood, a soft coastal tenant/);
  assert.doesNotMatch(dorian, /Basil Hallward/);
  assert.doesNotMatch(jane, /Jane Eyre learned early/);
  assert.doesNotMatch(dracula, /Jonathan Harker steamed/);
  assert.doesNotMatch(crime, /Rodion Romanovich Raskolnikov/);
  assert.doesNotMatch(age, /Newland Archer arrived/);
  assert.doesNotMatch(tess, /Tess Durbeyfield walked/);
  assert.doesNotMatch(scarlet, /Hester Prynne stood/);
  assert.doesNotMatch(dorian, /The artist is the creator of beautiful things/);
  assert.doesNotMatch(
    pride,
    /It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife/,
  );
  assert.doesNotMatch(dracula, /Left Munich at 8:35/);
  assert.doesNotMatch(crime, /On an exceptionally hot evening early in July/);
  assert.doesNotMatch(age, /Christine Nilsson was singing in Faust/);
});

test("glam-10 remakes use Mira city reseats, not raw Gutenberg extracts", () => {
  const bliss = readFileSync(new URL("./texts/bliss-tokyo.json", import.meta.url), "utf8");
  const framton = readFileSync(new URL("./texts/open-window-singapore.json", import.meta.url), "utf8");
  const louise = readFileSync(
    new URL("./texts/story-of-an-hour-buenos-aires.json", import.meta.url),
    "utf8",
  );
  assert.match(bliss, /Omotesando/);
  assert.match(bliss, /Haruka/);
  assert.match(framton, /Bukit Timah/);
  assert.match(framton, /Adrian Tan/);
  assert.match(louise, /Recoleta/);
  assert.match(louise, /Luisa|Bernardo/);
  assert.doesNotMatch(bliss, /Although Bertha Young was thirty/);
  assert.doesNotMatch(bliss, /Bertha felt it in the elevator/);
  assert.doesNotMatch(framton, /My aunt will be down presently, Mr. Nuttel/);
  assert.doesNotMatch(framton, /Framton Nuttel arrived/);
  assert.doesNotMatch(louise, /Knowing that Mrs. Mallard was afflicted/);
});

test("KEEP-14 new remakes use Mira city reseats, not raw source extracts", () => {
  const garden = readFileSync(new URL("./texts/garden-party-barcelona.json", import.meta.url), "utf8");
  const usher = readFileSync(new URL("./texts/usher-prague.json", import.meta.url), "utf8");
  const araby = readFileSync(new URL("./texts/araby-seville.json", import.meta.url), "utf8");
  assert.match(garden, /Sarrià|Sarria/);
  assert.match(garden, /Laura|Sra\. Serra/);
  assert.match(usher, /Vltava/);
  assert.match(usher, /Radek Uher|Magdalena/);
  assert.match(araby, /Triana|Calle Pureza/);
  assert.match(araby, /Moreno/);
  assert.doesNotMatch(garden, /And after all the weather was ideal/);
  assert.doesNotMatch(usher, /During the whole of a dull, dark, and soundless day/);
  assert.doesNotMatch(araby, /North Richmond Street, being blind, was a quiet street/);
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

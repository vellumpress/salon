import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SHELF } from "./shelf.ts";
import { LOCAL_WORKS } from "./full-pdf.ts";
import { countryFor, isCityHubLabel } from "./countries.ts";
import { blurbFor, sentenceCount } from "./blurbs.ts";
import { isBoundLocal } from "./en-rights.ts";
import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";
import { curatorialTrack, NEXT_FEATURED_TRACK_IDS } from "./curatorial.ts";
import { FIRST_SESSION_RITUAL_IDS, RITUAL_LANES } from "./rituals.ts";

/** Full local novels whose stub openings were deleted so Pages cannot strand readers. */
const FULL_NOVEL_NO_STUB = [
  "the-painted-veil",
  "growth-of-the-soil",
  "the-good-soldier",
  "demian",
  "the-immoralist",
  "we",
  "blood-and-sand",
  "ecstasy",
  "letters-of-a-javanese-princess",
  "diary-of-a-chambermaid",
  "the-underdogs",
  "an-outcast-of-the-islands",
  "the-getting-of-wisdom",
  "noli-me-tangere",
  "the-story-of-gosta-berling",
  "poison-tree",
  "trooper-peter-halket",
  "martin-bircks-youth",
  "bliss",
  "steppenwolf",
  "shadowings",
  "krakatit",
  "a-hero-of-our-time",
  "short-stories-from-the-balkans",
  "a-hundred-and-seventy-chinese-poems",
] as const;

const FULL_NOVEL_NO_STUB_SET = new Set<string>(FULL_NOVEL_NO_STUB);

function openingUrl(id: string) {
  return new URL(`./openings/${id}.json`, import.meta.url);
}

function textWork(id: string) {
  return JSON.parse(
    readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8"),
  ) as {
    note?: string;
    scenes: { title: string; reentry?: string }[];
    breaths: { text: string }[];
  };
}

function assertNoStubOpening(id: string) {
  assert.equal(
    existsSync(fileURLToPath(openingUrl(id))),
    false,
    `${id} stub opening must be gone so loadLocalOpening hydrates full text`,
  );
}

test("every shelf work has a country that is not a map city hub", () => {
  const missing: string[] = [];
  const cities: string[] = [];
  for (const work of SHELF) {
    const country = countryFor(work);
    if (!country) missing.push(`${work.id} (${work.author}, ${work.language})`);
    else if (isCityHubLabel(country)) cities.push(`${work.id}=${country}`);
  }
  assert.deepEqual(missing, [], `missing country: ${missing.join("; ")}`);
  assert.deepEqual(cities, [], `city hub used as country: ${cities.join("; ")}`);
});

test("English is not dumped into a single country", () => {
  const localEnglish = LOCAL_WORKS.filter((work) => work.language === "English");
  const countries = new Set(localEnglish.map((work) => countryFor(work)));
  assert.ok(countries.has("United States"), "expected United States");
  assert.ok(countries.has("United Kingdom"), "expected United Kingdom");
  assert.ok(countries.has("Ireland"), "expected Ireland");
  assert.ok(countries.size > 8, `English countries too few: ${[...countries].join(", ")}`);
});

test("known origin overrides", () => {
  const byId = new Map(SHELF.map((work) => [work.id, work]));
  const expect = {
    dorian: "Ireland",
    dubliners: "Ireland",
    "african-farm": "South Africa",
    botchan: "Japan",
    "bel-ami": "France",
    liliom: "Hungary",
    "the-cherry-orchard": "Russia",
    underdogs: "Mexico",
    madmen: "Argentina",
    wallpaper: "United States",
    gatsby: "United States",
    "the-bridge-of-san-luis-rey": "United States",
    "the-sun-also-rises": "United States",
    "lolly-willowes": "United Kingdom",
    "a-passage-to-india": "United Kingdom",
    "plum-bun": "United States",
    "plain-tales-from-the-hills": "India",
    "kwaidan-stories-and-studies-of-strange-things": "Japan",
    "chita-a-memory-of-last-island": "United States",
    banjo: "France",
    "constab-ballads": "Jamaica",
    basilio: "Portugal",
    rur: "Czechia",
    odessa: "Ukraine",
    "attendants-confession": "Brazil",
    rashomon: "Japan",
    "high-wind-jamaica": "Jamaica",
    "noli-me-tangere": "Philippines",
    vera: "United Kingdom",
    "the-home-and-the-world": "India",
    "the-immoralist": "France",
    "where-angels-fear-to-tread": "United Kingdom",
    "the-gadfly": "Ireland",
    "letters-of-a-javanese-princess": "Indonesia",
    "blood-and-sand": "Spain",
    ecstasy: "Netherlands",
    "an-outcast-of-the-islands": "United Kingdom",
    "the-underdogs": "Mexico",
    "diary-of-a-chambermaid": "France",
    "the-painted-veil": "United Kingdom",
    "the-good-soldier": "United Kingdom",
    "growth-of-the-soil": "Norway",
    "nada-the-lily": "South Africa",
    "all-quiet-on-the-western-front": "Germany",
    we: "Russia",
    "the-story-of-gosta-berling": "Sweden",
    thais: "France",
    demian: "Germany",
    "death-comes-for-the-archbishop": "United States",
    "the-getting-of-wisdom": "Australia",
    bliss: "New Zealand",
    "a-hundred-and-seventy-chinese-poems": "China",
    "martin-bircks-youth": "Sweden",
    harmonium: "United States",
    "on-a-chinese-screen": "United Kingdom",
    futility: "United Kingdom",
    "poison-tree": "India",
    "trooper-peter-halket": "South Africa",
    "nacha-regules": "Argentina",
    krakatit: "Czechia",
    "the-peasants": "Poland",
    cane: "United States",
  } as const;
  for (const [id, country] of Object.entries(expect)) {
    const work = byId.get(id);
    assert.ok(work, id);
    assert.equal(countryFor(work!), country, id);
  }
});

test("local shelf copy never uses Featured product language", () => {
  const hits: string[] = [];
  for (const work of LOCAL_WORKS) {
    const blob = [work.intro, work.opening, blurbFor(work)].filter(Boolean).join("\n");
    if (/\bFeatured(?:-track)?\b|\bFEATURED\b/.test(blob)) hits.push(work.id);
  }
  assert.deepEqual(hits, []);
});

test("every local homepage work has a one-sentence blurb", () => {
  const missing: string[] = [];
  const multi: string[] = [];
  for (const work of LOCAL_WORKS) {
    const blurb = blurbFor(work);
    if (!blurb) missing.push(work.id);
    else if (sentenceCount(blurb) !== 1) multi.push(`${work.id}: ${blurb}`);
  }
  assert.deepEqual(missing, [], `missing blurb: ${missing.join("; ")}`);
  assert.deepEqual(multi, [], `not one sentence: ${multi.join(" | ")}`);
});

test("2026-09-17 LE binds open at story start, not chrome", () => {
  const expect = {
    "the-sun-also-rises": {
      scene: /Book I/i,
      opening: /^Robert Cohn was once middleweight boxing champion of Princeton/,
    },
    "lolly-willowes": {
      scene: /Chapter I/i,
      opening: /^When her father died, Laura Willowes went to live in London/,
    },
    "a-passage-to-india": {
      scene: /Part I.*Mosque/i,
      opening: /^Except for the Marabar Caves/,
    },
    "plum-bun": {
      scene: /^Home$/i,
      opening: /^Opal Street, as streets go, is no jewel of the first water/,
    },
    "the-cherry-orchard": {
      scene: /^ACT ONE$/i,
      opening: /^\[A room which is still called the nursery\./,
    },
    quicksand: {
      scene: /^Chapter I$/,
      opening: /^Helga Crane sat alone in her room, which at that hour, eight in the evening, was in soft gloom/,
    },
    "attendants-confession": {
      scene: /A human document/i,
      opening: /^So it really seems to you that what happened to me in 1860 is worth while writing down/,
    },
    rashomon: {
      scene: /Evening under Rashōmon/i,
      opening: /^It was evening\./,
    },
    "high-wind-jamaica": {
      scene: /Ferndale/i,
      opening: /^One of the fruits of Emancipation/,
    },
    "noli-me-tangere": {
      scene: /Capitan Tiago/i,
      opening: /^On the last of October Don Santiago de los Santos/,
    },
    vera: {
      scene: /cliff garden/i,
      opening: /^When the doctor had gone/,
    },
    "on-a-chinese-screen": {
      scene: /My Lady/i,
      opening: /^"I really think I can make something of it," she said/,
    },
    futility: {
      scene: /Simbirsk/i,
      opening: /^When the \*Simbirsk\*/,
    },
    "poison-tree": {
      scene: /storm/i,
      opening: /^Nagendra Natha Datta is about to travel by boat/,
    },
    "trooper-peter-halket": {
      scene: /Kopje fire/i,
      opening: /^It was a dark night/,
    },
    "enchanted-april": {
      scene: /Chapter 1/,
      opening: /^It began in a Woman/,
    },
    "mr-fortunes-maggot": {
      scene: /Fanua call/i,
      opening: /^Though the Reverend Timothy Fortune had spent three years/,
    },
    "the-house-of-mirth": {
      scene: /Book I/i,
      opening: /^Selden paused in surprise/,
    },
    "the-home-and-the-world": {
      scene: /Bimala/i,
      opening: /^Mother, today there comes back to mind/,
    },
    "where-angels-fear-to-tread": {
      scene: /Chapter I/,
      opening: /^They were all at Charing Cross/,
    },
    "the-gadfly": {
      scene: /CHAPTER I/i,
      opening: /^Arthur sat in the library/,
    },
    botchan: {
      scene: /Chapter I.*Scar/i,
      opening: /^Because of an hereditary recklessness, I have been playing always a losing game since my childhood/,
    },
    "the-immoralist": {
      scene: /Freedom line/i,
      opening: /^My dear friends, I knew you were faithful/,
    },
    "letters-of-a-javanese-princess": {
      scene: /Cloistered arms/i,
      opening: /^I have longed to make the acquaintance/,
    },
    "blood-and-sand": {
      scene: /Fight-day breakfast/i,
      opening: /^Juan Gallardo breakfasted early/,
    },
    "the-painted-veil": {
      scene: /The door/i,
      opening: /^She gave a startled cry/,
    },
    "the-good-soldier": {
      scene: /A good glove/i,
      opening: /^This is the saddest story I have ever heard/,
    },
    "growth-of-the-soil": {
      scene: /The first sack/i,
      opening: /^The long, long road over the moors/,
    },
    "nada-the-lily": {
      scene: /The Boy Chaka Prophesies/,
      opening: /^You ask me, my father/,
    },
    "all-quiet-on-the-western-front": {
      scene: /Chapter I/i,
      opening: /^We are at rest five miles behind the front/,
    },
    we: {
      scene: /The wisest of lines/i,
      opening: /^I feel my cheeks are burning/,
    },
    "the-story-of-gosta-berling": {
      scene: /The pulpit/i,
      opening: /^At last the minister stood in the pulpit/,
    },
    thais: {
      scene: /Lotus/,
      opening: /^In those days there were many hermits/,
    },
    demian: {
      scene: /Two worlds/i,
      opening: /^I will begin my story with an event of the time when I was ten or eleven/,
    },
    "death-comes-for-the-archbishop": {
      scene: /CRUCIFORM TREE/i,
      opening: /^ONE afternoon in the autumn of 1851 a solitary horseman/,
    },
    "the-getting-of-wisdom": {
      scene: /Dirty sheet/i,
      opening: /^The four children were lying on the grass/,
    },
    bliss: {
      scene: /Radiant mirror/i,
      opening: /^Although Bertha Young was thirty/,
    },
    "a-hundred-and-seventy-chinese-poems": {
      scene: /Winter Night/i,
      opening: /^My bed is so empty/,
    },
    dubliners: {
      scene: /Araby/i,
      opening: /^North Richmond Street, being blind/,
    },
    gitanjali: {
      scene: /Poem 1/i,
      opening: /^Thou hast made me endless/,
    },
    "martin-bircks-youth": {
      scene: /Childhood garden/i,
      opening: /^Martin Birck was a little child/,
    },
    harmonium: {
      scene: /The Snow Man/i,
      opening: /^One must have a mind of winter/,
    },
    "nacha-regules": {
      scene: /Chapter I/i,
      opening: /^An August night! Hot with the fever of her adolescence as a national capital, Buenos Aires was ablaze/,
    },
    krakatit: {
      scene: /Chapter I/i,
      opening: /^With the evening the fog of the cold, damp day grew thicker/,
    },
    "the-peasants": {
      scene: /Chapter I/i,
      opening: /Praised be Jesus Christ!/,
    },
    cane: {
      scene: /Karintha/i,
      opening: /^Her skin is like dusk on the eastern horizon/,
    },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.match(work!.opening ?? "", want.opening, `${id} shelf opening`);
    if (FULL_NOVEL_NO_STUB_SET.has(id)) {
      assertNoStubOpening(id);
    }
    const packed = FULL_NOVEL_NO_STUB_SET.has(id)
      ? textWork(id)
      : (JSON.parse(
          readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
        ) as { scenes: { title: string }[]; breaths: { text: string }[] });
    if (FULL_NOVEL_NO_STUB_SET.has(id)) {
      assert.ok(packed.scenes[0]?.title, `${id} scene`);
      if (id === "the-story-of-gosta-berling") {
        assert.ok(
          packed.breaths.some((breath) =>
            /long lake, the rich plains and the blue mountains/i.test(breath.text),
          ),
          `${id} landscape open in full text`,
        );
      } else {
        const openNeedle = new RegExp(want.opening.source.replace(/^\^/, ""), "i");
        assert.ok(
          packed.breaths.some((breath) => openNeedle.test(breath.text)),
          `${id} open breath in full text`,
        );
      }
    } else {
      assert.match(packed.scenes[0]?.title ?? "", want.scene, `${id} scene`);
      assert.match(packed.breaths[0]?.text ?? "", want.opening, `${id} open breath`);
    }
    const early = packed.breaths.slice(0, 12).map((b) => b.text).join(" ");
    assert.doesNotMatch(early, /project gutenberg|standard ebooks|table of contents|transcriber/i, id);
    if (id === "quicksand") {
      assert.equal(packed.scenes[0]?.title, "Chapter I");
      assert.equal(packed.scenes.length, 25);
      assert.equal(packed.breaths.length, 685);
      assert.match(packed.breaths[0]?.text ?? "", /^Helga Crane sat alone/);
      assert.match(packed.breaths.at(-1)?.text ?? "", /fifth child/);
      assert.match(
        packed.breaths.map((b) => b.text).join(" "),
        /An observer would have thought her well fitted/,
      );
    }
    if (id === "attendants-confession") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Here it is\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Great Mogul|dead man's shoes|dead man’s shoes/i,
      );
    }
    if (id === "rashomon") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /besides this single man, there was no one\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /earthquakes, cyclones, fires and famines|desolation was extraordinary/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "high-wind-jamaica") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /ready to eat snakes as ever\.?$/);
      assert.match(packed.breaths.map((b) => b.text).join(" "), /Ferndale/);
      assert.match(packed.breaths.map((b) => b.text).join(" "), /negress/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "noli-me-tangere") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Chinese water-carrier finds it convenient\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /project gutenberg|Ibarra|Crisostomo|Crisóstomo/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "vera") {
      assert.match(packed.breaths.map((b) => b.text).join(" "), /felt nothing/);
      assert.match(packed.breaths.at(-1)?.text ?? "", /towards the gate again\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Wemyss|Everard/i,
      );
    }
    if (id === "on-a-chinese-screen") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Tunbridge Wells\."?$/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "futility") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Nikolai Vasilievich/);
      assert.match(packed.breaths.map((b) => b.text).join(" "), /table-cloth/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Wharton|preface/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "poison-tree") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /heavy storm of rain\.?$/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "trooper-peter-halket") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /keep awake the whole night beside it\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /\bstranger\b/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "enchanted-april") {
      assert.equal(packed.scenes[0]?.title, "Chapter 1");
      assert.equal(packed.breaths.length, 48);
      assert.match(packed.breaths[0]?.text ?? "", /Agony Column/);
      assert.match(packed.breaths.map((b) => b.text).join(" "), /Wistaria|wistaria/);
    }
    if (id === "mr-fortunes-maggot") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /call to go to the island of Fanua/);
    }
    if (id === "the-house-of-mirth") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /How nice of you to come to my rescue/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Tuxedo|Bellomont|three-fifteen/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-home-and-the-world") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /path of the metre\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /\bMOTHER\b/);
      assert.ok(packed.breaths.some((breath) => /\*sari\*/.test(breath.text)));
      assert.match(packed.breaths.map((b) => b.text).join(" "), /ideal wife/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "where-angels-fear-to-tread") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /footwarmer/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Gino|baby|carriage accident/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-gadfly") {
      assert.ok(packed.breaths.some((breath) => /Fragola!/.test(breath.text)));
    }
    if (id === "botchan") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /scar will be there until my death\.?$/);
      const words = packed.breaths.map((b) => b.text).join(" ").trim().split(/\s+/).length;
      assert.equal(words, 260);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /chestnut tree|Yamashiro-ya|Kantaro/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-immoralist") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /talking to myself\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /preface|Bussy|Gide/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "letters-of-a-javanese-princess") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /infinitely far\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Couperus|foreword|\[\d+\]/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "blood-and-sand") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /not made much impression\.?$/);
      assert.ok(packed.breaths.some((breath) => /\*la alternativa\*/.test(breath.text)));
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-painted-veil") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /How shall I get out\?/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /PREFACE|preface/i);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-good-soldier") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /I had known the shallows\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /PART I/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "growth-of-the-soil") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /in search of peace\.?$/);
      assert.ok(packed.breaths.some((breath) => /\bLapp\b/.test(breath.text)));
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "all-quiet-on-the-western-front") {
      assert.match(packed.breaths[0]?.text ?? "", /beef and haricot beans/);
      assert.ok(packed.breaths.some((breath) => /now that is decent/.test(breath.text)));
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /epigraph|this book is to be neither/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "we") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /despite my limitations\?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /FOREWORD|foreword|This is merely a copy/i,
      );
      assert.ok(packed.breaths.some((breath) => /\*Integral\*/.test(breath.text)));
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-story-of-gosta-berling") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Captain Christian Bergh\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /preface|translator/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "thais") {
      assert.match(packed.scenes[0]?.title ?? "", /Lotus/);
      assert.match(packed.breaths[0]?.text ?? "", /Nile/);
      assert.equal(packed.breaths.length, 48);
      assert.doesNotMatch(packed.breaths[0]?.text ?? "", /ANATOLE FRANCE/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "demian") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Christmas was kept\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Abraxas|Max Demian/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "death-comes-for-the-archbishop") {
      assert.match(packed.breaths[0]?.text ?? "", /^ONE afternoon in the autumn of 1851/);
      assert.equal(packed.scenes[0]?.title, "THE CRUCIFORM TREE");
      assert.doesNotMatch(packed.breaths[0]?.text ?? "", /Sabine|AT ROME/i);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "the-getting-of-wisdom") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /said Pin, who was practical\.?$/);
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "bliss") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /infallibly\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Lottie and Kezia|Prelude/i,
      );
    }
    if (id === "a-hundred-and-seventy-chinese-poems") {
      assert.equal(packed.scenes[0]?.title, "Winter Night");
      assert.notEqual(packed.scenes[0]?.title, "Battle");
      const winter = packed.breaths.slice(0, 4).map((b) => b.text).join(" ");
      assert.match(winter, /carry me back to you!$/);
      assert.doesNotMatch(winter, /\bBattle\b/);
    }
    if (id === "dubliners") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /anguish and anger\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /The Dead|Gabriel Conroy/i);
    }
    if (id === "gitanjali") {
      assert.match(packed.breaths.slice(-3).map((b) => b.text).join(" "), /friend who art my lord/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /Yeats|Introduction/i);
    }
    if (id === "harmonium") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /the nothing that is\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Earthy Anecdote|bucks went clattering/i,
      );
    }
    if (!FULL_NOVEL_NO_STUB_SET.has(id) && id === "martin-bircks-youth") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /near to weeping\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /translator|preface|C\. W\. S/i,
      );
    }
  }
});

test("Silhouettes opens in sentence case, not PG first-word ALL-CAPS", () => {
  const work = SHELF.find((item) => item.id === "silhouettes");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.match(work!.opening ?? "", /^The sea lies quieted beneath/);
  assert.equal(work!.gutenberg, 29531);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/silhouettes.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/silhouettes.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /At Dieppe/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^The sea lies quieted beneath/);
  const early = packed.breaths.map((breath) => breath.text);
  assert.equal(early[0], "At Dieppe.");
  assert.equal(early[1], "After Sunset.");
  assert.equal(early[2], "The sea lies quieted beneath");
  assert.equal(early.at(-1), "Look down upon the sea.");
  assert.equal(
    early.includes("On the Beach."),
    false,
    "open-at should stop before On the Beach",
  );
  for (const pack of [packed, full]) {
    const joined = pack.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /\bTHE sea\b/);
    assert.doesNotMatch(joined, /\bNIGHT, a grey\b/);
    assert.doesNotMatch(joined, /\bAFTER SUNSET\b/);
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = pack.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});

test("The Attendant’s Confession opens in sentence case and stops before the Mogul flourish", () => {
  const work = SHELF.find((item) => item.id === "attendants-confession");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 21040);
  assert.match(work!.opening ?? "", /^So it really seems to you/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/attendants-confession.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/attendants-confession.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /A human document/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^So it really seems to you/);
  assert.equal(packed.breaths.at(-1)?.text, "Here it is.");
  assert.equal(
    packed.breaths.some((breath) => /Great Mogul/.test(breath.text)),
    false,
    "open-at should stop before the Mogul/shoes flourish",
  );
  assert.match(full.breaths[0]?.text ?? "", /^So it really seems to you/);
  assert.match(full.breaths.at(-1)?.text ?? "", /Blessed are they who possess/);
  assert.equal(
    full.breaths.some((breath) => /fortune-teller/i.test(breath.text)),
    false,
    "full text should end before The Fortune-Teller",
  );
  for (const pack of [packed, full]) {
    const joined = pack.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = pack.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});

test("Rashōmon opens in sentence case and binds only the title story", () => {
  const work = SHELF.find((item) => item.id === "rashomon");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 78105);
  assert.equal(work!.title, "Rashōmon");
  assert.match(work!.opening ?? "", /^It was evening\./);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/rashomon.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/rashomon.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Evening under Rashōmon/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^It was evening\./);
  assert.equal(packed.breaths.at(-1)?.text, "All the same, besides this single man, there was no one.");
  assert.equal(
    packed.breaths.some((breath) => /earthquakes, cyclones, fires and famines/.test(breath.text)),
    false,
    "open-at should stop before the calamity catalogue",
  );
  assert.match(full.breaths[0]?.text ?? "", /^It was evening\./);
  assert.match(full.breaths.at(-1)?.text ?? "", /streets of Kyōto to rob/);
  assert.equal(
    full.breaths.some((breath) => /\bLICE\b|Mori Gonnoshin|twenty-sixth day of the eleventh/.test(breath.text)),
    false,
    "full text should bind only Rashōmon, not later stories in PG 78105",
  );
  for (const pack of [packed, full]) {
    const joined = pack.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = pack.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});


test("On a Chinese Screen opens on My Lady’s Parlour and binds only that sketch", () => {
  const work = SHELF.find((item) => item.id === "on-a-chinese-screen");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 48788);
  assert.equal(work!.title, "On a Chinese Screen");
  assert.equal(work!.author, "W. Somerset Maugham");
  assert.match(work!.opening ?? "", /^"I really think I can make something of it," she said/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/on-a-chinese-screen.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/on-a-chinese-screen.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /My Lady/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^"I really think I can make something of it," she said/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /Tunbridge Wells\."?$/);
  assert.equal(full.breaths.length, packed.breaths.length, "full bind is the Host sit, not the book");
  assert.equal(work!.breaths, packed.breaths.length);
  for (const pack of [packed, full]) {
    const joined = pack.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
  }
});

test("The Home and the World is a full local novel bind, not the mirror-prayer stub", () => {
  const work = SHELF.find((item) => item.id === "the-home-and-the-world");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 7166);
  assert.equal(work!.title, "The Home and the World");
  assert.equal(work!.author, "Rabindranath Tagore (tr. Surendranath Tagore)");
  assert.equal(work!.year, 1916);
  assert.match(work!.opening ?? "", /^Mother, today there comes back to mind/);
  assert.equal(existsSync(new URL("./openings/the-home-and-the-world.json", import.meta.url)), true);
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-home-and-the-world.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[]; breaths: { text: string }[] };
  const joined = full.breaths.map((breath) => breath.text).join("\n");
  assert.equal(full.scenes.length, 12);
  assert.equal(full.breaths.length, 1461);
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(joined, /Mother, today there comes back to mind/i);
  assert.match(full.breaths.at(-1)?.text ?? "", /bullet through the heart/);
  assert.doesNotMatch(joined, /project gutenberg/i);
  assert.doesNotMatch(work!.intro ?? "", /Featured-track|Recommend/i);
});


test("The Story of Gösta Berling is a full local novel bind, not the pulpit stub", () => {
  const work = SHELF.find((item) => item.id === "the-story-of-gosta-berling");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 56158);
  assert.equal(work!.title, "The Story of Gösta Berling");
  assert.equal(work!.author, "Selma Lagerlöf (tr. Pauline Bancroft Flach)");
  assert.equal(work!.year, 1898);
  assert.match(work!.opening ?? "", /^At last the minister stood in the pulpit/);
  assert.equal(existsSync(new URL("./openings/the-story-of-gosta-berling.json", import.meta.url)), false);
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-story-of-gosta-berling.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 36);
  assert.equal(full.breaths.length, 3122);
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(full.breaths[0]?.text ?? "", /long lake, the rich plains and the blue mountains/);
  assert.match(full.breaths.at(-1)?.text ?? "", /^THE END$/);
  assert.doesNotMatch(work!.intro ?? "", /Featured-track|Recommend|cold-open/i);
  const alias = SHELF.find((item) => item.id === "gosta");
  assert.ok(alias);
  assert.equal(alias!.local, undefined);
});

test("Bliss is the full collection bind; bliss-and-other-stories stays its own shelf row", () => {
  const work = SHELF.find((item) => item.id === "bliss");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 44385);
  assert.equal(work!.title, "Bliss");
  assert.equal(work!.author, "Katherine Mansfield");
  assert.equal(work!.year, 1920);
  assert.match(work!.opening ?? "", /^Although Bertha Young was thirty/);
  assert.equal(existsSync(new URL("./openings/bliss.json", import.meta.url)), false);
  const full = JSON.parse(
    readFileSync(new URL("./texts/bliss.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 14);
  assert.equal(full.breaths.length, 1603);
  assert.equal(work!.breaths, full.breaths.length);
  assert.equal(full.scenes[0]?.title, "Bliss");
  assert.notEqual(full.scenes[0]?.title, "Prelude");
  assert.ok(full.scenes.some((scene) => scene.title === "Prelude"));
  assert.ok(full.scenes.findIndex((scene) => scene.title === "Prelude") > 0);
  assert.match(full.breaths[0]?.text ?? "", /^Although Bertha Young was thirty/);
  assert.doesNotMatch(work!.intro ?? "", /Featured-track|Recommend|cold-open/i);
  const collection = SHELF.find((item) => item.id === "bliss-and-other-stories");
  assert.ok(collection);
  assert.equal(collection!.local, true);
  assert.match(collection!.opening ?? "", /^Although Bertha Young was thirty/);
  assert.equal(collection!.breaths, 1603);
  assert.equal(existsSync(new URL("./openings/bliss-and-other-stories.json", import.meta.url)), false);
  const other = JSON.parse(
    readFileSync(new URL("./texts/bliss-and-other-stories.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string }[]; breaths: { text: string }[] };
  assert.equal(other.scenes[0]?.title, "Bliss");
  assert.match(other.breaths[0]?.text ?? "", /^Although Bertha Young was thirty/);
  assert.equal(other.scenes.length, 14);
  assert.equal(other.breaths.length, 1603);
});

test("A Hundred and Seventy Chinese Poems opens on Winter Night, not Battle", () => {
  const work = SHELF.find((item) => item.id === "a-hundred-and-seventy-chinese-poems");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 42290);
  assert.equal(work!.title, "A Hundred and Seventy Chinese Poems");
  assert.equal(work!.author, "Various (tr. Arthur Waley)");
  assert.equal(work!.year, 1918);
  assert.match(work!.opening ?? "", /^My bed is so empty/);
  assert.equal(
    existsSync(new URL("./openings/a-hundred-and-seventy-chinese-poems.json", import.meta.url)),
    false,
  );
  const full = JSON.parse(
    readFileSync(new URL("./texts/a-hundred-and-seventy-chinese-poems.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { id: string; title: string }[]; breaths: { sceneId: string; text: string }[] };
  assert.match(full.note, /Winter Night/);
  assert.match(full.note, /not Battle/);
  assert.doesNotMatch(full.note, /open on Battle/i);
  assert.equal(full.scenes[0]?.title, "Winter Night");
  assert.notEqual(full.scenes[0]?.title, "Battle");
  assert.ok(full.scenes.some((scene) => scene.title === "Battle"));
  const winter = full.breaths.filter((breath) => breath.sceneId === full.scenes[0]?.id);
  assert.equal(winter.length, 4);
  assert.match(winter[0]?.text ?? "", /^My bed is so empty/);
  assert.match(winter.at(-1)?.text ?? "", /carry me back to you!$/);
  assert.doesNotMatch(winter.map((breath) => breath.text).join(" "), /\bBattle\b/);
  assert.equal(full.scenes.length, 140);
  assert.equal(full.breaths.length, 3196);
  assert.equal(work!.breaths, full.breaths.length);
});

test("Dubliners opens on Araby only, and the cycle continues after the sit", () => {
  const work = SHELF.find((item) => item.id === "dubliners");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 2814);
  assert.equal(work!.title, "Dubliners");
  assert.equal(work!.author, "James Joyce");
  assert.equal(work!.year, 1914);
  assert.match(work!.opening ?? "", /^North Richmond Street, being blind/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/dubliners.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/dubliners.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string }[]; breaths: { text: string }[] };
  assert.match(packed.note, /Araby only/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /Araby only/);
  assert.match(packed.scenes[0]?.title ?? "", /Araby/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^North Richmond Street, being blind/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /anguish and anger\.?$/);
  assert.doesNotMatch(packed.breaths.map((breath) => breath.text).join(" "), /The Dead|Gabriel Conroy/i);
  assert.match(full.breaths[0]?.text ?? "", /^North Richmond Street, being blind/);
  assert.equal(full.scenes[0]?.title, "Araby");
  assert.ok(full.scenes.some((scene) => scene.title === "The Dead"));
  assert.match(full.breaths.at(-1)?.text ?? "", /all the living and the dead/);
  assert.ok(full.breaths.length > packed.breaths.length, "full collection stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.equal(full.scenes.length, 15);
});

test("Gitanjali opens on poem 1 and skips the Yeats introduction", () => {
  const work = SHELF.find((item) => item.id === "gitanjali");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 7164);
  assert.equal(work!.title, "Gitanjali");
  assert.equal(work!.author, "Rabindranath Tagore");
  assert.equal(work!.year, 1912);
  assert.match(work!.opening ?? "", /^Thou hast made me endless/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/gitanjali.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/gitanjali.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /Skip the Yeats introduction/);
  assert.match(packed.note, /poem 1/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /Never the Yeats introduction/);
  assert.match(packed.scenes[0]?.title ?? "", /Poem 1/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Thou hast made me endless/);
  assert.match(packed.breaths.slice(-3).map((breath) => breath.text).join(" "), /friend who art my lord/);
  assert.match(full.breaths[0]?.text ?? "", /^Thou hast made me endless/);
  assert.doesNotMatch(
    full.breaths.slice(0, 20).map((breath) => breath.text).join(" "),
    /Yeats|INTRODUCTION/i,
  );
  assert.ok(full.breaths.length > packed.breaths.length, "later offerings stay after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Harmonium opens on The Snow Man only, not Earthy Anecdote", () => {
  const work = SHELF.find((item) => item.id === "harmonium");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.title, "Harmonium");
  assert.equal(work!.author, "Wallace Stevens");
  assert.equal(work!.year, 1923);
  assert.match(work!.opening ?? "", /^One must have a mind of winter/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/harmonium.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/harmonium.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string }[]; breaths: { text: string }[] };
  assert.match(packed.note, /The Snow Man/);
  assert.match(packed.note, /never Earthy Anecdote|Never Earthy Anecdote/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /The Snow Man/);
  assert.match(full.note, /never Earthy Anecdote/);
  assert.equal(full.scenes.length, 121);
  assert.match(full.scenes[0]?.title ?? "", /^The Snow Man$/);
  assert.match(packed.scenes[0]?.title ?? "", /The Snow Man/i);
  assert.equal(packed.scenes.length, 1);
  assert.match(packed.scenes[0]?.reentry ?? "", /^One must have a mind of winter/);
  assert.match(packed.breaths[0]?.text ?? "", /^One must have a mind of winter/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /the nothing that is\.?$/);
  assert.doesNotMatch(
    packed.breaths.map((breath) => breath.text).join(" "),
    /Earthy Anecdote|bucks went clattering/i,
  );
  assert.match(full.breaths[0]?.text ?? "", /^One must have a mind of winter/);
  assert.ok(
    full.scenes.some((scene) => scene.title === "Earthy Anecdote"),
    "full collection keeps Earthy Anecdote",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full collection stays after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.doesNotMatch(work!.intro ?? "", /Featured-track|Recommend|cold-open/i);
});

test("Martin Birck's Youth is a full local novel bind and skips the Stork preface", () => {
  const work = SHELF.find((item) => item.id === "martin-bircks-youth");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 78363);
  assert.equal(work!.title, "Martin Birck's Youth");
  assert.equal(work!.author, "Hjalmar Söderberg (tr. Charles Wharton Stork)");
  assert.equal(work!.year, 1930);
  assert.match(work!.opening ?? "", /^Martin Birck was a little child/);
  assert.equal(existsSync(new URL("./openings/martin-bircks-youth.json", import.meta.url)), false);
  const full = JSON.parse(
    readFileSync(new URL("./texts/martin-bircks-youth.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string }[]; breaths: { text: string }[] };
  assert.equal(full.scenes.length, 31);
  assert.equal(full.breaths.length, 545);
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(full.breaths[0]?.text ?? "", /^Martin Birck was a little child/);
  assert.doesNotMatch(
    full.breaths.slice(0, 12).map((breath) => breath.text).join(" "),
    /C\. W\. S|enfant terrible|PREFACE/i,
  );
  assert.doesNotMatch(work!.intro ?? "", /Featured-track|Recommend|cold-open/i);
});

test("full local novels have no stub opening; hydrateLocal serves the complete bind", () => {
  const expect = {
    "the-painted-veil": {
      gutenberg: 64682,
      title: "The Painted Veil",
      author: "W. Somerset Maugham",
      year: 1925,
      opening: /^She gave a startled cry/,
      breaths: 1903,
      scenes: 80,
      last: /^THE END$/,
      intro: /amah/,
    },
    "growth-of-the-soil": {
      gutenberg: 10984,
      title: "Growth of the Soil",
      author: "Knut Hamsun (tr. W. W. Worster)",
      year: 1917,
      opening: /^The long, long road over the moors/,
      breaths: 3246,
      last: /^THE END$/,
      intro: /Sámi/,
    },
    "the-good-soldier": {
      gutenberg: 2775,
      title: "The Good Soldier",
      author: "Ford Madox Ford",
      year: 1915,
      opening: /^This is the saddest story I have ever heard/,
      breaths: 4104,
    },
    demian: {
      gutenberg: 74222,
      title: "Demian",
      author: "Hermann Hesse (tr. N. H. Priday)",
      year: 1923,
      opening: /^I will begin my story with an event of the time when I was ten or eleven/,
      breaths: 774,
    },
    "the-immoralist": {
      gutenberg: 78975,
      title: "The Immoralist",
      author: "André Gide (tr. Dorothy Bussy)",
      year: 1902,
      opening: /^My dear friends, I knew you were faithful/,
      breaths: 591,
      intro: /freedom/i,
    },
    we: {
      gutenberg: 61963,
      title: "We",
      author: "Yevgeny Zamyatin (tr. Gregory Zilboorg)",
      year: 1924,
      opening: /^I feel my cheeks are burning/,
      breaths: 4528,
    },
    "blood-and-sand": {
      gutenberg: 54222,
      title: "Blood and Sand",
      author: "Vicente Blasco Ibáñez (tr. Mrs. W. A. Gillespie)",
      year: 1908,
      opening: /^Juan Gallardo breakfasted early/,
      breaths: 2173,
    },
    ecstasy: {
      gutenberg: 37770,
      title: "Ecstasy",
      author: "Louis Couperus (tr. Alexander Teixeira de Mattos)",
      year: 1919,
      opening: /^Dolf Van Attema/,
      breaths: 1070,
      last: /^THE END$/,
    },
    "letters-of-a-javanese-princess": {
      gutenberg: 34647,
      title: "Letters of a Javanese Princess",
      author: "Raden Adjeng Kartini (tr. Agnes Louise Symmers)",
      year: 1920,
      opening: /^I have longed to make the acquaintance/,
      breaths: 1484,
      intro: /Indian world/,
    },
    "diary-of-a-chambermaid": {
      gutenberg: 44303,
      title: "The Diary of a Chambermaid",
      author: "Octave Mirbeau",
      year: 1900,
      opening: /^To-day, September 14/,
      breaths: 2573,
    },
    "the-underdogs": {
      gutenberg: 549,
      title: "The Underdogs",
      author: "Mariano Azuela (tr. E. Munguía, Jr.)",
      year: 1929,
      opening: /^"That's no animal/,
      breaths: 1223,
    },
    "an-outcast-of-the-islands": {
      gutenberg: 638,
      title: "An Outcast of the Islands",
      author: "Joseph Conrad",
      year: 1896,
      opening: /^When he stepped off the straight and narrow path/,
      breaths: 7109,
      intro: /if you Host further, name that frame for the room first/i,
    },
    "the-getting-of-wisdom": {
      gutenberg: 3728,
      title: "The Getting of Wisdom",
      author: "Henry Handel Richardson",
      year: 1910,
      opening: /^The four children were lying on the grass/,
      breaths: 3688,
    },
    "noli-me-tangere": {
      gutenberg: 6737,
      title: "Noli Me Tangere (The Social Cancer)",
      author: "José Rizal (tr. Charles Derbyshire)",
      opening: /^On the last of October Don Santiago de los Santos/,
      breaths: 8108,
    },
    "the-story-of-gosta-berling": {
      gutenberg: 56158,
      title: "The Story of Gösta Berling",
      author: "Selma Lagerlöf (tr. Pauline Bancroft Flach)",
      year: 1898,
      opening: /^At last the minister stood in the pulpit/,
      breaths: 3122,
      scenes: 36,
      last: /^THE END$/,
    },
    "poison-tree": {
      gutenberg: 17455,
      title: "The Poison Tree",
      author: "Bankim Chandra Chatterjee (tr. Miriam S. Knight)",
      opening: /^Nagendra Natha Datta is about to travel by boat/,
      breaths: 3090,
    },
    "trooper-peter-halket": {
      gutenberg: 1431,
      title: "Trooper Peter Halket of Mashonaland",
      author: "Olive Schreiner",
      year: 1897,
      opening: /^It was a dark night/,
      breaths: 1181,
      intro: /name that colonial frame up front/,
    },
    "martin-bircks-youth": {
      gutenberg: 78363,
      title: "Martin Birck's Youth",
      author: "Hjalmar Söderberg (tr. Charles Wharton Stork)",
      year: 1930,
      opening: /^Martin Birck was a little child/,
      breaths: 545,
      scenes: 31,
      last: /from this one spring/,
    },
    bliss: {
      gutenberg: 44385,
      title: "Bliss",
      author: "Katherine Mansfield",
      year: 1920,
      opening: /^Although Bertha Young was thirty/,
      breaths: 1603,
      scenes: 14,
      last: /live for ever/,
    },
    steppenwolf: {
      gutenberg: 75756,
      title: "Steppenwolf",
      author: "Hermann Hesse",
      year: 1927,
      opening: /^This book contains the records left us by a man/,
      breaths: 770,
      scenes: 4,
      last: /^THE END$/,
    },
    shadowings: {
      gutenberg: 34215,
      title: "Shadowings",
      author: "Lafcadio Hearn",
      year: 1900,
      opening: /^THERE was a young Samurai of Kyoto/,
      breaths: 977,
      scenes: 16,
      last: /Infinite Memory/,
    },
    krakatit: {
      gutenberg: 79127,
      title: "Krakatit",
      author: "Karel Čapek",
      year: 1924,
      opening: /^With the evening the fog of the cold, damp day grew thicker/,
      breaths: 1887,
      scenes: 54,
      last: /sweet and healing sleep/,
      intro: /penetrating eyes/,
    },
    "a-hero-of-our-time": {
      gutenberg: 913,
      title: "A Hero of Our Time",
      author: "Mikhail Lermontov",
      year: 1840,
      opening: /^I was travelling post from Tiflis\./,
      breaths: 1526,
      scenes: 37,
      last: /desert harbour\?$/,
      intro: /Tiflis/,
    },
    "short-stories-from-the-balkans": {
      gutenberg: 73663,
      title: "Short Stories from the Balkans",
      author: "Various (ed. Edna Worthley Underwood)",
      year: 1919,
      opening: /^Leiba Zibal, proprietor of the little rest-house by Podeni/,
      breaths: 986,
      scenes: 13,
      last: /^THE END$/,
      intro: /Easter Candles/,
    },
    "a-hundred-and-seventy-chinese-poems": {
      gutenberg: 42290,
      title: "A Hundred and Seventy Chinese Poems",
      author: "Various (tr. Arthur Waley)",
      year: 1918,
      opening: /^My bed is so empty/,
      breaths: 3196,
      scenes: 140,
      last: /^THE END$/,
      intro: /Winter Night/,
    },
  } as const;

  assert.deepEqual([...FULL_NOVEL_NO_STUB].sort(), Object.keys(expect).sort());

  for (const [id, want] of Object.entries(expect)) {
    assertNoStubOpening(id);
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    if ("gutenberg" in want) assert.equal(work!.gutenberg, want.gutenberg, id);
    if ("title" in want) assert.equal(work!.title, want.title, id);
    if ("author" in want) assert.equal(work!.author, want.author, id);
    if ("year" in want) assert.equal(work!.year, want.year, id);
    assert.match(work!.opening ?? "", want.opening, `${id} shelf opening`);
    const full = textWork(id);
    assert.ok(full.breaths.length > 100, `${id} full bind`);
    assert.equal(work!.breaths, full.breaths.length, `${id} shelf breaths`);
    if ("breaths" in want) assert.equal(full.breaths.length, want.breaths, id);
    if ("scenes" in want) assert.equal(full.scenes.length, want.scenes, id);
    if (id === "the-story-of-gosta-berling") {
      assert.ok(
        full.breaths.some((breath) =>
          /long lake, the rich plains and the blue mountains/i.test(breath.text),
        ),
        `${id} landscape open in full text`,
      );
    } else {
      const openNeedle = new RegExp(want.opening.source.replace(/^\^/, ""), "i");
      assert.ok(
        full.breaths.some((breath) => openNeedle.test(breath.text)),
        `${id} chapter-1 line in full text`,
      );
    }
    if ("last" in want) assert.match(full.breaths.at(-1)?.text ?? "", want.last, id);
    if ("intro" in want) assert.match(work!.intro ?? "", want.intro, id);
    assert.doesNotMatch(work!.intro ?? "", /Featured-track|Recommend|cold-open/i, id);
    assert.doesNotMatch(full.note ?? "", /Featured-track|Recommend|cold-open/i, id);
    assert.doesNotMatch(
      full.breaths.slice(0, 8).map((breath) => breath.text).join(" "),
      /project gutenberg|standard ebooks/i,
      id,
    );
  }
});

test("The Cherry Orchard is a readable four-act play, not one breath per page", () => {
  const packed = JSON.parse(
    readFileSync(new URL("./texts/the-cherry-orchard.json", import.meta.url), "utf8"),
  ) as {
    scenes: { title: string }[];
    breaths: { sceneId: string; text: string }[];
  };
  assert.deepEqual(
    packed.scenes.map((scene) => scene.title),
    ["ACT ONE", "ACT TWO", "ACT THREE", "ACT FOUR"],
  );
  assert.equal(packed.breaths[0]?.text, "[A room which is still called the nursery.");
  const cues = packed.breaths.filter((breath) =>
    /^(LOPAKHIN|DUNYASHA|ANYA|LUBOV|GAEV|VARYA|TROFIMOV|FIERS|YASHA|EPIKHODOV|CHARLOTTA|PISCHIN)\.$/.test(
      breath.text,
    ),
  );
  assert.equal(cues.length, 0, `cue-only breaths remain: ${cues.length}`);
  assert.ok(
    packed.breaths.some((breath) =>
      breath.text.startsWith("Dunyasha: The dogs didn’t sleep all night"),
    ),
    "speaker and line share one breath",
  );
  assert.ok(
    packed.breaths.some((breath) => breath.text.startsWith("Lopakhin: What’s up with you, Dunyasha")),
    "Lopakhin line is prefixed",
  );
  assert.ok(
    packed.breaths.some((breath) => breath.text.includes("[Blows out candle]")),
    "keeps bracketed stage directions",
  );
  const giant = packed.breaths.filter((breath) => breath.text.length > 500);
  assert.deepEqual(giant, [], "giant breaths");
  const joined = packed.breaths.map((breath) => breath.text).join(" ");
  assert.doesNotMatch(joined, /project gutenberg|transcriber|table of contents/i);
  assert.equal(packed.breaths.at(-1)?.text, "Curtain.");
});

test("Mira FULL-TEXT CLEAR ×4 are stamped local binds with no opening stubs", () => {
  const expect = {
    "nacha-regules": {
      gutenberg: 59441,
      scenes: 25,
      breaths: 2271,
      last: /^THE END$/,
      opening: /^An August night! Hot with the fever of her adolescence as a national capital, Buenos Aires was ablaze/,
    },
    krakatit: {
      gutenberg: 79127,
      scenes: 54,
      breaths: 1887,
      last: /sweet and healing sleep/,
      opening: /^With the evening the fog of the cold, damp day grew thicker/,
    },
    "the-peasants": {
      gutenberg: 75846,
      scenes: 12,
      breaths: 2772,
      last: /END OF PART I/,
      opening: /Praised be Jesus Christ!/
    },
    cane: {
      gutenberg: 60093,
      scenes: 29,
      breaths: 909,
      last: /^THE END$/,
      opening: /^Her skin is like dusk on the eastern horizon/,
    },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.match(work!.opening ?? "", want.opening, id);
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "nacha-regules" || id === "the-peasants" || id === "cane",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: { title: string }[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 20, `${id} reads past a short open`);
    assert.match(full.breaths[0]?.text ?? "", want.opening, id);
    assert.match(full.breaths.at(-1)?.text ?? "", want.last, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /Featured/i, id);
    if (id === "cane") {
      assert.doesNotMatch(
        full.breaths.slice(0, 20).map((breath) => breath.text).join(" "),
        /Waldo Frank|FOREWORD/i,
      );
      assert.match(full.scenes[0]?.title ?? "", /Karintha/i);
    }
    if (id === "nacha-regules") {
      assert.doesNotMatch(full.breaths[0]?.text ?? "", /^Nacha!/);
    }
  }
});

test("Mira FULL-TEXT CLEAR ×6 are stamped local binds with no opening stubs", () => {
  const expect = {
    steppenwolf: { gutenberg: 75756, scenes: 4, breaths: 770, last: /^THE END$/ },
    "the-home-and-the-world": { gutenberg: 7166, scenes: 12, breaths: 1461, last: /bullet through the heart/ },
    "the-story-of-gosta-berling": { gutenberg: 56158, scenes: 36, breaths: 3122, last: /^THE END$/ },
    "martin-bircks-youth": { gutenberg: 78363, scenes: 31, breaths: 545, last: /from this one spring/ },
    bliss: { gutenberg: 44385, scenes: 14, breaths: 1603, last: /live for ever/ },
    shadowings: { gutenberg: 34215, scenes: 16, breaths: 977, last: /Infinite Memory/ },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(
      existsSync(new URL(`./openings/${id}.json`, import.meta.url)),
      id === "the-home-and-the-world",
      id,
    );
    const full = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
      scenes: unknown[];
      breaths: { text: string }[];
    };
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 20, `${id} reads past a short open`);
    assert.match(full.breaths.at(-1)?.text ?? "", want.last, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /Featured/i, id);
  }
});

test("tbr noon CLEAR ×5 load as local full binds on the Host open", () => {
  const expect = {
    "a-hero-of-our-time": {
      scenes: 37,
      breaths: 1526,
      opening: /^I was travelling post from Tiflis\.$/,
      scene: /Bela/,
      absent: /TRANSLATOR|translator’s foreword/i,
    },
    "strange-tales": {
      scenes: 152,
      breaths: 470,
      opening: /^A Kiang-si gentleman, named Mêng Lung-t‘an/,
      scene: /^The Painted Wall$/,
      absent: /Giles’ Introduction|INTRODUCTION/i,
      host: true,
    },
    "short-stories-from-the-balkans": {
      scenes: 13,
      breaths: 986,
      opening: /^Leiba Zibal, proprietor of the little rest-house by Podeni/,
      scene: /^Easter Candles$/,
      absent: /^High in the Apennines/,
    },
    "the-awakening": {
      scenes: 39,
      breaths: 1066,
      opening: /^A green and yellow parrot, which hung in a cage outside the door/,
      scene: /^Chapter I$/,
      absent: /^THE END$/,
    },
    "a-few-figs-from-thistles": {
      scenes: 19,
      breaths: 66,
      opening: /^My candle burns at both ends;/,
      scene: /^First Fig$/,
      absent: /Updated editions will replace/,
    },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(work!.form === "poem" || work!.form === "novel" || work!.form === "stories", true, id);
    if (id === "a-few-figs-from-thistles") assert.equal(work!.form, "poem");
    assert.match(work!.opening ?? "", want.opening, id);
    if (id !== "the-awakening" && id !== "strange-tales") assertNoStubOpening(id);
    if (id === "strange-tales") {
      const opened = JSON.parse(
        readFileSync(new URL("./openings/strange-tales.json", import.meta.url), "utf8"),
      ) as { scenes: { title: string }[]; breaths: { text: string }[] };
      assert.equal(opened.scenes.length, 1);
      assert.equal(opened.scenes[0]?.title, "The Painted Wall");
      assert.match(opened.breaths[0]?.text ?? "", want.opening);
      assert.doesNotMatch(opened.breaths.map((breath) => breath.text).join("\n"), /Giles’ Introduction/);
    }
    const full = textWork(id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.equal(full.scenes[0]?.title, full.scenes[0]?.title);
    assert.match(full.scenes[0]?.title ?? "", want.scene, id);
    assert.match(full.breaths[0]?.text ?? "", want.opening, id);
    assert.doesNotMatch(full.breaths[0]?.text ?? "", want.absent, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /Featured/i, id);
  }
  const hero = textWork("a-hero-of-our-time");
  const dukhan = hero.breaths.find((breath) => /stopped at a dukhan/.test(breath.text));
  assert.ok(dukhan);
  assert.match(dukhan.text, /stopped at a dukhan\. About a score/);
  assert.doesNotMatch(dukhan.text, /\[\d+\]/);
  const strange = textWork("strange-tales");
  assert.equal(strange.scenes[0]?.title, "The Painted Wall");
  assert.ok(strange.scenes.some((scene) => scene.title === "Examination for the Post of Guardian Angel"));
  const balkans = textWork("short-stories-from-the-balkans");
  assert.equal(balkans.scenes[0]?.title, "Easter Candles");
  assert.ok(balkans.scenes.some((scene) => /Cœlestin/.test(scene.title)));
  assert.notEqual(balkans.scenes[0]?.title, balkans.scenes.find((scene) => /Cœlestin/.test(scene.title))?.title);
  const figs = textWork("a-few-figs-from-thistles");
  assert.ok(figs.scenes.some((scene) => scene.title === "Recuerdo"));
  assert.equal(figs.scenes.length, 19);
});

test("tbr PM CLEAR ×5 load as local full binds on the Host open", () => {
  const expect = {
    tropic: {
      scenes: 10,
      breaths: 3259,
      opening: /^The whistle blew for eleven o'clock\.$/,
      scene: /^Drought$/,
      absent: /Updated editions will replace/,
    },
    "there-is-confusion": {
      scenes: 36,
      breaths: 2005,
      opening: /^Joanna’s first consciousness/,
      scene: /^Chapter I$/,
      absent: /^But alas for poor Joel!/,
    },
    buddenbrooks: {
      scenes: 63,
      breaths: 1845,
      opening: /^“And--and--what comes next\?”$/,
      scene: /^Part One · Chapter I$/,
      absent: /^TRANSLATOR/,
    },
    "miss-lulu-bett": {
      scenes: 6,
      breaths: 1712,
      opening: /^The Deacons were at supper\./,
      scene: /^April$/,
      absent: /Project Gutenberg/,
    },
    color: {
      scenes: 76,
      breaths: 1192,
      opening: /^I doubt not God is good, well-meaning, kind,$/,
      scene: /^Yet Do I Marvel$/,
      absent: /Updated editions will replace|be renamed\./,
    },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.match(work!.opening ?? "", want.opening, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /Featured/i, id);
    if (id === "there-is-confusion") {
      assert.equal(
        existsSync(fileURLToPath(openingUrl(id))),
        true,
        "afternoon Host opening sits in front of the whole novel",
      );
    } else {
      assertNoStubOpening(id);
    }
    const full = textWork(id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.match(full.scenes[0]?.title ?? "", want.scene, id);
    assert.match(full.breaths[0]?.text ?? "", want.opening, id);
    assert.doesNotMatch(full.breaths.map((breath) => breath.text).join("\n"), want.absent, id);
  }
  const tropic = textWork("tropic");
  const droughtEnd = tropic.breaths.findIndex((breath) => breath.text.startsWith("The sun was slowly dying."));
  assert.ok(droughtEnd > 0);
  assert.doesNotMatch(
    tropic.breaths.slice(0, droughtEnd).map((breath) => breath.text).join("\n"),
    /FOOTNOTES|PANAMA GOLD/,
  );
  const confusion = textWork("there-is-confusion");
  const knee = confusion.breaths.findIndex((breath) => /father’s knee/.test(breath.text));
  const mammy = confusion.breaths.findIndex((breath) => /Mammy, I’ll be a great man/.test(breath.text));
  const alas = confusion.breaths.findIndex((breath) => /But alas for poor Joel!/.test(breath.text));
  assert.ok(knee >= 0 && mammy > knee && alas > mammy);
  assert.equal(confusion.scenes[0]?.title, "Chapter I");
  const color = textWork("color");
  assert.ok(color.scenes.some((scene) => scene.title === "Incident"));
  assert.ok(color.scenes.some((scene) => scene.title === "Tableau"));
  assert.equal(color.scenes.length, 76);
  const budden = textWork("buddenbrooks");
  assert.ok(budden.breaths.some((breath) => breath.text === "END OF VOLUME I"));
  const lulu = textWork("miss-lulu-bett");
  assert.equal(lulu.scenes[0]?.title, "April");
  assert.equal(lulu.scenes.at(-1)?.title, "September");
});

/** Tier B format-min CLEAR batches 1–2. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_1_2 = [
  "a-warning-to-the-curious-and-other-ghost-stories",
  "antic-hay",
  "babbitt",
  "billy-budd",
  "birds-beasts-and-flowers",
  "birthright",
  "country-sentiment",
  "crome-yellow",
  "domesday-book",
  "elmer-gantry",
  "figures-of-earth",
  "heliodora-and-other-poems",
  "one-of-ours",
  "roumanian-stories",
  "the-doves-nest-and-other-stories",
  "the-man-who-knew-too-much",
  "the-mothers-recompense",
  "the-pier-glass",
  "the-poetic-edda",
  "the-trembling-of-a-leaf-little-stories-of-the-south-sea-islands",
  "the-triumph-of-the-egg",
  "the-waste-land",
  "tortoises",
  "ulysses",
  "amores",
  "counter-attack-and-other-poems",
  "fifty-years-other-poems",
  "free-air",
  "island-tales-on-the-makaloa-mat",
  "jurgen",
  "main-street",
  "motley-and-other-poems",
  "new-poems",
  "picture-show",
  "poems-wilfred-owen",
  "poor-white",
  "prufrock-and-other-observations",
  "reincarnations",
  "the-chinese-nightingale-and-other-poems",
  "the-forerunner-his-parables-and-poems",
  "the-garden-of-bright-waters",
  "the-return-of-the-soldier",
] as const;

test("Tier B batches 1–2 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_1_2.length, 42);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  for (const id of TIER_B_BATCH_1_2) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(curatorialTrack(id), "later", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assertNoStubOpening(id);
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

/** Tier B format-min CLEAR batches 7–8. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_7_8 = [
  "atalanta-in-calydon",
  "best-russian-short-stories",
  "childe-harolds-pilgrimage",
  "don-juan",
  "drum-taps",
  "endymion",
  "evangeline-a-tale-of-acadie",
  "fruit-gathering",
  "idylls-of-the-king",
  "kristin",
  "lamia",
  "leaves-of-grass",
  "mashi-and-other-stories",
  "more-translations-from-the-chinese",
  "omoo",
  "paradise-lost",
  "pierre-or-the-ambiguities",
  "selected-polish-tales",
  "south-american-jungle-tales",
  "stray-birds",
  "tender-buttons",
  "the-altar-of-the-dead",
  "the-confidence-man",
  "the-defence-of-guenevere-and-other-poems",
  "the-emperor-of-portugallia",
  "the-four-horsemen-of-the-apocalypse",
  "the-gentleman-from-san-francisco-and-other-stori",
  "the-hungry-stones-and-other-stories",
  "the-last-man",
  "the-marriage-of-heaven-and-hell",
  "the-piazza-tales",
  "the-rime-of-the-ancient-mariner",
  "the-song-of-hiawatha",
  "trial",
  "typee",
  "villette",
  "within-a-budding-grove",
  "yama-the-pit",
] as const;

test("Tier B batches 7–8 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_7_8.length, 38);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  for (const id of TIER_B_BATCH_7_8) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(curatorialTrack(id), "later", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    if (id === "the-last-man") {
      assert.equal(existsSync(fileURLToPath(openingUrl(id))), true, id);
    } else {
      assertNoStubOpening(id);
    }
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

/** Tier B format-min CLEAR batches 3–4. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_3_4 = [
  "a-dome-of-many-coloured-glass",
  "alexander-s-bridge",
  "burning-daylight",
  "cathay",
  "chance",
  "jennie-gerhardt",
  "lost-face",
  "moving-the-mountain",
  "our-mr-wrenn",
  "responsibilities-and-other-poems",
  "spectra-a-book-of-poetic-experiments",
  "strictly-business-more-stories-of-the-four-million",
  "the-green-helmet-and-other-poems",
  "the-house-of-pride-and-other-tales-of-hawaii",
  "the-night-born",
  "the-quest-of-the-silver-fleece",
  "the-scarlet-plague",
  "the-stoneground-ghost-tales",
  "the-trespasser",
  "under-fire",
  "vandover-and-the-brute",
  "victory",
  "when-god-laughs-and-other-stories",
  "actions-and-reactions",
  "chamber-music",
  "in-search-of-the-unknown",
  "in-the-seven-woods",
  "kim",
  "love-of-life-and-other-stories",
  "mrs-craddock",
  "my-brilliant-career",
  "nostromo",
  "options",
  "rio-grande-s-last-race-and-other-verses",
  "such-is-life",
  "the-ambassadors",
  "the-spell-of-the-yukon-and-other-verses",
  "the-sport-of-the-gods",
  "the-wings-of-the-dove",
  "traffics-and-discoveries",
  "what-diantha-did",
  "winona",
] as const;

test("Tier B batches 3–4 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_3_4.length, 42);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  const coldOpen = new Set<string>(FIRST_SESSION_RITUAL_IDS);
  for (const id of TIER_B_BATCH_3_4) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal(coldOpen.has(id), false, id);
    if (id === "my-brilliant-career" || id === "kim") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), true, id);
      assert.equal(existsSync(fileURLToPath(openingUrl(id))), true, id);
    } else {
      assert.equal(curatorialTrack(id), "later", id);
      assertNoStubOpening(id);
    }
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

/** Tier B format-min CLEAR batches 5–6. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_5_6 = [
  "a-crystal-age",
  "a-pair-of-blue-eyes",
  "a-shropshire-lad",
  "barrack-room-ballads",
  "bayou-folk",
  "children-of-the-night",
  "fantastic-fables",
  "far-from-the-madding-crowd",
  "felix-holt-the-radical",
  "ghetto-tragedies",
  "imperium-in-imperio",
  "iola-leroy",
  "life-s-handicap-being-stories-of-mine-own-people",
  "life-s-little-ironies",
  "looking-backward",
  "lord-jim",
  "main-travelled-roads",
  "new-grub-street",
  "poems-first-series-et-al",
  "poems-of-passion",
  "ramona",
  "robbery-under-arms",
  "roderick-hudson",
  "soldiers-three",
  "tales-of-mean-streets",
  "the-awkward-age",
  "the-country-of-the-pointed-firs",
  "the-days-work",
  "the-greater-inclination",
  "the-hand-of-ethelberta",
  "the-happy-prince-and-other-tales",
  "the-light-that-failed",
  "the-luck-of-roaring-camp-and-other-tales",
  "the-mayor-of-casterbridge",
  "the-phantom-rickshaw-and-other-ghost-stories",
  "the-purple-cloud",
  "the-ramayan-of-valmiki",
  "the-return-of-the-native",
  "the-sacred-fount",
  "the-secret-rose",
  "the-strength-of-gideon-and-other-stories",
  "the-turn-of-the-screw",
  "under-the-greenwood-tree",
  "war-is-kind",
  "wessex-tales",
  "what-maisie-knew",
] as const;

test("Tier B batches 5–6 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_5_6.length, 46);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  for (const id of TIER_B_BATCH_5_6) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(curatorialTrack(id), "later", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assertNoStubOpening(id);
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.equal(work!.minutes === 80 || work!.minutes === 90 || work!.minutes === 160, true, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

/** Tier B format-min CLEAR batches 11–12. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_11_12 = [
  "eline-vere",
  "eyes-like-the-sea",
  "footsteps-of-fate",
  "germinal",
  "hunger",
  "la-bas",
  "madame-chrysantheme",
  "married",
  "pierre-and-jean",
  "rebours",
  "some-chinese-ghosts",
  "the-child-of-pleasure",
  "the-deluge",
  "the-duel-and-other-stories",
  "the-kreutzer-sonata",
  "the-reign-of-greed-el-filibusterismo",
  "without-dogma",
  "a-family-of-noblemen",
  "anna",
  "dona-perfecta",
  "karamazov",
  "l-assommoir",
  "malavoglia",
  "marie-grubbe",
  "sentimental-education",
  "skipper-worse",
  "the-idiot",
  "the-ladies-paradise",
  "the-red-room",
  "venus-in-furs",
] as const;

test("Tier B batches 11–12 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_11_12.length, 30);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  for (const id of TIER_B_BATCH_11_12) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(id), false, id);
    if (id === "hunger") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), true, id);
      assert.equal(work!.minutes, 320, id);
      assert.equal(existsSync(fileURLToPath(openingUrl(id))), true, id);
    } else if (id === "the-red-room") {
      assert.equal(curatorialTrack(id), "next", id);
      assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), true, id);
      assert.equal(work!.minutes, 493, id);
      assert.equal(work!.language, "English", id);
      assert.equal(existsSync(fileURLToPath(openingUrl(id))), true, id);
    } else {
      assert.equal(curatorialTrack(id), "later", id);
      assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
      assertNoStubOpening(id);
      assert.equal(work!.minutes === 80 || work!.minutes === 90 || work!.minutes === 160, true, id);
    }
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

/** Tier B format-min CLEAR batches 9–10. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_9_10 = [
  "a-lute-of-jade",
  "japanese-fairy-tales",
  "jenny",
  "mother",
  "old-people-and-the-things-that-pass",
  "pelle-the-conqueror",
  "penguin-island",
  "sanin",
  "swann",
  "the-city-of-the-discreet",
  "the-flowers-of-evil",
  "the-gardener",
  "the-gods-are-athirst",
  "the-little-demon",
  "the-persian-mystics-jalalu-d-din-rumi",
  "the-phantom-of-the-opera",
  "the-saint",
  "the-seven-who-were-hanged",
  "yiddish-tales",
  "from-a-swedish-homestead",
  "in-ghostly-japan",
  "invisible-links",
  "jean-christophe",
  "jerusalem",
  "pan",
  "poems-from-the-divan-of-hafiz",
  "poems-of-paul-verlaine",
  "psyche",
  "shallow-soil",
  "the-knights-of-the-cross",
  "the-literature-of-arabia",
  "the-patriot-piccolo-mondo-antico",
  "the-pharaoh-and-the-priest",
  "the-songs-of-bilitis",
  "the-twilight-of-the-souls",
  "twenty-six-and-one-and-other-stories",
  "victoria",
] as const;

test("Tier B batches 9–10 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_9_10.length, 37);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  const forYou = RITUAL_LANES.find((item) => item.id === "for-you");
  assert.ok(forYou);
  const chambermaid = SHELF.find((item) => item.id === "a-chambermaid-s-diary");
  assert.ok(chambermaid);
  assert.equal(chambermaid.local, undefined);
  for (const id of TIER_B_BATCH_9_10) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(curatorialTrack(id), "later", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assertNoStubOpening(id);
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.equal(work!.minutes === 80 || work!.minutes === 90 || work!.minutes === 160, true, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

/** Tier B format-min CLEAR batches 13–14. Later only — never Featured, cold-open untouched. */
const TIER_B_BATCH_13_14 = [
  "a-sportsman-s-sketches",
  "bovary",
  "camille",
  "crime",
  "dead-souls",
  "fathers-and-sons",
  "havelaar",
  "immensee",
  "midst-the-wild-carpathians",
  "poor-folk",
  "the-charterhouse-of-parma",
  "the-cossacks",
  "the-gambler",
  "the-house-of-the-dead",
  "the-man-who-laughs",
  "the-mantle-and-other-stories",
  "the-story-of-grettir-the-strong",
  "underground",
  "chitra",
  "father-goriot",
  "genji",
  "hands-around-reigen",
  "liaisons",
  "metamorphoses",
  "nights",
  "poems-and-ballads-of-heinrich-heine",
  "red-chamber",
  "san-kuo-or-romance-of-the-three-kingdoms-vol-1",
  "six-characters",
  "taras-bulba-and-other-tales",
  "taras-bulba",
  "the-aeneid",
  "the-betrothed",
  "the-devil-s-elixir",
  "the-nibelungenlied",
  "the-poems-of-giacomo-leopardi",
  "the-queen-of-spades-and-other-stories",
  "the-queen-of-spades",
  "three-plays-incl-henry-iv",
  "venice",
] as const;

test("Tier B batches 13–14 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_13_14.length, 40);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  const coldOpen = new Set<string>(FIRST_SESSION_RITUAL_IDS);
  for (const id of TIER_B_BATCH_13_14) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(curatorialTrack(id), "later", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal(coldOpen.has(id), false, id);
    for (const lane of RITUAL_LANES) {
      assert.equal(lane.workIds.includes(id), false, `${id} ${lane.id}`);
    }
    assertNoStubOpening(id);
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
  const salammbo = SHELF.find((item) => item.id === "salammbo");
  assert.ok(salammbo);
  assert.equal(salammbo.breaths, 1924);
  assert.equal(
    salammbo.opening,
    "It was at Megara, a suburb of Carthage, in the gardens of Hamilcar. The soldiers whom he had command",
  );
  assert.equal(curatorialTrack("salammbo"), "next");
  assert.equal(FEATURED_CAROUSEL_IDS.includes("salammbo"), false);
});

/**
 * Tier B format-min CLEAR batches 15–16. Later only — never Featured,
 * never Next, never For you. Cold-open untouched.
 *
 * Held: recovered PG is a different work, or main already has a fuller local bind.
 * aurora-leigh (fuller local on main, PG 56621), the-canterbury-tales (fuller local on main),
 * effi-briest (PG 53235), elective-affinities (PG 43434),
 * nana (PG 1406), rudin (PG 47935 is Fathers and Sons),
 * with-fire-and-sword (PG 3750).
 */
const TIER_B_BATCH_15_16 = [
  "beowulf",
  "ghosts",
  "hayy",
  "kalevala",
  "laxd-la-saga",
  "njala",
  "quo-vadis",
  "white-nights",
] as const;

test("Tier B batches 15–16 are local format-min binds, never Featured", () => {
  assert.equal(TIER_B_BATCH_15_16.length, 8);
  assert.deepEqual(FIRST_SESSION_RITUAL_IDS, [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  const forYou = RITUAL_LANES.find((lane) => lane.id === "for-you");
  assert.ok(forYou);
  const coldOpen = new Set<string>(FIRST_SESSION_RITUAL_IDS);
  for (const id of TIER_B_BATCH_15_16) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(curatorialTrack(id), "later", id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal(forYou!.workIds.includes(id), false, id);
    assert.equal(coldOpen.has(id), false, id);
    if (id === "white-nights") {
      for (const lane of RITUAL_LANES) {
        const onRitual = lane.id === "bite-sized" || lane.id === "before-sleep" || lane.id === "waking-up";
        assert.equal(lane.workIds.includes(id), onRitual, `${id} ${lane.id}`);
      }
    } else {
      for (const lane of RITUAL_LANES) {
        assert.equal(lane.workIds.includes(id), false, `${id} ${lane.id}`);
      }
    }
    assertNoStubOpening(id);
    const full = textWork(id);
    assert.equal(work!.breaths, full.breaths.length, id);
    assert.ok(full.breaths.length > 1, id);
    assert.ok(
      (full.breaths[0]?.text ?? "").startsWith(work!.opening ?? "\u0000"),
      `${id} shelf opening`,
    );
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /\bFeatured(?:-track)?\b|\bFEATURED\b/, id);
  }
});

test("homepage examples keep country + concrete sentence", () => {
  assert.equal(countryFor(SHELF.find((w) => w.id === "passing")!), "United States");
  assert.match(blurbFor("passing"), /color line/i);
  assert.equal(sentenceCount(blurbFor("passing")), 1);
  assert.equal(countryFor(SHELF.find((w) => w.id === "we")!), "Russia");
  assert.equal(sentenceCount(blurbFor("we")), 1);
  assert.equal(countryFor(SHELF.find((w) => w.id === "gold")!), "United States");
  assert.match(blurbFor("gold"), /Michael Gold/);
  assert.doesNotMatch(blurbFor("gold"), /Yezierska/);
});

test("Mira BATCH-6 CLEAR ×20 are inventory local binds, never Featured", () => {
  const expect = {
    whipperginny: { gutenberg: 58642, form: "poem", scenes: 50, breaths: 253 },
    "a-book-of-ghosts": { gutenberg: 36638, form: "stories", scenes: 21, breaths: 3046 },
    "daisy-miller": { gutenberg: 208, form: "novel", scenes: 2, breaths: 535 },
    "marius-the-epicurean": { gutenberg: 4057, form: "novel", scenes: 14, breaths: 283 },
    "ninety-three": { gutenberg: 49372, form: "novel", scenes: 100, breaths: 3848 },
    "reynard-the-fox": { gutenberg: 38052, form: "poem", scenes: 2, breaths: 241 },
    "the-american": { gutenberg: 177, form: "novel", scenes: 26, breaths: 2678 },
    "the-way-of-all-flesh": { gutenberg: 2084, form: "novel", scenes: 86, breaths: 1509 },
    "the-wild-knight-and-other-poems": { gutenberg: 12037, form: "poem", scenes: 27, breaths: 497 },
    underwoods: { gutenberg: 438, form: "poem", scenes: 54, breaths: 279 },
    "a-slav-soul": { gutenberg: 57036, form: "stories", scenes: 15, breaths: 1399 },
    "aarons-rod": { gutenberg: 4520, form: "novel", scenes: 21, breaths: 3715 },
    "captains-courageous": { gutenberg: 2225, form: "novel", scenes: 10, breaths: 1286 },
    "casanovas-homecoming": { gutenberg: 9310, form: "novel", scenes: 12, breaths: 550 },
    cosmopolis: { gutenberg: 3967, form: "novel", scenes: 12, breaths: 1043 },
    "ditte-girl-alive": { gutenberg: 31496, form: "novel", scenes: 32, breaths: 1598 },
    erewhon: { gutenberg: 1906, form: "novel", scenes: 29, breaths: 607 },
    "look-back-on-happiness": { gutenberg: 8445, form: "novel", scenes: 38, breaths: 1817 },
    "mr-britling-sees-it-through": { gutenberg: 14060, form: "novel", scenes: 11, breaths: 2602 },
    "notre-dame-de-paris": { gutenberg: 2610, form: "novel", scenes: 59, breaths: 4033 },
  } as const;
  assert.equal(Object.keys(expect).length, 20);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.form, want.form, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal((FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /Featured|cold-open/i, id);
    const full = textWork(id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    const first = (full.breaths[0]?.text ?? "").replace(/\s+/g, " ").trim();
    assert.ok(first.startsWith(work!.opening ?? ""), id);
    assert.ok((work!.intro ?? "").length >= 24, id);
    assert.equal(sentenceCount(blurbFor(work!)), 1, id);
    assert.ok(countryFor(work!), id);
  }
});

test("Mira BATCH-7 CLEAR ×20 are inventory local binds, never Featured", () => {
  const expect = {
    leila: { gutenberg: 78258, form: "novel", scenes: 17, breaths: 2320 },
    "the-temptation-of-st-anthony": { gutenberg: 52225, form: "novel", scenes: 7, breaths: 1725 },
    sanctuary: { gutenberg: 7517, form: "novel", scenes: 12, breaths: 541 },
    "the-angels-of-mons": { gutenberg: 14044, form: "stories", scenes: 4, breaths: 133 },
    "the-card": { gutenberg: 12986, form: "novel", scenes: 12, breaths: 1695 },
    "the-flying-inn": { gutenberg: 59239, form: "novel", scenes: 25, breaths: 1417 },
    "the-nabob": { gutenberg: 2077, form: "novel", scenes: 25, breaths: 1949 },
    "the-shadow-of-the-cathedral": { gutenberg: 12041, form: "novel", scenes: 10, breaths: 1199 },
    thyrza: { gutenberg: 4302, form: "novel", scenes: 41, breaths: 5397 },
    "wine-water-and-song": { gutenberg: 35115, form: "poem", scenes: 16, breaths: 82 },
    "against-the-grain": { gutenberg: 12341, form: "novel", scenes: 16, breaths: 900 },
    "doctor-pascal": { gutenberg: 10720, form: "novel", scenes: 14, breaths: 1848 },
    "hilda-lessways": { gutenberg: 10658, form: "novel", scenes: 36, breaths: 2117 },
    kangaroo: { gutenberg: 59848, form: "novel", scenes: 18, breaths: 3425 },
    "news-from-nowhere": { gutenberg: 3261, form: "novel", scenes: 32, breaths: 1113 },
    "sketches-by-boz": { gutenberg: 882, form: "stories", scenes: 56, breaths: 3412 },
    sulamith: { gutenberg: 33444, form: "novel", scenes: 12, breaths: 434 },
    "the-new-machiavelli": { gutenberg: 1047, form: "novel", scenes: 15, breaths: 2275 },
    "the-reverberator": { gutenberg: 7529, form: "novel", scenes: 14, breaths: 1072 },
    "the-soil": { gutenberg: 56687, form: "novel", scenes: 30, breaths: 3476 },
  } as const;
  assert.equal(Object.keys(expect).length, 20);
  assert.deepEqual([...FIRST_SESSION_RITUAL_IDS], [
    "the-house-of-mirth",
    "quicksand",
    "botchan",
  ]);
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.equal(work!.form, want.form, id);
    assert.equal(work!.gutenberg, want.gutenberg, id);
    assert.equal(work!.breaths, want.breaths, id);
    assert.equal(FEATURED_CAROUSEL_IDS.includes(id), false, id);
    assert.equal((NEXT_FEATURED_TRACK_IDS as readonly string[]).includes(id), false, id);
    assert.equal((FIRST_SESSION_RITUAL_IDS as readonly string[]).includes(id), false, id);
    assert.equal(existsSync(new URL(`./openings/${id}.json`, import.meta.url)), false, id);
    assert.doesNotMatch(`${work!.intro ?? ""}\n${work!.opening ?? ""}`, /Featured|cold-open/i, id);
    const full = textWork(id);
    assert.equal(full.scenes.length, want.scenes, id);
    assert.equal(full.breaths.length, want.breaths, id);
    const first = (full.breaths[0]?.text ?? "").replace(/\s+/g, " ").trim();
    assert.ok(first.startsWith(work!.opening ?? ""), id);
    assert.ok((work!.intro ?? "").length >= 24, id);
    assert.equal(sentenceCount(blurbFor(work!)), 1, id);
    assert.ok(countryFor(work!), id);
  }
});

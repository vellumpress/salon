import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SHELF } from "./shelf.ts";
import { LOCAL_WORKS } from "./full-pdf.ts";
import { countryFor, isCityHubLabel } from "./countries.ts";
import { blurbFor, sentenceCount } from "./blurbs.ts";
import { isBoundLocal } from "./en-rights.ts";

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
    "on-a-chinese-screen": "United Kingdom",
    futility: "United Kingdom",
    "poison-tree": "India",
    "trooper-peter-halket": "South Africa",
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
      scene: /Chapter I.*Closed door/i,
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
      scene: /Derby Hill/i,
      opening: /^One of the fruits of Emancipation/,
    },
    "noli-me-tangere": {
      scene: /Capitan Tiago/i,
      opening: /^On the last of October Don Santiago de los Santos/,
    },
    vera: {
      scene: /Cliff gate/i,
      opening: /^When the doctor had gone/,
    },
    "on-a-chinese-screen": {
      scene: /My Lady/i,
      opening: /^"I really think I can make something of it," she said/,
    },
    futility: {
      scene: /Sisters/i,
      opening: /^It was somewhat in the manner of an Ibsen drama/,
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
      scene: /Agony Column/i,
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
      scene: /Mirror prayer/i,
      opening: /^Mother, today there comes back to mind/,
    },
    "where-angels-fear-to-tread": {
      scene: /Charing Cross/i,
      opening: /^They were all at Charing Cross/,
    },
    "the-gadfly": {
      scene: /Fragola/i,
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
      scene: /Hidden name/i,
      opening: /^You ask me, my father/,
    },
    "all-quiet-on-the-western-front": {
      scene: /Double rations/i,
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
      scene: /Nile huts/i,
      opening: /^In those days there were many hermits/,
    },
    demian: {
      scene: /Two worlds/i,
      opening: /^I will begin my story with an event of the time when I was ten or eleven/,
    },
    "death-comes-for-the-archbishop": {
      scene: /Red hills/i,
      opening: /^One afternoon in the autumn of 1851 a solitary horseman/,
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
      scene: /The Sisters/i,
      opening: /^There was no hope for him this time/,
    },
    gitanjali: {
      scene: /little flute/i,
      opening: /^Thou hast made me endless/,
    },
    "martin-bircks-youth": {
      scene: /Childhood garden/i,
      opening: /^Martin Birck was a little child/,
    },
  } as const;
  for (const [id, want] of Object.entries(expect)) {
    const work = SHELF.find((item) => item.id === id);
    assert.ok(work, id);
    assert.equal(work!.local, true, id);
    assert.equal(isBoundLocal(work!), true, id);
    assert.match(work!.opening ?? "", want.opening, `${id} shelf opening`);
    const packed = JSON.parse(
      readFileSync(new URL(`./openings/${id}.json`, import.meta.url), "utf8"),
    ) as { scenes: { title: string }[]; breaths: { text: string }[] };
    assert.match(packed.scenes[0]?.title ?? "", want.scene, `${id} scene`);
    assert.match(packed.breaths[0]?.text ?? "", want.opening, `${id} open breath`);
    const early = packed.breaths.slice(0, 12).map((b) => b.text).join(" ");
    assert.doesNotMatch(early, /project gutenberg|standard ebooks|table of contents|transcriber/i, id);
    if (id === "quicksand") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /never opened her door\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /an observer would have thought/i,
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
    if (id === "high-wind-jamaica") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /lashed permanently open by a rank plant\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /peering|negress/i,
      );
    }
    if (id === "noli-me-tangere") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Chinese water-carrier finds it convenient\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /project gutenberg|Ibarra|Crisostomo|Crisóstomo/i,
      );
    }
    if (id === "vera") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /and she felt nothing\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Wemyss|Everard/i,
      );
    }
    if (id === "on-a-chinese-screen") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Tunbridge Wells\."?$/);
    }
    if (id === "futility") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /the only man who really mattered in the world/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Wharton|preface/i,
      );
    }
    if (id === "poison-tree") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /heavy storm of rain\.?$/);
    }
    if (id === "trooper-peter-halket") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /keep awake the whole night beside it\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /\bstranger\b/i,
      );
    }
    if (id === "enchanted-april") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /dripping street\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /what nonsense|Mrs\. Arbuthnot|nest-egg/i,
      );
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
    if (id === "the-home-and-the-world") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /model of what woman should be\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /\bMOTHER\b/);
      assert.ok(packed.breaths.some((breath) => /\*sari\*/.test(breath.text)));
    }
    if (id === "where-angels-fear-to-tread") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Monteriano\.?"?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Gino|baby|carriage accident/i,
      );
    }
    if (id === "the-gadfly") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Fragola/);
      assert.ok(packed.breaths.some((breath) => /\*Fragola!\*/.test(breath.text)));
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
    if (id === "the-immoralist") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /talking to myself\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /preface|Bussy|Gide/i,
      );
    }
    if (id === "letters-of-a-javanese-princess") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /infinitely far\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Couperus|foreword|\[\d+\]/i,
      );
    }
    if (id === "blood-and-sand") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /not made much impression\.?$/);
      assert.ok(packed.breaths.some((breath) => /\*la alternativa\*/.test(breath.text)));
    }
    if (id === "the-painted-veil") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /How shall I get out\?/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /PREFACE|preface/i);
    }
    if (id === "the-good-soldier") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /I had known the shallows\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /PART I/);
    }
    if (id === "growth-of-the-soil") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /in search of peace\.?$/);
      assert.ok(packed.breaths.some((breath) => /\bLapp\b/.test(breath.text)));
    }
    if (id === "nada-the-lily") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /did any know my name\.?$/);
      assert.ok(packed.breaths.some((breath) => /White Man/.test(breath.text)));
    }
    if (id === "all-quiet-on-the-western-front") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /now that is decent\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /epigraph|this book is to be neither/i,
      );
    }
    if (id === "we") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /despite my limitations\?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /FOREWORD|foreword|This is merely a copy/i,
      );
      assert.ok(packed.breaths.some((breath) => /\*Integral\*/.test(breath.text)));
    }
    if (id === "the-story-of-gosta-berling") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Captain Christian Bergh\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /preface|translator/i,
      );
    }
    if (id === "thais") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /cave or tomb\.?$/);
    }
    if (id === "demian") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /Christmas was kept\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Abraxas|Max Demian/i,
      );
    }
    if (id === "death-comes-for-the-archbishop") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /than if he had stood still\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Sabine|Cardinals|Rome/i,
      );
    }
    if (id === "the-getting-of-wisdom") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /said Pin, who was practical\.?$/);
    }
    if (id === "bliss") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /infallibly\.?$/);
      assert.doesNotMatch(
        packed.breaths.map((b) => b.text).join(" "),
        /Lottie and Kezia|Prelude/i,
      );
    }
    if (id === "a-hundred-and-seventy-chinese-poems") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /shut it up inside\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /\bBattle\b/);
    }
    if (id === "dubliners") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /arranging his opinion in his mind\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /The Dead|Gabriel Conroy/i);
    }
    if (id === "gitanjali") {
      assert.match(packed.breaths.at(-1)?.text ?? "", /friend who art my lord\.?$/);
      assert.doesNotMatch(packed.breaths.map((b) => b.text).join(" "), /Yeats|Introduction/i);
    }
    if (id === "martin-bircks-youth") {
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

test("A High Wind in Jamaica opens on Emancipation ruins and binds only the rank-plant sit", () => {
  const work = SHELF.find((item) => item.id === "high-wind-jamaica");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 75530);
  assert.equal(work!.title, "A High Wind in Jamaica");
  assert.match(work!.opening ?? "", /^One of the fruits of Emancipation/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/high-wind-jamaica.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/high-wind-jamaica.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.note, /warn the room first/);
  assert.match(full.note, /warn the room first/);
  assert.match(work!.intro ?? "", /warn the room first/);
  assert.doesNotMatch(packed.note, /do not extend|locked/i);
  assert.doesNotMatch(full.note, /do not extend|locked/i);
  assert.match(packed.scenes[0]?.title ?? "", /Derby Hill/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^One of the fruits of Emancipation/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /lashed permanently open by a rank plant\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /peer|negress/i.test(breath.text)),
    false,
    "open-at should stop before peering / negress beat",
  );
  assert.ok(
    packed.breaths.some((breath) => /went _bung_\./.test(breath.text)),
    "PG emphasis becomes italic markup",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(full.breaths[0]?.text ?? "", /^One of the fruits of Emancipation/);
  {
    const joined = packed.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = packed.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});

test("Noli Me Tangere opens on Capitan Tiago’s dinner and binds only the Pasig-house sit", () => {
  const work = SHELF.find((item) => item.id === "noli-me-tangere");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 6737);
  assert.equal(work!.title, "Noli Me Tangere (The Social Cancer)");
  assert.equal(work!.author, "José Rizal (tr. Charles Derbyshire)");
  assert.match(work!.opening ?? "", /^On the last of October Don Santiago de los Santos/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/noli-me-tangere.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/noli-me-tangere.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Capitan Tiago/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^On the last of October Don Santiago de los Santos/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /Chinese water-carrier finds it convenient\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /Ibarra|Crisostomo|Crisóstomo/i.test(breath.text)),
    false,
    "open-at should stop before Ibarra / the rest of the novel",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(full.breaths[0]?.text ?? "", /^On the last of October Don Santiago de los Santos/);
  {
    const joined = packed.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = packed.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});

test("Vera opens on the cliff gate and binds only the second felt-nothing sit", () => {
  const work = SHELF.find((item) => item.id === "vera");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 34366);
  assert.equal(work!.title, "Vera");
  assert.equal(work!.author, "Elizabeth von Arnim");
  assert.equal(work!.year, 1921);
  assert.match(work!.opening ?? "", /^When the doctor had gone/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/vera.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/vera.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Cliff gate/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^When the doctor had gone/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /and she felt nothing\.?$/);
  const feltNothing = packed.breaths.filter((breath) => /she felt nothing/.test(breath.text));
  assert.equal(feltNothing.length, 2, "SOFT-alt sit runs through the second felt nothing");
  assert.equal(
    packed.breaths.some((breath) => /Wemyss|Everard/i.test(breath.text)),
    false,
    "open-at should stop before Wemyss / the rest of the novel",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(full.breaths[0]?.text ?? "", /^When the doctor had gone/);
  {
    const joined = packed.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = packed.breaths.filter((breath) => {
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

test("Futility opens on the sisters’ bouquet and skips the Wharton preface", () => {
  const work = SHELF.find((item) => item.id === "futility");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 77253);
  assert.equal(work!.title, "Futility");
  assert.equal(work!.author, "William Gerhardie");
  assert.match(work!.opening ?? "", /^It was somewhat in the manner of an Ibsen drama/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/futility.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/futility.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Sisters/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^It was somewhat in the manner of an Ibsen drama/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /the only man who really mattered in the world/);
  assert.equal(
    packed.breaths.some((breath) => /Wharton|preface/i.test(breath.text)),
    false,
    "open-at should skip the Wharton preface",
  );
  assert.ok(packed.breaths.some((breath) => /_datcha_/.test(breath.text)));
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Poison Tree opens on the Ganges storm and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "poison-tree");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 17455);
  assert.equal(work!.title, "The Poison Tree");
  assert.equal(work!.author, "Bankim Chandra Chatterjee (tr. Miriam S. Knight)");
  assert.match(work!.opening ?? "", /^Nagendra Natha Datta is about to travel by boat/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/poison-tree.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/poison-tree.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /storm/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Nagendra Natha Datta is about to travel by boat/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /heavy storm of rain\.?$/);
  assert.ok(packed.breaths.some((breath) => /_zemindar_/.test(breath.text)));
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Trooper Peter Halket opens on the kopje fire and stops before the stranger", () => {
  const work = SHELF.find((item) => item.id === "trooper-peter-halket");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 1431);
  assert.equal(work!.title, "Trooper Peter Halket of Mashonaland");
  assert.equal(work!.author, "Olive Schreiner");
  assert.equal(work!.year, 1897);
  assert.match(work!.opening ?? "", /^It was a dark night/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/trooper-peter-halket.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/trooper-peter-halket.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /name that colonial frame up front/);
  assert.match(full.note, /name that colonial frame up front/);
  assert.match(work!.intro ?? "", /name that colonial frame up front/);
  assert.doesNotMatch(packed.note, /do not extend|locked/i);
  assert.doesNotMatch(full.note, /do not extend|locked/i);
  assert.match(packed.scenes[0]?.title ?? "", /Kopje fire/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^It was a dark night/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /keep awake the whole night beside it\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /\bstranger\b/i.test(breath.text)),
    false,
    "open-at should stop before the stranger",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Home and the World opens on Mother’s vermilion and binds only the mirror-prayer sit", () => {
  const work = SHELF.find((item) => item.id === "the-home-and-the-world");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 7166);
  assert.equal(work!.title, "The Home and the World");
  assert.equal(work!.author, "Rabindranath Tagore (tr. Surendranath Tagore)");
  assert.equal(work!.year, 1916);
  assert.match(work!.opening ?? "", /^Mother, today there comes back to mind/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-home-and-the-world.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-home-and-the-world.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /beauty, colour, and duty/);
  assert.match(packed.note, /Salon stops at the mirror prayer/);
  assert.doesNotMatch(packed.note, /Host further|Featured-track|Recommend/i);
  assert.match(packed.scenes[0]?.title ?? "", /Mirror prayer/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Mother, today there comes back to mind/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /model of what woman should be\.?$/);
  assert.equal(packed.breaths[0]?.text.startsWith("Mother,"), true);
  assert.doesNotMatch(packed.breaths.map((breath) => breath.text).join("\n"), /\bMOTHER\b/);
  assert.ok(packed.breaths.some((breath) => /\*sari\*/.test(breath.text)));
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  {
    const joined = packed.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = packed.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});

test("Enchanted April opens on the first-session dripping-street cut, not the long Host sit", () => {
  const work = SHELF.find((item) => item.id === "enchanted-april");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 16389);
  assert.equal(work!.title, "The Enchanted April");
  assert.equal(work!.author, "Elizabeth von Arnim");
  assert.equal(work!.year, 1922);
  assert.match(work!.opening ?? "", /^It began in a Woman/);
  assert.match(work!.opening ?? "", /\*The Times\*/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/enchanted-april.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/enchanted-april.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /first-session|dripping street|wet-street/i);
  assert.match(packed.note, /soft-launch/i);
  assert.doesNotMatch(packed.note, /Five to ten minutes|nest-egg|what nonsense|Featured|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /Agony Column/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^It began in a Woman/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /dripping street\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /what nonsense|Mrs\. Arbuthnot|nest-egg/i.test(breath.text)),
    false,
    "open-at should stop on the dripping street, before the long agony-column sit",
  );
  assert.ok(packed.breaths.some((breath) => /\*The Times\*/.test(breath.text)));
  assert.equal(
    packed.breaths.some((breath) => /_The Times_/.test(breath.text)),
    false,
    "live bind uses *The Times*, not Gutenberg _italics_",
  );
  const words = packed.breaths
    .map((breath) => breath.text)
    .join(" ")
    .replace(/[*_]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  assert.ok(
    words.length >= 145 && words.length <= 170,
    `expected ~158 words, got ${words.length}`,
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  {
    const joined = packed.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    assert.doesNotMatch(joined, /what nonsense|Mrs\. Arbuthnot/i);
  }
  assert.doesNotMatch(full.breaths.map((breath) => breath.text).join("\n"), /project gutenberg/i);
});

test("Where Angels Fear to Tread opens at Charing Cross and binds only the town-list sit", () => {
  const work = SHELF.find((item) => item.id === "where-angels-fear-to-tread");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 2948);
  assert.equal(work!.title, "Where Angels Fear to Tread");
  assert.equal(work!.author, "E. M. Forster");
  assert.equal(work!.year, 1905);
  assert.match(work!.opening ?? "", /^They were all at Charing Cross/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/where-angels-fear-to-tread.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/where-angels-fear-to-tread.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Charing Cross/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^They were all at Charing Cross/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /Monteriano\.?"?$/);
  assert.equal(
    packed.breaths.some((breath) => /Gino|baby/i.test(breath.text)),
    false,
    "open-at should stop before Gino / the rest of the novel",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  {
    const joined = packed.breaths.map((breath) => breath.text).join("\n");
    assert.doesNotMatch(joined, /project gutenberg/i);
    const decorative = packed.breaths.filter((breath) => {
      const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
      return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
    });
    assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
  }
});

test("The Gadfly opens in Pisa and binds the Fragola sit, with full text for continue", () => {
  const work = SHELF.find((item) => item.id === "the-gadfly");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 3431);
  assert.equal(work!.title, "The Gadfly");
  assert.equal(work!.author, "Ethel Lilian Voynich");
  assert.equal(work!.year, 1897);
  assert.match(work!.opening ?? "", /^Arthur sat in the library/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-gadfly.json", import.meta.url), "utf8"),
  ) as { scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-gadfly.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[]; scenes: { title: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Fragola/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Arthur sat in the library/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /Fragola/);
  assert.ok(packed.breaths.some((breath) => /\*Fragola!\*/.test(breath.text)));
  assert.equal(
    packed.breaths.some((breath) => /Switzerland|Burton/i.test(breath.text)),
    false,
    "open-at should stop before the rest of the novel",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full PG text remains for continue");
  assert.match(full.breaths[0]?.text ?? "", /^Arthur sat in the library/);
  assert.ok(full.scenes.some((scene) => /CHAPTER II/i.test(scene.title)));
  const joined = packed.breaths.map((breath) => breath.text).join("\n");
  assert.doesNotMatch(joined, /project gutenberg/i);
  const decorative = packed.breaths.filter((breath) => {
    const withoutRoman = breath.text.replace(/\b(?:I{1,3}|IV|VI{0,3}|IX|X)\b/g, "");
    return /\b[A-Z]{2,}[A-Z'’]*\b/.test(withoutRoman);
  });
  assert.deepEqual(decorative, [], `leftover ALL-CAPS: ${decorative.map((b) => b.text).join(" | ")}`);
});

test("The Immoralist opens on the freedom line and skips the 1930 preface", () => {
  const work = SHELF.find((item) => item.id === "the-immoralist");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 78975);
  assert.equal(work!.title, "The Immoralist");
  assert.equal(work!.author, "André Gide (tr. Dorothy Bussy)");
  assert.equal(work!.year, 1930);
  assert.match(work!.opening ?? "", /^My dear friends, I knew you were faithful/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-immoralist.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-immoralist.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /freedom line/);
  assert.match(packed.note, /Warn the room if you Host further/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /Freedom line/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^My dear friends, I knew you were faithful/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /talking to myself\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /preface|Bussy/i.test(breath.text)),
    false,
    "open-at should skip the Gide/Bussy preface",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.doesNotMatch(packed.breaths.map((breath) => breath.text).join("\n"), /project gutenberg/i);
});

test("Letters of a Javanese Princess ships the hardened Host note and skips Couperus", () => {
  const work = SHELF.find((item) => item.id === "letters-of-a-javanese-princess");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 34647);
  assert.equal(work!.title, "Letters of a Javanese Princess");
  assert.equal(work!.author, "Raden Adjeng Kartini (tr. Agnes Louise Symmers)");
  assert.equal(work!.year, 1920);
  assert.match(work!.opening ?? "", /^I have longed to make the acquaintance/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/letters-of-a-javanese-princess.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/letters-of-a-javanese-princess.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /Indian world/);
  assert.match(packed.note, /pale sisters/);
  assert.match(packed.note, /name that colonial frame for the room first/);
  assert.match(packed.note, /not today’s usage/);
  assert.match(full.note, /Indian world/);
  assert.match(work!.intro ?? "", /Indian world/);
  assert.match(work!.intro ?? "", /pale sisters/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|Couperus/i);
  assert.match(packed.scenes[0]?.title ?? "", /Cloistered arms/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^I have longed to make the acquaintance/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /infinitely far\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /Couperus|foreword|\[\d+\]/.test(breath.text)),
    false,
    "open-at should skip Couperus and footnote markers",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full letters stay available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Blood and Sand opens on fight-day breakfast and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "blood-and-sand");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 54222);
  assert.equal(work!.title, "Blood and Sand");
  assert.equal(work!.author, "Vicente Blasco Ibáñez (tr. Mrs. W. A. Gillespie)");
  assert.equal(work!.year, 1908);
  assert.match(work!.opening ?? "", /^Juan Gallardo breakfasted early/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/blood-and-sand.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/blood-and-sand.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Fight-day breakfast/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Juan Gallardo breakfasted early/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /not made much impression\.?$/);
  assert.ok(packed.breaths.some((breath) => /\*la alternativa\*/.test(breath.text)));
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Ecstasy opens on the Scheveningen boudoir and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "ecstasy");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 37770);
  assert.equal(work!.title, "Ecstasy");
  assert.equal(work!.author, "Louis Couperus (tr. Alexander Teixeira de Mattos)");
  assert.equal(work!.year, 1919);
  assert.match(work!.opening ?? "", /^Dolf Van Attema/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/ecstasy.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/ecstasy.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Scheveningen Road/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Dolf Van Attema/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /kept the boy awake for hours\.?$/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("An Outcast of the Islands uses the trimmed brackets sit and a required Host note", () => {
  const work = SHELF.find((item) => item.id === "an-outcast-of-the-islands");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 638);
  assert.equal(work!.title, "An Outcast of the Islands");
  assert.equal(work!.author, "Joseph Conrad");
  assert.equal(work!.year, 1896);
  assert.match(work!.opening ?? "", /^When he stepped off the straight and narrow path/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/an-outcast-of-the-islands.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/an-outcast-of-the-islands.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /sentence in brackets/);
  assert.match(packed.note, /household contempt/);
  assert.match(packed.note, /If you Host further, name that frame for the room first/);
  assert.match(full.note, /If you Host further, name that frame for the room first/);
  assert.match(work!.intro ?? "", /if you Host further, name that frame for the room first/i);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|SOFT-full/i);
  assert.match(packed.scenes[0]?.title ?? "", /brackets/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^When he stepped off the straight and narrow path/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /quickly forgotten\.?$/);
  assert.equal(packed.breaths.length, 2);
  const joined = packed.breaths.map((breath) => breath.text).join("\n");
  assert.doesNotMatch(joined, /half-caste|pale yellow|dark-skinned|tyrannize/i);
  assert.doesNotMatch(joined, /sunshine|garden before his house/i);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Underdogs opens in the sierra hut and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "the-underdogs");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 549);
  assert.equal(work!.title, "The Underdogs");
  assert.equal(work!.author, "Mariano Azuela (tr. E. Munguía, Jr.)");
  assert.equal(work!.year, 1929);
  assert.match(work!.opening ?? "", /^"That's no animal/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-underdogs.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-underdogs.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Sierra hut/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^"That's no animal/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /covered with gray rags\.?$/);
  assert.equal(
    packed.breaths.some((breath) => /buckled his cartridge belt|shot rang out/i.test(breath.text)),
    false,
    "open-at should stop before Demetrio leaves the hut",
  );
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Painted Veil opens on the shuttered door and skips the PREFACE", () => {
  const work = SHELF.find((item) => item.id === "the-painted-veil");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 64682);
  assert.equal(work!.title, "The Painted Veil");
  assert.equal(work!.author, "W. Somerset Maugham");
  assert.equal(work!.year, 1925);
  assert.match(work!.opening ?? "", /^She gave a startled cry/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-painted-veil.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-painted-veil.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string }[]; breaths: { text: string }[] };
  assert.match(packed.note, /How shall I get out/);
  assert.match(packed.note, /Name the frame if you Host further/);
  assert.match(work!.intro ?? "", /amah/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /The door/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^She gave a startled cry/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /How shall I get out\?/);
  assert.equal(
    packed.breaths.some((breath) => /PREFACE|preface/i.test(breath.text)),
    false,
    "open-at should skip PREFACE",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
  assert.match(full.breaths[0]?.text ?? "", /^She gave a startled cry/);
  assert.ok(full.scenes.length > 20, "real chapter scenes through the novel");
  assert.notEqual(full.breaths.at(-1)?.text, packed.breaths.at(-1)?.text);
});

test("The Good Soldier opens on the glove and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "the-good-soldier");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 2775);
  assert.equal(work!.title, "The Good Soldier");
  assert.equal(work!.author, "Ford Madox Ford");
  assert.equal(work!.year, 1915);
  assert.match(work!.opening ?? "", /^This is the saddest story I have ever heard/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-good-soldier.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-good-soldier.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /A good glove/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^This is the saddest story I have ever heard/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /I had known the shallows\.?$/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.equal(
    packed.breaths.some((breath) => /PART I/.test(breath.text)),
    false,
    "open-at should skip PART I chrome",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Growth of the Soil ships the soft Host note for period Lapp / Sámi", () => {
  const work = SHELF.find((item) => item.id === "growth-of-the-soil");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 10984);
  assert.equal(work!.title, "Growth of the Soil");
  assert.equal(work!.author, "Knut Hamsun (tr. W. W. Worster)");
  assert.equal(work!.year, 1920);
  assert.match(work!.opening ?? "", /^The long, long road over the moors/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/growth-of-the-soil.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/growth-of-the-soil.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /\bLapp\b/);
  assert.match(packed.note, /Sámi/);
  assert.match(packed.note, /If you Host further, keep that named for the room/);
  assert.match(full.note, /Sámi/);
  assert.match(work!.intro ?? "", /Sámi/);
  assert.match(work!.intro ?? "", /\bLapp\b/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /The first sack/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^The long, long road over the moors/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /in search of peace\.?$/);
  assert.ok(packed.breaths.some((breath) => /\bLapp\b/.test(breath.text)));
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Nada the Lily ships the required colonial Host note and hidden-name sit", () => {
  const work = SHELF.find((item) => item.id === "nada-the-lily");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 1207);
  assert.equal(work!.title, "Nada the Lily");
  assert.equal(work!.author, "H. Rider Haggard");
  assert.equal(work!.year, 1892);
  assert.match(work!.opening ?? "", /^You ask me, my father/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/nada-the-lily.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/nada-the-lily.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /White Man/);
  assert.match(packed.note, /Great Queen/);
  assert.match(packed.note, /Name that frame for the room before you Host further/);
  assert.match(full.note, /colonial adventure voice/);
  assert.match(work!.intro ?? "", /White Man/);
  assert.match(work!.intro ?? "", /Name that frame for the room before you Host further/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open|silent-ship/i);
  assert.match(packed.scenes[0]?.title ?? "", /Hidden name/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^You ask me, my father/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /did any know my name\.?$/);
  assert.ok(packed.breaths.some((breath) => /Zweete/.test(breath.text)));
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Diary of a Chambermaid opens on hiring day and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "diary-of-a-chambermaid");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 44303);
  assert.equal(work!.title, "The Diary of a Chambermaid");
  assert.equal(work!.author, "Octave Mirbeau");
  assert.equal(work!.year, 1900);
  assert.match(work!.opening ?? "", /^To-day, September 14/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/diary-of-a-chambermaid.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/diary-of-a-chambermaid.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.scenes[0]?.title ?? "", /Hiring day/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^To-day, September 14/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /without any interview with Madame\.?$/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("All Quiet on the Western Front opens on double rations and skips the epigraph", () => {
  const work = SHELF.find((item) => item.id === "all-quiet-on-the-western-front");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 75011);
  assert.equal(work!.title, "All Quiet on the Western Front");
  assert.equal(work!.author, "Erich Maria Remarque (tr. A. W. Wheen)");
  assert.equal(work!.year, 1929);
  assert.match(work!.opening ?? "", /^We are at rest five miles behind the front/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/all-quiet-on-the-western-front.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/all-quiet-on-the-western-front.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /double sausage/);
  assert.match(packed.note, /Warn the room if you Host further/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /Double rations/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^We are at rest five miles behind the front/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /now that is decent\.?$/);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("We opens on burning cheeks, skips FOREWORD, and keeps id we", () => {
  const work = SHELF.find((item) => item.id === "we");
  assert.ok(work);
  assert.equal(work!.id, "we");
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 61963);
  assert.equal(work!.title, "We");
  assert.equal(work!.author, "Yevgeny Zamyatin (tr. Gregory Zilboorg)");
  assert.equal(work!.year, 1924);
  assert.match(work!.opening ?? "", /^I feel my cheeks are burning/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/we.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/we.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /wisest of lines/);
  assert.match(packed.note, /Skip FOREWORD/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /The wisest of lines/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^I feel my cheeks are burning/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /despite my limitations\?$/);
  assert.equal(
    packed.breaths.some((breath) => /FOREWORD|This is merely a copy/i.test(breath.text)),
    false,
    "open-at should skip FOREWORD and the newspaper copy",
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Story of Gösta Berling opens on the pulpit and skips the translator preface", () => {
  const work = SHELF.find((item) => item.id === "the-story-of-gosta-berling");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 56158);
  assert.equal(work!.title, "The Story of Gösta Berling");
  assert.equal(work!.author, "Selma Lagerlöf (tr. Pauline Bancroft Flach)");
  assert.equal(work!.year, 1898);
  assert.match(work!.opening ?? "", /^At last the minister stood in the pulpit/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-story-of-gosta-berling.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-story-of-gosta-berling.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /pulpit/);
  assert.match(packed.note, /Skip the translator preface/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /The pulpit/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^At last the minister stood in the pulpit/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /Captain Christian Bergh\.?$/);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Demian opens on two worlds and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "demian");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 74222);
  assert.equal(work!.title, "Demian");
  assert.equal(work!.author, "Hermann Hesse (tr. N. H. Priday)");
  assert.equal(work!.year, 1923);
  assert.match(work!.opening ?? "", /^I will begin my story with an event of the time when I was ten or eleven/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/demian.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/demian.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /two worlds/i);
  assert.match(packed.note, /Childhood two-worlds map/);
  assert.match(packed.note, /Priday 1923 EN only/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /Two worlds/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^I will begin my story with an event of the time when I was ten or eleven/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /Christmas was kept\.?$/);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Death Comes for the Archbishop opens on red hills, not the Rome prologue", () => {
  const work = SHELF.find((item) => item.id === "death-comes-for-the-archbishop");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 69730);
  assert.equal(work!.title, "Death Comes for the Archbishop");
  assert.equal(work!.author, "Willa Cather");
  assert.equal(work!.year, 1927);
  assert.match(work!.opening ?? "", /^One afternoon in the autumn of 1851 a solitary horseman/);
  assert.doesNotMatch(work!.opening ?? "", /Sabine|Rome/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/death-comes-for-the-archbishop.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/death-comes-for-the-archbishop.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  assert.match(packed.note, /red hills/i);
  assert.match(packed.note, /Open on Book One New Mexico only/);
  assert.match(packed.note, /never the Sabine-hills Rome prologue/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /Open on Book One New Mexico only/);
  assert.match(packed.scenes[0]?.title ?? "", /Red hills/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^One afternoon in the autumn of 1851 a solitary horseman/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /than if he had stood still\.?$/);
  assert.match(full.breaths[0]?.text ?? "", /^One afternoon in the autumn of 1851 a solitary horseman/);
  assert.doesNotMatch(full.scenes[0]?.title ?? "", /ROME/i);
  assert.doesNotMatch(
    full.breaths.slice(0, 12).map((breath) => breath.text).join(" "),
    /Sabine hills|three Cardinals/i,
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("The Getting of Wisdom opens on the dirty-sheet sit and keeps the novel", () => {
  const work = SHELF.find((item) => item.id === "the-getting-of-wisdom");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 3728);
  assert.equal(work!.title, "The Getting of Wisdom");
  assert.equal(work!.author, "Henry Handel Richardson");
  assert.equal(work!.year, 1910);
  assert.match(work!.opening ?? "", /^The four children were lying on the grass/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/the-getting-of-wisdom.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/the-getting-of-wisdom.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /dirty sheet/i);
  assert.match(packed.note, /School-status novel, not a children's book/);
  assert.match(packed.note, /Melbourne Ladies' College/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /School-status novel, not a children's book/);
  assert.match(packed.scenes[0]?.title ?? "", /Dirty sheet/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^The four children were lying on the grass/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /said Pin, who was practical\.?$/);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Bliss opens on the title story and keeps the dinner-party turn", () => {
  const work = SHELF.find((item) => item.id === "bliss");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 44385);
  assert.equal(work!.title, "Bliss");
  assert.equal(work!.author, "Katherine Mansfield");
  assert.equal(work!.year, 1920);
  assert.match(work!.opening ?? "", /^Although Bertha Young was thirty/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/bliss.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/bliss.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /radiant mirror/i);
  assert.match(packed.note, /never Prelude/i);
  assert.match(packed.note, /dinner-party turn/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /never Prelude/i);
  assert.match(packed.scenes[0]?.title ?? "", /Radiant mirror/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Although Bertha Young was thirty/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /infallibly\.?$/);
  assert.match(full.breaths[0]?.text ?? "", /^Although Bertha Young was thirty/);
  assert.match(full.breaths.at(-1)?.text ?? "", /pear tree was as lovely as ever/);
  assert.doesNotMatch(
    full.breaths.slice(0, 8).map((breath) => breath.text).join(" "),
    /Lottie and Kezia/i,
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full title story stays after the sit");
  assert.equal(work!.breaths, full.breaths.length);
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
  const packed = JSON.parse(
    readFileSync(new URL("./openings/a-hundred-and-seventy-chinese-poems.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/a-hundred-and-seventy-chinese-poems.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /Winter Night/);
  assert.match(packed.note, /not Battle|Never Battle/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /Never Battle/);
  assert.match(packed.scenes[0]?.title ?? "", /Winter Night/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^My bed is so empty/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /shut it up inside\.?$/);
  assert.doesNotMatch(packed.breaths.map((breath) => breath.text).join(" "), /\bBattle\b/);
  assert.doesNotMatch(full.breaths[0]?.text ?? "", /^Battle/i);
  assert.ok(full.breaths.length > packed.breaths.length, "later lyrics stay after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Dubliners opens on The Sisters only, not The Dead", () => {
  const work = SHELF.find((item) => item.id === "dubliners");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 2814);
  assert.equal(work!.title, "Dubliners");
  assert.equal(work!.author, "James Joyce");
  assert.equal(work!.year, 1914);
  assert.match(work!.opening ?? "", /^There was no hope for him this time/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/dubliners.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/dubliners.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string }[]; breaths: { text: string }[] };
  assert.match(packed.note, /The Sisters only/);
  assert.match(packed.note, /not The Dead/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /The Sisters/);
  assert.match(packed.scenes[0]?.title ?? "", /The Sisters/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^There was no hope for him this time/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /arranging his opinion in his mind\.?$/);
  assert.doesNotMatch(full.breaths.map((breath) => breath.text).join(" "), /Gabriel Conroy/i);
  assert.doesNotMatch(full.scenes.map((scene) => scene.title).join(" "), /The Dead/i);
  assert.ok(full.breaths.length > packed.breaths.length, "full Sisters story stays after the sit");
  assert.equal(work!.breaths, full.breaths.length);
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
  assert.match(packed.scenes[0]?.title ?? "", /little flute/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Thou hast made me endless/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /friend who art my lord\.?$/);
  assert.match(full.breaths[0]?.text ?? "", /^Thou hast made me endless/);
  assert.doesNotMatch(
    full.breaths.slice(0, 20).map((breath) => breath.text).join(" "),
    /Yeats|INTRODUCTION/i,
  );
  assert.ok(full.breaths.length > packed.breaths.length, "later offerings stay after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Martin Birck's Youth opens on the childhood dream and skips the Stork preface", () => {
  const work = SHELF.find((item) => item.id === "martin-bircks-youth");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 78363);
  assert.equal(work!.title, "Martin Birck's Youth");
  assert.equal(work!.author, "Hjalmar Söderberg (tr. Charles Wharton Stork)");
  assert.equal(work!.year, 1930);
  assert.match(work!.opening ?? "", /^Martin Birck was a little child/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/martin-bircks-youth.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/martin-bircks-youth.json", import.meta.url), "utf8"),
  ) as { note: string; breaths: { text: string }[] };
  assert.match(packed.note, /Skip the Stork preface/);
  assert.match(packed.note, /1930 English only/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(full.note, /never the translator preface/i);
  assert.match(packed.scenes[0]?.title ?? "", /Childhood garden/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^Martin Birck was a little child/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /near to weeping\.?$/);
  assert.match(full.breaths[0]?.text ?? "", /^Martin Birck was a little child/);
  assert.doesNotMatch(
    full.breaths.slice(0, 12).map((breath) => breath.text).join(" "),
    /C\. W\. S|enfant terrible|PREFACE/i,
  );
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
});

test("Thaïs opens on Nile hermit huts and binds only that sit", () => {
  const work = SHELF.find((item) => item.id === "thais");
  assert.ok(work);
  assert.equal(work!.local, true);
  assert.equal(isBoundLocal(work!), true);
  assert.equal(work!.gutenberg, 2078);
  assert.equal(work!.title, "Thaïs");
  assert.equal(work!.author, "Anatole France (tr. Robert B. Douglas)");
  assert.equal(work!.year, 1909);
  assert.match(work!.opening ?? "", /^In those days there were many hermits/);
  const packed = JSON.parse(
    readFileSync(new URL("./openings/thais.json", import.meta.url), "utf8"),
  ) as { note: string; scenes: { title: string; reentry: string }[]; breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./texts/thais.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.match(packed.note, /hermits/);
  assert.match(packed.note, /Paphnutius/);
  assert.doesNotMatch(packed.note, /Featured-track|Recommend|cold-open/i);
  assert.match(packed.scenes[0]?.title ?? "", /Nile huts/i);
  assert.match(packed.scenes[0]?.reentry ?? "", /^In those days there were many hermits/);
  assert.match(packed.breaths.at(-1)?.text ?? "", /cave or tomb\.?$/);
  assert.ok(full.breaths.length > packed.breaths.length, "full novel stays available after the sit");
  assert.equal(work!.breaths, full.breaths.length);
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

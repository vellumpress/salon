import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { blurbFor } from "./catalog/blurbs.ts";
import { countryFor } from "./catalog/countries.ts";
import { pitchFor } from "./catalog/pitches.ts";
import { chipOnlyLabel, placeFor } from "./catalog/places.ts";
import { prefaceFor } from "./catalog/prefaces.ts";
import { ritualPitchFor } from "./catalog/rituals.ts";
import { SHELF } from "./catalog/shelf.ts";
import { isSectionBreak, splitEmphasis } from "./emphasized-text.ts";
import { readerIntro, trimReaderIntro } from "./reader-intro.ts";
import type { Work } from "./works.ts";

function work(id: string, note = ""): Work {
  return {
    id,
    title: "Title",
    author: "Author",
    year: "1929",
    note,
    minutes: 1,
    cover: "",
    coverAlt: "",
    scenes: [],
    breaths: [],
  };
}

function shelfAsWork(id: string): Work {
  const item = SHELF.find((row) => row.id === id);
  assert.ok(item, id);
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    year: String(item.year),
    note: item.intro ?? "",
    minutes: item.minutes,
    cover: "",
    coverAlt: "",
    scenes: [],
    breaths: [],
  };
}

test("uses a locked recommend shelf pitch before other copy", () => {
  assert.equal(
    readerIntro(work("passing", "This LE About copy should not win.")),
    "Irene Redfield sorts her morning mail in Harlem and finds a thin envelope in purple ink—no return address, a hand she knows at once. Clare Kendry, the childhood friend who slipped into another world, is writing again. Nella Larsen’s 1929 New York novel opens on that letter, still unopened, and the careful life it threatens to unsettle.",
  );
});

test("Quicksand open uses the before-sleep closed-door sit", () => {
  const copy = readerIntro(shelfAsWork("quicksand"));
  assert.match(copy, /Helga Crane sits alone/);
  assert.match(copy, /will not open the door/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
});

test("Enchanted April open uses the first-session Agony Column sit", () => {
  const copy = readerIntro(shelfAsWork("enchanted-april"));
  assert.match(copy, /Shaftesbury Avenue/);
  assert.match(copy, /Agony Column/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured|nest-egg/i);
});

test("Mr. Fortune’s Maggot open uses the one-convert sit", () => {
  const copy = readerIntro(shelfAsWork("mr-fortunes-maggot"));
  assert.match(copy, /Fanua/);
  assert.match(copy, /Timothy Fortune/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
});

test("The Attendant’s Confession uses the before-sleep human-document sit", () => {
  const copy = readerIntro(shelfAsWork("attendants-confession"));
  assert.match(copy, /human document/);
  assert.match(copy, /smells of the grave/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Mogul/i);
});

test("Rashōmon uses the before-sleep empty-gate sit", () => {
  const copy = readerIntro(shelfAsWork("rashomon"));
  assert.match(copy, /Evening under Rashōmon/);
  assert.match(copy, /desolation before the crime story blooms/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Hearn/i);
});

test("A High Wind in Jamaica uses the before-sleep rank-plant sit", () => {
  const copy = readerIntro(shelfAsWork("high-wind-jamaica"));
  assert.match(copy, /Jamaica after Emancipation/);
  assert.match(copy, /rank plant/);
  assert.match(copy, /period racial language/);
  assert.match(copy, /that period language continues/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|do not extend|locked/i);
});

test("Noli Me Tangere uses the unwind dinner-announcement sit", () => {
  const copy = readerIntro(shelfAsWork("noli-me-tangere"));
  assert.match(copy, /Capitan Tiago announces a dinner/);
  assert.match(copy, /Binondo/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host note/i);
});

test("Botchan uses the first-session scar sit", () => {
  const copy = readerIntro(shelfAsWork("botchan"));
  assert.match(copy, /scar that will be there until his death/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Kiyo/i);
});

test("Vera uses the before-sleep cliff-gate sit", () => {
  const copy = readerIntro(shelfAsWork("vera"));
  assert.match(copy, /Cornwall/);
  assert.match(copy, /garden gate/);
  assert.match(copy, /Wemyss intensifies later/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("On a Chinese Screen uses the waking Parlour sit", () => {
  const copy = readerIntro(shelfAsWork("on-a-chinese-screen"));
  assert.match(copy, /Cheltenham/);
  assert.match(copy, /American stove/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|Orientalist/i);
});

test("African Farm opens on the Karoo moon, preface skipped", () => {
  const copy = readerIntro(shelfAsWork("african-farm"));
  assert.match(copy, /full African moon/);
  assert.match(copy, /lonely plain/);
  assert.match(copy, /kopje/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|THE STORY OF AN AFRICAN FARM/i);
});

test("Marianela opens on Bell’s dusk traveller, not a translator preface", () => {
  const copy = readerIntro(shelfAsWork("marianela"));
  assert.match(copy, /The sun had set/);
  assert.match(copy, /north of Spain/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|translator/i);
});

test("Passage to India opens on Chandrapore, dedication skipped", () => {
  const copy = readerIntro(shelfAsWork("a-passage-to-india"));
  assert.match(copy, /Marabar/);
  assert.match(copy, /Chandrapore/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i);
});

test("Mhudi opens on the Bechuana tribes, not the chapter subtitle", () => {
  const copy = readerIntro(shelfAsWork("mhudi"));
  assert.match(copy, /Bechuana/);
  assert.match(copy, /Kalahari/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i);
});

test("María opens on the Bogotá college, distinct from Marianela", () => {
  const copy = readerIntro(shelfAsWork("maria"));
  assert.match(copy, /Bogotá/);
  assert.match(copy, /Marianela/);
  assert.doesNotMatch(copy, /The sun had set/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i);
});

test("Bel-Ami opens on the five-franc piece", () => {
  const copy = readerIntro(shelfAsWork("bel-ami"));
  assert.match(copy, /five-franc/);
  assert.match(copy, /1885/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i);
});

test("Magnhild opens on the storm, preface skipped", () => {
  const copy = readerIntro(shelfAsWork("magnhild"));
  assert.match(copy, /fjord/);
  assert.match(copy, /Magnhild/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured|Dust/i);
});

test("On the Seaboard opens on Goosestone bay, preface skipped", () => {
  const copy = readerIntro(shelfAsWork("on-the-seaboard"));
  assert.match(copy, /Goosestone bay/);
  assert.match(copy, /Rokarna/);
  assert.match(copy, /Surveyor/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track/i);
});

test("Futility uses the Simbirsk open, preface skipped", () => {
  const copy = readerIntro(shelfAsWork("futility"));
  assert.match(copy, /Simbirsk/);
  assert.match(copy, /table-cloth/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|Wharton/i);
});

test("The Poison Tree uses the unwind Ganges-storm sit", () => {
  const copy = readerIntro(shelfAsWork("poison-tree"));
  assert.match(copy, /leave the boat/);
  assert.match(copy, /Joisto/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host note|Recommend/i);
});

test("Trooper Peter Halket uses the before-sleep kopje-fire sit", () => {
  const copy = readerIntro(shelfAsWork("trooper-peter-halket"));
  assert.match(copy, /kopje/);
  assert.match(copy, /Chartered Company/);
  assert.match(copy, /colonial/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|do not extend|locked/i);
});

test("The Home and the World uses the before-sleep mirror-prayer sit", () => {
  const copy = readerIntro(shelfAsWork("the-home-and-the-world"));
  assert.match(copy, /vermilion/);
  assert.match(copy, /mirror/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("Where Angels Fear to Tread uses the waking Charing Cross sit", () => {
  const copy = readerIntro(shelfAsWork("where-angels-fear-to-tread"));
  assert.match(copy, /Charing Cross/);
  assert.match(copy, /Monteriano/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("The Gadfly uses the before-sleep Fragola sit", () => {
  const copy = readerIntro(shelfAsWork("the-gadfly"));
  assert.match(copy, /Pisa/);
  assert.match(copy, /Fragola/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("The Immoralist uses the before-sleep freedom-line sit", () => {
  const copy = readerIntro(shelfAsWork("the-immoralist"));
  assert.match(copy, /freedom/);
  assert.match(copy, /Michel/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("Letters of a Javanese Princess shows the colonial-frame heads-up before the sit", () => {
  const copy = readerIntro(shelfAsWork("letters-of-a-javanese-princess"));
  assert.match(copy, /Indian world/);
  assert.match(copy, /pale sisters/);
  assert.match(copy, /cloistered-arms/);
  assert.match(copy, /not today’s usage/);
  assert.match(copy, /colonial frame/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("Ecstasy uses the before-sleep Scheveningen boudoir sit", () => {
  const copy = readerIntro(shelfAsWork("ecstasy"));
  assert.match(copy, /Scheveningen/);
  assert.match(copy, /promise not to wake the boy/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("An Outcast of the Islands shows the colonial-frame heads-up before the sit", () => {
  const copy = readerIntro(shelfAsWork("an-outcast-of-the-islands"));
  assert.match(copy, /straight path/);
  assert.match(copy, /racialized language/);
  assert.match(copy, /intensify after the opening/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|SOFT-full/i);
});

test("The Underdogs uses the waking sierra-hut sit", () => {
  const copy = readerIntro(shelfAsWork("the-underdogs"));
  assert.match(copy, /sierra/);
  assert.match(copy, /rifle under the mat/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("The Diary of a Chambermaid uses the waking hiring-day sit", () => {
  const copy = readerIntro(shelfAsWork("diary-of-a-chambermaid"));
  assert.match(copy, /Twelfth place/);
  assert.match(copy, /Figaro/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("The Painted Veil uses the before-sleep door sit and names the frame", () => {
  const copy = readerIntro(shelfAsWork("the-painted-veil"));
  assert.match(copy, /Walter/);
  assert.match(copy, /amah/);
  assert.match(copy, /How shall I get out/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("The Good Soldier uses the Nauheim sit", () => {
  const copy = readerIntro(shelfAsWork("the-good-soldier"));
  assert.match(copy, /Nauheim/);
  assert.match(copy, /saddest story/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Growth of the Soil shows the period Lapp / Sámi heads-up", () => {
  const copy = readerIntro(shelfAsWork("growth-of-the-soil"));
  assert.match(copy, /sack/);
  assert.match(copy, /\bLapp\b/);
  assert.match(copy, /Sámi/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("All Quiet on the Western Front uses the before-sleep double-rations sit", () => {
  const copy = readerIntro(shelfAsWork("all-quiet-on-the-western-front"));
  assert.match(copy, /five miles behind the front/i);
  assert.match(copy, /double sausage/);
  assert.match(copy, /trench violence/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("We uses the waking wisest-of-lines sit", () => {
  const copy = readerIntro(shelfAsWork("we"));
  assert.match(copy, /cheeks burning/i);
  assert.match(copy, /wisest of lines/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open|FOREWORD/i);
});

test("The Story of Gösta Berling uses the before-sleep pulpit sit", () => {
  const copy = readerIntro(shelfAsWork("the-story-of-gosta-berling"));
  assert.match(copy, /pulpit/);
  assert.match(copy, /reeling out of the inn/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Demian uses the before-sleep two-worlds sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("demian"));
  assert.match(copy, /two worlds/i);
  assert.match(copy, /Latin school/);
  assert.match(copy, /Childhood two-worlds map/);
  assert.match(copy, /Priday 1923 EN only/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Death Comes for the Archbishop uses the Cruciform Tree sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("death-comes-for-the-archbishop"));
  assert.match(copy, /solitary horseman/);
  assert.match(copy, /New Mexico/);
  assert.match(copy, /It opens at Book One, The Cruciform Tree/);
  assert.doesNotMatch(copy, /Skip the/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("The Getting of Wisdom uses the waking dirty-sheet sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("the-getting-of-wisdom"));
  assert.match(copy, /dirty/i);
  assert.match(copy, /School-status novel/);
  assert.match(copy, /Melbourne Ladies' College/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Bliss uses the before-sleep radiant-mirror sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("bliss"));
  assert.match(copy, /radiant mirror/);
  assert.match(copy, /dinner-party turn/);
  assert.doesNotMatch(copy, /never Prelude/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("A Hundred and Seventy Chinese Poems uses the Winter Night sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("a-hundred-and-seventy-chinese-poems"));
  assert.match(copy, /Winter Night/);
  assert.doesNotMatch(copy, /Battle/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Dubliners uses the Araby sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("dubliners"));
  assert.match(copy, /North Richmond Street/);
  assert.match(copy, /This reading is just Araby/);
  assert.doesNotMatch(copy, /not Irish Fairy Tales/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open|The Sisters only/i);
});

test("Gitanjali uses the before-sleep poem-1 sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("gitanjali"));
  assert.match(copy, /It opens on poem 1/);
  assert.doesNotMatch(copy, /Skip the/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Harmonium uses the before-sleep Snow Man sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("harmonium"));
  assert.match(copy, /mind of winter/i);
  assert.match(copy, /The Snow Man only/);
  assert.match(copy, /never Earthy Anecdote/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Martin Birck's Youth uses the before-sleep garden sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("martin-bircks-youth"));
  assert.match(copy, /childhood dream/i);
  assert.match(copy, /It opens with The Old Street/);
  assert.match(copy, /1930 English only/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Thaïs uses the before-sleep Nile-huts sit and names the Host frame", () => {
  const copy = readerIntro(shelfAsWork("thais"));
  assert.match(copy, /Nile/);
  assert.match(copy, /hyssop/);
  assert.match(copy, /Paphnutius/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Nada the Lily shows the colonial-frame heads-up before the sit", () => {
  const copy = readerIntro(shelfAsWork("nada-the-lily"));
  assert.match(copy, /Umslopogaas/);
  assert.match(copy, /White Man/);
  assert.match(copy, /Great Queen/);
  assert.match(copy, /Great Queen frame/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend|cold-open/i);
});

test("Blood and Sand uses the waking fight-day breakfast sit", () => {
  const copy = readerIntro(shelfAsWork("blood-and-sand"));
  assert.match(copy, /breakfast/);
  assert.match(copy, /matador/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured-track|Host-a-sit|Recommend/i);
});

test("Lolly Willowes opens on Caroline’s spare-room sit", () => {
  const copy = readerIntro(shelfAsWork("lolly-willowes"));
  assert.match(copy, /Of course, you will come to us/);
  assert.match(copy, /Chapter I only/);
  assert.doesNotMatch(copy, /Maggot/);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright|Featured/i);
});

test("uses a locked recommend pitch before Ritual copy", () => {
  assert.equal(
    readerIntro(work("cheri", "This LE About copy should not win.")),
    "Léa’s wrought-iron bed; Chéri wants the pearls. In Janet Flanner’s English. Desire and a kept boy are the story, told frankly.",
  );
});

test("stored preface wins over a long About note", () => {
  const copy = readerIntro(
    work(
      "the-man-who-was-afraid",
      "This LE About copy should not win because a stored preface already exists.",
    ),
  );
  assert.match(copy, /Sit with the world/i);
  assert.doesNotMatch(copy, /This LE About copy/);
});

test("omits metadata fallback for works without a local polished bind", () => {
  assert.equal(
    readerIntro(work("not-on-the-shelf", "Long enough metadata should not become an intro.")),
    "",
  );
});

test("normalizes paragraph breaks while trimming About copy", () => {
  assert.equal(
    trimReaderIntro(
      "  One sentence in the room.\n\nA second sentence at the door. A third stays in. A fourth stays out.  ",
    ),
    "One sentence in the room. A second sentence at the door. A third stays in.",
  );
});

test("a heads-up that is the fourth sentence still shows before reading", () => {
  assert.equal(
    trimReaderIntro(
      "One sentence in the room. A second sentence at the door. A third stays in. A heads-up before you start: the note stays on the card. A fifth stays out.",
    ),
    "One sentence in the room. A second sentence at the door. A third stays in. A heads-up before you start: the note stays on the card.",
  );
});

test("Mary Magdalen's Scarlet opening is not cut at '!' and the POST-#225 heads-ups stay exact", () => {
  const heads = {
    "the-face-in-the-abyss":
      "A heads-up before you start: three of the narrator's companions die, one man is strangled, and a child is threatened with a whip. The book also uses the period terms 'half-breeds' and 'Indian hell-brew', left as printed.",
    "mary-magdalen":
      "A heads-up before you start: chariot drivers are killed in the opening race, John the Baptist is later beheaded, and the crucifixion is told. One early line calls a city crowd a 'mongrel rabble', left as printed.",
    "the-hoop":
      "A heads-up before you start: the old man at the heart of this story dies at the end, quietly.",
  } as const;
  for (const [id, note] of Object.entries(heads)) {
    assert.equal(note.includes("!"), false, id);
    assert.equal(blurbFor(id), note, id);
    assert.ok(pitchFor(id)?.includes(note), id);
    assert.ok(prefaceFor(id)?.includes(note), id);
    assert.ok(ritualPitchFor(id)?.includes(note), id);
  }

  const veil = readerIntro(shelfAsWork("mary-magdalen"));
  assert.match(veil, /“Three to one on Scarlet!”/);
  assert.match(veil, /Chapter I — the chariot races/);
  assert.ok(veil.indexOf("Chapter I") > veil.indexOf("Scarlet!"), veil);
  assert.match(veil, /mongrel rabble/);
  assert.match(veil, /left as printed\./);
  const faceVeil = readerIntro(shelfAsWork("the-face-in-the-abyss"));
  assert.match(faceVeil, /half-breeds/);
  assert.match(faceVeil, /Indian hell-brew/);
  assert.match(readerIntro(shelfAsWork("the-hoop")), /dies at the end, quietly/);

  const maryShelf = SHELF.find((item) => item.id === "mary-magdalen");
  assert.ok(maryShelf);
  assert.match(maryShelf.intro ?? "", /John the Baptist is beheaded/);
  assert.equal(placeFor(maryShelf), null);
  assert.equal(chipOnlyLabel("mary-magdalen"), "Tiberias, Galilee");
  assert.equal(countryFor(maryShelf), "");
  const face = SHELF.find((item) => item.id === "the-face-in-the-abyss");
  assert.ok(face);
  assert.deepEqual(placeFor(face), { label: "Chupan", region: "pe" });
  assert.equal(countryFor(face), "Peru");
  const hoopShelf = SHELF.find((item) => item.id === "the-hoop");
  assert.ok(hoopShelf);
  assert.deepEqual(placeFor(hoopShelf), { label: "Russia", region: "ru" });

  const open = JSON.parse(
    readFileSync(new URL("./catalog/openings/mary-magdalen.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  const full = JSON.parse(
    readFileSync(new URL("./catalog/texts/mary-magdalen.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(open.breaths[0]?.text, "“Three to one on Scarlet!”");
  assert.equal(open.breaths.length, 23);
  assert.match(open.breaths[1]?.text ?? "", /^Throughout the brand-new circus/);
  assert.equal(
    open.breaths.some((breath) => breath.text === "“They are off!”"),
    true,
  );
  for (let i = 0; i < open.breaths.length; i += 1) {
    const text = open.breaths[i]?.text ?? "";
    assert.equal(text, full.breaths[i]?.text, `sit ${i}`);
    const rendered = splitEmphasis(text)
      .map((part) => part.value)
      .join("");
    assert.equal(rendered, text.replace(/\*([^*\n]+)\*/g, "$1"), `render ${i}`);
  }
  assert.match(full.breaths.map((breath) => breath.text).join("\n"), /slips of vellum/);

  const hoop = JSON.parse(
    readFileSync(new URL("./catalog/texts/the-hoop.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  assert.equal(hoop.breaths.filter((breath) => isSectionBreak(breath.text)).length, 6);
});

test("POST-#227 heads-ups stay exact and survive the preface trim", () => {
  const heads = {
    "love-s-shadow":
      "A heads-up before you start: much later in the book, a fancy-dress scene uses a period slur for a costume, left as printed.",
    "lewis-and-irene":
      "A heads-up before you start: an old banker dies of shock in the opening pages, a suicide is reported later, and there is gossip about 'Jewish blood'. Part Two makes sweeping racial claims about Greek bankers, describes 'big black satyrs' grunting like pigs, and prints the word 'negro' twice, all left as printed.",
    "a-monkey":
      "A heads-up before you start: this is one long comic monologue of exam-night nerves, with four short translator notes on the grading set in as you go.",
  } as const;
  for (const [id, note] of Object.entries(heads)) {
    assert.equal(note.includes("!"), false, id);
    assert.equal(blurbFor(id), note, id);
    assert.ok(pitchFor(id)?.includes(note), id);
    assert.ok(prefaceFor(id)?.includes(note), id);
    assert.ok(ritualPitchFor(id)?.includes(note), id);
    const veil = readerIntro(shelfAsWork(id));
    assert.ok(veil.includes(note), veil);
  }

  const love = JSON.parse(
    readFileSync(new URL("./catalog/texts/love-s-shadow.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  const loveOpen = love.breaths[2]?.text ?? "";
  assert.match(loveOpen, /\*Don't\*/);
  assert.equal(
    splitEmphasis(loveOpen)
      .map((part) => part.value)
      .join(""),
    loveOpen.replace(/\*([^*\n]+)\*/g, "$1"),
  );
  assert.equal(/[“”‘’]/.test(love.breaths.map((breath) => breath.text).join("\n")), false);

  const lewis = JSON.parse(
    readFileSync(new URL("./catalog/texts/lewis-and-irene.json", import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
  const lewisJoined = lewis.breaths.map((breath) => breath.text).join("\n");
  assert.deepEqual(lewisJoined.match(/\bsalon\b/gi), ["salon", "Salon"]);
  assert.match(lewisJoined, /her salon which was nothing but a society clinic/);
  assert.match(lewisJoined, /Unlike the Magnac Salon/);
});

test("Of Human Bondage has a stored 2–3 sentence preface", () => {
  const copy = readerIntro(shelfAsWork("of-human-bondage"));
  assert.match(copy, /club foot/i);
  assert.match(copy, /Sit with that weather/i);
  assert.doesNotMatch(copy, /gutenberg|public domain|copyright/i);
  const sentences = copy.split(/(?<=[.!?])\s+/).filter(Boolean);
  assert.ok(sentences.length >= 2 && sentences.length <= 3, copy);
});

test("every shelf work has a non-empty readerIntro", () => {
  const missing: string[] = [];
  const thin: string[] = [];
  const banned: string[] = [];
  for (const item of SHELF) {
    const copy = readerIntro(shelfAsWork(item.id));
    if (!copy) {
      missing.push(item.id);
      continue;
    }
    if (copy.length < 24) thin.push(`${item.id}: ${copy}`);
    if (/gutenberg|public domain|copyright ©/i.test(copy)) banned.push(item.id);
  }
  assert.deepEqual(missing, [], `empty readerIntro: ${missing.join(", ")}`);
  assert.deepEqual(thin, [], `thin readerIntro: ${thin.join(" | ")}`);
  assert.deepEqual(banned, [], `legal boilerplate in readerIntro: ${banned.join(", ")}`);
});

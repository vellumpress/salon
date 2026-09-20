import { SHELF, type ShelfWork } from "./shelf.ts";
import { isLocalBound } from "./full-pdf.ts";
import { mixSeed, pinThenShuffle } from "../recommend.ts";
import { SERIALIZE_LANE_ID } from "./serialize.ts";

/** Ritual lanes — LE-polished local binds only (Gutenberg-only stay searchable elsewhere). */
export type RitualLane = {
  id: string;
  label: string;
  /** One-line blurb for the lane chip context (optional, unused in UI for now). */
  hint?: string;
  /** Ordered shelf work ids; missing / non-LIVE ids are skipped at resolve time. */
  workIds: string[];
};

/** Synopsis-style ritual pitches under each title (worldly NYC, concrete). */
export const RITUAL_PITCHES: Record<string, string> = {
  "the-wild-swans-at-coole":
    "Yeats returns to Coole’s autumn lake and counts the swans that will not stay. The poems hold rooms, roads, and the chill of what will not come again.",

  "kwaidan-stories-and-studies-of-strange-things":
    `More than seven hundred years after a drowned clan haunted the Straits of Shimonoséki, a blind minstrel named Hōïchi is about to be summoned by listeners who aren’t quite alive. Lafcadio Hearn’s 1904 ghost tale opens on that coast—demon-fires on the water, a temple built to quiet the dead, and a musician whose ears will matter more than he knows.`,
 "the-listeners-and-other-poems":
    "A traveler knocks at a moonlit house that never answers. De la Mare’s poems keep the hallway listening after the footsteps fade.",
  "the-empty-house-and-other-ghost-stories":
    "Blackwood’s empty rooms still know you’ve crossed the threshold. Quiet dread in old houses — less jump-scare than a draft that will not leave.",
  "dark-of-the-moon":
    "Teasdale’s night lyrics for the hour when the mind won’t quiet. Short poems of love, weather, and the dark between streetlamps.",
  "love-songs":
    "Brief Teasdale lyrics you could tuck under a pillow — loveliness for sale, then the bill. Tenderness that knows it won’t last the night.",
  wallpaper:
    "A rented room, a yellow pattern, and a mind under careful watch. Gilman’s short shock of domestic confinement — go gently; it doesn’t let go.",
  "the-house-of-souls":
    "Machen’s occult stories blur at the edges of ordinary London evenings. Strange houses, stranger doors — atmosphere first, explanation last.",
  "michael-robartes-and-the-dancer":
    "Yeats at midnight: dance, opinion, and the occult arguing in the same room. Compact poems that turn on a phrase and won’t settle.",
  "the-rubaiyat-of-omar-khayyam":
    "FitzGerald’s Omar wakes in the bowl of night and pours the morning wine. Quatrains of time, dust, and appetite — a clear head before the day begins.",
  "spring-and-all":
    "Williams on the road to the contagious hospital, watching the first green push through. Spring as fact, not metaphor — cold air, then life.",
  "a-few-figs-from-thistles":
    "Millay burns her candle at both ends and means it. Short, bright lyrics of appetite, wit, and the morning after.",
  "songs-of-innocence-and-of-experience":
    "Blake’s paired songs: nursery light on one side, harder truths on the other. Read them as morning weather — clear, then clouded.",
  "second-april":
    "April returns and Millay asks what for. Frogs, spring streets, and the work of starting over after a year that already spent you.",
  "renascence-and-other-poems":
    "A young Millay climbs a mountain of sky and comes back changed. Infinite space, then the small room of the self — still electric.",
  "mountain-interval":
    "Frost’s yellow wood, two roads, and the talk that gets you going. New England intervals — work, weather, and choices that look simple from here.",
  gitanjali:
    "Tagore’s song offerings settle the breath without a sermon. Devotion as quiet attention — morning light on the threshold.",
  "songs-of-kabir":
    "Kabir, through Tagore’s English: mystic poems that don’t need a church. Straight talk about God, dust, and the body walking between them.",
  "pictures-of-the-floating-world":
    "Lowell’s lacquer prints and quiet looking — Japan as color, surface, and pause. Poems that invite you to stand still and see.",
  silhouettes:
    "At Dieppe after sunset—the sea quieted, grape-flush on the clouds, a sickle moon and one gold star. Silhouettes opens on atmosphere, not argument. Arthur Symons’s 1892 seaside lyrics — a short After Sunset sit before sleep.",
  "the-garden-party-and-other-stories":
    "Mansfield mornings: party light, then a turn toward the lane you weren’t meant to notice. Domestic brilliance with a chill underneath.",
  "bliss-and-other-stories":
    "More Mansfield rooms where the furniture shimmers and then stings. Marriage, desire, and the sentence that rearranges the afternoon.",
  "miss-brill-adapted":
    "She dresses for the audience she thinks she’s in — camel coat, fake-fur scarf, earbuds with nothing playing — until a couple on her bench tells the afternoon what she is. After Mansfield, Miss Brill, 1920.",
  "prefer-not":
    "A mild refusal becomes the office’s true architecture—and pity learns the shape of its limits. After Melville, Bartleby, 1853.",
  "late-season":
    "Off-season Cape May, a small white dog, and an affair that refuses to stay temporary once the city proves too small for what began. After Chekhov, The Lady with the Dog, 1899.",
  "between-the-drop-and-the-water":
    "The rope fails—or seems to—until the Hudson remembers what it meant. After Bierce, An Occurrence at Owl Creek Bridge, 1890.",
  "he-woke-changed":
    "A breadwinner wakes wrong; the family ledger of duty and relief does the rest. After Kafka, The Metamorphosis, 1915.",
  "the-pattern":
    "Confined for her own good, she learns the wallpaper until the crawl is the only way out—calm, not thriller. After Gilman, The Yellow Wallpaper, 1892.",
  "a-coat-worthy-of-respect":
    "A meek clerk earns a coat meal by meal; winter takes it, and the city notices too late. After Gogol, The Overcoat, 1842.",
  "what-she-borrowed":
    "One borrowed night of glitter; a decade to learn it was paste. After Maupassant, The Necklace, 1884.",
  "it-was-not-nervousness":
    "He can tell it calmly. The pulse under the Queens floorboards will not stay calm. After Poe, The Tell-Tale Heart, 1843.",
  "during-carnival":
    "Carnival noise above; the last brick set with intimate care below. After Poe, The Cask of Amontillado, 1846.",
  "what-we-sold":
    "Two broke lovers ruin their treasures for each other and invent a quieter wealth in the wreckage. After O. Henry, The Gift of the Magi, 1905.",
  "body-of-this-death":
    "Bogan on flesh, desire, and what it costs to keep living in a body. Spare, exact poems — no soft focus on the wound.",
  orlando:
    "Woolf’s Orlando outlives a century and changes sex along the way. Biography as carnival — fashion, poetry, and time refusing to stay put.",

  "the-weary-blues":
    `Harlem, late night—a piano that won’t quit, and a young poet listening hard. Langston Hughes’s 1926 first book opens with Proem (“I am a Negro”), then the title poem and a short run of cabaret pieces. Blues and jazz aren’t decoration here; they’re the beat the lines move to.`,
 cheri:
    "Colette’s aging beauty and her younger lover in a Paris of pearls and appetite. Recognition arrives late — and it doesn’t soften the exit.",
  dalloway:
    "One London day: Clarissa buys the flowers herself and walks the city awake. Parties, memory, and the war still echoing in the street.",
  "north-of-boston":
    "Frost north of Boston — pasture springs, stone walls, and talk that turns. Narrative poems of neighbors who say less than they mean.",
  "chicago-poems":
    "Sandburg’s big-shouldered city for the stride: hog butcher, tool maker, stacker of wheat. Poems that match the pace of the elevated.",
  "harlem-shadows":
    "McKay walking Harlem and the wider world — desire, exile, and the street that looks back. Lyric heat under cold city weather.",
  "sour-grapes":
    "Williams again on the street: spring returns, sour and exact. Short poems of looking hard at what is already in front of you.",
  precipitations:
    "Evelyn Scott’s midnight worship at Brooklyn Bridge and other sudden weathers. Modernist flashes — city, body, and storm in the same breath.",
  "spoon-river-anthology":
    "Masters’ village speaks from under the hill — epitaphs that refuse to flatter the living. Small-town America, voice by voice, after the fact.",
  "death-comes-for-the-archbishop":
    "Cather’s quiet life ending in New Mexico light. A bishop’s long work in desert air — faith, friendship, and the mesa’s patient weather.",
  "copper-sun":
    "Cullen on beauty, grief, and the dark tower. Harlem Renaissance verse that holds shine and mourning in the same hand.",
  "the-black-christ-and-other-poems":
    "Cullen’s faith and mourning in Harlem Renaissance verse. Sacred story rewritten for a city that knows both hymn and grief.",
  "helen-of-troy-and-other-poems":
    "Teasdale on love that already left — Helen, flights, and the rooms that keep the echo. Early lyrics of longing without theatrics.",
  "flame-and-shadow":
    "Teasdale’s grief poems that still catch the light. Flame, shadow, and the after-image of someone who won’t walk back through the door.",
  passing:
    `Irene Redfield sorts her morning mail in Harlem and finds a thin envelope in purple ink—no return address, a hand she knows at once. Clare Kendry, the childhood friend who slipped into another world, is writing again. Nella Larsen’s 1929 New York novel opens on that letter, still unopened, and the careful life it threatens to unsettle.`,
  "enchanted-april":
    `February rain on Shaftesbury Avenue. An uncomfortable club. Mrs. Wilkins, down from Hampstead to shop, picks up The Times and lets her eye drift the Agony Column—until one notice catches: wistaria and sunshine, a small mediaeval Italian castle to let for April, servants included.`,
  "mr-fortunes-maggot":
    `One convert in three years on Fanua—and the Reverend Timothy Fortune is not flustered. Humility has made him easy-going.`,
  "the-bridge-of-san-luis-rey":
    `Five travellers fall from a Peruvian bridge — Wilder asks whether those lives were accident or intention.`,
  quicksand:
    `Eight in the evening, soft gloom, one shaded lamp—Helga Crane sits alone in her Naxos room and will not open the door. Quicksand begins in intentional isolation after a taxing day among an unkind faculty. Nella Larsen’s 1928 novel is a character study with Copenhagen ahead — stop before the observer portrait.`,
  "attendants-confession":
    `A marked man offers a human document—and asks you not to publish it until he’s dead. Machado’s attendant begins in confidence and already smells of the grave.`,
  rashomon:
    `Evening under Rashōmon—one lackey waiting out the rain, and no one else in the gate. Akutagawa’s Kyoto opens on desolation before the crime story blooms.`,
  "high-wind-jamaica":
    `This sit opens on Jamaica after Emancipation: plantation ruins, bush up to the door, Derby Hill held open by a rank plant. Hughes’s 1929 voice already uses period racial language in this stretch, and a sharper racial gaze continues immediately after Salon’s stop. We end at the plant on purpose so the timed sit stays bounded; if you Host further into the chapter, warn the room first.`,
  "noli-me-tangere":
    `Capitan Tiago announces a dinner at the last minute—and all of Binondo, the Walled City, and Manila’s hangers-on begin polishing shoes and rehearsing intimacy.`,
  vera:
    `Cornwall, noon heat, a garden gate, and a daughter who has lost everything—and feels nothing yet. Same author as Enchanted April, colder register. Wemyss intensifies later; this open stays clean emptiness.`,
  "on-a-chinese-screen":
    `She takes a holy temple and papers it into Cheltenham—blue curtains for her eyes, pink stripes, an American stove where the Buddha sat.`,
  futility:
    `Three sisters spring out of a wooden dacha above the sea and introduce themselves in order of age—then the samovar household rearranges what “mother” means.`,
  "poison-tree":
    `His wife makes him promise: if a storm rises, leave the boat. On the Ganges in Joisto, the weather keeps that promise.`,
  "trooper-peter-halket":
    `A lone Chartered Company trooper on a Mashonaland kopje, fire quivering, inventing gold companies in the dark after losing his column. Written in 1897, the open already frames colonial scouting; missionary and racial language harden after Salon stops—before the stranger arrives. We cut there so the sit stays a night watch, not a sermon. If you Host further, name that colonial frame up front.`,
  "the-home-and-the-world":
    `Mother’s vermilion mark, a red-bordered *sari*, a dark face that shamed vanity — and a daughter furious with her mirror. Bimala remembers beauty, colour, and duty in a Bengal house. Salon stops at the mirror prayer.`,
  "where-angels-fear-to-tread":
    `Charing Cross chaos — Lilia laughing like royalty while Philip floods her with little towns to see: Gubbio, Pienza, Monteriano. Later the plot darkens; this open stays comic.`,
  "the-gadfly":
    `Pisa seminary heat — a lost sermon page, a caressing *Padre*, and a fruitseller calling *Fragola!* down the street. Later violence comes after this sit.`,
  "the-immoralist":
    `Faithful friends summoned to a distant house — Michel can free himself; he cannot yet say what freedom is for. This Salon cut stops on the freedom line.`,
  "letters-of-a-javanese-princess":
    `Kartini writes from colonial Java in 1899, hungry for the “modern girl” of Europe while age-long traditions hold her cloistered. Period phrases like “Indian world” and “pale sisters” mean the Indies and Western women — historical voice, not today’s usage. Salon stops at the cloistered-arms beat; if you Host further letters, name that colonial frame for the room first.`,
  "blood-and-sand":
    `Fight-day breakfast: meat, black coffee, a huge cigar — and a dining room that treats the matador like family glory.`,
  ecstasy:
    `After dinner on the Scheveningen Road — rosewood, vieux-rose silk, an onyx lamp like a six-petalled flower — and a promise not to wake the boy.`,
  "an-outcast-of-the-islands":
    `A little excursion off the straight path — neatly done, quickly forgotten. Conrad’s Malay Archipelago world — colonial hierarchy and racialized language intensify after this cut. Salon stops at the sentence-in-brackets resolve; if you Host further, name that frame for the room first.`,
  "the-underdogs":
    `Dog barking in the sierra — tortillas, a *cántaro*, a rifle under the mat — and hoofbeats in the quarry.`,
  "diary-of-a-chambermaid":
    `Twelfth place in two years — rainy September, *Figaro* ad, dirty souls, and no interview with Madame.`,
  "the-painted-veil":
    `Someone tries the door — shuttered room, tight shoes, a kimono, and Walter’s name whispered. Hong Kong / treaty-port China, colonial household language (*amah*, “boys”), then cholera inland. This Salon cut stops on “How shall I get out?” Name the frame if you Host further.`,
  "the-good-soldier":
    `Nine seasons at Bad Nauheim — intimacy like a good glove, and still they knew nothing.`,
  "growth-of-the-soil":
    `Who made the road over the moors? A man with a sack, a red beard, and scars — looking for land, or peace. Hamsun’s settler open uses the period word “Lapp” for Sámi herders on the common. Historical voice; Salon stays on the man with the sack. If you Host further, keep that named for the room.`,
  "nada-the-lily":
    `You ask for the youth of Umslopogaas and his love for Nada — and the old man who answers is not the name you think. Haggard’s Zululand frame — an old narrator under “the White Man” / Great Queen law, telling Umslopogaas and Nada. Colonial adventure voice; period names and violence ahead. Salon stops at the hidden-name beat. Name that frame for the room before you Host further.`,
  "bunner-sisters":
    `Near Stuyvesant Square, on a side street already sliding toward shabbiness, two sisters keep a tiny basement shop whose fame is purely local. The window is small; the sign is blotchy gold on black. Edith Wharton’s 1916 novella begins at street level—horse-cars, lunchrooms, and a carefully stretched living—before anything outside has finished changing.`,
  "the-house-of-mirth":
    `Grand Central, a Monday in early September—the afternoon rush, the heat, the crowd. Lawrence Selden notices Lily Bart standing apart from it all, vivid against the dull tints of the station. Edith Wharton’s 1905 New York novel begins with a chance meeting that doesn’t feel accidental.`,
  carmilla:
    `A lonely schloss in Styria. A teenage narrator with too few neighbors. And a childhood night she still can’t forget—a pretty face at the bedside, then a pain like needles. Sheridan Le Fanu’s gothic novella (serialized 1871–72; collected 1872) opens on solitude and that first fright, before any carriage has rolled in.`,
  "hungry-hearts":
    `Basement light on a Lower East Side Sunday—and Shenah Pessah opens the window for the first spring sun. Anzia Yezierska’s 1920 story “Wings” starts with a hunger that isn’t only for bread: love, dignity, a little beauty, a life that feels like America and not just work.`,
  "in-our-time":
    `A drunk battery on a dark road—then a Michigan lake at dawn, and Nick Adams in a rowboat with his father. Ernest Hemingway’s 1925 American collection opens with a war vignette snapped against “Indian Camp”: spare sentences, long silences, the method already underway.`,
  botchan:
    `A Tokyo kid who cannot fake manners jumps from a school window on a dare, then takes a knife to his own thumb to prove the blade is sharp. Natsume Sōseki’s 1906 novel opens on that hereditary recklessness — and the scar that will be there until his death.`,

};

/** Default Rituals chip — first-session / stranger lead, never Serialize. */
export const FOR_YOU_LANE_ID = "for-you";

/**
 * Mira A24 first-session lead (Sun Sep 20, 2026 ET).
 * Cold open first three: Mirth → Quicksand → Botchan.
 * Maggot / Bridge stay strong but are not this trio.
 */
export const FIRST_SESSION_RITUAL_IDS = [
  "the-house-of-mirth",
  "quicksand",
  "botchan",
] as const;

export const RITUAL_LANES: RitualLane[] = [
  {
    id: FOR_YOU_LANE_ID,
    label: "For you",
    hint: "First sitting",
    workIds: [...FIRST_SESSION_RITUAL_IDS],
  },
  {
    id: SERIALIZE_LANE_ID,
    label: "Serialize",
    hint: "Night by night",
    workIds: [],
  },
  {
    id: "bite-sized",
    label: "Bite-sized",
    hint: "One sitting",
    workIds: [
      "passing",
      "bunner-sisters",
      "the-weary-blues",
      "kwaidan-stories-and-studies-of-strange-things",
      "the-house-of-mirth",
      "carmilla",
      "hungry-hearts",
      "in-our-time",
    ],
  },
  {
    id: "before-sleep",
    label: "Before sleep",
    hint: "Dreams / night",
    workIds: [
      "quicksand",
      "attendants-confession",
      "rashomon",
      "high-wind-jamaica",
      "vera",
      "trooper-peter-halket",
      "the-home-and-the-world",
      "the-immoralist",
      "the-gadfly",
      "ecstasy",
      "the-painted-veil",
      "the-good-soldier",
      "nada-the-lily",
      "the-pattern",
      "it-was-not-nervousness",
      "between-the-drop-and-the-water",
      "during-carnival",
      "the-wild-swans-at-coole",
      "kwaidan-stories-and-studies-of-strange-things",
      "the-listeners-and-other-poems",
      "the-empty-house-and-other-ghost-stories",
      "dark-of-the-moon",
      "love-songs",
      "the-house-of-souls",
      "wallpaper",
      "silhouettes",
    ],
  },
  {
    id: "waking-up",
    label: "Waking up",
    workIds: [
      "enchanted-april",
      "on-a-chinese-screen",
      "futility",
      "where-angels-fear-to-tread",
      "letters-of-a-javanese-princess",
      "blood-and-sand",
      "an-outcast-of-the-islands",
      "the-underdogs",
      "diary-of-a-chambermaid",
      "growth-of-the-soil",
      "the-rubaiyat-of-omar-khayyam",
      "spring-and-all",
      "a-few-figs-from-thistles",
      "songs-of-innocence-and-of-experience",
      "second-april",
      "renascence-and-other-poems",
      "mountain-interval",
    ],
  },
  {
    id: "unwind",
    label: "Unwind",
    hint: "De-stress",
    workIds: [
      "the-house-of-mirth",
      "mr-fortunes-maggot",
      "the-bridge-of-san-luis-rey",
      // Botchan is a local bind with a short scar sit — after Mirth, Maggot,
      // and Bridge on Unwind, near the front of the rest of the lane.
      "botchan",
      // Naomi is a local bind but not a short first-session sit (full novel,
      // no ritual-ready open-at). Skip until a clean short sit exists —
      // do not invent one.
      // Enchanted April is a waking-up local sit on this shelf. Mira’s
      // tighter first-session cut (~158w, *The Times* italics, dripping
      // street) is a later polish — do not invent a second work id.
      "poison-tree",
      "noli-me-tangere",
      "gitanjali",
      "songs-of-kabir",
      "pictures-of-the-floating-world",
      "silhouettes",
      "the-garden-party-and-other-stories",
      "bliss-and-other-stories",
      "miss-brill-adapted",
      "prefer-not",
      "late-season",
      "he-woke-changed",
      "what-she-borrowed",
      "what-we-sold",
      "a-coat-worthy-of-respect",
    ],
  },
  {
    id: "the-body",
    label: "The body",
    workIds: [
      "body-of-this-death",
      "orlando",
      "the-weary-blues",
      "wallpaper",
      "cheri",
    ],
  },
  {
    id: "on-a-walk",
    label: "On a walk",
    workIds: [
      "dalloway",
      "north-of-boston",
      "chicago-poems",
      "harlem-shadows",
      "sour-grapes",
      "precipitations",
      "spring-and-all",
    ],
  },
  {
    id: "soft-mourning",
    label: "Soft mourning",
    workIds: [
      "flame-and-shadow",
      "helen-of-troy-and-other-poems",
      "the-wild-swans-at-coole",
      "spoon-river-anthology",
      "death-comes-for-the-archbishop",
      "copper-sun",
      "the-black-christ-and-other-poems",
    ],
  },
];


/** Explicit short-sit minutes for bite-sized ritual openings (overrides full-text breaths). */
export const RITUAL_SIT_MINUTES: Record<string, number> = {
  "passing": 5,
  "bunner-sisters": 5,
  "the-weary-blues": 5,
  "kwaidan-stories-and-studies-of-strange-things": 5,
  "the-house-of-mirth": 5,
  "enchanted-april": 5,
  "mr-fortunes-maggot": 5,
  "the-bridge-of-san-luis-rey": 8,
  "carmilla": 5,
  "hungry-hearts": 6,
  "in-our-time": 9,
  quicksand: 5,
  "attendants-confession": 2,
  rashomon: 2,
  "high-wind-jamaica": 3,
  "noli-me-tangere": 2,
  vera: 4,
  "on-a-chinese-screen": 5,
  futility: 4,
  "poison-tree": 5,
  "trooper-peter-halket": 4,
  "the-home-and-the-world": 2,
  "where-angels-fear-to-tread": 2,
  "the-gadfly": 2,
  botchan: 5,
  "the-immoralist": 2,
  "letters-of-a-javanese-princess": 2,
  "blood-and-sand": 2,
  ecstasy: 2,
  "an-outcast-of-the-islands": 2,
  "the-underdogs": 2,
  "diary-of-a-chambermaid": 2,
  "the-painted-veil": 2,
  "the-good-soldier": 2,
  "growth-of-the-soil": 2,
  "nada-the-lily": 2,
};

export function ritualPitchFor(id: string): string | undefined {
  return RITUAL_PITCHES[id];
}

export function worksForRitualLane(lane: RitualLane): ShelfWork[] {
  const byId = new Map(SHELF.map((item) => [item.id, item]));
  const out: ShelfWork[] = [];
  const seen = new Set<string>();
  for (const id of lane.workIds) {
    if (seen.has(id) || !isLocalBound(id)) continue;
    const work = byId.get(id);
    if (!work) continue;
    seen.add(id);
    out.push(work);
  }
  return out;
}

/** Cold-open Rituals chip: For you, else Unwind — never Serialize. */
export function defaultRitualLaneId(
  lanes: readonly { id: string }[] = RITUAL_LANES,
): string {
  const ids = new Set(lanes.map((lane) => lane.id));
  if (ids.has(FOR_YOU_LANE_ID)) return FOR_YOU_LANE_ID;
  if (ids.has("unwind")) return "unwind";
  for (const lane of lanes) {
    if (lane.id !== SERIALIZE_LANE_ID) return lane.id;
  }
  return lanes[0]?.id ?? "";
}

/** Pin first-session ids in Mira order, then shuffle the remainder. */
export function ritualLaneStack(lane: RitualLane, visit: number): ShelfWork[] {
  return pinThenShuffle(
    worksForRitualLane(lane),
    mixSeed(visit, `ritual-${lane.id}`),
    FIRST_SESSION_RITUAL_IDS,
    (work) => work.id,
  );
}

/** Coarse sitting-length label for Ritual cards (honest, not precise). */
export function ritualDurationLabel(work: ShelfWork): string {
  return formatRitualMinutes(estimateRitualMinutes(work));
}

/** Estimated whole-work minutes from breaths (preferred) or form heuristic. */
export function estimateRitualMinutes(work: ShelfWork): number {
  const sitOverride = RITUAL_SIT_MINUTES[work.id];
  if (sitOverride && sitOverride > 0) return sitOverride;
  if (work.breaths && work.breaths > 0) {
    // Breaths are sentence-ish units; poems run shorter per breath than prose.
    const wordsPerBreath =
      work.form === "poem" ? 7 : work.form === "play" ? 12 : 18;
    // One calm pace for all forms — prefer coarse honesty over fake precision.
    const words = work.breaths * wordsPerBreath;
    return Math.max(4, Math.round(words / 200));
  }
  // Shelf `minutes` is often a placeholder (40/50/80/90/160) for unbound rows.
  const placeholder = new Set([40, 50, 80, 90, 160]);
  if (work.minutes > 0 && !placeholder.has(work.minutes)) {
    return work.minutes;
  }
  switch (work.form) {
    case "poem":
      return 18;
    case "play":
      return 45;
    case "stories":
      return 55;
    case "other":
      return 25;
    case "novel":
    default:
      return 100;
  }
}

function formatRitualMinutes(minutes: number): string {
  if (minutes <= 7) return "~5 min";
  if (minutes <= 14) return "~12 min";
  if (minutes <= 22) return "~20 min";
  if (minutes <= 40) return "~30 min";
  if (minutes <= 90) return "One sitting";
  return "Several sittings";
}

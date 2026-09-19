import { SHELF, type ShelfWork } from "./shelf.ts";
import { isLocalBound } from "./full-pdf.ts";
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
  quicksand:
    `Eight in the evening, soft gloom, one shaded lamp—Helga Crane sits alone in her Naxos room and will not open the door. Quicksand begins in intentional isolation after a taxing day among an unkind faculty. Nella Larsen’s 1928 novel is a character study with Copenhagen ahead — stop before the observer portrait.`,
  "bunner-sisters":
    `Near Stuyvesant Square, on a side street already sliding toward shabbiness, two sisters keep a tiny basement shop whose fame is purely local. The window is small; the sign is blotchy gold on black. Edith Wharton’s 1916 novella begins at street level—horse-cars, lunchrooms, and a carefully stretched living—before anything outside has finished changing.`,
  "the-house-of-mirth":
    `Grand Central, a Monday in early September—the afternoon rush, the heat, the crowd. Lawrence Selden notices Lily Bart standing apart from it all, vivid against the dull tints of the station. Edith Wharton’s 1905 New York novel begins with a missed train, a cup of tea, and a chance meeting that doesn’t feel accidental.`,
  carmilla:
    `A lonely schloss in Styria. A teenage narrator with too few neighbors. And a childhood night she still can’t forget—a pretty face at the bedside, then a pain like needles. Sheridan Le Fanu’s gothic novella (serialized 1871–72; collected 1872) opens on solitude and that first fright, before any carriage has rolled in.`,
  "hungry-hearts":
    `Basement light on a Lower East Side Sunday—and Shenah Pessah opens the window for the first spring sun. Anzia Yezierska’s 1920 story “Wings” starts with a hunger that isn’t only for bread: love, dignity, a little beauty, a life that feels like America and not just work.`,
  "in-our-time":
    `A drunk battery on a dark road—then a Michigan lake at dawn, and Nick Adams in a rowboat with his father. Ernest Hemingway’s 1925 American collection opens with a war vignette snapped against “Indian Camp”: spare sentences, long silences, the method already underway.`,

};

export const RITUAL_LANES: RitualLane[] = [
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
      "gitanjali",
      "songs-of-kabir",
      "pictures-of-the-floating-world",
      "silhouettes",
      "the-garden-party-and-other-stories",
      "bliss-and-other-stories",
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
  "carmilla": 5,
  "hungry-hearts": 6,
  "in-our-time": 9,
  quicksand: 5,
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

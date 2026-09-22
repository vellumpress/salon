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
    "My candle burns at both ends. This sit is First Fig and Recuerdo — the ferry, the apples, the subway fare — about five minutes. Each poem is its own chapter; the book continues.",
  "a-hero-of-our-time":
    "Post from Tiflis: a dukhan crowd and a caravan of camels at the foot of Mount Koishaur. Skip the translators’ foreword. Bela densifies later — Host-gate that stretch; the novel continues.",
  "strange-tales":
    "A Kiang-si gentleman and Mr. Chu step into a monastery and find a painted wall. Skip the Giles introduction. Close when Chu enters the painted apartment; the studio continues.",
  "short-stories-from-the-balkans":
    "Leiba Zibal waits under the roof at Podeni for a stage that is already an hour late. Easter Candles only — never Brother Cœlestin. A later pogrom densifies; do not open there.",
  "the-awakening":
    "A green and yellow parrot at Grand Isle keeps repeating Allez vous-en. First sit is Chapter I. The whole novel continues; adultery Host-gates later.",
  tropic:
    "The whistle blew for eleven o'clock. Open Drought — a Barbados quarry at eleven, then the walk home through the marl. Period words for Black workers are already in this stretch; name them if you Host further. The stories continue.",
  "there-is-confusion":
    "Joanna climbs onto her father’s knee and asks for a story about somebody great. The sit runs through Mammy’s chair and stops before “But alas for poor Joel!” Chapter I continues.",
  buddenbrooks:
    "“And--and--what comes next?” Lübeck, the Mengstrasse house, Part One, Chapter I. This bind is the whole Lowe-Porter text of PG 72961. The novel continues.",
  "miss-lulu-bett":
    "The Deacons were at supper. A tulip plant under a gas jet — April, a Midwest household. Open there; the year continues through September.",
  color:
    "I doubt not God is good, well-meaning, kind. Open Yet Do I Marvel, then Incident — a Baltimore memory that speaks a slur; warn the room before that poem. Each poem is its own chapter; the book continues.",
  "songs-of-innocence-and-of-experience":
    "Blake’s paired songs: nursery light on one side, harder truths on the other. Read them as morning weather — clear, then clouded.",
  "second-april":
    "April returns and Millay asks what for. Frogs, spring streets, and the work of starting over after a year that already spent you.",
  "renascence-and-other-poems":
    "A young Millay climbs a mountain of sky and comes back changed. Infinite space, then the small room of the self — still electric.",
  "mountain-interval":
    "Frost’s yellow wood, two roads, and the talk that gets you going. New England intervals — work, weather, and choices that look simple from here.",
  gitanjali:
    "Phone-clear devotion lyric. Skip the Yeats introduction — open on poem 1.",
  harmonium:
    "A mind of winter: frost, junipers, and the nothing that is. Open The Snow Man only — never Earthy Anecdote.",
  "a-hundred-and-seventy-chinese-poems":
    "Gentler China lyrics for a night sit. Open the Winter Night pack — not Battle.",
  bliss:
    "Desire floor lands hard; the open ends on the radiant mirror. Keep the dinner-party turn in the full story — that is the knife, not homework to soft-cut. Open on title story Bliss only — never Prelude.",
  dubliners:
    "Paralysis at a lighted window — a phone-clear city X-ray. First sit: The Sisters only — not The Dead.",
  "martin-bircks-youth":
    "Childhood dream: a green twilight garden, then the flower that turns red. Skip the Stork preface. Ship the 1930 English only.",
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
    "Off-season Yalta, a small white dog, and an affair that refuses to stay temporary once Moscow proves too small for what began. After Chekhov, The Lady with the Dog, 1899.",
  "between-the-drop-and-the-water":
    "The rope fails—or seems to—until the Hudson remembers what it meant. After Bierce, An Occurrence at Owl Creek Bridge, 1890.",
  "the-pattern":
    "Confined for her own good, she learns the wallpaper until the crawl is the only way out—calm, not thriller. After Gilman, The Yellow Wallpaper, 1892.",
  "bliss-tokyo":
    "Omotesando gold, a flowering pear on a terrace, and a young wife's perfect evening that turns on a single glance. After Mansfield, Bliss, 1918.",
  "open-window-singapore":
    "A nervous rest-cure visitor, a black-and-white bungalow off Bukit Timah, and a girl's exquisite lie about men who never came back from the green. After Saki, The Open Window, 1914.",
  "story-of-an-hour-buenos-aires":
    "A Recoleta apartment, a careful message about a crash, and one quiet hour in which a woman tastes a future that is not a room with one window. After Chopin, The Story of an Hour, 1894.",
  "masque-rio":
    "A sealed hillside compound above Rio, seven rooms of curated light, and a guest who does not RSVP to plague. After Poe, The Masque of the Red Death, 1842.",
  "boule-de-suif-istanbul":
    "A delayed van out of Kadıköy, a cabin of respectable passengers, and one woman whose generosity is spent and then despised. After Maupassant, Boule de Suif, 1880.",
  "the-nose-cape-town":
    "A Sea Point assessor wakes without his nose; on Long Street the missing feature has better meetings than he does. After Gogol, The Nose, 1836.",
  "garden-party-barcelona":
    "A Sarrià lawn, a marquee, and leftovers carried down to a death the party refused to see. After Mansfield, The Garden Party, 1922.",
  "usher-prague":
    "A villa above the Vltava, a twin sealed too soon, and a house that shares one death. After Poe, The Fall of the House of Usher, 1839.",
  "araby-seville":
    "A Triana crush, a promise at the night bazaar, and the ordinary failure of wanting. After Joyce, Araby, 1914.",
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
    "A solitary horseman among uniform red sand-hills in central New Mexico, 1851 — until the country has no more changed than if he had stood still. Open on Book One New Mexico only — never the Sabine-hills Rome prologue.",
  demian:
    "Two worlds pass through a little-town Latin school — home of clean clothes and Christmas, and rooms of secrecy. Childhood two-worlds map — not the later Abraxas sermon. Priday 1923 EN only.",
  "the-getting-of-wisdom":
    "Four children on the grass: a prince, a golden crown, and a silk dress already dirty at the hem. School-status novel, not a children's book — Melbourne Ladies' College is the sit.",
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
    `Eight in the evening, soft gloom, one shaded lamp—Helga Crane sits alone in her Naxos room and will not open the door. Quicksand begins in intentional isolation after a taxing day among an unkind faculty. Nella Larsen’s 1928 novel is the full book — Chapter I through XXV — with Copenhagen ahead.`,
  "attendants-confession":
    `A marked man offers a human document—and asks you not to publish it until he’s dead. Machado’s attendant begins in confidence and already smells of the grave.`,
  rashomon:
    `Evening under Rashōmon—one lackey waiting out the rain, and no one else in the gate. Akutagawa’s Kyoto opens on desolation before the crime story blooms.`,
  "high-wind-jamaica":
    `This sit opens on Jamaica after Emancipation: plantation ruins, bush up to the door, Derby Hill held open by a rank plant. Hughes’s 1929 voice already uses period racial language in this stretch, and a sharper racial gaze continues immediately after Vellum’s stop. We end at the plant on purpose so the timed sit stays bounded; if you Host further into the chapter, warn the room first. Flag — do not sanitize mid-bind.`,
  "noli-me-tangere":
    `Capitan Tiago announces a dinner at the last minute—and all of Binondo, the Walled City, and Manila’s hangers-on begin polishing shoes and rehearsing intimacy.`,
  vera:
    `Cornwall, noon heat, a garden gate, and a daughter who has lost everything—and feels nothing yet. Same author as Enchanted April, colder register. Wemyss intensifies later; this open stays clean emptiness.`,
  "on-a-chinese-screen":
    `She takes a holy temple and papers it into Cheltenham—blue curtains for her eyes, pink stripes, an American stove where the Buddha sat.`,
  futility:
    `The first sit opens on the harbour: the only thing to do was to fit all this into a book. The port sounds the note of departure, and the tall stone houses set the tone.`,
  "african-farm":
    `The full African moon poured down its light from the blue sky into the wide, lonely plain. Stunted karoo bushes and milk-bushes follow in the white light, then a solitary kopje of ironstones. Stop before the farm household densifies.`,
  marianela:
    `The sun had set. After the brief interval of twilight the night fell calm and dark, and in its gloomy bosom the last sounds of a sleepy world died gently away. The traveller went forward on his way, hastening his step as night came on; the path he followed was narrow and worn by the constant tread of men and beasts, and led gently up a hill on whose verdant slopes grew picturesque clumps of wild cherry trees, beeches and oaks.--The reader perceives that we are in the north of Spain.`,
  "on-the-seaboard":
    `A fishing boat lay one May evening to beam-wind, out on Goosestone bay. "Rokarna," known to all on the coast by their three pyramids, were changing to blue, while upon the clear sky clouds were forming just as the sun began to sink. The first sit stops after the Surveyor at the tiller.`,
  "poison-tree":
    `His wife makes him promise: if a storm rises, leave the boat. On the Ganges in Joisto, the weather keeps that promise.`,
  "trooper-peter-halket":
    `A lone Chartered Company trooper on a Mashonaland kopje, fire quivering, inventing gold companies in the dark after losing his column. Written in 1897, the open already frames colonial scouting; missionary and racial language harden after the night-watch open-at—before the stranger arrives. If you Host further, name that colonial frame up front.`,
  "the-home-and-the-world":
    `Mother’s vermilion mark, a red-bordered *sari*, a dark face that shamed vanity — and a daughter furious with her mirror. Bimala remembers beauty, colour, and duty in a Bengal house.`,
  "where-angels-fear-to-tread":
    `Charing Cross chaos — Lilia laughing like royalty while Philip floods her with little towns to see: Gubbio, Pienza, Monteriano. Later the plot darkens; this open stays comic.`,
  "the-gadfly":
    `Pisa seminary heat — a lost sermon page, a caressing *Padre*, and a fruitseller calling *Fragola!* down the street. Later violence comes after this sit.`,
  "the-immoralist":
    `Faithful friends summoned to a distant house — Michel can free himself; he cannot yet say what freedom is for. The sit opens on the frame letter and stops on the freedom line.`,
  "the-hidden-force":
    `The full moon wore the hue of tragedy that evening — a blood-red ball behind the tamarind-trees in the Lange Laan, then stillness in a pallid sky. The first sit stops before the household dinner.`,
  "casanovas-homecoming":
    `Casanova is in his fifty-third year, circling toward Venice like a wounded bird, and the petitions home have turned humble.`,
  "letters-of-a-javanese-princess":
    `Kartini writes from colonial Java in 1899, hungry for the “modern girl” of Europe while age-long traditions hold her cloistered. Period phrases like “Indian world” and “pale sisters” mean the Indies and Western women — historical voice, not today’s usage. The Rituals sit is the cloistered-arms beat; if you Host further letters, name that colonial frame for the room first.`,
  "blood-and-sand":
    `Fight-day breakfast: meat, black coffee, a huge cigar — and a dining room that treats the matador like family glory.`,
  ecstasy:
    `After dinner on the Scheveningen Road — rosewood, vieux-rose silk, an onyx lamp like a six-petalled flower — and a promise not to wake the boy.`,
  "an-outcast-of-the-islands":
    `A little excursion off the straight path — neatly done, quickly forgotten. Conrad’s Malay Archipelago world — colonial hierarchy and racialized language intensify after the open-at. If you Host further, name that frame for the room first.`,
  "the-underdogs":
    `Dog barking in the sierra — tortillas, a *cántaro*, a rifle under the mat — and hoofbeats in the quarry.`,
  "diary-of-a-chambermaid":
    `Twelfth place in two years — rainy September, *Figaro* ad, dirty souls, and no interview with Madame.`,
  "the-painted-veil":
    `Someone tries the door — shuttered room, tight shoes, a kimono, and Walter’s name whispered. Hong Kong / treaty-port China, colonial household language (*amah*, “boys”), then cholera inland. The sit opens on “How shall I get out?” Name the frame if you Host further.`,
  "the-good-soldier":
    `Nine seasons at Bad Nauheim — intimacy like a good glove, and still they knew nothing.`,
  "growth-of-the-soil":
    `Who made the road over the moors? A man with a sack, a red beard, and scars — looking for land, or peace. Hamsun’s settler open uses the period word “Lapp” for Sámi herders on the common. Historical voice; Vellum stays on the man with the sack. If you Host further, keep that named for the room.`,
  "nada-the-lily":
    `You ask for the youth of Umslopogaas and his love for Nada — and the old man who answers is not the name you think. Haggard’s Zululand frame — an old narrator under “the White Man” / Great Queen law — is colonial adventure voice, with period names and violence ahead. Name that frame for the room before you Host further.`,
  "all-quiet-on-the-western-front":
    `Five miles behind the front — bellies full, double sausage, and a cook who won’t stop ladling. This sit is rest and double rations five miles behind the line; later chapters bring trench violence and period enemy language. Warn the room if you Host further.`,
  we:
    `Cheeks burning — D-503 will straighten the wild curve into the wisest of lines, and call the record *We*.`,
  "the-story-of-gosta-berling":
    `At last the priest is in the pulpit — marble-handsome — and the parish remembers him reeling out of the inn.`,
  thais:
    `Nile banks dense with hermits’ huts — clay, crosses, bread and hyssop after sunset — and stranger caves beyond. Desire, conversion, and desert zeal intensify after this atlas-like open. Warn the room if you Host into Paphnutius / Thaïs.`,
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
  "nacha-regules":
    "An August night — Buenos Aires ablaze for her adolescence as a capital — and the mandola underlines the tangos with long shadows of pain. First sit stops there; do not jump to the first Nacha. The novel continues.",
  krakatit:
    "With the evening the fog of the cold, damp day grew thicker on the Old Town embankment — then suddenly a pair of penetrating eyes fixed on him. Stop before the Krakatit-box densifies. The novel continues.",
  "the-peasants":
    "Praised be Jesus Christ! — Agatha and the priest on the roadside, then out into the wide world across bare autumnal fields. Winter is coming. First sit is that Chapter I greeting; the Autumn volume continues.",
  cane:
    "Karintha: her skin is like dusk on the eastern horizon. Skip Waldo Frank’s foreword. First sit ends on the dusk-song refrain; the Georgia cycle continues.",
  generosity:
    "An apology begins with a box of unused baby clothes and a basement mural of identical smiles. The story keeps going until the face is only itself again.",

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
    workIds: [
      ...FIRST_SESSION_RITUAL_IDS,
      "cane",
      "the-awakening",
      "there-is-confusion",
      "miss-lulu-bett",
      "seven-brothers",
      "futility",
      "on-the-seaboard",
      "generosity",
    ],
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
      "casanovas-homecoming",
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
      "a-hero-of-our-time",
      "strange-tales",
      "short-stories-from-the-balkans",
      "the-awakening",
      "a-few-figs-from-thistles",
      "tropic",
      "there-is-confusion",
      "buddenbrooks",
      "miss-lulu-bett",
      "color",
      "the-three-impostors",
      "reginald",
      "last-poems-housman",
      "the-dynamiter",
      "candide",
      "trooper-peter-halket-of-mashonaland",
      "the-toys-of-peace",
      "the-black-dog",
      "children-of-the-frost",
      "south-sea-tales",
      "fairies-and-fusiliers",
      "young-adventure",
      "the-tempers",
      "the-crescent-moon",
      "poems-by-emily-dickinson-series-one",
      "the-gadfly",
      "ecstasy",
      "the-painted-veil",
      "the-good-soldier",
      "nada-the-lily",
      "all-quiet-on-the-western-front",
      "the-story-of-gosta-berling",
      "thais",
      "demian",
      "bliss",
      "a-hundred-and-seventy-chinese-poems",
      "dubliners",
      "gitanjali",
      "martin-bircks-youth",
      "harmonium",
      "krakatit",
      "cane",
      "the-pattern",
      "between-the-drop-and-the-water",
      "story-of-an-hour-buenos-aires",
      "masque-rio",
      "usher-prague",
      "araby-seville",
      "the-wild-swans-at-coole",
      "kwaidan-stories-and-studies-of-strange-things",
      "the-listeners-and-other-poems",
      "the-empty-house-and-other-ghost-stories",
      "dark-of-the-moon",
      "love-songs",
      "the-house-of-souls",
      "wallpaper",
      "silhouettes",
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
      "the-book-of-wonder",
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
      "meaulnes",
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
      "on-the-seaboard",
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
      "hadji-murad",
      "anandamath",
      "maria",
      "lady-macbeth",
      "layla",
      "conference",
      "gentlemen-prefer-blondes",
      "of-one-blood",
      "maria-chapdelaine",
      "lady-into-fox",
      "african-farm",
    ],
  },
  {
    id: "waking-up",
    label: "Waking up",
    workIds: [
      "enchanted-april",
      "on-a-chinese-screen",
      "where-angels-fear-to-tread",
      "letters-of-a-javanese-princess",
      "blood-and-sand",
      "an-outcast-of-the-islands",
      "the-underdogs",
      "diary-of-a-chambermaid",
      "growth-of-the-soil",
      "we",
      "death-comes-for-the-archbishop",
      "the-getting-of-wisdom",
      "the-peasants",
      "the-rubaiyat-of-omar-khayyam",
      "spring-and-all",
      "songs-of-innocence-and-of-experience",
      "second-april",
      "renascence-and-other-poems",
      "mountain-interval",
      "open-window-singapore",
      "the-nose-cape-town",
      "seven-brothers",
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
      // Enchanted April is a waking-up local sit on this shelf. Live bind
      // is Mira’s first-session dripping-street cut (~158w). The longer
      // agony-column Host sit is backup only — do not invent a second work id.
      "poison-tree",
      "noli-me-tangere",
      "nacha-regules",
      "songs-of-kabir",
      "pictures-of-the-floating-world",
      "silhouettes",
      "the-garden-party-and-other-stories",
      "bliss-and-other-stories",
      "miss-brill-adapted",
      "prefer-not",
      "late-season",
      "bliss-tokyo",
      "boule-de-suif-istanbul",
      "garden-party-barcelona",
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
      "seven-brothers",
      "on-the-seaboard",
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
  "enchanted-april": 2,
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
  "all-quiet-on-the-western-front": 2,
  we: 2,
  "the-story-of-gosta-berling": 2,
  thais: 2,
  demian: 2,
  "death-comes-for-the-archbishop": 2,
  "the-getting-of-wisdom": 2,
  bliss: 2,
  "a-hundred-and-seventy-chinese-poems": 2,
  dubliners: 2,
  gitanjali: 2,
  "martin-bircks-youth": 2,
  harmonium: 2,
  "nacha-regules": 2,
  krakatit: 2,
  "the-peasants": 2,
  cane: 2,
  "a-hero-of-our-time": 5,
  "strange-tales": 5,
  "short-stories-from-the-balkans": 5,
  "the-awakening": 5,
  "a-few-figs-from-thistles": 5,
  tropic: 5,
  "there-is-confusion": 5,
  buddenbrooks: 5,
  "miss-lulu-bett": 5,
  color: 5,
  "a-diversity-of-creatures": 5,
  "an-american-tragedy": 5,
  "bertha-garlan": 5,
  "born-in-exile": 5,
  "calvary": 5,
  "charmides-and-other-poems": 5,
  "cousin-betty": 5,
  "dauber": 5,
  "eugenie-grandet": 5,
  "heart-of-darkness": 5,
  "in-a-glass-darkly": 5,
  "in-the-world": 5,
  "indiana": 5,
  "lady-windermeres-fan": 5,
  "pans-garden": 5,
  "peacock-pie": 5,
  "prosas-profanas": 5,
  "resurrection": 5,
  "rosmersholm": 5,
  "salome": 5,
  "salt-water-ballads": 5,
  "small-souls": 5,
  "songs-and-satires": 5,
  "tess-of-the-durbervilles": 5,
  "the-ballad-of-the-white-horse": 5,
  "the-book-of-wonder": 5,
  "the-colonel-s-dream": 5,
  "the-comedienne": 5,
  "the-crux": 5,
  "the-dream": 5,
  "the-gods-of-pegana": 5,
  "the-grand-babylon-hotel": 5,
  "the-hidden-force": 5,
  "the-house-by-the-medlar-tree": 5,
  "the-house-of-the-seven-gables": 5,
  "the-jacket": 5,
  "the-job": 5,
  "the-magic-skin": 5,
  "the-man-of-property": 5,
  "the-napoleon-of-notting-hill": 5,
  "the-party-and-other-stories": 5,
  "the-pit": 5,
  "the-poison-tree": 5,
  "the-reign-of-greed": 5,
  "the-rise-of-david-levinsky": 5,
  "the-rise-of-silas-lapham": 5,
  "the-road-to-the-open": 5,
  "the-romance-of-the-milky-way": 5,
  "the-three-taverns": 5,
  "the-titan": 5,
  "the-town-down-the-river": 5,
  "the-veil-and-other-poems": 5,
  "the-village": 5,
  "the-wolves-of-god": 5,
  "the-wonderful-adventures-of-nils": 5,
  "theresa-raquin": 5,
  "three-soldiers": 5,
  "twilight-sleep": 5,
  "virgin-soil": 5,
  "wanderers": 5,
  "white-jacket": 5,
  "yekl": 5,
  "zuleika-dobson": 5,
  "a-group-of-noble-dames": 5,
  "captain-craig": 5,
  "daniel-deronda": 5,
  "day-and-night-stories": 5,
  "fifty-one-tales": 5,
  "jude-the-obscure": 5,
  "les-villes-tentaculaires": 5,
  "neue-gedichte": 5,
  "over-the-brazier": 5,
  "rolling-stones": 5,
  "salammbo": 5,
  "smoke-bellew": 5,
  "songs-from-vagabondia": 5,
  "songs-of-childhood": 5,
  "ten-minute-stories": 5,
  "the-everlasting-mercy": 5,
  "the-golden-bowl": 5,
  "the-rainbow": 5,
  "the-sword-of-welleran": 5,
  "time-and-the-gods": 5,
  "a-changed-man": 5,
  "ballads-of-a-bohemian": 5,
  "ballads-of-a-cheechako": 5,
  "crucial-instances": 5,
  "filipino-popular-tales": 5,
  "lost-illusions": 5,
  "mogens": 5,
  "more-songs-from-vagabondia": 5,
  "rhymes-of-a-red-cross-man": 5,
  "rhymes-of-a-rolling-stone": 5,
  "songs-of-travel": 5,
  "the-faith-of-men": 5,
  "the-golden-whales-of-california": 5,
  "the-hermit-and-the-wild-woman": 5,
  "the-princess-casamassima": 5,
  "the-son-of-the-wolf": 5,
  "the-stolen-bacillus": 5,
  "the-tragic-muse": 5,
  "toilers-of-the-sea": 5,
  "toward-the-gulf": 5,
  "a-house-of-gentlefolk": 5,
  "artists-wives": 5,
  "blix": 5,
  "emaux-et-camees": 5,
  "eves-ransom": 5,
  "fraternity": 5,
  "hania": 5,
  "indian-summer": 5,
  "les-heures-claires": 5,
  "les-trophees": 5,
  "numa-roumestan": 5,
  "royal-highness": 5,
  "the-emancipated": 5,
  "the-great-hunger": 5,
  "the-patrician": 5,
  "the-price-of-love": 5,
  "the-private-papers-of-henry-ryecroft": 5,
  "unhuman-tour-kusamakura": 5,
  "ubirajara": 5,
  "cecilia": 5,
  "la-regenta": 5,
  "los-pazos-de-ulloa": 5,
  "nazarin": 5,
  "the-octopus": 5,
  "the-red-and-the-black": 5,
  "alcools": 5,
  "petersburg": 5,
  "st-peter-s-umbrella": 5,
  "caesar-or-nothing": 5,
  "calligrammes": 5,
  "martin-fierro": 5,
  "the-complete-original-short-stories": 5,
  "the-cabin": 5,
  "les-chants-de-maldoror": 5,
  "pan-tadeusz": 5,
  "the-red-laugh": 5,
  "before-adam": 5,
  "bruges-la-morte": 5,
  "casmurro": 5,
  "les-civilises": 5,
  "ein-landarzt": 5,
  "hien-le-maboul": 5,
  "knulp": 5,
  "iracema": 5,
  "meaulnes": 5,
  "tristana": 5,
  "niels": 5,
  "amor-de-perdicao": 5,
  "das-stunden-buch": 5,
  "misericordia": 5,
  "the-mandarin": 5,
  "policarpo": 5,
  "quincas": 5,
  "marianela": 5,
  "pepita-jimenez": 5,
  "a-illustre-casa-de-ramires": 5,
  "an-iceland-fisherman": 5,
  "aphrodite": 5,
  "azul": 5,
  "contes-cruels": 5,
  "les-amours-jaunes": 5,
  "libro-de-poemas": 5,
  "on-the-eve": 5,
  "papeis-avulsos": 5,
  "piping-hot": 5,
  "ramuntcho": 5,
  "smoke": 5,
  "the-fortune-of-the-rougons": 5,
  "the-paying-guest": 5,
  "the-triumph-of-death": 5,
  "the-witch-and-other-stories": 5,
  "therese-raquin": 5,
  "tradiciones-peruanas": 5,
  "watch-and-ward": 5,
  "bay-a-book-of-poems": 5,
  "black-spirits-and-white-a-book-of-ghost-stories": 5,
  "fir-flower-tablets": 5,
  "hugh-selwyn-mauberley": 5,
  "os-lusiadas": 5,
  "the-black-monk-and-other-stories": 5,
  "the-heart-of-happy-hollow": 5,
  "the-hesperides-and-noble-numbers": 5,
  "the-horse-stealers-and-other-stories": 5,
  "the-mystery-of-choice": 5,
  "the-poems-of-emma-lazarus-volume-1": 5,
  "weird-tales": 5,
  "siddhartha": 5,
  "faust-part-i": 5,
  "the-divine-comedy": 5,
  "eugene-onegin": 5,
  "seven-brothers": 5,
  "gilgamesh": 5,
  "bontshe-the-silent": 5,
  "shahnameh": 5,
  "song-of-songs": 5,
  "baudelaire-prose-and-poetry": 5,
  "tales-grotesque-and-curious": 5,
  "a-book-barnes": 5,
  "a-spring-time-case": 5,
  "jewish-children": 5,
  "essays-and-soliloquies": 5,
  "tragic-sense-of-life": 5,
  "white-buildings": 5,
  "three-plays": 5,
  "our-lady-of-the-pillar": 5,
  "the-sweet-miracle": 5,
  "red-oleanders": 5,
  "stories-from-tagore": 5,
  "the-fugitive": 5,
  "nationalism": 5,
  "the-cycle-of-spring": 5,
  "creative-unity": 5,
  "the-lonely-way": 5,
  "rootabaga-stories": 5,
  "rootabaga-pigeons": 5,
  "auguste-rodin": 5,
  "on-the-seaboard": 5,
  "lucky-pehr": 5,
  "the-dream-play": 5,
  "the-father": 5,
  "easter": 5,
  "the-inferno": 5,
  "trafalgar": 5,
  "saragossa": 5,
  "leon-roch": 5,
  "yiddish-short-stories": 5,
  "tales-of-old-japan": 5,
  "chinese-literature": 5,
  "the-prose-tales": 5,
  "self-determining-haiti": 5,
  "leon-roch-vol-2": 5,
  "miss-julia": 5,
  "in-midsummer-days": 5,
  "the-chinese-fairy-book": 5,
  "japanese-fairy-world": 5,
  "japanese-literature": 5,
  "romances-of-old-japan": 5,
  "warriors-of-old-japan": 5,
  "a-history-of-chinese-literature": 5,
  "the-civilization-of-china": 5,
  "kimiko": 5,
  "glimpses-of-unfamiliar-japan": 5,
  "hebrew-literature": 5,
  "the-history-of-yiddish-literature": 5,
  "korean-folk-tales": 5,
  "smoke-and-steel": 5,
  "gods-trombones": 5,
  "hadji-murad": 5,
  "anandamath": 5,
  "maria": 5,
  "lady-macbeth": 5,
  "layla": 5,
  "conference": 5,
  "gentlemen-prefer-blondes": 5,
  "of-one-blood": 5,
  "maria-chapdelaine": 5,
  "lady-into-fox": 5,
  "african-farm": 5,
  generosity: 20,
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

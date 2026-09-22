import { FEATURED_CAROUSEL_IDS } from "./pitches.ts";

/**
 * Locked recommend → Next → Later ranking for local binds, plus Adapted by Salon.
 *
 * Live locked recommend rank (Mike A24≥9, Mira elevate Sun Sep 20):
 * Enchanted April, The Bridge of San Luis Rey, Mr. Fortune’s Maggot,
 * then The House of Mirth, then Quicksand. See FEATURED_CAROUSEL_IDS.
 * Home does not render a recommend strip — those five live on Rituals
 * (and remain the sit-together shuffle preference).
 *
 * Next keeps the remaining Host-a-sit queue:
 * The Attendant’s Confession (A24 South America lane).
 * Rashōmon (Asia lane).
 * A High Wind in Jamaica (Jamaica / before-sleep Host-a-sit Ch1).
 * Noli Me Tangere (Manila / unwind Host-a-sit Ch1).
 * Vera (Cornwall / before-sleep Host-a-sit Ch I).
 * On a Chinese Screen (China / waking Host-a-sit Parlour).
 * Futility (Petersburg coast / waking Host-a-sit sisters).
 * Trooper Peter Halket (Mashonaland / before-sleep Host-a-sit kopje).
 * The Home and the World (Bengal / before-sleep) — worldly Asia, behind the
 * locked recommend lead (April → Bridge → Maggot → Mirth → Quicksand).
 * The Immoralist (France / before-sleep) — strong Next only; not cold-open.
 * Letters of a Javanese Princess and Blood and Sand are ritual Next sits only —
 * not the locked recommend list.
 * Where Angels Fear to Tread and The Gadfly are ritual Next sits only —
 * not the locked recommend list.
 * Ecstasy, An Outcast of the Islands, The Underdogs, and The Diary of a
 * Chambermaid are ritual Next sits only — not the locked recommend list.
 * The Painted Veil, The Good Soldier, Growth of the Soil, and Nada the Lily
 * are ritual Next sits only — not the locked recommend list, not For you.
 * All Quiet on the Western Front, We, The Story of Gösta Berling, and Thaïs
 * are ritual Next sits only — not the locked recommend list, not For you.
 * Demian and Death Comes for the Archbishop are ritual Next sits only —
 * not the locked recommend list, not For you. The Getting of Wisdom is a
 * Rituals waking sit only — not locked recommend, not For you.
 * Bliss, Dubliners, Gitanjali, and Martin Birck’s Youth are ritual Next
 * sits only — not locked recommend, not For you. A Hundred and Seventy
 * Chinese Poems is a Rituals before-sleep sit only — not locked recommend,
 * not For you. Harmonium is a Rituals before-sleep sit only — The Snow Man
 * open, never Featured, not For you.
 * The Poison Tree is Later (Bengal / unwind) — not Next, not locked recommend.
 * Nacha Regules (unwind), Krakatit (before-sleep), The Peasants (waking),
 * and Cane (For you + before-sleep) are ritual Next sits only — not locked
 * recommend, not Featured. Cane may surface on For you after the cold-open
 * trio; Mirth → Quicksand → Botchan stay first.
 * Noon cycle (Sep 21) sits on the Next track, ahead of Later: A Hero of Our
 * Time (Caucasus—Georgia), Strange Tales (Painted Wall), Short Stories from
 * the Balkans (Easter Candles), and The Awakening (For you after the
 * cold-open trio, then Cane). A Few Figs from Thistles is Rituals
 * before-sleep only — poem chapters, First Fig — not Next, not Featured.
 * PM cycle (Sep 21) sits on Next after that noon queue: Tropic Death is the
 * Next lead (Drought, Barbados), then There Is Confusion (For you after the
 * cold-open trio), then Miss Lulu Bett (For you). Buddenbrooks is Later
 * (soft inflation) — not Next, not Featured. Color is Rituals only — Yet Do
 * I Marvel, then Incident, poem chapters — not Next, not Featured.
 * Cold-open stays Mirth → Quicksand → Botchan.
 * Tier A CLEAR (Sep 22) sits on Next after that queue, before-sleep only —
 * never Featured. Cold-open stays Mirth → Quicksand → Botchan. Noli stays the
 * live Derbyshire Host bind already on Next / Unwind.
 * BATCH-4 CLEAR (Sep 22) sits on Next after Tier A, before-sleep only —
 * never Featured, not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * BATCH-5 CLEAR (Sep 22) sits on Next after BATCH-4, before-sleep only —
 * never Featured, not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * BATCH-8 CLEAR (Sep 22) sits on Next after All Quiet and BATCH-5, before-sleep only —
 * never Featured, not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * Tier B format-min batches 15–16 sit on Later only — never Featured, not Next,
 * not For you. Cold-open stays Mirth → Quicksand → Botchan.
 * BATCH-11 CLEAR (Sep 22) sits on Next after BATCH-8 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * BATCH-10 CLEAR (Sep 22) sits on Next after All Quiet on the Western Front,
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Inferno stays HOLD (no invented Dante PG).
 * BATCH-9 CLEAR (Sep 22) sits on Next after All Quiet (after BATCH-10),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * BATCH-12 CLEAR (Sep 22) sits on Next after BATCH-9 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Ids already full-text local keep that bind.
 * BATCH-14 CLEAR (Sep 22) sits on Next after BATCH-13 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Ids already full-text local keep that bind
 * (Yiddish Tales, Pharaoh, Brazilian Tales, Mashi, Casanova's Homecoming).
 * Bertha Garlan stays on its earlier Next seat; the bind now opens on Chapter I.
 * Tier B format-min batches 9–10 (Sep 22) are Later binds only — not Featured,
 * not Next, not For you. Mother is one of those Later rows. The chambermaid
 * stub stays unbound; Diary of a Chambermaid is the fuller local bind.
 * BATCH-13 CLEAR (Sep 22) sits on Next after BATCH-12 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Siddhartha is the PG 2500 English, off the old EN hold.
 * The Divine Comedy is PG 1004 (Longfellow), not an invented Dante id.
 * Hands Around (Reigen) was already full-text local on main, so this batch leaves that bind.
 * BATCH-15 CLEAR (Sep 22) sits on Next after BATCH-14 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. the-inferno is Strindberg (PG 44108), not Dante.
 * Steppenwolf, The Red Room, and Queen of Spades and Other Stories keep their
 * fuller local binds and stay off this Next queue. Marianela keeps the fuller
 * Clara Bell English (PG 48818) in the BATCH-10 seat.
 * BATCH-16 CLEAR (Sep 22) sits on Next after BATCH-15 (after All Quiet),
 * before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. Fifty Years & Other Poems, Japanese Fairy Tales,
 * Some Chinese Ghosts, and Shadowings were already full-text local (the last
 * three fuller than this host-one pack), so those binds stay.
 * EXTRACTABLE-8 CLEAR (Sep 22, last pack) sits on Next after BATCH-16 (after
 * All Quiet), before-sleep only — never Featured, not For you. Cold-open stays
 * Mirth → Quicksand → Botchan. No Project Gutenberg ids. Anandamath is the
 * 1906 Abbey of Bliss, not Poison Tree. Conference of the Birds is FitzGerald’s
 * abridged Bird Parliament. Lady Macbeth hosts the one Chamot tale.
 * Mira 8AM CLEAR ×5 (Sep 22) — Recommend only, never Featured. Gentlemen Prefer
 * Blondes leads Next with Of One Blood and Maria Chapdelaine (Blake EN 4383,
 * not FR 13525) on before-sleep. Lady into Fox is Rituals only. Seven Brothers
 * (Matson EN 79566) is For you only — not Next. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * Generosity (Amber Later, 2026) is the Mira CLEAR local manuscript — rights
 * Vellum, no Project Gutenberg id. Recommend For you only — not Next, never Featured.
 * Story through I'm sorry, then Poem I–VII. Cold-open stays
 * Mirth → Quicksand → Botchan.
 * NOON2 CLEAR (Sep 22) — Recommend only, never Featured. African Farm joins
 * Next / before-sleep on the Karoo moon (PG 1441). Marianela stays in its
 * BATCH-10 Next seat, Bell English, ads after THE END stripped (PG 48818).
 * On the Seaboard leaves Next for For you (and the walk / before-sleep sit);
 * Preface skipped, Goosestone bay open (PG 44184). Siddhartha and The Red
 * Room stay unstamped this wave. Cold-open stays Mirth → Quicksand → Botchan.
 * 4PM CLEAR (Sep 22) — Recommend only, never Featured. A Passage to India leads
 * this cycle’s Next append (Chandrapore / Marabar, English 1924, PG 61221),
 * then Mhudi (Bechuana open, Lovedale 1930, no Project Gutenberg id), then
 * María, moved off its EXTRACTABLE-8 seat onto this Next tail. María is Ogden’s
 * English 1890, lock-of-hair open, distinct from Marianela. Bel-Ami is For you
 * only (French 1885, PG 3733; no invented English year), after the cold-open
 * trio and before Generosity. Magnhild is Rituals only — before-sleep and a
 * walk, PG 33683, Preface skipped, Dust cut — not Next, not For you.
 * Cold-open stays Mirth → Quicksand → Botchan. Tang Poems and The Bronze
 * Horseman stay HOLD.
 *
 * Remakes are Salon original adaptations of PD sources. They are their own
 * catalog track — never locked recommend, Next, or Later classics.
 */
export type CuratorialTrack = "featured" | "next" | "later" | "adapted";

export const NEXT_FEATURED_TRACK_IDS = [
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
  // Mira BATCH-1 CLEAR (Sep 22) — after the PM queue. Never Featured.
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
  // Mira BATCH-11 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // Mira BATCH-10 CLEAR (Sep 22) — after All Quiet. Never Featured. Not For you.
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
  // Mira BATCH-13 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // Mira BATCH-15 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // Mira BATCH-16 CLEAR — after All Quiet. Never Featured. Not For you.
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
  // Mira EXTRACTABLE-8 CLEAR — after All Quiet. Never Featured. Not For you. No PG.
  "smoke-and-steel",
  "gods-trombones",
  "hadji-murad",
  "anandamath",
  "lady-macbeth",
  "layla",
  "conference",
  // Mira 8AM CLEAR ×5 — after EXTRACTABLE-8. Never Featured. Gentlemen leads Next.
  "gentlemen-prefer-blondes",
  "of-one-blood",
  "maria-chapdelaine",
  // Mira NOON2 CLEAR — after 8AM. Never Featured. Not For you.
  "african-farm",
  // Mira 4PM CLEAR — Passage leads Next. Never Featured. Not For you.
  "a-passage-to-india",
  "mhudi",
  "maria",
] as const;

/**
 * Mira pack — Adapted by Salon lane only. Do not add to locked recommend / Next.
 * Recasts are short stories only (Mike lock Sep 21). Whole-story remakes:
 * one shelf id / one read path each. Never splice a remake into waking /
 * unwind / before-sleep sibling sits (Mike lock Sep 20).
 *
 * FINAL LOCK — Mira + Thea + CoS (Sep 21): KEEP 14 only. Ignore any 15/20
 * variant. miss-brill-remake → miss-brill-adapted. Novels-glam×10, Madame
 * Bovary Tokyo, during-carnival, decapitated-chicken-lisbon, he-woke-changed,
 * a-coat-worthy-of-respect, hunger-artist-milan, queen-of-spades-paris, the
 * soft nine, and uninvented ids (the-kiss-nice, jewels-monaco) stay off this
 * list — not Featured, not Adapted. CUT shorts leave ritual lanes too.
 */
export const ADAPTED_BY_SALON_IDS = [
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

const FEATURED = new Set(FEATURED_CAROUSEL_IDS);
const NEXT = new Set<string>(NEXT_FEATURED_TRACK_IDS);
const ADAPTED = new Set<string>(ADAPTED_BY_SALON_IDS);

export function isAdaptedBySalon(id: string) {
  return ADAPTED.has(id);
}

export function curatorialTrack(id: string): CuratorialTrack {
  if (ADAPTED.has(id)) return "adapted";
  if (FEATURED.has(id)) return "featured";
  if (NEXT.has(id)) return "next";
  return "later";
}

export function worksOnTrack(
  ids: readonly string[],
  track: CuratorialTrack,
): string[] {
  return ids.filter((id) => curatorialTrack(id) === track);
}

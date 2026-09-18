import { isLocalBound } from "./full-pdf.ts";

/** Multi-night novel episode plans (Thea’s serialize shortlist). */

export type SerializeEpisode = {
  n: number;
  title: string;
  source: string;
  words: number;
  minutes: number;
  summary: string;
  hook: string;
};

export type SerializePlan = {
  id: string;
  title: string;
  author: string;
  year: number;
  shortLabel: string;
  nights: number;
  totalMinutes: number;
  framing: string;
  geography: string;
  cadence: string;
  openAt: string;
  why: string;
  shipNotes: string;
  /** Shelf work id when a local bind exists; null = catalogued, text not live. */
  shelfWorkId: string | null;
  episodes: SerializeEpisode[];
};

export const SERIALIZE_LANE_ID = "serialize";

export const SERIALIZE_PLANS: SerializePlan[] = [
  {
    "id": "the-sun-also-rises",
    "title": "The Sun Also Rises",
    "author": "Ernest Hemingway",
    "year": 1926,
    "shortLabel": "Sun Also Rises",
    "nights": 18,
    "totalMinutes": 259,
    "framing": "Paris nights, Pamplona mornings, and a love that cannot be touched — Hemingway's lost generation, one cafe at a time.",
    "geography": "Paris → Burguete / Irati → Pamplona → Madrid",
    "cadence": "Nightly 8–15 min; allow ~18 min for fight/fiesta peaks",
    "openAt": "Skip Scribner front matter and dedication if desired; begin Book I, Chapter 1 (Robert Cohn was once...). Keep Stein/Ecclesiastes epigraphs as optional pre-roll.",
    "why": "Contemporary listeners already live inside Jake's problem: performative cool over unfixable want. The novel serializes cleanly because Hemingway's chapters are scene-shaped — cafes, trains, fights — with natural stop-points. Brett Ashley reads now as both liberated and trapped; Cohn's grievance politics feel uncomfortably current. Pamplona gives the back half seasonal event-series energy. Ending on the Madrid taxi line gives the shelf a signature closer people quote.",
    "shipNotes": "Project Gutenberg #67138 (Distributed Proofreaders Canada text; confirm US territory on board) PG 67138 is the Canada DP text. Confirm US PD/storefront rights on the board before wide US push. Structure: Book I Ch. 1–7; Book II Ch. 8–18; Book III Ch. 19 (19 chapters total).",
    "shelfWorkId": "the-sun-also-rises",
    "episodes": [
      {
        "n": 1,
        "title": "Cohn at Princeton",
        "source": "Book I, Ch. 1",
        "words": 1350,
        "minutes": 7,
        "summary": "Jake Barnes sketches Robert Cohn — Princeton boxing, divorce, Frances, the review he bankrolled. Frances kicks Jake under the table when he mentions a Strasbourg girl. Cohn is already a man led by women and books.",
        "hook": "Cohn's hunger for real life is about to attach to something worse than South America."
      },
      {
        "n": 2,
        "title": "South America fever",
        "source": "Book I, Ch. 2",
        "words": 1510,
        "minutes": 8,
        "summary": "After New York success, Cohn reads The Purple Land as a guidebook and begs Jake to flee to South America. Jake: you cannot get away from yourself by moving. Cohn sleeps in the office whispering he cannot do it.",
        "hook": "A warm spring night on the Napolitain terrace — and Brett is about to walk in."
      },
      {
        "n": 3,
        "title": "Brett at the bal",
        "source": "Book I, Ch. 3",
        "words": 2820,
        "minutes": 14,
        "summary": "Jake and Georgette; Braddocks's table; the bal musette. Brett Ashley arrives with wavy-haired young men. Cohn looks at her with eager, deserving expectation. Jake and Brett leave together.",
        "hook": "In the dark taxi, Brett will ask him not to touch her — and mean the opposite of indifference."
      },
      {
        "n": 4,
        "title": "The wound",
        "source": "Book I, Ch. 4",
        "words": 2910,
        "minutes": 15,
        "summary": "Brett and Jake name the impossibility: war wound, desire, hell. Count Mippipopolous; Brett's 4:30 a.m. visit after refusing money for Biarritz because she loves Jake. Daylight Jake can be hard-boiled; night is another thing.",
        "hook": "Cohn will ask what Jake knows about Lady Brett Ashley."
      },
      {
        "n": 5,
        "title": "Frances's version",
        "source": "Book I, Ch. 5–6",
        "words": 4680,
        "minutes": 14,
        "summary": "Ch. 5 lunch: Cohn is in love with Brett's breeding. Ch. 6: Brett stands Jake up at the Crillon; Harvey Stone is starving; Frances publicly eviscerates Cohn for dumping her after three years. Jake flees.",
        "hook": "Brett and the Count arrive at Jake's with roses and champagne."
      },
      {
        "n": 6,
        "title": "Values",
        "source": "Book I, Ch. 7",
        "words": 3530,
        "minutes": 18,
        "summary": "Champagne talk: the Count's arrow wounds, knowing the values. Brett leaves for San Sebastian; she will not live quietly with Jake. Montmartre; she bars him from her hotel.",
        "hook": "Bill Gorton's wire — fishing and the fiesta are coming."
      },
      {
        "n": 7,
        "title": "Never be daunted",
        "source": "Book II, Ch. 8",
        "words": 3030,
        "minutes": 15,
        "summary": "Quiet Paris: work, races, Bill's Vienna stories. Brett returns the night Mike Campbell arrives. The gang for Spain is forming; Cohn still circles Brett.",
        "hook": "Southbound tickets and a jealousy Cohn cannot box away."
      },
      {
        "n": 8,
        "title": "Tickets and talk",
        "source": "Book II, Ch. 9",
        "words": 2290,
        "minutes": 11,
        "summary": "Plans for Spain. Mike's cheerful bankruptcy; Cohn's proprietary sulks; Brett's careless power over both. Jake manages logistics and his own restraint.",
        "hook": "The train for Bayonne leaves with more freight than luggage."
      },
      {
        "n": 9,
        "title": "Into Spain",
        "source": "Book II, Ch. 10",
        "words": 4340,
        "minutes": 15,
        "summary": "Travel to Bayonne and toward Pamplona country. Landscapes, meals, the shift from Paris talk to Spanish light. Cohn's presence is a stone in the shoe.",
        "hook": "Jake and Bill peel off to fish — the last uncomplicated days."
      },
      {
        "n": 10,
        "title": "Irati river",
        "source": "Book II, Ch. 11–12",
        "words": 6500,
        "minutes": 18,
        "summary": "Burguete fishing with Bill: trout, wine, mock-sermons, male friendship without Brett. Ch. 12 returns them toward Pamplona as fiesta pressure builds. Split 11/12 if nights must stay under 15 min.",
        "hook": "The feria begins — and so does the damage."
      },
      {
        "n": 11,
        "title": "Fiesta opens",
        "source": "Book II, Ch. 13 (first half)",
        "words": 2940,
        "minutes": 15,
        "summary": "Pamplona filling, rooms, cafe claims, Brett among the drinkers. Encierro anticipation. Cohn's romantic possessiveness turns ugly under wine.",
        "hook": "Tomorrow the bulls run — and tempers with them."
      },
      {
        "n": 12,
        "title": "Under the rockets",
        "source": "Book II, Ch. 13 (cont.)–14",
        "words": 4400,
        "minutes": 15,
        "summary": "Fiesta noise, dancing, Mike's insults, Cohn as punching-bag and threat. The group's courtesy collapses.",
        "hook": "Someone will finally throw a punch that cannot be joked away."
      },
      {
        "n": 13,
        "title": "The fight",
        "source": "Book II, Ch. 15 (first half)",
        "words": 2650,
        "minutes": 13,
        "summary": "Cohn explodes — fights Mike, Jake, and the aftermath of Brett's choices. Morality play without morals.",
        "hook": "Brett is not done choosing; Pedro Romero is in town."
      },
      {
        "n": 14,
        "title": "Romero",
        "source": "Book II, Ch. 15 (cont.)–16",
        "words": 7400,
        "minutes": 18,
        "summary": "Bullfighters, Brett's fascination with young Romero, Jake's fixer role, Cohn's crusade of honor. Keep climax intact even if ~18–20 min.",
        "hook": "What Jake arranges for Brett will cost him Romero's respect — and his own."
      },
      {
        "n": 15,
        "title": "Wreckage",
        "source": "Book II, Ch. 17",
        "words": 4870,
        "minutes": 18,
        "summary": "Post-fight wreckage: Cohn's apology tour, Mike's cruelty, Brett's trajectory toward Romero. Jake drinks and endures.",
        "hook": "Brett still is not finished — and Jake will be asked to help again."
      },
      {
        "n": 16,
        "title": "Aficion's price",
        "source": "Book II, Ch. 18 (first half)",
        "words": 3090,
        "minutes": 15,
        "summary": "Bullfight excellence, Romero's purity vs. the expatriates' mess, Jake's standing with aficionados wobbling because of Brett.",
        "hook": "The last bull and the last betrayal of the week."
      },
      {
        "n": 17,
        "title": "San Sebastian wire",
        "source": "Book II, Ch. 18 (cont.) + Book III Ch. 19 opening",
        "words": 4000,
        "minutes": 15,
        "summary": "Close of fiesta; Brett leaves with Romero; Jake goes to San Sebastian alone. Then the telegram from Madrid: Brett needs him.",
        "hook": "He will go. He always goes."
      },
      {
        "n": 18,
        "title": "Pretty to think so",
        "source": "Book III, Ch. 19 (Madrid)",
        "words": 4000,
        "minutes": 15,
        "summary": "Madrid: Brett has sent Romero away. Jake pays, listens, rides with her. Closing lines — desire without remedy.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "the-bridge-of-san-luis-rey",
    "title": "The Bridge of San Luis Rey",
    "author": "Thornton Wilder",
    "year": 1927,
    "shortLabel": "Bridge of San Luis Rey",
    "nights": 8,
    "totalMinutes": 116,
    "framing": "Five strangers fall with a bridge in Peru — was it accident, or the shape of love?",
    "geography": "Lima / Peru, 1714 (viceregal)",
    "cadence": "Every other night or nightly; Parts Two–Four split halves (~15 min)",
    "openAt": "Begin Part One immediately after title/illustrations; no long front matter.",
    "why": "It is already a prestige limited series: cold open disaster, then character dossiers, then philosophical finale. Contemporary audiences raised on nonlinear TV (accident first, lives in flashback) will feel at home. Questions of providence and why these five map onto modern talk about randomness and meaning. The Abbess and the Marquesa give the book a feminist aftertaste without modern jargon. At about 8 episodes it is an ideal complete-in-two-weeks Vellum object.",
    "shipNotes": "Project Gutenberg #69768 1927 Wilder; confirm territory PD on board. Text and Amy Drevenstedt illustrations on PG 69768 — decide whether to ship illustrations as optional art. Do not invent chapter names inside parts.",
    "shelfWorkId": "the-bridge-of-san-luis-rey",
    "episodes": [
      {
        "n": 1,
        "title": "Perhaps an accident",
        "source": "Part One: Perhaps an Accident",
        "words": 1490,
        "minutes": 7,
        "summary": "Friday noon, 20 July 1714: the Bridge of San Luis Rey breaks; five fall. Brother Juniper resolves to prove God's plan mathematically by studying the victims.",
        "hook": "Who were the five — and was it accident or Intention?"
      },
      {
        "n": 2,
        "title": "The Marquesa — letters",
        "source": "Part Two: The Marquesa de Montemayor (first half)",
        "words": 4580,
        "minutes": 15,
        "summary": "Dona Maria's ugly, brilliant life; idolatry of daughter Clara in Spain; the immortal letters; neglect, drink, Pepita from the Abbess. Theatre insult by the Perichole.",
        "hook": "The Viceroy will make the Perichole apologize — and the Marquesa is about to change."
      },
      {
        "n": 3,
        "title": "The Marquesa — courage",
        "source": "Part Two (second half)",
        "words": 4580,
        "minutes": 15,
        "summary": "Apology visit; pilgrimage to Cluxambuqua; Pepita's letter; the Marquesa's first letter in courage (Letter LVI). Next day they cross the bridge.",
        "hook": "Esteban is next — and love between twins can be as fatal as any romance."
      },
      {
        "n": 4,
        "title": "Manuel and Esteban",
        "source": "Part Three: Esteban (first half)",
        "words": 3900,
        "minutes": 15,
        "summary": "Twin foundlings; secret language; silent work. Manuel falls for the Perichole and writes her secret letters; Esteban feels erased.",
        "hook": "Manuel will tear his knee — and delirium will say what silence hid."
      },
      {
        "n": 5,
        "title": "The cloths",
        "source": "Part Three (second half)",
        "words": 3900,
        "minutes": 15,
        "summary": "Infection, Esteban's nursing, Manuel's cursed ravings, death. Esteban wanders; Captain Alvarado recruits him for a voyage — then the bridge.",
        "hook": "Uncle Pio and the Perichole's training enter the pattern."
      },
      {
        "n": 6,
        "title": "Uncle Pio",
        "source": "Part Four: Uncle Pio (first half)",
        "words": 5000,
        "minutes": 15,
        "summary": "Uncle Pio's career: adventurer, teacher, architect of the Perichole's art and fame. Camila's rise, the Viceroy, the child Jaime, aging and estrangement.",
        "hook": "Pio wants the child for a better life — the road to Lima crosses one bridge."
      },
      {
        "n": 7,
        "title": "Jaime",
        "source": "Part Four (second half)",
        "words": 5000,
        "minutes": 15,
        "summary": "Pio takes little Jaime toward Lima and a new education. They step onto the Bridge of San Luis Rey.",
        "hook": "Brother Juniper's book — and the Abbess — still have to answer what the fall meant."
      },
      {
        "n": 8,
        "title": "Perhaps an intention",
        "source": "Part Five: Perhaps an Intention",
        "words": 3840,
        "minutes": 19,
        "summary": "Juniper's huge book burned; a secret copy survives. The Abbess's grief and work; the living who remain. Closing meditation: love as the only bridge. Keep whole.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "passing",
    "title": "Passing",
    "author": "Nella Larsen",
    "year": 1929,
    "shortLabel": "Passing",
    "nights": 6,
    "totalMinutes": 76,
    "framing": "Two women, one secret, and a New York season that cannot hold them both — Larsen's Harlem Renaissance knife-twist.",
    "geography": "Chicago → Harlem / New York",
    "cadence": "Nightly or every other night; 12–14 min easy",
    "openAt": "Begin Part One, Chapter 1 (the letter). Skip any modern introduction in your bound file.",
    "why": "Passing is short, hot, and structurally perfect for serialization: letter, reunion, infiltration, disaster. Race, gender, marriage, and surveillance read as contemporary without modernization. Irene's controlled voice is premium audio — every polite sentence hides a knife. The unresolved ending is a feature for Vellum: listeners argue. Six nights fits a novella sprint product.",
    "shipNotes": "BOUND LOCAL / Launch shelf — NOT on Project Gutenberg (confirmed: no Larsen records). Check rights board for US PD (pub. 1929; author d. 1964). SHIP BLOCKER CANDIDATE: not on PG. Use bound local text only after board clears PD/rights. Do not invent chapter titles — parts are Encounter / Re-encounter / Finale with numbered chapters 1–4 each (Knopf 1929 convention). Word counts estimated (~27k total).",
    "shelfWorkId": "passing",
    "episodes": [
      {
        "n": 1,
        "title": "The letter",
        "source": "Part One: Encounter — Ch. 1–2",
        "words": 4500,
        "minutes": 12,
        "summary": "Irene Redfield receives a fraught letter from Clare Kendry. Chicago heat; memory of Clare's beauty and danger; childhood acquaintance. Irene's careful respectability vs. Clare's appetite.",
        "hook": "Will Irene answer — and reopen what she buried?"
      },
      {
        "n": 2,
        "title": "Tea with danger",
        "source": "Part One: Encounter — Ch. 3–4",
        "words": 4500,
        "minutes": 12,
        "summary": "Reunion: Clare is passing as white, married to John Bellew, who does not know she is Black. Tea-table terror; Bellew's racist joke; Irene's moral vertigo. Clare wants back into Irene's world.",
        "hook": "Years later in New York, Clare will not stay away."
      },
      {
        "n": 3,
        "title": "Re-encounter",
        "source": "Part Two: Re-encounter — Ch. 1–2",
        "words": 5000,
        "minutes": 14,
        "summary": "Harlem/New York: Clare inserts herself into Irene's marriage and social circle. Brian Redfield's restlessness; Irene's surveillance of her own household. Parties, glances, the charge of Clare's presence.",
        "hook": "Irene begins to suspect the wrong intimacy — or the right fear."
      },
      {
        "n": 4,
        "title": "The husband problem",
        "source": "Part Two: Re-encounter — Ch. 3–4",
        "words": 5000,
        "minutes": 14,
        "summary": "Irene's jealousy hardens; Brian and Clare; the politics of safety vs. desire. Clare's hunger to be among Black society while keeping white privilege. Irene's respectability starts to crack.",
        "hook": "Finale: a party, a window, and no clean moral."
      },
      {
        "n": 5,
        "title": "Christmas eve pressure",
        "source": "Part Three: Finale — Ch. 1–2",
        "words": 4000,
        "minutes": 12,
        "summary": "Holiday season; Bellew's discovery looms; Irene's calculations become ruthless. The novel's famous ambiguity tightens — who wants what destroyed?",
        "hook": "One more gathering. Someone will fall."
      },
      {
        "n": 6,
        "title": "The window",
        "source": "Part Three: Finale — Ch. 3–4",
        "words": 4000,
        "minutes": 12,
        "summary": "Climax and aftermath: confrontation, the open window, Clare's death, Irene's shock and opacity. Larsen refuses to solve the crime for you — perfect serial closer for discussion.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "lolly-willowes",
    "title": "Lolly Willowes",
    "author": "Sylvia Townsend Warner",
    "year": 1926,
    "shortLabel": "Lolly Willowes",
    "nights": 12,
    "totalMinutes": 168,
    "framing": "A respectable English aunt walks out of London — and into a pact that finally lets her alone.",
    "geography": "Somerset (Lady Place) → London (Apsley Terrace) → Great Mop (Chilterns)",
    "cadence": "Nightly ~14 min; 12 episodes across 3 Parts",
    "openAt": "Begin Part I opening sentence; skip publisher imprint. No chapter titles in this edition — episodes are production beats within Parts I / 2 / 3 only.",
    "why": "Aunt-spinster liberation narrative with a witchcraft turn lands perfectly for contemporary feminist and queer-adjacent shelves. Warner's sentences are audio gold — dry, exact, funny. The three-part move (family absorption, escape, supernatural contract) is a ready-made act structure. Listeners burned out on marriage-plot fiction get a heroine who opts out and means it. Great Mop becomes a destination brand inside the app.",
    "shipNotes": "Project Gutenberg #72223 Edition uses Part I, Part 2, Part 3 (arabic 2–3 in PG text). Do not invent chapter names. PD via PG 72223.",
    "shelfWorkId": "lolly-willowes",
    "episodes": [
      {
        "n": 1,
        "title": "Of course you will come to us",
        "source": "Part I — opening (Lady Place to Apsley Terrace)",
        "words": 4300,
        "minutes": 14,
        "summary": "Everard's death; Caroline and Henry absorb Laura (Lolly) into London. Family furniture, duty, the end of greenhouse freedom. Laura as family property forgotten in the will.",
        "hook": "London winters will teach her what she has lost."
      },
      {
        "n": 2,
        "title": "Aunt Lolly",
        "source": "Part I — middle London years",
        "words": 4300,
        "minutes": 14,
        "summary": "Embroidery, library Tuesdays, dancing class, being useful. Failed marriage plots (including the were-wolf remark to Mr. Arbuthnot). Fancy and Marion; war edges in. Laura becomes Aunt Lolly — name as erasure.",
        "hook": "Armistice will not return her to herself."
      },
      {
        "n": 3,
        "title": "War and the spare room",
        "source": "Part I — war to close of Part I",
        "words": 4300,
        "minutes": 14,
        "summary": "Parcels, Fancy's marriages, influenza faint at the Armistice noise. Postwar better days that look exactly like old days. Laura's submerged life under Caroline's order.",
        "hook": "Part 2: autumn fever — and a shop in Moscow Road."
      },
      {
        "n": 4,
        "title": "Autumnal fever",
        "source": "Part 2 — opening",
        "words": 4100,
        "minutes": 14,
        "summary": "Each autumn Laura's restlessness returns: moon, dead leaves, daydreams of fens and woods. Secret expeditions to City churches and the East End. The fur-coat of small luxuries.",
        "hook": "One chrysanthemum purchase will not stay small."
      },
      {
        "n": 5,
        "title": "The Moscow Road shop",
        "source": "Part 2 — the florist",
        "words": 4100,
        "minutes": 14,
        "summary": "Laura's visionary orchard in the greengrocer's; extravagant flowers; Henry and Caroline's worried kindness about money. The first crack in guardianship.",
        "hook": "She will want a place of her own — and a map."
      },
      {
        "n": 6,
        "title": "Great Mop",
        "source": "Part 2 — decision and departure",
        "words": 4100,
        "minutes": 14,
        "summary": "Laura chooses the Chiltern village of Great Mop, takes rooms, leaves Apsley Terrace. Family consternation. First taste of chosen solitude.",
        "hook": "Great Mop has a secret social life after dark."
      },
      {
        "n": 7,
        "title": "Village and disturbance",
        "source": "Part 2 — closing / Titus threat",
        "words": 4100,
        "minutes": 14,
        "summary": "Settling in; local rhythms; then the threat that Titus (beloved nephew) might follow and recolonize her freedom. Laura's peace is fragile.",
        "hook": "Part 3: the Loving Huntsman — and a choice with teeth."
      },
      {
        "n": 8,
        "title": "The Sabbath",
        "source": "Part 3 — opening",
        "words": 4000,
        "minutes": 14,
        "summary": "Laura's deepening bond with the place; hints of witchcraft as metaphor and plot. A rural coven's gravity. Freedom starts to look like a pact.",
        "hook": "Someone is hunting her — lovingly."
      },
      {
        "n": 9,
        "title": "Village company",
        "source": "Part 3 — middle",
        "words": 4000,
        "minutes": 14,
        "summary": "Village relationships, comic and eerie; Laura's education in a different kind of power. Warner's wit stays dry while the supernatural warms up.",
        "hook": "The adversary is a better listener than Henry."
      },
      {
        "n": 10,
        "title": "Terms",
        "source": "Part 3 — pact",
        "words": 4000,
        "minutes": 14,
        "summary": "Laura's negotiation with the folkloric force that guarantees her independence. Not gothic panic — contractual feminism in gloves.",
        "hook": "Will she keep Great Mop when family pulls again?"
      },
      {
        "n": 11,
        "title": "Family counter-offer",
        "source": "Part 3 — pressure",
        "words": 4000,
        "minutes": 14,
        "summary": "Henry/Caroline/Titus vectors of reclaiming Aunt Lolly. Laura measures love against liberty. The novel's thesis clarifies.",
        "hook": "One last walk — and a refusal."
      },
      {
        "n": 12,
        "title": "The loving huntsman",
        "source": "Part 3 — close",
        "words": 4250,
        "minutes": 14,
        "summary": "Resolution: Laura keeps her chosen life. The title's hunter is both threat and ally. End on earned quiet, not sermon.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "plum-bun",
    "title": "Plum Bun",
    "author": "Jessie Redmon Fauset",
    "year": 1928,
    "shortLabel": "Plum Bun",
    "nights": 12,
    "totalMinutes": 150,
    "framing": "To market, to market — a Philadelphia artist buys a white life in New York, and learns the price of a plum bun.",
    "geography": "Philadelphia → New York",
    "cadence": "Nightly ~12–14 min",
    "openAt": "Skip title/imprint/dedication if desired; begin Part 1 Home, Chapter I. Keep epigraph (To market, to market…) as optional pre-roll — it teaches the structure.",
    "why": "Passing-as-plot with an artist's coming-of-age — mashup of Larsen's theme and a broader social novel. The nursery-rhyme part titles (Home / Market / Plum Bun / Home Again / Market Is Done) are ready-made season titles in the app. Contemporary listeners get colorism, class, and the feel of selling yourself to institutions. Angela is flawed and watchable; Virginia prevents a single-voice tract. Twelve nights is a standard Vellum novel length.",
    "shipNotes": "BOUND LOCAL — Standard Ebooks / Wikisource (not on PG as Plum Bun; PG has Fauset's There Is Confusion #78915 only). Board must clear rights. SHIP BLOCKER CANDIDATE: not on Project Gutenberg under this title. Prefer Standard Ebooks text for chapter roman numerals matching this map (Home I–VI; Market I–VII; Plum Bun I–V; Home Again I–VI; Market Is Done I–III). Confirm PD (1928). Do not invent chapter names.",
    "shelfWorkId": "plum-bun",
    "episodes": [
      {
        "n": 1,
        "title": "Philadelphia home",
        "source": "Part 1 Home — Ch. I–II",
        "words": 4200,
        "minutes": 12,
        "summary": "Angela and Virginia Murray in Philadelphia; color, class, and the family's careful world. Angela's beauty and restlessness; the rules of respectability.",
        "hook": "Angela is already looking toward a larger market."
      },
      {
        "n": 2,
        "title": "Lessons in color",
        "source": "Part 1 Home — Ch. III–IV",
        "words": 4200,
        "minutes": 12,
        "summary": "Social education: who can go where; Angela's emerging decision to use light skin as passport. Virginia's different courage.",
        "hook": "Home will not hold both sisters the same way."
      },
      {
        "n": 3,
        "title": "Leaving home",
        "source": "Part 1 Home — Ch. V–VI",
        "words": 4200,
        "minutes": 12,
        "summary": "Change in the household; Angela's resolve to seek art and freedom in New York — by passing. Break with the old contract of daughterhood.",
        "hook": "Market opens: New York under a new name."
      },
      {
        "n": 4,
        "title": "Angela in New York",
        "source": "Part 2 Market — Ch. I–II",
        "words": 4000,
        "minutes": 12,
        "summary": "Angela remakes herself among white art students and patrons. Freedom tastes like danger and champagne.",
        "hook": "Someone will ask questions her new self cannot answer."
      },
      {
        "n": 5,
        "title": "Studios and suitors",
        "source": "Part 2 Market — Ch. III–IV",
        "words": 4000,
        "minutes": 12,
        "summary": "Art-school politics; romance vectors; the price of being believed white. Angela's talent vs. Angela's performance.",
        "hook": "The plum bun within reach."
      },
      {
        "n": 6,
        "title": "The bargain",
        "source": "Part 2 Market — Ch. V–VII",
        "words": 4800,
        "minutes": 14,
        "summary": "Deepening entanglement with a wealthy white world; moral costs; letters from Virginia. Angela's isolation inside success.",
        "hook": "Part 3: what does she actually buy?"
      },
      {
        "n": 7,
        "title": "Plum bun",
        "source": "Part 3 Plum Bun — Ch. I–II",
        "words": 3800,
        "minutes": 12,
        "summary": "The affair's peak and the hollowness inside it. Angela confronts what having it all required her to discard.",
        "hook": "Exposure risk rises — and so does longing for Virginia."
      },
      {
        "n": 8,
        "title": "Cracks",
        "source": "Part 3 Plum Bun — Ch. III–V",
        "words": 4200,
        "minutes": 14,
        "summary": "Social near-misses; racist machinery of the world she entered; Angela's conscience catching up with her strategy.",
        "hook": "Home Again — but home has changed."
      },
      {
        "n": 9,
        "title": "Virginia's New York",
        "source": "Part 4 Home Again — Ch. I–II",
        "words": 4000,
        "minutes": 12,
        "summary": "Virginia's path in New York without passing; work, community, a different map of dignity. Sisterly mirror held up to Angela.",
        "hook": "Can Angela cross back without collapsing?"
      },
      {
        "n": 10,
        "title": "Two strategies",
        "source": "Part 4 Home Again — Ch. III–IV",
        "words": 4000,
        "minutes": 12,
        "summary": "Parallel plots: Angela's white world frays; Virginia builds. Men, mentorship, and ethical contrast.",
        "hook": "A choice is coming that is not just romantic."
      },
      {
        "n": 11,
        "title": "Reckoning",
        "source": "Part 4 Home Again — Ch. V–VI",
        "words": 4000,
        "minutes": 12,
        "summary": "Confrontations and revelations; Angela's public/private identities collide. Fauset refuses cheap conversion — she wants earned clarity.",
        "hook": "Market Is Done: pay the cost, keep the self."
      },
      {
        "n": 12,
        "title": "Market is done",
        "source": "Part 5 Market Is Done — Ch. I–III",
        "words": 4500,
        "minutes": 14,
        "summary": "Resolution: Angela's reorientation toward honesty, work, and sisterhood; the nursery-rhyme frame completes. End on future-facing independence.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "a-passage-to-india",
    "title": "A Passage to India",
    "author": "E. M. Forster",
    "year": 1924,
    "shortLabel": "Passage to India",
    "nights": 14,
    "totalMinutes": 216,
    "framing": "A picnic, an echo, a trial — Forster's India, where friendship wants to be born and the land says not yet.",
    "geography": "Chandrapore (Ganges plain) → Marabar Hills → Mau",
    "cadence": "Nightly 14–16 min; trial/caves nights may hit ~16–18",
    "openAt": "Begin Chapter I; skip by-the-same-writer lists. Optional: keep dedication to Syed Ross Masood as pre-roll.",
    "why": "Still the novel people argue about when they argue about empire, friendship, and whether liberalism is enough. Three titled parts give the serial a trilogy feel inside one purchase. The Marabar echo is a built-in mid-season event horizon. Courtroom episode is pure appointment listening. The ending's not yet keeps the story ethically unfinished — perfect for audiences suspicious of neat reconciliation.",
    "shipNotes": "Project Gutenberg #61221 PG 61221. Period anti-Indian racism is depicted — frame in shelf copy as critique, not endorsement. Some chapters are very short (X, XXI, XXXII); this map bundles them rather than inventing titles. 37 chapters across Parts I Mosque, II Caves, III Temple.",
    "shelfWorkId": "a-passage-to-india",
    "episodes": [
      {
        "n": 1,
        "title": "Chandrapore sky",
        "source": "Part I Mosque — Ch. I–II",
        "words": 5300,
        "minutes": 15,
        "summary": "Chandrapore described; Aziz with friends debating whether Indians can be friends with Englishmen. Callendar's summons; snub; mosque encounter with Mrs. Moore — God is here.",
        "hook": "Adela wants to see the real India."
      },
      {
        "n": 2,
        "title": "Bridge Party",
        "source": "Part I — Ch. III–V",
        "words": 5500,
        "minutes": 16,
        "summary": "Club world; Ronny; Collector's Bridge Party fails at bridging. Fielding appears as possible ally. Mrs. Moore's wasp; religious strain.",
        "hook": "Aziz will finally tea with Fielding."
      },
      {
        "n": 3,
        "title": "Fielding's tea",
        "source": "Part I — Ch. VI–VII",
        "words": 5500,
        "minutes": 16,
        "summary": "Aziz skips the Bridge Party on his wife's death anniversary; polo with a subaltern; then Fielding's invitation. Tea brings Aziz, Mrs. Moore, Adela, Godbole — and Ronny's interruption.",
        "hook": "The Marabar invitation is planted."
      },
      {
        "n": 4,
        "title": "Engaged and unengaged",
        "source": "Part I — Ch. VIII–XI",
        "words": 5500,
        "minutes": 16,
        "summary": "Adela and Ronny's on-off engagement; mishaps; Aziz's illness; Fielding's visit; the question of friendship across empire. Part I closes on fragile goodwill.",
        "hook": "Part II: the caves."
      },
      {
        "n": 5,
        "title": "Toward Marabar",
        "source": "Part II Caves — Ch. XII–XIV",
        "words": 5500,
        "minutes": 16,
        "summary": "Geology of the caves; expedition organizing; train dawn; the picnic's social awkwardness. Mrs. Moore's first cave — the echo that undoes her.",
        "hook": "Adela enters a cave with Aziz nearby — something happens, or seems to."
      },
      {
        "n": 6,
        "title": "The echo",
        "source": "Part II — Ch. XV–XVII",
        "words": 5000,
        "minutes": 15,
        "summary": "Adela's accusation; Aziz arrested; Fielding's loyalty choice; Chandrapore's racial panic machine starts. Mrs. Moore knows the echo's truth and refuses the plot.",
        "hook": "The Raj will have its trial."
      },
      {
        "n": 7,
        "title": "Sides form",
        "source": "Part II — Ch. XVIII–XXI",
        "words": 5500,
        "minutes": 16,
        "summary": "Officialdom closes ranks; Fielding ostracized; Adela's mental state; the club's hunger for revenge. Godbole's indifference that is not indifference.",
        "hook": "Mrs. Moore is shipped toward the sea."
      },
      {
        "n": 8,
        "title": "Esmiss Esmoor",
        "source": "Part II — Ch. XXII–XXIII",
        "words": 5500,
        "minutes": 14,
        "summary": "Adela's ordeal; Mrs. Moore's departure and death at sea; Indian crowds turning Mrs. Moore into a chant. The trial approaches like weather.",
        "hook": "Courtroom day."
      },
      {
        "n": 9,
        "title": "The trial",
        "source": "Part II — Ch. XXIV–XXV",
        "words": 5500,
        "minutes": 16,
        "summary": "Courtroom climax: Adela withdraws the charge. Chaos; Aziz freed; British humiliation; Adela's collapse into a different loneliness.",
        "hook": "Aftermath friendships will not be simple."
      },
      {
        "n": 10,
        "title": "After verdict",
        "source": "Part II — Ch. XXVI–XXIX",
        "words": 5500,
        "minutes": 16,
        "summary": "Fielding houses Adela; Aziz's bitterness; lawsuits and money; Fielding's practical ethics. The friendship ideal takes damage.",
        "hook": "Rainy season politics — and a marriage rumor."
      },
      {
        "n": 11,
        "title": "Rumours",
        "source": "Part II — Ch. XXX–XXXII",
        "words": 4500,
        "minutes": 14,
        "summary": "Aziz hears Fielding married Adela (false); disillusion; Fielding leaves for England. Part II ends with empire's gossip beating truth.",
        "hook": "Part III: Temple — two years later."
      },
      {
        "n": 12,
        "title": "Mau",
        "source": "Part III Temple — Ch. XXXIII–XXXIV",
        "words": 4200,
        "minutes": 14,
        "summary": "Hindu festival at Mau; Godbole's devotion; Aziz relocated; the comic-sacred atmosphere Forster needs to reframe the tragedy.",
        "hook": "Procession, boats, and old faces returning."
      },
      {
        "n": 13,
        "title": "Procession",
        "source": "Part III — Ch. XXXV–XXXVI",
        "words": 5500,
        "minutes": 16,
        "summary": "Fielding returns with Stella (Mrs. Moore's daughter) and Ralph; misunderstandings; boat collision in the festival; release of bitterness in slapstick sacredness.",
        "hook": "Last ride: can they be friends?"
      },
      {
        "n": 14,
        "title": "Not yet",
        "source": "Part III — Ch. XXXVII",
        "words": 3110,
        "minutes": 16,
        "summary": "Final ride of Aziz and Fielding; affection and political clear-sightedness. No, not yet / No, not there. End serial on the land's answer.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "death-comes-for-the-archbishop",
    "title": "Death Comes for the Archbishop",
    "author": "Willa Cather",
    "year": 1927,
    "shortLabel": "Death Comes for the Archbishop",
    "nights": 16,
    "totalMinutes": 232,
    "framing": "A French priest rides into New Mexico to build a diocese — and learns the desert's own religion of light.",
    "geography": "New Mexico / Southwest (Santa Fe, Acoma, Taos, Navajo country)",
    "cadence": "Nightly or 4×/week; ~12–16 min; finale may run ~18",
    "openAt": "Begin Prologue (Rome). Then Book One section The Cruciform Tree.",
    "why": "Already written as a season of vignettes — Cather's named sections are episode titles waiting to happen. Anti-spectacular Western: patience, friendship, land, and institutional building. Contemporary interest in borderlands and Indigenous presence gives shelf heat without rewriting Cather. Latour/Vaillant is one of American fiction's great male friendships. Death arrives as weather, not twist — a premium closer.",
    "shipNotes": "Project Gutenberg #69730 PG 69730. Use Cather's own section titles only (listed in episode spans). Book Nine has no internal named subsections in this edition — ship as one finale episode.",
    "shelfWorkId": "death-comes-for-the-archbishop",
    "episodes": [
      {
        "n": 1,
        "title": "Prologue and cruciform tree",
        "source": "Prologue + Book One: The Cruciform Tree",
        "words": 2800,
        "minutes": 12,
        "summary": "Rome: cardinals debate a new vicarate in New Mexico. Then Latour lost in the desert finds the cruciform tree and survives into his mission.",
        "hook": "Hidden water — and a diocese that does not know him yet."
      },
      {
        "n": 2,
        "title": "Hidden water",
        "source": "Book One: Hidden Water",
        "words": 4560,
        "minutes": 15,
        "summary": "Latour and Vaillant; Rio Grande world; learning the land's scale. Missionary logistics as spiritual plot.",
        "hook": "A bell and a miracle will baptize Santa Fe into story."
      },
      {
        "n": 3,
        "title": "Bell and miracle",
        "source": "Book One: A Bell and a Miracle",
        "words": 2100,
        "minutes": 11,
        "summary": "Santa Fe claims, credentials doubted, the miracle narrative that helps found authority. End Book One.",
        "hook": "White mules on the road to a wedding."
      },
      {
        "n": 4,
        "title": "White mules",
        "source": "Book Two: The White Mules",
        "words": 2780,
        "minutes": 14,
        "summary": "Comic-holy acquisition of Contento and Angelica; Vaillant's charm as church strategy.",
        "hook": "The lonely road to Mora — violence under the mission."
      },
      {
        "n": 5,
        "title": "Road to Mora",
        "source": "Book Two: The Lonely Road to Mora",
        "words": 3640,
        "minutes": 15,
        "summary": "Latour's dangerous hospitality episode; evil at the remote house; escape. The West is not only light.",
        "hook": "Book Three: into Indian country and legend."
      },
      {
        "n": 6,
        "title": "Wooden parrot / Jacinto",
        "source": "Book Three: The Wooden Parrot + Jacinto",
        "words": 3330,
        "minutes": 14,
        "summary": "Acoma and the wooden parrot; Jacinto as guide and other knowledge. Friendship across cosmologies.",
        "hook": "The Rock — and a cave that is not Christian."
      },
      {
        "n": 7,
        "title": "The Rock",
        "source": "Book Three: The Rock + The Legend of Fray Baltazar",
        "words": 5260,
        "minutes": 16,
        "summary": "Acoma mesa; Baltazar's tyrannical legend. Colonial priest as warning inside Latour's vocation.",
        "hook": "Pecos night — something older than doctrine."
      },
      {
        "n": 8,
        "title": "Pecos / Stone Lips",
        "source": "Book Four: The Night at Pecos + Stone Lips",
        "words": 4980,
        "minutes": 15,
        "summary": "Cave ritual glimpsed; Latour's respect and limit; Stone Lips landscape. Mystery without conversion porn.",
        "hook": "Book Five: Padre Martinez and the old order."
      },
      {
        "n": 9,
        "title": "Old order",
        "source": "Book Five: The Old Order",
        "words": 5070,
        "minutes": 16,
        "summary": "Padre Martinez, Taos power, schism risk, Latour's governance. Church politics as Western epic.",
        "hook": "The miser — another kind of desert."
      },
      {
        "n": 10,
        "title": "The miser",
        "source": "Book Five: The Miser",
        "words": 3500,
        "minutes": 15,
        "summary": "Trinidad / miserly priest episode; comedy and censure. Latour's patience as tactic.",
        "hook": "Dona Isabella and the worldly church."
      },
      {
        "n": 11,
        "title": "Don Antonio / The Lady",
        "source": "Book Six: Don Antonio + The Lady",
        "words": 5330,
        "minutes": 15,
        "summary": "Olivares couple in Santa Fe; vanity, will, and Vaillant's fundraising genius. Europe still pulls the purse strings.",
        "hook": "Month of Mary — Vaillant's heart."
      },
      {
        "n": 12,
        "title": "Month of Mary / December night",
        "source": "Book Seven: The Month of Mary + December Night",
        "words": 5390,
        "minutes": 15,
        "summary": "Vaillant's devotion and loneliness; Sada's December night story — faith among the poor. Latour listens.",
        "hook": "Navajo country in spring."
      },
      {
        "n": 13,
        "title": "Navajo spring / Eusabio",
        "source": "Book Seven: Spring in the Navajo Country + Eusabio",
        "words": 4080,
        "minutes": 14,
        "summary": "Latour among the Navajo; Eusabio; landscape theology. End of the active missionary circuit.",
        "hook": "Cathedral dreams — and a letter from Leavenworth."
      },
      {
        "n": 14,
        "title": "Cathedral",
        "source": "Book Eight: Cathedral + A Letter from Leavenworth",
        "words": 2960,
        "minutes": 12,
        "summary": "Building the French cathedral in Santa Fe stone; Vaillant called toward Colorado missions. Friendship facing separation.",
        "hook": "Auspice Maria — goodbye to the co-laborer."
      },
      {
        "n": 15,
        "title": "Auspice Maria",
        "source": "Book Eight: Auspice Maria!",
        "words": 2950,
        "minutes": 15,
        "summary": "Vaillant's departure for the gold camps; Latour alone with architecture and memory.",
        "hook": "Book Nine: death comes — but slowly, in light."
      },
      {
        "n": 16,
        "title": "Death comes",
        "source": "Book Nine (complete)",
        "words": 4500,
        "minutes": 18,
        "summary": "Latour aging; returns of memory; Navajo suffering under campaigns; final days; death in the air of New Mexico. Keep Book Nine whole as finale even if ~18 min.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "the-great-gatsby",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "year": 1925,
    "shortLabel": "Great Gatsby",
    "nights": 12,
    "totalMinutes": 177,
    "framing": "A nobody next door watches a man invent himself for a green light — Fitzgerald's American fever dream, night by night.",
    "geography": "West Egg / East Egg / NYC / valley of ashes (Long Island Sound)",
    "cadence": "Nightly ~14–15 min; Ch. VII split across two nights",
    "openAt": "Skip TOC and Zelda dedication if desired; begin Chapter I. Keep the Thomas Parke d'Invilliers epigraph as optional pre-roll.",
    "why": "Everyone thinks they know it — serialization makes them hear the sentences again. Nine chapters become twelve nights by splitting the long set-pieces (party, Plaza, ending). Class, hustle, and invented identity are contemporary catnip. The green light is already merch; the funeral emptiness is the gut-punch closer. Low education barrier, high prestige — core Vellum acquisition title.",
    "shipNotes": "Project Gutenberg #64317 (plain text confirmed). If board previously had PDF-only, prefer PG text for production. Earlier board note said PDF-only — outdated if PG 64317 is cleared for your territories. Still verify US storefront rights on board. Chapters are untitled beyond roman numerals — do not invent literary chapter names in product UI; use episode titles only.",
    "shelfWorkId": "gatsby",
    "episodes": [
      {
        "n": 1,
        "title": "Old sport's neighbor",
        "source": "Chapter I (first half)",
        "words": 2950,
        "minutes": 15,
        "summary": "Nick's advice-from-father frame; West Egg vs East Egg; dinner at the Buchanans'; Tom's racism; Jordan Baker; the green light across the water.",
        "hook": "Who is the man reaching for the light?"
      },
      {
        "n": 2,
        "title": "The green light",
        "source": "Chapter I (second half)",
        "words": 2950,
        "minutes": 14,
        "summary": "Finish Ch. I: Gatsby's gesture toward the green light; Nick's fascination sealed.",
        "hook": "Tom takes Nick to town — and to Myrtle."
      },
      {
        "n": 3,
        "title": "Valley of ashes",
        "source": "Chapter II",
        "words": 4280,
        "minutes": 15,
        "summary": "Wilson's garage; Myrtle Wilson; the New York apartment party; Tom's violence; the eyes of T. J. Eckleburg.",
        "hook": "Next: a Gatsby party — invitation by messenger."
      },
      {
        "n": 4,
        "title": "Party",
        "source": "Chapter III (first half)",
        "words": 2870,
        "minutes": 14,
        "summary": "Gatsby's mansion revel; rumors; owl-eye in the library; Nick meets Jordan; orchestras and champagne.",
        "hook": "Nick will finally meet the host."
      },
      {
        "n": 5,
        "title": "I thought you knew, old sport",
        "source": "Chapter III (second half)",
        "words": 2870,
        "minutes": 14,
        "summary": "Gatsby's smile; war recognition; Jordan's secret commission begins.",
        "hook": "Lunch in the city with a surprising gambler."
      },
      {
        "n": 6,
        "title": "Wolfsheim",
        "source": "Chapter IV (first half)",
        "words": 2730,
        "minutes": 14,
        "summary": "Roll call of guests; Gatsby's hydroplane / Oxford story; Meyer Wolfsheim and the 1919 World Series hint.",
        "hook": "Jordan will tell Nick the Dan Cody / Daisy history."
      },
      {
        "n": 7,
        "title": "Daisy's past",
        "source": "Chapter IV (second half) + Ch. V setup",
        "words": 4000,
        "minutes": 15,
        "summary": "Jordan's story of Daisy and Gatsby's war-interrupted love; the reunion tea is planned at Nick's.",
        "hook": "Rain, flowers, and the clock on the mantel."
      },
      {
        "n": 8,
        "title": "Reunion",
        "source": "Chapter V",
        "words": 4230,
        "minutes": 15,
        "summary": "Awkward tea; sunshine break; mansion tour; Gatsby's shirts; the green light's meaning changes. Hope peaks.",
        "hook": "How did Gatsby invent himself?"
      },
      {
        "n": 9,
        "title": "Dan Cody",
        "source": "Chapter VI",
        "words": 4040,
        "minutes": 15,
        "summary": "Gatsby's origin (Gatz); Dan Cody; Tom and Daisy attend a party; Tom's scorn; Gatsby wants Daisy to erase the years.",
        "hook": "The hottest day of the summer — Plaza and the crash."
      },
      {
        "n": 10,
        "title": "Plaza",
        "source": "Chapter VII (first half)",
        "words": 4380,
        "minutes": 15,
        "summary": "Hot day; Myrtle at the window; drive to town; Plaza Hotel confrontation: Tom vs Gatsby over Daisy's voice and past.",
        "hook": "Someone is driving home who should not be."
      },
      {
        "n": 11,
        "title": "Death in the ashes",
        "source": "Chapter VII (second half)",
        "words": 4380,
        "minutes": 15,
        "summary": "Return drive; Myrtle killed by the yellow car; Nick, Gatsby watching Daisy's house; Tom and Daisy conspire over cold chicken.",
        "hook": "Gatsby still waits for a call that will not come."
      },
      {
        "n": 12,
        "title": "Funeral and boats",
        "source": "Chapter VIII–IX",
        "words": 4880,
        "minutes": 16,
        "summary": "Gatsby's last morning; Wilson's arc; murder/suicide; Nick's arrangements; funeral emptiness; boats against the current. Keep as finale diptych or split at funeral if needed.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "dracula",
    "title": "Dracula",
    "author": "Bram Stoker",
    "year": 1897,
    "shortLabel": "Dracula",
    "nights": 16,
    "totalMinutes": 244,
    "framing": "Journals, letters, and a ship's log — the documentary horror that invented the modern vampire, one night at a time.",
    "geography": "Transylvania → Whitby → London → back to Transylvania",
    "cadence": "Nightly ~14–16 min; finale ~18",
    "openAt": "Skip Contents; begin Chapter I journal. Optional: keep Stoker's note on how these papers were placed if present in your file.",
    "why": "Epistolary form is serialization's best friend: dates and document types create clean stops. Horror audiences are huge and underserved by serious PD shelves. Mina's arc reads as modern competence under patriarchal sidelining. The mid-book Lucy tragedy is a built-in midseason finale. Everyone knows the Count; almost nobody has heard the whole document chain.",
    "shipNotes": "Project Gutenberg #345 PG 345. Chapters run 25–40 min unbroken — this plan splits at journal date / document boundaries, not invented titles. Prefer cutting on dated entries (e.g. 5 May) inside long chapters when audio timing needs +/-2 minutes.",
    "shelfWorkId": "dracula",
    "episodes": [
      {
        "n": 1,
        "title": "Orient Express to Borgo",
        "source": "Ch. I Jonathan Harker's Journal",
        "words": 2850,
        "minutes": 14,
        "summary": "Harker's journal through Budapest to Bistritz; peasant warnings; the caleche to the Borgo Pass.",
        "hook": "The castle doors close behind him."
      },
      {
        "n": 2,
        "title": "Prisoner of the Count",
        "source": "Ch. II Jonathan Harker's Journal",
        "words": 2740,
        "minutes": 14,
        "summary": "Hospitality that is captivity; the Count's nighttime schedule; no mirrors; Harker's growing panic.",
        "hook": "Blue flames in the forest — and worse inside."
      },
      {
        "n": 3,
        "title": "The brides",
        "source": "Ch. III Jonathan Harker's Journal",
        "words": 2860,
        "minutes": 14,
        "summary": "Harker explores; the three vampire women; Dracula's claim that this man belongs to him.",
        "hook": "A child in a bag — and a chance to climb."
      },
      {
        "n": 4,
        "title": "Escape",
        "source": "Ch. IV Jonathan Harker's Journal",
        "words": 2950,
        "minutes": 15,
        "summary": "Harker's last days in the castle; the boxes of earth; his desperate exit.",
        "hook": "Meanwhile in England: Lucy is choosing among suitors."
      },
      {
        "n": 5,
        "title": "Three proposals",
        "source": "Ch. V Letters — Lucy and Mina",
        "words": 3550,
        "minutes": 15,
        "summary": "Mina/Lucy correspondence; Holmwood, Seward, Morris; soft comedy before horror returns.",
        "hook": "Whitby's sea air is not safety."
      },
      {
        "n": 6,
        "title": "Whitby weather",
        "source": "Ch. VI Mina Murray's Journal",
        "words": 2860,
        "minutes": 14,
        "summary": "Mina and Lucy in Whitby; Mr. Swales; sleepwalking foreshadow; the coming storm.",
        "hook": "A ship with a dead crew."
      },
      {
        "n": 7,
        "title": "Demeter",
        "source": "Ch. VII Cutting from The Dailygraph, 8 August",
        "words": 2840,
        "minutes": 14,
        "summary": "Newspaper cutting and log: the Demeter's doom; Dracula ashore as a dog.",
        "hook": "Lucy begins to fade."
      },
      {
        "n": 8,
        "title": "Garlic and transfusions",
        "source": "Ch. VIII–IX Mina Murray's Journal",
        "words": 6100,
        "minutes": 16,
        "summary": "Mina's care; Lucy's attacks; Seward baffled; Van Helsing arrives; first treatments.",
        "hook": "The mother removes the garlic — fatally."
      },
      {
        "n": 9,
        "title": "Lucy's death",
        "source": "Ch. X–XI Mina / Lucy diaries",
        "words": 5500,
        "minutes": 15,
        "summary": "Multiple transfusions; the wolf crash; Lucy and her mother die.",
        "hook": "The dead girl is seen walking."
      },
      {
        "n": 10,
        "title": "Un-dead",
        "source": "Ch. XII–XIII Dr. Seward's Diary",
        "words": 6900,
        "minutes": 16,
        "summary": "Funeral; Bloofer Lady; Van Helsing leads the men to knowledge and the tomb.",
        "hook": "They must free Lucy with a stake."
      },
      {
        "n": 11,
        "title": "The stake",
        "source": "Ch. XIV–XVI Mina / Seward",
        "words": 5600,
        "minutes": 15,
        "summary": "Mina joins intellectually; Lucy released; the banded hunt for Dracula begins.",
        "hook": "Boxes of earth across London."
      },
      {
        "n": 12,
        "title": "Crew of light",
        "source": "Ch. XVII–XVIII Dr. Seward's Diary",
        "words": 6200,
        "minutes": 16,
        "summary": "Asylum threads; planning; Mina included, then sidelined.",
        "hook": "Dracula answers the slight."
      },
      {
        "n": 13,
        "title": "Baptism of blood",
        "source": "Ch. XIX–XXI Harker / Seward",
        "words": 5900,
        "minutes": 16,
        "summary": "Attack on Mina; Renfield's end; the men's vow. Emotional peak of the serial.",
        "hook": "Track him by hypnosis — leave England."
      },
      {
        "n": 14,
        "title": "Pursuit",
        "source": "Ch. XXII–XXIV Harker / Seward / Van Helsing",
        "words": 5800,
        "minutes": 16,
        "summary": "Cleansing; sea chase setup; Mina's trance navigation; the Count flees east.",
        "hook": "River and road toward the castle."
      },
      {
        "n": 15,
        "title": "Closing in",
        "source": "Ch. XXV–XXVI Dr. Seward's Diary",
        "words": 6700,
        "minutes": 16,
        "summary": "Galatz logistics; splitting the party; final approach through snow.",
        "hook": "The last fight at sunset."
      },
      {
        "n": 16,
        "title": "Sunset kill",
        "source": "Ch. XXVII Mina Harker's Journal",
        "words": 4100,
        "minutes": 18,
        "summary": "Climax and coda: Dracula destroyed; survivors; note seven years later. Keep whole.",
        "hook": "— end —"
      }
    ]
  },
  {
    "id": "the-master-of-ballantrae",
    "title": "The Master of Ballantrae",
    "author": "Robert Louis Stevenson",
    "year": 1889,
    "shortLabel": "Master of Ballantrae",
    "nights": 16,
    "totalMinutes": 234,
    "framing": "Two brothers, one Rising, and a steward who knows which brother the devil preferred.",
    "geography": "Scotland (Durrisdeer) → Europe/India wanderings → New York → wilderness",
    "cadence": "Nightly ~14–16 min; Ch. VII is a short palate-cleanser",
    "openAt": "Begin Chapter I after Contents. Keep Stevenson's editorial frame if present.",
    "why": "Sibling war plus pirate romance plus unreliable domestic narrator — a genre smoothie that still feels fresh. Mackellar's steward voice is premium audio (judgment curling under every sentence). The 1745 setting gives historical heft without requiring prior knowledge. Long chapters split cleanly into summary vs scene nights. The wilderness ending is stranger than most listeners expect from Stevenson.",
    "shipNotes": "Project Gutenberg #864 PG 864. Use Stevenson's full chapter titles (they are already episodic). Ch. III–IV exceed 50 min unbroken — splits are production halves, not new names. Exact titles: see episode spans.",
    "shelfWorkId": "the-master-of-ballantrae",
    "episodes": [
      {
        "n": 1,
        "title": "Durrisdeer chooses sides",
        "source": "Ch. I SUMMARY OF EVENTS DURING THIS MASTER'S WANDERINGS",
        "words": 4200,
        "minutes": 15,
        "summary": "1745 Rising: the Master rides with the Jacobites; Mr. Henry stays loyal at home — a family hedge. News, rumor, and the house divided.",
        "hook": "Is the Master dead — or only beginning?"
      },
      {
        "n": 2,
        "title": "Letters and returns",
        "source": "Ch. II SUMMARY OF EVENTS (continued) — first half",
        "words": 4000,
        "minutes": 15,
        "summary": "Aftermath news; Alison; Mackellar's entry into the household as steward/narrator.",
        "hook": "The Master's shadow still collects debts."
      },
      {
        "n": 3,
        "title": "The living Master",
        "source": "Ch. II (second half)",
        "words": 3000,
        "minutes": 15,
        "summary": "The Master's survival confirmed in ways that poison Mr. Henry's marriage and standing.",
        "hook": "Burke will tell what wandering really cost."
      },
      {
        "n": 4,
        "title": "Pirate seas",
        "source": "Ch. III THE MASTER'S WANDERINGS (first half)",
        "words": 3900,
        "minutes": 15,
        "summary": "Chevalier Burke's narrative: the Master's adventures, charisma, and moral free-fall abroad.",
        "hook": "Treasure and betrayal on the same deck."
      },
      {
        "n": 5,
        "title": "The Master's arts",
        "source": "Ch. III (second half)",
        "words": 3900,
        "minutes": 15,
        "summary": "More wanderings; the Master as actor/soldier/rogue; return trajectory toward Scotland.",
        "hook": "Persecutions at home — Mr. Henry under siege."
      },
      {
        "n": 6,
        "title": "Persecutions",
        "source": "Ch. IV PERSECUTIONS ENDURED BY MR. HENRY (first half)",
        "words": 4200,
        "minutes": 15,
        "summary": "The Master home: charm offensive, gambling, turning the house against the younger brother.",
        "hook": "Night of 27 February is coming."
      },
      {
        "n": 7,
        "title": "The house divided",
        "source": "Ch. IV (second half)",
        "words": 4200,
        "minutes": 15,
        "summary": "Mackellar's documentary hatred; Alison torn; Mr. Henry's endurance cracking.",
        "hook": "The duel night."
      },
      {
        "n": 8,
        "title": "Night of 27 February",
        "source": "Ch. V ACCOUNT OF ALL THAT PASSED ON THE NIGHT OF FEBRUARY 27TH, 1757 (first half)",
        "words": 3730,
        "minutes": 15,
        "summary": "The quarrel peaks toward the legendary night.",
        "hook": "Blood on the ground — but whose story wins?"
      },
      {
        "n": 9,
        "title": "After the duel",
        "source": "Ch. V (second half)",
        "words": 3730,
        "minutes": 15,
        "summary": "The duel's outcome and cover story; the Master vanishes again; Mr. Henry's pyrrhic survival.",
        "hook": "Absence is not peace."
      },
      {
        "n": 10,
        "title": "Second absence",
        "source": "Ch. VI SUMMARY OF EVENTS DURING THE MASTER'S SECOND ABSENCE",
        "words": 3600,
        "minutes": 15,
        "summary": "Household aftermath; Mr. Henry's marriage; the Master's rumor-life abroad.",
        "hook": "Burke in India — a short, sharp interlude."
      },
      {
        "n": 11,
        "title": "Burke in India",
        "source": "Ch. VII ADVENTURE OF CHEVALIER BURKE IN INDIA",
        "words": 1410,
        "minutes": 7,
        "summary": "Compact episode: Burke's India adventure intersecting the Master's myth. Easy night.",
        "hook": "The enemy returns to the house."
      },
      {
        "n": 12,
        "title": "Enemy in the house",
        "source": "Ch. VIII THE ENEMY IN THE HOUSE (first half)",
        "words": 3890,
        "minutes": 15,
        "summary": "The Master's return as permanent civil war inside Durrisdeer.",
        "hook": "Mackellar will take a journey with the devil he knows."
      },
      {
        "n": 13,
        "title": "Mackellar's journey",
        "source": "Ch. VIII (cont.) + Ch. IX MR. MACKELLAR'S JOURNEY WITH THE MASTER",
        "words": 5400,
        "minutes": 16,
        "summary": "Close of house conflict; Mackellar accompanying the Master — narrative cat-and-mouse.",
        "hook": "New York waits."
      },
      {
        "n": 14,
        "title": "New York",
        "source": "Ch. X PASSAGES AT NEW YORK",
        "words": 3210,
        "minutes": 15,
        "summary": "Colonial New York intrigues; the brothers' orbit tightens toward wilderness.",
        "hook": "The forest journey — and the buried end."
      },
      {
        "n": 15,
        "title": "Wilderness",
        "source": "Ch. XI THE JOURNEY IN THE WILDERNESS (first half)",
        "words": 4330,
        "minutes": 15,
        "summary": "Wilderness ordeal: pursuit, alliance with Indigenous guides, the Master's last schemes.",
        "hook": "The ground will not keep its dead."
      },
      {
        "n": 16,
        "title": "The mountain's secret",
        "source": "Ch. XI (cont.) + Ch. XII THE JOURNEY IN THE WILDERNESS (continued)",
        "words": 5500,
        "minutes": 16,
        "summary": "Climax: death, burial, and the ghastly sequel Stevenson built. End on Mackellar's final accounting.",
        "hook": "— end —"
      }
    ]
  }
];

const byId = new Map(SERIALIZE_PLANS.map((plan) => [plan.id, plan]));
const byWorkId = new Map<string, SerializePlan>();
for (const plan of SERIALIZE_PLANS) {
  if (plan.shelfWorkId) byWorkId.set(plan.shelfWorkId, plan);
}

export function serializePlan(id: string | null | undefined) {
  if (!id) return undefined;
  return byId.get(id);
}

export function serializePlanByWorkId(workId: string | null | undefined) {
  if (!workId) return undefined;
  return byWorkId.get(workId);
}

export function serializeEpisode(plan: SerializePlan, n: number) {
  return plan.episodes.find((episode) => episode.n === n);
}

/** LIVE readable rails only — local bind on the mapped shelf work. */
export function isSerializeBound(plan: SerializePlan) {
  return Boolean(plan.shelfWorkId && isLocalBound(plan.shelfWorkId));
}

export function serializeTypicalMinutes(plan: SerializePlan) {
  if (plan.episodes.length === 0) {
    return Math.max(1, Math.round(plan.totalMinutes / Math.max(1, plan.nights)));
  }
  const sum = plan.episodes.reduce((total, episode) => total + episode.minutes, 0);
  return Math.max(1, Math.round(sum / plan.episodes.length));
}

/** Rituals card: nights plus a typical night, not the whole novel. */
export function serializeDurationLabel(plan: SerializePlan) {
  return `${plan.nights} nights · ~${serializeTypicalMinutes(plan)} min`;
}

export function serializeEpisodeMinutesLabel(minutes: number) {
  return `~${Math.max(1, Math.round(minutes))} min`;
}

/** Next night to highlight. Completing the last night stays on the finale. */
export function serializeTonight(plan: SerializePlan, lastCompleted = 0) {
  const done = Number.isFinite(lastCompleted) ? Math.max(0, Math.floor(lastCompleted)) : 0;
  if (done >= plan.nights) return plan.nights;
  return done + 1;
}

export function serializeNightChrome(plan: SerializePlan, n: number) {
  const episode = serializeEpisode(plan, n);
  if (!episode) return "";
  return `Night ${episode.n} · ${episode.title}`;
}

export function serializeClubNightLine(plan: SerializePlan, n: number) {
  const episode = serializeEpisode(plan, n) ?? plan.episodes[0];
  const night = episode?.n ?? 1;
  return `Night ${night} of ${plan.nights} · ${plan.title}`;
}

/** Session 0 is startEpisode; later sittings walk forward, capped at the finale. */
export function serializeClubNight(startEpisode: number, sessionIndex: number, nights: number) {
  const start = Math.max(1, Math.floor(startEpisode) || 1);
  const index = Math.max(0, Math.floor(sessionIndex) || 0);
  return Math.min(nights, start + index);
}

export function serializeSitSearch(
  plan: SerializePlan,
  episodeN: number,
  extra?: { pair?: string },
) {
  const episode = serializeEpisode(plan, episodeN);
  const sit = episode?.minutes ?? serializeTypicalMinutes(plan);
  return {
    sit,
    episode: episodeN,
    ...(extra?.pair ? { pair: extra.pair } : {}),
  };
}

/** Pair + episode sit for a live club's next named night. */
export function serializeClubReadSearch(
  club: {
    serializePlanId?: string | null;
    startEpisode?: number | null;
    nextSession?: { id: number } | null;
    sessions?: { id: number }[];
  },
  pair: string,
) {
  const plan = serializePlan(club.serializePlanId);
  if (!plan) return { pair, sit: 0 };
  const nextIndex =
    club.nextSession && club.sessions
      ? Math.max(
          0,
          club.sessions.findIndex((session) => session.id === club.nextSession?.id),
        )
      : 0;
  const episode = serializeClubNight(club.startEpisode ?? 1, nextIndex, plan.nights);
  return serializeSitSearch(plan, episode, { pair });
}

export const SERIALIZE_BOUND_IDS = SERIALIZE_PLANS.filter((plan) => plan.shelfWorkId).map(
  (plan) => plan.id,
);
export const SERIALIZE_PENDING_IDS = SERIALIZE_PLANS.filter((plan) => !plan.shelfWorkId).map(
  (plan) => plan.id,
);

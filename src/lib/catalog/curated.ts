import { isLocalBound } from "./full-pdf.ts";
import { shelfWork } from "./shelf.ts";

/**
 * Guest curator lists. Separate from the AI /curator chat and from
 * Recommend lanes. A workId is an English sit already on the shelf.
 * Titles without an English bind stay on the list and do not open /read.
 *
 * Emmeline Clein, launch notes (lightly shortened). Years and places are hers.
 */
const ENGLISH_SIT_IDS = new Set<string>([
  "basilio",
  "blacker",
  "lady-macbeth",
  "the-wanderer",
  "naomi",
  "odessa",
  "the-late-mattia-pascal",
  "madmen",
  "a-lost-lady",
  "jacob-s-room",
  "the-last-man",
  "summer",
  "herland",
  "the-tenant-of-wildfell-hall",
]);

export type CuratedPick = {
  key: string;
  author: string;
  title: string;
  year: number;
  place: string;
  blurb: string;
  /** Catalog row, when one exists. Not an open affordance by itself. */
  shelfId?: string;
  /** English sit id. Omitted when the shelf has no English bind. */
  workId?: string;
  /** Reader-facing line when the pick cannot open. */
  unavailable?: string;
};

export type CuratedEntry = {
  pick: CuratedPick;
  alt?: CuratedPick;
};

export type CuratedGroup = {
  id: string;
  label?: string;
  entries: CuratedEntry[];
};

export type GuestCurator = {
  slug: string;
  name: string;
  note: string;
  groups: CuratedGroup[];
};

const NOT_YET = "Not yet an English sit";

export const GUEST_CURATORS: GuestCurator[] = [
  {
    slug: "emmeline-clein",
    name: "Emmeline Clein",
    note: "Geographical diversity and urban scenescapes, a contemporary tone with an eccentric edge, existential concerns, and potent openings. A second pass keeps those priorities and makes room for women writers.",
    groups: [
      {
        id: "launch",
        entries: [
          {
            pick: {
              key: "cousin-basilio",
              author: "Eça de Queirós",
              title: "Cousin Basílio",
              year: 1878,
              place: "Lisbon",
              blurb:
                "Wry, sparkling prose on the hypocrisy of nineteenth-century Lisbon’s bourgeoisie — their betrayals and pseudo-cosmopolitan concerns. Social climbing and class limit love. Sumptuous rooms, fun and melancholy at once.",
              shelfId: "basilio",
              workId: "basilio",
            },
          },
          {
            pick: {
              key: "blacker",
              author: "Wallace Thurman",
              title: "The Blacker the Berry",
              year: 1929,
              place: "New York",
              blurb:
                "A tragicomic take on colorism in Prohibition-era New York. An immediately endearing protagonist, and poetic, musical prose. The opening pages on “ephemeral mob emotion” still cut.",
              shelfId: "blacker",
              workId: "blacker",
            },
          },
          {
            pick: {
              key: "savoy",
              author: "Joseph Roth",
              title: "Hotel Savoy",
              year: 1924,
              place: "A German city",
              blurb:
                "A philosophical look at a hotel’s in-betweenness: temporary rooms where political, social, and moral tensions come forward. Laconically surreal, with a cast of lonely yearners. Originally serialized.",
              shelfId: "savoy",
              unavailable: NOT_YET,
            },
          },
          {
            pick: {
              key: "lady-macbeth",
              author: "Nikolai Leskov",
              title: "Lady Macbeth of Mtsensk",
              year: 1865,
              place: "A Russian city",
              blurb:
                "The title story takes a charming, gossipy tenor from the first moments. Always rooted in Russia’s oral tradition.",
              shelfId: "lady-macbeth",
              workId: "lady-macbeth",
            },
          },
          {
            pick: {
              key: "envy",
              author: "Yuri Olesha",
              title: "Envy",
              year: 1927,
              place: "Moscow",
              blurb:
                "A comedy of chaos, economics, and homosocial self-hatred. Hyper-modern and satirical, skewering greed and internecine male competition.",
              shelfId: "envy",
              unavailable: NOT_YET,
            },
          },
          {
            pick: {
              key: "meaulnes",
              author: "Alain-Fournier",
              title: "Le Grand Meaulnes",
              year: 1913,
              place: "A French town",
              blurb:
                "A coming-of-age inside a desperate crush: adolescent desire and identity. Compared to Peter Pan and The Catcher in the Rye, with shades of The Great Gatsby. Scintillating party scenes, a stark provincial setting.",
              shelfId: "the-wanderer",
              workId: "the-wanderer",
            },
          },
          {
            pick: {
              key: "naomi",
              author: "Jun'ichirō Tanizaki",
              title: "Naomi",
              year: 1924,
              place: "Tokyo",
              blurb:
                "A caustic story of grooming, gender, and Western beauty standards moving into Japanese society. Scathingly modern, startlingly stark, and almost addicting. Originally serialized.",
              shelfId: "naomi",
              workId: "naomi",
            },
            alt: {
              key: "nettles",
              author: "Jun'ichirō Tanizaki",
              title: "Some Prefer Nettles",
              year: 1929,
              place: "Tokyo",
              blurb:
                "A sexless marriage, modernity draining the erotic, and a paean to Japanese tradition, ritual, and romantic myth.",
              shelfId: "nettles",
              unavailable: NOT_YET,
            },
          },
          {
            pick: {
              key: "wild-geese",
              author: "Mori Ōgai",
              title: "The Wild Geese",
              year: 1911,
              place: "Tokyo",
              blurb:
                "An urban story with a feminist, class-aware ethos. A melancholic middle-aged man, a moneylender, students, and a reluctant sex worker reckon with encroaching modernity. An attention-getting opening.",
              shelfId: "wild-geese",
              unavailable: NOT_YET,
            },
          },
          {
            pick: {
              key: "odessa",
              author: "Isaac Babel",
              title: "Odessa Stories",
              year: 1924,
              place: "Odessa",
              blurb:
                "Sopranos as sardonic Jewish-Ukrainian history. Sharp, sensuous, hilariously depressive. Short stories.",
              shelfId: "odessa",
              workId: "odessa",
            },
          },
          {
            pick: {
              key: "one-no-one",
              author: "Luigi Pirandello",
              title: "One, No One and One Hundred Thousand",
              year: 1926,
              place: "An Italian city",
              blurb:
                "A madcap, midnight-dark comedy of self-image. Disturbing and distressing, and still funny.",
              shelfId: "one-no-one",
              unavailable: NOT_YET,
            },
            alt: {
              key: "mattia",
              author: "Luigi Pirandello",
              title: "The Late Mattia Pascal",
              year: 1904,
              place: "An Italian town",
              blurb:
                "A laborer’s malaise is broken by a bureaucratic mistake that offers a second chance at self-definition. Meta, modern, and comic at the open.",
              shelfId: "the-late-mattia-pascal",
              workId: "the-late-mattia-pascal",
            },
          },
          {
            pick: {
              key: "santa",
              author: "Federico Gamboa",
              title: "Santa",
              year: 1903,
              place: "Mexico City",
              blurb:
                "An urban fable of a young woman coming of age against misogyny and class. A raucous Mexico City at the turn of the century, in its dirt and its glory.",
              shelfId: "santa",
              unavailable: NOT_YET,
            },
          },
          {
            pick: {
              key: "quiroga",
              author: "Horacio Quiroga",
              title: "Tales of Love, Madness, and Death",
              year: 1917,
              place: "The Argentine and Uruguayan jungle",
              blurb:
                "Avant-garde surrealist horror in the early twentieth-century jungle, plus his directions to young writers. Short stories.",
              shelfId: "quiroga",
              unavailable: NOT_YET,
            },
          },
          {
            pick: {
              key: "madmen",
              author: "Roberto Arlt",
              title: "The Seven Madmen",
              year: 1929,
              place: "Buenos Aires",
              blurb:
                "A conspiratorial cult caper that is also an inquiry into the soul. Corrosively comic, propulsive, and set in a brutal Buenos Aires.",
              shelfId: "madmen",
              workId: "madmen",
            },
          },
        ],
      },
      {
        id: "familiar",
        label: "Familiar names",
        entries: [
          {
            pick: {
              key: "a-lost-lady",
              author: "Willa Cather",
              title: "A Lost Lady",
              year: 1923,
              place: "A Nebraska town",
              blurb:
                "A fiery proto-feminist figure in a prairie town, on capitalist decline and the narrow chances for women there. It punctures the manifest-destiny myth even as it mourns what is gone.",
              shelfId: "a-lost-lady",
              workId: "a-lost-lady",
            },
          },
          {
            pick: {
              key: "jacobs-room",
              author: "Virginia Woolf",
              title: "Jacob's Room",
              year: 1922,
              place: "London",
              blurb:
                "An experimental parable of maturation, masculinity, and identity. A young man’s self is caught at odd angles, in the impressions of people he passes — crushes, and a mother who misses him.",
              shelfId: "jacob-s-room",
              workId: "jacob-s-room",
            },
          },
          {
            pick: {
              key: "the-last-man",
              author: "Mary Shelley",
              title: "The Last Man",
              year: 1826,
              place: "European towns",
              blurb:
                "A novel of climate catastrophe and pandemic, with compassion for people caught in vast forces, and a surprisingly hopeful, communitarian streak.",
              shelfId: "the-last-man",
              workId: "the-last-man",
            },
          },
          {
            pick: {
              key: "summer",
              author: "Edith Wharton",
              title: "Summer",
              year: 1917,
              place: "New England",
              blurb:
                "A darkly erotic romance in the Massachusetts countryside. Wharton turns from wealthy cosmopolitan subjects toward working-class people in a rural place.",
              shelfId: "summer",
              workId: "summer",
            },
          },
          {
            pick: {
              key: "herland",
              author: "Charlotte Perkins Gilman",
              title: "Herland",
              year: 1915,
              place: "A fictional countryside",
              blurb:
                "A feminist science-fiction fable of a country of women, written with glee, originality, optimism, and sharp sarcasm. Originally serialized.",
              shelfId: "herland",
              workId: "herland",
            },
          },
          {
            pick: {
              key: "wildfell",
              author: "Anne Brontë",
              title: "The Tenant of Wildfell Hall",
              year: 1848,
              place: "Yorkshire",
              blurb:
                "A poignant, eccentric story of misdirected trust, mysterious origins, and loneliness overcome. Less famous than her sisters, and no less inventive.",
              shelfId: "the-tenant-of-wildfell-hall",
              workId: "the-tenant-of-wildfell-hall",
            },
          },
        ],
      },
    ],
  },
];

export function guestCurator(slug: string): GuestCurator | undefined {
  return GUEST_CURATORS.find((curator) => curator.slug === slug);
}

export function curatedPicks(curator: GuestCurator): CuratedPick[] {
  const picks: CuratedPick[] = [];
  for (const group of curator.groups) {
    for (const entry of group.entries) {
      picks.push(entry.pick);
      if (entry.alt) picks.push(entry.alt);
    }
  }
  return picks;
}

/** English sit id, or undefined when the pick must not open a reader. */
export function curatedReadableId(workId: string | undefined): string | undefined {
  if (!workId || !ENGLISH_SIT_IDS.has(workId) || !isLocalBound(workId)) return undefined;
  return workId;
}

export function curatedSitIds(curator?: GuestCurator): string[] {
  const curators = curator ? [curator] : GUEST_CURATORS;
  const ids: string[] = [];
  for (const item of curators) {
    for (const pick of curatedPicks(item)) {
      const id = curatedReadableId(pick.workId);
      if (id) ids.push(id);
    }
  }
  return ids;
}

export function curatedSitCount(curator?: GuestCurator): number {
  return curatedSitIds(curator).length;
}

export function curatedStripCopy(): { pitch: string; aria: string } {
  const sits = curatedSitCount();
  const sitLabel = sits === 1 ? "1 sit" : `${sits} sits`;
  const names = GUEST_CURATORS.map((curator) => curator.name);
  const who =
    names.length === 0
      ? "guest curators"
      : names.length === 1
        ? names[0]
        : `${names[0]} + ${names.length - 1}`;
  const pitch = `Guest lists · ${who} · ${sitLabel}`;
  return {
    pitch,
    aria: `Curated. ${pitch}. Open the guest lists.`,
  };
}

/** Shelf title for a linked sit, when it differs from the curator’s title. */
export function curatedShelfTitle(pick: CuratedPick): string | undefined {
  const id = curatedReadableId(pick.workId);
  if (!id) return undefined;
  const shelf = shelfWork(id);
  if (!shelf || shelf.title === pick.title) return undefined;
  return shelf.title;
}

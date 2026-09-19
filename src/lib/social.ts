import type { Fill } from "./mondrian";

export type Reader = {
  id: string;
  name: string;
  handle: string;
  city: string;
  fill: Fill;
  reading: string;
  workTitle: string;
  kept: string;
  line: string;
  clubs: string[];
};

export type Trace = {
  readerId: string;
  word: string;
};

export type Club = {
  id: string;
  name: string;
  place: string;
  workId: string;
  workTitle: string;
  author: string;
  fill: Fill;
  memberIds: string[];
  prompt: string;
  traces: Trace[];
};

export const READERS: Reader[] = [
  {
    id: "ada",
    name: "Ada Voss",
    handle: "ada",
    city: "Fort Greene",
    fill: "yellow",
    reading: "passing",
    workTitle: "Passing",
    kept: "letter",
    line: "The envelope is still unopened.",
    clubs: ["drayton", "eastside", "integral"],
  },
  {
    id: "jules",
    name: "Jules Mallard",
    handle: "jules",
    city: "Upper West",
    fill: "red",
    reading: "gold",
    workTitle: "Jews Without Money",
    kept: "street",
    line: "The pushcarts are out.",
    clubs: ["eastside", "tegel"],
  },
  {
    id: "nora",
    name: "Nora Chen",
    handle: "nora",
    city: "Two Bridges",
    fill: "ink",
    reading: "we",
    workTitle: "We",
    kept: "glass",
    line: "The Integral is almost finished.",
    clubs: ["integral", "ferryslip"],
  },
  {
    id: "vera",
    name: "Vera S.",
    handle: "vera",
    city: "Gramercy",
    fill: "paper",
    reading: "naomi",
    workTitle: "Naomi",
    kept: "name",
    line: "She writes it in Roman letters.",
    clubs: ["drayton", "cellar"],
  },
  {
    id: "ivo",
    name: "Ivo Reed",
    handle: "ivo",
    city: "Greenpoint",
    fill: "blue",
    reading: "manhattan",
    workTitle: "Manhattan Transfer",
    kept: "ferry",
    line: "Three gulls over the slip.",
    clubs: ["ferryslip", "tegel", "integral"],
  },
  {
    id: "cleo",
    name: "Cleo Hart",
    handle: "cleo",
    city: "Harlem",
    fill: "red",
    reading: "tropic",
    workTitle: "Tropic Death",
    kept: "sun",
    line: "The whistle has blown.",
    clubs: ["eastside", "cellar"],
  },
  {
    id: "leo",
    name: "Leo Joyce",
    handle: "leo",
    city: "Inwood",
    fill: "ink",
    reading: "odessa",
    workTitle: "Odessa Stories",
    kept: "king",
    line: "The tables go out the gate.",
    clubs: ["tegel", "ferryslip"],
  },
  {
    id: "rene",
    name: "René Loisel",
    handle: "rene",
    city: "Astoria",
    fill: "yellow",
    reading: "madmen",
    workTitle: "The Seven Madmen",
    kept: "zone",
    line: "The anguish sits two metres up.",
    clubs: ["drayton"],
  },
];

export const CLUBS: Club[] = [
  {
    id: "drayton",
    name: "The Drayton",
    place: "the roof",
    workId: "passing",
    workTitle: "Passing",
    author: "Nella Larsen",
    fill: "red",
    memberIds: ["ada", "vera", "rene"],
    prompt: "What is being passed, here?",
    traces: [
      { readerId: "ada", word: "letter" },
      { readerId: "vera", word: "tea" },
      { readerId: "rene", word: "window" },
    ],
  },
  {
    id: "eastside",
    name: "East Side",
    place: "the tenement canyon",
    workId: "gold",
    workTitle: "Jews Without Money",
    author: "Michael Gold",
    fill: "paper",
    memberIds: ["jules", "ada", "cleo"],
    prompt: "What does the street keep doing?",
    traces: [
      { readerId: "jules", word: "street" },
      { readerId: "ada", word: "fire-escape" },
      { readerId: "cleo", word: "noise" },
    ],
  },
  {
    id: "integral",
    name: "The Integral",
    place: "the glass walls",
    workId: "we",
    workTitle: "We",
    author: "Yevgeny Zamyatin",
    fill: "yellow",
    memberIds: ["nora", "ada", "ivo"],
    prompt: "What number is this written against?",
    traces: [
      { readerId: "nora", word: "glass" },
      { readerId: "ada", word: "I-330" },
      { readerId: "ivo", word: "wall" },
    ],
  },
  {
    id: "tegel",
    name: "Tegel Gate",
    place: "the tram",
    workId: "berlin",
    workTitle: "Berlin Alexanderplatz",
    author: "Alfred Döblin",
    fill: "ink",
    memberIds: ["jules", "ivo", "leo"],
    prompt: "What does the city want from Franz?",
    traces: [
      { readerId: "jules", word: "free" },
      { readerId: "ivo", word: "decent" },
      { readerId: "leo", word: "pound" },
    ],
  },
  {
    id: "ferryslip",
    name: "Ferryslip",
    place: "the broken boxes",
    workId: "manhattan",
    workTitle: "Manhattan Transfer",
    author: "John Dos Passos",
    fill: "blue",
    memberIds: ["ivo", "nora", "leo"],
    prompt: "Where is the city taking them?",
    traces: [
      { readerId: "ivo", word: "ferry" },
      { readerId: "nora", word: "gulls" },
      { readerId: "leo", word: "steam" },
    ],
  },
  {
    id: "cellar",
    name: "The Cellar",
    place: "the house above",
    workId: "vengeance",
    workTitle: "God of Vengeance",
    author: "Sholem Asch",
    fill: "red",
    memberIds: ["cleo", "vera"],
    prompt: "Who is being kept from the cellar?",
    traces: [
      { readerId: "cleo", word: "scroll" },
      { readerId: "vera", word: "daughter" },
    ],
  },
];

export function getReader(id: string) {
  return READERS.find((reader) => reader.id === id);
}

export function formatHandle(handle: string) {
  const clean = normalizeHandle(handle);
  return clean ? `@${clean}` : "";
}

export function normalizeHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

const RESERVED_HANDLES = new Set([
  "salon",
  "you",
  "friends",
  "admin",
  "staff",
  "vellum",
  "profile",
]);

export function handleError(value: string, taken: Iterable<string> = []): string | null {
  const handle = normalizeHandle(value);
  if (handle.length < 2) return "Use at least two letters.";
  if (RESERVED_HANDLES.has(handle)) return "That name is reserved.";
  const blocked = new Set(
    [...taken].map((item) => normalizeHandle(item)).filter(Boolean),
  );
  if (blocked.has(handle)) return "Someone already sits as that name.";
  return null;
}

export function readerByHandle(handle: string) {
  const clean = normalizeHandle(handle);
  if (!clean) return undefined;
  return READERS.find((reader) => reader.handle === clean);
}

export function searchReaders(query: string) {
  const q = query.trim().toLowerCase().replace(/^@+/, "");
  if (!q) return READERS;
  return READERS.filter((reader) => {
    return (
      reader.handle.includes(q) ||
      reader.name.toLowerCase().includes(q) ||
      reader.city.toLowerCase().includes(q) ||
      reader.workTitle.toLowerCase().includes(q)
    );
  });
}

export function getClub(id: string) {
  return CLUBS.find((club) => club.id === id);
}

export function clubsForReader(id: string) {
  return CLUBS.filter((club) => club.memberIds.includes(id));
}

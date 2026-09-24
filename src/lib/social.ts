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

/**
 * No demo directory. Ada Voss, Jules Mallard, Nora Chen, Vera S., Ivo Reed,
 * Cleo Hart, Leo Joyce, and René Loisel used to live here as if they were
 * readers you could follow. They are gone. Real people are this device's
 * handle, contacts, and anyone who arrived on a shared sit, keep, or note.
 * Club rooms may still name those old ids; unresolved members render as empty.
 */
export const READERS: Reader[] = [];

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

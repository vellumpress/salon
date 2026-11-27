/**
 * Notes, highlights, and saved parts for one book on this device.
 * Kept lines and text size are a different store and are not touched.
 */

export const NOTES_KEY = "salon-notes";

export const NOTE_COLORS = ["yellow", "green", "blue", "red"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export type ReaderNote = {
  breathIndex: number;
  breathId: string;
  excerpt: string;
  color?: NoteColor;
  text?: string;
  saved?: boolean;
  at: number;
};

export type NoteBooks = Record<string, ReaderNote[]>;

type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const EMPTY: readonly ReaderNote[] = Object.freeze([]);

function defaultStore(): Store | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isColor(value: unknown): value is NoteColor {
  return value === "yellow" || value === "green" || value === "blue" || value === "red";
}

function parseNote(value: unknown): ReaderNote | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ReaderNote>;
  const breathIndex = typeof row.breathIndex === "number" ? Math.floor(row.breathIndex) : -1;
  const breathId = typeof row.breathId === "string" ? row.breathId : "";
  const excerpt = typeof row.excerpt === "string" ? row.excerpt.replace(/\s+/g, " ").trim() : "";
  if (breathIndex < 0 || !breathId || !excerpt) return null;
  const color = isColor(row.color) ? row.color : undefined;
  const text = typeof row.text === "string" ? row.text.trim() : "";
  const saved = row.saved === true;
  if (!color && !text && !saved) return null;
  return {
    breathIndex,
    breathId,
    excerpt: excerpt.slice(0, 180),
    color,
    text: text ? text.slice(0, 500) : undefined,
    saved: saved || undefined,
    at: typeof row.at === "number" && Number.isFinite(row.at) ? row.at : 0,
  };
}

export function parseNoteBooks(raw: string | null): NoteBooks {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const books: NoteBooks = {};
    for (const [workId, list] of Object.entries(parsed)) {
      if (!workId || !Array.isArray(list)) continue;
      const items: ReaderNote[] = [];
      for (const row of list) {
        const note = parseNote(row);
        if (note) items.push(note);
      }
      if (items.length) books[workId] = items.sort((a, b) => a.breathIndex - b.breathIndex);
    }
    return books;
  } catch {
    return {};
  }
}

export function readNoteBooks(store: Store | null = defaultStore()): NoteBooks {
  if (!store) return {};
  try {
    return parseNoteBooks(store.getItem(NOTES_KEY));
  } catch {
    return {};
  }
}

export function writeNoteBooks(books: NoteBooks, store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    store.setItem(NOTES_KEY, JSON.stringify(books));
  } catch {
    /* private mode */
  }
}

export function notesFor(books: NoteBooks, workId: string): readonly ReaderNote[] {
  return books[workId] ?? EMPTY;
}

export function noteAt(items: readonly ReaderNote[], breathIndex: number): ReaderNote | undefined {
  return items.find((item) => item.breathIndex === breathIndex);
}

function excerptOf(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return (clean || "This part").slice(0, 180);
}

export function withNote(
  books: NoteBooks,
  workId: string,
  patch: { breathIndex: number; breathId: string; excerpt: string; color?: NoteColor | null; text?: string | null; saved?: boolean },
): NoteBooks {
  const current = books[workId] ?? [];
  const prior = current.find((item) => item.breathIndex === patch.breathIndex);
  const next: ReaderNote = {
    breathIndex: patch.breathIndex,
    breathId: patch.breathId || prior?.breathId || "",
    excerpt: excerptOf(patch.excerpt || prior?.excerpt || ""),
    color: patch.color === null ? undefined : patch.color === undefined ? prior?.color : patch.color,
    text: patch.text === null ? undefined : patch.text === undefined ? prior?.text : patch.text.trim().slice(0, 500) || undefined,
    saved: patch.saved === undefined ? prior?.saved : patch.saved || undefined,
    at: Date.now(),
  };
  const rest = current.filter((item) => item.breathIndex !== patch.breathIndex);
  if (!next.breathId || (!next.color && !next.text && !next.saved)) {
    if (rest.length === current.length) return books;
    const cleared = { ...books };
    if (rest.length) cleared[workId] = rest;
    else delete cleared[workId];
    return cleared;
  }
  return {
    ...books,
    [workId]: [...rest, next].sort((a, b) => a.breathIndex - b.breathIndex),
  };
}

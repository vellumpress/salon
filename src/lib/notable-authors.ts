import { isLocalBound } from "./catalog/full-pdf.ts";
import { RITUAL_LANES } from "./catalog/rituals.ts";
import { SHELF } from "./catalog/shelf.ts";

/**
 * Authors on the Friends page. Every name is a catalog author string, and
 * every one has at least one local book on a ritual rail.
 *
 * Order is Mike's taste anchors first (Mirth, Quicksand, Botchan, then
 * Cather, Colette, Chekhov, Maugham, Yezierska), then nearby authors who
 * are also on those rails: Mansfield's stories, von Arnim (April and Vera),
 * Fauset beside Larsen, Warner beside Maggot.
 *
 * Book counts, titles, and lanes are read from the shelf and the rails.
 * There is no author-bio field in the catalog, so `bio` stays null.
 */
export const NOTABLE_AUTHOR_NAMES = [
  "Edith Wharton",
  "Nella Larsen",
  "Natsume Sōseki",
  "Willa Cather",
  "Colette",
  "Anton Chekhov",
  "W. Somerset Maugham",
  "Anzia Yezierska",
  "Katherine Mansfield",
  "Elizabeth von Arnim",
  "Jessie Redmon Fauset",
  "Sylvia Townsend Warner",
] as const;

export type CatalogAuthorBook = {
  id: string;
  title: string;
  /** First ritual rail this book sits on. Empty when the book is on the shelf only. */
  lane: string;
};

export type CatalogAuthor = {
  slug: string;
  name: string;
  /** Catalog author bio, when one exists. Never invented. */
  bio: string | null;
  books: CatalogAuthorBook[];
};

export type ReadProgress = {
  entered?: boolean;
  completedAt?: number | null;
  breathIndex?: number;
  kept?: string[];
};

const LANE_BY_WORK = new Map<string, string>();
for (const lane of RITUAL_LANES) {
  const seen = new Set<string>();
  for (const id of lane.workIds) {
    if (seen.has(id) || LANE_BY_WORK.has(id) || !isLocalBound(id)) continue;
    seen.add(id);
    LANE_BY_WORK.set(id, lane.label);
  }
}

export function authorSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function booksOnTbrLabel(count: number) {
  const n = Math.max(0, Math.floor(count));
  return `${n} ${n === 1 ? "book" : "books"} on tbr`;
}

export function authorProfilePath(slug: string) {
  return `/friends/author/${encodeURIComponent(slug)}`;
}

function booksForAuthor(name: string): CatalogAuthorBook[] {
  const books: CatalogAuthorBook[] = [];
  for (const work of SHELF) {
    if (work.author !== name || !isLocalBound(work.id)) continue;
    books.push({
      id: work.id,
      title: work.title,
      lane: LANE_BY_WORK.get(work.id) ?? "",
    });
  }
  return books;
}

export function notableAuthors(): CatalogAuthor[] {
  const authors: CatalogAuthor[] = [];
  for (const name of NOTABLE_AUTHOR_NAMES) {
    const books = booksForAuthor(name);
    if (books.length === 0 || !books.some((book) => book.lane)) continue;
    authors.push({
      slug: authorSlug(name),
      name,
      bio: null,
      books,
    });
  }
  return authors;
}

const BY_SLUG = new Map(notableAuthors().map((author) => [author.slug, author]));

export function notableAuthor(slug: string): CatalogAuthor | undefined {
  return BY_SLUG.get(slug);
}

/** Books by this author that local progress or keeps already record. */
export function authorBooksRead(
  author: CatalogAuthor,
  progress: Record<string, ReadProgress | undefined>,
) {
  return author.books.filter((book) => {
    const item = progress[book.id];
    if (!item) return false;
    return Boolean(
      item.entered ||
        item.completedAt ||
        (item.breathIndex ?? 0) > 0 ||
        (item.kept && item.kept.length > 0),
    );
  });
}

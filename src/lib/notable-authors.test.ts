import assert from "node:assert/strict";
import test from "node:test";
import { isLocalBound } from "./catalog/full-pdf.ts";
import { RITUAL_LANES } from "./catalog/rituals.ts";
import { SHELF } from "./catalog/shelf.ts";
import {
  authorBooksRead,
  authorProfilePath,
  authorSlug,
  booksOnTbrLabel,
  notableAuthor,
  notableAuthors,
} from "./notable-authors.ts";

const DEMO = ["Ada", "Jules", "Nora", "Vera", "Ivo", "Cleo", "Leo", "René"];

test("notable authors are real catalog names with a book on a rail", () => {
  const authors = notableAuthors();
  assert.ok(authors.length >= 8 && authors.length <= 12);
  const laneLabels = new Set(RITUAL_LANES.map((lane) => lane.label));
  for (const author of authors) {
    assert.equal(author.bio, null);
    assert.equal(author.slug, authorSlug(author.name));
    const shelf = SHELF.filter((work) => work.author === author.name && isLocalBound(work.id));
    assert.equal(author.books.length, shelf.length);
    assert.ok(author.books.some((book) => book.lane));
    for (const book of author.books) {
      assert.equal(shelf.some((work) => work.id === book.id && work.title === book.title), true);
      if (book.lane) assert.ok(laneLabels.has(book.lane));
    }
  }
  for (const name of DEMO) {
    assert.equal(
      authors.some((author) => author.name.includes(name)),
      false,
    );
  }
});

test("taste anchors lead, and lanes come from the rails", () => {
  const names = notableAuthors().map((author) => author.name);
  assert.deepEqual(names.slice(0, 8), [
    "Edith Wharton",
    "Nella Larsen",
    "Natsume Sōseki",
    "Willa Cather",
    "Colette",
    "Anton Chekhov",
    "W. Somerset Maugham",
    "Anzia Yezierska",
  ]);
  const wharton = notableAuthor("edith-wharton");
  assert.ok(wharton);
  assert.equal(wharton.books.find((book) => book.id === "the-house-of-mirth")?.lane, "For you");
  assert.equal(notableAuthor("nella-larsen")?.books.find((book) => book.id === "quicksand")?.lane, "For you");
  assert.equal(notableAuthor("natsume-soseki")?.books.find((book) => book.id === "botchan")?.lane, "For you");
  assert.equal(notableAuthor("nella-larsen")?.books.find((book) => book.id === "passing")?.lane, "Bite-sized");
  assert.equal(booksOnTbrLabel(wharton.books.length), `${wharton.books.length} books on tbr`);
  assert.equal(booksOnTbrLabel(1), "1 book on tbr");
  assert.equal(authorProfilePath("edith-wharton"), "/friends/author/edith-wharton");
});

test("you've read uses local progress and keeps only", () => {
  const larsen = notableAuthor("nella-larsen");
  assert.ok(larsen);
  assert.deepEqual(authorBooksRead(larsen, {}), []);
  const read = authorBooksRead(larsen, {
    passing: { entered: false, breathIndex: 0, kept: ["b1"], completedAt: null },
    quicksand: { entered: true, breathIndex: 2, kept: [], completedAt: null },
    "the-house-of-mirth": { entered: true, breathIndex: 4, kept: [], completedAt: null },
  });
  assert.deepEqual(
    read.map((book) => book.id),
    ["quicksand", "passing"],
  );
});

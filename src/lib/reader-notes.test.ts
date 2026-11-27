import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { noteAt, NOTES_KEY, parseNoteBooks, readNoteBooks, withNote, writeNoteBooks, type NoteBooks } from "./reader-notes.ts";

function memoryStore(initial?: Record<string, string>) {
  const data = { ...(initial ?? {}) };
  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

const place = { breathIndex: 12, breathId: "b12", excerpt: "He was married five years." };

test("notes stay on this device and do not touch text size or kept lines", () => {
  const store = memoryStore({ "salon-text-size": "1.20", "vellum-v1": "{\"kept\":true}" });
  assert.deepEqual(Object.keys(readNoteBooks(store)), []);
  assert.deepEqual(Object.keys(readNoteBooks(memoryStore({ [NOTES_KEY]: "{" }))), []);
  let books: NoteBooks = {};
  books = withNote(books, "botchan", { ...place, color: "yellow" });
  books = withNote(books, "botchan", { ...place, saved: true });
  books = withNote(books, "botchan", { ...place, text: "A note for this part" });
  writeNoteBooks(books, store);
  assert.equal(store.data["salon-text-size"], "1.20");
  assert.equal(store.data["vellum-v1"], "{\"kept\":true}");
  const saved = readNoteBooks(store).botchan?.[0];
  assert.equal(saved?.color, "yellow");
  assert.equal(saved?.saved, true);
  assert.equal(saved?.text, "A note for this part");
  assert.equal(noteAt(readNoteBooks(store).botchan ?? [], 12)?.excerpt, "He was married five years.");
  books = withNote(books, "botchan", { ...place, color: null, text: null, saved: false });
  assert.equal(books.botchan, undefined);
});

test("a highlight is painted only on a marked sentence", () => {
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  assert.match(reader, /const ColumnBreath = memo\(function ColumnBreath/);
  assert.match(reader, /color\?: "yellow" \| "green" \| "blue" \| "red"/);
  assert.match(reader, /color \? \([\s\S]*note-hl note-hl-\$\{color\}/);
  assert.match(reader, /hue \? \([\s\S]*note-hl note-hl-\$\{hue\}/);
  assert.doesNotMatch(reader, /blocksFor\(item\.text\)\.map/);
  const css = readFileSync(new URL("../components/reader-notes.css", import.meta.url), "utf8");
  assert.match(css, /\.reading-progress-mark\s*\{[^}]*pointer-events:\s*auto/);
  assert.match(css, /\.note-hl-yellow\s*\{[^}]*background:\s*#ffe14a/);
  assert.match(css, /\.note-hl-red\s*\{[^}]*background:\s*#ff4b4b/);
  assert.doesNotMatch(css, /font-family:\s*["'](?!Outfit|Cormorant Garamond)/);
  const parsed = parseNoteBooks(JSON.stringify({ botchan: [{ breathIndex: 3, breathId: "a", excerpt: "Hi", color: "blue", saved: true, at: 1 }] }));
  assert.equal(parsed.botchan?.[0]?.color, "blue");
});

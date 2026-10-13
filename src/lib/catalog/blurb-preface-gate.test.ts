import assert from "node:assert/strict";
import test from "node:test";
import { blurbFor, hasEmptyInterpolation } from "./blurbs.ts";
import { prefaceFor } from "./prefaces.ts";
import { SHELF } from "./shelf.ts";

const BORROWED_BOTCHAN = /hot-headed teacher who refuses the provincial game/i;
const BORROWED_KING = /a play that ruins its readers/i;

/** Two shelf rows for one novel. Its own sentence may appear on both. */
const SAME_BOOK: Record<string, string> = {
  "kusamakura-unhuman-tour": "unhuman-tour-kusamakura",
};

function bookKey(id: string) {
  return SAME_BOOK[id] ?? id;
}

test("an author tagline that describes one book is not another book's blurb or preface", () => {
  for (const id of ["cat", "kokoro", "kusamakura-unhuman-tour", "unhuman-tour-kusamakura"]) {
    assert.doesNotMatch(blurbFor(id), BORROWED_BOTCHAN, `${id} blurb`);
    assert.doesNotMatch(prefaceFor(id) ?? "", BORROWED_BOTCHAN, `${id} preface`);
  }
  assert.match(blurbFor("botchan"), /hot-headed Tokyo teacher is posted to the provinces/);
  assert.match(prefaceFor("botchan") ?? "", /hot-headed Tokyo teacher is posted to the provinces/);

  for (const id of ["the-mystery-of-choice", "in-search-of-the-unknown"]) {
    assert.doesNotMatch(blurbFor(id), BORROWED_KING, `${id} blurb`);
    assert.doesNotMatch(prefaceFor(id) ?? "", BORROWED_KING, `${id} preface`);
  }
  assert.match(blurbFor("the-mystery-of-choice"), /Purple Emperor/);
  assert.match(prefaceFor("the-mystery-of-choice") ?? "", /Purple Emperor/);
  assert.match(blurbFor("the-king-in-yellow"), /stories that catch the yellow stain/);
  assert.match(prefaceFor("the-king-in-yellow") ?? "", /stories that catch the yellow stain/);
});

test("a template with an empty field is dropped", () => {
  assert.equal(hasEmptyInterpolation("Dante Alighieri's 1320 poems: ."), true);
  assert.equal(hasEmptyInterpolation("Machado de Assis’s 1882 stories, gathered as ."), true);
  assert.equal(hasEmptyInterpolation("’s 1320 poems: Inferno."), true);
  assert.equal(hasEmptyInterpolation("Dante Alighieri’s 1320 poems: Inferno."), false);
  assert.doesNotMatch(blurbFor("inferno"), /poems:\s*[.!?…]/);
  assert.doesNotMatch(prefaceFor("inferno") ?? "", /poem:\s*[.!?…]/);
  assert.match(blurbFor("inferno"), /Inferno/);
  assert.match(prefaceFor("the-divine-comedy-complete") ?? "", /Divine Comedy/);
});

test("one blurb or preface string is never shared by two books, and none interpolate a blank", () => {
  const owner = new Map<string, string>();
  const shared: string[] = [];
  const blank: string[] = [];
  for (const work of SHELF) {
    const lines: Array<[string, string]> = [
      ["blurb", blurbFor(work)],
      ["preface", prefaceFor(work.id) ?? ""],
    ];
    for (const [surface, copy] of lines) {
      const text = copy.replace(/\s+/g, " ").trim();
      if (!text) continue;
      if (hasEmptyInterpolation(text)) blank.push(`${work.id} ${surface}`);
      const key = text.toLowerCase();
      const book = bookKey(work.id);
      const prior = owner.get(key);
      if (prior && prior !== book) shared.push(`${prior} & ${work.id} ${surface}`);
      else if (!prior) owner.set(key, book);
    }
  }
  assert.deepEqual(blank, []);
  assert.deepEqual(shared, []);
});

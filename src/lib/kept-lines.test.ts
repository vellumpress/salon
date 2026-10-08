import assert from "node:assert/strict";
import test from "node:test";
import {
  anchorKeptLine,
  asKeptRecord,
  keptIncludes,
  migrateKeptList,
  normalizeKeptText,
  parseBreathRemap,
  resolveKeptOpen,
  retargetKeptList,
  toggleKeptList,
  visibleKeptLines,
  type KeptWork,
} from "./kept-lines.ts";

const work: KeptWork = {
  title: "Passing",
  author: "Nella Larsen",
  scenes: [{ id: "s0", title: "Chapter I" }],
  breaths: [
    { id: "s0-0", sceneId: "s0", text: "She wrote the letter." },
    { id: "s0-1", sceneId: "s0", text: "The afternoon was warm." },
    { id: "s0-2", sceneId: "s0", text: "She wore the red dress that evening." },
  ],
};

test("normalizeKeptText folds whitespace, quotes, and italics markup", () => {
  assert.equal(normalizeKeptText("  She   said  “hello”. "), 'She said "hello".');
  assert.equal(normalizeKeptText("She said _hello_."), "She said hello.");
  assert.equal(normalizeKeptText("She said *hello*."), "She said hello.");
  assert.equal(normalizeKeptText("She said <em>hello</em>."), "She said hello.");
});

test("normalizeKeptText ignores note markers and a leading Note label", () => {
  assert.equal(
    normalizeKeptText('asked a *barin*[1] of about forty'),
    "asked a barin of about forty",
  );
  assert.equal(normalizeKeptText("word [1]."), normalizeKeptText("word."));
  assert.equal(normalizeKeptText("Note: Yasen was the village."), "Yasen was the village.");
  assert.equal(normalizeKeptText("[1] Yasen was the village."), "Yasen was the village.");
  assert.equal(
    normalizeKeptText("[12] Yasen was the village."),
    normalizeKeptText("Note: Yasen was the village."),
  );
});

test("a saved sentence re-anchors after its note marker becomes a Note line", () => {
  const moved = anchorKeptLine(
    { id: "s0-2", text: "She asked a *barin*[1] of about forty." },
    [
      { id: "s0-2", text: "Note: a gentleman." },
      { id: "s0-3", text: "She asked a *barin* of about forty." },
    ],
  );
  assert.equal(moved.breathId, "s0-3");
  assert.equal(moved.updated, true);

  const note = anchorKeptLine({ id: "old-note", text: "[1] Yasen was the village." }, [
    { id: "s24-9", text: "Note: Yasen was the village." },
  ]);
  assert.equal(note.breathId, "s24-9");
  assert.equal(note.index, 0);
});

test("saving a line stores the sentence, the book, and when it was kept", () => {
  const kept = toggleKeptList("passing", [], "s0-0", {
    text: "  She wrote the letter. ",
    title: "Passing",
    author: "Nella Larsen",
    scene: "Chapter I",
    savedAt: 50,
  });
  const row = asKeptRecord(kept[0]);
  assert.ok(row);
  assert.equal(row.v, 1);
  assert.equal(row.id, "s0-0");
  assert.equal(row.text, "She wrote the letter.");
  assert.equal(row.workId, "passing");
  assert.equal(row.title, "Passing");
  assert.equal(row.author, "Nella Larsen");
  assert.equal(row.scene, "Chapter I");
  assert.equal(row.savedAt, 50);
  assert.equal(keptIncludes(kept, "s0-0"), true);
  assert.deepEqual(toggleKeptList("passing", kept, "s0-0", null), []);
});

test("a kept line still renders after its breath id changes", () => {
  const lines = visibleKeptLines(
    {
      passing: {
        lastOpenedAt: 10,
        kept: [
          {
            v: 1,
            id: "retired",
            text: "She wrote the letter.",
            workId: "passing",
            title: "Passing",
            author: "Nella Larsen",
            scene: "Chapter I",
            savedAt: 10,
          },
        ],
      },
    },
    () => ({
      ...work,
      breaths: [{ id: "s0-9", sceneId: "s0", text: "A different sentence now." }],
    }),
    { complete: () => true },
  );
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.text, "She wrote the letter.");
  assert.equal(lines[0]?.title, "Passing");
  assert.equal(lines[0]?.breathId, "retired");
  assert.equal(lines[0]?.at, -1);
});

test("re-anchor opens the breath whose text still matches and names the new id", () => {
  const moved = anchorKeptLine(
    { id: "retired", text: "She wrote the letter." },
    [
      { id: "s0-0", text: "A different sentence now." },
      { id: "s9-2", text: "She wrote the letter." },
    ],
  );
  assert.equal(moved.index, 1);
  assert.equal(moved.breathId, "s9-2");
  assert.equal(moved.updated, true);

  const same = anchorKeptLine({ id: "s0-0", text: "She said _hello_." }, [
    { id: "s0-0", text: "She said <em>hello</em>." },
  ]);
  assert.equal(same.index, 0);
  assert.equal(same.updated, false);

  const quotes = anchorKeptLine({ id: "old", text: "She said “hello”." }, [
    { id: "new", text: 'She said "hello".' },
  ]);
  assert.equal(quotes.breathId, "new");
  assert.equal(quotes.updated, true);
});

test("re-anchor prefers an exact sentence, then one that contains it or sits inside it", () => {
  const containing = anchorKeptLine({ id: "old", text: "She wore the red dress that evening" }, [
    { id: "short", text: "No." },
    { id: "wider", text: "She wore the red dress that evening and left." },
  ]);
  assert.equal(containing.breathId, "wider");

  const contained = anchorKeptLine(
    { id: "old", text: "Before dinner she wore the red dress that evening and smiled." },
    [{ id: "piece", text: "she wore the red dress that evening" }],
  );
  assert.equal(contained.breathId, "piece");

  const exactWins = anchorKeptLine({ id: "old", text: "She wrote the letter." }, [
    { id: "wider", text: "She wrote the letter. Then she sealed it." },
    { id: "exact", text: "She wrote the letter." },
  ]);
  assert.equal(exactWins.breathId, "exact");
});

test("a matching id with different text is not treated as the saved sentence", () => {
  const anchor = anchorKeptLine({ id: "s0-0", text: "She wrote the letter." }, [
    { id: "s0-0", text: "The afternoon was warm." },
    { id: "s0-4", text: "She wrote the letter." },
  ]);
  assert.equal(anchor.breathId, "s0-4");
  assert.equal(anchor.index, 1);
});

test("when the sentence is gone, opening falls back instead of throwing", async () => {
  const anchor = anchorKeptLine({ id: "gone", text: "This sentence left the book." }, work.breaths);
  assert.equal(anchor.index, null);
  assert.equal(anchor.breathId, null);
  const opened = await resolveKeptOpen({
    workId: "passing",
    breathId: "gone",
    text: "This sentence left the book.",
    load: async () => work,
  });
  assert.deepEqual(opened, {});
  const missing = await resolveKeptOpen({
    workId: "passing",
    breathId: "s0-0",
    text: "She wrote the letter.",
    load: async () => {
      throw new Error("offline");
    },
  });
  assert.deepEqual(missing, {});
});

test("migration backfills text when the id still resolves and persists the sentence", () => {
  const result = migrateKeptList("passing", ["s0-0"], work, undefined, true, 42);
  assert.equal(result.changed, true);
  const row = asKeptRecord(result.kept[0]);
  assert.ok(row);
  assert.equal(row.id, "s0-0");
  assert.equal(row.text, "She wrote the letter.");
  assert.equal(row.title, "Passing");
  assert.equal(row.author, "Nella Larsen");
  assert.equal(row.scene, "Chapter I");
  assert.equal(row.savedAt, 42);
  assert.equal(row.workId, "passing");
});

test("migration follows a breath remap before giving up on an old id", () => {
  const remap = parseBreathRemap({ passing: { "old-letter": "s0-0" } });
  const result = migrateKeptList("passing", ["old-letter"], work, remap, true, 7);
  assert.equal(result.changed, true);
  const row = asKeptRecord(result.kept[0]);
  assert.equal(row?.id, "s0-0");
  assert.equal(row?.text, "She wrote the letter.");
  const lines = visibleKeptLines(
    { passing: { lastOpenedAt: 7, kept: ["old-letter"] } },
    () => work,
    { remap, complete: () => true },
  );
  assert.equal(lines[0]?.text, "She wrote the letter.");
  assert.equal(lines[0]?.breathId, "old-letter");
  assert.equal(lines[0]?.at, 0);
});

test("an unresolved id waits if the book is not fully open", () => {
  const partial: KeptWork = { ...work, breaths: [] };
  const result = migrateKeptList("passing", ["s0-0"], partial, undefined, false, 1);
  assert.equal(result.changed, false);
  assert.deepEqual(result.kept, ["s0-0"]);
});

test("an orphan id with no stored text stays in storage and is not rendered", () => {
  const result = migrateKeptList("passing", ["retired-id"], work, undefined, true, 1);
  assert.equal(result.changed, false);
  assert.deepEqual(result.kept, ["retired-id"]);
  assert.doesNotThrow(() => {
    const lines = visibleKeptLines(
      {
        passing: {
          lastOpenedAt: 1,
          kept: ["retired-id", null, "", { id: "" }, { nope: true }],
        },
      },
      () => work,
      { complete: () => true },
    );
    assert.equal(lines.length, 0);
  });
});

test("stored text is kept when the catalog sentence at that id has changed", () => {
  const saved = {
    v: 1 as const,
    id: "s0-0",
    text: "She wrote the letter.",
    workId: "passing",
    title: "Passing",
    author: "Nella Larsen",
    savedAt: 3,
  };
  const edited: KeptWork = {
    ...work,
    breaths: [{ id: "s0-0", sceneId: "s0", text: "The afternoon was warm." }],
  };
  const result = migrateKeptList("passing", [saved], edited, undefined, true, 9);
  assert.equal(result.changed, false);
  assert.equal(asKeptRecord(result.kept[0])?.text, "She wrote the letter.");
  const lines = visibleKeptLines({ passing: { kept: [saved], lastOpenedAt: 3 } }, () => edited, {
    complete: () => true,
  });
  assert.equal(lines[0]?.text, "She wrote the letter.");
});

test("re-anchor updates only the stored id", () => {
  const kept = toggleKeptList("passing", [], "retired", {
    text: "She wrote the letter.",
    title: "Passing",
    author: "Nella Larsen",
    savedAt: 4,
  });
  const next = retargetKeptList(kept, "retired", "s0-0");
  const row = asKeptRecord(next[0]);
  assert.equal(row?.id, "s0-0");
  assert.equal(row?.text, "She wrote the letter.");
  assert.equal(retargetKeptList(kept, "missing", "s0-0"), kept);
});

test("a flat remap file and a list of from/to rows both resolve", () => {
  const flat = parseBreathRemap({ "old-letter": "s0-0" });
  assert.equal(flat.flat["old-letter"], "s0-0");
  const rows = parseBreathRemap([{ workId: "passing", from: "old-letter", to: "s0-0" }]);
  assert.equal(rows.byWork.passing?.["old-letter"], "s0-0");
});

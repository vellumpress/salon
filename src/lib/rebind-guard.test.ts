import assert from "node:assert/strict";
import test from "node:test";
import {
  asKeptRecord,
  migrateKeptList,
  parseBreathRemap,
  resolveKeptOpen,
} from "./kept-lines.ts";
import { placeStamp, reanchorProgress, scaleBreathIndex } from "./rebind-guard.ts";

/**
 * Nine sentences, three chapters. The reader is on the middle sentence of
 * chapter two. The new bind is one paragraph per chapter, and it reuses the
 * old sentence id for a different, longer paragraph in a later chapter.
 */
function sentenceBind() {
  const chapters = [
    ["s0", ["Chapter one opens.", "The street was wet.", "A clerk locked the door."]],
    ["s1", ["Chapter two.", "Spade looked at the falcon.", "The bird did not move."]],
    ["s2", ["Chapter three.", "Morning came late.", "The case was shut."]],
  ] as const;
  return chapters.flatMap(([scene, lines]) =>
    lines.map((text, n) => ({ id: `${scene}-${n}`, sceneId: scene, text })),
  );
}

function paragraphBind() {
  return [
    {
      id: "s0-0",
      sceneId: "s0",
      text: "Chapter one opens. The street was wet. A clerk locked the door.",
    },
    {
      id: "s1-0",
      sceneId: "s1",
      text: "Chapter two. Spade looked at the falcon. The bird did not move.",
    },
    {
      id: "s1-1",
      sceneId: "s4",
      text: "A later chapter reused the old sentence id and runs much longer than the line it replaced.",
    },
  ];
}

const savedAt = sentenceBind().findIndex((breath) => breath.id === "s1-1");

test("a re-bind keeps a mid-book reader on the same chapter and passage", () => {
  const oldBreaths = sentenceBind();
  const nextBreaths = paragraphBind();
  assert.equal(oldBreaths[savedAt]?.text, "Spade looked at the falcon.");
  assert.ok(savedAt >= nextBreaths.length, "the raw index would fall off the new bind");

  const remap = parseBreathRemap({
    falcon: { "s1-1": "s1-0" },
  });
  const stored = { breathIndex: savedAt, ...placeStamp(oldBreaths, savedAt) };
  const next = reanchorProgress(stored, nextBreaths, remap, "falcon");
  const breath = nextBreaths[next.index];
  assert.equal(next.moved, true);
  assert.equal(breath?.sceneId, "s1");
  assert.equal(breath?.id, "s1-0");
  assert.match(breath?.text ?? "", /Spade looked at the falcon/);
  assert.notEqual(next.index, nextBreaths.length - 1);
});

test("with no breath id, a re-bind scales by the old breath count", () => {
  const nextBreaths = paragraphBind();
  const scaled = reanchorProgress(
    { breathIndex: savedAt, breathCount: sentenceBind().length },
    nextBreaths,
    undefined,
    "falcon",
  );
  assert.equal(scaled.index, scaleBreathIndex(savedAt, 9, nextBreaths.length));
  assert.equal(nextBreaths[scaled.index]?.sceneId, "s1");

  const fromRemap = reanchorProgress({ breathIndex: savedAt }, nextBreaths, parseBreathRemap({
    falcon: { fromCount: 9, "s1-1": "s1-0" },
  }), "falcon");
  assert.equal(nextBreaths[fromRemap.index]?.sceneId, "s1");
});

test("when the id and the count are both gone, the reader returns to that chapter's start", () => {
  const nextBreaths = paragraphBind();
  const next = reanchorProgress(
    { breathIndex: savedAt, breathId: "s1-9", bindHash: "retired-bind" },
    nextBreaths,
    undefined,
    "falcon",
  );
  assert.equal(next.index, nextBreaths.findIndex((breath) => breath.sceneId === "s1"));
  assert.equal(nextBreaths[next.index]?.id, "s1-0");
});

test("an index saved against the current bind is left where it is", () => {
  const breaths = sentenceBind();
  const next = reanchorProgress({ breathIndex: savedAt }, breaths, undefined, "falcon");
  assert.equal(next.moved, false);
  assert.equal(next.index, savedAt);
  assert.equal(next.breathId, "s1-1");
  assert.equal(next.breathCount, breaths.length);
});

test("an id-only kept line opens the paragraph the remap names", async () => {
  const breaths = paragraphBind();
  const work = {
    title: "The Maltese Falcon",
    author: "Dashiell Hammett",
    scenes: [
      { id: "s0", title: "Chapter one" },
      { id: "s1", title: "Chapter two" },
      { id: "s4", title: "Chapter five" },
    ],
    breaths,
  };
  const remap = parseBreathRemap({ falcon: { "s1-1": "s1-0" } });
  const migrated = migrateKeptList("falcon", ["s1-1"], work, remap, true, 4);
  const row = asKeptRecord(migrated.kept[0]);
  assert.equal(migrated.changed, true);
  assert.equal(row?.id, "s1-0");
  assert.match(row?.text ?? "", /Spade looked at the falcon/);

  const opened = await resolveKeptOpen({
    workId: "falcon",
    breathId: "s1-1",
    remap,
    load: async () => work,
  });
  assert.equal(opened.at, breaths.findIndex((breath) => breath.id === "s1-0"));
  assert.equal(opened.nextId, "s1-0");
});

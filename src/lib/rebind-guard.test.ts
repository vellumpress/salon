import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SHELF } from "./catalog/shelf.ts";
import { FEATURED_CAROUSEL_IDS } from "./catalog/pitches.ts";
import {
  asKeptRecord,
  keptIdsNeedRemap,
  migrateKeptList,
  parseBreathRemap,
  resolveKeptOpen,
} from "./kept-lines.ts";
import {
  REBOUND_FROM_COUNT,
  placeStamp,
  reanchorProgress,
  scaleBreathIndex,
  shouldLoadBindRemap,
} from "./rebind-guard.ts";

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
  }), "falcon", {});
  assert.equal(nextBreaths[fromRemap.index]?.sceneId, "s1");
});

test("when the id and the count are both gone, the reader returns to that chapter's start", () => {
  const nextBreaths = paragraphBind();
  const next = reanchorProgress(
    { breathIndex: savedAt, breathId: "s1-9", bindHash: "retired-bind" },
    nextBreaths,
    undefined,
    "falcon",
    {},
  );
  assert.equal(next.index, nextBreaths.findIndex((breath) => breath.sceneId === "s1"));
  assert.equal(nextBreaths[next.index]?.id, "s1-0");
});

test("an in-range save with no stamp does not open the remap", () => {
  const breaths = sentenceBind();
  assert.equal(shouldLoadBindRemap({ breathIndex: savedAt }, breaths), false);
  assert.equal(shouldLoadBindRemap({ breathIndex: breaths.length + 4 }, breaths), true);
});

test("an index saved against the current bind is left where it is", () => {
  const breaths = sentenceBind();
  const next = reanchorProgress({ breathIndex: savedAt }, breaths, undefined, "falcon", {});
  assert.equal(next.moved, false);
  assert.equal(next.index, savedAt);
  assert.equal(next.breathId, "s1-1");
  assert.equal(next.breathCount, breaths.length);
});

test("a legacy unstamped index on a listed re-bind scales instead of trusting 1000", () => {
  assert.deepEqual(REBOUND_FROM_COUNT, { falcon: 6154, "lady-macbeth": 649 });
  const oldCount = 6154;
  const count = 2280;
  const breaths = Array.from({ length: count }, (_, n) => ({
    id: `p${n}-0`,
    sceneId: `p${n}`,
    text: `Paragraph ${n}.`,
  }));
  const stored = { breathIndex: 1000 };
  const table = { falcon: oldCount };

  assert.equal(scaleBreathIndex(1000, oldCount, count), 370);
  assert.equal(shouldLoadBindRemap(stored, breaths, "the-goose-man"), false);
  assert.equal(shouldLoadBindRemap(stored, breaths, "falcon"), true);
  assert.equal(shouldLoadBindRemap(stored, breaths, "falcon", REBOUND_FROM_COUNT), true);
  assert.equal(shouldLoadBindRemap(stored, breaths, "falcon", table), true);

  const next = reanchorProgress(stored, breaths, undefined, "falcon", table);
  assert.equal(next.moved, true);
  assert.equal(next.index, 370);
  assert.notEqual(next.index, 1000);
  assert.equal(next.breathCount, count);
  assert.equal(breaths[next.index]?.id, next.breathId);

  const stamped = {
    breathIndex: next.index,
    breathId: next.breathId,
    breathCount: next.breathCount,
    bindHash: next.bindHash,
  };
  const again = reanchorProgress(stamped, breaths, undefined, "falcon", table);
  assert.equal(again.moved, false);
  assert.equal(again.index, 370);
  assert.equal(shouldLoadBindRemap(stamped, breaths, "falcon", table), false);
});

test("an id-only kept line on a listed re-bind follows the remap, then stays stamped", () => {
  const breaths = [
    { id: "s0-0", sceneId: "s0", text: "The reused id is a different paragraph now." },
    { id: "s1-0", sceneId: "s1", text: "Spade looked at the falcon." },
  ];
  const table = { falcon: 6154 };
  assert.equal(keptIdsNeedRemap(["s0-0"], breaths, "falcon", table), true);
  assert.equal(keptIdsNeedRemap(["s0-0"], breaths, "the-goose-man", REBOUND_FROM_COUNT), false);
  assert.equal(keptIdsNeedRemap(["s0-0"], breaths, "falcon", REBOUND_FROM_COUNT), true);

  const work = {
    title: "The Maltese Falcon",
    author: "Dashiell Hammett",
    scenes: [
      { id: "s0", title: "One" },
      { id: "s1", title: "Two" },
    ],
    breaths,
  };
  const remap = parseBreathRemap({ falcon: { "s0-0": "s1-0" } });
  const migrated = migrateKeptList("falcon", ["s0-0"], work, remap, true, 4);
  const row = asKeptRecord(migrated.kept[0]);
  assert.equal(migrated.changed, true);
  assert.equal(row?.id, "s1-0");
  assert.match(row?.text ?? "", /Spade looked at the falcon/);
  assert.equal(keptIdsNeedRemap(migrated.kept, breaths, "falcon", table), false);
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

test("Falcon's sentence bind re-anchors through the remap and no unlisted book moves", () => {
  assert.deepEqual(REBOUND_FROM_COUNT, { falcon: 6154, "lady-macbeth": 649 });
  assert.equal((FEATURED_CAROUSEL_IDS as readonly string[]).includes("falcon"), false);

  const full = JSON.parse(readFileSync(new URL("./catalog/texts/falcon.json", import.meta.url), "utf8")) as {
    minutes: number;
    breaths: { id: string; sceneId: string; text: string }[];
  };
  const opening = JSON.parse(readFileSync(new URL("./catalog/openings/falcon.json", import.meta.url), "utf8")) as {
    breaths: { id: string; text: string }[];
  };
  const raw = JSON.parse(readFileSync(new URL("./catalog/at-remap.json", import.meta.url), "utf8")) as Record<string, Record<string, string>>;
  const remap = parseBreathRemap(raw);
  const work = SHELF.find((item) => item.id === "falcon");
  const card = "SAMUEL SPADE’S jaw was long and bony, his chin a jutting v under the more flexible v of his mouth.";

  assert.equal(full.breaths.length, 2280);
  assert.equal(full.minutes, 334);
  assert.equal(work?.breaths, 2280);
  assert.equal(work?.minutes, 334);
  assert.equal(work?.opening, card);
  assert.ok(full.breaths[0]?.text.startsWith(card));
  assert.equal(opening.breaths.length, 35);
  assert.equal(opening.breaths[0]?.id, "s0-0");
  assert.equal(opening.breaths.at(-1)?.id, "s0-34");
  assert.ok(opening.breaths.at(-1)?.text.endsWith("as the door opened."));
  assert.equal(full.breaths.slice(0, 35).map((breath) => breath.id).join(" "), opening.breaths.map((breath) => breath.id).join(" "));

  const stored = { breathIndex: 3000 };
  assert.equal(shouldLoadBindRemap(stored, full.breaths, "falcon"), true);
  const next = reanchorProgress(stored, full.breaths, remap, "falcon");
  assert.equal(next.moved, true);
  assert.notEqual(next.index, scaleBreathIndex(3000, 6154, 2280));
  assert.equal(full.breaths[next.index]?.id, "s10-104");
  assert.match(full.breaths[next.index]?.text ?? "", /I don\u2019t like him/);
  assert.equal(next.breathCount, 2280);

  const stamped = reanchorProgress(
    { breathIndex: next.index, breathId: next.breathId, breathCount: next.breathCount, bindHash: next.bindHash },
    full.breaths,
    remap,
    "falcon",
  );
  assert.equal(stamped.moved, false);
  assert.equal(stamped.index, next.index);

  const byId = reanchorProgress(
    { breathIndex: 1200, breathId: "s4-46", breathCount: 6154 },
    full.breaths,
    remap,
    "falcon",
  );
  assert.equal(byId.moved, true);
  assert.equal(full.breaths[byId.index]?.id, "s4-14");
  assert.match(full.breaths[byId.index]?.text ?? "", /Samuel Spade’s name and the addresses of his office and his apartment/);

  const other = { breathIndex: 12 };
  assert.equal(shouldLoadBindRemap(other, full.breaths, "the-goose-man"), false);
  const stayed = reanchorProgress(other, full.breaths, remap, "the-goose-man");
  assert.equal(stayed.moved, false);
  assert.equal(stayed.index, 12);
  assert.equal(stayed.breathId, full.breaths[12]?.id);
});

test("Lady Macbeth's OCR bind re-anchors through the remap onto the proofread bind", () => {
  const full = JSON.parse(readFileSync(new URL("./catalog/texts/lady-macbeth.json", import.meta.url), "utf8")) as {
    breaths: { id: string; sceneId: string; text: string }[];
  };
  const raw = JSON.parse(readFileSync(new URL("./catalog/at-remap.json", import.meta.url), "utf8")) as Record<string, Record<string, string>>;
  const remap = parseBreathRemap(raw);
  assert.equal(REBOUND_FROM_COUNT["lady-macbeth"], 649);
  assert.equal(full.breaths.length, 569);
  assert.equal(SHELF.find((item) => item.id === "lady-macbeth")?.breaths, 569);

  // A legacy index (old breath 400, "They were both silent.") lands on the same paragraph.
  const stored = { breathIndex: 400 };
  assert.equal(shouldLoadBindRemap(stored, full.breaths, "lady-macbeth"), true);
  const next = reanchorProgress(stored, full.breaths, remap, "lady-macbeth");
  assert.equal(next.moved, true);
  assert.equal(full.breaths[next.index]?.id, "s9-23");
  assert.equal(full.breaths[next.index]?.text, "They were both silent.");

  // A stamped save on an old id follows the remap: old Chapter "IV" opened mid-sentence on s2-0.
  const byId = reanchorProgress({ breathIndex: 78, breathId: "s2-0", breathCount: 649 }, full.breaths, remap, "lady-macbeth");
  assert.equal(full.breaths[byId.index]?.id, "s3-0");
  assert.match(full.breaths[byId.index]?.text ?? "", /^FOR more than a week Zinovey Borisych did not return/);

  const stamped = reanchorProgress(
    { breathIndex: next.index, breathId: next.breathId, breathCount: next.breathCount, bindHash: next.bindHash },
    full.breaths,
    remap,
    "lady-macbeth",
  );
  assert.equal(stamped.moved, false);
  assert.equal(stamped.index, next.index);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectSpeakerNames,
  findCueOnlyBreaths,
  mergeAttributedSpeech,
  mergeWorkDialogue,
  titleCaseSpeaker,
  workHasCueOnlyBreaths,
} from "./dialogue-formatting.ts";
import type { Work } from "../literature.ts";

const here = dirname(fileURLToPath(import.meta.url));

test("title-case speaker labels", () => {
  assert.equal(titleCaseSpeaker("LOPAKHIN"), "Lopakhin");
  assert.equal(titleCaseSpeaker("DUNYASHA"), "Dunyasha");
  assert.equal(titleCaseSpeaker("MRS. MUSKAT"), "Mrs. Muskat");
  assert.equal(titleCaseSpeaker("DR. GALL"), "Dr. Gall");
  assert.equal(titleCaseSpeaker("THE VOICE OF VARYA"), "The Voice of Varya");
  assert.equal(titleCaseSpeaker("STATION-MASTER"), "Station-Master");
  assert.equal(titleCaseSpeaker("FIRST VOICE"), "First Voice");
});

test("Mike's hard rule: speaker and line share one breath", () => {
  const merged = mergeAttributedSpeech([
    "[Pause.]",
    "DUNYASHA.",
    "The dogs didn’t sleep all night; they know that they’re coming.",
    "LOPAKHIN.",
    "What’s up with you, Dunyasha...?",
  ]);
  assert.deepEqual(merged, [
    "[Pause.]",
    "Dunyasha: The dogs didn’t sleep all night; they know that they’re coming.",
    "Lopakhin: What’s up with you, Dunyasha...?",
  ]);
});

test("prefixes each following dialogue breath until the next cue", () => {
  const merged = mergeAttributedSpeech([
    "LOPAKHIN.",
    "The train’s arrived, thank God.",
    "What’s the time?",
    "DUNYASHA.",
    "It will soon be two.",
    "[Blows out candle] It is light already.",
    "[Pause.]",
    "LOPAKHIN.",
    "How much was the train late?",
  ]);
  assert.deepEqual(merged, [
    "Lopakhin: The train’s arrived, thank God.",
    "Lopakhin: What’s the time?",
    "Dunyasha: It will soon be two.",
    "Dunyasha: [Blows out candle] It is light already.",
    "[Pause.]",
    "Lopakhin: How much was the train late?",
  ]);
});

test("does not prefix ACT/CHARACTERS headers, pure stage, or scene-setting", () => {
  const merged = mergeAttributedSpeech([
    "ACT ONE",
    "CHARACTERS",
    "[A room which is still called the nursery.",
    "It is May.]",
    "LOPAKHIN.",
    "The train’s arrived, thank God.",
    "[Exit.]",
    "Curtain.",
  ]);
  assert.equal(merged[0], "ACT ONE");
  assert.equal(merged[1], "CHARACTERS");
  assert.equal(merged[2], "[A room which is still called the nursery.");
  assert.ok(merged.some((line) => line === "Lopakhin: The train’s arrived, thank God."));
  assert.ok(merged.includes("[Exit.]"));
  assert.equal(merged.at(-1), "Curtain.");
});

test("normalizes same-breath NAME. dialogue and is idempotent", () => {
  const once = mergeAttributedSpeech([
    "JEAN. Tonight Miss Julie is crazy again, perfectly crazy.",
    "KRISTIN.",
    "So--you're back at last.",
  ]);
  assert.deepEqual(once, [
    "Jean: Tonight Miss Julie is crazy again, perfectly crazy.",
    "Kristin: So--you're back at last.",
  ]);
  assert.deepEqual(mergeAttributedSpeech(once), once);
});

test("letter signatures and poem titles are not speakers", () => {
  assert.deepEqual(
    [...collectSpeakerNames(["VAN HELSING.", "_Jonathan Harker’s Journal._", "When I read to Mina."])],
    [],
  );
  assert.deepEqual(
    [...collectSpeakerNames(["CHICAGO", "Hog Butcher for the World,", "SKETCH", "The shadows of the ships."])],
    [],
  );
  assert.deepEqual(
    [
      ...collectSpeakerNames([
        "REQUIES.",
        "O IS it death or life",
        "PASTEL.",
        "THE light of our cigarettes",
        "HER EYES.",
        "BENEATH the heaven of her brows’",
      ]),
    ],
    [],
  );
});

test("a one-off novel cue still merges quoted speech", () => {
  const merged = mergeAttributedSpeech([
    "PAULA.",
    "‘I have decided that I cannot see Sir William again,’ said Paula.",
  ]);
  assert.deepEqual(merged, [
    "Paula: ‘I have decided that I cannot see Sir William again,’ said Paula.",
  ]);
});

test("keeps leading stage on a cue-only breath and prefixes the next line", () => {
  const merged = mergeAttributedSpeech([
    "[MADHAV'S House] MADHAV.",
    "What are you doing here?",
    "AMAL.",
    "I am watching the postman.",
  ]);
  assert.deepEqual(merged, [
    "[MADHAV'S House]",
    "Madhav: What are you doing here?",
    "Amal: I am watching the postman.",
  ]);
});

test("no local pack may contain cue-only breaths", () => {
  const failures: string[] = [];
  for (const folder of ["texts", "openings"] as const) {
    const dir = join(here, folder);
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
      const work = JSON.parse(readFileSync(join(dir, file), "utf8")) as Work;
      const hits = findCueOnlyBreaths(work.breaths.map((breath) => breath.text));
      if (hits.length > 0) {
        const sample = hits
          .slice(0, 4)
          .map((hit) => JSON.stringify(hit.text))
          .join(", ");
        failures.push(`${folder}/${file} ×${hits.length}: ${sample}`);
      }
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { displayKindForForm, type DisplayKind } from "../display-blocks.ts";
import type { Work } from "../literature.ts";
import { WORK_ID_ALIASES } from "../work-id-alias.ts";
import { locateOpeningStop, ritualBookCards, ritualSitBounds } from "./ritual-sit-measure.ts";
import { shelfWork } from "./shelf.ts";

export type StopKind = "opening" | "ritual";

export type StopCheck = {
  id: string;
  kind: StopKind;
  stop: number;
  displayKind: DisplayKind;
  /** Scene that holds the stop, plus the following breath when the book has one. */
  breaths: { index: number; text: string }[];
  stopLength: number;
  /** Exclusive character end when the sit stops inside this breath. */
  cut?: number;
  /** Set when the sit cannot be read off the bind. */
  problem?: string;
};

function readWork(kind: "texts" | "openings", id: string): Work | null {
  const url = new URL(`./${kind}/${id}.json`, import.meta.url);
  if (!existsSync(url)) return null;
  return JSON.parse(readFileSync(url, "utf8")) as Work;
}

function sceneThroughNext(full: Work, stop: number): Pick<StopCheck, "breaths" | "stopLength"> | string {
  const breath = full.breaths[stop];
  if (!breath) return `stop ${stop} is past the book`;
  let start = stop;
  while (start > 0 && full.breaths[start - 1]?.sceneId === breath.sceneId) start -= 1;
  const last = Math.min(full.breaths.length - 1, stop + 1);
  const breaths: { index: number; text: string }[] = [];
  for (let i = start; i <= last; i += 1) {
    const item = full.breaths[i];
    if (!item) return `missing breath ${i}`;
    breaths.push({ index: i, text: item.text });
  }
  return { breaths, stopLength: breath.text.length };
}

function problemCheck(id: string, kind: StopKind, problem: string): StopCheck {
  return {
    id,
    kind,
    stop: -1,
    displayKind: displayKindForForm(shelfWork(id)?.form),
    breaths: [],
    stopLength: 0,
    problem,
  };
}

/**
 * Every opening sit, and every ritual sitting.
 * Reader stops are the ones with a later breath: a passage must not cross them.
 * A stop on the book's last breath is still checked, and omitted from the reader
 * map because nothing follows it.
 */
export function collectStopChecks(): {
  checks: StopCheck[];
  stops: Record<string, readonly number[]>;
  cuts: Record<string, readonly (readonly [number, number])[]>;
} {
  const openingDir = new URL("./openings/", import.meta.url);
  const ids = new Set<string>();
  for (const name of readdirSync(openingDir)) {
    if (name.endsWith(".json")) ids.add(name.slice(0, -".json".length));
  }
  const ritualIds = new Set(ritualBookCards().map((work) => work.id));
  for (const id of ritualIds) ids.add(id);

  const checks: StopCheck[] = [];
  const stopMap = new Map<string, Set<number>>();
  const cutMap = new Map<string, Map<number, number>>();
  const addStop = (id: string, stop: number, length: number) => {
    if (stop < 0 || stop >= length - 1) return;
    const set = stopMap.get(id) ?? new Set<number>();
    set.add(stop);
    stopMap.set(id, set);
  };
  const addCut = (id: string, stop: number, cut: number) => {
    const map = cutMap.get(id) ?? new Map<number, number>();
    map.set(stop, cut);
    cutMap.set(id, map);
  };
  const pushLocated = (id: string, kind: StopKind, full: Work, stop: number, cut: number | undefined, displayKind: DisplayKind) => {
    const slice = sceneThroughNext(full, stop);
    if (typeof slice === "string") {
      checks.push(problemCheck(id, kind, slice));
      return;
    }
    if (cut !== undefined) slice.stopLength = cut;
    checks.push({ id, kind, stop, displayKind, cut, ...slice });
    addStop(id, stop, full.breaths.length);
    if (cut !== undefined) addCut(id, stop, cut);
  };

  for (const id of [...ids].sort((a, b) => a.localeCompare(b))) {
    const full = readWork("texts", id);
    const opening = readWork("openings", id);
    const displayKind = displayKindForForm(shelfWork(id)?.form);
    if (!full) {
      // A retired id keeps an opening file. The live book is the alias target.
      if (opening && !Object.prototype.hasOwnProperty.call(WORK_ID_ALIASES, id)) {
        checks.push(problemCheck(id, "opening", "opening has no book"));
      }
      if (ritualIds.has(id)) checks.push(problemCheck(id, "ritual", "ritual has no book"));
      continue;
    }
    if (full.id !== id) {
      const problem = `book id ${full.id} is not ${id}`;
      if (opening) checks.push(problemCheck(id, "opening", problem));
      if (ritualIds.has(id)) checks.push(problemCheck(id, "ritual", problem));
      continue;
    }

    let openingProblem: string | null = null;
    if (opening) {
      const located = locateOpeningStop(full, opening);
      if ("problem" in located) {
        openingProblem = located.problem;
        checks.push(problemCheck(id, "opening", located.problem));
      } else {
        pushLocated(id, "opening", full, located.stop, located.cut, displayKind);
      }
    }

    if (!ritualIds.has(id)) continue;
    const bounds = ritualSitBounds(full, opening);
    if (bounds.source === "opening") {
      if (openingProblem || !opening) {
        checks.push(problemCheck(id, "ritual", openingProblem ?? "ritual opening missing"));
        continue;
      }
      const located = locateOpeningStop(full, opening);
      if ("problem" in located) checks.push(problemCheck(id, "ritual", located.problem));
      else pushLocated(id, "ritual", full, located.stop, located.cut, displayKind);
      continue;
    }
    pushLocated(id, "ritual", full, bounds.end, undefined, displayKind);
  }

  const stops: Record<string, readonly number[]> = {};
  for (const id of [...stopMap.keys()].sort((a, b) => a.localeCompare(b))) {
    stops[id] = [...stopMap.get(id)!].sort((a, b) => a - b);
  }
  const cuts: Record<string, readonly (readonly [number, number])[]> = {};
  for (const id of [...cutMap.keys()].sort((a, b) => a.localeCompare(b))) {
    cuts[id] = [...cutMap.get(id)!.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, end]) => [index, end] as const);
  }
  return { checks, stops, cuts };
}

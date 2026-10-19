import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { displayKindForForm, type DisplayKind } from "../display-blocks.ts";
import { ensureReaderServer } from "../reader-dev-server.ts";
import { MERGE_STOP_CUTS, MERGE_STOP_INDEX } from "./merge-stop-index.ts";
import { readableIds, shelfWork } from "./shelf.ts";

/**
 * Every lit window at 390×844, for every readable book.
 * Imported pages use the same packer; this is the catalog gate.
 * A fifth painted row fails. A window under two rows fails too.
 * A lone one-row window folds into the window before it, inside the scene.
 * Sit and ritual stops stay in force: the fold does not cross them.
 * The column limit stays a third of the viewport (281px at 844, 266px at 800).
 * SPOTLIGHT_ROWS_WIDTH=1280 runs the desktop column.
 *
 * Not part of the deploy smoke: a full pass is the separate layout gate.
 * Shard with SPOTLIGHT_ROWS_SHARD and SPOTLIGHT_ROWS_SHARDS.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const SHARD = Number(process.env.SPOTLIGHT_ROWS_SHARD ?? "0");
const SHARDS = Number(process.env.SPOTLIGHT_ROWS_SHARDS ?? "1");
const WIDE = process.env.SPOTLIGHT_ROWS_WIDTH === "1280";
const VIEW_W = WIDE ? 1280 : 390;
const VIEW_H = WIDE ? 800 : 844;
const COLUMN_LIMIT = WIDE ? 266 : 281;

type Fail = { id: string; rows: number; index: number; sample: string };

function books() {
  const onDisk = new Set(
    readdirSync(new URL("./texts", import.meta.url))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5)),
  );
  const only = (process.env.SPOTLIGHT_ROWS_ONLY ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return readableIds()
    .filter((id) => onDisk.has(id))
    .sort()
    .filter((id) => (only.length > 0 ? only.includes(id) : true))
    .filter((_, index) => (only.length > 0 ? true : index % SHARDS === SHARD));
}

async function install(page: Page) {
  await page.goto(`${ORIGIN}/salon/read/fantasy?at=0`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    const block = document.querySelector(".breath-block");
    return (
      frame?.getAttribute("data-face-ready") === "yes" &&
      frame?.getAttribute("data-display-blocks") === "ready" &&
      !!block &&
      block.clientWidth > 8
    );
  });
  await page.evaluate(async (paths: { spot: string; disp: string }) => {
    const spot = await import(/* @vite-ignore */ paths.spot);
    const disp = await import(/* @vite-ignore */ paths.disp);
    (globalThis as unknown as { __kit: unknown }).__kit = { spot, disp };
  }, { spot: "/salon/src/lib/spotlight.ts", disp: "/salon/src/lib/display-blocks.ts" });
}

async function countOne(
  page: Page,
  job: {
    id: string;
    form: string;
    stops: readonly number[];
    cuts: readonly (readonly [number, number])[];
    breaths: { text: string; sceneId: string }[];
  },
) {
  return page.evaluate(
    async (input: {
      id: string;
      kind: DisplayKind;
      stops: readonly number[];
      cuts: readonly (readonly [number, number])[];
      breaths: { text: string; sceneId: string }[];
    }) => {
      const kit = (
        globalThis as unknown as {
          __kit: {
            spot: typeof import("../spotlight.ts");
            disp: typeof import("../display-blocks.ts");
          };
        }
      ).__kit;
      const sample = document.querySelector(".breath-block");
      if (!sample) return { id: input.id, error: "no column", windows: 0, over: 0, under: 0, excused: 0, sceneStart: 0, sealed: 0, failures: [], litany: [], limit: 0, line: 0, width: 0 };
      const style = getComputedStyle(sample);
      const viewport = Math.round(window.visualViewport?.height || window.innerHeight);
      const column = {
        width: Math.round(sample.clientWidth),
        viewport,
        limit: Math.max(48, Math.floor(viewport / 3)),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        faceReady: true as const,
      };
      const linePx = kit.disp.displayLinePx(column);
      const measure = (text: string) => kit.disp.measureStyledHeight(text, column);
      const scenes = new Map<string, { index: number; text: string }[]>();
      input.breaths.forEach((breath, index) => {
        const scene = breath.sceneId || "book";
        const list = scenes.get(scene);
        if (list) list.push({ index, text: breath.text ?? "" });
        else scenes.set(scene, [{ index, text: breath.text ?? "" }]);
      });
      const countRows = (text: string, start: number, end: number) =>
        kit.spot.countFocusRows(text, start, end, column, input.kind);
      let windows = 0;
      let over = 0;
      let under = 0;
      let excused = 0;
      let sceneStart = 0;
      let sealed = 0;
      const failures: { rows: number; index: number; sample: string }[] = [];
      const litany: { rows: number; sample: string }[] = [];
      for (const scene of scenes.values()) {
        const groups = kit.spot.spotlightGroups(
          scene,
          measure,
          column.limit,
          linePx,
          input.kind,
          input.stops.length ? new Set(input.stops) : undefined,
          input.cuts.length ? new Map(input.cuts) : undefined,
          countRows,
        );
        let previous = "";
        for (const group of groups) {
          windows += 1;
          let rows = 0;
          for (const part of group.parts) {
            const text = scene.find((breath) => breath.index === part.index)?.text ?? "";
            rows += kit.spot.paintFocusRows(text, part.start, part.end, column, input.kind);
          }
          if (input.id === "fantasy" && group.sample.includes("The Litany ended")) {
            litany.push({ rows, sample: group.sample.replace(/\s+/g, " ").trim().slice(0, 180) });
          }
          if (rows > 4) {
            over += 1;
            if (failures.length < 8) {
              failures.push({
                rows,
                index: group.index,
                sample: group.sample.replace(/\s+/g, " ").trim().slice(0, 110),
              });
            }
          }
          if (rows >= 2) {
            previous = group.sample.replace(/\s+/g, " ").trim().slice(0, 80);
            continue;
          }
          under += 1;
          if (previous === "") sceneStart += 1;
          else sealed += 1;
          if (failures.length < 8) {
            failures.push({
              rows,
              index: group.index,
              sample: `${previous === "" ? "scene-start" : "sealed"} ${group.sample.replace(/\s+/g, " ").trim().slice(0, 90)}`,
            });
          }
          previous = group.sample.replace(/\s+/g, " ").trim().slice(0, 80);
        }
      }
      return {
        id: input.id,
        error: "",
        windows,
        over,
        under,
        excused,
        sceneStart,
        sealed,
        failures,
        litany,
        limit: column.limit,
        line: linePx,
        width: column.width,
      };
    },
    {
      id: job.id,
      kind: displayKindForForm(job.form),
      stops: job.stops,
      cuts: job.cuts,
      breaths: job.breaths,
    },
  );
}

test("no lit window paints more than four rows at 390x844", { timeout: 5_400_000 }, async () => {
  const ids = books();
  await ensureReaderServer();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const failures: Fail[] = [];
  let windows = 0;
  let over = 0;
  let under = 0;
  let excused = 0;
  let sceneStart = 0;
  let sealed = 0;
  let limit = 0;
  let line = 0;
  let width = 0;
  const litany: { rows: number; sample: string }[] = [];
  const started = Date.now();
  try {
    const page = await browser.newPage({
      viewport: { width: VIEW_W, height: VIEW_H },
      serviceWorkers: "block",
    });
    page.setDefaultTimeout(0);
    await install(page);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i]!;
      const work = JSON.parse(readFileSync(new URL(`./texts/${id}.json`, import.meta.url), "utf8")) as {
        breaths?: { text?: string; sceneId?: string }[];
      };
      const result = await countOne(page, {
        id,
        form: shelfWork(id)?.form ?? "novel",
        stops: MERGE_STOP_INDEX[id] ?? [],
        cuts: MERGE_STOP_CUTS[id] ?? [],
        breaths: (work.breaths ?? []).map((breath) => ({
          text: breath.text ?? "",
          sceneId: breath.sceneId ?? "book",
        })),
      });
      if (result.error) failures.push({ id, rows: 0, index: -1, sample: result.error });
      windows += result.windows;
      over += result.over;
      under += result.under;
      excused += result.excused;
      sceneStart += result.sceneStart;
      sealed += result.sealed;
      limit = result.limit;
      line = result.line;
      width = result.width;
      for (const fail of result.failures) failures.push({ id, ...fail });
      litany.push(...result.litany);
      if ((i + 1) % 25 === 0 || i + 1 === ids.length) {
        console.log(
          `spotlight rows shard ${SHARD}/${SHARDS} ${i + 1}/${ids.length} over ${over} under ${under} scene-start ${sceneStart} sealed ${sealed} windows ${windows} ${((Date.now() - started) / 1000).toFixed(0)}s`,
        );
      }
    }
  } finally {
    await browser.close();
  }

  console.log(
    `spotlight rows: shard ${SHARD}/${SHARDS} books ${ids.length} windows ${windows} over ${over} under ${under} scene-start ${sceneStart} sealed ${sealed} width ${width} limit ${limit} line ${line}; failures ${failures.length}`,
  );
  if (litany.length > 0) console.log(`spotlight rows litany: ${JSON.stringify(litany)}`);
  assert.equal(limit, COLUMN_LIMIT, "the column is still a third of the viewport");
  assert.ok(line * 4 <= limit, "four rows stay inside the column cap");
  assert.deepEqual(
    failures.map((fail) => `${fail.id}#${fail.index} ${fail.rows} ${fail.sample}`),
    [],
  );
});

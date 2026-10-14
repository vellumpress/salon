import assert from "node:assert/strict";
import test from "node:test";
import { chromium, type Page } from "playwright";
import type { DisplayKind } from "../display-blocks.ts";
import { ensureReaderServer } from "../reader-dev-server.ts";
import { collectStopChecks, type StopKind } from "./merge-stops.ts";
import { MERGE_STOP_CUTS, MERGE_STOP_INDEX } from "./merge-stop-index.ts";
import { installMergeStop, measureStopBatch, readColumnMetrics } from "./merge-stop-layout-page.mjs";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

type ColumnMetrics = {
  name: string;
  width: number;
  viewport: number;
  limit: number;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  faceReady: true;
};

type Job = {
  id: string;
  stop: number;
  displayKind: DisplayKind;
  breaths: { index: number; text: string }[];
  stopLength: number;
  kinds: StopKind[];
  stops: number[];
  cuts: readonly (readonly [number, number])[];
};

function jobsFrom(checks: ReturnType<typeof collectStopChecks>["checks"]): Job[] {
  const jobs = new Map<string, Job>();
  for (const check of checks) {
    if (check.problem) continue;
    const key = `${check.id}:${check.stop}`;
    const existing = jobs.get(key);
    if (existing) {
      existing.kinds.push(check.kind);
      continue;
    }
    const stops = new Set<number>(MERGE_STOP_INDEX[check.id] ?? []);
    stops.add(check.stop);
    jobs.set(key, {
      id: check.id,
      stop: check.stop,
      displayKind: check.displayKind,
      breaths: check.breaths,
      stopLength: check.stopLength,
      kinds: [check.kind],
      stops: [...stops].sort((a, b) => a - b),
      cuts: MERGE_STOP_CUTS[check.id] ?? [],
    });
  }
  return [...jobs.values()];
}

function chunksOf(jobs: Job[]) {
  const chunks: Job[][] = [];
  let batch: Job[] = [];
  let breaths = 0;
  for (const job of jobs) {
    if (batch.length > 0 && (batch.length >= 12 || breaths + job.breaths.length > 2200)) {
      chunks.push(batch);
      batch = [];
      breaths = 0;
    }
    batch.push(job);
    breaths += job.breaths.length;
  }
  if (batch.length > 0) chunks.push(batch);
  return chunks;
}

async function waitColumn(page: Page) {
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
}

async function readColumn(page: Page, name: string): Promise<ColumnMetrics> {
  await waitColumn(page);
  const metrics = await page.evaluate(readColumnMetrics);
  assert.ok(metrics, "the reader column has no measured breath");
  assert.ok(metrics.width > 8);
  return { ...metrics, name, faceReady: true };
}

test("every opening sit and ritual end stops the last lit passage at 390x844 and 1280x800", { timeout: 600_000 }, async () => {
  const { checks } = collectStopChecks();
  const unplaced = checks.filter((check) => check.problem);
  const openings = checks.filter((check) => check.kind === "opening" && !check.problem).length;
  const rituals = checks.filter((check) => check.kind === "ritual" && !check.problem).length;
  const jobs = jobsFrom(checks);
  await ensureReaderServer();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const failures: { viewport: string; id: string; kinds: string; stop: number; reason: string }[] = [];
  const columns: ColumnMetrics[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    page.setDefaultTimeout(45_000);
    await page.goto(`${ORIGIN}/salon/read/garman-and-worse?at=0`, { waitUntil: "domcontentloaded" });
    for (const view of VIEWPORTS) {
      await page.setViewportSize({ width: view.width, height: view.height });
      columns.push(await readColumn(page, view.name));
    }
    page.setDefaultTimeout(0);
    await page.evaluate(installMergeStop, {
      spot: "/salon/src/lib/spotlight.ts",
      disp: "/salon/src/lib/display-blocks.ts",
    });
    for (const column of columns) {
      const batches = chunksOf(jobs);
      for (let i = 0; i < batches.length; i += 1) {
        const batch = batches[i]!;
        const found = await page.evaluate(measureStopBatch, { batch, metrics: column });
        for (const reason of found) {
          failures.push({
            viewport: column.name,
            id: reason.id,
            kinds: reason.kinds.join("+"),
            stop: reason.stop,
            reason: reason.reason,
          });
        }
        if ((i + 1) % 20 === 0 || i + 1 === batches.length) {
          console.log(`${column.name} ${i + 1}/${batches.length} batches`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const columnLog = columns
    .map((column) => `${column.name} width ${column.width} limit ${column.limit} font ${column.fontSize} line ${column.lineHeight}`)
    .join("; ");
  console.log(
    `merge-stop layout: ${openings} opening sits, ${rituals} ritual ends, ${jobs.length} passages, ${unplaced.length} unplaced (${unplaced.map((check) => `${check.kind} ${check.id}`).join(", ")}); ${columnLog}; failures ${failures.length}`,
  );
  assert.deepEqual(failures, []);
});

import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, devices, type Browser, type Page } from "playwright";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const LOCAL_ORIGIN = !process.env.READER_ORIGIN;
const BACKS = 32;
const PHONE = devices["iPhone 12"];

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** A small text PDF. Each line is one sentence so the import reader can step. */
export function fixturePdf(count: number): Uint8Array {
  const lines: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`Imported sentence ${String(i).padStart(2, "0")} ends here.`);
  }
  const perPage = 20;
  const streams: string[] = [];
  for (let p = 0; p < lines.length; p += perPage) {
    const chunk = lines.slice(p, p + perPage);
    const ops = ["BT", "/F1 12 Tf", "72 740 Td"];
    chunk.forEach((line, i) => {
      if (i > 0) ops.push("0 -28 Td");
      ops.push(`(${pdfEscape(line)}) Tj`);
    });
    ops.push("ET");
    streams.push(ops.join("\n"));
  }

  const chunks: { id: number; body: string }[] = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 3, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
  ];
  const kids: number[] = [];
  let id = 4;
  for (const stream of streams) {
    const pageId = id;
    const contentId = id + 1;
    id += 2;
    kids.push(pageId);
    chunks.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    });
    chunks.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
  }
  chunks.push({
    id: 2,
    body: `<< /Type /Pages /Kids [${kids.map((kid) => `${kid} 0 R`).join(" ")}] /Count ${kids.length} >>`,
  });
  chunks.sort((a, b) => a.id - b.id);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of chunks) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xrefAt = pdf.length;
  const size = chunks.length + 1;
  pdf += `xref\n0 ${size}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < size; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function mirthSceneStart() {
  const work = JSON.parse(
    readFileSync(new URL("./catalog/texts/the-house-of-mirth.json", import.meta.url), "utf8"),
  ) as { breaths: { sceneId: string }[] };
  for (let i = 1; i < work.breaths.length; i += 1) {
    if (work.breaths[i]?.sceneId !== work.breaths[i - 1]?.sceneId) return i;
  }
  throw new Error("House of Mirth has no scene boundary");
}

async function launchBrowser(): Promise<Browser> {
  const args = ["--no-sandbox"];
  for (const executablePath of CHROME_CANDIDATES) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ executablePath, args });
    } catch {
      /* try the next browser */
    }
  }
  try {
    return await chromium.launch({ args });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    execFileSync("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit",
      timeout: 180_000,
    });
    return await chromium.launch({ args });
  }
}

async function healthy() {
  try {
    const res = await fetch(`${ORIGIN}/salon/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

async function ensureServer() {
  if (!LOCAL_ORIGIN) return async () => {};
  if (await healthy()) return async () => {};
  const log = openSync("/tmp/reader-back-tap-dev.log", "a");
  const child: ChildProcess = spawn("npm", ["run", "dev"], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", log, log],
    env: process.env,
  });
  child.unref();
  const failed = new Promise<never>((_, reject) => {
    child.once("error", (error) => {
      reject(new Error(`could not start the reader (${repoRoot}): ${error.message}`));
    });
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const ready = await Promise.race([
      healthy().then((ok) => (ok ? "up" : "down")),
      failed,
    ]);
    if (ready === "up") {
      return async () => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`reader dev server did not start from ${repoRoot}`);
}

async function phonePage(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  const viewport = page.viewportSize();
  assert.equal(viewport?.width, 390);
  assert.equal(viewport?.height, 844);
  const touchPoints = await page.evaluate(() => navigator.maxTouchPoints);
  assert.ok(touchPoints > 0, "viewport is not touch-capable");
  await page.addInitScript(() => localStorage.clear());
  return page;
}

type Spot = {
  index: number;
  look: number;
  x: number;
  justAbove: number;
  middle: number;
  nearTop: number;
  onLine: number;
  below: number;
  focusTop: number;
  hostTop: number;
  bar: string | null;
};

async function spots(page: Page): Promise<Spot> {
  const spot = await page.evaluate(() => {
    const host = document.querySelector("[data-reader-text]");
    const line = document.querySelector(".breath-now");
    const frame = document.querySelector("[data-breath-index]");
    if (!host || !line || !frame) return null;
    const h = host.getBoundingClientRect();
    const row = line.getBoundingClientRect();
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    const preview = row.bottom + 28;
    const aboveFooter = !footer || preview < footer.top - 6;
    return {
      index: Number(frame.getAttribute("data-breath-index")),
      look: document.querySelectorAll(".lookback-slot .look-line").length,
      x: Math.round(h.left + h.width * 0.72),
      justAbove: Math.round(row.top - 10),
      middle: Math.round(h.top + (row.top - h.top) / 2),
      nearTop: Math.round(h.top + 14),
      onLine: Math.round(row.top + Math.min(12, Math.max(4, row.height / 2))),
      below: Math.round(aboveFooter ? preview : row.top + 8),
      focusTop: row.top,
      hostTop: h.top,
      bar: document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") ?? null,
    };
  });
  assert.ok(spot, "focus line missing");
  assert.ok(spot.justAbove < spot.focusTop, "just-above spot is not above the focus line");
  assert.ok(spot.middle < spot.focusTop, "middle spot is not above the focus line");
  assert.ok(spot.nearTop < spot.focusTop, "top spot is not above the focus line");
  assert.ok(spot.nearTop >= spot.hostTop, "top spot is outside the reading column");
  return spot;
}

async function breathIndex(page: Page) {
  const raw = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
  return Number(raw);
}

async function frames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function settle(page: Page, expected: number) {
  await page.waitForFunction(
    (want) =>
      document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
      String(want),
    expected,
    { timeout: 4000 },
  );
  // A compatibility click is swallowed whenever it arrives. Two frames let a
  // click already queued in this turn run; the index, not a clock, is the check.
  await frames(page);
  assert.equal(await breathIndex(page), expected);
  const bar = await page.locator("[data-reader-bar]").getAttribute("data-reader-bar");
  assert.equal(bar, "closed", "a page tap opened Keep/Send");
}

async function tapBack(page: Page, where: "justAbove" | "middle" | "nearTop") {
  const spot = await spots(page);
  const y = spot[where];
  const hit = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return Boolean(el?.closest("[data-reader-text]"));
    },
    { x: spot.x, y },
  );
  assert.equal(hit, true, `${where} tap is not on the reading column`);
  const next = spot.index - 1;
  await page.touchscreen.tap(spot.x, y);
  await settle(page, next);
}

async function backSeries(
  page: Page,
  where: "justAbove" | "middle" | "nearTop",
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    await tapBack(page, where);
  }
}

async function openCatalog(page: Page, at: number) {
  await page.goto(`${ORIGIN}/salon/read/the-house-of-mirth?at=${at}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator(".breath-now").waitFor();
  await page.waitForFunction(
    (want) => {
      const frame = document.querySelector(".reader-frame");
      const full = frame?.getAttribute("data-bound") === "full";
      const index = frame?.getAttribute("data-breath-index");
      const gate = document.querySelector(".veil");
      return full && index === String(want) && !gate;
    },
    at,
    { timeout: 30_000 },
  );
}

test(
  "iPhone taps above the focus go back one sentence on a catalog sit",
  { timeout: 360_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const page = await phonePage(browser);
      const boundary = mirthSceneStart();
      await openCatalog(page, 80);
      await backSeries(page, "justAbove", BACKS);
      assert.equal(await breathIndex(page), 80 - BACKS);

      await openCatalog(page, 80);
      await backSeries(page, "middle", BACKS);
      assert.equal(await breathIndex(page), 80 - BACKS);

      await openCatalog(page, boundary);
      const opened = await spots(page);
      assert.equal(opened.look, 0, "a chapter's first sentence still shows already-read lines");
      assert.equal(opened.index, boundary);
      await backSeries(page, "nearTop", BACKS);
      assert.equal(await breathIndex(page), boundary - BACKS);

      await openCatalog(page, 0);
      const first = await spots(page);
      assert.equal(first.look, 0);
      await page.touchscreen.tap(first.x, first.justAbove);
      await frames(page);
      assert.equal(await breathIndex(page), 0, "back from the first sentence moved");
      assert.equal(
        await page.locator("[data-reader-bar]").getAttribute("data-reader-bar"),
        "closed",
      );

      await openCatalog(page, 24);
      for (let i = 0; i < 8; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.x, spot.onLine);
        await settle(page, spot.index + 1);
      }
      const beforePreview = await spots(page);
      await page.touchscreen.tap(beforePreview.x, beforePreview.below);
      await settle(page, beforePreview.index + 1);

      await openCatalog(page, 40);
      const rapidStart = 40;
      for (let i = 0; i < 12; i += 1) {
        const spot = await spots(page);
        // The top of the column stays above the focus line while it slides.
        await page.touchscreen.tap(spot.x, spot.nearTop);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          rapidStart - i - 1,
          { timeout: 4000 },
        );
      }
      await frames(page);
      assert.equal(await breathIndex(page), rapidStart - 12, "rapid back taps did not all land");

      const beforeDouble = await breathIndex(page);
      const spot = await spots(page);
      await page.evaluate(
        ({ x, y }) => {
          const host = document.querySelector("[data-reader-text]");
          if (!host) throw new Error("missing reading column");
          const base = {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 1,
            button: 0,
            pointerType: "touch",
            isPrimary: true,
          };
          host.dispatchEvent(new PointerEvent("pointerdown", base));
          host.dispatchEvent(new PointerEvent("pointerup", base));
          host.dispatchEvent(new MouseEvent("click", base));
        },
        { x: spot.x, y: spot.justAbove },
      );
      await settle(page, beforeDouble - 1);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "iPhone taps above the focus go back one sentence in an imported PDF",
  { timeout: 360_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const page = await phonePage(browser);
      await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="file"]').setInputFiles({
        name: "fixture.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(fixturePdf(80)),
      });
      await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
      const sit = page.getByRole("button", { name: "Sit", exact: true });
      const alone = page.getByRole("button", { name: "Alone", exact: true });
      await sit.or(alone).first().waitFor();
      await sit.or(alone).first().click();
      await page.locator("[data-breath-index]").waitFor();
      await page.locator(".breath-now").waitFor();

      const start = await spots(page);
      assert.equal(start.index, 0);
      assert.equal(start.look, 0);
      await page.touchscreen.tap(start.x, start.justAbove);
      await frames(page);
      assert.equal(await breathIndex(page), 0, "back from the first imported sentence moved");

      for (let i = 0; i < 70; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.x, spot.onLine);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          spot.index + 1,
          { timeout: 4000 },
        );
      }
      await frames(page);
      assert.equal(await breathIndex(page), 70);

      await backSeries(page, "justAbove", BACKS);
      assert.equal(await breathIndex(page), 70 - BACKS);

      for (let i = 0; i < BACKS; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.x, spot.onLine);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          spot.index + 1,
          { timeout: 4000 },
        );
      }
      assert.equal(await breathIndex(page), 70);
      await backSeries(page, "middle", BACKS);

      for (let i = 0; i < BACKS; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.x, spot.onLine);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          spot.index + 1,
          { timeout: 4000 },
        );
      }
      // Part breaks every 20 sentences. Step onto one, then back across it.
      // The top of the column stays a back tap while the line is still sliding.
      while ((await breathIndex(page)) > 40) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.x, spot.nearTop);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          spot.index - 1,
          { timeout: 4000 },
        );
      }
      const edge = await spots(page);
      assert.equal(edge.index, 40);
      assert.equal(edge.look, 0, "first sentence of an imported part still shows read lines");
      await backSeries(page, "nearTop", BACKS);
      assert.equal(await breathIndex(page), 40 - BACKS);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

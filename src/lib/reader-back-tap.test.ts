import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { chromium, devices, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
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

function ensureServer() {
  return ensureReaderServer();
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
  backX: number;
  forwardX: number;
  high: number;
  middle: number;
  low: number;
  onLine: number;
  below: number;
  hostLeft: number;
  hostWidth: number;
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
    const limit = Math.min(h.bottom - 8, (footer?.top ?? h.bottom) - 12);
    const preview = row.bottom + 28;
    const aboveFooter = !footer || preview < footer.top - 6;
    return {
      index: Number(frame.getAttribute("data-breath-index")),
      look: document.querySelectorAll(".lookback-slot .look-line").length,
      backX: Math.round(h.left + Math.max(12, h.width * 0.12)),
      forwardX: Math.round(h.left + h.width * 0.72),
      high: Math.round(Math.min(limit - 1, h.top + 18)),
      middle: Math.round(Math.min(limit - 1, h.top + h.height * 0.45)),
      low: Math.round(Math.min(limit - 1, h.top + h.height * 0.78)),
      onLine: Math.round(Math.min(limit - 1, row.top + Math.min(12, Math.max(4, row.height / 2)))),
      below: Math.round(Math.min(limit - 1, aboveFooter ? preview : row.top + 8)),
      hostLeft: h.left,
      hostWidth: h.width,
      bar: document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") ?? null,
    };
  });
  assert.ok(spot, "focus line missing");
  assert.ok(spot.backX < spot.hostLeft + spot.hostWidth / 3, "back spot is not in the left third");
  assert.ok(spot.forwardX >= spot.hostLeft + spot.hostWidth / 3, "forward spot is still on the left");
  assert.ok(spot.high < spot.middle && spot.middle < spot.low, "left taps do not cover the column");
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

async function lineSettled(page: Page) {
  await page.waitForFunction(
    () => {
      const line = document.querySelector(".breath-now");
      if (!line) return false;
      const track = document.querySelector(".center-track");
      const animating =
        track instanceof Element &&
        track.getAnimations().some((anim) => anim.playState === "running");
      const top = String(Math.round(line.getBoundingClientRect().top));
      const prev = line.getAttribute("data-settled-top");
      const count = Number(line.getAttribute("data-settled-n") ?? "0");
      const same = prev === top && !animating;
      line.setAttribute("data-settled-top", top);
      line.setAttribute("data-settled-n", same ? String(count + 1) : "0");
      return same && count + 1 >= 3;
    },
    { timeout: 4000 },
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
  // The sentence is still sliding. A point taken just above it moves with
  // the line; wait until that top stops, not for a fixed pause.
  await lineSettled(page);
  assert.equal(await breathIndex(page), expected);
  const bar = await page.locator("[data-reader-bar]").getAttribute("data-reader-bar");
  assert.equal(bar, "closed", "a page tap opened Keep/Send");
}

async function tapBack(page: Page, where: "high" | "middle" | "low") {
  const spot = await spots(page);
  const y = spot[where];
  const hit = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest("[data-turn]")?.getAttribute("data-turn") ?? "";
    },
    { x: spot.backX, y },
  );
  assert.equal(hit, "prev", `${where} tap is not the back side`);
  const next = spot.index - 1;
  await page.touchscreen.tap(spot.backX, y);
  await settle(page, next);
}

async function backSeries(page: Page, where: "high" | "middle" | "low", count: number) {
  for (let i = 0; i < count; i += 1) {
    await tapBack(page, where);
  }
}

async function openCatalog(page: Page, at: number) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
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
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureServer();
    }
  }
  throw last;
}

test(
  "Chromium: the left third goes back one sentence on a catalog sit",
  { timeout: 360_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const page = await phonePage(browser);
      const boundary = mirthSceneStart();
      await openCatalog(page, 80);
      await backSeries(page, "high", BACKS);
      assert.equal(await breathIndex(page), 80 - BACKS);

      await openCatalog(page, 80);
      await backSeries(page, "middle", BACKS);
      assert.equal(await breathIndex(page), 80 - BACKS);

      await openCatalog(page, boundary);
      const opened = await spots(page);
      assert.equal(opened.look, 0, "a chapter's first sentence still shows already-read lines");
      assert.equal(opened.index, boundary);
      await backSeries(page, "low", BACKS);
      assert.equal(await breathIndex(page), boundary - BACKS);

      await openCatalog(page, 0);
      const first = await spots(page);
      assert.equal(first.look, 0);
      await page.touchscreen.tap(first.backX, first.high);
      await frames(page);
      assert.equal(await breathIndex(page), 0, "back from the first sentence moved");
      assert.equal(
        await page.locator("[data-reader-bar]").getAttribute("data-reader-bar"),
        "closed",
      );

      await openCatalog(page, 24);
      for (let i = 0; i < 8; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.forwardX, spot.onLine);
        await settle(page, spot.index + 1);
      }
      const beforePreview = await spots(page);
      await page.touchscreen.tap(beforePreview.forwardX, beforePreview.below);
      await settle(page, beforePreview.index + 1);

      await openCatalog(page, 40);
      const rapidStart = 40;
      for (let i = 0; i < 12; i += 1) {
        const spot = await spots(page);
        // The left third stays back while the sentence is still sliding.
        await page.touchscreen.tap(spot.backX, spot.low);
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

      await lineSettled(page);
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
        { x: spot.backX, y: spot.high },
      );
      await settle(page, beforeDouble - 1);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "Chromium: twenty left-side taps each go back one, and the right side above the sentence goes forward",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const page = await phonePage(browser);
      await openCatalog(page, 24);
      const opened = await spots(page);
      const above = await page.evaluate(() => {
        const host = document.querySelector("[data-reader-text]");
        if (!host) return null;
        const box = host.getBoundingClientRect();
        return {
          x: Math.round(box.left + box.width * 0.72),
          y: Math.round(box.top + 18),
        };
      });
      assert.ok(above, "reading column missing");
      assert.ok(above.x >= opened.hostLeft + opened.hostWidth / 3);
      const forwardHit = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-turn]")?.getAttribute("data-turn") ?? "",
        above,
      );
      assert.equal(forwardHit, "next", "right side above the sentence is not forward");
      await page.touchscreen.tap(above.x, above.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "25",
        undefined,
        { timeout: 4000 },
      );

      for (let i = 0; i < 20; i += 1) {
        await spots(page);
        const xs = [0.08, 0.18, 0.28];
        const ys = [0.12, 0.28, 0.46, 0.64, 0.82];
        const point = await page.evaluate(
          ({ xi, yi }) => {
            const host = document.querySelector("[data-reader-text]");
            if (!host) return null;
            const box = host.getBoundingClientRect();
            const footer = document.querySelector("footer")?.getBoundingClientRect();
            const limit = Math.min(box.bottom - 8, (footer?.top ?? box.bottom) - 12);
            const x = Math.round(box.left + box.width * xi);
            const y = Math.round(Math.min(limit - 1, box.top + box.height * yi));
            const hit = document.elementFromPoint(x, y)?.closest("[data-turn]")?.getAttribute("data-turn") ?? "";
            return { x, y, hit, split: box.left + box.width / 3 };
          },
          { xi: xs[i % xs.length]!, yi: ys[i % ys.length]! },
        );
        assert.ok(point, "reading column missing");
        assert.ok(point.x < point.split, `tap ${i} left the left third`);
        assert.equal(point.hit, "prev", `tap ${i} is not the back side`);
        await page.touchscreen.tap(point.x, point.y);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === String(want),
          24 - i,
          { timeout: 4000 },
        );
      }
      assert.equal(await breathIndex(page), 5);

      await page.goto(`${ORIGIN}/salon/read/lamia?at=5`, { waitUntil: "domcontentloaded" });
      await page.locator(".breath-now").waitFor();
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "5",
        undefined,
        { timeout: 30_000 },
      );
      const tall = await page.evaluate(() => {
        const host = document.querySelector("[data-reader-text]");
        const slot = document.querySelector(".breath-slot");
        if (!(host instanceof HTMLElement) || !(slot instanceof HTMLElement)) return null;
        const box = host.getBoundingClientRect();
        return {
          overflows: slot.scrollHeight - slot.clientHeight > 24,
          scrollTop: slot.scrollTop,
          x: Math.round(box.left + box.width * 0.7),
          y: Math.round(box.top + box.height * 0.72),
          backX: Math.round(box.left + box.width * 0.12),
          backY: Math.round(box.top + box.height * 0.72),
        };
      });
      assert.ok(tall, "lamia column missing");
      assert.equal(tall.overflows, true, "lamia 5 is not taller than the column");
      assert.ok(tall.scrollTop < 4);
      await page.evaluate(({ x, y }) => {
        const host = document.querySelector("[data-reader-text]");
        if (!host) throw new Error("missing reading column");
        const fire = (type: string, py: number) => {
          host.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: py,
              pointerId: 9,
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pointerType: "touch",
              isPrimary: true,
            }),
          );
        };
        fire("pointerdown", y);
        fire("pointermove", y - 40);
        fire("pointermove", y - 90);
        fire("pointerup", y - 90);
      }, { x: tall.x, y: tall.y });
      const scrolled = await page.evaluate(() => {
        const slot = document.querySelector(".breath-slot");
        const frame = document.querySelector("[data-breath-index]");
        return {
          index: frame?.getAttribute("data-breath-index"),
          scrollTop: slot instanceof HTMLElement ? slot.scrollTop : 0,
        };
      });
      assert.equal(scrolled.index, "5");
      assert.ok(scrolled.scrollTop > 20, "drag did not leave the top of the sentence");
      await page.touchscreen.tap(tall.backX, tall.backY);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "4",
        undefined,
        { timeout: 4000 },
      );
      const landed = await page.evaluate(() => {
        const slot = document.querySelector(".breath-slot");
        return slot instanceof HTMLElement ? slot.scrollTop : 99;
      });
      assert.equal(await breathIndex(page), 4);
      assert.ok(landed < 4, "the previous sentence did not open at its start");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "Chromium: the left third goes back one sentence in an imported PDF",
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
      await page.touchscreen.tap(start.backX, start.high);
      await frames(page);
      assert.equal(await breathIndex(page), 0, "back from the first imported sentence moved");

      for (let i = 0; i < 70; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.forwardX, spot.onLine);
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
      await lineSettled(page);

      await backSeries(page, "high", BACKS);
      assert.equal(await breathIndex(page), 70 - BACKS);

      for (let i = 0; i < BACKS; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.forwardX, spot.onLine);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          spot.index + 1,
          { timeout: 4000 },
        );
      }
      assert.equal(await breathIndex(page), 70);
      await lineSettled(page);
      await backSeries(page, "middle", BACKS);

      for (let i = 0; i < BACKS; i += 1) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.forwardX, spot.onLine);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
            String(want),
          spot.index + 1,
          { timeout: 4000 },
        );
      }
      // Part breaks every 20 sentences. Step onto one, then back across it.
      // The left third stays a back tap while the line is still sliding.
      while ((await breathIndex(page)) > 40) {
        const spot = await spots(page);
        await page.touchscreen.tap(spot.backX, spot.low);
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
      await backSeries(page, "low", BACKS);
      assert.equal(await breathIndex(page), 40 - BACKS);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

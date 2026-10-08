import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";
import { READER_PHONE_VIEWPORT } from "./reader-chrome.ts";

const ORIGIN = "http://127.0.0.1:8080";
const READER = `${ORIGIN}/salon/read/passing?at=4`;

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

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

async function bar(page: Page) {
  return page.evaluate(() => {
    const fade = document.querySelector("footer .chrome-fade");
    const glass = document.querySelector(".reader-glass");
    const fadeStyle = fade ? getComputedStyle(fade) : null;
    const glassStyle = glass ? getComputedStyle(glass) : null;
    const glassBox = glass?.getBoundingClientRect();
    return {
      state: document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar"),
      opacity: fadeStyle?.opacity ?? null,
      glassOpacity: glassStyle?.opacity ?? null,
      glassPointer: glassStyle?.pointerEvents ?? null,
      glassW: glassBox ? Math.round(glassBox.width) : 0,
      glassH: glassBox ? Math.round(glassBox.height) : 0,
      text: document.querySelector(".breath-now")?.textContent ?? "",
      expanded: glass?.getAttribute("aria-expanded"),
    };
  });
}

test(
  "on a touch-sized phone, page taps never open the bar and the hourglass toggles it",
  { timeout: 240_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext({
        viewport: {
          width: READER_PHONE_VIEWPORT.width,
          height: READER_PHONE_VIEWPORT.height,
        },
        hasTouch: READER_PHONE_VIEWPORT.hasTouch,
        isMobile: READER_PHONE_VIEWPORT.isMobile,
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      const viewport = page.viewportSize();
      assert.ok(viewport, "missing viewport");
      assert.equal(viewport.width, 390);
      assert.equal(viewport.height, 844);
      assert.ok(viewport.width <= 430 && viewport.width >= 320, "not a touch-sized width");
      assert.ok(viewport.height >= 700, "not a phone height");
      const touchPoints = await page.evaluate(() => navigator.maxTouchPoints);
      assert.ok(touchPoints > 0, "viewport is not touch-capable");

      await page.addInitScript(() => localStorage.clear());
      await page.goto(READER, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Next sentence" }).waitFor();
      // The opening paints first. The full bind can replace a sentence's
      // apostrophes, so snapshot only after that bind has landed.
      await page.waitForFunction(
        () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
      );

      const opened = await bar(page);
      assert.equal(opened.state, "closed");
      assert.equal(opened.opacity, "0");
      assert.equal(opened.glassOpacity, "1");
      assert.notEqual(opened.glassPointer, "none");
      assert.ok(opened.glassW >= 44 && opened.glassH >= 44, "hourglass hit target under 44px");
      assert.ok(opened.text.length > 0);

      await page.getByRole("button", { name: "Next sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        opened.text,
      );
      const afterNext = await bar(page);
      assert.notEqual(afterNext.text, opened.text);
      assert.equal(afterNext.state, "closed", "forward page tap opened the bar");
      assert.equal(afterNext.opacity, "0");
      assert.equal(afterNext.glassOpacity, "1");

      await page.getByRole("button", { name: "Previous sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        afterNext.text,
      );
      const afterPrev = await bar(page);
      assert.equal(afterPrev.text, opened.text);
      assert.equal(afterPrev.state, "closed", "back page tap opened the bar");
      assert.equal(afterPrev.opacity, "0");

      await page.locator(".reader-glass").click();
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
      );
      const shown = await bar(page);
      assert.equal(shown.state, "open", "hourglass tap did not open the bar");
      assert.equal(shown.opacity, "1");
      assert.equal(shown.expanded, "true");
      assert.equal(shown.text, opened.text, "hourglass tap turned the page");
      await page.getByRole("button", { name: "Send" }).click();
      await page.getByPlaceholder("Friend's phone — for later").waitFor();
      await page.getByRole("button", { name: "Dismiss" }).click();
      await page.getByPlaceholder("Friend's phone — for later").waitFor({ state: "detached" });
      assert.equal((await bar(page)).state, "open", "Send closed the bar");
      await page.getByRole("button", { name: "Keep" }).click();
      await page.waitForFunction(() => {
        const keep = [...document.querySelectorAll("button")].find((node) => node.textContent === "Keep");
        return keep?.className.includes("bg-red") ?? false;
      });
      assert.equal((await bar(page)).state, "open", "Keep closed the bar");

      await page.locator(".reader-glass").click();
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "closed",
      );
      const hidden = await bar(page);
      assert.equal(hidden.state, "closed", "second hourglass tap left the bar open");
      assert.equal(hidden.opacity, "0");
      assert.equal(hidden.expanded, "false");
      assert.equal(hidden.glassOpacity, "1");
      assert.equal(hidden.text, opened.text, "closing the bar turned the page");

      await page.locator(".reader-glass").click();
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
      );
      const again = await bar(page);
      await page.getByRole("button", { name: "Next sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        again.text,
      );
      const afterOutside = await bar(page);
      assert.notEqual(afterOutside.text, again.text, "outside tap did not turn the page");
      assert.equal(afterOutside.state, "closed", "outside tap left the bar open");
      assert.equal(afterOutside.opacity, "0");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

async function focusInPane(page: Page) {
  await page.getByRole("button", { name: "Next sentence" }).waitFor();
  await page.waitForFunction(
    () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
  );
  await page.waitForFunction(() => {
    const pane = document.querySelector(".reading-pane");
    const line = document.querySelector(".breath-now");
    if (!pane || !line) return false;
    const box = pane.getBoundingClientRect();
    const row = line.getBoundingClientRect();
    return row.height > 8 && row.top > box.top + 24 && row.bottom < box.bottom - 8;
  });
}

test(
  "a touch on the already-read lines goes back and does not open the bar",
  { timeout: 240_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext({
        viewport: {
          width: READER_PHONE_VIEWPORT.width,
          height: READER_PHONE_VIEWPORT.height,
        },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.addInitScript(() => localStorage.clear());
      await page.goto(READER, { waitUntil: "domcontentloaded" });
      await focusInPane(page);

      const spot = await page.evaluate(() => {
        const line = document.querySelector(".breath-now");
        const pane = document.querySelector(".reading-pane");
        if (!line || !pane) return null;
        const row = line.getBoundingClientRect();
        const upcoming = [...document.querySelectorAll(".upcoming-slot .look-line")];
        const lowest = upcoming.reduce(
          (max, el) => Math.max(max, el.getBoundingClientRect().bottom),
          0,
        );
        const glass = document.querySelector(".reader-glass")?.getBoundingClientRect();
        return {
          text: line.textContent ?? "",
          backX: Math.round(window.innerWidth * 0.72),
          backY: Math.round(row.top - 28),
          lowest,
          innerHeight: window.innerHeight,
          paneBottom: pane.getBoundingClientRect().bottom,
          glass: glass
            ? {
                x: glass.x + glass.width / 2,
                y: glass.y + glass.height / 2,
              }
            : null,
        };
      });
      assert.ok(spot, "focus line missing");
      assert.ok(spot.text.length > 0);
      assert.ok(
        spot.lowest >= spot.innerHeight - 12,
        `upcoming preview ended at ${spot.lowest}, viewport ${spot.innerHeight}`,
      );
      assert.ok(spot.paneBottom >= spot.innerHeight - 2, "reading pane stops above the screen bottom");

      await page.touchscreen.tap(spot.backX, spot.backY);
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        spot.text,
      );
      const afterBack = await bar(page);
      assert.notEqual(afterBack.text, spot.text, "tap above the focus did not go back");
      assert.equal(afterBack.state, "closed", "back tap opened the bar");

      const nextSpot = await page.evaluate(() => {
        const row = document.querySelector(".breath-now")?.getBoundingClientRect();
        if (!row) return null;
        const y = Math.min(window.innerHeight - 72, Math.max(row.top + 8, row.bottom + 28));
        return {
          x: Math.round(window.innerWidth * 0.28),
          y: Math.round(y),
        };
      });
      assert.ok(nextSpot, "focus line missing after going back");
      await page.touchscreen.tap(nextSpot.x, nextSpot.y);
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        afterBack.text,
      );
      const afterForward = await bar(page);
      assert.equal(afterForward.text, spot.text, "tap below the focus did not advance");
      assert.equal(afterForward.state, "closed", "forward tap opened the bar");

      assert.ok(spot.glass, "hourglass missing");
      const beforeGlass = afterForward.text;
      await page.touchscreen.tap(spot.glass.x, spot.glass.y);
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
      );
      const opened = await bar(page);
      assert.equal(opened.state, "open", "hourglass tap did not open the bar");
      assert.equal(opened.text, beforeGlass, "hourglass tap turned the page");

      await page.goto(`${ORIGIN}/salon/read/passing?at=0`, { waitUntil: "domcontentloaded" });
      await focusInPane(page);
      const first = await page.evaluate(() => {
        const line = document.querySelector(".breath-now");
        const row = line?.getBoundingClientRect();
        return {
          text: line?.textContent ?? "",
          x: Math.round(window.innerWidth * 0.62),
          y: row ? Math.round(row.top - 24) : 80,
        };
      });
      assert.ok(first.text.length > 0);
      await page.touchscreen.tap(first.x, first.y);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );
      const stayed = await bar(page);
      assert.equal(stayed.text, first.text, "back from the first sentence changed the line");
      assert.equal(stayed.state, "closed", "no-op back tap opened the bar");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** A few sentences on one page, same shape as the tap-test PDF. */
function fixturePdf(count: number): Uint8Array {
  const lines: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`Imported sentence ${String(i).padStart(2, "0")} ends here.`);
  }
  const ops = ["BT", "/F1 12 Tf", "72 740 Td"];
  lines.forEach((line, i) => {
    if (i > 0) ops.push("0 -28 Td");
    ops.push(`(${pdfEscape(line)}) Tj`);
  });
  ops.push("ET");
  const stream = ops.join("\n");
  const chunks = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, body: "<< /Type /Pages /Kids [4 0 R] /Count 1 >>" },
    { id: 3, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    {
      id: 4,
      body: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>",
    },
    { id: 5, body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream` },
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of chunks) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${chunks.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= chunks.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${chunks.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: {
      width: READER_PHONE_VIEWPORT.width,
      height: READER_PHONE_VIEWPORT.height,
    },
    hasTouch: READER_PHONE_VIEWPORT.hasTouch,
    isMobile: READER_PHONE_VIEWPORT.isMobile,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
  return page;
}

async function beginSit(page: Page) {
  const veil = page.locator(".veil");
  await veil.waitFor({ timeout: 20_000 });
  const alone = veil.getByRole("button", { name: "Alone", exact: true });
  const begin = veil.getByRole("button", { name: "Begin", exact: true });
  const sit = veil.getByRole("button", { name: "Sit", exact: true });
  if (await alone.count()) await alone.click();
  else if (await begin.count()) await begin.click();
  else await sit.last().click();
  await page.locator(".breath-now").waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => !document.querySelector(".veil"), { timeout: 15_000 });
}

/** The bar must stay shut across the paint after the gate lifts, before any turn. */
async function assertBarStaysClosed(page: Page) {
  const started = Date.now();
  while (Date.now() - started < 600) {
    const snap = await bar(page);
    assert.equal(snap.state, "closed", "opening the sit showed the bar");
    assert.equal(snap.opacity, "0", "Keep was visible when the sit opened");
    await page.waitForTimeout(40);
  }
}

async function openFromHourglass(page: Page) {
  const before = await bar(page);
  await page.locator(".reader-glass").click();
  await page.waitForFunction(
    () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
  );
  const opened = await bar(page);
  assert.equal(opened.state, "open", "hourglass tap did not open the bar");
  assert.equal(opened.opacity, "1");
  assert.equal(opened.text, before.text, "hourglass tap turned the page");
}

test(
  "opening a sit keeps the bar shut until the hourglass, in a book and an imported PDF",
  { timeout: 240_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
      const catalog = await phone(browser);
      await catalog.goto(`${ORIGIN}/salon/read/passing`, { waitUntil: "domcontentloaded" });
      await beginSit(catalog);
      await assertBarStaysClosed(catalog);
      await openFromHourglass(catalog);

      const imported = await phone(browser);
      await imported.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
      await imported.locator('input[type="file"]').setInputFiles({
        name: "fixture.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(fixturePdf(4)),
      });
      await imported.waitForURL(/\/read\/page/, { timeout: 30_000 });
      await beginSit(imported);
      await assertBarStaysClosed(imported);
      await openFromHourglass(imported);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

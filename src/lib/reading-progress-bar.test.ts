import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";
import { READER_PHONE_VIEWPORT } from "./reader-chrome.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** One page with a document title and two chapter headings. */
function titledPdf(): Uint8Array {
  const lines = [
    "Chapter 1",
    "The first imported paragraph ends here.",
    "A second sentence of that opening chapter ends here.",
    "Chapter 2",
    "The later chapter begins with its own sentence here.",
    "Another line keeps the import long enough to read.",
  ];
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
    {
      id: 6,
      body: "<< /Title (Bellomont Afternoon) /Author (Imported) >>",
    },
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
  pdf += `trailer\n<< /Size ${chunks.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

type Rect = { top: number; left: number; width: number; height: number };

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

async function launch(): Promise<Browser> {
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

async function waitReading(page: Page) {
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.locator("[data-reading-progress]").waitFor({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    return (
      frame?.getAttribute("data-face-ready") === "yes" &&
      frame.getAttribute("data-display-blocks") === "ready" &&
      !document.querySelector(".veil")
    );
  });
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
  await waitReading(page);
}

async function spotlightRect(page: Page): Promise<Rect> {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll("[data-focus-sentence]")];
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) continue;
      top = Math.min(top, box.top);
      left = Math.min(left, box.left);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    }
    const round = (n: number) => Math.round(n * 2) / 2;
    return {
      top: round(top),
      left: round(left),
      width: round(right - left),
      height: round(bottom - top),
    };
  });
}

async function columnBox(page: Page) {
  return page.evaluate(() => {
    const pane = document.querySelector(".reading-pane");
    const line = document.querySelector(".breath-now");
    const frame = document.querySelector(".reader-frame");
    const paneBox = pane?.getBoundingClientRect();
    const lineBox = line?.getBoundingClientRect();
    const round = (n: number) => Math.round(n * 2) / 2;
    return {
      paneTop: paneBox ? round(paneBox.top) : -1,
      paneHeight: paneBox ? round(paneBox.height) : -1,
      lineTop: lineBox ? round(lineBox.top) : -1,
      lineHeight: lineBox ? round(lineBox.height) : -1,
      width: frame?.getAttribute("data-block-width") ?? "",
      limit: frame?.getAttribute("data-block-limit") ?? "",
    };
  });
}

async function progressOf(page: Page) {
  const raw = await page.locator("[data-reading-progress]").getAttribute("data-progress");
  assert.ok(raw, "progress overlay missing");
  return Number(raw);
}

async function assertOverlayQuiet(page: Page) {
  const paint = await page.evaluate(() => {
    const bar = document.querySelector(".reading-progress");
    const title = document.querySelector(".reading-progress-title");
    if (!bar || !title) return null;
    const barStyle = getComputedStyle(bar);
    const titleStyle = getComputedStyle(title);
    const track = document.querySelector(".reading-progress-track");
    const trackStyle = track ? getComputedStyle(track) : null;
    return {
      position: barStyle.position,
      pointer: barStyle.pointerEvents,
      background: barStyle.backgroundColor,
      shadow: barStyle.boxShadow,
      backdrop: barStyle.backdropFilter,
      webkitBackdrop: barStyle.getPropertyValue("-webkit-backdrop-filter"),
      family: titleStyle.fontFamily,
      overflow: titleStyle.overflow,
      whiteSpace: titleStyle.whiteSpace,
      ellipsis: titleStyle.textOverflow,
      trackHeight: trackStyle ? trackStyle.height : "",
      radius: trackStyle ? trackStyle.borderRadius : "",
    };
  });
  assert.ok(paint, "progress overlay missing");
  assert.equal(paint.position, "absolute");
  assert.equal(paint.pointer, "none");
  assert.equal(paint.background, "rgba(0, 0, 0, 0)");
  assert.equal(paint.shadow, "none");
  assert.equal(paint.backdrop, "none");
  assert.ok(paint.webkitBackdrop === "none" || paint.webkitBackdrop === "");
  assert.match(paint.family, /Outfit/);
  assert.doesNotMatch(paint.family, /sans-serif|serif|system-ui|Arial|Helvetica|Georgia|Times|ui-sans|ui-serif|font8x8/);
  assert.equal(paint.overflow, "hidden");
  assert.equal(paint.whiteSpace, "nowrap");
  assert.equal(paint.ellipsis, "ellipsis");
  assert.equal(paint.trackHeight, "2px");
  assert.match(paint.radius, /999px|1e\+?7px|9999/);
}

async function assertFaces(page: Page, requested: string[]) {
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    const loaded = new Set<string>();
    document.fonts.forEach((face) => {
      if (face.status !== "loaded") return;
      loaded.add(face.family.replace(/^["']|["']$/g, ""));
    });
    return [...loaded];
  });
  assert.ok(families.length > 0, "no faces loaded");
  for (const family of families) {
    assert.match(family, /^(Outfit|Cormorant Garamond)$/, `unexpected face ${family}`);
  }
  assert.ok(families.includes("Outfit"));
  assert.ok(families.includes("Cormorant Garamond"));
  for (const url of requested) {
    assert.match(url, /outfit|cormorant/i, `unexpected font request ${url}`);
  }
}

test(
  "progress increases on a forward tap, the overlay leaves the spotlight rect, and only Outfit and Cormorant load",
  { timeout: 180_000 },
  async () => {
    const fonts: string[] = [];
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phone(browser);
      page.on("response", (response) => {
        const url = response.url();
        const type = response.headers()["content-type"] ?? "";
        if (/\.woff2?(\?|$)/i.test(url) || /font\//i.test(type)) fonts.push(url.split("?")[0] ?? url);
      });
      await page.goto(`${ORIGIN}/salon/read/passing?at=4`, { waitUntil: "domcontentloaded" });
      await waitReading(page);
      await page.waitForFunction(
        () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
      );

      const title = await page.locator(".reading-progress-title").innerText();
      assert.equal(title, "Passing");
      const ticks = await page.locator(".reading-progress-tick").count();
      assert.ok(ticks > 1, "chapter ticks missing");
      await assertOverlayQuiet(page);

      const withOverlay = await spotlightRect(page);
      const columnWith = await columnBox(page);
      assert.ok(withOverlay.height > 8, "spotlight missing");
      await page.evaluate(() => {
        const overlay = document.querySelector(".reading-progress");
        if (overlay instanceof HTMLElement) overlay.style.setProperty("display", "none", "important");
      });
      const withoutOverlay = await spotlightRect(page);
      const columnWithout = await columnBox(page);
      await page.evaluate(() => {
        const overlay = document.querySelector(".reading-progress");
        if (overlay instanceof HTMLElement) overlay.style.removeProperty("display");
      });
      assert.deepEqual(withOverlay, withoutOverlay);
      assert.deepEqual(columnWith, columnWithout);

      const before = await progressOf(page);
      const key = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
      assert.ok(key, "spotlight key missing");
      await page.getByRole("button", { name: "Next sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== prev,
        key,
      );
      const after = await progressOf(page);
      assert.ok(after > before, `progress ${before} -> ${after}`);

      await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="file"]').setInputFiles({
        name: "notes.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(titledPdf()),
      });
      await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
      await beginSit(page);
      await page.locator("[data-reading-progress]").waitFor();
      const importedTitle = (await page.locator(".reading-progress-title").innerText()).replace(/\s+/g, " ").trim();
      assert.equal(importedTitle, "Bellomont Afternoon");
      const long = await page.evaluate(() => {
        const node = document.querySelector(".reading-progress-title");
        if (!(node instanceof HTMLElement)) return false;
        node.textContent = "Bellomont Afternoon and the long quiet drive that would not fit beside the hourglass";
        return node.scrollWidth > node.clientWidth + 1;
      });
      assert.equal(long, true, "a long title did not ellipsize");
      const pdfBefore = await progressOf(page);
      const pdfKey = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
      await page.getByRole("button", { name: "Next sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== prev,
        pdfKey,
      );
      const pdfAfter = await progressOf(page);
      assert.ok(pdfAfter > pdfBefore, `pdf progress ${pdfBefore} -> ${pdfAfter}`);
      await assertFaces(page, fonts);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

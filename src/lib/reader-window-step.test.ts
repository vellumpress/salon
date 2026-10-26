import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { planGroups } from "./reader-group-tap.ts";

/**
 * A left tap goes back one spotlight window.
 * A sentence split into four windows used to land on its second window.
 * Three-window splits already stepped back onto the last window.
 * Books and imported pages share the step.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const CHROME = ["/opt/google/chrome/chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"];

type Engine = "chromium" | "webkit";
type Spot = { key: string; index: number; cursor: number; window: number; text: string };

function sentenceOf(lines: number, word: string) {
  const target = Math.max(1, lines) * 29.5 - 4;
  let text = "";
  let n = 0;
  while (text.trim().length < target) {
    text += `${word}${n} `;
    n += 1;
  }
  return `${text.trim()}.`;
}

/** One sentence with a semicolon between equal stretches, so it splits into windows. */
function pausedOf(windows: number, lines: number, word: string) {
  const parts: string[] = [];
  for (let w = 0; w < windows; w += 1) {
    parts.push(sentenceOf(lines, `${word}${w}`).replace(/\.$/, ""));
  }
  return `${parts.join("; ")}.`;
}

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** pdf.js drops the tail of a text run that is wider than the page. */
function wrapLine(text: string, width = 64) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let buf = "";
  for (const word of words) {
    const next = buf ? `${buf} ${word}` : word;
    if (buf && next.length > width) {
      lines.push(buf);
      buf = word;
    } else {
      buf = next;
    }
  }
  if (buf) lines.push(buf);
  return lines;
}

function fixturePdf(paragraphs: string[]): Uint8Array {
  const lines = paragraphs.flatMap((paragraph) => wrapLine(paragraph));
  const stream = ["BT", "/F1 11 Tf", "54 760 Td"];
  lines.forEach((line, i) => {
    if (i > 0) stream.push("0 -16 Td");
    stream.push(`(${pdfEscape(line)}) Tj`);
  });
  stream.push("ET");
  const body = stream.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n",
    `5 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function webkitInstalled() {
  try {
    const browser = await webkit.launch();
    await browser.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    return false;
  }
}

async function launch(name: Engine): Promise<Browser> {
  if (name === "webkit") return webkit.launch();
  const args = ["--no-sandbox"];
  for (const executablePath of CHROME) {
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
    execFileSync("npx", ["playwright", "install", "chromium"], { stdio: "inherit", timeout: 180_000 });
    return await chromium.launch({ args });
  }
}

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
  return page;
}

async function ready(page: Page, bound: "full" | "painted" = "full") {
  const sit = page.getByRole("button", { name: "Sit", exact: true });
  const alone = page.getByRole("button", { name: "Alone", exact: true });
  const gate = sit.or(alone);
  if (await gate.count()) await gate.first().click();
  await page.waitForFunction(
    (need) => {
      const frame = document.querySelector(".reader-frame");
      const painted = frame?.getAttribute("data-bound");
      const boundOk = need === "painted" ? painted === "full" || painted === "opening" : painted === "full";
      return (
        boundOk &&
        frame?.getAttribute("data-display-blocks") === "ready" &&
        frame.getAttribute("data-face-ready") === "yes" &&
        !document.querySelector(".veil")
      );
    },
    bound,
    { timeout: 30_000 },
  );
}

async function openPath(page: Page, path: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon${path}`, { waitUntil: "domcontentloaded" });
      await page.locator(".reader-frame").waitFor({ timeout: 30_000 });
      await ready(page);
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function readSpot(page: Page): Promise<Spot> {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const text = [...document.querySelectorAll("[data-focus-sentence]")]
      .map((node) => node.textContent ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      key: frame?.getAttribute("data-spotlight-key") ?? "",
      index: Number(frame?.getAttribute("data-breath-index") ?? -1),
      cursor: Number(frame?.getAttribute("data-sentence-at") ?? -1),
      window: Number(frame?.getAttribute("data-spotlight-window") ?? -1),
      text,
    };
  });
}

async function tap(page: Page, side: "prev" | "next") {
  const before = await readSpot(page);
  const host = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(host, "reading column missing");
  const x = host.x + host.width * (side === "prev" ? 0.14 : 0.78);
  const y = host.y + Math.max(24, Math.min(host.height * 0.42, host.height - 24));
  await page.touchscreen.tap(x, y);
  try {
    await page.waitForFunction(
      (prev) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== prev,
      before.key,
      { timeout: 6_000 },
    );
  } catch (error) {
    const now = await readSpot(page);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${side} tap stayed on ${before.key} (${before.text.slice(0, 60)}) (${message}) now ${now.key}`);
  }
  await page.waitForTimeout(140);
  const now = await readSpot(page);
  assert.notEqual(now.key, before.key, `${side} tap stayed on ${before.key}`);
  return now;
}

/** Right, then left, lands on the window we left. A second right repeats the first. */
async function roundTrip(page: Page, label: string) {
  const start = await readSpot(page);
  const next = await tap(page, "next");
  const back = await tap(page, "prev");
  assert.equal(
    back.key,
    start.key,
    `${label}: left from ${next.key} (“${next.text.slice(0, 72)}”) landed on ${back.key} (“${back.text.slice(0, 72)}”), one window is ${start.key} (“${start.text.slice(0, 72)}”)`,
  );
  assert.equal(back.text, start.text, `${label}: left from ${next.key} repainted “${back.text.slice(0, 72)}”`);
  const again = await tap(page, "next");
  assert.equal(again.key, next.key, `${label}: the second right from ${start.key} landed on ${again.key}`);
  return again;
}

function widthsOf(keys: string[]) {
  const map = new Map<string, number>();
  for (const key of keys) {
    const [index, cursor] = key.split(":");
    const id = `${index}:${cursor}`;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return [...map.values()];
}

async function walk(page: Page, label: string, cap: number, done: (spot: Spot, keys: string[]) => boolean) {
  const keys = [(await readSpot(page)).key];
  for (let step = 0; step < cap; step += 1) {
    if (done(await readSpot(page), keys)) break;
    const planned = await planGroups(page, 1, 1);
    if (planned === "end") break;
    const next = await roundTrip(page, `${label} @ ${keys[keys.length - 1]}`);
    keys.push(next.key);
  }
  return keys;
}

async function reproOpening(page: Page, id: string, silk: RegExp, skipped: RegExp) {
  await openPath(page, `/read/${id}?sit=1`);
  const opened = await readSpot(page);
  assert.equal(opened.key, "0:0:0", `${id} opened on ${opened.key}`);
  const keys = await walk(page, id, 24, (spot) => spot.index >= 1);
  const forward = keys.slice(1);
  const four = ["0:1:0", "0:1:1", "0:1:2", "0:1:3", "0:2:0"];
  const at = forward.findIndex((_, i) => four.every((key, offset) => forward[i + offset] === key));
  assert.ok(at >= 0, `${id} forward ${forward.join(" ")} did not pass ${four.join(" ")}`);
  await openPath(page, `/read/${id}?sit=1`);
  for (const key of four) {
    const landed = await tap(page, "next");
    assert.equal(landed.key, key, `${id} right tap landed on ${landed.key} (“${landed.text.slice(0, 72)}”)`);
  }
  const back = await tap(page, "prev");
  assert.equal(back.key, "0:1:3", `${id} left from 0:2:0 landed on ${back.key}`);
  assert.match(back.text, silk);
  assert.doesNotMatch(back.text, skipped);
  const widths = widthsOf(keys);
  assert.ok(widths.some((width) => width >= 4), `${id} windows ${widths.join(",")}`);
  assert.ok(keys.some((key) => key.startsWith("1:")), `${id} stayed inside the first paragraph`);
}

async function run(name: Engine) {
  const browser = await launch(name);
  try {
    const page = await phone(browser);
    const viewport = page.viewportSize();
    assert.equal(viewport?.width, 390);
    assert.equal(viewport?.height, 844);

    await reproOpening(
      page,
      "quicksand",
      /oriental silk which covered the stool at her slim feet/,
      /bright covers of the books/,
    );
    await reproOpening(
      page,
      "cranford",
      /distant only twenty miles on a railroad/,
      /fairly frightened to death/,
    );

    await openPath(page, "/read/strange-tales?at=0");
    const tales = await walk(page, "strange-tales", 16, (_spot, keys) => widthsOf(keys).includes(3));
    assert.ok(widthsOf(tales).includes(3), `strange-tales windows ${widthsOf(tales).join(",")} keys ${tales.join(" ")}`);

    await openPath(page, "/read/quicksand?at=26");
    const edge = await walk(page, "quicksand sit", 18, (spot) => spot.index >= 28);
    assert.ok(edge.some((key) => key.startsWith("27:")), `sit edge keys ${edge.join(" ")}`);
    assert.ok(edge.some((key) => key.startsWith("28:")), `chapter edge keys ${edge.join(" ")}`);

    await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="file"]').setInputFiles({
      name: "windows.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        fixturePdf([
          pausedOf(4, 4, "Lamp"),
          pausedOf(3, 4, "After"),
          pausedOf(2, 6, "Third"),
          sentenceOf(6, "Pair"),
          "CHAPTER II",
          sentenceOf(4, "Chapter"),
        ]),
      ),
    });
    await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
    const sit = page.getByRole("button", { name: "Sit", exact: true });
    const alone = page.getByRole("button", { name: "Alone", exact: true });
    await sit.or(alone).first().waitFor({ timeout: 20_000 });
    // An imported page is this phone's file. It never becomes a catalog edition,
    // so the frame stays on the opening column once the type is ready.
    await ready(page, "painted");
    const imported = await walk(page, "imported pdf", 40, () => false);
    const importedWidths = widthsOf(imported);
    assert.ok(importedWidths.includes(2), `pdf windows ${importedWidths.join(",")} keys ${imported.join(" ")}`);
    assert.ok(importedWidths.includes(3), `pdf windows ${importedWidths.join(",")}`);
    assert.ok(importedWidths.some((width) => width >= 4), `pdf windows ${importedWidths.join(",")}`);
    assert.ok(imported.some((key) => !key.startsWith("0:")), `pdf stayed on the first breath ${imported.join(" ")}`);
    await page.close();
  } finally {
    await browser.close();
  }
}

test(
  "Chromium: a left tap steps back exactly one window, including a four-window sentence",
  { timeout: 300_000 },
  async () => {
    await ensureReaderServer();
    await run("chromium");
  },
);

test(
  "WebKit: a left tap steps back exactly one window, including a four-window sentence",
  { timeout: 300_000 },
  async (t) => {
    if (!(await webkitInstalled())) {
      t.skip("WebKit is not installed");
      return;
    }
    await ensureReaderServer();
    await run("webkit");
  },
);

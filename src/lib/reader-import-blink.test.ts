import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const TAPS = 20;

type BlinkFrame = {
  opening: boolean;
  reader: boolean;
  textLen: number;
  faces: string;
  faceReady: string;
  transparent: boolean;
  key: string;
  breath: string;
};

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** One long sentence per line, so a tap has to leave the breath. */
function fixturePdf(lines: string[]): Uint8Array {
  const stream = ["BT", "/F1 12 Tf", "72 740 Td"];
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

function importSentences() {
  const lines: string[] = [];
  for (let n = 1; n <= 36; n += 1) {
    const label = String(n).padStart(2, "0");
    lines.push(
      `Imported sentence ${label} keeps its own window on this phone. ` +
        "The column holds this breath alone so the next tap cannot pack it with another sentence. ".repeat(3) +
        `Breath ${label} ends here.`,
    );
  }
  return lines;
}

async function webkitInstalled() {
  try {
    const browser = await webkit.launch();
    await browser.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch|missing dependencies|shared libraries/.test(message)) {
      throw error;
    }
    return false;
  }
}

async function launch(name: "webkit" | "chromium"): Promise<Browser> {
  if (name === "webkit") return webkit.launch();
  return chromium.launch({ args: ["--no-sandbox"] });
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
  await page.addInitScript(() => {
    localStorage.clear();
  });
  return page;
}

async function armProbe(page: Page) {
  await page.evaluate(`(() => {
    const frames = [];
    const sample = () => {
      const frame = document.querySelector(".reader-frame");
      const column = document.querySelector("[data-reader-text]");
      const titles = [...document.querySelectorAll(".type-title")].map((node) =>
        (node.textContent || "").replace(/\\s+/g, " ").trim(),
      );
      const focus = document.querySelector("[data-focus-sentence], .breath-now");
      let transparent = false;
      if (focus) {
        const style = getComputedStyle(focus);
        const fill = style.getPropertyValue("-webkit-text-fill-color");
        transparent =
          style.color === "rgba(0, 0, 0, 0)" || fill === "rgba(0, 0, 0, 0)" || fill === "transparent";
      }
      const text = ((column && column.textContent) || "").replace(/\\s+/g, " ").trim();
      frames.push({
        opening: !frame && titles.indexOf("Opening") !== -1,
        reader: !!frame,
        textLen: text.length,
        faces: (document.documentElement.dataset && document.documentElement.dataset.faces) || "",
        faceReady: (frame && frame.getAttribute("data-face-ready")) || "",
        transparent,
        key: (frame && frame.getAttribute("data-spotlight-key")) || "",
        breath: (frame && frame.getAttribute("data-breath-index")) || "",
      });
    };
    sample();
    const obs = new MutationObserver(sample);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    let running = true;
    const tick = () => {
      if (!running) return;
      sample();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__blinkStop = () => {
      running = false;
      obs.disconnect();
      sample();
      return frames;
    };
  })()`);
}

async function stopProbe(page: Page): Promise<BlinkFrame[]> {
  const frames = await page.evaluate("window.__blinkStop ? window.__blinkStop() : []");
  return frames as BlinkFrame[];
}

function assertNoBlink(frames: BlinkFrame[], label: string) {
  assert.ok(frames.length > 30, `${label} sampled ${frames.length} frames`);
  const opening = frames.filter((frame) => frame.opening);
  const bare = frames.filter((frame) => !frame.reader);
  const empty = frames.filter((frame) => frame.reader && frame.textLen === 0);
  const held = frames.filter((frame) => frame.faces !== "ready" || frame.transparent || frame.faceReady === "no");
  assert.equal(opening.length, 0, `${label} flashed Opening on ${opening.length} frames`);
  assert.equal(bare.length, 0, `${label} dropped the reader on ${bare.length} frames`);
  assert.equal(empty.length, 0, `${label} painted the reader without text on ${empty.length} frames`);
  assert.equal(
    held.length,
    0,
    `${label} held the face again (${held[0]?.faces ?? ""}/${held[0]?.faceReady ?? ""})`,
  );
}

async function readyReader(page: Page) {
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const frame = document.querySelector(".reader-frame");
      const text = document.querySelector("[data-reader-text]");
      return (
        frame?.getAttribute("data-face-ready") === "yes" &&
        frame.getAttribute("data-display-blocks") === "ready" &&
        document.documentElement.dataset.faces === "ready" &&
        !document.querySelector(".veil") &&
        Boolean((text?.textContent ?? "").trim())
      );
    },
    { timeout: 30_000 },
  );
}

async function passGate(page: Page) {
  const sit = page.getByRole("button", { name: "Sit", exact: true });
  const alone = page.getByRole("button", { name: "Alone", exact: true });
  const gate = sit.or(alone).first();
  const reading = page.locator(".breath-now");
  await gate.or(reading).first().waitFor({ timeout: 30_000 });
  if (await gate.isVisible().catch(() => false)) await gate.click();
  await readyReader(page);
}

async function tapColumn(page: Page, side: "next" | "prev") {
  const before = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  const x = box.x + box.width * (side === "next" ? 0.78 : 0.14);
  const y = box.y + box.height * 0.62;
  await page.touchscreen.tap(x, y);
  await page.waitForFunction(
    (prev) => {
      const frame = document.querySelector(".reader-frame");
      const text = document.querySelector("[data-reader-text]");
      if (!frame || !(text?.textContent ?? "").trim()) return false;
      return frame.getAttribute("data-spotlight-key") !== prev;
    },
    before,
    { timeout: 5_000 },
  );
}

async function walk(page: Page, label: string) {
  await armProbe(page);
  const start = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  const startBreath = await page.locator(".reader-frame").getAttribute("data-breath-index");
  for (let i = 0; i < TAPS; i += 1) await tapColumn(page, "next");
  const forward = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  const forwardBreath = await page.locator(".reader-frame").getAttribute("data-breath-index");
  assert.notEqual(forward, start, `${label} forward taps stayed on ${start}`);
  assert.notEqual(forwardBreath, startBreath, `${label} forward taps stayed on breath ${startBreath}`);
  for (let i = 0; i < TAPS; i += 1) await tapColumn(page, "prev");
  const back = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  assert.notEqual(back, forward, `${label} back taps stayed on ${forward}`);
  await page.locator(".reader-glass").waitFor();
  const frames = await stopProbe(page);
  assertNoBlink(frames, label);
}

async function importPdf(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/import`, { waitUntil: "domcontentloaded" });
      await page.locator(".home-import-file").waitFor({ state: "attached", timeout: 30_000 });
      await page.locator(".home-import-file").setInputFiles({
        name: "imported-page.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(fixturePdf(importSentences())),
      });
      await page.waitForURL(/\/read\/import-/, { timeout: 60_000 });
      return;
    } catch (error) {
      last = error;
      const message = await page.locator(".home-import-error").textContent().catch(() => "");
      if (message) last = new Error(message);
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function runImport(name: "webkit" | "chromium") {
  const browser = await launch(name);
  try {
    const page = await phone(browser);
    await importPdf(page);
    await passGate(page);
    assert.match(page.url(), /\/read\/import-/);
    await walk(page, `${name} import`);
    await page.close();
  } finally {
    await browser.close();
  }
}

async function runBook(name: "webkit" | "chromium") {
  const browser = await launch(name);
  try {
    const page = await phone(browser);
    let last: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await page.goto(`${ORIGIN}/salon/read/the-ballad-of-reading-gaol`, {
          waitUntil: "domcontentloaded",
        });
        await passGate(page);
        await page.waitForFunction(
          () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
          { timeout: 30_000 },
        );
        await readyReader(page);
        last = undefined;
        break;
      } catch (error) {
        last = error;
        if (!readerDown(error) || attempt === 2) break;
        await ensureReaderServer();
      }
    }
    if (last) throw last;
    assert.equal(new URL(page.url()).search, "", `${name} book opened with a search`);
    await walk(page, `${name} book`);
    await page.close();
  } finally {
    await browser.close();
  }
}

test(
  "WebKit: twenty taps in the import reader never flash Opening",
  { timeout: 180_000 },
  async (t) => {
    if (!(await webkitInstalled())) {
      skipWithoutWebKit(t);
      return;
    }
    await ensureReaderServer();
    await runImport("webkit");
  },
);

test(
  "Chromium: twenty taps in the import reader never flash Opening",
  { timeout: 180_000 },
  async () => {
    await ensureReaderServer();
    await runImport("chromium");
  },
);

test(
  "WebKit: twenty taps in a book never flash the loading gate",
  { timeout: 180_000 },
  async (t) => {
    if (!(await webkitInstalled())) {
      skipWithoutWebKit(t);
      return;
    }
    await ensureReaderServer();
    await runBook("webkit");
  },
);

test(
  "Chromium: twenty taps in a book never flash the loading gate",
  { timeout: 180_000 },
  async () => {
    await ensureReaderServer();
    await runBook("chromium");
  },
);

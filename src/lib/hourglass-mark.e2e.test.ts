import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const LIVE = ORIGIN.includes("vellumpress.github.io");
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/the-bridge-of-san-luis-rey?at=10";
const SHOTS = process.env.SALON_SHOTS ?? "";
const VIEW = { width: 390, height: 844 };

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchChrome(): Promise<Browser> {
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

async function webkitInstalled() {
  try {
    const browser = await webkit.launch();
    await browser.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch|Host system is missing/.test(message)) throw error;
    return false;
  }
}

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: VIEW,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("salon-hourglass-cleared") === "1") return;
    localStorage.clear();
    localStorage.setItem("salon-move-by", "scroll");
    sessionStorage.setItem("salon-hourglass-cleared", "1");
  });
  return page;
}

async function openReader(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (LIVE && attempt > 0) await sleep(60_000);
    else if (LIVE) await sleep(25_000);
    try {
      const response = await page.goto(`${ORIGIN}${BOOK}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      if (response && response.status() === 429) {
        last = new Error("vellumpress.github.io returned 429");
        await sleep(60_000);
        continue;
      }
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      const sit = page.locator("button", { hasText: /^Sit$/ }).first();
      if (await sit.count()) await sit.click().catch(() => {});
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => {
        const frame = document.querySelector(".reader-frame");
        return (
          frame?.getAttribute("data-bound") === "full" &&
          frame.getAttribute("data-face-ready") === "yes" &&
          !document.querySelector(".veil")
        );
      });
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) {
        if (attempt === 2) break;
        if (LIVE) continue;
        break;
      }
      await ensureReaderServer();
    }
  }
  throw last;
}

async function mark(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const row = document.querySelector("header.reader-mark");
    const style = row instanceof HTMLElement ? getComputedStyle(row) : null;
    const glass = document.querySelector(".reader-glass");
    return {
      mark: frame?.getAttribute("data-mark") ?? "",
      mode: frame?.getAttribute("data-move-by") ?? "",
      opacity: style?.opacity ?? "",
      events: style?.pointerEvents ?? "",
      expanded: glass?.getAttribute("aria-expanded") ?? "",
      sheet: Boolean(document.querySelector(".nav-reveal")),
      reveal: Boolean(document.querySelector("[data-mark-reveal]")),
      key: frame?.getAttribute("data-spotlight-key") ?? "",
      home: Boolean(row?.textContent?.includes("Home")),
    };
  });
}

async function waitMark(page: Page, shown: boolean) {
  await page.waitForFunction(
    (want) => {
      const frame = document.querySelector(".reader-frame");
      const row = document.querySelector("header.reader-mark");
      if (!(row instanceof HTMLElement)) return false;
      const opacity = getComputedStyle(row).opacity;
      return frame?.getAttribute("data-mark") === (want ? "on" : "off") && opacity === (want ? "1" : "0");
    },
    shown,
  );
}

async function hideByScroll(page: Page) {
  await page.locator("[data-reader-text]").evaluate((host) => {
    host.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 180, bubbles: true, cancelable: true }),
    );
  });
  await waitMark(page, false);
}

async function hideByTap(page: Page) {
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  const before = (await mark(page)).key;
  await page.touchscreen.tap(Math.round(box.x + box.width * 0.72), Math.round(box.y + box.height * 0.55));
  await page.waitForFunction(
    (key) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== key,
    before,
  );
  await waitMark(page, false);
}

async function openHourglass(page: Page) {
  await page.locator(".reader-glass").click();
  await waitMark(page, true);
  await page.locator(".nav-reveal").waitFor();
}

async function closeHourglass(page: Page) {
  await page.locator(".reader-glass").click();
  await waitMark(page, false);
  await page.waitForFunction(() => !document.querySelector(".nav-reveal"));
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/hourglass-mark-${name}.png` });
}

async function runModes(page: Page, engine: string) {
  const viewport = page.viewportSize();
  assert.ok(viewport, "missing viewport");
  assert.equal(viewport.width, 390);
  assert.equal(viewport.height, 844);
  await openReader(page);
  const opened = await mark(page);
  assert.equal(opened.mode, "scroll", `${engine} did not open in Scroll`);
  assert.equal(opened.mark, "on", `${engine} mark row started hidden`);
  assert.equal(opened.opacity, "1");
  assert.equal(opened.home, true);

  await hideByScroll(page);
  const hidden = await mark(page);
  assert.equal(hidden.mark, "off");
  assert.equal(hidden.opacity, "0");
  assert.equal(hidden.events, "none");
  assert.equal(hidden.sheet, false);

  await openHourglass(page);
  const lifted = await mark(page);
  assert.equal(lifted.mark, "on", `${engine} Scroll hourglass left the top bar hidden`);
  assert.equal(lifted.opacity, "1");
  assert.notEqual(lifted.events, "none");
  assert.equal(lifted.expanded, "true");
  assert.equal(lifted.sheet, true);
  assert.equal(lifted.reveal, false);
  assert.equal(lifted.home, true);
  await shot(page, `${engine}-scroll`);

  await closeHourglass(page);
  const dropped = await mark(page);
  assert.equal(dropped.mark, "off", `${engine} Scroll close left the top bar up`);
  assert.equal(dropped.opacity, "0");
  assert.equal(dropped.sheet, false);

  const beforeReveal = (await mark(page)).key;
  await page.locator("[data-mark-reveal]").click();
  await waitMark(page, true);
  assert.equal((await mark(page)).key, beforeReveal, `${engine} top edge turned the page`);

  await hideByScroll(page);
  await openHourglass(page);
  await page.locator(".nav-reveal").getByRole("button", { name: "Next" }).click();
  await waitMark(page, false);
  const resumed = await mark(page);
  assert.equal(resumed.sheet, true, `${engine} Next closed the hourglass sheet`);
  assert.equal(resumed.mark, "off", `${engine} reading resume left the top bar up`);

  await page.locator(".nav-reveal").getByRole("button", { name: "Tap", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".reader-frame")?.getAttribute("data-move-by") === "tap",
  );
  await closeHourglass(page);

  await page.locator("[data-mark-reveal]").click();
  await waitMark(page, true);
  await hideByTap(page);
  await openHourglass(page);
  const tapped = await mark(page);
  assert.equal(tapped.mode, "tap");
  assert.equal(tapped.mark, "on", `${engine} Tap hourglass left the top bar hidden`);
  assert.equal(tapped.opacity, "1");
  assert.equal(tapped.sheet, true);
  assert.equal(tapped.home, true);
  await shot(page, `${engine}-tap`);

  await closeHourglass(page);
  assert.equal((await mark(page)).mark, "off", `${engine} Tap close left the top bar up`);

  const tapReveal = (await mark(page)).key;
  await page.locator("[data-mark-reveal]").click();
  await waitMark(page, true);
  assert.equal((await mark(page)).key, tapReveal, `${engine} Tap top edge turned the page`);

  await hideByTap(page);
  await openHourglass(page);
  await page.locator(".nav-reveal").getByRole("button", { name: "Next" }).click();
  await waitMark(page, false);
  const tapResume = await mark(page);
  assert.equal(tapResume.mode, "tap");
  assert.equal(tapResume.sheet, true);
  assert.equal(tapResume.mark, "off");
}

test(
  "the hourglass brings the top bar back in Scroll and Tap",
  { timeout: 420_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await launchChrome();
    try {
      const page = await phone(chrome);
      await runModes(page, "chromium");
      await page.context().close();
    } finally {
      await chrome.close();
    }
    if (LIVE) await sleep(25_000);
    if (!(await webkitInstalled())) {
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      skipWithoutWebKit(t);
      return;
    }
    const kit = await webkit.launch();
    try {
      const page = await phone(kit);
      await runModes(page, "webkit");
      await page.context().close();
    } finally {
      await kit.close();
    }
  },
);

import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

/**
 * The place survives a reload in Tap and Scroll, on a desktop column and a
 * phone column. A wide column used to measure the opening slice before the
 * saved sentence painted, then store that earlier sentence over the place.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/quicksand";

type Mode = "tap" | "scroll";
type Size = { name: string; width: number; height: number; mobile: boolean };

const SIZES: Size[] = [
  { name: "desktop", width: 1280, height: 800, mobile: false },
  { name: "phone", width: 390, height: 844, mobile: true },
];

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

async function launch(name: "chromium" | "webkit") {
  if (name === "webkit") return webkit.launch();
  return chromium.launch({ args: ["--no-sandbox"] });
}

async function openReader(page: Page, mode: Mode) {
  await page.addInitScript((moveBy: Mode) => {
    if (sessionStorage.getItem("place-reload-booted")) return;
    sessionStorage.setItem("place-reload-booted", "1");
    localStorage.clear();
    localStorage.setItem("salon-move-by", moveBy);
  }, mode);
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}${BOOK}`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      const sit = page.locator("button", { hasText: /^Sit$/ }).first();
      if (await sit.count()) await sit.click();
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
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

async function ready(page: Page) {
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    return (
      frame?.getAttribute("data-face-ready") === "yes" &&
      frame.getAttribute("data-display-blocks") === "ready" &&
      !document.querySelector(".veil")
    );
  });
}

async function placeKey(page: Page) {
  return page.locator(".reader-frame").getAttribute("data-spotlight-key");
}

async function advanceTap(page: Page) {
  const start = await placeKey(page);
  assert.ok(start, "opened without a place");
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  const x = box.x + box.width * 0.82;
  const y = box.y + box.height * 0.55;
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(350);
  }
  const next = await placeKey(page);
  assert.ok(next && next !== start, `three right-side taps stayed on ${next}`);
  return next;
}

async function advanceScroll(page: Page) {
  const start = await placeKey(page);
  assert.ok(start, "opened without a place");
  await page.evaluate(async (prev) => {
    const host = document.querySelector("[data-reader-text]");
    const flow = document.querySelector(".focus-live");
    if (!host || !(flow instanceof HTMLElement)) return;
    for (let i = 0; i < 30; i += 1) {
      host.dispatchEvent(new WheelEvent("wheel", { deltaY: 520, bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
      const key = document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key");
      if (key && key !== prev) return;
    }
    flow.scrollTop = Math.floor(flow.scrollHeight * 0.45);
  }, start);
  await page.waitForFunction(
    (prev) => {
      const key = document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key");
      return Boolean(key && key !== prev);
    },
    start,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(200);
  const next = await placeKey(page);
  assert.ok(next && next !== start, `scrolling the column stayed on ${next}`);
  return next;
}

async function check(page: Page, mode: Mode, label: string) {
  await openReader(page, mode);
  const size = page.viewportSize();
  assert.equal(size?.width, label.includes("desktop") ? 1280 : 390, `${label} width`);
  const advanced = mode === "tap" ? await advanceTap(page) : await advanceScroll(page);
  await page.evaluate(() => sessionStorage.removeItem("tbr-user-move"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await ready(page);
  await page.waitForTimeout(400);
  const kept = await placeKey(page);
  assert.equal(kept, advanced, `${label} reload dropped ${advanced} to ${kept}`);
}

async function runBrowser(browser: Browser, engine: string) {
  for (const size of SIZES) {
    for (const mode of ["tap", "scroll"] as const) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        screen: { width: size.width, height: size.height },
        hasTouch: size.mobile,
        isMobile: size.mobile,
        deviceScaleFactor: size.mobile ? PHONE.deviceScaleFactor : 1,
        userAgent: size.mobile ? PHONE.userAgent : undefined,
      });
      const page = await context.newPage();
      try {
        await check(page, mode, `${engine} ${size.name} ${mode}`);
      } finally {
        await context.close();
      }
    }
  }
}

test(
  "a reload keeps the place in Tap and Scroll at desktop and phone size",
  { timeout: 240_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await launch("chromium");
    try {
      await runBrowser(chrome, "Chromium");
    } finally {
      await chrome.close();
    }
    if (!(await webkitInstalled())) {
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      skipWithoutWebKit(t);
      return;
    }
    const kit = await launch("webkit");
    try {
      await runBrowser(kit, "WebKit");
    } finally {
      await kit.close();
    }
  },
);

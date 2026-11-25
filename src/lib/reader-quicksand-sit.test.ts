import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

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

async function openQuicksand(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/quicksand`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      await page.evaluate(() => {
        const veil = document.querySelector(".veil");
        if (!veil) return;
        const button = [...veil.querySelectorAll("button")].reverse().find((el) => (el.textContent || "").trim() === "Sit");
        button?.click();
      });
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.locator(".veil").waitFor({ state: "hidden", timeout: 15_000 });
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function check(page: Page, label: string) {
  await openQuicksand(page);
  await page.waitForTimeout(400);
  const start = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  assert.ok(start, `${label} spotlight missing`);
  for (let n = 0; n < 4; n += 1) {
    await page.mouse.click(280, 520);
    await page.waitForTimeout(350);
  }
  const key = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  assert.ok(key && key !== start, `${label} taps stayed on ${key}`);
  assert.match(key, /^0:/, `${label} left the first breath: ${key}`);
  await page.waitForTimeout(1600);
  const credited = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("vellum-v1") || "{}").state || {};
    return state.progress?.quicksand?.activeAdvances ?? 0;
  });
  assert.ok(credited >= 1, `${label} in-breath taps did not count, advances ${credited}`);
  await page.evaluate(() => sessionStorage.removeItem("tbr-user-move"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    (want) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") === want,
    key,
    { timeout: 10_000 },
  );
}

async function run(browser: Browser, label: string) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("salon-move-by", "tap");
  });
  await check(page, label);
  await context.close();
}

test(
  "Quicksand records a sit inside the first breath and reloads on that sentence",
  { timeout: 180_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await chromium.launch({ args: ["--no-sandbox"] });
    try {
      await run(chrome, "Chromium");
    } finally {
      await chrome.close();
    }
    if (!(await webkitInstalled())) {
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      skipWithoutWebKit(t);
      return;
    }
    const kit = await webkit.launch();
    try {
      await run(kit, "WebKit");
    } finally {
      await kit.close();
    }
  },
);

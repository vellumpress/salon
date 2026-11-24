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

async function openReader(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/the-house-of-mirth`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      const started = await page.evaluate(() => {
        const veil = document.querySelector<HTMLElement>(".veil");
        if (!veil) return "open";
        const button = [...veil.querySelectorAll("button")].reverse().find((el) => (el.textContent || "").trim() === "Sit");
        if (!button) return veil.innerText.replace(/\s+/g, " ").trim().slice(0, 180);
        button.click();
        return "clicked";
      });
      if (started !== "open" && started !== "clicked") throw new Error(started);
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

async function tapHome(page: Page, label: string) {
  const before = await page.locator(".reader-frame").getAttribute("data-breath-index");
  const box = await page.locator("a.reader-mark-slot", { hasText: "Home" }).boundingBox();
  assert.ok(box, `${label} Home control missing`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(() => location.pathname.replace(/\/$/, "") === "/salon", undefined, {
    timeout: 15_000,
  });
  assert.equal(new URL(page.url()).pathname.replace(/\/$/, ""), "/salon", `${label} Home tap stayed on ${page.url()}`);
  assert.ok(before != null);
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
  await openReader(page);
  await tapHome(page, label);
  await context.close();
}

test(
  "a tap on Home leaves the book in Chromium and WebKit",
  { timeout: 120_000 },
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

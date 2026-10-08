import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium, devices, type Browser, type Page } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const WORK = "the-house-of-mirth";
const AT = 10;
const LINE = /She came forward smiling/;

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function saved(sittingStartedAt: number | null) {
  return JSON.stringify({
    state: {
      activeReadVersion: 1,
      sittingMinutes: 5,
      progress: {
        [WORK]: {
          breathIndex: AT,
          lastOpenedAt: Date.now(),
          sittingStartedAt,
          keywords: {},
          kept: [],
          completedAt: null,
          entered: true,
          activeAnchorAt: null,
          activeMs: 0,
          activeAdvances: 0,
        },
      },
    },
    version: 2,
  });
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

async function phonePage(browser: Browser, store: string) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript((value) => {
    localStorage.setItem("vellum-v1", value);
  }, store);
  return page;
}

async function openMirth(page: Page) {
  await page.goto(`${ORIGIN}/salon/read/${WORK}?sit=5`, { waitUntil: "domcontentloaded" });
}

test("a reload mid-sit stays on that sentence", async () => {
  await ensureReaderServer();
  const browser = await launchBrowser();
  try {
    const page = await phonePage(browser, saved(Date.now() - 30_000));
    await openMirth(page);
    await page.locator(".breath-now").waitFor({ timeout: 20_000 });
    await page.waitForFunction(() => !document.querySelector(".veil"), { timeout: 15_000 });
    const index = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
    assert.equal(index, String(AT));
    assert.match(await page.locator(".breath-now").innerText(), LINE);
    assert.equal(await page.locator(".veil").count(), 0);
    assert.equal(await page.getByText("How long will you sit").count(), 0);
  } finally {
    await browser.close();
  }
});

test("a share link opens that sentence", async () => {
  await ensureReaderServer();
  const browser = await launchBrowser();
  try {
    const page = await phonePage(browser, saved(null));
    await page.goto(`${ORIGIN}/salon/read/${WORK}?at=${AT}`, { waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 20_000 });
    await page.waitForFunction(() => !document.querySelector(".veil"), { timeout: 15_000 });
    const index = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
    assert.equal(index, String(AT));
    assert.match(await page.locator(".breath-now").innerText(), LINE);
  } finally {
    await browser.close();
  }
});

test("a book with no open sit still shows the gate", async () => {
  await ensureReaderServer();
  const browser = await launchBrowser();
  try {
    const page = await phonePage(browser, saved(null));
    await openMirth(page);
    const veil = page.locator(".veil");
    await veil.waitFor({ timeout: 20_000 });
    await veil.getByText("How long will you sit").waitFor({ timeout: 10_000 });
    await veil.getByText("The House of Mirth").waitFor({ timeout: 10_000 });
    await veil.getByText("New York").waitFor({ timeout: 10_000 });
  } finally {
    await browser.close();
  }
});

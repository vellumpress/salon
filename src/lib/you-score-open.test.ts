import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium, type Browser } from "playwright";
import { READER_PHONE_VIEWPORT } from "./reader-chrome.ts";
import { ensureReaderServer } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";

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

const BROKEN_HISTORY = JSON.stringify({
  state: {
    progress: { passing: null },
    favorites: "nope",
    sitHistory: [null, { minutes: null }],
    worksTouchedByDay: { "2020-01-01": 4 },
    readingMinutesByDay: { "2020-01-01": null },
    activeReadVersion: 2,
  },
  version: 2,
});

async function openYou(browser: Browser, storage: string | null) {
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
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.addInitScript((raw) => {
    localStorage.clear();
    if (raw) localStorage.setItem("vellum-v1", raw);
  }, storage);
  const started = Date.now();
  await page.goto(`${ORIGIN}/salon/you`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const glass = page.locator("[data-score-glass]");
  await glass.waitFor({ state: "visible", timeout: 12_000 });
  const label = (await glass.locator("figcaption").innerText()).replace(/\s+/g, " ").trim();
  const immersion = await page.getByText("Immersion", { exact: true }).count();
  await context.close();
  return { label, ms: Date.now() - started, errors, immersion };
}

test(
  "a phone open of You shows a score for empty and broken history",
  { timeout: 180_000 },
  async () => {
    await ensureReaderServer();
    const browser = await launchBrowser();
    try {
      const empty = await openYou(browser, null);
      assert.ok(empty.label.length > 0, `empty history label was blank after ${empty.ms}ms`);
      assert.ok(empty.immersion > 0, "contributor row missing");
      const hydration = empty.errors.filter((line) => /418|422|hydration|Hydration/i.test(line));
      assert.deepEqual(hydration, [], hydration.join("\n"));

      const broken = await openYou(browser, BROKEN_HISTORY);
      assert.ok(broken.label.length > 0, `broken history label was blank after ${broken.ms}ms`);
      assert.ok(broken.immersion > 0, "contributor row missing for broken history");
      const brokenHydration = broken.errors.filter((line) => /418|422|hydration|Hydration/i.test(line));
      assert.deepEqual(brokenHydration, [], brokenHydration.join("\n"));
    } finally {
      await browser.close();
    }
  },
);

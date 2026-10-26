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

test("a mid-book at link paints the target sentence first", async () => {
  await ensureReaderServer();
  const browser = await launchBrowser();
  const rituals = [
    {
      id: "tales-from-the-fjeld",
      at: 1658,
      sit: 8,
      line: /Once on a time there was a sheep/,
      start: /We were up on the Fjeld/,
    },
    {
      id: "tales-by-polish-authors",
      at: 569,
      sit: 5,
      line: /Countess Anna Krzywosad/,
      start: /My hero's name was Bartek/,
    },
  ];
  try {
    for (const ritual of rituals) {
      const page = await phonePage(browser, saved(null));
      await page.addInitScript(() => {
        const paints: string[] = [];
        const note = () => {
          const text = document.querySelector(".breath-now")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          if (!text || paints[paints.length - 1] === text) return;
          paints.push(text);
        };
        const arm = () => {
          note();
          const obs = new MutationObserver(note);
          obs.observe(document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
          });
          const sample = () => {
            note();
            requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        };
        if (document.documentElement) arm();
        else document.addEventListener("DOMContentLoaded", arm);
        (window as unknown as { __breathPaints?: string[] }).__breathPaints = paints;
      });
      await page.goto(
        `${ORIGIN}/salon/read/${ritual.id}?sit=${ritual.sit}&at=${ritual.at}`,
        { waitUntil: "domcontentloaded" },
      );
      await page.locator(".breath-now").waitFor({ timeout: 20_000 });
      await page.waitForFunction(
        (want) => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === String(want),
        ritual.at,
        { timeout: 20_000 },
      );
      const paints = await page.evaluate(
        () => (window as unknown as { __breathPaints?: string[] }).__breathPaints ?? [],
      );
      assert.ok(paints.length > 0, `${ritual.id} painted no sentence`);
      assert.match(paints[0] ?? "", ritual.line, `${ritual.id} first paint`);
      assert.equal(paints.some((text) => ritual.start.test(text)), false, `${ritual.id} flashed the book start`);
      assert.match(await page.locator(".breath-now").innerText(), ritual.line);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test("a direct open with a saved sentence does not flash the title", async () => {
  await ensureReaderServer();
  const browser = await launchBrowser();
  const store = JSON.stringify({
    state: {
      activeReadVersion: 1,
      progress: {
        cranford: {
          breathIndex: 12,
          sentenceAt: 2,
          lastOpenedAt: Date.now(),
          sittingStartedAt: Date.now(),
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
    version: 3,
  });
  try {
    const page = await phonePage(browser, store);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.addInitScript(() => {
      const titles: string[] = [];
      const note = () => {
        if (document.querySelector(".breath-now")) return;
        const title = document.querySelector(".type-title")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (title && titles[titles.length - 1] !== title) titles.push(title);
      };
      const arm = () => {
        note();
        const obs = new MutationObserver(note);
        obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
      };
      if (document.documentElement) arm();
      else document.addEventListener("DOMContentLoaded", arm);
      (window as unknown as { __titleFlash?: string[] }).__titleFlash = titles;
    });
    await page.goto(`${ORIGIN}/salon/read/cranford`, { waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 20_000 });
    await page.waitForFunction(
      () => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") === "12:2:0",
      { timeout: 15_000 },
    );
    const titles = await page.evaluate(
      () => (window as unknown as { __titleFlash?: string[] }).__titleFlash ?? [],
    );
    assert.deepEqual(titles, [], `title flashed before the passage: ${titles.join(" | ")}`);
    assert.match(await page.locator(".breath-now").innerText(), /economy was always/);
    const hydration = errors.filter((line) => /418|422|423|425|hydration|Hydration/i.test(line));
    assert.deepEqual(hydration, [], hydration.join("\n"));
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

import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import test from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { READER_PHONE_VIEWPORT } from "./reader-chrome.ts";

const ORIGIN = "http://127.0.0.1:8080";
const READER = `${ORIGIN}/salon/read/passing?at=4`;

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

async function healthy() {
  try {
    const res = await fetch(`${ORIGIN}/salon/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await healthy()) return async () => {};
  const log = openSync("/tmp/reader-chrome-dev.log", "a");
  const child: ChildProcess = spawn("npm", ["run", "dev"], {
    cwd: "/workspace",
    detached: true,
    stdio: ["ignore", log, log],
  });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await healthy()) {
      return async () => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("reader dev server did not start");
}

async function bar(page: Page) {
  return page.evaluate(() => {
    const fade = document.querySelector("footer .chrome-fade");
    const glass = document.querySelector(".reader-glass");
    const fadeStyle = fade ? getComputedStyle(fade) : null;
    const glassStyle = glass ? getComputedStyle(glass) : null;
    const glassBox = glass?.getBoundingClientRect();
    return {
      state: document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar"),
      opacity: fadeStyle?.opacity ?? null,
      glassOpacity: glassStyle?.opacity ?? null,
      glassPointer: glassStyle?.pointerEvents ?? null,
      glassW: glassBox ? Math.round(glassBox.width) : 0,
      glassH: glassBox ? Math.round(glassBox.height) : 0,
      text: document.querySelector(".breath-now")?.textContent ?? "",
      expanded: glass?.getAttribute("aria-expanded"),
    };
  });
}

test(
  "on a touch-sized phone, page taps never open the bar and the hourglass toggles it",
  { timeout: 240_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchBrowser();
    try {
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
      const viewport = page.viewportSize();
      assert.ok(viewport, "missing viewport");
      assert.equal(viewport.width, 390);
      assert.equal(viewport.height, 844);
      assert.ok(viewport.width <= 430 && viewport.width >= 320, "not a touch-sized width");
      assert.ok(viewport.height >= 700, "not a phone height");
      const touchPoints = await page.evaluate(() => navigator.maxTouchPoints);
      assert.ok(touchPoints > 0, "viewport is not touch-capable");

      await page.addInitScript(() => localStorage.clear());
      await page.goto(READER, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Next sentence" }).waitFor();

      const opened = await bar(page);
      assert.equal(opened.state, "closed");
      assert.equal(opened.opacity, "0");
      assert.equal(opened.glassOpacity, "1");
      assert.notEqual(opened.glassPointer, "none");
      assert.ok(opened.glassW >= 44 && opened.glassH >= 44, "hourglass hit target under 44px");
      assert.ok(opened.text.length > 0);

      await page.getByRole("button", { name: "Next sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        opened.text,
      );
      const afterNext = await bar(page);
      assert.notEqual(afterNext.text, opened.text);
      assert.equal(afterNext.state, "closed", "forward page tap opened the bar");
      assert.equal(afterNext.opacity, "0");
      assert.equal(afterNext.glassOpacity, "1");

      await page.waitForTimeout(180);
      await page.getByRole("button", { name: "Previous sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        afterNext.text,
      );
      const afterPrev = await bar(page);
      assert.equal(afterPrev.text, opened.text);
      assert.equal(afterPrev.state, "closed", "back page tap opened the bar");
      assert.equal(afterPrev.opacity, "0");

      await page.locator(".reader-glass").click();
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
      );
      const shown = await bar(page);
      assert.equal(shown.state, "open", "hourglass tap did not open the bar");
      assert.equal(shown.opacity, "1");
      assert.equal(shown.expanded, "true");
      assert.equal(shown.text, opened.text, "hourglass tap turned the page");
      await page.getByRole("button", { name: "Send" }).click();
      await page.getByPlaceholder("Friend's phone — for later").waitFor();
      await page.getByRole("button", { name: "Dismiss" }).click();
      await page.getByPlaceholder("Friend's phone — for later").waitFor({ state: "detached" });
      assert.equal((await bar(page)).state, "open", "Send closed the bar");
      await page.getByRole("button", { name: "Keep" }).click();
      await page.waitForFunction(() => {
        const keep = [...document.querySelectorAll("button")].find((node) => node.textContent === "Keep");
        return keep?.className.includes("bg-red") ?? false;
      });
      assert.equal((await bar(page)).state, "open", "Keep closed the bar");

      await page.locator(".reader-glass").click();
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "closed",
      );
      const hidden = await bar(page);
      assert.equal(hidden.state, "closed", "second hourglass tap left the bar open");
      assert.equal(hidden.opacity, "0");
      assert.equal(hidden.expanded, "false");
      assert.equal(hidden.glassOpacity, "1");
      assert.equal(hidden.text, opened.text, "closing the bar turned the page");

      await page.locator(".reader-glass").click();
      await page.waitForFunction(
        () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
      );
      const again = await bar(page);
      await page.getByRole("button", { name: "Next sentence" }).click();
      await page.waitForFunction(
        (prev) => document.querySelector(".breath-now")?.textContent !== prev,
        again.text,
      );
      const afterOutside = await bar(page);
      assert.notEqual(afterOutside.text, again.text, "outside tap did not turn the page");
      assert.equal(afterOutside.state, "closed", "outside tap left the bar open");
      assert.equal(afterOutside.opacity, "0");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

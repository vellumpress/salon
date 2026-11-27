import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

/**
 * Scroll, tap, and hold each have to raise today's score.
 * A scroll used to save the place and clear the clock, so the Home chip
 * and the You page stayed put.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/botchan";

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
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (!localStorage.getItem("salon-text-size")) localStorage.setItem("salon-text-size", "1.00");
    if (!localStorage.getItem("salon-move-by")) localStorage.setItem("salon-move-by", "scroll");
  });
  return page;
}

async function openBook(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}${BOOK}`, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function sit(page: Page) {
  const sitButton = page.getByRole("button", { name: "Sit", exact: true });
  const alone = page.getByRole("button", { name: "Alone", exact: true });
  const begin = page.getByRole("button", { name: "Begin", exact: true });
  const gate = sitButton.or(alone).or(begin).last();
  const reading = page.locator(".breath-now, [data-sentence]").first();
  await gate.or(reading).first().waitFor({ timeout: 30_000 });
  if (await gate.isVisible().catch(() => false)) await gate.click();
  await reading.waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => !document.querySelector(".veil"));
  const glass = page.locator("button.reader-glass");
  if (await glass.isVisible().catch(() => false)) {
    await glass.click();
    const five = page.getByRole("button", { name: "5", exact: true });
    if (await five.isVisible().catch(() => false)) await five.click();
    const close = page.getByRole("button", { name: "Close", exact: true });
    if (await close.isVisible().catch(() => false)) await close.click();
  }
}

async function ledger(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("vellum-v1");
    const state = raw ? (JSON.parse(raw) as { state?: Record<string, unknown> }).state ?? {} : {};
    const advancesByDay = (state.advancesByDay ?? {}) as Record<string, number>;
    const minutesByDay = (state.readingMinutesByDay ?? {}) as Record<string, number>;
    const progress = (state.progress ?? {}) as Record<string, { breathIndex?: number }>;
    const frame = document.querySelector(".reader-frame");
    const fromFrame = Number(frame?.getAttribute("data-breath-index"));
    const advances = Object.values(advancesByDay).reduce((sum, n) => sum + (Number(n) || 0), 0);
    const minutes = Object.values(minutesByDay).reduce((sum, n) => sum + (Number(n) || 0), 0);
    return {
      advances,
      minutes,
      index: Number.isFinite(fromFrame) ? fromFrame : (progress.botchan?.breathIndex ?? 0),
    };
  });
}

async function scrollSentences(page: Page, count: number) {
  const start = await ledger(page);
  for (let i = 0; i < 40 && (await ledger(page)).index < start.index + count; i += 1) {
    await page.evaluate(() => {
      const flow = document.querySelector(".focus-live");
      if (!(flow instanceof HTMLElement)) return;
      flow.scrollTop += 320;
      flow.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(350);
  return ledger(page);
}

async function tapSentences(page: Page, count: number) {
  const column = page.locator("[data-reader-text]");
  for (let i = 0; i < count; i += 1) {
    const before = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
    const box = await column.boundingBox();
    assert.ok(box, "reading column missing");
    await column.tap({ position: { x: box.width * 0.78, y: box.height * 0.62 } });
    await page.waitForFunction(
      (was) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== was,
      before,
    );
  }
}

async function holdForward(page: Page) {
  const column = page.locator("[data-reader-text]");
  const box = await column.boundingBox();
  assert.ok(box, "reading column missing");
  const x = box.x + box.width * 0.78;
  const y = box.y + box.height * 0.55;
  await page.evaluate(
    async ({ x, y }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!(host instanceof HTMLElement)) return;
      host.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 4,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: 1,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 1100));
      host.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 4,
          pointerType: "touch",
          isPrimary: true,
          button: 0,
          buttons: 0,
        }),
      );
    },
    { x, y },
  );
  await page.waitForTimeout(250);
}

function scoreNumber(raw: string | null) {
  const value = Number(raw ?? "");
  return Number.isFinite(value) ? value : 0;
}

async function check(page: Page, label: string) {
  await openBook(page);
  await sit(page);
  await page.waitForTimeout(6000);
  const opened = await ledger(page);
  const scrolled = await scrollSentences(page, 8);
  const scrollSteps = scrolled.index - opened.index;
  assert.ok(scrollSteps >= 8, `${label} scroll moved ${scrollSteps}`);
  assert.equal(
    scrolled.advances - opened.advances,
    scrollSteps,
    `${label} scroll credited ${scrolled.advances - opened.advances} for ${scrollSteps} sentences`,
  );
  assert.ok(scrolled.minutes > opened.minutes, `${label} scroll added no time`);

  await page.evaluate(() => localStorage.setItem("salon-move-by", "tap"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await sit(page);
  await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-move-by") === "tap");
  const beforeTap = await ledger(page);
  await tapSentences(page, 8);
  const tapped = await ledger(page);
  assert.ok(tapped.advances - beforeTap.advances >= 8, `${label} taps credited ${tapped.advances - beforeTap.advances}`);

  const beforeHold = tapped;
  await holdForward(page);
  const held = await ledger(page);
  assert.ok(held.advances - beforeHold.advances >= 3, `${label} hold credited ${held.advances - beforeHold.advances}`);
  assert.ok(held.minutes > opened.minutes, `${label} reading added no time`);

  await page.goto(`${ORIGIN}/salon/`, { waitUntil: "domcontentloaded" });
  const chip = page.locator("[data-home-daily-score]");
  await chip.waitFor({ timeout: 20_000 });
  const home = scoreNumber(await chip.getAttribute("data-home-daily-score"));
  assert.ok(home > 1, `${label} Home score stayed ${home}`);

  await page.goto(`${ORIGIN}/salon/profile/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "You", exact: true }).waitFor({ timeout: 20_000 });
  const glass = page.locator("[data-score-glass]");
  await glass.waitFor({ timeout: 20_000 });
  const youScore = scoreNumber(await glass.getAttribute("data-sand"));
  assert.ok(youScore > 1, `${label} You score stayed ${youScore}`);
  await page.getByRole("navigation", { name: "You" }).getByRole("button", { name: "Trends", exact: true }).click();
  const week = page.locator("p.type-title").first();
  await week.waitFor({ timeout: 10_000 });
  const weekScore = scoreNumber((await week.innerText()).replace(/[^\d]/g, ""));
  assert.ok(weekScore > 1, `${label} week bars stayed ${await week.innerText()}`);
}

test("scroll, tap, and hold raise the score", { timeout: 180_000 }, async (t) => {
  await ensureReaderServer();
  const chrome = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await phone(chrome);
    await check(page, "Chromium");
    await page.context().close();
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
    const page = await phone(kit);
    await check(page, "WebKit");
    await page.context().close();
  } finally {
    await kit.close();
  }
});

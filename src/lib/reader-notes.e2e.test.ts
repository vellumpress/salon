import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/botchan?at=12";

async function openBook(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}${BOOK}`, { waitUntil: "domcontentloaded" });
      const sit = page.locator("button", { hasText: /^Sit$/ }).first();
      if (await sit.count()) await sit.click().catch(() => {});
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-face-ready") === "yes");
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

function keyOf(page: Page) {
  return page.locator(".reader-frame").getAttribute("data-spotlight-key");
}

test("the notes mark does not step the sentence and only paints a marked line", { timeout: 120_000 }, async () => {
  await ensureReaderServer();
  const browser: Browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: PHONE.deviceScaleFactor,
      userAgent: PHONE.userAgent,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("salon-move-by", "tap");
    });
    await openBook(page);
    const before = await keyOf(page);
    assert.ok(before, "spotlight missing");
    const title = (await page.locator(".reading-progress-title").innerText()).replace(/\s+/g, " ").trim();
    assert.equal(title, "Botchan");
    await page.getByRole("button", { name: "Notes" }).click();
    assert.equal(await keyOf(page), before, "the notes mark stepped the sentence");
    await page.getByRole("dialog", { name: "Notes" }).waitFor();
    await page.getByRole("button", { name: "yellow" }).click();
    await page.locator("[data-note='yellow']").first().waitFor();
    const marked = await page.locator("[data-note]").count();
    assert.ok(marked >= 1 && marked < 8, `highlight spread to ${marked} nodes`);
    await page.getByRole("button", { name: "Save this part" }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    const row = page.locator(".note-list button").first();
    await row.waitFor();
    const excerpt = (await row.innerText()).replace(/\s+/g, " ").trim();
    assert.ok(excerpt.length > 8, "saved list is empty");
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("dialog", { name: "Notes" }).waitFor({ state: "hidden" });
    assert.equal(await keyOf(page), before, "closing notes stepped the sentence");
    await page.getByRole("button", { name: "Notes" }).click();
    await row.click();
    await page.waitForFunction(
      (key) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") === key,
      before,
    );
    assert.equal(await page.locator(".reading-progress-track").count(), 1);
    assert.equal(await page.locator(".reader-glass").count(), 1);
    await context.close();
  } finally {
    await browser.close();
  }
});

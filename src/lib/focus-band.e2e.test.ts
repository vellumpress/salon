import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, type Browser, type Page } from "playwright";
import { FOCUS_DEFAULT, FOCUS_KEY, FOCUS_MAX, FOCUS_MIN } from "./focus-band.ts";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/the-house-of-mirth?at=40";

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
    if (sessionStorage.getItem("focus-booted")) return;
    sessionStorage.setItem("focus-booted", "1");
    localStorage.clear();
    localStorage.setItem("salon-move-by", "scroll");
  });
  return page;
}

async function openBook(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}${BOOK}`, { waitUntil: "domcontentloaded" });
      const sit = page.locator("button", { hasText: /^Sit$/ }).first();
      if (await sit.count()) await sit.click().catch(() => {});
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => {
        const frame = document.querySelector(".reader-frame");
        return frame?.getAttribute("data-face-ready") === "yes" && !document.querySelector(".veil");
      });
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function place(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const fade = document.querySelector(".focus-fade");
    const flow = document.querySelector(".focus-live");
    const style = fade ? getComputedStyle(fade) : null;
    return {
      key: frame?.getAttribute("data-spotlight-key") ?? "",
      index: frame?.getAttribute("data-breath-index") ?? "",
      scroll: flow instanceof HTMLElement ? flow.scrollTop : 0,
      top: style?.getPropertyValue("--focus-ink-top").trim() ?? "",
      bottom: style?.getPropertyValue("--focus-ink-bottom").trim() ?? "",
      ramp: style?.getPropertyValue("--focus-ramp").trim() ?? "",
      mask: style?.maskImage ?? "",
      blur: getComputedStyle(document.querySelector(".focus-blur-clip") ?? document.body).opacity,
      size: document.documentElement.dataset.textSize ?? "",
      focus: document.documentElement.dataset.focus ?? "",
    };
  });
}

async function setFocus(page: Page, value: number) {
  const slider = page.getByRole("slider", { name: "Focus" });
  await slider.evaluate((el, next) => {
    const input = el as HTMLInputElement;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    proto?.set?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, String(value));
  await page.waitForFunction(
    (want) => document.documentElement.dataset.focus === want,
    String(value),
  );
}

test("focus slider keeps the sentence and today's band until it is moved", { timeout: 120_000 }, async () => {
  await ensureReaderServer();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await phone(browser);
    await openBook(page);
    await page.locator("button.reader-glass").click();
    const slider = page.getByRole("slider", { name: "Focus" });
    await slider.waitFor();
    const text = page.getByRole("slider", { name: "Text size" });
    const textBox = await text.boundingBox();
    const focusBox = await slider.boundingBox();
    assert.ok(textBox && focusBox, "sliders missing");
    assert.ok(focusBox.y >= textBox.y, "Focus is not next to text size");
    await page.getByText("Fewer lines", { exact: true }).waitFor();
    await page.getByText("More lines", { exact: true }).waitFor();

    const opened = await place(page);
    assert.equal(opened.focus, String(FOCUS_DEFAULT));
    assert.equal(opened.top, "43%");
    assert.equal(opened.bottom, "73%");
    assert.equal(opened.ramp, "1");
    assert.equal(opened.size, "0.90");
    assert.equal(opened.blur, "0");
    assert.match(opened.mask, /linear-gradient/);

    await setFocus(page, FOCUS_MIN);
    const narrow = await place(page);
    assert.equal(narrow.key, opened.key, "narrow focus moved the sentence");
    assert.equal(narrow.index, opened.index);
    assert.ok(Math.abs(narrow.scroll - opened.scroll) < 1, "narrow focus scrolled");
    assert.match(narrow.top, /58%/);
    assert.match(narrow.top, /1\.75/);
    assert.equal(narrow.ramp, "1");
    assert.equal(narrow.size, "0.90");

    await setFocus(page, FOCUS_MAX);
    const wide = await place(page);
    assert.equal(wide.key, opened.key, "wide focus moved the sentence");
    assert.ok(Math.abs(wide.scroll - opened.scroll) < 1, "wide focus scrolled");
    assert.match(wide.top, /12%/, `wide top was ${wide.top}`);
    assert.match(wide.bottom, /88%/, `wide bottom was ${wide.bottom}`);
    assert.equal(wide.ramp, "0.222");

    await page.getByRole("button", { name: "Close" }).click();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(200);
    const turned = await place(page);
    assert.match(turned.top, /12%/, `turned top was ${turned.top}`);
    const box = await page.locator(".focus-fade").boundingBox();
    assert.ok(box, "mask missing after rotation");
    assert.ok(Math.abs(box.height - 390) <= 2, `mask stayed ${box.height}px`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 30_000 });
    await page.waitForFunction(
      (want) => document.documentElement.dataset.focus === want,
      String(FOCUS_MAX),
    );
    const kept = await place(page);
    assert.equal(kept.focus, String(FOCUS_MAX));
    assert.match(kept.top, /12%/, `kept top was ${kept.top}`);
    const stored = await page.evaluate((key) => localStorage.getItem(key), FOCUS_KEY);
    assert.equal(stored, String(FOCUS_MAX));

    await page.locator("button.reader-glass").click();
    await setFocus(page, FOCUS_DEFAULT);
    const back = await place(page);
    assert.equal(back.top, "43%");
    assert.equal(back.bottom, "73%");
    assert.equal(back.ramp, "1");
    assert.equal(back.key, kept.key);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Tap", exact: true }).click();
    await page.getByRole("button", { name: "Close" }).click();
    const beforeTap = await place(page);
    const column = await page.locator("[data-reader-text]").boundingBox();
    assert.ok(column, "reading column missing");
    await page.mouse.click(column.x + column.width * 0.8, column.y + column.height * 0.62);
    await page.waitForFunction(
      (was) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== was,
      beforeTap.key,
    );
    const tapped = await place(page);
    assert.notEqual(tapped.key, beforeTap.key, "a tap did not move");
    assert.equal(tapped.top, "43%");
    assert.equal(tapped.bottom, "73%");
    await page.context().close();
  } finally {
    await browser.close();
  }
});

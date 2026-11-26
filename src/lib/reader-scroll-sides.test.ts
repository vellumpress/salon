import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { groupKey, planGroups, readGroup, waitForPageRest, waitGroup } from "./reader-group-tap.ts";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/the-house-of-mirth?at=40";

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

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.removeItem("salon-move-by");
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

async function column(page: Page) {
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  const spot = await page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const flow = document.querySelector(".focus-live");
    return {
      key: frame?.getAttribute("data-spotlight-key") ?? "",
      mode: frame?.getAttribute("data-move-by") ?? "",
      scroll: flow instanceof HTMLElement ? flow.scrollTop : 0,
    };
  });
  return { box, ...spot };
}

function at(box: { x: number; y: number; width: number; height: number }, across: number, down = 0.62) {
  return {
    x: Math.round(box.x + box.width * across),
    y: Math.round(box.y + box.height * down),
  };
}

/**
 * A finger drag. It pauses in the middle, then sits still before the lift
 * so the column does not keep coasting after the finger is gone.
 */
async function drag(page: Page, from: { x: number; y: number }, pointerId: number) {
  const points = [
    { x: from.x, y: from.y, t: 0 },
    { x: from.x, y: from.y - 48, t: 40 },
    { x: from.x, y: from.y - 48, t: 180 },
    { x: from.x, y: from.y - 130, t: 250 },
    { x: from.x, y: from.y - 130, t: 400 },
    { x: from.x, y: from.y - 130, t: 440 },
  ];
  await page.evaluate(
    async ({ points, pointerId }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const base = {
        bubbles: true,
        cancelable: true,
        pointerId,
        button: 0,
        pointerType: "touch",
        isPrimary: true,
      };
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        if (!point) continue;
        const type = i === 0 ? "pointerdown" : i === points.length - 1 ? "pointerup" : "pointermove";
        const hit = document.elementFromPoint(point.x, point.y);
        const target = hit && host.contains(hit) ? hit : host;
        target.dispatchEvent(
          new PointerEvent(type, {
            ...base,
            clientX: point.x,
            clientY: point.y,
            buttons: type === "pointerup" ? 0 : 1,
          }),
        );
        const next = points[i + 1];
        if (next && next.t > point.t) {
          await new Promise((resolve) => setTimeout(resolve, next.t - point.t));
        }
      }
    },
    { points, pointerId },
  );
}

function scrolled(before: { scroll: number; key: string }, after: { scroll: number; key: string }) {
  return Math.abs(after.scroll - before.scroll) > 24 || after.key !== before.key;
}

async function check(page: Page, label: string) {
  await openBook(page);
  const size = page.viewportSize();
  assert.equal(size?.width, 390, `${label} viewport width`);
  assert.equal(size?.height, 844, `${label} viewport height`);

  const opened = await column(page);
  assert.equal(opened.mode, "scroll", `${label} did not open in scroll mode`);
  const split = opened.box.x + opened.box.width / 3;

  const leftFrom = at(opened.box, 0.12);
  assert.ok(leftFrom.x < split, `${label} left drag was not in the left third`);
  const beforeLeft = await column(page);
  await drag(page, leftFrom, 21);
  await page.waitForTimeout(240);
  const afterLeft = await column(page);
  assert.ok(
    scrolled(beforeLeft, afterLeft),
    `${label} a drag on the left third did not scroll (${beforeLeft.scroll} -> ${afterLeft.scroll}, ${beforeLeft.key} -> ${afterLeft.key})`,
  );

  await waitForPageRest(page, 8_000);
  const settled = await column(page);
  const rightFrom = at(settled.box, 0.78);
  assert.ok(rightFrom.x > settled.box.x + settled.box.width / 3, `${label} right drag was not on the right side`);
  await drag(page, rightFrom, 22);
  await page.waitForTimeout(240);
  const afterRight = await column(page);
  assert.ok(
    scrolled(settled, afterRight),
    `${label} a drag on the right side did not scroll (${settled.scroll} -> ${afterRight.scroll}, ${settled.key} -> ${afterRight.key})`,
  );

  await waitForPageRest(page, 8_000);
  await page.locator("button.reader-glass").click();
  const tapBtn = page.getByRole("button", { name: "Tap", exact: true });
  await tapBtn.click();
  await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-move-by") === "tap");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Tap", exact: true }).waitFor({ state: "hidden" });

  const tapMode = await column(page);
  assert.equal(tapMode.mode, "tap", `${label} did not switch to tap mode`);
  const tapLeft = at(tapMode.box, 0.12);
  assert.ok(tapLeft.x < tapMode.box.x + tapMode.box.width / 3, `${label} tap-mode left drag left the left third`);
  await drag(page, tapLeft, 23);
  await page.waitForTimeout(200);
  const tapLeftAfter = await column(page);
  assert.equal(tapLeftAfter.key, tapMode.key, `${label} a left drag moved the sentence in tap mode`);
  assert.ok(
    Math.abs(tapLeftAfter.scroll - tapMode.scroll) < 12,
    `${label} a left drag left the column scrolled in tap mode`,
  );

  const tapRight = at(tapLeftAfter.box, 0.78);
  await drag(page, tapRight, 24);
  await page.waitForTimeout(200);
  const tapRightAfter = await column(page);
  assert.equal(tapRightAfter.key, tapMode.key, `${label} a right drag moved the sentence in tap mode`);
  assert.ok(
    Math.abs(tapRightAfter.scroll - tapMode.scroll) < 12,
    `${label} a right drag left the column scrolled in tap mode`,
  );

  await waitForPageRest(page, 8_000);
  const forward = await planGroups(page, 1, 1);
  assert.ok(forward !== "end" && forward !== "start", `${label} could not plan a forward tap`);
  const advanceBox = (await column(page)).box;
  const advanceAt = at(advanceBox, 0.72, 0.55);
  assert.ok(advanceAt.x > advanceBox.x + advanceBox.width / 3, `${label} forward tap was not on the right side`);
  await page.touchscreen.tap(advanceAt.x, advanceAt.y);
  await waitGroup(page, forward);
  assert.equal((await readGroup(page)).key, groupKey(forward), `${label} a right tap did not advance`);

  await waitForPageRest(page, 8_000);
  const back = await planGroups(page, -1, 1);
  assert.ok(back !== "end" && back !== "start", `${label} could not plan a back tap`);
  const backBox = (await column(page)).box;
  const backAt = at(backBox, 0.12, 0.55);
  assert.ok(backAt.x < backBox.x + backBox.width / 3, `${label} back tap left the left third`);
  await page.touchscreen.tap(backAt.x, backAt.y);
  await waitGroup(page, back);
  assert.equal((await readGroup(page)).key, groupKey(back), `${label} a left tap did not go back`);
}

test(
  "a drag scrolls from either side, and a short tap still turns, in Chromium and WebKit",
  { timeout: 240_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await launch("chromium");
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
    const kit = await launch("webkit");
    try {
      const page = await phone(kit);
      await check(page, "WebKit");
      await page.context().close();
    } finally {
      await kit.close();
    }
  },
);

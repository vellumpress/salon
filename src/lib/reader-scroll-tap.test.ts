import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { groupKey, planGroups, readGroup, waitGroup } from "./reader-group-tap.ts";
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

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
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

async function advances(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("vellum-v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { state?: { progress?: Record<string, { activeAdvances?: number }> } };
    return parsed.state?.progress?.["the-house-of-mirth"]?.activeAdvances ?? 0;
  });
}

async function point(page: Page, across: number) {
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  return {
    x: Math.round(box.x + box.width * across),
    y: Math.round(box.y + box.height * 0.55),
  };
}

/** Touch points on the reading column. `t` is milliseconds from the first point. */
async function stroke(page: Page, points: { x: number; y: number; t: number }[], pointerId = 7) {
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
        host.dispatchEvent(
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

async function check(page: Page, label: string) {
  await openBook(page);
  const origin = await readGroup(page);
  const credited = await advances(page);

  const dragFrom = await point(page, 0.72);
  await stroke(page, [
    { ...dragFrom, t: 0 },
    { x: dragFrom.x, y: dragFrom.y - 9, t: 50 },
    { x: dragFrom.x, y: dragFrom.y - 18, t: 110 },
    { x: dragFrom.x, y: dragFrom.y - 18, t: 140 },
  ]);
  await page.waitForTimeout(280);
  const dragged = await readGroup(page);
  assert.equal(dragged.key, origin.key, `${label} a short drag advanced the sentence`);
  assert.equal(await advances(page), credited, `${label} a short drag counted as reading`);

  const next = await planGroups(page, 1, 1);
  const two = await planGroups(page, 1, 2);
  assert.ok(next !== "end" && next !== "start", `${label} could not plan one sentence`);
  const tapAt = await point(page, 0.72);
  await page.touchscreen.tap(tapAt.x, tapAt.y);
  await waitGroup(page, next);
  const tapped = await readGroup(page);
  assert.equal(tapped.key, groupKey(next), `${label} a clean tap did not advance one sentence`);
  if (two !== "end" && two !== "start") {
    assert.notEqual(tapped.key, groupKey(two), `${label} a clean tap advanced two sentences`);
  }
  await page.waitForTimeout(200);
  const afterTap = await advances(page);
  assert.ok(afterTap > credited, `${label} a clean tap did not count as reading`);

  const beforeFlick = await readGroup(page);
  const flickFrom = await point(page, 0.72);
  await stroke(page, [
    { ...flickFrom, t: 0 },
    { x: flickFrom.x, y: flickFrom.y - 28, t: 16 },
    { x: flickFrom.x, y: flickFrom.y - 70, t: 32 },
    { x: flickFrom.x, y: flickFrom.y - 70, t: 40 },
  ], 8);
  const flicked = await readGroup(page);
  assert.equal(flicked.key, beforeFlick.key, `${label} a flick's lift advanced the sentence`);
  await page.waitForTimeout(180);
  const stopping = await readGroup(page);
  const stopAt = await point(page, 0.7);
  await stroke(page, [
    { ...stopAt, t: 0 },
    { ...stopAt, t: 40 },
  ], 9);
  const stopped = await readGroup(page);
  assert.equal(stopped.key, stopping.key, `${label} stopping a fling advanced the sentence`);
  await page.waitForTimeout(320);
  const settled = await readGroup(page);
  await page.waitForTimeout(250);
  const later = await readGroup(page);
  assert.equal(later.key, settled.key, `${label} the scroll's end advanced another sentence`);
  assert.equal(await advances(page), afterTap, `${label} a scroll counted as reading`);

  const back = await planGroups(page, -1, 1);
  if (back !== "start" && back !== "end") {
    const backAt = await point(page, 0.12);
    await page.touchscreen.tap(backAt.x, backAt.y);
    await waitGroup(page, back);
    assert.equal((await readGroup(page)).key, groupKey(back), `${label} a left tap did not go back one sentence`);
  }
}

test(
  "a scroll is not a tap in Chromium and WebKit",
  { timeout: 180_000 },
  async (t) => {
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
  },
);

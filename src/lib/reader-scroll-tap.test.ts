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

async function waitAdvances(page: Page, min: number) {
  await page.waitForFunction(
    (floor) => {
      const raw = localStorage.getItem("vellum-v1");
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { state?: { progress?: Record<string, { activeAdvances?: number }> } };
      return (parsed.state?.progress?.["the-house-of-mirth"]?.activeAdvances ?? 0) > floor;
    },
    min,
    { timeout: 2_500 },
  );
}

/**
 * Flick, then as soon as a scroll event shows the column still moving,
 * put a finger down and up. Returns the sentence before that finger and after it.
 */
async function flickThenStop(page: Page, from: { x: number; y: number }, at: { x: number; y: number }) {
  return page.evaluate(
    async ({ from, at }) => {
      const flow = document.querySelector(".focus-live");
      const host = document.querySelector("[data-reader-text]");
      const frame = document.querySelector(".reader-frame");
      if (!(flow instanceof HTMLElement) || !host || !frame) return null;
      const key = () => frame.getAttribute("data-spotlight-key");
      const fire = (type: string, x: number, y: number, pointerId: number) => {
        host.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
      };
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const before = key();
      await new Promise<void>((resolve) => {
        let top = flow.scrollTop;
        let since = performance.now();
        const step = () => {
          const nowTop = flow.scrollTop;
          const now = performance.now();
          if (Math.abs(nowTop - top) >= 0.5) {
            top = nowTop;
            since = now;
          }
          if (now - since >= 120) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      const startTop = flow.scrollTop;
      fire("pointerdown", from.x, from.y, 8);
      await wait(16);
      fire("pointermove", from.x, from.y - 28, 8);
      await wait(16);
      fire("pointermove", from.x, from.y - 70, 8);
      await wait(8);
      fire("pointerup", from.x, from.y - 70, 8);
      const lifted = key();
      const atLift = flow.scrollTop;
      const stop = await new Promise<{ moved: boolean; beforeStop: string; afterStop: string; atLift: number; end: number }>((resolve) => {
        const timer = window.setTimeout(() => {
          flow.removeEventListener("scroll", onScroll);
          resolve({ moved: false, beforeStop: key() ?? "", afterStop: key() ?? "", atLift, end: flow.scrollTop });
        }, 1_500);
        const onScroll = () => {
          if (Math.abs(flow.scrollTop - atLift) < 0.5) return;
          flow.removeEventListener("scroll", onScroll);
          window.clearTimeout(timer);
          const beforeStop = key() ?? "";
          fire("pointerdown", at.x, at.y, 9);
          fire("pointerup", at.x, at.y, 9);
          resolve({ moved: true, beforeStop, afterStop: key() ?? "", atLift, end: flow.scrollTop });
        };
        flow.addEventListener("scroll", onScroll);
      });
      return { before, lifted, startTop, ...stop, after: key() };
    },
    { from, at },
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
  await waitAdvances(page, credited);
  await waitForPageRest(page);

  const flickFrom = await point(page, 0.72);
  const stopAt = await point(page, 0.7);
  const coast = await flickThenStop(page, flickFrom, stopAt);
  assert.ok(coast, `${label} could not watch the flick`);
  assert.equal(coast.lifted, coast.before, `${label} a flick's lift advanced the sentence`);
  assert.equal(
    coast.moved,
    true,
    `${label} the flick never moved the page (scroll ${coast.startTop} -> ${coast.atLift} -> ${coast.end})`,
  );
  assert.equal(
    coast.afterStop,
    coast.beforeStop,
    `${label} stopping a fling advanced ${coast.beforeStop} to ${coast.afterStop}`,
  );
  assert.equal(
    coast.after,
    coast.beforeStop,
    `${label} stopping a fling advanced ${coast.beforeStop} to ${coast.after} age=${coast.age} n=${coast.n}`,
  );
  const afterStop = await readGroup(page);
  assert.equal(afterStop.key, coast.beforeStop, `${label} stopping a fling advanced the sentence`);

  await waitForPageRest(page);
  const rested = await readGroup(page);
  const again = await planGroups(page, 1, 1);
  assert.ok(again !== "end" && again !== "start", `${label} could not plan a tap after the coast`);
  const afterRest = await point(page, 0.72);
  await page.touchscreen.tap(afterRest.x, afterRest.y);
  await waitGroup(page, again);
  assert.equal((await readGroup(page)).key, groupKey(again), `${label} a tap after the page stopped did not advance one`);
  assert.notEqual((await readGroup(page)).key, rested.key);

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

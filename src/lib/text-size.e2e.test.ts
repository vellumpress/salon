import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { waitForPageRest } from "./reader-group-tap.ts";
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "./text-size.ts";
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
    timezoneId: "America/New_York",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("text-size-booted")) return;
    sessionStorage.setItem("text-size-booted", "1");
    localStorage.clear();
    localStorage.setItem("salon-move-by", "tap");
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

async function geometry(page: Page) {
  return page.evaluate(() => {
    const band = (name: string) => {
      const box = document.querySelector(`[data-focus-band="${name}"]`)?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom, height: box.height } : null;
    };
    const breath = document.querySelector(".breath-now");
    const flow = document.querySelector(".focus-live");
    const sentences = [...document.querySelectorAll(".breath-now [data-focus-sentence]")];
    const now = band("now");
    let sentTop = Infinity;
    let sentBottom = -Infinity;
    for (const node of sentences) {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      sentTop = Math.min(sentTop, rect.top);
      sentBottom = Math.max(sentBottom, rect.bottom);
    }
    const sentMid = sentBottom > sentTop ? (sentTop + sentBottom) / 2 : 0;
    const nowMid = now ? (now.top + now.bottom) / 2 : 0;
    return {
      read: band("read"),
      now,
      next: band("next"),
      font: breath ? Number.parseFloat(getComputedStyle(breath).fontSize) : 0,
      family: breath ? getComputedStyle(breath).fontFamily : "",
      index: document.querySelector(".reader-frame")?.getAttribute("data-breath-index"),
      key: document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key"),
      sentence: sentences.map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim().slice(0, 80),
      delta: sentMid - nowMid,
      scroll: flow instanceof HTMLElement ? flow.scrollTop : 0,
      progress: document.querySelector("[data-reading-progress]")?.getAttribute("data-progress"),
      size: document.documentElement.dataset.textSize ?? "",
    };
  });
}

function sameBands(
  before: Awaited<ReturnType<typeof geometry>>,
  after: Awaited<ReturnType<typeof geometry>>,
  label: string,
) {
  for (const name of ["read", "now", "next"] as const) {
    const was = before[name];
    const now = after[name];
    assert.ok(was && now, `${label} ${name} band missing`);
    assert.ok(Math.abs(was.top - now.top) <= 1, `${label} ${name} top moved ${was.top} -> ${now.top}`);
    assert.ok(Math.abs(was.bottom - now.bottom) <= 1, `${label} ${name} bottom moved`);
    assert.ok(Math.abs(was.height - now.height) <= 1, `${label} ${name} height changed`);
  }
}

function placeRank(key: string | null | undefined) {
  const [index = 0, cursor = 0, spot = 0] = (key ?? "").split(":").map(Number);
  return index * 1_000_000 + cursor * 1_000 + spot;
}

function sameSentence(
  before: Awaited<ReturnType<typeof geometry>>,
  after: Awaited<ReturnType<typeof geometry>>,
  label: string,
) {
  assert.equal(after.key, before.key, `${label} moved off the sentence`);
  const shorter = before.sentence.length <= after.sentence.length ? before.sentence : after.sentence;
  const longer = shorter === before.sentence ? after.sentence : before.sentence;
  assert.ok(longer.startsWith(shorter.slice(0, 24)), `${label} changed the sentence`);
  assert.ok(
    Math.abs(after.delta) < 36,
    `${label} left the sentence ${after.delta}px off the sharp band (scroll ${before.scroll}->${after.scroll}, font ${before.font}->${after.font}, key ${before.key}->${after.key})`,
  );
}

async function openSheet(page: Page) {
  await page.locator("button.reader-glass").click();
  await page.getByRole("slider", { name: "Text size" }).waitFor();
}

async function closeSheet(page: Page) {
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("slider", { name: "Text size" }).waitFor({ state: "hidden" });
}

async function setScale(page: Page, scale: number) {
  await openSheet(page);
  const slider = page.getByRole("slider", { name: "Text size" });
  await slider.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    proto?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, scale.toFixed(2));
  await page.waitForFunction(
    (value) => document.documentElement.dataset.textSize === value,
    scale.toFixed(2),
  );
  await closeSheet(page);
}

async function advances(page: Page) {
  await page.waitForTimeout(1700);
  return page.evaluate(() => {
    const raw = localStorage.getItem("vellum-v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { state?: { progress?: Record<string, { activeAdvances?: number }> } };
    return parsed.state?.progress?.["the-house-of-mirth"]?.activeAdvances ?? 0;
  });
}

async function checkReader(page: Page, label: string) {
  await openBook(page);
  const initial = await geometry(page);
  assert.ok(initial.now && initial.now.height > 80, `${label} sharp band missing`);
  assert.ok(initial.font > 12, `${label} breath has no size`);
  assert.match(initial.family, /Cormorant Garamond/);
  assert.equal(initial.size, "1.00", `${label} did not open at the current size`);
  assert.ok(initial.progress != null, `${label} progress bar missing`);

  await openSheet(page);
  const slider = page.getByRole("slider", { name: "Text size" });
  const smallMark = page.locator(".text-size-mark-small");
  const largeMark = page.locator(".text-size-mark-large");
  assert.match(await smallMark.evaluate((el) => getComputedStyle(el).fontFamily), /Outfit/);
  assert.match(await largeMark.evaluate((el) => getComputedStyle(el).fontFamily), /Outfit/);
  assert.ok(
    Number.parseFloat(await smallMark.evaluate((el) => getComputedStyle(el).fontSize)) <
      Number.parseFloat(await largeMark.evaluate((el) => getComputedStyle(el).fontSize)),
  );
  const beforeDrag = await geometry(page);
  const creditedBefore = await advances(page);
  const box = await slider.boundingBox();
  assert.ok(box, `${label} slider missing`);
  const fraction = (1 - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN);
  const startX = box.x + box.width * fraction;
  await page.mouse.move(startX, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 12 });
  await page.waitForTimeout(50);
  const dragging = await geometry(page);
  assert.ok(dragging.font > beforeDrag.font + 1, `${label} text did not reflow while dragging`);
  sameSentence(beforeDrag, dragging, `${label} mid-drag`);
  sameBands(beforeDrag, dragging, `${label} mid-drag`);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const dragged = await geometry(page);
  sameSentence(beforeDrag, dragged, `${label} after dragging the slider`);
  sameBands(beforeDrag, dragged, `${label} after dragging the slider`);
  const creditedAfter = await advances(page);
  assert.equal(creditedAfter, creditedBefore, `${label} dragging the slider counted as reading`);
  await closeSheet(page);

  await setScale(page, TEXT_SIZE_MIN);
  const small = await geometry(page);
  sameBands(initial, small, `${label} smallest`);
  sameSentence(initial, small, `${label} smallest`);
  assert.ok(small.font < initial.font - 1, `${label} smallest did not shrink ${small.font} vs ${initial.font}`);
  assert.equal(small.size, TEXT_SIZE_MIN.toFixed(2));

  await setScale(page, 1);
  const middle = await geometry(page);
  sameBands(initial, middle, `${label} default`);
  sameSentence(initial, middle, `${label} default`);
  assert.ok(Math.abs(middle.font - initial.font) < 0.6, `${label} default size changed ${middle.font} vs ${initial.font}`);

  await setScale(page, TEXT_SIZE_MAX);
  const large = await geometry(page);
  sameBands(initial, large, `${label} largest`);
  sameSentence(initial, large, `${label} largest`);
  assert.ok(large.font > initial.font * 1.5, `${label} largest did not grow`);
  assert.equal(large.size, TEXT_SIZE_MAX.toFixed(2));

  await page.locator("button.reader-glass").click();
  await page.getByRole("button", { name: "20", exact: true }).click();
  await closeSheet(page);
  const beforeTap = await geometry(page);
  await page.mouse.click(270, 500);
  await page.waitForFunction(
    (was) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== was,
    beforeTap.key,
  );
  const tapped = await geometry(page);
  sameBands(initial, tapped, `${label} after a tap`);
  assert.ok(placeRank(tapped.key) > placeRank(beforeTap.key), `${label} a forward tap did not move`);
  const credited = await advances(page);
  assert.ok(credited >= 1, `${label} a forward tap did not count sitting time`);

  const scrolledFrom = tapped.scroll;
  await page.mouse.move(270, 620);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) await page.mouse.move(270, 620 - i * 28, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const scrolled = await geometry(page);
  sameBands(initial, scrolled, `${label} scrolled`);
  assert.ok(Math.abs(scrolled.scroll - scrolledFrom) > 40, `${label} the page did not scroll`);
  const afterScroll = await advances(page);
  assert.equal(afterScroll, credited, `${label} scrolling added sitting time`);
  // A coast can still be moving after three seconds when the shard is busy.
  await waitForPageRest(page, 8_000);

  await page.mouse.click(40, 500);
  await page.waitForFunction(
    (was) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== was,
    scrolled.key,
  );
  const back = await geometry(page);
  sameBands(initial, back, `${label} back`);
  assert.ok(placeRank(back.key) < placeRank(scrolled.key), `${label} left tap did not go back`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    (value) => document.documentElement.dataset.textSize === value,
    TEXT_SIZE_MAX.toFixed(2),
  );
  const kept = await geometry(page);
  assert.equal(kept.size, TEXT_SIZE_MAX.toFixed(2), `${label} text size did not persist`);
  sameBands(initial, kept, `${label} after reload`);
  assert.ok(kept.font > initial.font * 1.5, `${label} reloaded size shrank`);
}

test(
  "text size keeps the bands fixed in Chromium and WebKit",
  { timeout: 240_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await chromium.launch({ args: ["--no-sandbox"] });
    try {
      const page = await phone(chrome);
      await checkReader(page, "Chromium");
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
      await checkReader(page, "WebKit");
      await page.context().close();
    } finally {
      await kit.close();
    }
  },
);

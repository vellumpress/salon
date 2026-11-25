import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const SHOTS = "/opt/cursor/artifacts";

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
    if (sessionStorage.getItem("salon-test-cleared") === "1") return;
    localStorage.clear();
    sessionStorage.setItem("salon-test-cleared", "1");
  });
  return page;
}

async function openAt(page: Page, path: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon${path}`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      const sit = page.locator("button", { hasText: /^Sit$/ }).first();
      if (await sit.count()) await sit.click().catch(() => {});
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => {
        const frame = document.querySelector(".reader-frame");
        return (
          frame?.getAttribute("data-bound") === "full" &&
          frame.getAttribute("data-face-ready") === "yes" &&
          !document.querySelector(".veil") &&
          Boolean(localStorage.getItem("vellum-v1"))
        );
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

function themeColor(page: Page) {
  return page.locator('meta[name="theme-color"]').first().getAttribute("content");
}

function chapterLabel(page: Page) {
  return page.locator("header.reader-mark button").getAttribute("data-chapter-label");
}

function breathIndex(page: Page) {
  return page.locator(".reader-frame").getAttribute("data-breath-index").then((value) => Number(value));
}

async function point(page: Page, across: number, down = 0.55) {
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  return {
    x: Math.round(box.x + box.width * across),
    y: Math.round(box.y + box.height * down),
  };
}

async function stroke(page: Page, from: { x: number; y: number }, dy: number, pointerId: number) {
  await page.evaluate(
    async ({ from, dy, pointerId }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const steps = 6;
      const base = {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: "touch",
        isPrimary: true,
      };
      host.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...base,
          clientX: from.x,
          clientY: from.y,
          button: 0,
          buttons: 1,
        }),
      );
      for (let i = 1; i <= steps; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 16));
        host.dispatchEvent(
          new PointerEvent("pointermove", {
            ...base,
            clientX: from.x,
            clientY: from.y + (dy * i) / steps,
            buttons: 1,
          }),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      host.dispatchEvent(
        new PointerEvent("pointerup", {
          ...base,
          clientX: from.x,
          clientY: from.y + dy,
          button: 0,
          buttons: 0,
        }),
      );
    },
    { from, dy, pointerId },
  );
}

async function progress(page: Page, id: string) {
  return page.evaluate((workId) => {
    const raw = localStorage.getItem("vellum-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: {
        progress?: Record<
          string,
          { breathIndex?: number; sittingStartedAt?: number | null; activeAdvances?: number }
        >;
        sceneCrossesByDay?: Record<string, number>;
        advancesByDay?: Record<string, number>;
      };
    };
    const item = parsed.state?.progress?.[workId];
    const crosses = Object.values(parsed.state?.sceneCrossesByDay ?? {}).reduce((sum, n) => sum + n, 0);
    const advances = Object.values(parsed.state?.advancesByDay ?? {}).reduce((sum, n) => sum + n, 0);
    return {
      index: item?.breathIndex ?? 0,
      sitting: item?.sittingStartedAt ?? 0,
      active: item?.activeAdvances ?? 0,
      crosses,
      advances,
    };
  }, id);
}

async function runMark(page: Page, label: string, shoot: boolean) {
  await openAt(page, "/read/the-bridge-of-san-luis-rey?at=10");
  const tint = await themeColor(page);
  assert.ok(tint, `${label} theme-color missing`);
  const header = page.locator("header.reader-mark");
  await header.waitFor();
  const opened = await header.evaluate((el) => {
    const style = getComputedStyle(el);
    return { opacity: style.opacity, events: style.pointerEvents };
  });
  assert.equal(await page.locator(".reader-frame").getAttribute("data-mark"), "on");
  assert.equal(opened.opacity, "1", `${label} mark row started hidden`);
  assert.notEqual(opened.events, "none");
  if (shoot) {
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/mark-before.png` });
  }

  const before = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  const forward = await point(page, 0.72);
  await page.touchscreen.tap(forward.x, forward.y);
  await page.waitForFunction(
    (key) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== key,
    before,
  );
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    const row = document.querySelector("header.reader-mark");
    return frame?.getAttribute("data-mark") === "off" && row instanceof HTMLElement && getComputedStyle(row).opacity === "0";
  });
  const hidden = await header.evaluate((el) => {
    const style = getComputedStyle(el);
    return { opacity: style.opacity, events: style.pointerEvents };
  });
  assert.equal(hidden.opacity, "0", `${label} mark row stayed visible`);
  assert.equal(hidden.events, "none");
  assert.equal(await themeColor(page), tint, `${label} status bar tint changed`);
  if (shoot) await page.screenshot({ path: `${SHOTS}/mark-after.png` });

  const hiddenKey = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  const back = await point(page, 0.12);
  await page.touchscreen.tap(back.x, back.y);
  await page.waitForFunction(
    (key) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== key,
    hiddenKey,
  );
  assert.equal(await page.locator(".reader-frame").getAttribute("data-mark"), "off", `${label} back tap brought the bar back`);

  const reveal = page.locator("[data-mark-reveal]");
  const strip = await reveal.boundingBox();
  assert.ok(strip && strip.height >= 20 && strip.height <= 40, `${label} top edge is not a thin strip`);
  const beforeReveal = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  await reveal.click();
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    const row = document.querySelector("header.reader-mark");
    return frame?.getAttribute("data-mark") === "on" && row instanceof HTMLElement && getComputedStyle(row).opacity === "1";
  });
  assert.equal(
    await header.evaluate((el) => getComputedStyle(el).opacity),
    "1",
    `${label} top edge did not bring the bar back`,
  );
  assert.equal(
    await page.locator(".reader-frame").getAttribute("data-spotlight-key"),
    beforeReveal,
    `${label} the top edge turned the page`,
  );
  const afterReveal = beforeReveal;
  await page.touchscreen.tap(forward.x, forward.y);
  await page.waitForFunction(
    (key) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== key,
    afterReveal,
  );
  await page.waitForFunction(
    () => document.querySelector(".reader-frame")?.getAttribute("data-mark") === "off",
  );

  const pullFrom = await point(page, 0.72, 0.42);
  await stroke(page, pullFrom, 110, 11);
  await page.waitForTimeout(240);
  await page.waitForFunction(
    () => document.querySelector(".reader-frame")?.getAttribute("data-mark") === "on",
    undefined,
    { timeout: 4_000 },
  );
  assert.equal(await themeColor(page), tint, `${label} reveal changed the status bar`);
}

async function runCrossing(page: Page, label: string, shoot: boolean) {
  await openAt(page, "/read/the-bridge-of-san-luis-rey?at=62");
  assert.equal(await breathIndex(page), 62);
  const sign = page.locator("[data-chapter-signpost]").first();
  await sign.waitFor();
  const title = (await sign.locator(".chapter-signpost-title").innerText()).replace(/\s+/g, " ");
  assert.match(title, /Part Two: The Marquesa de Montemayor/i);
  const face = await sign.locator(".chapter-signpost-title").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      family: style.fontFamily,
      caps: style.fontVariantCaps,
      rule: getComputedStyle(el.nextElementSibling as Element).height,
    };
  });
  assert.match(face.family, /Outfit/);
  assert.match(face.caps, /small-caps/);
  assert.equal(face.rule, "1px");
  assert.match((await chapterLabel(page)) ?? "", /PART ONE/i);
  const before = await progress(page, "the-bridge-of-san-luis-rey");
  assert.ok(before, `${label} progress missing`);

  for (let tap = 0; tap < 8; tap += 1) {
    if ((await breathIndex(page)) >= 63) break;
    const spot = await point(page, 0.72);
    await page.touchscreen.tap(spot.x, spot.y);
    await page.waitForTimeout(220);
  }
  assert.ok((await breathIndex(page)) >= 63, `${label} tap did not enter Part Two`);
  assert.match(await page.locator(".breath-now").innerText(), /Spanish schoolboy|Marquesa de Montemayor/);
  if (shoot) await page.screenshot({ path: `${SHOTS}/bridge-crossed.png` });
  const crossed = await progress(page, "the-bridge-of-san-luis-rey");
  assert.ok(crossed, `${label} progress missing after the cross`);
  assert.ok(crossed.sitting > 0, `${label} the sit closed at the chapter`);
  assert.equal(crossed.sitting, before.sitting, `${label} the sit restarted at the chapter`);
  assert.ok(crossed.active > before.active || crossed.advances > before.advances, `${label} the cross did not score`);
  assert.ok(crossed.crosses > before.crosses, `${label} the cross did not count a chapter`);

  for (let tap = 0; tap < 8; tap += 1) {
    const text = await page.locator(".breath-now").innerText();
    if (/finger of God/i.test(text) && (await breathIndex(page)) <= 62) break;
    const spot = await point(page, 0.12);
    await page.touchscreen.tap(spot.x, spot.y);
    await page.waitForTimeout(220);
  }
  assert.match(await page.locator(".breath-now").innerText(), /finger of God/i);
  assert.ok((await breathIndex(page)) <= 62, `${label} back tap stayed in Part Two`);

  await page.evaluate(() => {
    const flow = document.querySelector(".focus-live");
    const sign = flow?.querySelector("[data-chapter-signpost]");
    if (!(flow instanceof HTMLElement) || !(sign instanceof HTMLElement)) throw new Error("signpost missing");
    const pane = flow.getBoundingClientRect();
    const parent = flow.parentElement;
    const leadRaw = parent ? Number.parseFloat(getComputedStyle(parent).marginTop) : 0;
    const lead = Number.isFinite(leadRaw) && leadRaw < 0 ? -leadRaw : 0;
    const third = (pane.height - lead) / 3;
    const focusY = pane.top + lead + third * 1.5;
    const rect = sign.getBoundingClientRect();
    flow.scrollTop += (rect.top + rect.bottom) / 2 - focusY;
  });
  await page.waitForFunction(
    () => /PART TWO/i.test(document.querySelector("header.reader-mark button")?.getAttribute("data-chapter-label") ?? ""),
    undefined,
    { timeout: 4_000 },
  );
  const signInBand = await page.evaluate(() => {
    const flow = document.querySelector(".focus-live");
    const sign = flow?.querySelector("[data-chapter-signpost]");
    if (!(flow instanceof HTMLElement) || !(sign instanceof HTMLElement)) return false;
    const pane = flow.getBoundingClientRect();
    const parent = flow.parentElement;
    const leadRaw = parent ? Number.parseFloat(getComputedStyle(parent).marginTop) : 0;
    const lead = Number.isFinite(leadRaw) && leadRaw < 0 ? -leadRaw : 0;
    const third = (pane.height - lead) / 3;
    const top = pane.top + lead + third;
    const bottom = top + third;
    const rect = sign.getBoundingClientRect();
    const center = (rect.top + rect.bottom) / 2;
    return center >= top && center <= bottom;
  });
  assert.equal(signInBand, true, `${label} the signpost left the sharp band`);
  if (shoot) await page.screenshot({ path: `${SHOTS}/bridge-signpost.png` });

  for (let tap = 0; tap < 8; tap += 1) {
    if ((await breathIndex(page)) >= 63) break;
    const spot = await point(page, 0.72);
    await page.touchscreen.tap(spot.x, spot.y);
    await page.waitForTimeout(220);
  }
  const resumedAt = await breathIndex(page);
  assert.ok(resumedAt >= 63);
  await page.goto(`${ORIGIN}/salon/read/the-bridge-of-san-luis-rey`, { waitUntil: "domcontentloaded" });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => !document.querySelector(".veil"), undefined, { timeout: 15_000 });
  await page.waitForFunction(
    (at) => Number(document.querySelector(".reader-frame")?.getAttribute("data-breath-index")) >= at,
    resumedAt,
  );

  await openAt(page, "/read/gitanjali?at=7");
  await page.locator("[data-chapter-signpost]").first().waitFor();
  assert.match(await page.locator(".chapter-signpost-title").first().innerText(), /poem 2/i);
  for (let tap = 0; tap < 6; tap += 1) {
    if ((await breathIndex(page)) >= 8) break;
    const spot = await point(page, 0.72);
    await page.touchscreen.tap(spot.x, spot.y);
    await page.waitForTimeout(200);
  }
  assert.ok((await breathIndex(page)) >= 8, `${label} poem tap stayed in Poem 1`);
  assert.match((await chapterLabel(page)) ?? "", /Poem 2/);

  await openAt(page, "/read/the-house-of-mirth?at=305");
  await page.locator("[data-chapter-signpost]").first().waitFor();
  assert.match(await page.locator(".chapter-signpost-title").first().innerText(), /chapter 2/i);
  for (let tap = 0; tap < 8; tap += 1) {
    if ((await breathIndex(page)) >= 306) break;
    const spot = await point(page, 0.72);
    await page.touchscreen.tap(spot.x, spot.y);
    await page.waitForTimeout(200);
  }
  assert.ok((await breathIndex(page)) >= 306, `${label} mirth tap stayed in chapter 1`);
  assert.match((await chapterLabel(page)) ?? "", /Chapter 2/);
}

async function browsers(t: import("node:test").TestContext, run: (page: Page, label: string, shoot: boolean) => Promise<void>) {
  await ensureReaderServer();
  const chrome = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await phone(chrome);
    await run(page, "Chromium", true);
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
    await run(page, "WebKit", false);
    await page.context().close();
  } finally {
    await kit.close();
  }
}

test("the mark row hides while reading and comes back from the top edge", { timeout: 180_000 }, async (t) => {
  await browsers(t, runMark);
});

test(
  "a chapter, a poem, and a book flow into the next one by scroll and by tap",
  { timeout: 240_000 },
  async (t) => {
    await browsers(t, runCrossing);
  },
);

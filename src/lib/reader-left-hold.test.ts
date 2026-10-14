import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";
import { groupKey, planGroups, waitGroup, type GroupPlace } from "./reader-group-tap.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const WORK = "cranford";
const AT = 3;
const HOLD_MS = 15_000;

type Spot = { index: number; cursor: number; bound: string; text: string };

async function launch(name: "chromium" | "webkit"): Promise<Browser> {
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
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      get: () => true,
    });
    const media = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (String(query).includes("display-mode") && String(query).includes("standalone")) {
        return {
          matches: true,
          media: String(query),
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        } as MediaQueryList;
      }
      return media(query);
    };
  });
  return page;
}

async function place(page: Page): Promise<Spot> {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const focus = document.querySelector(".breath-now [data-focus-sentence]");
    return {
      index: Number(frame?.getAttribute("data-breath-index") ?? -1),
      cursor: Number(frame?.getAttribute("data-sentence-at") ?? -1),
      bound: frame?.getAttribute("data-bound") ?? "",
      text: (focus?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 90),
    };
  });
}

async function tapLeft(page: Page) {
  const host = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(host, "reading column missing");
  await page.touchscreen.tap(host.x + host.width * 0.12, host.y + host.height * 0.55);
}

async function waitPlace(page: Page, want: { index: number; cursor: number }) {
  await page.waitForFunction(
    (expected) => {
      const frame = document.querySelector(".reader-frame");
      return (
        frame?.getAttribute("data-breath-index") === String(expected.index) &&
        frame.getAttribute("data-sentence-at") === String(expected.cursor)
      );
    },
    want,
    { timeout: 8_000 },
  );
}

/** The sentence must still be the one the tap landed on. */
async function holds(page: Page, want: { index: number; cursor: number }, ms: number) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const now = await place(page);
    assert.equal(now.index, want.index, `index left ${want.index} for ${now.index} (${now.bound}) ${now.text}`);
    assert.equal(
      now.cursor,
      want.cursor,
      `cursor left ${want.cursor} for ${now.cursor} (${now.bound}) ${now.text}`,
    );
    await page.waitForTimeout(250);
  }
}

async function run(name: "chromium" | "webkit") {
  const browser = await launch(name);
  try {
    const page = await phone(browser);
    let releaseFull = () => {};
    const fullText = new Promise<void>((resolve) => {
      releaseFull = resolve;
    });
    let heldFull = 0;
    await page.route(/catalog\/texts\/cranford/, async (route) => {
      heldFull += 1;
      await fullText;
      await route.continue();
    });

    await page.goto(`${ORIGIN}/salon/read/${WORK}?at=${AT}`, { waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 30_000 });
    await page.waitForFunction(
      (at) => {
        const frame = document.querySelector(".reader-frame");
        return (
          frame?.getAttribute("data-breath-index") === String(at) &&
          !document.querySelector(".veil")
        );
      },
      AT,
      { timeout: 30_000 },
    );
    const opened = await place(page);
    assert.equal(opened.index, AT, `${name} did not open on the link`);
    assert.equal(opened.cursor, 0, `${name} did not open on the first sentence`);
    assert.equal((await page.viewportSize())?.width, 390);
    assert.equal((await page.viewportSize())?.height, 844);
    const duringLoad = opened.bound === "opening";
    assert.equal(duringLoad, heldFull > 0, `${name} full text was not still loading`);

    const once = await planGroups(page, -1, 1);
    assert.notEqual(once, "start");
    assert.notEqual(once, "end");
    await tapLeft(page);
    await waitGroup(page, once as GroupPlace);
    releaseFull();
    await page.waitForFunction(
      () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
      { timeout: 30_000 },
    );
    const afterFull = await place(page);
    assert.equal(afterFull.index, (once as GroupPlace).index, `${name} full text undid the left tap`);
    assert.equal(afterFull.cursor, (once as GroupPlace).cursor, `${name} full text moved the sentence`);
    await holds(page, once as GroupPlace, HOLD_MS);

    const rapid = await planGroups(page, -1, 5);
    assert.notEqual(rapid, "start");
    assert.notEqual(rapid, "end");
    for (let i = 0; i < 5; i += 1) await tapLeft(page);
    await waitGroup(page, rapid as GroupPlace);
    await holds(page, rapid as GroupPlace, 2_000);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 30_000 });
    await page.waitForFunction(
      () => {
        const frame = document.querySelector(".reader-frame");
        return Boolean(frame?.getAttribute("data-breath-index")) && !document.querySelector(".veil");
      },
      { timeout: 30_000 },
    );
    const afterReload = await planGroups(page, -1, 1);
    assert.notEqual(afterReload, "start");
    assert.notEqual(afterReload, "end");
    await tapLeft(page);
    await waitGroup(page, afterReload as GroupPlace);
    await page.waitForFunction(
      () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
      { timeout: 30_000 },
    );
    await holds(page, afterReload as GroupPlace, 3_000);
  } finally {
    await browser.close();
  }
}

test(
  "Chromium: a left tap stays through the full text, a burst, and a reload",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    try {
      await run("chromium");
    } finally {
      await stop();
    }
  },
);

test(
  "WebKit standalone: a left tap stays through the full text, a burst, and a reload",
  { timeout: 120_000 },
  async (t) => {
    try {
      const probe = await webkit.launch();
      await probe.close();
    } catch {
      t.skip("WebKit is not installed");
      return;
    }
    const stop = await ensureReaderServer();
    try {
      await run("webkit");
    } finally {
      await stop();
    }
  },
);

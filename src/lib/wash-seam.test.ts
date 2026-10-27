import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { webKitRequired } from "./require-webkit.ts";
import {
  washField,
  washFieldSource,
  washSeamDetectorSource,
  washSeams,
  type WashBand,
  type WashSeam,
} from "./wash-seam.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/the-house-of-mirth?at=2056";
const MOGENS = "/salon/read/mogens-and-other-stories?at=1";

function paint(width: number, height: number, rgb: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return data;
}

function shadeColumn(data: Uint8ClampedArray, width: number, x: number, y0: number, y1: number, by: number) {
  for (let y = y0; y < y1; y += 1) {
    const i = (width * y + x) * 4;
    data[i] = Math.max(0, Math.min(255, data[i]! + by));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + by));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + by));
  }
}

const band: WashBand = { top: 20, bottom: 500, left: 8, right: 1100 };

test("a straight low-contrast edge is a seam, and a soft wash is not", () => {
  const flat = paint(1170, 520, [47, 191, 90]);
  assert.deepEqual(washSeams(flat, 1170, 520, band), []);

  const seam = paint(1170, 520, [47, 191, 90]);
  shadeColumn(seam, 1170, 72, 40, 420, -8);
  const hits = washSeams(seam, 1170, 520, band);
  assert.ok(
    hits.some((hit) => hit.axis === "vertical" && hit.at === 72),
    `expected the column clip, got ${JSON.stringify(hits)}`,
  );

  const ruled = paint(1170, 520, [47, 191, 90]);
  for (let x = 8; x < 1100; x += 1) {
    const i = (1170 * 200 + x) * 4;
    ruled[i] = Math.max(0, ruled[i]! - 8);
    ruled[i + 1] = Math.max(0, ruled[i + 1]! - 8);
    ruled[i + 2] = Math.max(0, ruled[i + 2]! - 8);
  }
  const across = washSeams(ruled, 1170, 520, band);
  assert.ok(
    across.some((hit) => hit.axis === "horizontal" && hit.at === 200),
    `expected the horizontal rule, got ${JSON.stringify(across)}`,
  );

  const fade = paint(1170, 520, [47, 191, 90]);
  for (let y = 40; y < 500; y += 1) {
    const step = Math.round((y - 40) * 0.35);
    for (let x = 0; x < 1170; x += 1) {
      const i = (1170 * y + x) * 4;
      fade[i + 1] = Math.max(0, Math.min(255, fade[i + 1]! - step));
    }
  }
  assert.deepEqual(washSeams(fade, 1170, 520, band), []);

  const glyph = paint(1170, 520, [47, 191, 90]);
  for (let y = 80; y < 130; y += 1) shadeColumn(glyph, 1170, 90, y, y + 1, -40);
  assert.deepEqual(washSeams(glyph, 1170, 520, band), []);
});

const fieldBand: WashBand = { top: 8, bottom: 200, left: 8, right: 360 };

test("a wash field is empty when flat, legible on a stroke, and soft when the shapes fade", () => {
  const flat = paint(400, 220, [122, 24, 50]);
  assert.equal(washField(flat, 400, 220, fieldBand).verdict, "empty");

  const stroke = paint(400, 220, [122, 24, 50]);
  for (let y = 20; y < 180; y += 1) shadeColumn(stroke, 400, 40, y, y + 1, 80);
  assert.equal(washField(stroke, 400, 220, fieldBand).verdict, "legible");

  const soft = paint(400, 220, [122, 24, 50]);
  for (let y = 30; y < 170; y += 1) {
    for (let x = 40; x < 300; x += 1) {
      const lift = Math.round(14 * Math.exp(-((x - 160) ** 2) / 1800) * (0.65 + 0.35 * Math.sin(y / 9)));
      const i = (400 * y + x) * 4;
      soft[i] = Math.min(255, soft[i]! + lift);
      soft[i + 1] = Math.min(255, soft[i + 1]! + lift);
      soft[i + 2] = Math.min(255, soft[i + 2]! + lift);
    }
  }
  const judged = washField(soft, 400, 220, fieldBand);
  assert.equal(judged.verdict, "shapes", JSON.stringify(judged));
});

async function webkitInstalled() {
  try {
    const browser = await webkit.launch();
    await browser.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    return false;
  }
}

async function openReader(page: Page, when: string, path = BOOK) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}${path}`, { waitUntil: "domcontentloaded" });
      const sit = page.locator("button", { hasText: /^Sit$/ }).first();
      if (await sit.count()) await sit.click().catch(() => {});
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(
        (phase) => {
          const frame = document.querySelector(".reader-frame");
          return (
            frame?.getAttribute("data-face-ready") === "yes" &&
            frame.getAttribute("data-daylight") === phase &&
            !document.querySelector(".veil")
          );
        },
        when,
        { timeout: 30_000 },
      );
      await page.waitForFunction(() => {
        const focus = document.querySelector("[data-focus-sentence]");
        if (!focus) return false;
        const rects = [...focus.getClientRects()].filter((rect) => rect.width > 2 && rect.height > 2);
        if (rects.length === 0) return false;
        return Math.min(...rects.map((rect) => rect.top)) > 240;
      }, { timeout: 15_000 });
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function phone(browser: Browser, tint: "evening" | "night" | "off") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
    timezoneId: "America/New_York",
  });
  const page = await context.newPage();
  await page.clock.install({
    time: new Date(tint === "night" ? "2026-10-27T03:30:00Z" : "2026-10-27T00:30:00Z"),
  });
  await page.addInitScript((mode) => {
    localStorage.clear();
    if (mode === "off") localStorage.setItem("salon-daylight-colors", "0");
  }, tint);
  return page;
}

async function stepTo(page: Page, snippet: string) {
  for (let n = 0; n < 6; n += 1) {
    const hit = await page.evaluate(
      (needle) => (document.querySelector("[data-focus-sentence]")?.textContent ?? "").includes(needle),
      snippet,
    );
    if (hit) {
      await page.waitForFunction(() => {
        const focus = document.querySelector("[data-focus-sentence]");
        if (!focus) return false;
        const rects = [...focus.getClientRects()].filter((rect) => rect.width > 2 && rect.height > 2);
        return rects.length > 0 && Math.min(...rects.map((rect) => rect.top)) > 240;
      }, { timeout: 10_000 });
      return;
    }
    await page.locator("[data-turn='next']").click();
    await page.waitForTimeout(320);
  }
  const now = await page.evaluate(
    () => document.querySelector("[data-focus-sentence]")?.textContent ?? "",
  );
  assert.ok(now.includes(snippet), `spotlight never reached “${snippet}”, saw “${now.slice(0, 80)}”`);
}

async function screenshotSeams(page: Page): Promise<WashSeam[]> {
  const geom = await page.evaluate(() => {
    const focus = document.querySelector("[data-focus-sentence]");
    const rects = focus ? [...focus.getClientRects()] : [];
    let bottom = 0;
    for (const rect of rects) bottom = Math.max(bottom, rect.bottom);
    const fold = document.querySelector(".upcoming-fold");
    const pane = document.querySelector(".reading-pane");
    const breath = document.querySelector(".breath-now");
    const foldBox = fold?.getBoundingClientRect();
    const paneBox = pane?.getBoundingClientRect();
    const breathBox = breath?.getBoundingClientRect();
    const upcoming = document.querySelector(".upcoming-slot .look-line");
    const upcomingTop = upcoming?.getBoundingClientRect().top ?? null;
    const root = document.documentElement;
    return {
      bottom,
      breathBottom: breathBox?.bottom ?? null,
      dpr: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      foldLeft: foldBox?.left ?? null,
      foldWidth: foldBox?.width ?? null,
      paneWidth: paneBox?.width ?? null,
      upcomingTop,
      focusFilter: focus ? getComputedStyle(focus).filter : "",
      pastOpacity: getComputedStyle(document.querySelector(".breath-sentence.is-past") ?? document.body).opacity,
    };
  });
  assert.equal(geom.dpr, 3);
  assert.ok(geom.scrollWidth <= geom.innerWidth + 1, `page scrolls sideways (${geom.scrollWidth})`);
  assert.equal(geom.focusFilter, "none");
  if (geom.foldLeft != null && geom.paneWidth != null && geom.foldWidth != null) {
    assert.ok(Math.abs(geom.foldLeft) <= 1, `wash is inset at ${geom.foldLeft}`);
    assert.ok(
      Math.abs(geom.foldWidth - geom.paneWidth) <= 2,
      `wash width ${geom.foldWidth} != pane ${geom.paneWidth}`,
    );
  }
  if (geom.upcomingTop != null && geom.breathBottom != null) {
    const gap = geom.upcomingTop - geom.breathBottom;
    assert.ok(gap > 2 && gap < 22, `upcoming text moved, gap ${gap.toFixed(1)}px`);
  }

  const png = (await page.screenshot({ type: "png" })).toString("base64");
  const top = Math.max(1, Math.round(geom.bottom * geom.dpr) - 6);
  const height = Math.round(geom.innerHeight * geom.dpr);
  const width = Math.round(geom.innerWidth * geom.dpr);
  const scan: WashBand = {
    top,
    bottom: height - Math.round(120 * geom.dpr),
    left: 8,
    right: width - 8,
  };
  const found = await page.evaluate(
    async ({ png: source, scan: limits, fn }) => {
      const blob = await (await fetch(`data:image/png;base64,${source}`)).blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bmp, 0, 0);
      const image = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const detect = new Function(
        "data",
        "width",
        "height",
        "band",
        `return (${fn})(data, width, height, band)`,
      ) as (
        data: Uint8ClampedArray,
        width: number,
        height: number,
        band: WashBand,
      ) => WashSeam[];
      return detect(image.data, bmp.width, bmp.height, limits);
    },
    { png, scan, fn: washSeamDetectorSource() },
  );
  return found;
}

async function assertClean(page: Page, label: string) {
  await openReader(page, label === "off" ? "off" : label);
  const ahead = await screenshotSeams(page);
  assert.deepEqual(ahead, [], `${label} window with text still ahead: ${JSON.stringify(ahead)}`);
  const shade = await page.evaluate(() => {
    const run = document.querySelector(".ahead-run");
    const veil = run?.querySelector(".ahead-shade");
    if (!run || !veil) return null;
    const rects = [...run.getClientRects()];
    const box = veil.getBoundingClientRect();
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return {
      covers: box.top <= top + 1 && box.bottom >= bottom - 1,
      wide: box.width >= window.innerWidth,
      top: box.top,
      bottom: box.bottom,
      runTop: top,
      runBottom: bottom,
    };
  });
  if (shade) {
    assert.equal(shade.covers, true, `${label} shade misses the ahead lines ${JSON.stringify(shade)}`);
    assert.equal(shade.wide, true, `${label} shade is not full width ${JSON.stringify(shade)}`);
  }
  await stepTo(page, "but her mind shrank");
  const lit = await screenshotSeams(page);
  assert.deepEqual(lit, [], `${label} lit passage: ${JSON.stringify(lit)}`);
}

/** Mogens keeps the rest of the breath under the wash. Shapes stay, letters do not. */
async function assertFaintShapes(page: Page, label: string) {
  await openReader(page, label === "off" ? "off" : label, MOGENS);
  const png = (await page.screenshot({ type: "png" })).toString("base64");
  const stats = await page.evaluate(
    async ({ png: source, seamFn, fieldFn }) => {
      const blob = await (await fetch(`data:image/png;base64,${source}`)).blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bmp, 0, 0);
      const image = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const { data, width, height } = image;
      const focus = document.querySelector("[data-focus-sentence]");
      const rects = focus ? [...focus.getClientRects()].filter((rect) => rect.width > 2 && rect.height > 2) : [];
      const bottom = rects.reduce((max, rect) => Math.max(max, rect.bottom), 0);
      const dpr = window.devicePixelRatio;
      const y0 = Math.min(height - 2, Math.round((bottom + 36) * dpr));
      const y1 = Math.min(height - 1, Math.round((bottom + 150) * dpr));
      const detect = new Function(
        "data",
        "width",
        "height",
        "band",
        `return (${seamFn})(data, width, height, band)`,
      ) as (
        data: Uint8ClampedArray,
        width: number,
        height: number,
        band: WashBand,
      ) => WashSeam[];
      const judge = new Function(
        "data",
        "width",
        "height",
        "band",
        `return (${fieldFn})(data, width, height, band)`,
      ) as (
        data: Uint8ClampedArray,
        width: number,
        height: number,
        band: WashBand,
      ) => { verdict: string; variance: number; sharp: number };
      const seamBand = {
        top: Math.max(1, y0),
        bottom: y1,
        left: 8,
        right: width - 8,
      };
      const shapeBand = {
        top: y0,
        bottom: y1,
        left: Math.round(48 * dpr),
        right: width - Math.round(48 * dpr),
      };
      const fold = document.querySelector(".passage-ahead, .upcoming-fold");
      const box = fold?.getBoundingClientRect();
      const shade = document.querySelector(".passage-ahead-shade, .upcoming-shade");
      const focusFilter = focus ? getComputedStyle(focus).filter : "";
      return {
        seams: detect(data, width, height, seamBand),
        field: judge(data, width, height, shapeBand),
        foldLeft: box?.left ?? null,
        foldWidth: box?.width ?? null,
        pane: window.innerWidth,
        shade: shade ? getComputedStyle(shade).backgroundColor : "",
        focusFilter,
      };
    },
    { png, seamFn: washSeamDetectorSource(), fieldFn: washFieldSource() },
  );
  assert.deepEqual(stats.seams, [], `${label} Mogens seam ${JSON.stringify(stats.seams)}`);
  assert.equal(stats.field.verdict, "shapes", `${label} wash field ${JSON.stringify(stats.field)}`);
  assert.equal(stats.focusFilter, "none", `${label} focus is blurred`);
  assert.ok(stats.foldLeft != null && Math.abs(stats.foldLeft) <= 1, `${label} wash inset ${stats.foldLeft}`);
  assert.ok(
    stats.foldWidth != null && Math.abs(stats.foldWidth - stats.pane) <= 2,
    `${label} wash width ${stats.foldWidth}`,
  );
  assert.match(stats.shade, /0\.5\)/, `${label} shade is not a half wash ${stats.shade}`);
}

test(
  "the spotlight wash has no rectangular seam on a phone",
  { timeout: 360_000 },
  async (t) => {
    await ensureReaderServer();
    const browser = await chromium.launch();
    try {
      const evening = await phone(browser, "evening");
      await assertClean(evening, "evening");
      await assertFaintShapes(evening, "evening");
      await evening.context().close();
      const paper = await phone(browser, "off");
      await assertClean(paper, "off");
      await paper.context().close();
      const night = await phone(browser, "night");
      await assertClean(night, "night");
      await assertFaintShapes(night, "night");
      await night.context().close();
    } finally {
      await browser.close();
    }

    if (!(await webkitInstalled())) {
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      t.diagnostic("WebKit is not installed; chromium still gates the wash");
      return;
    }
    const browserKit = await webkit.launch();
    try {
      const evening = await phone(browserKit, "evening");
      await assertClean(evening, "evening");
      await assertFaintShapes(evening, "evening");
      await evening.context().close();
      const paper = await phone(browserKit, "off");
      await assertClean(paper, "off");
      await paper.context().close();
      const night = await phone(browserKit, "night");
      await assertClean(night, "night");
      await assertFaintShapes(night, "night");
      await night.context().close();
    } finally {
      await browserKit.close();
    }
  },
);

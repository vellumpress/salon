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
        const bands = [...document.querySelectorAll<HTMLElement>("[data-focus-band]")];
        const mirrorFilter = document.querySelector(".focus-blur-clip")?.getAttribute("data-mirror-filter") ?? "";
        if (!focus || bands.length !== 3 || !mirrorFilter.includes("blur")) return false;
        const rects = [...focus.getClientRects()].filter((rect) => rect.width > 2 && rect.height > 2);
        if (rects.length === 0) return false;
        const now = document.querySelector<HTMLElement>('[data-focus-band="now"]');
        if (!now) return false;
        const box = now.getBoundingClientRect();
        const mid = rects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) / rects.length;
        return box.height > 80 && mid > box.top && mid < box.bottom;
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
    localStorage.setItem("salon-move-by", "tap");
    if (mode === "off") localStorage.setItem("salon-daylight-colors", "0");
  }, tint);
  return page;
}

async function settledInBand(page: Page) {
  await page.waitForFunction(() => {
    const track = document.querySelector<HTMLElement>(".focus-live .center-track");
    const now = document.querySelector("[data-focus-band='now']")?.getBoundingClientRect();
    const focus = document.querySelector("[data-focus-sentence]");
    if (!track || !now || !focus || track.dataset.ready !== "1") return false;
    const rects = [...focus.getClientRects()].filter((rect) => rect.width > 2 && rect.height > 2);
    if (rects.length === 0) return false;
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const mid = (top + bottom) / 2;
    return mid > now.top && mid < now.bottom;
  }, { timeout: 8_000 });
}

async function stepTo(page: Page, snippet: string) {
  for (let n = 0; n < 6; n += 1) {
    const hit = await page.evaluate(
      (needle) => (document.querySelector("[data-focus-sentence]")?.textContent ?? "").includes(needle),
      snippet,
    );
    if (hit) {
      await settledInBand(page);
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

async function bandSnapshot(page: Page) {
  return page.evaluate(() => {
    const pane = document.querySelector(".reading-pane");
    const paneBox = pane?.getBoundingClientRect();
    const bands = ["read", "now", "next"].map((name) => {
      const node = document.querySelector<HTMLElement>(`[data-focus-band="${name}"]`);
      const box = node?.getBoundingClientRect();
      return box
        ? { name, top: box.top, bottom: box.bottom, left: box.left, width: box.width, height: box.height }
        : null;
    });
    const focusNodes = [...document.querySelectorAll<HTMLElement>("[data-focus-sentence]")];
    let focusTop = Infinity;
    let focusBottom = -Infinity;
    for (const node of focusNodes) {
      const box = node.getBoundingClientRect();
      if (box.height <= 0) continue;
      focusTop = Math.min(focusTop, box.top);
      focusBottom = Math.max(focusBottom, box.bottom);
    }
    const sentences = [...document.querySelectorAll<HTMLElement>(".focus-live .breath-sentence")].map((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        top: box.top,
        bottom: box.bottom,
        filter: style.filter,
        opacity: style.opacity,
      };
    });
    const wash = document.querySelector(".focus-wash");
    const washBox = wash?.getBoundingClientRect();
    const mirrorFilter = document.querySelector(".focus-blur-clip")?.getAttribute("data-mirror-filter") ?? "";
    const breath = document.querySelector(".focus-live .breath-now");
    const upcoming = document.querySelector(".focus-live .upcoming-slot .look-line");
    const glass = document.querySelector(".reader-glass");
    const glassStyle = glass ? getComputedStyle(glass) : null;
    return {
      pane: paneBox
        ? { top: paneBox.top, bottom: paneBox.bottom, left: paneBox.left, width: paneBox.width, height: paneBox.height }
        : null,
      bands,
      focusTop: Number.isFinite(focusBottom) ? focusTop : null,
      focusBottom: Number.isFinite(focusBottom) ? focusBottom : null,
      focusFilter: focusNodes[0] ? getComputedStyle(focusNodes[0]).filter : "",
      sentences,
      wash: washBox
        ? {
            left: washBox.left,
            width: washBox.width,
            top: washBox.top,
            image: wash ? getComputedStyle(wash).backgroundImage : "",
          }
        : null,
      mirrorFilter,
      breathBottom: breath?.getBoundingClientRect().bottom ?? null,
      upcomingTop: upcoming?.getBoundingClientRect().top ?? null,
      glassBackdrop: glassStyle?.backdropFilter ?? glassStyle?.getPropertyValue("-webkit-backdrop-filter") ?? "",
      glassBackground: glassStyle?.backgroundColor ?? "",
      dpr: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

function assertBands(geom: Awaited<ReturnType<typeof bandSnapshot>>, label: string) {
  assert.equal(geom.dpr, 3, label);
  assert.ok(geom.scrollWidth <= geom.innerWidth + 1, `${label} page scrolls sideways (${geom.scrollWidth})`);
  assert.equal(geom.focusFilter, "none", `${label} focus sentence is blurred`);
  assert.ok(geom.pane, `${label} pane missing`);
  assert.equal(geom.bands.length, 3, label);
  const [read, now, next] = geom.bands;
  assert.ok(read && now && next, `${label} a band is missing`);
  const lead = read.top - geom.pane.top;
  const span = geom.pane.height - lead;
  const third = span / 3;
  for (const band of [read, now, next]) {
    assert.ok(Math.abs(band.height - third) <= 2, `${label} ${band.name} is ${band.height}px, third is ${third}`);
    assert.ok(Math.abs(band.left) <= 1, `${label} ${band.name} is inset`);
    assert.ok(Math.abs(band.width - geom.pane.width) <= 2, `${label} ${band.name} is not the pane width`);
  }
  assert.ok(Math.abs(now.top - read.bottom) <= 1, `${label} sharp band moved off the read band`);
  assert.ok(Math.abs(next.top - now.bottom) <= 1, `${label} bottom band moved off the sharp band`);
  assert.ok(Math.abs(next.bottom - geom.pane.bottom) <= 2, `${label} bottom band stops early`);
  assert.ok(geom.focusTop != null && geom.focusBottom != null, `${label} focus missing`);
  const mid = (geom.focusTop + geom.focusBottom) / 2;
  assert.ok(mid > now.top + 4 && mid < now.bottom - 4, `${label} focus center ${mid} left the sharp band ${now.top}-${now.bottom}`);
  const inside = geom.sentences.filter((sentence) => sentence.bottom > now.top + 8 && sentence.top < now.bottom - 8);
  assert.ok(inside.length > 0, `${label} no sentence in the sharp band`);
  for (const sentence of inside) {
    assert.equal(sentence.filter, "none", `${label} a sentence inside the sharp band is blurred`);
    assert.equal(sentence.opacity, "1", `${label} a sentence inside the sharp band is dimmed`);
  }
  assert.ok(geom.wash, `${label} wash missing`);
  assert.ok(Math.abs(geom.wash.left) <= 1, `${label} wash is inset at ${geom.wash.left}`);
  assert.ok(
    Math.abs(geom.wash.width - geom.pane.width) <= 2,
    `${label} wash width ${geom.wash.width} != pane ${geom.pane.width}`,
  );
  assert.match(geom.wash.image, /0\.38|38%/, `${label} wash is not a light frost ${geom.wash.image}`);
  assert.match(geom.mirrorFilter, /blur\(8px\)/, `${label} bottom band is not blurred (${geom.mirrorFilter})`);
  assert.ok(!/blur\(/.test(geom.glassBackdrop), `${label} hourglass has a backdrop blur`);
  assert.match(geom.glassBackground, /transparent|rgba\(0,\s*0,\s*0,\s*0\)/, `${label} hourglass has a square ${geom.glassBackground}`);
  if (geom.upcomingTop != null && geom.breathBottom != null) {
    const gap = geom.upcomingTop - geom.breathBottom;
    assert.ok(gap > 2 && gap < 28, `${label} upcoming text moved, gap ${gap.toFixed(1)}px`);
  }
}

async function screenshotSeams(page: Page): Promise<WashSeam[]> {
  const geom = await bandSnapshot(page);
  assertBands(geom, "wash");
  const png = (await page.screenshot({ type: "png" })).toString("base64");
  const now = geom.bands[1];
  const next = geom.bands[2];
  assert.ok(now && next);
  const top = Math.max(1, Math.round((now.bottom - 36) * geom.dpr));
  const height = Math.round(geom.innerHeight * geom.dpr);
  const width = Math.round(geom.innerWidth * geom.dpr);
  const scan: WashBand = {
    top,
    bottom: Math.min(height - 4, Math.round((next.top + 48) * geom.dpr)),
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
  const before = await bandSnapshot(page);
  const ahead = await screenshotSeams(page);
  assert.deepEqual(ahead, [], `${label} window with text still ahead: ${JSON.stringify(ahead)}`);
  await stepTo(page, "but her mind shrank");
  const after = await bandSnapshot(page);
  assertBands(after, `${label} after a step`);
  for (let i = 0; i < before.bands.length; i += 1) {
    const was = before.bands[i];
    const now = after.bands[i];
    assert.ok(was && now, `${label} band ${i} disappeared`);
    assert.ok(Math.abs(was.top - now.top) <= 1, `${label} ${was.name} top moved ${was.top} -> ${now.top}`);
    assert.ok(
      Math.abs(was.bottom - now.bottom) <= 1,
      `${label} ${was.name} bottom moved ${was.bottom} -> ${now.bottom}`,
    );
  }
  const lit = await screenshotSeams(page);
  assert.deepEqual(lit, [], `${label} lit passage: ${JSON.stringify(lit)}`);
}

/** The bottom band keeps shapes, not letters. The middle band stays sharp. */
async function assertFaintShapes(page: Page, label: string) {
  await openReader(page, label === "off" ? "off" : label, MOGENS);
  const geom = await bandSnapshot(page);
  assertBands(geom, `${label} Mogens`);
  const before = geom.bands.map((band) => (band ? { top: band.top, bottom: band.bottom } : null));
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
      const dpr = window.devicePixelRatio;
      const now = document.querySelector('[data-focus-band="now"]')?.getBoundingClientRect();
      const next = document.querySelector('[data-focus-band="next"]')?.getBoundingClientRect();
      const read = document.querySelector('[data-focus-band="read"]')?.getBoundingClientRect();
      if (!now || !next || !read) throw new Error("bands missing");
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
      const inset = Math.round(28 * dpr);
      const column = {
        left: Math.round(48 * dpr),
        right: width - Math.round(48 * dpr),
      };
      const sharpBand = {
        top: Math.round(now.top * dpr) + inset,
        bottom: Math.round(now.bottom * dpr) - inset,
        ...column,
      };
      const washBand = {
        top: Math.round(next.top * dpr) + inset,
        bottom: Math.min(height - 2, Math.round(next.bottom * dpr) - Math.round(80 * dpr)),
        ...column,
      };
      const seamBand = {
        top: Math.max(1, Math.round(now.bottom * dpr) - inset),
        bottom: Math.min(height - 1, Math.round(next.top * dpr) + inset),
        left: 8,
        right: width - 8,
      };
      const focus = document.querySelector("[data-focus-sentence]");
      return {
        seams: detect(data, width, height, seamBand),
        sharp: judge(data, width, height, sharpBand),
        field: judge(data, width, height, washBand),
        focusFilter: focus ? getComputedStyle(focus).filter : "",
        readTop: read.top,
      };
    },
    { png, seamFn: washSeamDetectorSource(), fieldFn: washFieldSource() },
  );
  assert.deepEqual(stats.seams, [], `${label} Mogens seam ${JSON.stringify(stats.seams)}`);
  assert.equal(stats.sharp.verdict, "legible", `${label} sharp band ${JSON.stringify(stats.sharp)}`);
  assert.equal(stats.field.verdict, "shapes", `${label} wash field ${JSON.stringify(stats.field)}`);
  assert.equal(stats.focusFilter, "none", `${label} focus is blurred`);
  await page.locator("[data-turn='next']").click();
  await settledInBand(page);
  const after = await bandSnapshot(page);
  for (let i = 0; i < before.length; i += 1) {
    const was = before[i];
    const now = after.bands[i];
    assert.ok(was && now, `${label} band ${i} disappeared after a step`);
    assert.ok(Math.abs(was.top - now.top) <= 1 && Math.abs(was.bottom - now.bottom) <= 1, `${label} band moved`);
  }
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

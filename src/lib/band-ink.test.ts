import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import {
  bandGlyphSamplerSource,
  hueCosine,
  luminanceSide,
  sampleBandGlyph,
  type BandSample,
  type Rgb,
  type SampleRect,
} from "./band-ink.ts";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { webKitRequired } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const BOOK = "/salon/read/the-bridge-of-san-luis-rey?at=40";

function paint(width: number, height: number, rgb: Rgb) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return data;
}

function stroke(
  data: Uint8ClampedArray,
  width: number,
  x0: number,
  x1: number,
  y: number,
  rgb: Rgb,
) {
  for (let x = x0; x < x1; x += 1) {
    const i = (width * y + x) * 4;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }
}

test("a band glyph is the pixel that leaves the page color, on the ink's hue", () => {
  const cream: Rgb = [255, 248, 238];
  const red: Rgb = [122, 24, 50];
  const black: Rgb = [17, 17, 17];
  const field = paint(120, 80, red);
  stroke(field, 120, 40, 90, 40, cream);
  const sharp = sampleBandGlyph(field, 120, 80, { name: "now", top: 20, bottom: 60, left: 4, right: 110 });
  assert.deepEqual(sharp.background, red);
  assert.deepEqual(sharp.glyph, cream);
  assert.ok(sharp.contrast > 200, `sharp contrast ${sharp.contrast}`);

  const faded = paint(120, 80, red);
  stroke(faded, 120, 40, 90, 30, [188, 136, 144]);
  const read = sampleBandGlyph(faded, 120, 80, { name: "read", top: 8, bottom: 50, left: 4, right: 110 });
  assert.ok(
    hueCosine(read.glyph, read.background, sharp.glyph, sharp.background) > 0.9,
    `faded cream left the ink hue ${JSON.stringify(read)}`,
  );
  assert.ok(luminanceSide(read.glyph, read.background) > 0, "faded cream went dark");
  assert.ok(
    Math.abs(luminanceSide(read.glyph, read.background)) <
      Math.abs(luminanceSide(sharp.glyph, sharp.background)),
    "frost is as hard as the focus",
  );

  const buried = paint(120, 80, red);
  stroke(buried, 120, 40, 90, 30, black);
  const wrong = sampleBandGlyph(buried, 120, 80, { name: "read", top: 8, bottom: 50, left: 4, right: 110 });
  assert.ok(
    hueCosine(wrong.glyph, wrong.background, sharp.glyph, sharp.background) < 0.2,
    "black frost text was accepted as cream",
  );
  assert.ok(luminanceSide(wrong.glyph, wrong.background) < 0, "black frost text did not darken");

  const viaSource = new Function(`return (${bandGlyphSamplerSource()})`)() as (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    rect: SampleRect,
  ) => BandSample;
  assert.deepEqual(
    viaSource(field, 120, 80, { name: "now", top: 20, bottom: 60, left: 4, right: 110 }),
    sharp,
  );
});

const PHASES = [
  { id: "morning", time: "2026-10-27T13:00:00Z", daylight: "morning" },
  { id: "midday", time: "2026-10-27T18:00:00Z", daylight: "midday" },
  { id: "evening", time: "2026-10-27T22:00:00Z", daylight: "evening" },
  { id: "night", time: "2026-10-27T03:30:00Z", daylight: "night" },
  { id: "off", time: "2026-10-27T18:00:00Z", daylight: "off" },
] as const;

async function openReader(page: Page, phase: (typeof PHASES)[number]) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}${BOOK}`, { waitUntil: "domcontentloaded" });
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(
        (want) => {
          const frame = document.querySelector(".reader-frame");
          return (
            frame?.getAttribute("data-face-ready") === "yes" &&
            frame.getAttribute("data-daylight") === want &&
            !document.querySelector(".veil")
          );
        },
        phase.daylight,
        { timeout: 30_000 },
      );
      await page.waitForFunction(() => {
        const focus = document.querySelector("[data-focus-sentence]");
        const now = document.querySelector('[data-focus-band="now"]')?.getBoundingClientRect();
        const clip = document.querySelector(".focus-blur-clip");
        const mirror = clip?.getAttribute("data-mirror-filter") ?? "";
        const ink = clip?.getAttribute("data-mirror-ink") ?? "";
        const focusColor = focus ? getComputedStyle(focus).color : "";
        if (!focus || !now || now.height < 80 || !mirror.includes("blur")) return false;
        if (!ink || ink === "transparent" || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(ink)) return false;
        if (ink !== focusColor) return false;
        const rects = [...focus.getClientRects()].filter((rect) => rect.width > 2 && rect.height > 2);
        if (rects.length === 0) return false;
        const mid = rects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) / rects.length;
        return mid > now.top && mid < now.bottom;
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

async function phone(browser: Browser, phase: (typeof PHASES)[number]) {
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
  await page.clock.install({ time: new Date(phase.time) });
  await page.addInitScript((off) => {
    localStorage.clear();
    if (off) localStorage.setItem("salon-daylight-colors", "0");
  }, phase.daylight === "off");
  return page;
}

async function sampledBands(page: Page) {
  const png = (await page.screenshot({ type: "png" })).toString("base64");
  return page.evaluate(
    async ({ png: source, fn }) => {
      const blob = await (await fetch(`data:image/png;base64,${source}`)).blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bmp, 0, 0);
      const image = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const sample = new Function(`return (${fn})`)() as (
        data: Uint8ClampedArray,
        width: number,
        height: number,
        rect: SampleRect,
      ) => BandSample;
      const dpr = bmp.width / window.innerWidth;
      const fade = 28 * dpr;
      const chrome = 72 * dpr;
      const bands = ["read", "now", "next"].map((name) => {
        const box = document.querySelector(`[data-focus-band="${name}"]`)?.getBoundingClientRect();
        if (!box) throw new Error(`missing ${name}`);
        const top = (name === "now" ? box.top * dpr + fade : box.top * dpr + (name === "next" ? fade : 8 * dpr));
        const bottom =
          name === "next"
            ? box.bottom * dpr - chrome
            : name === "now"
              ? box.bottom * dpr - fade
              : box.bottom * dpr - fade;
        return sample(image.data, bmp.width, bmp.height, {
          name,
          top: Math.round(top),
          bottom: Math.round(bottom),
          left: Math.round(box.left * dpr),
          right: Math.round(box.right * dpr) - 8,
        });
      });
      const frost = document.querySelector(".focus-frost");
      const wash = document.querySelector(".focus-wash");
      const clip = document.querySelector(".focus-blur-clip");
      const styleOf = (node: Element | null) => (node ? getComputedStyle(node) : null);
      const frostStyle = styleOf(frost);
      const washStyle = styleOf(wash);
      const clipStyle = styleOf(clip);
      return {
        bands,
        mirrorInk: clip?.getAttribute("data-mirror-ink") ?? "",
        focusColor: getComputedStyle(document.querySelector("[data-focus-sentence]")!).color,
        wash: washStyle?.backgroundImage ?? "",
        frostBlend: frostStyle?.mixBlendMode ?? "",
        washBlend: washStyle?.mixBlendMode ?? "",
        frostBackdrop: frostStyle?.backdropFilter || frostStyle?.getPropertyValue("-webkit-backdrop-filter") || "",
        washBackdrop: washStyle?.backdropFilter || washStyle?.getPropertyValue("-webkit-backdrop-filter") || "",
        clipBackdrop: clipStyle?.backdropFilter || clipStyle?.getPropertyValue("-webkit-backdrop-filter") || "",
      };
    },
    { png, fn: bandGlyphSamplerSource() },
  );
}

function assertSameInk(samples: BandSample[], label: string) {
  const now = samples.find((band) => band.name === "now");
  assert.ok(now, `${label} sharp band missing`);
  const focusSide = luminanceSide(now.glyph, now.background);
  assert.ok(Math.abs(focusSide) > 40, `${label} sharp text has no ink ${JSON.stringify(now)}`);
  for (const band of samples) {
    const side = luminanceSide(band.glyph, band.background);
    const hue = hueCosine(band.glyph, band.background, now.glyph, now.background);
    assert.ok(hue > 0.8, `${label} ${band.name} hue ${hue.toFixed(2)} ${JSON.stringify(band)} left the sharp ink`);
    assert.ok(
      Math.sign(side) === Math.sign(focusSide),
      `${label} ${band.name} darkened off the ink (side ${side.toFixed(1)}, focus ${focusSide.toFixed(1)})`,
    );
    if (band.name !== "now") {
      assert.ok(Math.abs(side) > 8, `${label} ${band.name} text does not show through (${side.toFixed(1)})`);
      assert.ok(
        Math.abs(side) < Math.abs(focusSide) * 0.72,
        `${label} ${band.name} is as sharp as the focus (${side.toFixed(1)} vs ${focusSide.toFixed(1)})`,
      );
    }
  }
}

async function assertPhase(page: Page, phase: (typeof PHASES)[number], browserName: string) {
  await openReader(page, phase);
  const label = `${browserName} ${phase.id}`;
  const shot = await sampledBands(page);
  assertSameInk(shot.bands, label);
  assert.match(shot.wash, /0\.38|38%/, `${label} frost opacity ${shot.wash}`);
  assert.equal(shot.frostBlend, "normal", `${label} frost blend ${shot.frostBlend}`);
  assert.equal(shot.washBlend, "normal", `${label} wash blend ${shot.washBlend}`);
  assert.ok(!/blur\(/.test(shot.frostBackdrop), `${label} frost backdrop ${shot.frostBackdrop}`);
  assert.ok(!/blur\(/.test(shot.washBackdrop), `${label} wash backdrop ${shot.washBackdrop}`);
  assert.ok(!/blur\(/.test(shot.clipBackdrop), `${label} mirror backdrop ${shot.clipBackdrop}`);
  assert.ok(shot.mirrorInk.length > 0, `${label} mirror ink was not stamped`);
  assert.equal(shot.mirrorInk, shot.focusColor, `${label} mirror ink ${shot.mirrorInk} != focus ${shot.focusColor}`);
}

test(
  "frost text keeps the sharp band's ink in every tint, in Chromium and WebKit",
  { timeout: 240_000 },
  async (t) => {
    await ensureReaderServer();
    const browser = await chromium.launch();
    try {
      for (const phase of PHASES) {
        const page = await phone(browser, phase);
        try {
          await assertPhase(page, phase, "chromium");
        } finally {
          await page.context().close();
        }
      }
    } finally {
      await browser.close();
    }

    let kit: Browser;
    try {
      kit = await webkit.launch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      t.diagnostic("WebKit is not installed; chromium still gates the band ink");
      return;
    }
    try {
      for (const phase of PHASES) {
        const page = await phone(kit, phase);
        try {
          await assertPhase(page, phase, "webkit");
        } finally {
          await page.context().close();
        }
      }
    } finally {
      await kit.close();
    }
  },
);

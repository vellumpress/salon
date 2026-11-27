import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

/**
 * The sharp band is 43–73% of the viewport and does not move while the
 * text does. A resize follows the new screen, then holds still again.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

type MaskFrame = {
  boxTop: number;
  boxHeight: number;
  boxLeft: number;
  boxWidth: number;
  inkTop: string;
  inkBottom: string;
  line: string;
  mask: string;
  bandTop: number;
  bandBottom: number;
  index: number;
  scene: string;
  scroll: number;
};

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

async function openBook(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/the-house-of-mirth`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      const sit = page.getByRole("button", { name: /^Sit$/ }).first();
      if (await sit.isVisible().catch(() => false)) {
        await sit.click();
        await page.locator(".veil").waitFor({ state: "hidden", timeout: 15_000 });
      }
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-face-ready") === "yes");
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function readFrames(page: Page, mode: "scroll" | "tap"): Promise<MaskFrame[]> {
  return page.evaluate(async (kind) => {
    const fade = document.querySelector(".focus-fade");
    const host = document.querySelector("[data-reader-text]");
    const frame = document.querySelector(".reader-frame");
    if (!(fade instanceof HTMLElement) || !(host instanceof HTMLElement) || !frame) {
      throw new Error("reader missing");
    }
    const read = () => {
      const style = getComputedStyle(fade);
      const box = fade.getBoundingClientRect();
      const inkTop = style.getPropertyValue("--focus-ink-top").trim();
      const inkBottom = style.getPropertyValue("--focus-ink-bottom").trim();
      const topPct = Number.parseFloat(inkTop) / 100;
      const bottomPct = Number.parseFloat(inkBottom) / 100;
      return {
        boxTop: Math.round(box.top),
        boxHeight: Math.round(box.height),
        boxLeft: Math.round(box.left),
        boxWidth: Math.round(box.width),
        inkTop,
        inkBottom,
        line: style.getPropertyValue("--focus-line").trim(),
        mask: (style.maskImage || "").replace(/(\d+\.\d+)/g, (value) => String(Math.round(Number(value)))),
        bandTop: Math.round(box.top + box.height * topPct),
        bandBottom: Math.round(box.top + box.height * bottomPct),
        index: Number(frame.getAttribute("data-breath-index") ?? "-1"),
        scene: frame.getAttribute("data-scene") ?? "",
        scroll: Math.round((document.querySelector(".focus-live") as HTMLElement | null)?.scrollTop ?? 0),
      };
    };
    const frames: MaskFrame[] = [];
    let running = true;
    const watch = () => {
      if (!running) return;
      frames.push(read());
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    const started = performance.now();
    if (kind === "scroll") {
      while (performance.now() - started < 3_500) {
        host.dispatchEvent(new WheelEvent("wheel", { deltaY: 160, bubbles: true, cancelable: true }));
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      }
    } else {
      const box = host.getBoundingClientRect();
      const x = box.left + box.width * 0.78;
      const y = box.top + box.height * 0.58;
      for (let step = 0; step < 8; step += 1) {
        const base = {
          bubbles: true,
          cancelable: true,
          pointerId: 4,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
        };
        host.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1 }));
        host.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0 }));
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
    running = false;
    return frames;
  }, mode);
}

function assertSteady(frames: MaskFrame[], label: string) {
  assert.ok(frames.length > 40, `${label} only sampled ${frames.length} frames`);
  const first = frames[0];
  assert.equal(first?.inkTop, "43%", `${label} band top`);
  assert.equal(first?.inkBottom, "73%", `${label} band bottom`);
  assert.equal(first?.boxTop, 0, `${label} mask is not at the top of the screen`);
  for (const frame of frames) {
    assert.equal(frame.boxTop, first?.boxTop, `${label} mask moved`);
    assert.equal(frame.boxHeight, first?.boxHeight, `${label} mask resized`);
    assert.equal(frame.boxLeft, first?.boxLeft, `${label} mask shifted sideways`);
    assert.equal(frame.boxWidth, first?.boxWidth, `${label} mask width changed`);
    assert.equal(frame.inkTop, first?.inkTop, `${label} ink top changed`);
    assert.equal(frame.inkBottom, first?.inkBottom, `${label} ink bottom changed`);
    assert.equal(frame.line, first?.line, `${label} line height changed`);
    assert.equal(frame.mask, first?.mask, `${label} mask image changed`);
    assert.equal(frame.bandTop, first?.bandTop, `${label} sharp edge moved`);
    assert.equal(frame.bandBottom, first?.bandBottom, `${label} lower edge moved`);
  }
}

async function contextFor(browser: Browser) {
  return browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
}

test(
  "the fade band stays on the same pixels for every frame of a long scroll",
  { timeout: 180_000 },
  async (t) => {
    await ensureReaderServer();
    async function check(engine: "chromium" | "webkit") {
      const browser = await launch(engine);
      try {
        const context = await contextFor(browser);
        const page = await context.newPage();
        await page.addInitScript(() => {
          localStorage.clear();
          localStorage.setItem("salon-move-by", "scroll");
        });
        await openBook(page);
        const scrolled = await readFrames(page, "scroll");
        const scenes = new Set(scrolled.map((frame) => frame.scene));
        const indexes = scrolled.map((frame) => frame.index);
        const span = Math.max(...indexes) - Math.min(...indexes);
        const scrolledPx = Math.max(...scrolled.map((frame) => frame.scroll)) - Math.min(...scrolled.map((frame) => frame.scroll));
        assert.ok(scrolledPx > 1200, `${engine} only scrolled ${scrolledPx}px`);
        assert.ok(span >= 8 || scenes.size > 1, `${engine} crossed only ${span} sentences in ${[...scenes].join(",")}`);
        assertSteady(scrolled, `${engine} scroll`);

        await page.setViewportSize({ width: 390, height: 700 });
        await page.evaluate(() => window.dispatchEvent(new Event("resize")));
        await page.waitForTimeout(120);
        const fitted = await page.evaluate(() => {
          const fade = document.querySelector(".focus-fade");
          if (!(fade instanceof HTMLElement)) throw new Error("mask missing");
          const box = fade.getBoundingClientRect();
          const vh = window.innerHeight;
          return {
            height: Math.round(box.height),
            vh,
            bandTop: Math.round(box.top + box.height * 0.43),
            bandBottom: Math.round(box.top + box.height * 0.73),
          };
        });
        assert.equal(fitted.vh, 700, `${engine} viewport`);
        assert.ok(Math.abs(fitted.height - fitted.vh) <= 2, `${engine} mask stayed ${fitted.height}px on a ${fitted.vh}px screen`);
        assert.ok(Math.abs(fitted.bandTop - Math.round(fitted.vh * 0.43)) <= 2, `${engine} band top ${fitted.bandTop}`);
        assert.ok(
          Math.abs(fitted.bandBottom - Math.round(fitted.vh * 0.73)) <= 2,
          `${engine} band bottom ${fitted.bandBottom}`,
        );
        const after = await readFrames(page, "scroll");
        assertSteady(after, `${engine} after resize`);
        await context.close();
      } finally {
        await browser.close();
      }
    }
    await check("chromium");
    if (!(await webkitInstalled())) {
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      skipWithoutWebKit(t);
      return;
    }
    await check("webkit");
  },
);

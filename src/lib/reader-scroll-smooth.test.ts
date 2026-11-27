import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

/**
 * A fling must not rebuild the sentences, and a chapter crossing must not
 * shift the line that was on screen. Frame times are recorded for the report.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

type Trace = {
  frames: number;
  overBudget: number;
  p95: number;
  max: number;
  longTasks: number;
  longMs: number;
  cls: number;
  remounts: number;
  anchorDrift: number;
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

async function openSoil(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("smooth-booted")) return;
    sessionStorage.setItem("smooth-booted", "1");
    localStorage.clear();
    localStorage.setItem("salon-move-by", "scroll");
  });
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/shallow-soil`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      await page.locator(".veil").waitFor({ timeout: 4_000 }).catch(() => undefined);
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

async function trace(page: Page, mode: "fling" | "cross"): Promise<Trace> {
  return page.evaluate(async (kind) => {
    const flow = document.querySelector(".focus-live");
    if (!(flow instanceof HTMLElement)) throw new Error("missing column");
    const deltas: number[] = [];
    let remounts = 0;
    let longTasks = 0;
    let longMs = 0;
    let cls = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(".column-breath, .breath-block, .look-line, .breath-now")) remounts += 1;
        }
      }
    });
    observer.observe(flow, { childList: true, subtree: true });
    const perf = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (entry.entryType === "layout-shift" && !shift.hadRecentInput) cls += shift.value ?? 0;
        if (entry.entryType === "longtask") {
          longTasks += 1;
          longMs += entry.duration;
        }
      }
    });
    try {
      perf.observe({ type: "layout-shift", buffered: false });
      perf.observe({ type: "longtask", buffered: false });
    } catch {
      /* a browser without longtask still reports frames */
    }
    const anchorOf = () => {
      const nodes = [...flow.querySelectorAll<HTMLElement>("[data-sentence]")];
      const mid = flow.getBoundingClientRect().top + flow.clientHeight * 0.5;
      let best: HTMLElement | null = null;
      let closest = Infinity;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.height < 2 || rect.width < 2) continue;
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - mid);
        if (dist < closest) {
          closest = dist;
          best = node;
        }
      }
      const rect = best?.getBoundingClientRect();
      return rect ? rect.top + rect.height / 2 : 0;
    };
    const started = performance.now();
    let last = started;
    const stop = started + (kind === "fling" ? 5_000 : 1_600);
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        deltas.push(now - last);
        last = now;
        // Stay inside the painted window for the fling. The chapter pass
        // runs far enough to load the next scene once the finger is gone.
        flow.scrollTop += kind === "fling" ? 8 : 48;
        if (now < stop) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    const before = kind === "cross" ? anchorOf() : 0;
    if (kind === "cross") await new Promise((resolve) => setTimeout(resolve, 500));
    const anchorDrift = kind === "cross" ? Math.abs(anchorOf() - before) : 0;
    observer.disconnect();
    perf.disconnect();
    deltas.sort((a, b) => a - b);
    const p95 = deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * 0.95))] ?? 0;
    const max = deltas[deltas.length - 1] ?? 0;
    const overBudget = deltas.filter((delta) => delta > 32).length;
    return { frames: deltas.length, overBudget, p95, max, longTasks, longMs, cls, remounts, anchorDrift };
  }, mode);
}

async function run(browser: Browser, engine: string) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  try {
    await openSoil(page);
    await page.locator("[data-reader-text]").evaluate((host) => {
      host.dispatchEvent(new WheelEvent("wheel", { deltaY: 80, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(400);
    const fling = await trace(page, "fling");
    console.log(`${engine} fling ${JSON.stringify(fling)}`);
    assert.equal(fling.remounts, 0, `${engine} fling remounted ${fling.remounts} text nodes`);
    assert.ok(fling.cls < 0.1, `${engine} fling CLS ${fling.cls}`);
    assert.ok(fling.frames > 20, `${engine} fling only produced ${fling.frames} frames`);
    console.log(
      `${engine} fling frames ${fling.frames} over32 ${fling.overBudget} p95 ${fling.p95} max ${fling.max}`,
    );
    await page.evaluate(() => {
      const flow = document.querySelector(".focus-live");
      if (flow instanceof HTMLElement) flow.scrollTop = 0;
    });
    await page.waitForTimeout(400);
    const cross = await trace(page, "cross");
    console.log(`${engine} cross ${JSON.stringify(cross)}`);
    assert.ok(cross.cls < 0.25, `${engine} chapter cross CLS ${cross.cls}`);
    assert.ok(cross.anchorDrift < 80, `${engine} chapter load moved the line by ${cross.anchorDrift}px`);
  } finally {
    await context.close();
  }
}

test(
  "a fast scroll does not stop at the end of the painted page",
  { timeout: 180_000 },
  async (t) => {
    await ensureReaderServer();
    async function check(engine: "chromium" | "webkit") {
      const browser = await launch(engine);
      try {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          deviceScaleFactor: PHONE.deviceScaleFactor,
          userAgent: PHONE.userAgent,
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
          localStorage.clear();
          localStorage.setItem("salon-move-by", "scroll");
        });
        await page.goto(`${ORIGIN}/salon/read/the-house-of-mirth`, { waitUntil: "domcontentloaded" });
        await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
        const sit = page.getByRole("button", { name: /^Sit$/ }).first();
        if (await sit.isVisible().catch(() => false)) await sit.click();
        await page.locator(".breath-now").waitFor({ timeout: 30_000 });
        await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-face-ready") === "yes");
        const report = await page.evaluate(async () => {
          const flow = document.querySelector(".focus-live");
          const host = document.querySelector("[data-reader-text]");
          const frame = document.querySelector(".reader-frame");
          if (!(flow instanceof HTMLElement) || !(host instanceof HTMLElement) || !frame) {
            throw new Error("reader missing");
          }
          let stalls = 0;
          let worst = 0;
          for (let i = 0; i < 36; i += 1) {
            const beforeTop = flow.scrollTop;
            const beforeRoom = flow.scrollHeight - flow.scrollTop - flow.clientHeight;
            host.dispatchEvent(new WheelEvent("wheel", { deltaY: 420, bubbles: true, cancelable: true }));
            await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
            const afterTop = flow.scrollTop;
            const room = flow.scrollHeight - flow.scrollTop - flow.clientHeight;
            const count = Number(frame.getAttribute("data-breath-count") ?? "0");
            const index = Number(frame.getAttribute("data-breath-index") ?? "0");
            if (afterTop <= beforeTop + 2 && beforeRoom < 80 && index < count - 3) {
              stalls += 1;
              worst = Math.max(worst, beforeRoom);
            }
            void room;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
          return {
            stalls,
            worst,
            index: Number(frame.getAttribute("data-breath-index") ?? "0"),
            scene: frame.getAttribute("data-scene") ?? "",
          };
        });
        assert.equal(report.stalls, 0, `${engine} stopped at the painted edge (${report.stalls}, room ${report.worst})`);
        assert.ok(report.index >= 24, `${engine} never left the first painted page (${report.index})`);
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

test(
  "a fast pass through short poems does not jump the line",
  { timeout: 120_000 },
  async () => {
    await ensureReaderServer();
    const browser = await launch("chromium");
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: PHONE.deviceScaleFactor,
        userAgent: PHONE.userAgent,
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem("salon-move-by", "scroll");
      });
      await page.goto(`${ORIGIN}/salon/read/birds-beasts-and-flowers`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      const sit = page.getByRole("button", { name: /^Sit$/ }).first();
      if (await sit.isVisible().catch(() => false)) await sit.click();
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-face-ready") === "yes");
      const report = await page.evaluate(async () => {
        const flow = document.querySelector(".focus-live");
        const host = document.querySelector("[data-reader-text]");
        if (!(flow instanceof HTMLElement) || !(host instanceof HTMLElement)) throw new Error("reader missing");
        let worst = 0;
        let trims = 0;
        let measured = 0;
        let first = flow.querySelector("[data-sentence]")?.getAttribute("data-sentence") ?? "";
        for (let i = 0; i < 400 && trims < 4; i += 1) {
          const mid = flow.getBoundingClientRect().top + flow.clientHeight * 0.5;
          const nodes = [...flow.querySelectorAll<HTMLElement>("[data-sentence]")];
          const hit = nodes.find((node) => {
            const rect = node.getBoundingClientRect();
            return rect.height > 2 && rect.top <= mid && rect.bottom >= mid;
          });
          const tracked = hit?.getAttribute("data-sentence") ?? "";
          const before = hit ? hit.getBoundingClientRect().top : null;
          const top = flow.scrollTop;
          const heightBefore = flow.scrollHeight;
          host.dispatchEvent(new WheelEvent("wheel", { deltaY: 360, bubbles: true, cancelable: true }));
          await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
          const afterNode = tracked ? flow.querySelector(`[data-sentence="${tracked}"]`) : null;
          const nextFirst = flow.querySelector("[data-sentence]")?.getAttribute("data-sentence") ?? first;
          const trimmed = nextFirst !== first;
          if (trimmed && before != null && afterNode instanceof HTMLElement) {
            const moved = before - afterNode.getBoundingClientRect().top;
            const extra = flow.scrollTop - top - (flow.scrollHeight - heightBefore);
            // A wheel in the same frame may move the line. The trimmed height
            // must not be subtracted again, which is the jump.
            const slip = Math.min(Math.abs(extra), Math.abs(extra - 360));
            worst = Math.max(worst, slip, Math.abs(moved - extra));
            measured += 1;
          }
          if (trimmed) {
            trims += 1;
            first = nextFirst;
          }
        }
        return { worst: Math.round(worst), trims, measured };
      });
      assert.ok(report.trims >= 1, `the page never dropped lines above the glass (${report.trims})`);
      assert.ok(report.measured >= 1, "the sentence on the glass was dropped before it could be measured");
      assert.ok(report.worst < 2, `the line jumped ${report.worst}px while short poems were trimmed`);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);

test(
  "a fling does not remount the text",
  { timeout: 180_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await launch("chromium");
    try {
      await run(chrome, "Chromium");
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
      await run(kit, "WebKit");
    } finally {
      await kit.close();
    }
  },
);

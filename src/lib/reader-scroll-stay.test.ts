import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

/**
 * Scrolling back stays put, and a chapter does not end the page.
 * Shallow Soil's prologue is the case that used to stop one line early.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

type Size = { name: string; width: number; height: number; mobile: boolean };

const SIZES: Size[] = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1280, height: 800, mobile: false },
];

const SAMPLE = [
  "the-bridge-of-san-luis-rey",
  "the-house-of-mirth",
  "gitanjali",
  "cranford",
  "the-awakening",
];

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

async function fresh(context: Awaited<ReturnType<typeof contextFor>>, mode: "scroll" | "tap") {
  const page = await context.newPage();
  await page.addInitScript((moveBy: string) => {
    if (sessionStorage.getItem("stay-booted")) return;
    sessionStorage.setItem("stay-booted", "1");
    localStorage.clear();
    localStorage.setItem("salon-move-by", moveBy);
  }, mode);
  return page;
}

async function openBook(page: Page, id: string) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/${id}`, { waitUntil: "domcontentloaded" });
      await page.locator(".veil, .breath-now").first().waitFor({ timeout: 30_000 });
      await page.locator(".veil").waitFor({ timeout: 4_000 }).catch(() => undefined);
      const sit = page.getByRole("button", { name: /^Sit$/ }).first();
      if (await sit.isVisible().catch(() => false)) {
        await sit.click();
        await page.locator(".veil").waitFor({ state: "hidden", timeout: 15_000 });
      }
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(() => {
        const frame = document.querySelector(".reader-frame");
        return frame?.getAttribute("data-face-ready") === "yes" && !document.querySelector(".veil");
      });
      return;
    } catch (error) {
      last = error;
      if (attempt === 2) break;
      await page.goto("about:blank").catch(() => undefined);
      if (readerDown(error)) await ensureReaderServer();
    }
  }
  throw last;
}

function spot(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const flow = document.querySelector(".focus-live");
    const index = frame?.getAttribute("data-breath-index") ?? "";
    const node = document.querySelector(`[data-sentence="${index}"]`) ?? document.querySelector(".breath-now");
    const line = node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return {
      index: Number(frame?.getAttribute("data-breath-index") ?? "-1"),
      scene: frame?.getAttribute("data-scene") ?? "",
      scroll: flow instanceof HTMLElement ? flow.scrollTop : 0,
      line: line.slice(0, 80),
    };
  });
}

async function wheel(page: Page, delta: number, times: number) {
  for (let i = 0; i < times; i += 1) {
    await page.locator("[data-reader-text]").evaluate((host, dy) => {
      host.dispatchEvent(new WheelEvent("wheel", { deltaY: dy, bubbles: true, cancelable: true }));
    }, delta);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(220);
}

async function drag(page: Page, dy: number, across: number) {
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  const from = { x: box.x + box.width * across, y: box.y + box.height * 0.62 };
  await page.evaluate(
    async ({ from, dy }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const steps = 8;
      const base = { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", isPrimary: true };
      host.dispatchEvent(
        new PointerEvent("pointerdown", { ...base, clientX: from.x, clientY: from.y, button: 0, buttons: 1 }),
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
      await new Promise((resolve) => setTimeout(resolve, 40));
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
    { from, dy },
  );
  await page.waitForTimeout(260);
}

async function resizeToolbar(page: Page, size: Size) {
  const shrunk = Math.round(size.height * 0.86);
  await page.setViewportSize({ width: size.width, height: shrunk });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(120);
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(120);
}

async function untilScene(page: Page, from: string, label: string) {
  for (let i = 0; i < 24; i += 1) {
    const now = await spot(page);
    if (now.scene && now.scene !== from) return now;
    await wheel(page, 700, 4);
  }
  const stuck = await spot(page);
  assert.notEqual(stuck.scene, from, `${label} stayed in ${from} at breath ${stuck.index}`);
  return stuck;
}

async function contextFor(browser: Browser, size: Size) {
  return browser.newContext({
    viewport: { width: size.width, height: size.height },
    screen: { width: size.width, height: size.height },
    hasTouch: size.mobile,
    isMobile: size.mobile,
    deviceScaleFactor: size.mobile ? PHONE.deviceScaleFactor : 1,
    userAgent: size.mobile ? PHONE.userAgent : undefined,
  });
}

async function prologue(page: Page, size: Size, label: string) {
  await openBook(page, "shallow-soil");
  const opened = await spot(page);
  assert.equal(opened.scene, "s0", `${label} prologue`);
  const crossed = await untilScene(page, "s0", `${label} prologue`);
  assert.ok(crossed.index > 21, `${label} stopped on the first line of the next chapter (${crossed.index})`);
  const held = crossed.index;
  const line = crossed.line;
  await page.waitForTimeout(400);
  await resizeToolbar(page, size);
  const still = await spot(page);
  assert.equal(still.scene, crossed.scene, `${label} resize left the chapter`);
  assert.ok(Math.abs(still.index - held) <= 1, `${label} resize moved ${held} to ${still.index}`);
  assert.equal(still.line, line, `${label} resize rewrote the line`);
  await wheel(page, 640, 6);
  const further = await spot(page);
  assert.ok(further.index > still.index, `${label} could not read on into the chapter`);
  await wheel(page, -700, 10);
  const back = await spot(page);
  assert.ok(back.index < further.index, `${label} could not scroll back across the chapter`);
}

async function tapPrologue(page: Page, label: string) {
  await openBook(page, "shallow-soil");
  const opened = await spot(page);
  assert.equal(opened.scene, "s0", `${label} tap prologue`);
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  const x = box.x + box.width * 0.8;
  const y = box.y + box.height * 0.55;
  const beforeKey = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  await page.mouse.click(x, y);
  await page.waitForTimeout(250);
  const afterKey = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  assert.notEqual(afterKey, beforeKey, `${label} right tap did not move`);
  const stepped = await spot(page);
  let scene = stepped.scene;
  for (let i = 0; i < 80 && scene === "s0"; i += 1) {
    await page.keyboard.press("ArrowRight");
    if (i % 4 === 3) await page.waitForTimeout(40);
    scene = (await spot(page)).scene;
  }
  const crossed = await spot(page);
  assert.notEqual(crossed.scene, "s0", `${label} taps never left the prologue`);
  const backX = box.x + box.width * 0.15;
  const forwardKey = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  await page.mouse.click(backX, y);
  await page.waitForTimeout(250);
  const backKey = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
  assert.notEqual(backKey, forwardKey, `${label} left tap did not go back`);
}

async function stayBack(page: Page, size: Size, label: string) {
  await openBook(page, "shallow-soil");
  const opened = await spot(page);
  for (let i = 0; i < 30; i += 1) {
    const now = await spot(page);
    if (now.index >= opened.index + 20) break;
    if (size.mobile) await drag(page, -Math.round(size.height * 0.45), i % 2 === 0 ? 0.22 : 0.78);
    else await wheel(page, 560, 3);
  }
  const advanced = await spot(page);
  assert.ok(advanced.index >= opened.index + 12, `${label} did not advance (${advanced.index})`);
  for (let i = 0; i < 6; i += 1) {
    if (size.mobile) await drag(page, Math.round(size.height * 0.55), i % 2 === 0 ? 0.2 : 0.8);
    else await wheel(page, -640, 3);
  }
  const back = await spot(page);
  assert.ok(back.index < advanced.index - 2, `${label} did not stay back (${back.index} vs ${advanced.index})`);
  const held = back.index;
  const line = back.line;
  await page.waitForTimeout(5_000);
  await resizeToolbar(page, size);
  const still = await spot(page);
  assert.ok(still.index <= held + 1, `${label} jumped toward ${advanced.index} (${still.index})`);
  assert.ok(still.index < advanced.index - 2, `${label} returned to the latest line`);
  assert.equal(still.line, line, `${label} the line changed while waiting`);
  let further = still;
  if (still.index > 2) {
    if (size.mobile) await drag(page, Math.round(size.height * 0.5), 0.25);
    else await wheel(page, -700, 4);
    further = await spot(page);
    assert.ok(further.index < still.index, `${label} could not scroll further back (${further.index} vs ${still.index})`);
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-face-ready") === "yes");
  await page.waitForTimeout(400);
  const resumed = await spot(page);
  assert.ok(resumed.index <= further.index + 1, `${label} reload jumped to ${resumed.index} from ${further.index}`);
  assert.ok(resumed.index < advanced.index - 2, `${label} reload restored the latest line ${advanced.index}`);
}

async function chapterPick(page: Page, size: Size, label: string) {
  await openBook(page, "shallow-soil");
  await page.locator("header.reader-mark button").click();
  const rooms = page.locator(".veil-room");
  await rooms.first().waitFor();
  const choice = rooms.nth(6);
  const name = (await choice.innerText()).replace(/\s+/g, " ").trim();
  await choice.click();
  await page.waitForTimeout(300);
  const landed = await spot(page);
  assert.notEqual(landed.scene, "s0", `${label} chapter list stayed in the prologue (${name})`);
  const next = await untilScene(page, landed.scene, `${label} chosen chapter`);
  assert.notEqual(next.scene, landed.scene, `${label} ${name} did not flow onward`);
  for (let i = 0; i < 16; i += 1) {
    const now = await spot(page);
    if (now.scene === landed.scene) return;
    if (size.mobile) await drag(page, Math.round(size.height * 0.5), 0.3);
    else await wheel(page, -700, 3);
  }
  const back = await spot(page);
  assert.equal(back.scene, landed.scene, `${label} could not scroll back into ${name}`);
}

test(
  "scrolling stays where it is and crosses every kind of chapter",
  { timeout: 600_000 },
  async (t) => {
    await ensureReaderServer();
    const chrome = await launch("chromium");
    try {
      await runEngine(chrome, "Chromium", true);
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
      await runEngine(kit, "WebKit", false);
    } finally {
      await kit.close();
    }
  },
);

async function runEngine(browser: Browser, engine: string, sample: boolean) {
  for (const size of SIZES) {
    const context = await contextFor(browser, size);
    try {
      const label = `${engine} ${size.name}`;
      const scroll = await fresh(context, "scroll");
      try {
        await prologue(scroll, size, label);
      } finally {
        await scroll.close();
      }
      const taps = await fresh(context, "tap");
      try {
        await tapPrologue(taps, label);
      } finally {
        await taps.close();
      }
      const back = await fresh(context, "scroll");
      try {
        await stayBack(back, size, label);
      } finally {
        await back.close();
      }
      const chapters = await fresh(context, "scroll");
      try {
        await chapterPick(chapters, size, label);
      } finally {
        await chapters.close();
      }
    } finally {
      await context.close();
    }
  }
  if (!sample) return;
  const context = await contextFor(browser, SIZES[1]!);
  try {
    for (const id of SAMPLE) {
      const page = await fresh(context, "scroll");
      try {
        await openBook(page, id);
        const opened = await spot(page);
        const crossed = await untilScene(page, opened.scene, `Chromium sample ${id}`);
        assert.notEqual(crossed.scene, opened.scene, `${id} did not reach its next chapter`);
        await wheel(page, -700, 8);
        const back = await spot(page);
        assert.equal(back.scene, opened.scene, `${id} did not scroll back into the first chapter`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
}

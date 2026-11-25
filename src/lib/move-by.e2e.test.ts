import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
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
  await page.addInitScript(() => {
    if (sessionStorage.getItem("move-by-booted")) return;
    sessionStorage.setItem("move-by-booted", "1");
    localStorage.clear();
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

function placeRank(key: string | null | undefined) {
  const [index = 0, cursor = 0, spot = 0] = (key ?? "").split(":").map(Number);
  return index * 1_000_000 + cursor * 1_000 + spot;
}

async function bands(page: Page) {
  return page.evaluate(() => {
    const band = (name: string) => {
      const box = document.querySelector(`[data-focus-band="${name}"]`)?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom, height: box.height } : null;
    };
    return {
      read: band("read"),
      now: band("now"),
      next: band("next"),
      key: document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") ?? "",
      mode: document.querySelector(".reader-frame")?.getAttribute("data-move-by") ?? "",
      scroll: document.querySelector(".focus-live") instanceof HTMLElement
        ? (document.querySelector(".focus-live") as HTMLElement).scrollTop
        : 0,
      progress: document.querySelector("[data-reading-progress]")?.getAttribute("data-progress") ?? "",
    };
  });
}

function sameBands(
  before: Awaited<ReturnType<typeof bands>>,
  after: Awaited<ReturnType<typeof bands>>,
  label: string,
) {
  for (const name of ["read", "now", "next"] as const) {
    const was = before[name];
    const now = after[name];
    assert.ok(was && now, `${label} ${name} band missing`);
    assert.ok(Math.abs(was.top - now.top) <= 1, `${label} ${name} top moved`);
    assert.ok(Math.abs(was.bottom - now.bottom) <= 1, `${label} ${name} bottom moved`);
    assert.ok(Math.abs(was.height - now.height) <= 1, `${label} ${name} height changed`);
  }
}

async function advances(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("vellum-v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { state?: { progress?: Record<string, { activeAdvances?: number }> } };
    return parsed.state?.progress?.["the-house-of-mirth"]?.activeAdvances ?? 0;
  });
}

async function point(page: Page, across: number, down = 0.55) {
  const box = await page.locator("[data-reader-text]").boundingBox();
  assert.ok(box, "reading column missing");
  return {
    x: Math.round(box.x + box.width * across),
    y: Math.round(box.y + box.height * down),
  };
}

async function stroke(page: Page, points: { x: number; y: number; t: number }[]) {
  await page.evaluate(
    async ({ points }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const base = {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
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
    { points },
  );
}

async function openSheet(page: Page) {
  await page.locator("button.reader-glass").click();
  await page.getByRole("slider", { name: "Text size" }).waitFor();
}

async function check(page: Page, label: string) {
  await openBook(page);
  await page.evaluate(() => {
    localStorage.setItem("salon-text-size", "1.20");
    localStorage.removeItem("salon-move-by");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const sit = page.locator("button", { hasText: /^Sit$/ }).first();
  if (await sit.count()) await sit.click().catch(() => {});
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    return frame?.getAttribute("data-face-ready") === "yes" && !document.querySelector(".veil");
  });

  const opened = await bands(page);
  assert.equal(opened.mode, "scroll", `${label} default is not scroll`);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("salon-move-by")),
    null,
    `${label} a reader who never chose got a stored mode`,
  );
  assert.equal(await page.evaluate(() => document.documentElement.dataset.textSize), "1.20");
  assert.ok(opened.now && opened.now.height > 40, `${label} sharp band missing`);
  assert.ok(opened.progress !== "", `${label} progress missing`);
  const credited = await advances(page);

  await openSheet(page);
  const move = page.locator(".move-by-row");
  await move.waitFor();
  const labelBox = await page.locator("#reader-text-size-label").boundingBox();
  const moveBox = await move.boundingBox();
  assert.ok(labelBox && moveBox, `${label} text size or move by missing`);
  assert.ok(moveBox.y >= labelBox.y - 2, `${label} move by is not next to the text size slider`);
  assert.equal((await move.locator("#reader-move-by-label").innerText()).replace(/\s+/g, " ").trim(), "Move by");
  assert.match(await move.evaluate((el) => getComputedStyle(el).fontFamily), /Outfit/);
  assert.equal(await move.evaluate((el) => getComputedStyle(el).textTransform), "none");
  const scrollBtn = page.getByRole("button", { name: "Scroll", exact: true });
  const tapBtn = page.getByRole("button", { name: "Tap", exact: true });
  assert.equal(await scrollBtn.getAttribute("aria-pressed"), "true");
  assert.equal(await tapBtn.getAttribute("aria-pressed"), "false");
  assert.match(await scrollBtn.evaluate((el) => getComputedStyle(el).fontFamily), /Outfit/);
  await page.getByRole("group", { name: "Sitting length" }).waitFor();
  await page.getByRole("button", { name: "20", exact: true }).click();
  const beforeKeep = (await bands(page)).key;
  await page.locator("footer").getByRole("button", { name: "Keep", exact: true }).click();
  assert.equal((await bands(page)).key, beforeKeep, `${label} Keep moved the sentence`);
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("slider", { name: "Text size" }).waitFor({ state: "hidden" });

  const beforeTap = await bands(page);
  const tapAt = await point(page, 0.72);
  await page.touchscreen.tap(tapAt.x, tapAt.y);
  await page.waitForTimeout(280);
  const tapped = await bands(page);
  assert.equal(tapped.key, beforeTap.key, `${label} a text tap moved the sentence in scroll mode`);
  assert.equal(await advances(page), credited, `${label} a text tap counted as reading in scroll mode`);
  sameBands(opened, tapped, `${label} scroll tap`);

  await page.evaluate(() => {
    const header = document.querySelector("header.reader-mark");
    if (header instanceof HTMLElement) header.style.pointerEvents = "none";
    (window as Window & { __topEdge?: number }).__topEdge = 0;
    document.addEventListener("pointerup", (event) => {
      const bottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 48;
      if (event.clientY <= bottom + 1) {
        (window as Window & { __topEdge?: number }).__topEdge =
          ((window as Window & { __topEdge?: number }).__topEdge ?? 0) + 1;
      }
    });
  });
  const header = await page.locator("header.reader-mark").boundingBox();
  assert.ok(header, `${label} top bar missing`);
  await page.touchscreen.tap(header.x + header.width * 0.7, Math.max(8, header.y + 6));
  await page.waitForTimeout(200);
  const topTaps = await page.evaluate(() => (window as Window & { __topEdge?: number }).__topEdge ?? 0);
  assert.ok(topTaps >= 1, `${label} a top-edge tap was swallowed`);
  assert.equal((await bands(page)).key, beforeTap.key, `${label} a top-edge tap moved the sentence`);

  const dragFrom = await point(page, 0.72, 0.62);
  const topBefore = (await bands(page)).scroll;
  await stroke(page, [
    { ...dragFrom, t: 0 },
    { x: dragFrom.x, y: dragFrom.y - 36, t: 30 },
    { x: dragFrom.x, y: dragFrom.y - 90, t: 70 },
    { x: dragFrom.x, y: dragFrom.y - 90, t: 90 },
  ]);
  await page.waitForTimeout(220);
  const scrolled = await bands(page);
  assert.ok(
    Math.abs(scrolled.scroll - topBefore) > 24 || scrolled.key !== beforeTap.key,
    `${label} scrolling did not move through the text`,
  );
  sameBands(opened, scrolled, `${label} scrolled`);

  await openSheet(page);
  await tapBtn.click();
  await page.waitForFunction(() => document.querySelector(".reader-frame")?.getAttribute("data-move-by") === "tap");
  assert.equal(await page.evaluate(() => localStorage.getItem("salon-move-by")), "tap");
  assert.equal(await scrollBtn.getAttribute("aria-pressed"), "false");
  assert.equal(await tapBtn.getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Close" }).click();

  const tapMode = await bands(page);
  const fingerFrom = await point(page, 0.72, 0.62);
  await stroke(page, [
    { ...fingerFrom, t: 0 },
    { x: fingerFrom.x, y: fingerFrom.y - 40, t: 30 },
    { x: fingerFrom.x, y: fingerFrom.y - 110, t: 80 },
    { x: fingerFrom.x, y: fingerFrom.y - 110, t: 100 },
  ]);
  await page.waitForTimeout(200);
  const snapped = await bands(page);
  assert.equal(snapped.key, tapMode.key, `${label} a finger scroll moved the sentence in tap mode`);
  assert.ok(
    Math.abs(snapped.scroll - tapMode.scroll) < 12,
    `${label} a finger scroll left the column at ${snapped.scroll} from ${tapMode.scroll}`,
  );
  sameBands(opened, snapped, `${label} tap scroll`);

  const forward = await point(page, 0.72);
  await page.touchscreen.tap(forward.x, forward.y);
  await page.waitForFunction(
    (was) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== was,
    tapMode.key,
  );
  const moved = await bands(page);
  assert.ok(placeRank(moved.key) !== placeRank(tapMode.key), `${label} a right tap did not move`);
  await page.waitForTimeout(1600);
  assert.ok((await advances(page)) >= 1, `${label} a tap did not count as reading`);
  sameBands(opened, moved, `${label} tap forward`);

  const backAt = await point(page, 0.12);
  await page.touchscreen.tap(backAt.x, backAt.y);
  await page.waitForFunction(
    (was) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") !== was,
    moved.key,
  );
  const back = await bands(page);
  assert.ok(placeRank(back.key) < placeRank(moved.key), `${label} a left tap did not go back`);
  sameBands(opened, back, `${label} tap back`);

  await page.reload({ waitUntil: "domcontentloaded" });
  const again = page.locator("button", { hasText: /^Sit$/ }).first();
  if (await again.count()) await again.click().catch(() => {});
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const frame = document.querySelector(".reader-frame");
    return frame?.getAttribute("data-move-by") === "tap" && frame.getAttribute("data-face-ready") === "yes";
  });
  const resumed = await bands(page);
  assert.equal(resumed.mode, "tap", `${label} tap did not persist`);
  assert.equal(resumed.key, back.key, `${label} reload did not resume the sentence`);
  sameBands(opened, resumed, `${label} resume`);
}

test(
  "scroll is the default and tap is the other way, in Chromium and WebKit",
  { timeout: 240_000 },
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

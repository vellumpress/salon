import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function mirthLength() {
  const work = JSON.parse(
    readFileSync(new URL("./catalog/texts/the-house-of-mirth.json", import.meta.url), "utf8"),
  ) as { breaths: unknown[] };
  return work.breaths.length;
}

async function launchChromium(): Promise<Browser> {
  const args = ["--no-sandbox"];
  for (const executablePath of CHROME_CANDIDATES) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ executablePath, args });
    } catch {
      /* try the next browser */
    }
  }
  try {
    return await chromium.launch({ args });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    execFileSync("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit",
      timeout: 180_000,
    });
    return await chromium.launch({ args });
  }
}

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
  await page.addInitScript(() => localStorage.clear());
  return page;
}

async function openAt(page: Page, id: string, at: number) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/${id}?at=${at}`, { waitUntil: "domcontentloaded" });
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(
        (want) => {
          const frame = document.querySelector(".reader-frame");
          return (
            frame?.getAttribute("data-bound") === "full" &&
            frame.getAttribute("data-breath-index") === String(want) &&
            !document.querySelector(".veil")
          );
        },
        at,
        { timeout: 30_000 },
      );
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function breathIndex(page: Page) {
  const raw = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
  return Number(raw);
}

async function sidePoint(page: Page, side: "prev" | "next") {
  const point = await page.evaluate((which) => {
    const host = document.querySelector("[data-reader-text]");
    if (!host) return null;
    const box = host.getBoundingClientRect();
    return {
      x: Math.round(box.left + box.width * (which === "prev" ? 0.12 : 0.72)),
      y: Math.round(box.top + box.height * 0.46),
    };
  }, side);
  assert.ok(point, "reading column missing");
  return point;
}

async function pointerDown(page: Page, x: number, y: number) {
  await page.evaluate(
    ({ x, y }) => {
      const frame = document.querySelector(".reader-frame");
      const host = document.querySelector("[data-reader-text]");
      if (!frame || !host) throw new Error("missing reading column");
      const t0 = performance.now();
      const marks: { t: number; i: number }[] = [];
      const obs = new MutationObserver(() => {
        marks.push({
          t: performance.now() - t0,
          i: Number(frame.getAttribute("data-breath-index")),
        });
      });
      obs.observe(frame, { attributes: true, attributeFilter: ["data-breath-index"] });
      const win = window as Window & {
        __holdMarks?: { t: number; i: number }[];
        __holdObs?: MutationObserver;
      };
      win.__holdObs?.disconnect();
      win.__holdMarks = marks;
      win.__holdObs = obs;
      host.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 4,
          button: 0,
          buttons: 1,
          pointerType: "touch",
          isPrimary: true,
        }),
      );
    },
    { x, y },
  );
}

async function pointerUp(page: Page, x: number, y: number) {
  await page.evaluate(
    ({ x, y }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const base = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 4,
        button: 0,
        pointerType: "touch" as const,
        isPrimary: true,
      };
      host.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0 }));
      host.dispatchEvent(new MouseEvent("click", base));
    },
    { x, y },
  );
}

async function holdMarks(page: Page) {
  return page.evaluate(() => {
    const win = window as Window & { __holdMarks?: { t: number; i: number }[] };
    return win.__holdMarks ?? [];
  });
}

async function zoneStyle(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-turn='prev']");
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      userSelect: style.userSelect,
      callout: style.getPropertyValue("-webkit-touch-callout"),
    };
  });
}

test(
  "Chromium: a tap moves one sentence and a hold repeats, speeds up, and stops on release",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launchChromium();
    try {
      const page = await phone(browser);
      await openAt(page, "the-house-of-mirth", 40);
      const style = await zoneStyle(page);
      assert.ok(style, "back zone missing");
      assert.equal(style.userSelect, "none", "the back zone can select text");
      const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
      assert.match(
        css,
        /\.reader-turn \[data-turn\] \{[^}]*-webkit-touch-callout:\s*none/s,
        "the zones do not disable the iOS callout",
      );

      const back = await sidePoint(page, "prev");
      await pointerDown(page, back.x, back.y);
      await page.waitForTimeout(120);
      await pointerUp(page, back.x, back.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "39",
        undefined,
        { timeout: 4000 },
      );
      await page.waitForTimeout(400);
      assert.equal(await breathIndex(page), 39, "a short tap stepped more than once");
      assert.equal(
        await page.locator("[data-reader-bar]").getAttribute("data-reader-bar"),
        "closed",
        "a tap opened Keep",
      );

      const forward = await sidePoint(page, "next");
      const before = await breathIndex(page);
      await pointerDown(page, forward.x, forward.y);
      await page.waitForTimeout(1800);
      const held = await breathIndex(page);
      const marks = await holdMarks(page);
      await pointerUp(page, forward.x, forward.y);
      await page.waitForTimeout(450);
      const released = await breathIndex(page);
      assert.ok(held >= before + 4, `hold only reached ${held} from ${before}`);
      assert.equal(released, held, "release added a sentence after the hold");
      assert.ok(marks.length >= 4, `hold recorded ${marks.length} steps`);
      assert.ok(marks[0]!.t >= 250, `first repeat landed at ${marks[0]!.t}ms`);
      const firstGap = marks[1]!.t - marks[0]!.t;
      const lastGap = marks[marks.length - 1]!.t - marks[marks.length - 2]!.t;
      assert.ok(
        lastGap < firstGap * 0.8,
        `hold did not speed up (${firstGap.toFixed(0)}ms then ${lastGap.toFixed(0)}ms)`,
      );
      assert.equal(
        await page.locator("[data-reader-bar]").getAttribute("data-reader-bar"),
        "closed",
        "a hold opened Keep",
      );

      const again = await sidePoint(page, "prev");
      const backFrom = await breathIndex(page);
      await pointerDown(page, again.x, again.y);
      await page.waitForTimeout(900);
      const backed = await breathIndex(page);
      await pointerUp(page, again.x, again.y);
      await page.waitForTimeout(450);
      assert.ok(backed <= backFrom - 2, `left hold reached ${backed} from ${backFrom}`);
      assert.equal(await breathIndex(page), backed, "lifting a back hold stepped again");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "Chromium: a hold stops at the ends, and a drag on a tall sentence still scrolls",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launchChromium();
    try {
      const page = await phone(browser);
      await openAt(page, "the-house-of-mirth", 0);
      const back = await sidePoint(page, "prev");
      await pointerDown(page, back.x, back.y);
      await page.waitForTimeout(800);
      await pointerUp(page, back.x, back.y);
      await page.waitForTimeout(300);
      assert.equal(await breathIndex(page), 0, "holding back left the first sentence");
      assert.equal(await page.locator(".veil").count(), 0, "the first sentence opened the end");

      const last = mirthLength() - 1;
      await openAt(page, "the-house-of-mirth", last);
      const forward = await sidePoint(page, "next");
      await pointerDown(page, forward.x, forward.y);
      await page.waitForTimeout(800);
      await pointerUp(page, forward.x, forward.y);
      await page.waitForTimeout(300);
      assert.equal(await breathIndex(page), last, "holding forward walked past the book");
      await page.locator(".veil").waitFor({ timeout: 4000 });

      await openAt(page, "lamia", 5);
      const spot = await page.evaluate(() => {
        const host = document.querySelector("[data-reader-text]");
        const slot = document.querySelector(".breath-slot");
        if (!(host instanceof HTMLElement) || !(slot instanceof HTMLElement)) return null;
        const box = host.getBoundingClientRect();
        return {
          overflows: slot.scrollHeight - slot.clientHeight > 24,
          scrollTop: slot.scrollTop,
          x: Math.round(box.left + box.width * 0.7),
          y: Math.round(box.top + box.height * 0.72),
        };
      });
      assert.ok(spot, "lamia column missing");
      assert.equal(spot.overflows, true, "lamia 5 is not taller than the column");
      await page.evaluate(({ x, y }) => {
        const host = document.querySelector("[data-reader-text]");
        if (!host) throw new Error("missing reading column");
        const fire = (type: string, py: number) => {
          host.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: py,
              pointerId: 9,
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pointerType: "touch",
              isPrimary: true,
            }),
          );
        };
        fire("pointerdown", y);
        fire("pointermove", y - 40);
        fire("pointermove", y - 90);
        fire("pointerup", y - 90);
      }, spot);
      const scrolled = await page.evaluate(() => {
        const slot = document.querySelector(".breath-slot");
        const frame = document.querySelector("[data-breath-index]");
        return {
          index: frame?.getAttribute("data-breath-index"),
          scrollTop: slot instanceof HTMLElement ? slot.scrollTop : 0,
        };
      });
      assert.equal(scrolled.index, "5", "a drag stepped a sentence");
      assert.ok(scrolled.scrollTop > 20, "a drag did not scroll the tall sentence");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "Chromium: a hold in a live room repeats on the same sides",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launchChromium();
    try {
      const page = await phone(browser);
      await page.goto(`${ORIGIN}/salon/read/the-house-of-mirth?sit=20&pair=ab12cd`, {
        waitUntil: "domcontentloaded",
      });
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.locator(".together-lock").waitFor();
      const start = await breathIndex(page);
      const forward = await sidePoint(page, "next");
      await pointerDown(page, forward.x, forward.y);
      await page.waitForFunction(
        (from) => Number(document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index")) >= from + 2,
        start,
        { timeout: 4000 },
      );
      const held = await breathIndex(page);
      await pointerUp(page, forward.x, forward.y);
      await page.waitForTimeout(400);
      assert.equal(await breathIndex(page), held, "lifting in a live room stepped again");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "WebKit: a tap moves one sentence and a hold repeats without an extra step on release",
  { timeout: 180_000 },
  async (t) => {
    if (!(await webkitInstalled())) {
      t.skip("WebKit is not installed");
      return;
    }
    const stop = await ensureReaderServer();
    const browser = await webkit.launch();
    try {
      const page = await phone(browser);
      await openAt(page, "the-house-of-mirth", 30);
      const forward = await sidePoint(page, "next");
      await pointerDown(page, forward.x, forward.y);
      await page.waitForTimeout(100);
      await pointerUp(page, forward.x, forward.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "31",
        undefined,
        { timeout: 4000 },
      );
      await page.waitForTimeout(350);
      assert.equal(await breathIndex(page), 31, "a short tap stepped more than once");

      const back = await sidePoint(page, "prev");
      await pointerDown(page, back.x, back.y);
      await page.waitForTimeout(1600);
      const held = await breathIndex(page);
      const marks = await holdMarks(page);
      await pointerUp(page, back.x, back.y);
      await page.waitForTimeout(450);
      assert.ok(held <= 31 - 3, `hold only reached ${held}`);
      assert.equal(await breathIndex(page), held, "release added a sentence after the hold");
      assert.ok(marks.length >= 3, `hold recorded ${marks.length} steps`);
      assert.ok(marks[0]!.t >= 250, `first repeat landed at ${marks[0]!.t}ms`);
      if (marks.length >= 4) {
        const firstGap = marks[1]!.t - marks[0]!.t;
        const lastGap = marks[marks.length - 1]!.t - marks[marks.length - 2]!.t;
        assert.ok(lastGap < firstGap, `hold did not speed up (${firstGap} then ${lastGap})`);
      }
    } finally {
      await browser.close();
      await stop();
    }
  },
);

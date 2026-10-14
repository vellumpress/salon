import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium, webkit, type Browser, type BrowserContext, type Page } from "playwright";
import { shellGap, standaloneShellHeight } from "./bottom-edge.ts";
import { ensureReaderServer } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = { width: 390, height: 844 };
const SAFE = { top: 47, left: 0, bottom: 34, right: 0 };

test("a standalone phone grows the shell across the home-indicator band", () => {
  assert.equal(
    standaloneShellHeight({
      base: 812,
      screenHeight: 874,
      screenWidth: 402,
      innerWidth: 402,
      keyboard: false,
    }),
    874,
  );
  assert.equal(
    standaloneShellHeight({
      base: 780,
      screenHeight: 844,
      screenWidth: 390,
      innerWidth: 390,
      keyboard: false,
    }),
    844,
  );
  assert.equal(
    standaloneShellHeight({
      base: 844,
      screenHeight: 844,
      screenWidth: 390,
      innerWidth: 390,
      keyboard: false,
    }),
    844,
  );
});

test("a desktop window and an open keyboard do not stretch the shell to the monitor", () => {
  assert.equal(
    standaloneShellHeight({
      base: 800,
      screenHeight: 1440,
      screenWidth: 2560,
      innerWidth: 1280,
      keyboard: false,
    }),
    800,
  );
  assert.equal(
    standaloneShellHeight({
      base: 520,
      screenHeight: 844,
      screenWidth: 390,
      innerWidth: 390,
      keyboard: true,
    }),
    520,
  );
  assert.deepEqual(
    shellGap({
      standalone: true,
      keyboard: true,
      screenHeight: 874,
      screenWidth: 402,
      innerWidth: 402,
      innerHeight: 500,
      shellBottom: 500,
    }),
    { inside: 0, outside: 0 },
  );
});

test("the uncovered band is inside the viewport, below it, or both", () => {
  assert.deepEqual(
    shellGap({
      standalone: false,
      keyboard: false,
      screenHeight: 1440,
      screenWidth: 2560,
      innerWidth: 390,
      innerHeight: 844,
      shellBottom: 780,
    }),
    { inside: 64, outside: 0 },
  );
  assert.deepEqual(
    shellGap({
      standalone: true,
      keyboard: false,
      screenHeight: 874,
      screenWidth: 402,
      innerWidth: 402,
      innerHeight: 812,
      shellBottom: 812,
    }),
    { inside: 0, outside: 62 },
  );
  assert.deepEqual(
    shellGap({
      standalone: true,
      keyboard: false,
      screenHeight: 874,
      screenWidth: 402,
      innerWidth: 402,
      innerHeight: 844,
      shellBottom: 844,
    }),
    { inside: 0, outside: 30 },
  );
});

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

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

async function phoneContext(browser: Browser, standalone: boolean): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: PHONE,
    screen: PHONE,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  if (standalone) {
    await context.addInitScript(() => {
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
  }
  return context;
}

async function safeArea(page: Page, standalone: boolean) {
  try {
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setSafeAreaInsetsOverride", { insets: SAFE });
    if (standalone) {
      await client.send("Emulation.setEmulatedMedia", {
        features: [{ name: "display-mode", value: "standalone" }],
      });
    }
    return true;
  } catch {
    return false;
  }
}

type Cover = {
  vh: number;
  shellBottom: number;
  pad: string;
  hit: string;
  pane: string;
  dockBottom: number | null;
  fillHeight: string;
  fillBg: string;
  safeBottom: number;
};

async function cover(page: Page): Promise<Cover> {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const shell = document.querySelector(".frame-screen, .board-doors");
    const box = shell?.getBoundingClientRect();
    const style = shell ? getComputedStyle(shell) : null;
    const before = getComputedStyle(document.documentElement, "::before");
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom, 0px)";
    document.body.appendChild(probe);
    const safeBottom = Math.round(parseFloat(getComputedStyle(probe).paddingBottom) || 0);
    probe.remove();
    const opaque = (el: Element | null) => {
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        node = node.parentElement;
      }
      return getComputedStyle(document.documentElement).backgroundColor;
    };
    const pane = document.querySelector(".reading-pane");
    const dock = document.querySelector(".home-dock");
    return {
      vh,
      shellBottom: box ? Math.round(box.bottom) : 0,
      pad: style?.paddingBottom ?? "",
      hit: opaque(document.elementFromPoint(Math.floor(vw / 2), Math.max(0, vh - 2))),
      pane: pane ? getComputedStyle(pane).backgroundColor : "",
      dockBottom: dock ? Math.round(dock.getBoundingClientRect().bottom) : null,
      fillHeight: before.height,
      fillBg: before.backgroundColor,
      safeBottom,
    };
  });
}

function sameColor(a: string, b: string) {
  return a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}

async function openReader(page: Page) {
  await page.goto(`${ORIGIN}/salon/read/passing?at=4`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const frame = document.querySelector(".reader-frame");
      return (
        frame?.getAttribute("data-bound") === "full" &&
        frame.getAttribute("data-daylight") !== "off" &&
        !document.querySelector(".veil")
      );
    },
    { timeout: 30_000 },
  );
}

test(
  "the page background covers the bottom of a 390x844 phone with safe-area insets",
  { timeout: 180_000 },
  async () => {
    await ensureReaderServer();
    const browser = await launchChromium();
    try {
      for (const standalone of [true, false]) {
        const context = await phoneContext(browser, standalone);
        const page = await context.newPage();
        const insets = await safeArea(page, standalone);
        assert.equal(insets, true, "Chromium should emulate the home-indicator inset");

        await openReader(page);
        const reader = await cover(page);
        assert.equal(reader.vh, PHONE.height);
        assert.equal(reader.safeBottom, SAFE.bottom, standalone ? "standalone" : "browser");
        assert.equal(reader.pad, "0px");
        assert.ok(
          reader.shellBottom >= reader.vh - 1,
          `reader shell ends at ${reader.shellBottom}, viewport ${reader.vh}`,
        );
        assert.ok(reader.pane.length > 0);
        assert.ok(sameColor(reader.hit, reader.pane), `${reader.hit} vs ${reader.pane}`);

        await page.evaluate(() => {
          const frame = document.querySelector(".frame-screen");
          if (!(frame instanceof HTMLElement)) return;
          frame.style.height = "780px";
          frame.style.maxHeight = "780px";
        });
        await page.evaluate(() => window.dispatchEvent(new Event("resize")));
        await page.waitForFunction(() => {
          const raw = getComputedStyle(document.documentElement).getPropertyValue("--shell-inside");
          return parseFloat(raw) >= 60;
        });
        const short = await cover(page);
        const fill = parseFloat(short.fillHeight);
        assert.ok(fill >= short.vh - 780 - 1, `fill ${short.fillHeight} did not cover the short shell`);
        assert.ok(sameColor(short.fillBg, short.pane), `${short.fillBg} vs ${short.pane}`);
        assert.equal(short.pad, "0px");

        await page.goto(`${ORIGIN}/salon/`, { waitUntil: "domcontentloaded" });
        await page.locator(".home-dock").waitFor();
        const home = await cover(page);
        assert.equal(home.pad, "0px");
        assert.ok(home.dockBottom != null);
        assert.ok(
          (home.dockBottom ?? 0) >= home.vh - 1,
          `home dock ends at ${home.dockBottom}, viewport ${home.vh}`,
        );
        assert.ok(home.shellBottom >= home.vh - 1);

        await page.goto(`${ORIGIN}/salon/profile`, { waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { name: "You" }).waitFor();
        const you = await cover(page);
        assert.equal(you.pad, "0px");
        assert.ok(you.shellBottom >= you.vh - 1, `You shell ends at ${you.shellBottom}`);
        assert.ok(sameColor(you.hit, you.hit));
        const above = await page.evaluate((safe) => {
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          const opaque = (el: Element | null) => {
            let node = el;
            while (node && node !== document.documentElement) {
              const bg = getComputedStyle(node).backgroundColor;
              if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
              node = node.parentElement;
            }
            return getComputedStyle(document.documentElement).backgroundColor;
          };
          const y = Math.max(0, vh - safe - 8);
          return {
            below: opaque(document.elementFromPoint(Math.floor(vw / 2), vh - 2)),
            above: opaque(document.elementFromPoint(Math.floor(vw / 2), y)),
          };
        }, you.safeBottom);
        assert.ok(
          sameColor(above.below, above.above),
          `You bottom ${above.below} stopped above ${above.above}`,
        );

        await page.getByRole("button", { name: "Settings" }).click();
        await page.getByRole("button", { name: "How this is calculated" }).waitFor();
        const settings = await cover(page);
        assert.equal(settings.pad, "0px");
        assert.ok(settings.shellBottom >= settings.vh - 1);

        await context.close();
      }
    } finally {
      await browser.close();
    }
  },
);

test(
  "WebKit at 390x844 keeps the shell on the bottom edge, in the browser and standalone",
  { timeout: 180_000 },
  async () => {
    let browser: Browser;
    try {
      browser = await webkit.launch();
    } catch {
      return;
    }
    try {
      await ensureReaderServer();
      for (const standalone of [true, false]) {
        const context = await phoneContext(browser, standalone);
        const page = await context.newPage();
        await safeArea(page, standalone);
        await openReader(page);
        const reader = await cover(page);
        assert.equal(reader.vh, PHONE.height);
        assert.equal(reader.pad, "0px");
        assert.ok(reader.shellBottom >= reader.vh - 1);
        assert.ok(sameColor(reader.hit, reader.pane), `${reader.hit} vs ${reader.pane}`);

        await page.goto(`${ORIGIN}/salon/profile`, { waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { name: "You" }).waitFor();
        const you = await cover(page);
        assert.equal(you.pad, "0px");
        assert.ok(you.shellBottom >= you.vh - 1);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  },
);

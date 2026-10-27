import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";
import { skipWithoutWebKit } from "./require-webkit.ts";
import { planGroups, waitGroup, type GroupPlace } from "./reader-group-tap.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const WORK = "cranford";
const HOLD_MS = 10_000;
const LATENCY_MS = 2_000;
const USER_ID = "tap-guard-user";

type SpotName = "open" | "mid" | "sit";
type AuthMode = "out" | "in";

function spotOf(name: SpotName): { search: string; at: number } {
  if (name === "mid") return { search: "at=40", at: 40 };
  if (name === "sit") return { search: "sit=5&at=3", at: 3 };
  return { search: "at=3", at: 3 };
}

function sessionFor() {
  return {
    access_token: `access.${USER_ID}`,
    refresh_token: `refresh.${USER_ID}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    expires_in: 86400,
    token_type: "bearer",
    user: {
      id: USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "tap-guard@example.com",
    },
  };
}

function remoteShelf(index: number) {
  return {
    v: 1,
    favorites: [],
    progress: {
      [WORK]: {
        breathIndex: index,
        lastOpenedAt: 1_000,
        sittingStartedAt: null,
        keywords: {},
        kept: [],
        completedAt: null,
        entered: true,
      },
    },
    taste: "",
  };
}

function localShelf(index: number) {
  return {
    state: {
      progress: {
        [WORK]: {
          breathIndex: index,
          lastOpenedAt: 1_000,
          sittingStartedAt: null,
          keywords: {},
          kept: [],
          completedAt: null,
          entered: true,
          activeAnchorAt: null,
          activeMs: 0,
          activeAdvances: 0,
        },
      },
      handle: "",
      favorites: [],
    },
    version: 2,
  };
}

async function launch(name: "chromium" | "webkit"): Promise<Browser> {
  if (name === "webkit") return webkit.launch();
  return chromium.launch({ args: ["--no-sandbox"] });
}

async function phone(browser: Browser, auth: AuthMode, at: number) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
    serviceWorkers: "block",
  });
  await context.addInitScript(
    ({ auth, store, authKey, storeKey }) => {
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
      if (auth) window.localStorage.setItem(authKey, JSON.stringify(auth));
      else window.localStorage.removeItem(authKey);
      if (store) window.localStorage.setItem(storeKey, JSON.stringify(store));
      else window.localStorage.removeItem(storeKey);
    },
    {
      auth: auth === "in" ? sessionFor() : null,
      store: auth === "in" ? localShelf(at) : null,
      authKey: "tbr-supabase-auth",
      storeKey: "vellum-v1",
    },
  );
  return context;
}

async function place(page: Page) {
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
    { timeout: 12_000 },
  );
}

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

async function holdCase(browser: Browser, engine: "chromium" | "webkit", auth: AuthMode, spot: SpotName) {
  const { search, at } = spotOf(spot);
  const label = `${engine} ${auth} ${spot}`;
  const context = await phone(browser, auth, at);
  const page = await context.newPage();
  let libraryGets = 0;
  let textFinished = 0;
  const tappedAt = { current: 0 };

  await context.route(/supabase\.co/, async (route) => {
    const url = route.request().url();
    if (url.includes("/realtime")) {
      await route.abort();
      return;
    }
    if (url.includes("/rest/v1/library") && route.request().method() === "GET") {
      libraryGets += 1;
      await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ shelf: remoteShelf(at) }),
      });
      return;
    }
    if (url.includes("/rest/v1/profiles")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: USER_ID }),
      });
      return;
    }
    if (url.includes("/auth/v1/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sessionFor()),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route(/catalog\/texts\/cranford/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    textFinished = Date.now();
    await route.continue();
  });

  try {
    await page.goto(`${ORIGIN}/salon/read/${WORK}?${search}`, { waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 30_000 });
    if (spot === "mid") {
      await page.waitForFunction(
        () => document.querySelector(".reader-frame")?.getAttribute("data-bound") === "full",
        { timeout: 30_000 },
      );
    }
    await page.waitForFunction(
      (expected) => {
        const frame = document.querySelector(".reader-frame");
        return frame?.getAttribute("data-breath-index") === String(expected) && !document.querySelector(".veil");
      },
      at,
      { timeout: 30_000 },
    );
    const opened = await place(page);
    assert.equal(opened.index, at, `${label} did not open on the link`);
    assert.equal(opened.cursor, 0, `${label} did not open on the first sentence`);
    assert.equal((await page.viewportSize())?.width, 390);
    assert.equal((await page.viewportSize())?.height, 844);

    const once = await planGroups(page, -1, 1);
    assert.notEqual(once, "start", `${label} walked off the start`);
    assert.notEqual(once, "end", `${label} walked off the end`);
    tappedAt.current = Date.now();
    await tapLeft(page);
    await waitGroup(page, once as GroupPlace);
    await holds(page, once as GroupPlace, HOLD_MS);

    if (auth === "in") assert.ok(libraryGets >= 1, `${label} remote shelf never arrived`);
    if (spot !== "mid") {
      assert.ok(textFinished >= tappedAt.current, `${label} full text did not arrive after the tap`);
    }
  } finally {
    await context.close();
  }
}

async function run(name: "chromium" | "webkit") {
  const browser = await launch(name);
  try {
    const spots: SpotName[] = ["open", "mid", "sit"];
    const modes: AuthMode[] = ["out", "in"];
    for (const auth of modes) {
      for (const spot of spots) {
        await holdCase(browser, name, auth, spot);
      }
    }
  } finally {
    await browser.close();
  }
}

test(
  "Chromium standalone: a left tap holds for 10s at the open, mid-book, and a sit",
  { timeout: 240_000 },
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
  "WebKit standalone: a left tap holds for 10s at the open, mid-book, and a sit",
  { timeout: 240_000 },
  async (t) => {
    try {
      const probe = await webkit.launch();
      await probe.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/Executable doesn't exist|browserType\.launch|missing dependencies|shared libraries/.test(message)) {
        throw error;
      }
      skipWithoutWebKit(t);
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

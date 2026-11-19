import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import test from "node:test";
import { chromium, webkit, type Browser, type ConsoleMessage, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { createReaderAccount, emptyVault, READER_ACCOUNT_KEY } from "./reader-account.ts";
import { skipWithoutWebKit } from "./require-webkit.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const USER_ID = "shelf-e2e-user";
const SHOTS = "/tmp/shelf-shots";

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
      email: "shelf@example.com",
    },
  };
}

function storeWith(favorites: string[]) {
  return {
    state: {
      favorites,
      progress: {
        cranford: {
          breathIndex: 3,
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
      handle: "mina",
    },
    version: 3,
  };
}

function remoteShelf(favorites: string[]) {
  return {
    v: 1,
    favorites,
    progress: {},
    taste: "",
  };
}

async function launch(name: "chromium" | "webkit") {
  if (name === "webkit") return webkit.launch();
  return chromium.launch({ args: ["--no-sandbox"] });
}

function watch(page: Page) {
  const errors: string[] = [];
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    errors.push(message.text());
  };
  const onPage = (error: Error) => errors.push(error.message);
  page.on("console", onConsole);
  page.on("pageerror", onPage);
  return errors;
}

function assertClean(errors: string[], where: string) {
  const bad = errors.filter((line) => /418|422|hydration|Hydration/i.test(line));
  assert.deepEqual(bad, [], `${where} hydration: ${bad.join(" | ")}`);
}

async function fontsOk(page: Page, where: string) {
  const families = await page.evaluate(() => {
    const found = new Set<string>();
    document.querySelectorAll("body, body *").forEach((node) => {
      found.add(getComputedStyle(node).fontFamily);
    });
    return [...found];
  });
  for (const family of families) {
    const named = family
      .split(",")
      .map((part) => part.replace(/["']/g, "").trim())
      .filter((part) => part && !/^(sans-serif|serif|system-ui|emoji|monospace)$/i.test(part));
    for (const name of named) {
      assert.ok(
        name === "Outfit" || name === "Cormorant Garamond",
        `${where} font ${name} from ${family}`,
      );
    }
  }
}

async function homeFits(page: Page, where: string) {
  await page.goto(`${ORIGIN}/salon/`, { waitUntil: "domcontentloaded" });
  await page.locator("main.board-doors").waitFor({ timeout: 20_000 });
  const box = await page.evaluate(() => {
    const doc = document.documentElement;
    const board = document.querySelector("main.board-doors") as HTMLElement | null;
    const style = board ? getComputedStyle(board) : null;
    return {
      doc: doc.scrollHeight - doc.clientHeight,
      wide: doc.scrollWidth - doc.clientWidth,
      overflow: style?.overflow ?? "",
      height: board ? board.getBoundingClientRect().height : 0,
      view: window.innerHeight,
    };
  });
  assert.ok(box.doc <= 2, `${where} document scrolls ${box.doc}`);
  assert.ok(box.wide <= 2, `${where} document is wide ${box.wide}`);
  assert.equal(box.overflow, "hidden", `${where} home can scroll`);
  assert.ok(Math.abs(box.height - box.view) <= 8, `${where} home height ${box.height} vs ${box.view}`);
}

async function openShelf(page: Page) {
  await page.goto(`${ORIGIN}/salon/profile`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Shelf", exact: true }).click();
  await page.locator("#shelf").waitFor({ timeout: 20_000 });
}

test("shelf add, remove, reload, sign-in merge, and sign-out", async (t) => {
  mkdirSync(SHOTS, { recursive: true });
  try {
    await ensureReaderServer();
  } catch (error) {
    if (readerDown(error)) {
      t.skip("reader dev server is down");
      return;
    }
    throw error;
  }

  const engines = ["chromium", "webkit"] as const;
  for (const engine of engines) {
    let browser: Browser;
    try {
      browser = await launch(engine);
    } catch (error) {
      if (engine === "webkit") {
        skipWithoutWebKit(t);
        continue;
      }
      throw error;
    }
    try {
      await layoutPass(browser, engine);
      await addRemovePass(browser, engine);
      if (engine === "chromium") await accountPass(browser);
    } finally {
      await browser.close();
    }
  }
});

async function layoutPass(browser: Browser, engine: string) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    const page = await browser.newPage({ viewport, serviceWorkers: "block" });
    const errors = watch(page);
    const where = `${engine} ${viewport.width}x${viewport.height}`;
    try {
      await homeFits(page, where);
      await fontsOk(page, `${where} home`);
      await openShelf(page);
      await page.getByText("Nothing here yet. Open a book and tap Shelf.").waitFor();
      await fontsOk(page, `${where} shelf`);
      assertClean(errors, where);
      if (engine === "chromium" && viewport.width === 390) {
        await page.screenshot({ path: `${SHOTS}/empty-shelf.png` });
      }
    } finally {
      await page.close();
    }
  }
}

async function addRemovePass(browser: Browser, engine: string) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const errors = watch(page);
  try {
    await page.goto(`${ORIGIN}/salon/read/cranford?at=3`, { waitUntil: "domcontentloaded" });
    await page.locator(".breath-now").waitFor({ timeout: 30_000 });
    await page.locator(".reader-glass").click();
    const add = page.getByRole("button", { name: "Add to shelf" });
    await add.waitFor({ timeout: 10_000 });
    if (engine === "chromium") await page.screenshot({ path: `${SHOTS}/add-control.png` });
    await add.click();
    await page.getByRole("button", { name: "Remove from shelf" }).waitFor();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("vellum-v1");
      if (!raw) return false;
      const favorites = (JSON.parse(raw) as { state?: { favorites?: string[] } }).state?.favorites ?? [];
      return favorites.includes("cranford");
    });
    await openShelf(page);
    await page.getByRole("link", { name: /Cranford/ }).waitFor({ timeout: 15_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Shelf", exact: true }).click();
    await page.getByRole("link", { name: /Cranford/ }).waitFor({ timeout: 15_000 });
    if (engine === "chromium") await page.screenshot({ path: `${SHOTS}/filled-shelf.png` });
    await page.getByRole("button", { name: "Remove from shelf" }).click();
    await page.getByText("Nothing here yet. Open a book and tap Shelf.").waitFor();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("vellum-v1");
      if (!raw) return false;
      const favorites = (JSON.parse(raw) as { state?: { favorites?: string[] } }).state?.favorites ?? [];
      return !favorites.includes("cranford");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Shelf", exact: true }).click();
    await page.getByText("Nothing here yet. Open a book and tap Shelf.").waitFor();
    assertClean(errors, `${engine} add/remove`);
  } finally {
    await context.close();
  }
}

async function accountPass(browser: Browser) {
  const created = await createReaderAccount(
    { handle: "mina", email: "mina@example.com", password: "sitquietly" },
    emptyVault(),
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  await context.addInitScript(
    ({ auth, store, vault, authKey, storeKey, vaultKey }) => {
      if (sessionStorage.getItem("shelf-seeded")) return;
      sessionStorage.setItem("shelf-seeded", "1");
      localStorage.setItem(authKey, JSON.stringify(auth));
      localStorage.setItem(storeKey, JSON.stringify(store));
      localStorage.setItem(vaultKey, JSON.stringify(vault));
    },
    {
      auth: sessionFor(),
      store: storeWith(["passing", "we"]),
      vault: created.vault,
      authKey: "tbr-supabase-auth",
      storeKey: "vellum-v1",
      vaultKey: READER_ACCOUNT_KEY,
    },
  );
  await context.route(/supabase\.co/, async (route) => {
    const url = route.request().url();
    const accept = route.request().headers().accept ?? "";
    const object = accept.includes("vnd.pgrst.object");
    if (url.includes("/realtime")) {
      await route.abort();
      return;
    }
    if (url.includes("/auth/v1/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("logout") ? {} : sessionFor()),
      });
      return;
    }
    if (url.includes("/rest/v1/library") && route.request().method() === "GET") {
      const row = { shelf: remoteShelf(["dalloway"]) };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(object ? row : [row]),
      });
      return;
    }
    if (url.includes("/rest/v1/profiles")) {
      const row = { id: USER_ID, handle: "mina" };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(object ? row : [row]),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  const page = await context.newPage();
  const errors = watch(page);
  try {
    await openShelf(page);
    await page.getByRole("link", { name: /Passing/ }).waitFor({ timeout: 15_000 });
    await page.getByRole("link", { name: /Mrs Dalloway/ }).waitFor({ timeout: 20_000 });
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("vellum-v1") ?? "";
      return raw.includes("passing") && raw.includes("dalloway");
    });
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/salon\/?$/, { timeout: 20_000 });
    const after = await page.evaluate(() => localStorage.getItem("vellum-v1") ?? "");
    assert.match(after, /passing/);
    assert.match(after, /dalloway/);
    await openShelf(page);
    await page.getByRole("link", { name: /Passing/ }).waitFor({ timeout: 15_000 });
    await page.getByRole("link", { name: /Mrs Dalloway/ }).waitFor({ timeout: 15_000 });
    assertClean(errors, "account shelf");
  } finally {
    await context.close();
  }
}

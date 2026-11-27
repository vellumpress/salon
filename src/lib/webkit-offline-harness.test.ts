import assert from "node:assert/strict";
import test from "node:test";
import { devices, webkit } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";

/**
 * Playwright's WebKit throws "WebKit encountered an internal error" on a
 * document load while the context is offline. The same error happens with
 * the service worker removed, so it is not a failed app shell. The open
 * page is the check that still means something.
 */

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

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

test(
  "WebKit offline document loads are the browser, and the open page stays",
  { timeout: 120_000 },
  async (t) => {
    if (!(await webkitInstalled())) {
      if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
      skipWithoutWebKit(t);
      return;
    }
    await ensureReaderServer();
    const browser = await webkit.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: PHONE.deviceScaleFactor,
        userAgent: PHONE.userAgent,
      });
      const page = await context.newPage();
      await page.goto(`${ORIGIN}/salon/`, { waitUntil: "domcontentloaded" });
      await page.locator("body").waitFor();
      const before = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().slice(0, 40);
      assert.ok(before.length > 0, "the open page was blank");
      await page.evaluate(async () => {
        const regs = await navigator.serviceWorker?.getRegistrations();
        await Promise.all((regs ?? []).map((reg) => reg.unregister()));
      });
      await context.setOffline(true);
      assert.equal(await page.evaluate(() => navigator.onLine), false);
      const still = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().slice(0, 40);
      assert.equal(still, before);
      let failed = "";
      try {
        await page.goto(`${ORIGIN}/salon/read/cranford`, { waitUntil: "commit", timeout: 15_000 });
      } catch (error) {
        failed = error instanceof Error ? error.message : String(error);
      }
      assert.match(failed, /internal error/);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);

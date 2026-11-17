import assert from "node:assert/strict";
import test from "node:test";
import { INSTALL_ATTEMPTS, installArgs, installBrowsers } from "./install-browsers.mjs";

test("a DNS blip on the first install is retried once", async () => {
  const calls = [];
  const code = await installBrowsers(["chromium"], {
    attempts: INSTALL_ATTEMPTS,
    pause: async () => {},
    log: () => {},
    run: async (browsers) => {
      calls.push(browsers.join(" "));
      return calls.length === 1 ? 1 : 0;
    },
  });
  assert.equal(code, 0);
  assert.deepEqual(calls, ["chromium", "chromium"]);
});

test("two install failures still fail the job", async () => {
  let calls = 0;
  const code = await installBrowsers(["chromium", "webkit"], {
    attempts: INSTALL_ATTEMPTS,
    pause: async () => {},
    log: () => {},
    run: async () => {
      calls += 1;
      return 100;
    },
  });
  assert.equal(code, 100);
  assert.equal(calls, INSTALL_ATTEMPTS);
});

test("a clean install does not retry", async () => {
  let calls = 0;
  const code = await installBrowsers(["chromium"], {
    pause: async () => {
      throw new Error("should not pause");
    },
    run: async () => {
      calls += 1;
      return 0;
    },
  });
  assert.equal(code, 0);
  assert.equal(calls, 1);
});

test("an install with no browser is refused", async () => {
  await assert.rejects(() => installBrowsers(["", "  "]), /at least one browser/);
});

test("a forced reinstall passes --force to the project Playwright", () => {
  assert.deepEqual(installArgs(["chromium", "webkit"], { force: true }), [
    "install",
    "--with-deps",
    "--force",
    "chromium",
    "webkit",
  ]);
  assert.deepEqual(installArgs(["chromium"]), ["install", "--with-deps", "chromium"]);
});

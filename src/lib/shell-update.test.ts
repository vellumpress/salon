import assert from "node:assert/strict";
import test from "node:test";
import {
  freshShellHref,
  shellEntryDiffers,
  SW_RELOAD_WINDOW_MS,
  workerReloadBlocked,
} from "./shell-update.ts";

test("a worker swap reloads once, then not again inside the window", () => {
  const bag = new Map<string, string>();
  const storage = {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
  };
  assert.equal(workerReloadBlocked(storage, 1_000), false);
  storage.setItem("tbr-sw-reload", "1000");
  assert.equal(workerReloadBlocked(storage, 1_000 + SW_RELOAD_WINDOW_MS - 1), true);
  assert.equal(workerReloadBlocked(storage, 1_000 + SW_RELOAD_WINDOW_MS), false);
});

test("a newer entry script is a different shell", () => {
  assert.equal(
    shellEntryDiffers("/salon/assets/index-4mnfzZ5Z.js", '<script type="module" src="/salon/assets/index-4mnfzZ5Z.js">'),
    false,
  );
  assert.equal(
    shellEntryDiffers("/salon/assets/index-4mnfzZ5Z.js", '<script type="module" src="/salon/assets/index-AaBbCcDd.js">'),
    true,
  );
  assert.equal(shellEntryDiffers("", "<html></html>"), false);
});

test("a fresh reload keeps the Pages path query and the sit", () => {
  assert.equal(
    freshShellHref("https://vellumpress.github.io/salon/?/read/moby-dick&sit=5", 99),
    "https://vellumpress.github.io/salon/?/read/moby-dick&sit=5&__fresh=99",
  );
  assert.equal(
    freshShellHref("https://vellumpress.github.io/salon/read/moby-dick?at=28", 99),
    "https://vellumpress.github.io/salon/read/moby-dick?at=28&__fresh=99",
  );
});

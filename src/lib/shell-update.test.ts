import assert from "node:assert/strict";
import test from "node:test";
import { SW_RELOAD_WINDOW_MS, workerReloadBlocked } from "./shell-update.ts";

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

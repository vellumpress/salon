import assert from "node:assert/strict";
import test from "node:test";
import { isOffline, networkFetch } from "./net.ts";

function withNavigator(value: unknown, run: () => Promise<void> | void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value,
  });
  const finish = () => {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else delete (globalThis as { navigator?: unknown }).navigator;
  };
  try {
    const result = run();
    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(finish);
    }
    finish();
    return result;
  } catch (err) {
    finish();
    throw err;
  }
}

test("isOffline follows navigator.onLine", () => {
  withNavigator({ onLine: false }, () => {
    assert.equal(isOffline(), true);
  });
  withNavigator({ onLine: true }, () => {
    assert.equal(isOffline(), false);
  });
  withNavigator({}, () => {
    assert.equal(isOffline(), false);
  });
});

test("networkFetch rejects immediately when the radio is off", async () => {
  let called = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = (() => {
    called += 1;
    return Promise.reject(new Error("should not fetch"));
  }) as typeof fetch;
  try {
    await withNavigator({ onLine: false }, async () => {
      await assert.rejects(networkFetch("https://example.com/session"), TypeError);
    });
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = previous;
  }
});

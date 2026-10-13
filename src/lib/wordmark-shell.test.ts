import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { documentIsWordmarkShell } from "./wordmark-shell.ts";

function doc(selectors: string[]) {
  return {
    querySelector(selector: string) {
      return selectors.some((have) => selector.split(",").some((part) => part.trim() === have))
        ? {}
        : null;
    },
  };
}

test("a wordmark-only document holds the shell until after hydration", () => {
  assert.equal(documentIsWordmarkShell(null), false);
  assert.equal(documentIsWordmarkShell(doc([".wordmark"])), true);
  assert.equal(documentIsWordmarkShell(doc([".wordmark", ".board"])), false);
  assert.equal(documentIsWordmarkShell(doc([".frame-screen"])), false);
  assert.equal(documentIsWordmarkShell(doc([".reader-frame"])), false);
  assert.equal(documentIsWordmarkShell(doc([])), false);
});

test("a wordmark document keeps the root route pending for the first paint", () => {
  const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
  const before = root.slice(root.indexOf("beforeLoad"));
  assert.match(before, /documentIsWordmarkShell\(document\)/);
  assert.match(before, /setTimeout\(resolve, 1\)/);
  assert.doesNotMatch(root, /OutletGate/);
});

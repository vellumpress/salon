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

test("rituals matches the wordmark document before painting the lanes", () => {
  const page = readFileSync(new URL("../routes/rituals.tsx", import.meta.url), "utf8");
  const gate = page.slice(page.indexOf("function RitualsPage"), page.indexOf("function RitualsBody"));
  assert.match(gate, /documentIsWordmarkShell\(document\)/);
  assert.match(gate, /if \(!booted\) return <PagesShell \/>/);
  const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(root, /beforeLoad|OutletGate/);
});

test("login matches the wordmark document before painting the form", () => {
  const page = readFileSync(new URL("../routes/login.tsx", import.meta.url), "utf8");
  const gate = page.slice(page.indexOf("function LoginPage"), page.indexOf("function LoginBody"));
  assert.match(gate, /documentIsWordmarkShell\(document\)/);
  assert.match(gate, /if \(!booted\) return <PagesShell \/>/);
  assert.match(gate, /hydration error #418/);
});

test("the reader matches the wordmark document before painting a breath", () => {
  const page = readFileSync(new URL("../routes/read.$workId.tsx", import.meta.url), "utf8");
  const gate = page.slice(page.indexOf("function ReadPage"), page.indexOf("function ReadBody"));
  assert.match(gate, /documentIsWordmarkShell\(document\)/);
  assert.match(gate, /if \(!booted\) return <PagesShell \/>/);
  assert.match(gate, /hydration error #418/);
});

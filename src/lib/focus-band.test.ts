import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOCUS_DEFAULT,
  FOCUS_KEY,
  FOCUS_MAX,
  FOCUS_MIN,
  applyFocusBand,
  clampFocus,
  focusBand,
  readFocus,
  writeFocus,
} from "./focus-band.ts";

function memoryStore(initial?: Record<string, string>) {
  const data = { ...(initial ?? {}) };
  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

test("focus defaults to today's band and leaves a saved choice alone", () => {
  const fresh = memoryStore({ "salon-text-size": "1.20" });
  assert.equal(FOCUS_DEFAULT, 40);
  assert.equal(readFocus(fresh), FOCUS_DEFAULT);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "" })), FOCUS_DEFAULT);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "wide" })), FOCUS_DEFAULT);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "-4" })), FOCUS_DEFAULT);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "140" })), FOCUS_DEFAULT);
  assert.equal(readFocus(null), FOCUS_DEFAULT);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "0" })), 0);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "100" })), 100);
  assert.equal(readFocus(memoryStore({ [FOCUS_KEY]: "40" })), 40);
  writeFocus(0, fresh);
  assert.equal(fresh.data[FOCUS_KEY], "0");
  assert.equal(fresh.data["salon-text-size"], "1.20");
  writeFocus(100, fresh);
  assert.equal(readFocus(fresh), FOCUS_MAX);
  writeFocus(FOCUS_DEFAULT, fresh);
  assert.equal(readFocus(fresh), FOCUS_DEFAULT);
  assert.equal(clampFocus(0.4), 0);
  assert.equal(clampFocus(3.6), 4);
  assert.equal(clampFocus(Number.NaN), FOCUS_DEFAULT);
});

test("the middle of the slider is the live 43% to 73% band", () => {
  const band = focusBand(FOCUS_DEFAULT);
  assert.equal(band.isDefault, true);
  assert.equal(band.top, "43%");
  assert.equal(band.bottom, "73%");
  assert.equal(band.ramp, 1);
  assert.equal(focusBand(FOCUS_MIN).ramp, 1);
  const narrow = focusBand(FOCUS_MIN);
  assert.equal(narrow.top, "calc(58% - 1.75 * var(--focus-line))");
  assert.equal(narrow.bottom, "calc(58% + 1.75 * var(--focus-line))");
  const wide = focusBand(FOCUS_MAX);
  assert.equal(wide.top, "min(12%, calc(2 * var(--focus-line)))");
  assert.equal(wide.bottom, "max(88%, calc(100% - 2 * var(--focus-line)))");
  assert.ok(Math.abs(wide.ramp - 2 / 9) < 1e-9);
  const towardWide = focusBand(70);
  assert.match(towardWide.top, /43%/);
  assert.ok(towardWide.ramp < 1 && towardWide.ramp > 2 / 9);
});

test("a focus change only rewrites the mask frame", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const fade = css.match(/\.focus-fade\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(fade, /--focus-ink-top:\s*43%/);
  assert.match(fade, /--focus-ink-bottom:\s*73%/);
  assert.match(fade, /--focus-ramp:\s*1/);
  assert.match(css, /\.focus-mark\s*\{[^}]*font-family:\s*var\(--font-sans\)/);
  assert.match(css, /\.focus-blur-clip\s*\{[^}]*opacity:\s*0/);
  assert.match(css, /\.focus-wash\s*\{[^}]*background-image:\s*none/);
  assert.doesNotMatch(reader, /setProperty\("--focus-ink/);
  const sheet = reader.slice(reader.indexOf("Text size"), reader.indexOf("Move by"));
  assert.match(sheet, /Focus/);
  assert.match(sheet, /Fewer lines/);
  assert.match(sheet, /More lines/);
  assert.match(sheet, /aria-labelledby="reader-focus-label"/);
  assert.ok(sheet.indexOf("Text size") < sheet.indexOf("Focus"));

  const values = new Map<string, string>();
  const node = {
    style: {
      setProperty(name: string, value: string) {
        values.set(name, value);
      },
      removeProperty(name: string) {
        values.delete(name);
      },
    },
  };
  applyFocusBand(node as unknown as HTMLElement, FOCUS_DEFAULT);
  assert.equal(values.size, 0);
  applyFocusBand(node as unknown as HTMLElement, FOCUS_MIN);
  assert.match(values.get("--focus-ink-top") ?? "", /1\.75 \* var\(--focus-line\)/);
  assert.equal(values.has("--focus-ramp"), false);
  applyFocusBand(node as unknown as HTMLElement, FOCUS_MAX);
  assert.match(values.get("--focus-ink-top") ?? "", /min\(12%/);
  assert.equal(values.get("--focus-ramp"), "0.222");
  applyFocusBand(node as unknown as HTMLElement, FOCUS_DEFAULT);
  assert.equal(values.size, 0);
});

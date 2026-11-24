import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { focusBands } from "./center-line.ts";
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_KEY,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  TEXT_SIZE_STEP,
  clampTextSize,
  formatTextSize,
  readTextSize,
  writeTextSize,
} from "./text-size.ts";

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

test("text size defaults to the current size and persists like the other reader settings", () => {
  const fresh = memoryStore();
  assert.equal(TEXT_SIZE_DEFAULT, 1);
  assert.ok(TEXT_SIZE_MIN < 1);
  assert.ok(TEXT_SIZE_MAX > 1.26);
  assert.equal(TEXT_SIZE_STEP, 0.01);
  assert.equal(readTextSize(fresh), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "large" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "3" })), 1.12);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "0" })), 0.84);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "2" })), 1);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "4" })), 1.26);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "-1" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "9" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(null), TEXT_SIZE_DEFAULT);

  writeTextSize(TEXT_SIZE_MIN, fresh);
  assert.equal(fresh.data[TEXT_SIZE_KEY], "0.72");
  assert.equal(readTextSize(fresh), TEXT_SIZE_MIN);
  writeTextSize(TEXT_SIZE_MAX, fresh);
  assert.equal(fresh.data[TEXT_SIZE_KEY], "1.85");
  assert.equal(readTextSize(fresh), TEXT_SIZE_MAX);
  writeTextSize(1.726, fresh);
  assert.equal(fresh.data[TEXT_SIZE_KEY], "1.73");
  assert.equal(readTextSize(fresh), 1.73);
  writeTextSize(TEXT_SIZE_DEFAULT, fresh);
  assert.equal(readTextSize(fresh), TEXT_SIZE_DEFAULT);
  assert.equal(formatTextSize(1), "1.00");
  assert.equal(clampTextSize(0.2), TEXT_SIZE_MIN);
  assert.equal(clampTextSize(4), TEXT_SIZE_MAX);
});

test("text size changes the breath size and leaves the three bands fixed", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const root = css.match(/@theme\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(root, /--text-size-base:\s*clamp\(1\.2rem,\s*0\.9rem \+ 1\.5vw,\s*1\.6rem\)/);
  assert.match(root, /--text-size-scale:\s*1;/);
  assert.match(root, /--text-breath:\s*calc\(var\(--text-size-scale\) \* var\(--text-size-base\)\)/);
  assert.doesNotMatch(css, /data-text-size=/);
  assert.doesNotMatch(css, /text-size-step/);

  const slider = css.match(/\.text-size-slider\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(slider, /touch-action:\s*none/);
  assert.match(css, /\.text-size-mark\s*\{[^}]*font-family:\s*var\(--font-sans\)/);
  assert.match(css, /\.text-size-mark-small\s*\{[^}]*font-size:\s*0\.75rem/);
  assert.match(css, /\.text-size-mark-large\s*\{[^}]*font-size:\s*1\.45rem/);

  const bands = css.match(/\.focus-band-now\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(bands, /height:\s*calc\(\(100% - var\(--focus-lead\)\) \/ 3\)/);
  assert.doesNotMatch(bands, /text-size|text-breath/);
  const lead = css.match(/\.reader-frame:not\(\.together-lock\)\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(lead, /--reader-top-lead:\s*calc\(3rem \+ 1px \+ env\(safe-area-inset-top,\s*0px\)\)/);
  assert.doesNotMatch(lead, /text-size|text-breath/);

  const phone = focusBands(844, 49);
  const again = focusBands(844, 49);
  assert.deepEqual(phone, again);
  assert.ok(Math.abs(phone.now.top - phone.read.bottom) < 1e-9);
  assert.ok(Math.abs(phone.next.top - phone.now.bottom) < 1e-9);

  const sheet = reader.slice(reader.indexOf("Daylight colors"), reader.indexOf("<footer"));
  assert.match(sheet, /Text size/);
  assert.match(sheet, /aria-labelledby="reader-text-size-label"/);
  assert.match(sheet, /type="range"/);
  assert.match(sheet, /text-size-mark-small/);
  assert.match(sheet, /text-size-mark-large/);
  assert.ok(sheet.indexOf("Center the line") < sheet.indexOf("Text size"));
  assert.match(reader, /useTextSize/);
  assert.match(reader, /userScrolledRef\.current = false/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { focusBands } from "./center-line.ts";
import {
  TEXT_SIZE_COUNT,
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_KEY,
  TEXT_SIZE_SCALE,
  readTextSize,
  textSizeScale,
  writeTextSize,
  type TextSizeStep,
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
  assert.equal(TEXT_SIZE_COUNT, 5);
  assert.equal(TEXT_SIZE_DEFAULT, 2);
  assert.equal(textSizeScale(TEXT_SIZE_DEFAULT), 1);
  assert.equal(readTextSize(fresh), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "large" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "5" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: "-1" })), TEXT_SIZE_DEFAULT);
  assert.equal(readTextSize(null), TEXT_SIZE_DEFAULT);

  writeTextSize(0, fresh);
  assert.equal(fresh.data[TEXT_SIZE_KEY], "0");
  assert.equal(readTextSize(fresh), 0);
  writeTextSize(4, fresh);
  assert.equal(fresh.data[TEXT_SIZE_KEY], "4");
  assert.equal(readTextSize(fresh), 4);
  writeTextSize(TEXT_SIZE_DEFAULT, fresh);
  assert.equal(readTextSize(fresh), TEXT_SIZE_DEFAULT);

  for (let step = 0; step < TEXT_SIZE_COUNT; step += 1) {
    assert.equal(readTextSize(memoryStore({ [TEXT_SIZE_KEY]: String(step) })), step);
    assert.equal(textSizeScale(step as TextSizeStep), TEXT_SIZE_SCALE[step]);
  }
  assert.ok(TEXT_SIZE_SCALE[0] < 1);
  assert.ok(TEXT_SIZE_SCALE[4] > 1);
});

test("text size changes the breath size and leaves the three bands fixed", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
  const root = css.match(/@theme\s*\{[^}]+\}/)?.[0] ?? "";
  assert.match(root, /--text-size-base:\s*clamp\(1\.2rem,\s*0\.9rem \+ 1\.5vw,\s*1\.6rem\)/);
  assert.match(root, /--text-breath:\s*var\(--text-size-base\)/);

  for (const step of [0, 1, 2, 3, 4]) {
    const rule = css.match(new RegExp(`html\\[data-text-size="${step}"\\]\\s*\\{[^}]+\\}`))?.[0] ?? "";
    assert.ok(rule.length > 0, `missing text size ${step}`);
    assert.match(rule, /--text-breath:\s*calc\(/);
    assert.match(rule, new RegExp(`${TEXT_SIZE_SCALE[step]} \\* var\\(--text-size-base\\)`));
    assert.doesNotMatch(rule, /focus-lead|focus-band|font-family/);
  }

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
  assert.match(sheet, /aria-label="Text size"/);
  assert.ok(sheet.indexOf("Center the line") < sheet.indexOf("Text size"));
  assert.match(reader, /useTextSize/);
});

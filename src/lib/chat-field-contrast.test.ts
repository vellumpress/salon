import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `missing CSS rule ${selector}`);
  return match[1];
}

test("chat-field paints opaque paper ink that Safari cannot wash out", () => {
  const body = rule(".chat-field");
  assert.match(body, /color-scheme:\s*light/);
  assert.match(body, /background-color:\s*var\(--color-paper\)/);
  assert.match(body, /-webkit-text-fill-color:\s*var\(--color-ink/);
  assert.match(body, /-webkit-appearance:\s*none/);
  assert.match(body, /opacity:\s*1/);
});

test("chat-compose is a solid paper bar with an ink rule", () => {
  const body = rule(".chat-compose");
  assert.match(body, /background-color:\s*var\(--color-paper\)/);
  assert.match(body, /border-top:\s*1px solid var\(--color-ink\)/);
  assert.match(body, /color-scheme:\s*light/);
});

test("chat-send stays a solid ink control, separated from the field", () => {
  const body = rule(".chat-send");
  assert.match(body, /background-color:\s*var\(--color-ink\)/);
  assert.match(body, /border-left:\s*1px solid var\(--color-ink\)/);
  assert.match(body, /-webkit-text-fill-color:\s*var\(--color-paper/);
  assert.match(body, /height:\s*3rem/);
});

test("together-compose pins the strip to visual-viewport top, not layout bottom", () => {
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*top:\s*var\(\s*--compose-top/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*z-index:\s*70/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*height:\s*3rem/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*padding-bottom:\s*0/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.frame-screen\s*\{[^}]*top:\s*var\(--vv-offset/s,
  );
  assert.doesNotMatch(
    css,
    /html\.together-compose(?:\.together-kb)? \.chat-compose\s*\{[^}]*bottom:\s*var\(--compose-gap/s,
  );
});

test("together-compose does not position:fixed the strip until together-kb (keyboard actually open)", () => {
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose[\s\S]*position:\s*fixed/,
  );
  assert.doesNotMatch(
    css,
    /html\.together-compose:not\(\.together-kb\) \.chat-compose\s*\{[^}]*position:\s*fixed/s,
  );
  /* The in-flow rule must not pin; only the `.together-kb` qualifier may. */
  const premature = css.match(
    /html\.together-compose(?!\.together-kb) \.chat-compose\s*\{[^}]*position:\s*fixed/s,
  );
  assert.equal(premature, null);
});

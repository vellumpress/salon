import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reader = readFileSync(new URL("../components/chamber-reader.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("reader mark always keeps You linked to /profile", () => {
  const header = reader.slice(
    reader.indexOf("reader-mark relative"),
    reader.indexOf("<footer"),
  );
  assert.match(header, /to=["']\/profile["']/);
  assert.match(header, />\s*You\s*</);
  assert.match(header, /reader-mark-slot/);
});

test("sit timer sheet stacks in flow above Keep, not over it", () => {
  const block = css.match(/\.nav-reveal\s*\{[^}]+\}/);
  assert.ok(block, "missing .nav-reveal rule");
  assert.doesNotMatch(block[0], /position:\s*absolute/);
  assert.doesNotMatch(block[0], /bottom:\s*3rem/);
  assert.match(block[0], /flex-shrink:\s*0/);

  const chrome = reader.slice(
    reader.indexOf("reader-mark relative"),
    reader.indexOf("{overlay === \"threshold\""),
  );
  const reveal = chrome.indexOf('className="nav-reveal"');
  const footer = chrome.indexOf("<footer");
  const keep = chrome.indexOf("keepCurrent");
  assert.ok(reveal > -1, "nav-reveal missing from solo reader chrome");
  assert.ok(footer > -1, "footer missing from solo reader chrome");
  assert.ok(keep > -1, "Keep missing from solo reader chrome");
  assert.ok(reveal < footer, "timer sheet must render above the action bar");
  assert.ok(footer < keep, "Keep must stay in the footer below the sheet");
});

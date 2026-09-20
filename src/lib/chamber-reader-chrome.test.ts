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

test("sand-run sheet Again restarts the sit as an equal pair with Continue", () => {
  const againAt = reader.indexOf("function sitAgain(");
  assert.ok(againAt > -1, "sitAgain helper missing");
  const againFn = reader.slice(againAt, reader.indexOf("function sitContinue("));
  const restartAt = againFn.indexOf("startSitting(work.id, { restart: true })");
  const hideAt = againFn.indexOf("setSandCue(false)");
  assert.ok(restartAt > -1, "Again must restart the timed sit");
  assert.ok(hideAt > -1, "Again must dismiss the sand-run sheet");
  assert.ok(restartAt < hideAt, "restart the clock before hiding the sheet");

  const sheet = reader.slice(
    reader.indexOf('className="sand-cue"'),
    reader.indexOf('overlay === "send"'),
  );
  assert.match(sheet, /className="sand-cue-actions"/);
  assert.match(sheet, /onClick=\{sitContinue\}/);
  assert.match(sheet, /onClick=\{sitAgain\}/);
  assert.doesNotMatch(sheet, /flex shrink-0 items-stretch gap-px bg-ink/);

  const actions = css.match(/\.sand-cue-actions\s*\{[^}]+\}/);
  assert.ok(actions, "missing .sand-cue-actions");
  assert.match(actions[0], /grid-template-columns:\s*1fr 1fr/);

  const cue = css.match(/\.sand-cue\s*\{[^}]+\}/);
  assert.ok(cue, "missing .sand-cue");
  const cueZ = cue[0].match(/z-index:\s*(\d+)/);
  const glass = css.match(/\.reader-glass\s*\{[^}]+\}/);
  assert.ok(glass, "missing .reader-glass");
  const glassZ = glass[0].match(/z-index:\s*(\d+)/);
  assert.ok(cueZ && glassZ, "sand-cue and hourglass need z-index");
  assert.ok(
    Number(cueZ[1]) > Number(glassZ[1]),
    "sand-run actions must sit above the hourglass hit target",
  );
});

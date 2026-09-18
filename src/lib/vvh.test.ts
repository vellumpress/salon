import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  togetherComposeTopPx,
  togetherPinActive,
  togetherRestingTopPx,
  visualViewportVars,
} from "./vvh.ts";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const rootSource = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
const shellSource = readFileSync(new URL("../components/sitting-room.tsx", import.meta.url), "utf8");

test("compose + keyboard sizes the shell to the visual viewport, not a kb-inset pad", () => {
  const vars = visualViewportVars({
    composing: true,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(vars.vvh, 430);
  assert.equal(vars.kbInset, 0);
  assert.equal(vars.offset, 0);
  assert.equal(vars.composeBottom, "0px");
});

test("compose follows visualViewport.offsetTop so Create stays on the visible bottom", () => {
  const vars = visualViewportVars({
    composing: true,
    innerHeight: 844,
    visualHeight: 410,
    offsetTop: 36,
  });
  assert.equal(vars.vvh, 410);
  assert.equal(vars.offset, 36);
  assert.equal(vars.kbInset, 0);
});

test("compose with keyboard closed keeps the home-indicator inset", () => {
  const vars = visualViewportVars({
    composing: true,
    innerHeight: 844,
    visualHeight: 800,
    offsetTop: 0,
  });
  assert.equal(vars.vvh, 800);
  assert.equal(vars.kbInset, 0);
  assert.equal(vars.composeBottom, "safe-area");
});

test("outside compose, --vvh is the visible layout height and offset stays 0", () => {
  const vars = visualViewportVars({
    composing: false,
    innerHeight: 844,
    visualHeight: 780,
    offsetTop: 12,
  });
  assert.equal(vars.vvh, 780);
  assert.equal(vars.offset, 0);
  assert.equal(vars.kbInset, 0);
  assert.equal(vars.composeBottom, "safe-area");
  assert.equal(vars.composeGap, 0);
});

test("together + keyboard freezes --vvh so the reading pane does not shrink", () => {
  const vars = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 430,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(vars.vvh, 844);
  assert.equal(vars.visible, 430);
  assert.equal(vars.composeGap, 0);
  assert.equal(vars.kbInset, 0);
  assert.equal(vars.composeBottom, "0px");
  assert.equal(vars.composeTop, 430 - 48);
  assert.equal(vars.kbOpen, true);
});

test("together pin is the same whether innerHeight shrinks or the keyboard overlays", () => {
  const overlay = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 0,
  });
  const resized = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 430,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(overlay.vvh, 844);
  assert.equal(resized.vvh, 844);
  assert.equal(overlay.composeTop, resized.composeTop);
  assert.equal(overlay.composeTop, togetherComposeTopPx({ offset: 0, visible: 430 }));
  assert.equal(overlay.composeGap, 414);
  assert.equal(resized.composeGap, 0);
  assert.notEqual(
    overlay.composeGap,
    resized.composeGap,
    "composeGap still depends on innerHeight — that is why together must not pin with bottom: gap",
  );
});

test("together + overlaying keyboard pins the dock with compose-top, not a moving layout bottom", () => {
  const vars = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(vars.vvh, 844);
  assert.equal(vars.visible, 430);
  assert.equal(vars.composeGap, 414);
  assert.equal(vars.composeTop, 382);
  assert.equal(vars.composeBottom, "0px");
});

test("together follows visualViewport.offsetTop without moving the frozen frame height", () => {
  const vars = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 400,
    offsetTop: 36,
  });
  assert.equal(vars.vvh, 844);
  assert.equal(vars.offset, 36);
  assert.equal(vars.composeGap, 408);
  assert.equal(vars.composeTop, 36 + 400 - 48);
  assert.equal(vars.composeBottom, "0px");
});

test("together never toggles safe-area padding on the compose strip", () => {
  const closed = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 800,
    offsetTop: 0,
  });
  const open = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(closed.composeBottom, "0px");
  assert.equal(open.composeBottom, "0px");
  assert.equal(closed.vvh, 844);
  assert.equal(closed.composeTop, 800 - 48);
});

test("club compose still wins if both flags are set", () => {
  const vars = visualViewportVars({
    composing: true,
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 12,
  });
  assert.equal(vars.vvh, 430);
  assert.equal(vars.offset, 12);
  assert.equal(vars.kbInset, 0);
  assert.equal(vars.composeBottom, "0px");
});

test("club compose still tracks visualViewport when innerHeight does not shrink", () => {
  const vars = visualViewportVars({
    composing: true,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(vars.vvh, 430);
  assert.equal(vars.offset, 0);
  assert.equal(vars.composeBottom, "0px");
});

test("together compose CSS pins with compose-top, not compose-gap bottom", () => {
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*top:\s*var\(\s*--compose-top/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*bottom:\s*auto/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*padding-bottom:\s*0/s,
  );
  assert.match(
    css,
    /html\.together-compose\.together-kb \.chat-compose\s*\{[^}]*height:\s*3rem/s,
  );
  assert.doesNotMatch(
    css,
    /html\.together-compose(?:\.together-kb)? \.chat-compose\s*\{[^}]*bottom:\s*var\(--compose-gap/s,
  );
});

test("together frame follows visualViewport.offsetTop so a focus pan cannot slide the sentence", () => {
  assert.match(
    css,
    /html\.together-compose\.together-kb \.frame-screen\s*\{[^}]*top:\s*var\(--vv-offset/s,
  );
});

test("viewport meta uses resizes-visual so innerHeight does not shrink under the keyboard", () => {
  assert.match(rootSource, /interactive-widget=resizes-visual/);
  assert.doesNotMatch(rootSource, /interactive-widget=resizes-content/);
});

test("a pre-keyboard fixed pin sits lower than the in-flow rest by the home indicator", () => {
  const rest = togetherRestingTopPx({ frameHeight: 844, safeAreaBottom: 34 });
  const premature = togetherComposeTopPx({ offset: 0, visible: 844 });
  assert.equal(rest, 762);
  assert.equal(premature, 796);
  assert.ok(
    premature > rest,
    "pinning at visible-3rem before the keyboard nudges the bar down — do not apply it on enter",
  );
});

test("together does not activate the fixed pin until the visual viewport has shrunk", () => {
  const rest = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 844,
    offsetTop: 0,
  });
  const chrome = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 800,
    offsetTop: 0,
  });
  const open = visualViewportVars({
    together: true,
    frozenVvh: 844,
    innerHeight: 844,
    visualHeight: 430,
    offsetTop: 0,
  });
  assert.equal(rest.kbOpen, false);
  assert.equal(chrome.kbOpen, false);
  assert.equal(open.kbOpen, true);
  assert.equal(togetherPinActive({ together: true, kbOpen: rest.kbOpen }), false);
  assert.equal(togetherPinActive({ together: true, kbOpen: open.kbOpen }), true);
});

test("together-kb CSS is what takes the strip out of flow, not together-compose alone", () => {
  assert.match(
    css,
    /html\.together-compose\.together-kb[\s\S]*?\.chat-compose[\s\S]*?position:\s*fixed/,
  );
  assert.equal(
    css.match(/html\.together-compose(?!\.together-kb) \.chat-compose\s*\{[^}]*position:\s*fixed/s),
    null,
  );
  assert.equal(
    css.match(/html\.together-compose(?!\.together-kb),\s*html\.together-compose(?!\.together-kb) body\s*\{[^}]*overflow:\s*clip/s),
    null,
  );
});

test("TogetherShell does not pinDocument on the focusing pointerdown", () => {
  assert.match(shellSource, /onPointerDownCapture=\{beginCompose\}/);
  assert.match(shellSource, /onFocusCapture=\{beginCompose\}/);
  const begin = shellSource.match(
    /const beginCompose = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\);/,
  );
  assert.ok(begin, "missing beginCompose");
  assert.match(begin[1], /enterTogetherCompose/);
  assert.doesNotMatch(begin[1], /pinDocument/);
});

test("enterTogetherCompose does not pinDocument before the keyboard is up", () => {
  const src = readFileSync(new URL("./vvh.ts", import.meta.url), "utf8");
  const enter = src.match(
    /export function enterTogetherCompose[\s\S]*?^export function exitTogetherCompose/m,
  );
  assert.ok(enter, "missing enterTogetherCompose");
  assert.doesNotMatch(enter[0], /pinDocument\(/);
  assert.match(enter[0], /TOGETHER_COMPOSE_CLASS/);
  assert.doesNotMatch(enter[0], /TOGETHER_KB_CLASS/);
});

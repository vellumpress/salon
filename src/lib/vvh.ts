/**
 * Visible viewport height for `.frame-screen`.
 *
 * Club compose pins the shell to `visualViewport` (height + offsetTop) so the
 * Create button sits flush above the iOS keyboard / accessory bar.
 *
 * Together compose is the opposite problem: shrinking `--vvh` reflows the
 * reading pane (and trips the short-viewport type scale). Freeze `--vvh` at
 * the pre-keyboard height and pin the chat strip to the *top* of the visual
 * viewport’s bottom edge (`offsetTop + height - 3rem`).
 *
 * #105 used `bottom: var(--compose-gap)` with `composeGap = innerHeight -
 * offsetTop - visualHeight`. That fights iOS:
 *
 * - `interactive-widget=resizes-content` shrinks `window.innerHeight` with the
 *   keyboard, so composeGap collapses to 0. `position: fixed; bottom: 0` is
 *   then measured from a layout viewport that is *also* animating, while a
 *   frozen `--vvh` frame is taller than that layout — Safari pans
 *   `visualViewport.offsetTop` to keep the focused field on screen, and the
 *   strip + sentence jump.
 * - The same gap is 0 under resizes-content and ~keyboard-tall under
 *   resizes-visual, so the bar’s `bottom` is not a stable visual lock.
 *
 * Pinning with `top` (layout-top is stable as the keyboard comes from the
 * bottom) and following `--vv-offset` on `.frame-screen` cancels the pan.
 * Together never toggles safe-area padding on the strip (that resized the
 * bar when the 80px keyboard threshold flipped).
 *
 * Do not apply the fixed pin (or overflow clip / document scroll lock) on
 * pointerdown. `--compose-top` at rest is `visible - 3rem`, which sits below
 * the in-flow bar (frame padding-bottom = home indicator). That nudge takes
 * the field out from under the finger and cancels Safari’s focus — first tap
 * moves the bar, second tap opens the keyboard. Freeze `--vvh` on focus;
 * add `.together-kb` only after the visual viewport has actually shrunk.
 *
 * Club still follows visualViewport height + offset; do **not** pad
 * `--kb-inset` under Create — the visual viewport already excludes the
 * keyboard, so the pad paints a void (Safari’s URL chip sits in it).
 * `--kb-inset` is always 0.
 *
 * Every other field (home search, @username, login, profile, curator)
 * had the together problem without the together pin: the default path
 * set `--vvh` to `min(visual, inner)`, so a keyboard-sized shrink
 * crushed `.frame-screen` / the Mondrian board. Freeze `--vvh` on
 * field focus (and while the keyboard is up). Do **not** follow
 * `offsetTop` on those screens — that cancel-the-pan move is for
 * together’s pinned strip; here it would hide a bottom field.
 */

export const COMPOSE_CLASS = "club-compose";
export const TOGETHER_COMPOSE_CLASS = "together-compose";
/** Applied only once the visual viewport has actually shrunk (keyboard up). */
export const TOGETHER_KB_CLASS = "together-kb";
/** Generic field focus — freeze `--vvh` before the keyboard animation. */
export const KB_FOCUS_CLASS = "kb-focus";
/** Keyboard actually open on a non-together, non-club screen. */
export const KB_OPEN_CLASS = "kb-open";

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "submit",
  "reset",
  "checkbox",
  "radio",
  "file",
  "hidden",
  "range",
  "color",
  "image",
]);

/** Keyboard is open when the visual viewport is this much shorter than layout. */
export const KB_OPEN_PX = 80;

/** Together compose strip. Matches `.chat-compose { height: 3rem }` at a 16px root. */
export const TOGETHER_COMPOSE_STRIP_PX = 48;

export type ViewportVars = {
  vvh: number;
  offset: number;
  kbInset: number;
  visible: number;
  composeGap: number;
  composeTop: number;
  composeBottom: "0px" | "safe-area";
  kbOpen: boolean;
};

/** Layout-viewport Y for the together compose strip. Independent of innerHeight. */
export function togetherComposeTopPx(input: { offset: number; visible: number }): number {
  return Math.round(Math.max(0, input.offset + input.visible - TOGETHER_COMPOSE_STRIP_PX));
}

/**
 * In-flow Y of `.chat-compose` inside `.frame-screen` (border-box height,
 * padding-bottom = home-indicator). Used to prove a pre-keyboard fixed pin
 * at `visible - 3rem` sits *lower* than rest — the #108 first-tap nudge.
 */
export function togetherRestingTopPx(input: {
  frameHeight: number;
  safeAreaBottom: number;
}): number {
  return Math.round(
    Math.max(0, input.frameHeight - input.safeAreaBottom - TOGETHER_COMPOSE_STRIP_PX),
  );
}

/** Fixed pin is a no-op until the keyboard has actually opened. */
export function togetherPinActive(input: { together?: boolean; kbOpen: boolean }): boolean {
  return Boolean(input.together && input.kbOpen);
}

export function visualViewportVars(input: {
  composing?: boolean;
  together?: boolean;
  /** Generic text-field focus. Freeze `--vvh`; do not follow offsetTop. */
  fieldFocus?: boolean;
  innerHeight: number;
  visualHeight: number;
  offsetTop?: number;
  frozenVvh?: number;
}): ViewportVars {
  const inner = Math.max(0, input.innerHeight);
  const visible = input.visualHeight > 1 ? input.visualHeight : inner;
  const offset = Math.max(0, input.offsetTop ?? 0);
  const frozen = input.frozenVvh && input.frozenVvh > 1 ? input.frozenVvh : 0;
  const reference = frozen > inner ? frozen : inner;
  const kbOpen = reference - visible > KB_OPEN_PX;
  const composeBottom: "0px" | "safe-area" = kbOpen ? "0px" : "safe-area";
  const composeGap = Math.round(Math.max(0, inner - offset - visible));

  if (input.composing) {
    const seen = Math.round(visible || inner);
    return {
      vvh: seen,
      offset: Math.round(offset),
      kbInset: 0,
      visible: seen,
      composeGap,
      composeTop: togetherComposeTopPx({ offset, visible: seen }),
      composeBottom,
      kbOpen,
    };
  }

  if (input.together) {
    const locked = frozen || inner;
    const seen = Math.round(visible || inner);
    return {
      vvh: Math.round(locked),
      offset: Math.round(offset),
      kbInset: 0,
      visible: seen,
      composeGap,
      composeTop: togetherComposeTopPx({ offset, visible: seen }),
      /* Never toggle safe-area padding on the together strip — that changes
         the bar’s own height as the keyboard crosses KB_OPEN_PX. */
      composeBottom: "0px",
      kbOpen,
    };
  }

  const seen = Math.round(Math.min(visible, inner) || inner);

  /* URL-bar chrome (~<80px) may still size the shell to the visible
     height. A keyboard-sized shrink — or a focused field about to open
     one — must not reflow Mondrian / login / friends. */
  if (kbOpen || input.fieldFocus) {
    const locked = frozen || (kbOpen ? Math.max(inner, seen) : seen);
    const vis = Math.round(visible || inner);
    return {
      vvh: Math.round(locked),
      offset: 0,
      kbInset: 0,
      visible: vis,
      composeGap,
      composeTop: togetherComposeTopPx({ offset: 0, visible: vis }),
      composeBottom: "safe-area",
      kbOpen,
    };
  }

  return {
    vvh: seen,
    offset: 0,
    kbInset: 0,
    visible: seen,
    composeGap: 0,
    composeTop: togetherComposeTopPx({ offset: 0, visible: seen }),
    composeBottom: "safe-area",
    kbOpen: false,
  };
}

export function isTextField(node: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return false;
  if (node.isContentEditable) return true;
  const tag = node.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (node.getAttribute("type") || "text").toLowerCase();
  return !NON_TEXT_INPUT_TYPES.has(type);
}

/** How far to scroll so `field` sits inside the visible viewport. */
export function fieldScrollDelta(input: {
  fieldTop: number;
  fieldBottom: number;
  visibleHeight: number;
  extra?: number;
}): number {
  const extra = input.extra ?? 16;
  const limit = input.visibleHeight - extra;
  if (input.fieldBottom <= limit && input.fieldTop >= extra) return 0;
  if (input.fieldBottom > limit) return Math.round(input.fieldBottom - limit);
  return Math.round(input.fieldTop - extra);
}

function nearestScrollable(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if (
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

let revealing = false;

function revealActiveField() {
  if (typeof document === "undefined") return;
  if (!isTextField(document.activeElement)) return;
  revealFocusedField(document.activeElement as HTMLElement);
}

function revealFocusedField(target: HTMLElement) {
  if (revealing) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.classList.contains(COMPOSE_CLASS) || root.classList.contains(TOGETHER_COMPOSE_CLASS)) {
    return;
  }
  const vv = window.visualViewport;
  const visible = vv && vv.height > 1 ? vv.height : window.innerHeight;
  const rect = target.getBoundingClientRect();
  const delta = fieldScrollDelta({
    fieldTop: rect.top,
    fieldBottom: rect.bottom,
    visibleHeight: visible,
  });
  if (!delta) return;
  revealing = true;
  try {
    const scroller = nearestScrollable(target);
    if (scroller) {
      scroller.scrollTop += delta;
      return;
    }
    if (!document.querySelector(".frame-screen")) {
      window.scrollBy(0, delta);
    }
  } finally {
    revealing = false;
  }
}

function applyVars(root: HTMLElement, vars: ViewportVars) {
  root.style.setProperty("--vvh", `${vars.vvh}px`);
  root.style.setProperty("--vv-offset", `${vars.offset}px`);
  root.style.setProperty("--vv-visible", `${vars.visible}px`);
  root.style.setProperty("--kb-inset", `${vars.kbInset}px`);
  root.style.setProperty("--compose-gap", `${vars.composeGap}px`);
  root.style.setProperty("--compose-top", `${vars.composeTop}px`);
  root.style.setProperty(
    "--compose-bottom",
    vars.composeBottom === "0px" ? "0px" : "env(safe-area-inset-bottom, 0px)",
  );
}

export function pinDocument() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.scrollY === 0 && document.documentElement.scrollTop === 0 && document.body.scrollTop === 0) {
    return;
  }
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function restVvhFromDom(root: HTMLElement): number | undefined {
  const together = root.classList.contains(TOGETHER_COMPOSE_CLASS);
  const raw = Number(together ? root.dataset.togetherVvh : root.dataset.restVvh);
  return Number.isFinite(raw) && raw > 1 ? raw : undefined;
}

function rememberRestVvh(root: HTMLElement, height: number) {
  if (root.classList.contains(TOGETHER_COMPOSE_CLASS)) return;
  root.dataset.restVvh = String(Math.round(height));
}

export function syncVisualViewport() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const root = document.documentElement;
  const inner = window.innerHeight || root.clientHeight;
  const vv = window.visualViewport;
  const together = root.classList.contains(TOGETHER_COMPOSE_CLASS);
  const composing = root.classList.contains(COMPOSE_CLASS);
  const fieldFocus = root.classList.contains(KB_FOCUS_CLASS);
  const vars = visualViewportVars({
    composing,
    together,
    fieldFocus,
    innerHeight: inner,
    visualHeight: vv && vv.height > 1 ? vv.height : inner,
    offsetTop: vv && Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0,
    frozenVvh: restVvhFromDom(root),
  });
  applyVars(root, vars);
  /* Fixed pin + overflow clip only after the keyboard is up. Applying them
     on pointerdown moves the field (safe-area vs compose-top) and cancels
     Safari’s focus, so the first tap never opens the keyboard. */
  if (together && vars.kbOpen) {
    root.classList.add(TOGETHER_KB_CLASS);
    pinDocument();
  } else {
    root.classList.remove(TOGETHER_KB_CLASS);
  }
  if (!together && !composing && vars.kbOpen) {
    root.classList.add(KB_OPEN_CLASS);
  } else if (!vars.kbOpen) {
    root.classList.remove(KB_OPEN_CLASS);
  }
  if (!vars.kbOpen && !fieldFocus && !together) {
    rememberRestVvh(root, vars.vvh);
  }
}

export function enterClubCompose() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(COMPOSE_CLASS);
  syncVisualViewport();
}

export function exitClubCompose() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(COMPOSE_CLASS);
  syncVisualViewport();
}

export function enterTogetherCompose(opts?: { dockHeight?: number }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root.classList.contains(TOGETHER_COMPOSE_CLASS)) {
    const current =
      parseFloat(root.style.getPropertyValue("--vvh")) ||
      (typeof window !== "undefined" ? window.innerHeight : 0) ||
      root.clientHeight;
    root.dataset.togetherVvh = String(Math.round(current));
  }
  const dockHeight = opts?.dockHeight;
  if (dockHeight && dockHeight > 0) {
    root.style.setProperty("--together-dock-height", `${Math.round(dockHeight)}px`);
  }
  root.classList.add(TOGETHER_COMPOSE_CLASS);
  /* Do not pinDocument or add together-kb here — the field must stay in-flow
     through the focusing tap so iOS will open the keyboard. */
  syncVisualViewport();
  /* iOS often skips visualViewport events during the keyboard animation.
     Sample every frame so `--compose-top` tracks instead of jumping at the end. */
  burstTogetherSync();
}

export function exitTogetherCompose() {
  if (typeof document === "undefined") return;
  togetherBurst += 1;
  const root = document.documentElement;
  delete root.dataset.togetherVvh;
  root.style.removeProperty("--together-dock-height");
  root.classList.remove(TOGETHER_COMPOSE_CLASS);
  root.classList.remove(TOGETHER_KB_CLASS);
  pinDocument();
  syncVisualViewport();
}

let togetherBurst = 0;

function burstTracking(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    root.classList.contains(TOGETHER_COMPOSE_CLASS) ||
    root.classList.contains(KB_FOCUS_CLASS) ||
    root.classList.contains(KB_OPEN_CLASS)
  );
}

function burstTogetherSync(ms = 800) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const started = performance.now();
  const token = ++togetherBurst;
  const tick = (now: number) => {
    if (token !== togetherBurst) return;
    syncVisualViewport();
    if (now - started < ms && burstTracking()) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function beginFieldFocus() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.classList.contains(COMPOSE_CLASS) || root.classList.contains(TOGETHER_COMPOSE_CLASS)) {
    return;
  }
  if (!root.dataset.restVvh) {
    const current =
      parseFloat(root.style.getPropertyValue("--vvh")) ||
      (typeof window !== "undefined" ? window.innerHeight : 0) ||
      root.clientHeight;
    rememberRestVvh(root, current);
  }
  root.classList.add(KB_FOCUS_CLASS);
  syncVisualViewport();
  burstTogetherSync();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(revealActiveField);
  }
}

function endFieldFocus() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window.setTimeout(() => {
    if (isTextField(document.activeElement)) return;
    const root = document.documentElement;
    root.classList.remove(KB_FOCUS_CLASS);
    if (!root.classList.contains(TOGETHER_COMPOSE_CLASS)) {
      delete root.dataset.restVvh;
    }
    syncVisualViewport();
  }, 80);
}

export function attachVisualViewport() {
  if (typeof window === "undefined") return () => undefined;
  const sync = () => syncVisualViewport();
  const syncTogether = () => {
    sync();
    if (burstTracking()) {
      burstTogetherSync(600);
      revealActiveField();
    }
  };
  const onFocusIn = (event: FocusEvent) => {
    if (!isTextField(event.target)) return;
    beginFieldFocus();
  };
  const onFocusOut = (event: FocusEvent) => {
    if (!isTextField(event.target)) return;
    if (isTextField(event.relatedTarget)) return;
    endFieldFocus();
  };
  sync();
  window.visualViewport?.addEventListener("resize", syncTogether);
  window.visualViewport?.addEventListener("scroll", sync);
  window.addEventListener("resize", syncTogether);
  window.addEventListener("orientationchange", syncTogether);
  window.addEventListener("scroll", sync, { passive: true });
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  return () => {
    togetherBurst += 1;
    window.visualViewport?.removeEventListener("resize", syncTogether);
    window.visualViewport?.removeEventListener("scroll", sync);
    window.removeEventListener("resize", syncTogether);
    window.removeEventListener("orientationchange", syncTogether);
    window.removeEventListener("scroll", sync);
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
  };
}

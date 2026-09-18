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
 */

export const COMPOSE_CLASS = "club-compose";
export const TOGETHER_COMPOSE_CLASS = "together-compose";
/** Applied only once the visual viewport has actually shrunk (keyboard up). */
export const TOGETHER_KB_CLASS = "together-kb";

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

export function syncVisualViewport() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const root = document.documentElement;
  const inner = window.innerHeight || root.clientHeight;
  const vv = window.visualViewport;
  const together = root.classList.contains(TOGETHER_COMPOSE_CLASS);
  const frozen = Number(root.dataset.togetherVvh);
  const vars = visualViewportVars({
    composing: root.classList.contains(COMPOSE_CLASS),
    together,
    innerHeight: inner,
    visualHeight: vv && vv.height > 1 ? vv.height : inner,
    offsetTop: vv && Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0,
    frozenVvh: Number.isFinite(frozen) && frozen > 1 ? frozen : undefined,
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

function burstTogetherSync(ms = 800) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const started = performance.now();
  const token = ++togetherBurst;
  const tick = (now: number) => {
    if (token !== togetherBurst) return;
    syncVisualViewport();
    if (
      now - started < ms &&
      document.documentElement.classList.contains(TOGETHER_COMPOSE_CLASS)
    ) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

export function attachVisualViewport() {
  if (typeof window === "undefined") return () => undefined;
  const sync = () => syncVisualViewport();
  const syncTogether = () => {
    sync();
    if (document.documentElement.classList.contains(TOGETHER_COMPOSE_CLASS)) {
      burstTogetherSync(600);
    }
  };
  sync();
  window.visualViewport?.addEventListener("resize", syncTogether);
  window.visualViewport?.addEventListener("scroll", sync);
  window.addEventListener("resize", syncTogether);
  window.addEventListener("orientationchange", syncTogether);
  window.addEventListener("scroll", sync, { passive: true });
  return () => {
    togetherBurst += 1;
    window.visualViewport?.removeEventListener("resize", syncTogether);
    window.visualViewport?.removeEventListener("scroll", sync);
    window.removeEventListener("resize", syncTogether);
    window.removeEventListener("orientationchange", syncTogether);
    window.removeEventListener("scroll", sync);
  };
}

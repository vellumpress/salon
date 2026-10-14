/**
 * The cream band under an iPhone page.
 *
 * Home-screen Safari reports `100dvh` and `visualViewport` short of the glass.
 * The missing slice is the home indicator, or on recent phones a band about
 * the size of the top inset. A shell locked to that short height stops early,
 * and the paper behind it shows as an off-white bar. A safe-area pad on the
 * shell does the same thing from the inside: the pad is paper, so a green
 * reader or a yellow card ends above a strip.
 *
 * The shell grows to the screen when that screen is the phone. Whatever is
 * still uncovered is painted with the page color, under the shell, so reader
 * taps and the book text stay where they are.
 */

import { firstOpaqueBackground } from "./status-bar-color.ts";

/** A keyboard is taller than this. The home-indicator miss is not. */
export const SHELL_GAP_MAX_PX = 120;

export function standaloneShellHeight(input: {
  base: number;
  screenHeight: number;
  screenWidth: number;
  innerWidth: number;
  keyboard: boolean;
}): number {
  const base = Math.round(input.base);
  if (input.keyboard) return base;
  if (Math.abs(input.screenWidth - input.innerWidth) > 8) return base;
  const screen = Math.round(input.screenHeight);
  const missing = screen - base;
  if (missing > 0 && missing <= SHELL_GAP_MAX_PX) return screen;
  return base;
}

export type ShellGap = {
  /** Uncovered pixels inside the layout viewport, under the shell. */
  inside: number;
  /** Uncovered pixels below the layout viewport, still on the glass. */
  outside: number;
};

export function shellGap(input: {
  standalone: boolean;
  keyboard: boolean;
  screenHeight: number;
  screenWidth: number;
  innerWidth: number;
  innerHeight: number;
  shellBottom: number;
}): ShellGap {
  if (input.keyboard) return { inside: 0, outside: 0 };
  const inside = Math.max(0, Math.round(input.innerHeight - input.shellBottom));
  if (!input.standalone) return { inside, outside: 0 };
  if (Math.abs(input.screenWidth - input.innerWidth) > 8) return { inside, outside: 0 };
  const outside = Math.max(0, Math.round(input.screenHeight - input.innerHeight));
  if (outside > SHELL_GAP_MAX_PX) return { inside, outside: 0 };
  return { inside, outside };
}

function shellElement(doc: Document): Element | null {
  return doc.querySelector(".frame-screen") ?? doc.querySelector(".board-doors");
}

/** Color that should continue through the bottom band. */
export function readShellEdge(doc: Document, shell: Element | null = shellElement(doc)): string | null {
  const view = doc.defaultView;
  if (!shell || !view) return null;
  const style = view.getComputedStyle(shell);
  if (shell.classList.contains("reader-daylight")) {
    const tint = style.getPropertyValue("--reader-bg").trim();
    if (tint) return tint;
  }
  const box = shell.getBoundingClientRect();
  const x = Math.max(0, Math.min(view.innerWidth - 1, Math.round(view.innerWidth / 2)));
  const y = Math.max(0, Math.round(Math.min(box.bottom, view.innerHeight) - 2));
  const colors: string[] = [];
  let node: Element | null = doc.elementFromPoint(x, y);
  while (node && node !== doc.body && node !== doc.documentElement) {
    colors.push(view.getComputedStyle(node).backgroundColor);
    node = node.parentElement;
  }
  colors.push(style.backgroundColor);
  return firstOpaqueBackground(colors);
}

export function applyShellPaint(
  root: HTMLElement,
  input: {
    standalone: boolean;
    keyboard: boolean;
    screenHeight: number;
    screenWidth: number;
    innerWidth: number;
    innerHeight: number;
  },
): ShellGap {
  const doc = root.ownerDocument;
  const shell = shellElement(doc);
  if (!shell || input.keyboard) {
    root.style.setProperty("--shell-inside", "0px");
    root.style.setProperty("--shell-outside", "0px");
    return { inside: 0, outside: 0 };
  }
  const gap = shellGap({
    ...input,
    shellBottom: shell.getBoundingClientRect().bottom,
  });
  root.style.setProperty("--shell-inside", `${gap.inside}px`);
  root.style.setProperty("--shell-outside", `${gap.outside}px`);
  const edge = readShellEdge(doc, shell);
  if (edge) root.style.setProperty("--shell-edge", edge);
  return gap;
}

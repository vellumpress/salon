import { withBase } from "./site.ts";

/**
 * Files the reader paints. Latin and Latin-ext ship as separate unicode-range
 * faces; a paragraph is not shown until both are in hand.
 * Outfit 300 is declared and unused.
 */
const READER_FACE_FILES = [
  "outfit-latin-400-normal.woff2",
  "outfit-latin-ext-400-normal.woff2",
  "outfit-latin-500-normal.woff2",
  "outfit-latin-ext-500-normal.woff2",
  "cormorant-garamond-latin-400-normal.woff2",
  "cormorant-garamond-latin-ext-400-normal.woff2",
  "cormorant-garamond-latin-500-normal.woff2",
  "cormorant-garamond-latin-ext-500-normal.woff2",
  "cormorant-garamond-latin-400-italic.woff2",
  "cormorant-garamond-latin-ext-400-italic.woff2",
] as const;

/**
 * Hides glyphs without changing layout. `color` alone loses to the reader's
 * `-webkit-text-fill-color`. Transparency does not change line breaks, so a
 * tap already in flight keeps the windows it planned.
 */
export const FACE_HOLD_CSS = `
html:not([data-faces="ready"]) body,
html:not([data-faces="ready"]) body *,
html:not([data-faces="ready"]) body *::before,
html:not([data-faces="ready"]) body *::after,
html:not([data-faces="ready"]) body *::placeholder {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
}
`.trim();

const FACE_SAMPLE = "Hamburgefonts";

function faceWidth(family: string, style: string, weight: string): number {
  const probe = document.createElement("span");
  probe.textContent = FACE_SAMPLE;
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    "white-space:nowrap",
    "font-size:100px",
    `font-style:${style}`,
    `font-weight:${weight}`,
    `font-family:${family}`,
  ].join(";");
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

/** True once the reading faces are wider or narrower than the generic face. */
function realFacesInUse(): boolean {
  const gap = (family: string, style: string, weight: string, generic: string) =>
    Math.abs(faceWidth(`"${family}"`, style, weight) - faceWidth(generic, style, weight));
  // At 100px, Cormorant roman is only a few pixels off the Linux fallback.
  // Six pixels clears that gap and still rejects an unloaded face.
  return (
    gap("Cormorant Garamond", "normal", "400", "serif") >= 6 &&
    gap("Cormorant Garamond", "italic", "400", "serif") >= 6 &&
    gap("Outfit", "normal", "400", "sans-serif") >= 6 &&
    gap("Outfit", "normal", "500", "sans-serif") >= 6
  );
}

/**
 * Resolves when the files have arrived and the page is measuring the real
 * faces. A thrown load leaves the promise rejected so the shell stays blank.
 */
export async function whenReaderFacesReady(): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  await Promise.all(
    READER_FACE_FILES.map((file) =>
      new FontFace("tbr-face-probe", `url("${withBase(`/fonts/${file}`)}") format("woff2")`).load(),
    ),
  );
  const deadline = performance.now() + 5000;
  while (!realFacesInUse()) {
    if (performance.now() > deadline) {
      throw new Error("reading faces did not replace the fallback");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 32));
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

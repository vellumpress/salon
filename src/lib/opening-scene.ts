import type { Scene, Work } from "./literature.ts";

/**
 * Where a fresh Sit starts once the full novel is in hand.
 * Host openings already begin on the prose; this skips the same leading
 * front matter when that prose is no longer breath 0.
 * Scenes stay in the book. A saved index at or past this breath is not moved.
 */

function plain(text: string) {
  let t = text.trim();
  for (let i = 0; i < 4; i++) {
    const next = t.replace(/^[*_“”"'‘’«»]+/u, "").replace(/[*_“”"'‘’«»]+$/u, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/** A publication or footnote line, e.g. "Note: First published by…". */
function isNoteLine(text: string) {
  return /^note\s*:/i.test(plain(text));
}

/**
 * A short dedication at the front of the book.
 * "To him…", "Dedicated…", "Dedication…". A long sentence that happens
 * to begin with "To" is prose.
 */
function isDedicationLine(text: string) {
  const t = plain(text);
  if (!t || t.length > 280) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 1 || words > 80) return false;
  return /^(?:to\s+|dedicated\b|dedication\b)/i.test(t);
}

function sceneBreaths(work: Work, sceneId: string) {
  return work.breaths.filter((breath) => breath.sceneId === sceneId);
}

/** Every breath is a note or a short dedication, or the scene is tagged front. */
export function isFrontMatterScene(work: Work, scene: Scene) {
  if (scene.front === true) return true;
  const breaths = sceneBreaths(work, scene.id);
  if (breaths.length === 0) return false;
  return breaths.every((breath) => isNoteLine(breath.text) || isDedicationLine(breath.text));
}

/**
 * Breath index of the first real prose scene.
 * Walks only the leading run, so a later note or dedication stays put.
 * If the book is nothing but front matter, stay at 0.
 */
export function openingBreathIndex(work: Work) {
  for (const scene of work.scenes) {
    const start = work.breaths.findIndex((breath) => breath.sceneId === scene.id);
    if (start < 0) continue;
    if (!isFrontMatterScene(work, scene)) return start;
  }
  return 0;
}

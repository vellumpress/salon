import { readerIntro } from "./reader-intro.ts";
import type { Work } from "./works.ts";

export type PrefaceProgress = {
  entered?: boolean;
  lastOpenedAt?: number;
  breathIndex?: number;
  sittingStartedAt?: number | null;
  completedAt?: number | null;
};

/** First sit: no stored progress. Resume once the reader has entered the work. */
export function shouldShowPreface(progress?: PrefaceProgress | null) {
  if (!progress) return true;
  if (progress.entered) return false;
  if ((progress.lastOpenedAt ?? 0) > 0) return false;
  if ((progress.breathIndex ?? 0) > 0) return false;
  if (progress.sittingStartedAt) return false;
  if (progress.completedAt) return false;
  return true;
}

/** Preface copy for the threshold, or empty when this is a resume. */
export function thresholdPreface(work: Work, progress?: PrefaceProgress | null) {
  if (!shouldShowPreface(progress)) return "";
  return readerIntro(work);
}

export type ThresholdKind = "preface" | "sit-gate" | "share" | "none";

export function thresholdKind(input: {
  skipGate?: boolean;
  gateMode?: "full" | "length" | "share";
  progress?: PrefaceProgress | null;
}): ThresholdKind {
  if (input.skipGate) return "none";
  if (input.gateMode === "share") return "share";
  if (shouldShowPreface(input.progress)) return "preface";
  return "sit-gate";
}

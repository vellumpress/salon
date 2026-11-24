import { useLayoutEffect, useState } from "react";
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_KEY,
  readTextSize,
  writeTextSize,
  type TextSizeStep,
} from "./text-size.ts";

export type TextSizePreference = {
  /** Persisted step. 2 is the size the page already used. */
  step: TextSizeStep;
  setStep: (step: TextSizeStep) => void;
};

function applyTextSize(step: TextSizeStep) {
  document.documentElement.dataset.textSize = String(step);
}

/**
 * Text size — same storage shape as the other reader settings.
 * The first paint matches the server (the current size). After mount, storage can change it.
 */
export function useTextSize(): TextSizePreference {
  const [step, setStepState] = useState<TextSizeStep>(TEXT_SIZE_DEFAULT);

  useLayoutEffect(() => {
    const stored = readTextSize();
    setStepState(stored);
    applyTextSize(stored);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TEXT_SIZE_KEY && event.key !== null) return;
      const next = readTextSize();
      setStepState(next);
      applyTextSize(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setStep(next: TextSizeStep) {
    writeTextSize(next);
    setStepState(next);
    applyTextSize(next);
  }

  return { step, setStep };
}

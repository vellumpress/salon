import { useLayoutEffect, useState } from "react";
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_KEY,
  formatTextSize,
  readTextSize,
  writeTextSize,
} from "./text-size.ts";

export type TextSizePreference = {
  /** Persisted multiplier. 1 is the size the page already used. */
  scale: number;
  setScale: (scale: number) => void;
};

function applyTextSize(scale: number) {
  const value = formatTextSize(scale);
  document.documentElement.style.setProperty("--text-size-scale", value);
  document.documentElement.dataset.textSize = value;
}

/**
 * Text size — same storage shape as the other reader settings.
 * The first paint matches the server (the current size). After mount, storage can change it.
 */
export function useTextSize(): TextSizePreference {
  const [scale, setScaleState] = useState(TEXT_SIZE_DEFAULT);

  useLayoutEffect(() => {
    const stored = readTextSize();
    setScaleState(stored);
    applyTextSize(stored);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TEXT_SIZE_KEY && event.key !== null) return;
      const next = readTextSize();
      setScaleState(next);
      applyTextSize(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setScale(next: number) {
    const value = Number(formatTextSize(next));
    writeTextSize(value);
    setScaleState(value);
    applyTextSize(value);
  }

  return { scale, setScale };
}

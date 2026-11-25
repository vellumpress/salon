import { useLayoutEffect, useState } from "react";
import {
  MOVE_BY_DEFAULT,
  MOVE_BY_KEY,
  type MoveBy,
  readMoveBy,
  writeMoveBy,
} from "./move-by.ts";

export type MoveByPreference = {
  /** Persisted choice. Scroll until someone picks, including before storage is read. */
  mode: MoveBy;
  setMode: (mode: MoveBy) => void;
};

function applyMoveBy(mode: MoveBy) {
  document.documentElement.dataset.moveBy = mode;
}

/**
 * Move by — same storage shape as the other reader settings.
 * The first paint is Scroll. After mount, a saved Tap choice can replace it.
 */
export function useMoveBy(): MoveByPreference {
  const [mode, setModeState] = useState<MoveBy>(MOVE_BY_DEFAULT);

  useLayoutEffect(() => {
    const stored = readMoveBy();
    setModeState(stored);
    applyMoveBy(stored);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== MOVE_BY_KEY && event.key !== null) return;
      const next = readMoveBy();
      setModeState(next);
      applyMoveBy(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setMode(next: MoveBy) {
    const value: MoveBy = next === "tap" ? "tap" : "scroll";
    writeMoveBy(value);
    setModeState(value);
    applyMoveBy(value);
  }

  return { mode, setMode };
}

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  FOCUS_DEFAULT,
  FOCUS_KEY,
  applyFocusBand,
  clampFocus,
  formatFocus,
  readFocus,
  writeFocus,
} from "./focus-band.ts";

export type FocusPreference = {
  /** 40 is today's band when nothing is saved. */
  value: number;
  setValue: (value: number) => void;
  hold: (node: HTMLElement | null) => void;
};

/**
 * Focus — same storage shape as text size.
 * The first paint is today's band. After mount, a saved choice can change it.
 * The mask frame is updated in place. Scroll and the sentence stay put.
 */
export function useFocus(): FocusPreference {
  const [value, setValueState] = useState(FOCUS_DEFAULT);
  const valueRef = useRef(value);
  valueRef.current = value;
  const nodeRef = useRef<HTMLElement | null>(null);

  function paint(next: number) {
    document.documentElement.dataset.focus = formatFocus(next);
    applyFocusBand(nodeRef.current, next);
  }

  useLayoutEffect(() => {
    const stored = readFocus();
    setValueState(stored);
    paint(stored);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== FOCUS_KEY && event.key !== null) return;
      const next = readFocus();
      setValueState(next);
      paint(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const hold = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
    if (node) applyFocusBand(node, valueRef.current);
  }, []);

  function setValue(next: number) {
    const stored = clampFocus(next);
    writeFocus(stored);
    setValueState(stored);
    paint(stored);
  }

  return { value, setValue, hold };
}

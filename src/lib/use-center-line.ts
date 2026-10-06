import { useEffect, useState } from "react";
import {
  CENTER_LINE_KEY,
  readCenterLineEnabled,
  writeCenterLineEnabled,
} from "./center-line.ts";

export type CenterLinePreference = {
  /** Persisted preference. Default on, including before storage is read. */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
};

/**
 * "Center the line" — same storage shape as Daylight colors.
 * The first paint matches the server (on). After mount, storage can turn it off.
 */
export function useCenterLine(): CenterLinePreference {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    setEnabledState(readCenterLineEnabled());
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CENTER_LINE_KEY && event.key !== null) return;
      setEnabledState(readCenterLineEnabled());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setEnabled(on: boolean) {
    writeCenterLineEnabled(on);
    setEnabledState(on);
  }

  return { enabled, setEnabled };
}

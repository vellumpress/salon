import { useEffect, useState } from "react";
import { ensureVisitSeed } from "./recommend";

/** Stable for the JS session; new value after a full page reload. */
export function useVisitSeed() {
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    setSeed(ensureVisitSeed());
  }, []);
  return seed;
}

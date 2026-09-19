import { useEffect, useState } from "react";
import {
  YOU_HERO_PALETTES,
  acquireYouHeroPalette,
  releaseYouHeroPalette,
  type YouHeroPalette,
} from "./you-hero-palette.ts";

/** One palette per You visit; advances on a real remount, not Strict Mode bounce. */
export function useYouHeroPalette(): YouHeroPalette {
  const [palette, setPalette] = useState<YouHeroPalette>(YOU_HERO_PALETTES[0]);
  useEffect(() => {
    setPalette(acquireYouHeroPalette());
    return () => {
      releaseYouHeroPalette();
    };
  }, []);
  return palette;
}
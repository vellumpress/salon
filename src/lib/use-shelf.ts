import { useCallback, useSyncExternalStore } from "react";
import {
  getProgress,
  getShelf,
  markEntered,
  saveProgress,
  setFontSize,
  setLastShuffle,
  subscribeShelf,
  toggleFavorite,
  type ShelfState,
  type WorkProgress,
} from "./storage";

export function useShelf<T>(select: (state: ShelfState) => T): T {
  return useSyncExternalStore(
    subscribeShelf,
    () => select(getShelf()),
    () => select(getShelf()),
  );
}

export function useFavorites(): [string[], (workId: string) => void] {
  const favorites = useShelf((s) => s.favorites);
  return [favorites, toggleFavorite];
}

export function useWorkProgress(workId: string): WorkProgress {
  return useShelf((s) => s.progress[workId] ?? getProgress(workId));
}

export function useReaderPrefs() {
  const fontSize = useShelf((s) => s.fontSize);
  const bump = useCallback((delta: number) => {
    setFontSize(getShelf().fontSize + delta);
  }, []);
  return { fontSize, bump };
}

export { markEntered, saveProgress, setLastShuffle, toggleFavorite };

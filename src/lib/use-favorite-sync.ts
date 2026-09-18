import { useEffect, useRef, useState } from "react";
import { listFavorites, pushFavorites } from "@/lib/account";
import type { AppUser } from "@/lib/auth/use-current-user";
import { liveBackendEnabled } from "@/lib/site";
import { useVellum } from "@/lib/store";

/** Local hearts always; merge + push when a signed-in reader is present. */
export function useFavoriteSync(user: AppUser | null) {
  const favorites = useVellum((s) => s.favorites) ?? [];
  const setFavorites = useVellum((s) => s.setFavorites);
  const [hydrated, setHydrated] = useState(false);
  const favSyncRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!user || user.isDevFallback || !liveBackendEnabled || !hydrated) return;
    let alive = true;
    void listFavorites()
      .then((remote) => {
        if (!alive) return;
        const local = useVellum.getState().favorites ?? [];
        const merged = [...local];
        for (const id of remote) {
          if (!merged.includes(id)) merged.push(id);
        }
        if (merged.length !== local.length || remote.some((id) => !local.includes(id))) {
          setFavorites(merged);
        }
        favSyncRef.current = true;
        void pushFavorites({ data: { workIds: merged } }).catch(() => undefined);
      })
      .catch(() => {
        favSyncRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, [user, hydrated, setFavorites]);

  useEffect(() => {
    if (!user || user.isDevFallback || !liveBackendEnabled || !hydrated || !favSyncRef.current) return;
    void pushFavorites({ data: { workIds: favorites } }).catch(() => undefined);
  }, [user, hydrated, favorites]);

  return { hydrated, favorites };
}

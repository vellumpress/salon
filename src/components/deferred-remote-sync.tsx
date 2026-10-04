import { useEffect, useState, type ComponentType } from "react";

/**
 * Hosted directory sync is not needed to paint the shelf. Load it after the
 * first frame so Supabase stays off the Home Screen boot path.
 */
export function DeferredRemoteSync() {
  const [Sync, setSync] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancel = false;
    const run = () => {
      if (cancel) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      void import("@/components/remote-sync")
        .then((mod) => {
          if (!cancel) setSync(() => mod.RemoteSync);
        })
        .catch(() => undefined);
    };
    window.addEventListener("online", run);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2200 });
      return () => {
        cancel = true;
        cancelIdleCallback(id);
        window.removeEventListener("online", run);
      };
    }
    const id = window.setTimeout(run, 1400);
    return () => {
      cancel = true;
      window.clearTimeout(id);
      window.removeEventListener("online", run);
    };
  }, []);

  return Sync ? <Sync /> : null;
}

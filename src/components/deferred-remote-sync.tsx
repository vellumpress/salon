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
      void import("@/components/remote-sync").then((mod) => {
        if (!cancel) setSync(() => mod.RemoteSync);
      });
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2200 });
      return () => {
        cancel = true;
        cancelIdleCallback(id);
      };
    }
    const id = window.setTimeout(run, 1400);
    return () => {
      cancel = true;
      window.clearTimeout(id);
    };
  }, []);

  return Sync ? <Sync /> : null;
}

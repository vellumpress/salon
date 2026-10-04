import { useEffect, useState } from "react";

/**
 * Quiet status for a Home Screen launch with no radio. Does not cover the
 * shelf or the reader, and does not wait on a session refresh.
 */
export function OfflineMark() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  return (
    <p
      className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-30 font-sans text-[11px] tracking-[0.08em] text-ink/70"
      data-offline=""
    >
      Offline
    </p>
  );
}

import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { dismissHomeScreenHint, readHomeScreenOffer } from "@/lib/home-screen-hint";

/**
 * A one-time note for iPhone Safari, while tbr is still a tab.
 * It stays off the sitting, and a dismissal is permanent on this phone.
 */
export function HomeScreenHint() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const displayModeStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches === true;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    setOpen(
      readHomeScreenOffer({
        userAgent: navigator.userAgent,
        pathname,
        nav,
        displayModeStandalone,
        storage,
      }),
    );
  }, [pathname]);

  if (!open) return null;

  return (
    <aside className="home-screen-hint" aria-label="Add to Home Screen">
      <div className="min-w-0">
        <p className="type-pitch">Keep tbr on your home screen</p>
        <p className="type-pitch">Tap Share, then Add to Home Screen.</p>
      </div>
      <button
        type="button"
        className="flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
        onClick={() => {
          let storage: Storage | null = null;
          try {
            storage = window.localStorage;
          } catch {
            storage = null;
          }
          dismissHomeScreenHint(storage);
          setOpen(false);
        }}
      >
        Got it
      </button>
    </aside>
  );
}

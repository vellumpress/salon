import { useEffect, useState } from "react";
import { Link, createRouter } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";
import { installChunkReloadGuard } from "@/lib/chunk-reload";
import { AppErrorComponent } from "@/lib/error-component";
import { APP_BASE_PATH } from "@/lib/site";
import { routeTree } from "./routeTree.gen";

// Before lazy route and catalog chunks. A stale shell fails those imports
// after hydration, which the boot watch no longer treats as a stuck boot.
installChunkReloadGuard();

/**
 * The Pages shell prerenders this mark. The first client paint of a missing
 * route must match it, or React hydration error #418 fires (text mismatch).
 */
function ShelfMark() {
  return (
    <div className="flex min-h-svh items-end bg-paper p-8 text-ink">
      <Wordmark />
    </div>
  );
}

function isWebAppManifestPath(pathname: string) {
  return /\/manifest\.webmanifest$/i.test(pathname);
}

function NotFoundPage() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const path = window.location.pathname || "";
    // The shell must not own this URL. One document load lets the service
    // worker (or Pages) answer with the manifest file instead of this miss.
    if (isWebAppManifestPath(path)) {
      const key = "tbr-manifest-file";
      try {
        if (sessionStorage.getItem(key) === path) return;
        sessionStorage.setItem(key, path);
      } catch {
        return;
      }
      window.location.replace(window.location.href);
      return;
    }
    setShown(true);
  }, []);
  if (!shown) return <ShelfMark />;
  return (
    <div className="flex min-h-svh flex-col justify-end bg-paper p-8 text-ink">
      <Wordmark />
      <p className="mt-3 type-title">This page is not on the shelf.</p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-fit items-center justify-center border border-ink px-4 font-sans text-sm"
      >
        Home
      </Link>
    </div>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: APP_BASE_PATH,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: NotFoundPage,
    defaultPendingComponent: ShelfMark,
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
}

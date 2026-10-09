import { useEffect, useState } from "react";
import { Link, createRouter } from "@tanstack/react-router";
import { PagesShell } from "@/components/pages-shell";
import { Wordmark } from "@/components/wordmark";
import { installChunkReloadGuard } from "@/lib/chunk-reload";
import { AppErrorComponent } from "@/lib/error-component";
import { APP_BASE_PATH } from "@/lib/site";
import { routeTree } from "./routeTree.gen";

// Before lazy route and catalog chunks. A stale shell fails those imports
// after hydration, which the boot watch no longer treats as a stuck boot.
installChunkReloadGuard();

function NotFoundPage() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(true);
  }, []);
  if (!shown) return <PagesShell />;
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
    defaultPendingComponent: PagesShell,
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
}

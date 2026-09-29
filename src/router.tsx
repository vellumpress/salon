import { useEffect, useState } from "react";
import { Link, createRouter } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";
import { AppErrorComponent } from "@/lib/error-component";
import { APP_BASE_PATH } from "@/lib/site";
import { routeTree } from "./routeTree.gen";

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

function NotFoundPage() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
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

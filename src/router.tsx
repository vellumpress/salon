import { createRouter } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";
import { AppErrorComponent } from "@/lib/error-component";
import { APP_BASE_PATH } from "@/lib/site";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: APP_BASE_PATH,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => (
      <div className="flex min-h-svh flex-col justify-end bg-paper p-8 text-ink">
        <Wordmark lockup />
        <p className="mt-3 type-title">This page is not on the shelf.</p>
      </div>
    ),
    defaultPendingComponent: () => (
      <div className="flex min-h-svh items-end bg-paper p-8 type-title text-ink">
        <Wordmark />
      </div>
    ),
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
}

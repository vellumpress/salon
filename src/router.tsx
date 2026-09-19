import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { APP_BASE_PATH, APP_NAME } from "@/lib/site";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: APP_BASE_PATH,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => (
      <div className="flex min-h-svh flex-col justify-end bg-paper p-8 text-ink">
        <p className="type-kicker opacity-70">{APP_NAME}</p>
        <p className="mt-2 type-title">This page is not on the shelf.</p>
      </div>
    ),
    defaultPendingComponent: () => (
      <div className="flex min-h-svh items-end bg-paper p-8 type-title text-ink">
        {APP_NAME}
      </div>
    ),
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
}

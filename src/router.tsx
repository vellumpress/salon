import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { APP_BASE_PATH, APP_NAME } from "@/lib/site";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: APP_BASE_PATH,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: () => (
      <div className="flex min-h-svh items-end bg-paper p-8 font-display text-3xl font-medium tracking-tight text-ink">
        {APP_NAME}
      </div>
    ),
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });
}

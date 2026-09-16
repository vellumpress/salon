import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { HomePage } from "./routes/HomePage";
import { ReadPage } from "./routes/ReadPage";
import { ShufflePage } from "./routes/ShufflePage";
import { YouPage } from "./routes/YouPage";
import "./styles.css";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const youRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/you",
  component: YouPage,
});

const shuffleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shuffle",
  component: ShufflePage,
});

const readRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/read/$workId",
  validateSearch: (search: Record<string, unknown>): {
    sit?: number;
    from?: string;
  } => {
    const sit = Number(search.sit);
    return {
      sit: Number.isFinite(sit) ? sit : undefined,
      from: typeof search.from === "string" ? search.from : undefined,
    };
  },
  component: ReadPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  youRoute,
  shuffleRoute,
  readRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const el = document.getElementById("root");
if (!el) {
  throw new Error("Missing #root");
}

createRoot(el).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

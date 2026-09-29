import { createFileRoute, redirect } from "@tanstack/react-router";

/** Public name for the You page. The screen lives at /profile. */
export const Route = createFileRoute("/you")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
});

import { useLayoutEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PagesShell } from "@/components/pages-shell";

export const Route = createFileRoute("/profile")({
  component: ProfileLayout,
});

function ProfileLayout() {
  // The You page is a child of this layout. On a direct open the child chunk
  // suspends, the outlet paints nothing, and WebKit raises hydration error
  // #418 against the wordmark shell. Hold that shell until after hydration.
  const [booted, setBooted] = useState(false);
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return <Outlet />;
}

import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PagesShell } from "@/components/pages-shell";

/**
 * Public name for the You page. The screen lives at /profile.
 *
 * The static /you document is the wordmark shell. A beforeLoad redirect
 * throws inside that suspense boundary, and React error #422 drops the
 * score on a direct open. Paint the shell, then replace the address.
 */
function YouPage() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/profile", replace: true });
  }, [navigate]);
  return <PagesShell />;
}

export const Route = createFileRoute("/you")({
  component: YouPage,
});

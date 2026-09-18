import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/clubs")({
  component: ClubsRedirect,
});

/** Clubs live on Read together now — keep the old URL as a door. */
function ClubsRedirect() {
  return <Navigate to="/together" />;
}

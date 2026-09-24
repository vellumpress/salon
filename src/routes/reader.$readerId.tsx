import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { normalizeHandle } from "@/lib/social";

export const Route = createFileRoute("/reader/$readerId")({
  component: ReaderRedirect,
});

/** Old reader cards pointed at the demo salon. A real handle opens their profile. */
function ReaderRedirect() {
  const { readerId } = Route.useParams();
  const handle = normalizeHandle(readerId.replace(/^local:/, ""));
  if (handle.length >= 2) {
    return <Navigate to="/friends/$handle" params={{ handle }} replace />;
  }
  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/friends"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Friends
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">Friend</h1>
      </header>
      <p className="px-4 py-8 font-serif text-lg text-ink/70">That reader is not on this phone.</p>
    </div>
  );
}

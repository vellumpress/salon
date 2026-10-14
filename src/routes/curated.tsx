import { createFileRoute, Link } from "@tanstack/react-router";
import { CuratedRows } from "@/components/curated-strip";
import { ResumeLink } from "@/components/resume-link";

export const Route = createFileRoute("/curated")({
  component: CuratedPage,
});

function CuratedPage() {
  return (
    <main className="board board-alive board-adapted board-curated">
      <div className="cell-mark flex bg-paper">
        <Link
          to="/"
          className="type-chrome inline-flex h-full shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="type-mark flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 text-ink">
          Curated
        </span>
        <ResumeLink />
      </div>
      <CuratedRows />
    </main>
  );
}

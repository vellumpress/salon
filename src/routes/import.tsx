import { useLayoutEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeImport } from "@/components/home-import";
import { PagesShell } from "@/components/pages-shell";
import { ResumeLink } from "@/components/resume-link";
import { documentIsWordmarkShell } from "@/lib/wordmark-shell";

export const Route = createFileRoute("/import")({
  component: ImportPage,
});

function ImportPage() {
  // A direct open is the wordmark shell. Painting the form into it raises
  // hydration error #418 on WebKit. Match that document first.
  const [booted, setBooted] = useState(
    () => typeof document !== "undefined" && !documentIsWordmarkShell(document),
  );
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return <ImportBody />;
}

function ImportBody() {
  return (
    <main className="board board-alive board-adapted">
      <div className="cell-mark flex bg-paper">
        <Link
          to="/"
          className="type-chrome inline-flex h-full shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="type-mark flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 text-ink">
          Import
        </span>
        <ResumeLink />
      </div>
      <HomeImport />
    </main>
  );
}

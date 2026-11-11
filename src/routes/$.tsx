import { useLayoutEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PagesShell } from "@/components/pages-shell";
import { Wordmark } from "@/components/wordmark";
import { documentIsWordmarkShell } from "@/lib/wordmark-shell";

export const Route = createFileRoute("/$")({
  component: MissingPage,
});

function MissingPage() {
  // A direct open of an unknown address is the wordmark shell. Painting the
  // missing-page copy into it raises hydration error #418 on WebKit.
  const [booted, setBooted] = useState(
    () => typeof document !== "undefined" && !documentIsWordmarkShell(document),
  );
  useLayoutEffect(() => {
    setBooted(true);
  }, []);
  if (!booted) return <PagesShell />;
  return (
    <div className="flex min-h-svh flex-col justify-end bg-paper p-8 text-ink">
      <Wordmark />
      <p className="mt-3 type-title">This page is not on the shelf.</p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 w-fit items-center justify-center border border-ink px-4 font-sans text-sm"
      >
        Home
      </Link>
    </div>
  );
}

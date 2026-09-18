import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lastReadProgress } from "@/lib/continuity";
import { boardWork } from "@/lib/mondrian";
import { shelfWork } from "@/lib/catalog/shelf";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

export function useLastRead() {
  const progress = useVellum((s) => s.progress);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  const last = lastReadProgress(progress);
  if (!last) return null;
  const work = shelfWork(last.id) ?? boardWork(last.id);
  if (!work) return null;
  return {
    ...last,
    title: work.title,
    author: work.author,
  };
}

/** Compact header control so the last sitting is always one tap away. */
export function ResumeLink({
  className,
}: {
  className?: string;
}) {
  const last = useLastRead();
  if (!last) return null;
  return (
    <Link
      to="/read/$workId"
      params={{ workId: last.id }}
      search={{ at: last.breathIndex }}
      aria-label={`Continue ${last.title}`}
      className={cn(
        "flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-forest px-3 font-sans text-sm text-paper sm:px-4",
        className,
      )}
    >
      Continue
    </Link>
  );
}

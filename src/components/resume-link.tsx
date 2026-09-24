import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lastReadCue, lastReadPercent, lastReadProgress } from "@/lib/continuity";
import { boardWork } from "@/lib/mondrian";
import { shelfWork } from "@/lib/catalog/shelf";
import { useTbr } from "@/lib/store";
import { cn } from "@/lib/utils";

export function usePersistHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    typeof window === "undefined" ? false : useTbr.persist.hasHydrated(),
  );
  useEffect(() => {
    if (useTbr.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useTbr.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export function useLastRead() {
  const progress = useTbr((s) => s.progress);
  const hydrated = usePersistHydrated();
  if (!hydrated) return null;
  const last = lastReadProgress(progress);
  if (!last) return null;
  const work = shelfWork(last.id) ?? boardWork(last.id);
  const breaths = work && "breaths" in work ? work.breaths : undefined;
  return {
    ...last,
    title: work?.title?.trim() || last.id,
    author: work && "author" in work ? (work.author?.trim() ?? "") : "",
    breaths,
    cue: lastReadCue(last.breathIndex, breaths),
    percent: lastReadPercent(last.breathIndex, breaths),
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
        "type-chrome flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-forest px-3 text-paper sm:px-4",
        className,
      )}
    >
      Continue
    </Link>
  );
}

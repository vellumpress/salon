import { useMemo, useState } from "react";
import { FavoriteWorks } from "@/components/favorite-works";
import { KeptSentences, useKeptLines } from "@/components/kept-sentences";
import type { WorkProgress } from "@/lib/store";

export function LineOfDay({
  progress,
  hydrated,
}: {
  progress: Record<string, WorkProgress>;
  hydrated: boolean;
}) {
  const { lines } = useKeptLines(progress, hydrated, 24);
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const line = useMemo(() => {
    if (lines.length === 0) return null;
    let hash = 0;
    for (const char of day) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
    return lines[hash % lines.length] ?? lines[0] ?? null;
  }, [lines, day]);
  const [shown, setShown] = useState<"hidden" | "remember" | "show">("hidden");
  if (!line) {
    return (
      <section className="border-b border-ink px-4 py-5">
        <p className="type-kicker text-muted">Line of the day</p>
        <p className="type-lede mt-2">No line waiting. Keep one while you read.</p>
      </section>
    );
  }
  const cloaked = cloakLine(line.text);
  const reveal = shown !== "hidden";
  return (
    <section className="border-b border-ink bg-paper px-4 py-5 text-ink">
      <p className="type-kicker text-muted">Line of the day · Kept</p>
      <p className="type-chrome mt-1 text-ink/60">
        {line.title}
        {line.author ? ` · ${line.author}` : ""}
      </p>
      <blockquote className="type-lede mt-3">“{reveal ? line.text : cloaked}”</blockquote>
      {shown === "remember" ? (
        <p className="type-pitch mt-3 text-ink/75">Trying to recall it helps it stay.</p>
      ) : null}
      <div className="mt-4 flex gap-px bg-ink">
        <button
          type="button"
          onClick={() => setShown("remember")}
          className="type-chrome min-h-12 flex-1 bg-ink px-3 text-paper"
        >
          I remember
        </button>
        <button
          type="button"
          onClick={() => setShown("show")}
          className="type-chrome min-h-12 flex-1 bg-yellow px-3 text-ink"
        >
          Show me
        </button>
      </div>
    </section>
  );
}

function cloakLine(text: string) {
  const words = text.trim().split(/\s+/);
  if (words.length < 6) return words.slice(0, Math.max(2, words.length - 2)).join(" ") + " …";
  const cut = Math.min(8, Math.max(3, Math.ceil(words.length * 0.28)));
  return words.slice(0, words.length - cut).join(" ") + " …";
}

export function YourLines({
  progress,
  favorites,
  hydrated,
}: {
  progress: Record<string, WorkProgress>;
  favorites: string[];
  hydrated: boolean;
}) {
  return (
    <>
      <FavoriteWorks
        ids={favorites}
        hydrated={hydrated}
        preview
        rail
        heading="Favorites"
        empty="Heart a work while reading — it will live here."
      />
      <KeptSentences
        progress={progress}
        hydrated={hydrated}
        preview
        rail
        empty="Tap Keep on a sentence. It will live in your collection."
      />
    </>
  );
}

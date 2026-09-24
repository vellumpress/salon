import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { FavoriteWorks } from "@/components/favorite-works";
import { KeptSentences } from "@/components/kept-sentences";
import { ResumeLink } from "@/components/resume-link";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useFavoriteSync } from "@/lib/use-favorite-sync";
import { useTbr } from "@/lib/store";

export const Route = createFileRoute("/profile/collection")({
  component: CollectionPage,
});

function CollectionPage() {
  const { user } = useCurrentUserState();
  const { hydrated, favorites } = useFavoriteSync(user);
  const progress = useTbr((s) => s.progress);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.location.hash.replace(/^#/, "");
    if (id !== "books" && id !== "lines") return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [hydrated]);

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/profile"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          You
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
          Collection
        </h1>
        <ResumeLink className="h-12 border-l border-ink" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">This sitting</p>
          <p className="mt-2 type-title">
            Collection
          </p>
          <p className="mt-3 max-w-xl font-serif text-lg text-paper/70">
            Books you heart. Lines you keep. A private shelf.
          </p>
        </div>

        <FavoriteWorks
          ids={favorites}
          hydrated={hydrated}
          heading="Books"
          empty="Heart a work while reading — it will live here."
          sectionId="books"
        />

        <KeptSentences
          progress={progress}
          hydrated={hydrated}
          heading="Lines"
          empty="Tap Keep on a sentence while reading — it will live here."
          sectionId="lines"
        />
      </div>
    </div>
  );
}

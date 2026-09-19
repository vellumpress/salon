import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clubsForReader, formatHandle, getReader } from "@/lib/social";
import { fillClass, fillInk } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reader/$readerId")({
  component: ReaderPage,
});

function ReaderPage() {
  const { readerId } = Route.useParams();
  const reader = getReader(readerId);
  const following = useVellum((s) => s.following) ?? [];
  const toggleFollow = useVellum((s) => s.toggleFollow);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!reader) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/friends"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Friends
          </Link>
        </header>
      </div>
    );
  }

  const isFollowed = hydrated && following.includes(reader.id);
  const clubs = clubsForReader(reader.id);

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/friends"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Friends
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center truncate px-4">
          {formatHandle(reader.handle)}
        </h1>
        <button
          type="button"
          onClick={() => toggleFollow(reader.id)}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm",
            isFollowed ? "bg-ink text-paper" : "bg-red text-paper",
          )}
        >
          {isFollowed ? "Following" : "Follow"}
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("flex min-h-36 flex-col justify-end p-5 sm:p-8", fillClass(reader.fill), fillInk(reader.fill))}>
          <p className="type-kicker opacity-80">
            {formatHandle(reader.handle)} · {reader.city}
          </p>
          <p className="mt-2 type-title">{reader.name}</p>
        </div>
        <div className="border-b border-ink px-5 py-6 sm:px-8">
          <p className="font-serif text-lg text-ink/70">{reader.line}</p>
        </div>
        <Link
          to="/read/$workId"
          params={{ workId: reader.reading }}
          className="flex items-center justify-between border-b border-ink px-5 py-5 sm:px-8"
        >
          <span>
            <span className="block type-kicker text-muted">Sitting</span>
            <span className="mt-1 block type-lede">{reader.workTitle}</span>
          </span>
          <span className="font-sans text-sm">Sit</span>
        </Link>
        <div className="border-b border-ink px-5 py-8 sm:px-8">
          <p className="mb-3 type-kicker text-muted">Kept</p>
          <p className="type-title italic">{reader.kept}</p>
        </div>
        <div>
          {clubs.map((club) => (
            <Link
              key={club.id}
              to="/club/$clubId"
              params={{ clubId: club.id }}
              className="flex items-center justify-between border-b border-ink px-5 py-4 last:border-b-0 sm:px-8"
            >
              <span>
                <span className="block type-kicker text-muted">{club.place}</span>
                <span className="mt-1 block type-lede">{club.name}</span>
              </span>
              <span className={cn("size-2.5 shrink-0", fillClass(club.fill))} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { usePersistHydrated } from "@/components/resume-link";
import { useFollowedAuthors } from "@/lib/followed-authors";
import { fillClass, fillInk, planeOf } from "@/lib/mondrian";
import {
  authorBooksRead,
  booksOnTbrLabel,
  notableAuthor,
} from "@/lib/notable-authors";
import { useTbr } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/friends_/author/$slug")({
  component: AuthorProfilePage,
});

function AuthorProfilePage() {
  const { slug } = Route.useParams();
  const hydrated = usePersistHydrated();
  const progress = useTbr((s) => s.progress);
  const followed = useFollowedAuthors();
  const author = useMemo(() => notableAuthor(slug), [slug]);
  const read = useMemo(
    () => (author && hydrated ? authorBooksRead(author, progress) : []),
    [author, hydrated, progress],
  );

  if (!hydrated) {
    return (
      <ProfileFrame title="Author">
        <div className="min-h-24 bg-paper" />
      </ProfileFrame>
    );
  }

  if (!author) {
    return (
      <ProfileFrame title="Author">
        <div className="px-4 py-8">
          <p className="type-lede">That author is not on tbr.</p>
          <p className="mt-2 font-serif text-base text-ink/70">
            Notable people are authors whose books are already in the catalog.
          </p>
        </div>
      </ProfileFrame>
    );
  }

  const following = followed.follows(author.slug);
  const fill = planeOf(author.slug);
  const initial = author.name.slice(0, 1).toUpperCase();

  return (
    <ProfileFrame
      title={author.name}
      action={
        <button
          type="button"
          onClick={() => followed.toggle(author.slug)}
          aria-pressed={following}
          className={cn(
            "inline-flex h-12 shrink-0 items-center border-l border-ink px-3 font-sans text-sm",
            following ? "bg-ink text-paper" : "bg-paper text-ink",
          )}
        >
          {following ? "Following" : "Follow"}
        </button>
      }
    >
      <div className="border-b border-ink px-4 py-5">
        <div className="flex items-end gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-11 shrink-0 items-center justify-center border border-ink font-sans text-sm",
              fillClass(fill),
              fillInk(fill),
            )}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="type-kicker text-muted">Author</p>
            <p className="mt-1 type-title">{author.name}</p>
            <p className="mt-1 font-serif text-base text-ink/70">{booksOnTbrLabel(author.books.length)}</p>
          </div>
        </div>
        {author.bio ? <p className="mt-4 font-serif text-base leading-snug text-ink/80">{author.bio}</p> : null}
      </div>

      {read.length > 0 ? (
        <section aria-label="You've read">
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">You've read</p>
          <div className="flex max-w-full overflow-x-auto border-b border-ink">
            {read.map((book) => (
              <Link
                key={book.id}
                to="/read/$workId"
                params={{ workId: book.id }}
                className="flex min-h-14 shrink-0 items-center border-r border-ink px-4 font-serif text-base"
              >
                {book.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Books on tbr</p>
      {author.books.map((book) => (
        <article key={book.id} className="border-b border-ink">
          <div className="px-4 py-4">
            <p className="font-serif text-lg leading-snug">{book.title}</p>
            {book.lane ? <p className="mt-1 type-kicker text-muted">{book.lane}</p> : null}
          </div>
          <Link
            to="/read/$workId"
            params={{ workId: book.id }}
            className="flex h-12 items-center border-t border-ink px-4 font-sans text-sm"
          >
            Read
          </Link>
        </article>
      ))}

      <p className="px-4 py-6 font-serif text-sm text-ink/60">
        Titles and lanes are the catalog on this phone. Nothing here is a biography.
      </p>
    </ProfileFrame>
  );
}

function ProfileFrame({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/friends"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Friends
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center truncate px-4">{title}</h1>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

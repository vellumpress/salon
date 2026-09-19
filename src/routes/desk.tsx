import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addNotice,
  deleteNotice,
  loadDesk,
  setFeatured,
  setRole,
  type FeaturedPin,
  type Notice,
  type Person,
} from "@/lib/account";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignOutMark } from "@/components/sign-out";
import { searchShelf, shelfWork, type ShelfWork } from "@/lib/catalog/shelf";
import { fillClass, fillInk, fillOf } from "@/lib/mondrian";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/desk")({
  component: DeskPage,
});

function DeskPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <DeskFrame title="Desk" />;
  if (!user) return <Navigate to="/login" search={{ door: "staff" }} />;
  return <DeskBody />;
}

function DeskFrame({
  title,
  children,
  you = false,
}: {
  title: string;
  children?: ReactNode;
  you?: boolean;
}) {
  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
          {title}
        </h1>
        {you ? (
          <>
            <Link
              to="/friends"
              className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
            >
              Friends
            </Link>
            <Link
              to="/profile"
              className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red px-4 text-paper"
            >
              You
            </Link>
          </>
        ) : null}
        {you ? <SignOutMark className="border-l border-paper" /> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function DeskBody() {
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<FeaturedPin[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadDesk()
      .then((desk) => {
        if (!alive) return;
        if (!desk.ok) {
          setDenied(true);
          setLoading(false);
          return;
        }
        setPins(desk.featured);
        setNotices(desk.notices);
        setPeople(desk.people);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof Error && err.message === "Unauthorized") {
          setDenied(true);
        } else {
          setError(err instanceof Error ? err.message : "The desk would not open");
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(() => searchShelf(query).slice(0, 8), [query]);
  const pinIds = pins.map((pin) => pin.workId);

  async function savePins(ids: string[]) {
    setSaving(true);
    setError("");
    try {
      const next = await setFeatured({ data: { ids } });
      setPins(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pin");
    } finally {
      setSaving(false);
    }
  }

  function addPin(item: ShelfWork) {
    if (pinIds.includes(item.id) || pinIds.length >= 12) return;
    void savePins([...pinIds, item.id]);
    setQuery("");
  }

  function movePin(index: number, dir: -1 | 1) {
    const next = [...pinIds];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    const a = next[index];
    const b = next[swap];
    if (!a || !b) return;
    next[index] = b;
    next[swap] = a;
    void savePins(next);
  }

  async function publishNotice() {
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (!nextTitle || !nextBody) {
      setError("A title and a few words.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = await addNotice({ data: { title: nextTitle, body: nextBody } });
      setNotices(next);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DeskFrame title="Desk" you>
        <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">Staff</p>
          <p className="mt-2 type-title">The desk</p>
        </div>
      </DeskFrame>
    );
  }

  if (denied) {
    return (
      <DeskFrame title="Desk">
        <div className="flex min-h-48 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">Staff</p>
          <p className="mt-2 type-title">
            The desk is for staff
          </p>
          <p className="mt-3 max-w-xl font-serif text-lg text-paper/80">
            You can sit as a reader. Staff sit at vellum.press.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-ink">
          <Link
            to="/profile"
            className="flex min-h-24 items-end bg-red p-5 type-lede text-paper"
          >
            You
          </Link>
          <Link
            to="/login"
            search={{ door: "reader" }}
            className="flex min-h-24 items-end bg-paper p-5 type-lede text-ink"
          >
            Sit
          </Link>
        </div>
      </DeskFrame>
    );
  }

  return (
    <DeskFrame title="Desk" you>
      <div className="flex min-h-36 flex-col justify-end bg-ink p-5 text-paper sm:p-8">
        <p className="type-kicker opacity-80">Staff</p>
        <p className="mt-2 type-title">
          The desk
        </p>
        <p className="mt-3 max-w-xl font-serif text-lg text-paper/80">
          Pin what sits first. Leave a notice. Name who keeps the desk.
        </p>
      </div>

      {error ? (
        <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
      ) : null}

      <section>
        <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
          Curated for you
        </p>
        {pins.length === 0 ? (
          <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/70">
            Nothing pinned. The house titles sit first.
          </p>
        ) : (
          pins.map((pin, index) => {
            const work = shelfWork(pin.workId);
            const fill = fillOf(pin.workId);
            return (
              <div key={pin.workId} className="flex items-stretch border-b border-ink">
                <span
                  className={cn(
                    "flex min-w-0 flex-1 flex-col justify-center px-4 py-4",
                    fillClass(fill),
                    fillInk(fill),
                  )}
                >
                  <span className="type-lede">
                    {work?.title ?? pin.workId}
                  </span>
                  <span className="mt-0.5 type-kicker opacity-80">
                    {work?.author ?? ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={saving || index === 0}
                  onClick={() => movePin(index, -1)}
                  className="inline-flex w-11 shrink-0 items-center justify-center border-l border-ink bg-paper font-sans text-sm text-ink disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={saving || index === pins.length - 1}
                  onClick={() => movePin(index, 1)}
                  className="inline-flex w-11 shrink-0 items-center justify-center border-l border-ink bg-paper font-sans text-sm text-ink disabled:opacity-40"
                >
                  Down
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void savePins(pinIds.filter((id) => id !== pin.workId))}
                  className="inline-flex shrink-0 items-center border-l border-ink bg-ink px-4 font-sans text-sm text-paper"
                >
                  Out
                </button>
              </div>
            );
          })
        )}
        <label className="flex items-stretch border-b border-ink">
          <span className="flex shrink-0 items-center px-4 type-kicker text-muted">
            Pin
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, author"
            className="h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
          />
        </label>
        {query.trim()
          ? matches.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={saving || pinIds.includes(item.id) || pinIds.length >= 12}
                onClick={() => addPin(item)}
                className="flex w-full items-center justify-between border-b border-ink px-4 py-4 text-left disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="block type-lede">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate type-kicker text-muted">
                    {item.author}
                  </span>
                </span>
                <span className="font-sans text-sm">
                  {pinIds.includes(item.id) ? "In" : "Add"}
                </span>
              </button>
            ))
          : null}
      </section>

      <section>
        <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
          Notices
        </p>
        <label className="flex items-stretch border-b border-ink">
          <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
            Title
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink focus-visible:outline-none"
          />
        </label>
        <label className="flex items-stretch border-b border-ink">
          <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">
            Body
          </span>
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink focus-visible:outline-none"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void publishNotice()}
          className="flex h-14 w-full items-center justify-center bg-yellow font-sans text-sm text-ink disabled:opacity-60"
        >
          Post
        </button>
        {notices.map((notice) => (
          <div key={notice.id} className="flex items-stretch border-b border-ink">
            <span className="min-w-0 flex-1 px-4 py-4">
              <span className="block type-lede">
                {notice.title}
              </span>
              <span className="mt-1 block font-serif text-sm text-ink/70">{notice.body}</span>
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                void deleteNotice({ data: { id: notice.id } })
                  .then(setNotices)
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : "Could not take it down"),
                  )
                  .finally(() => setSaving(false));
              }}
              className="inline-flex shrink-0 items-center border-l border-ink bg-ink px-4 font-sans text-sm text-paper"
            >
              Out
            </button>
          </div>
        ))}
      </section>

      <section>
        <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
          Who sits here
        </p>
        {people.map((person) => (
          <div key={person.userId} className="flex items-stretch border-b border-ink last:border-b-0">
            <span className="min-w-0 flex-1 px-4 py-4">
              <span className="block type-lede">
                {person.name || "Unnamed"}
              </span>
              <span className="mt-0.5 block type-kicker text-muted">
                {person.role === "staff" ? "Staff" : "Reader"}
              </span>
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const next = person.role === "staff" ? "reader" : "staff";
                setSaving(true);
                setError("");
                void setRole({ data: { userId: person.userId, role: next } })
                  .then(setPeople)
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : "Could not change the seat"),
                  )
                  .finally(() => setSaving(false));
              }}
              className={cn(
                "inline-flex shrink-0 items-center border-l border-ink px-4 font-sans text-sm",
                person.role === "staff" ? "bg-red text-paper" : "bg-paper text-ink",
              )}
            >
              {person.role === "staff" ? "Staff" : "Reader"}
            </button>
          </div>
        ))}
      </section>
    </DeskFrame>
  );
}

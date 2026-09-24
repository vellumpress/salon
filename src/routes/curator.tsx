import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { askCurator } from "@/lib/ask-curator";
import { boardWork } from "@/lib/mondrian";
import { useTbr } from "@/lib/store";
import type { SittingLength } from "@/lib/shuffle";

export const Route = createFileRoute("/curator")({
  validateSearch: (search: Record<string, unknown>): { from?: string } => {
    const from =
      typeof search.from === "string" && search.from.length < 32 ? search.from : undefined;
    return from ? { from } : {};
  },
  component: CuratorPage,
});

const STARTERS = [
  { label: "Quiet, and short", fill: "bg-red text-paper", text: "Quiet, and short." },
  { label: "Something that turns", fill: "bg-blue text-paper", text: "Something that turns." },
  { label: "Until the last sentence", fill: "bg-yellow text-ink", text: "Until the last sentence." },
] as const;

function pinDocument() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function CuratorPage() {
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const turns = useTbr((s) => s.curator);
  const taste = useTbr((s) => s.taste);
  const readingNow = useTbr((s) => s.readingNow);
  const pushCurator = useTbr((s) => s.pushCurator);
  const setTaste = useTbr((s) => s.setTaste);
  const setSittingMinutes = useTbr((s) => s.setSittingMinutes);
  const setLastShuffle = useTbr((s) => s.setLastShuffle);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [offer, setOffer] = useState<{ workId: string; minutes: SittingLength } | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const turnCount = turns.length;

  const now =
    from && readingNow && readingNow.id === from
      ? readingNow
      : from
        ? {
            id: from,
            title: boardWork(from)?.title ?? from,
            author: boardWork(from)?.author ?? "",
            place: "",
            sentence: "",
          }
        : undefined;

  // Lock document scroll for the life of this page — mobile Safari otherwise
  // scrolls the window when focusing the composer (which sits outside the log).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("curator-chat");
    pinDocument();
    return () => {
      root.classList.remove("curator-chat");
    };
  }, []);

  // Scroll ONLY the message log when turns arrive — never window/document.
  useEffect(() => {
    const el = log.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight });
  }, [turnCount]);

  async function send(text: string) {
    const trimmed = text.trim().slice(0, 400);
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setOffer(null);
    pushCurator({ role: "user", text: trimmed });
    setDraft("");
    const history = [...useTbr.getState().curator].slice(-12);
    try {
      const result = await askCurator({
        data: {
          messages: history,
          taste,
          now: now?.title ? now : undefined,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      pushCurator({ role: "curator", text: result.reply });
      if (result.taste) setTaste(result.taste);
      if (result.workId) {
        const minutes: SittingLength =
          result.minutes === 12 || result.minutes === 20 || result.minutes === 0
            ? result.minutes
            : 20;
        setOffer({ workId: result.workId, minutes });
      }
    } catch {
      setError("The curator could not answer.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function sit() {
    if (!offer) return;
    setLastShuffle(offer.workId);
    setSittingMinutes(offer.minutes);
    void navigate({
      to: "/read/$workId",
      params: { workId: offer.workId },
      search: { shuffle: true, sit: offer.minutes },
    });
  }

  const offered = offer ? boardWork(offer.workId) : null;
  const showStarters = turns.length === 0 && !busy;

  return (
    <div className="frame-screen frame-screen-chat bg-paper text-ink">
      <header className="relative z-20 flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="flex min-w-0 flex-1 items-center bg-paper px-4 type-kicker text-ink">
          Curator
        </span>
        {from ? (
          <Link
            to="/read/$workId"
            params={{ workId: from }}
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
          >
            Back
          </Link>
        ) : (
          <span className="w-3 shrink-0 bg-yellow sm:w-4" />
        )}
      </header>

      {/* Message log only — flex-1 + overflow-y from .veil-rooms */}
      <div
        ref={log}
        className="veil-rooms min-h-0 px-5 py-6 sm:px-8"
        style={{ overflowAnchor: "none" }}
      >
        {turns.length === 0 ? (
          <>
            <div className="mt-auto">
              <h1 className="veil-title">
                {now?.title ? now.title : "What do you like to read?"}
              </h1>
              <p className="veil-note">
                {now?.title
                  ? "Tell the curator how you like to sit."
                  : "Length, weather, what you keep."}
              </p>
              {error ? <p className="mt-4 font-sans text-sm text-red">{error}</p> : null}
            </div>
            {showStarters ? (
              <div className="-mx-5 mt-6 flex shrink-0 flex-col gap-rule border-t border-ink bg-ink sm:-mx-8">
                {STARTERS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex h-14 items-center justify-center font-sans text-sm ${item.fill}`}
                    onClick={() => void send(item.text)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-6">
            {turns.map((turn, i) => (
              <p
                key={`${turn.role}-${i}`}
                className={
                  turn.role === "user"
                    ? "font-sans text-sm tracking-wide text-muted"
                    : "font-serif text-lg leading-snug"
                }
              >
                {turn.text}
              </p>
            ))}
            {busy ? <p className="type-kicker text-muted">Listening.</p> : null}
            {error ? <p className="font-sans text-sm text-red">{error}</p> : null}
          </div>
        )}
      </div>

      {/* Sit + composer outside the scroll log — always docked to viewport bottom */}
      <div className="curator-dock">
        {offered ? (
          <button
            type="button"
            onClick={sit}
            className="flex h-16 shrink-0 items-center justify-between border-t border-ink bg-red px-5 font-sans text-sm text-paper"
          >
            <span className="truncate">{offered.title}</span>
            <span>Sit</span>
          </button>
        ) : null}

        <form onSubmit={onSubmit} className="flex shrink-0 items-stretch border-t border-ink">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={pinDocument}
            maxLength={400}
            disabled={busy}
            placeholder="A preference"
            aria-label="Talk to the curator"
            enterKeyHint="send"
            autoComplete="off"
            className="h-14 min-w-0 flex-1 bg-paper px-5 font-serif text-lg text-ink outline-none [touch-action:manipulation]"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="inline-flex h-14 shrink-0 items-center justify-center bg-ink px-5 font-sans text-sm text-paper disabled:opacity-40 [touch-action:manipulation]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getSentenceShare } from "@/lib/sentence-share";
import { decodeQuoteCard } from "@/lib/quote-share";
import { shelfWork } from "@/lib/catalog/shelf";
import { useChromeStatusBar } from "@/lib/use-reader-daylight";

export const Route = createFileRoute("/s/$token")({
  component: ShareLanding,
});

function ShareLanding() {
  const { token } = Route.useParams();
  useChromeStatusBar();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "missing" }
    | {
        status: "ready";
        workId: string;
        breathIndex: number;
        sentenceText: string;
        title?: string;
        author?: string;
      }
  >({ status: "loading" });

  useEffect(() => {
    const card = decodeQuoteCard(token);
    if (card) {
      setState({
        status: "ready",
        workId: card.w,
        breathIndex: card.i,
        sentenceText: card.t,
        title: card.n,
        author: card.a,
      });
      return;
    }
    let live = true;
    void getSentenceShare({ data: { token } })
      .then((row) => {
        if (!live) return;
        if (!row) {
          setState({ status: "missing" });
          return;
        }
        setState({
          status: "ready",
          workId: row.workId,
          breathIndex: row.breathIndex,
          sentenceText: row.sentenceText,
        });
      })
      .catch(() => {
        if (live) setState({ status: "missing" });
      });
    return () => {
      live = false;
    };
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="type-kicker text-muted">Opening</p>
          <p className="mt-2 type-title">A shared sentence</p>
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="mt-2 type-title">This share</p>
          <p className="mt-3 font-serif text-lg text-ink/70">This share would not come</p>
        </div>
      </div>
    );
  }

  const meta = shelfWork(state.workId);
  const author = state.author || meta?.author || "";
  const title = state.title || meta?.title || "A shared sentence";

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
        <p className="type-kicker text-muted">{author}</p>
        <p className="mt-2 type-title">{title}</p>
        <blockquote className="mt-6 border-l-2 border-ink pl-4 font-serif text-lg leading-relaxed text-ink/80 sm:text-xl">
          {state.sentenceText}
        </blockquote>
        <Link
          to="/read/$workId"
          params={{ workId: state.workId }}
          search={{ at: state.breathIndex }}
          className="mt-8 flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
        >
          Open sitting
        </Link>
      </div>
    </div>
  );
}

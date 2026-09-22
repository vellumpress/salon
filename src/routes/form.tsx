import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/form")({
  component: FormPage,
});

const LINES = [
  "It was the last letter in Irene Redfield’s little pile of morning mail.",
  "After her other ordinary and clearly directed letters the long envelope of thin Italian paper with its almost illegible scrawl seemed out of place and alien.",
  "And there was, too, something mysterious and slightly furtive about it.",
];

function FormPage() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();

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
          Form
        </h1>
      </header>
      <button
        type="button"
        onClick={() => {
          if (i >= LINES.length - 1) {
            void navigate({ to: "/read/$workId", params: { workId: "passing" } });
            return;
          }
          setI((n) => n + 1);
        }}
        className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-6 py-10 text-left sm:px-10"
      >
        {i > 0 ? (
          <p className="mb-6 max-w-xl font-serif text-lookback text-ink/35">{LINES[i - 1]}</p>
        ) : null}
        <p className="max-w-xl font-serif text-breath">{LINES[i]}</p>
      </button>
    </div>
  );
}

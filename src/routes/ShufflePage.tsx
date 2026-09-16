import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Work } from "../catalog/works";
import { cn } from "../lib/hash";
import { fillClass, fillForWork, inkClass } from "../lib/mondrian";
import { randomWork } from "../lib/shuffle";
import { SIT_OPTIONS, type SitMinutes } from "../lib/sitting";
import { setLastShuffle, setSittingMinutes } from "../lib/storage";
import { useShelf } from "../lib/use-shelf";
import { Mark } from "../components/Mark";

type Step =
  | { kind: "time" }
  | { kind: "title"; minutes: SitMinutes; work: Work };

export function ShufflePage() {
  const navigate = useNavigate();
  const lastShuffle = useShelf((s) => s.lastShuffle);
  const [step, setStep] = useState<Step>({ kind: "time" });

  function pickTime(minutes: SitMinutes) {
    const work = randomWork(lastShuffle ?? undefined);
    setSittingMinutes(minutes);
    setLastShuffle(work.id);
    setStep({ kind: "title", minutes, work });
  }

  function openWork(work: Work, minutes: SitMinutes) {
    void navigate({
      to: "/read/$workId",
      params: { workId: work.id },
      search: { sit: minutes, from: "shuffle" },
    });
  }

  if (step.kind === "title") {
    const { work, minutes } = step;
    const fill = fillForWork(work.id);
    return (
      <main className="board board-alive">
        <Mark current="shuffle" />
        <button
          type="button"
          className={cn(
            "cell-wide flex min-h-0 flex-col justify-end p-5 text-left",
            fillClass(fill),
            inkClass(fill),
          )}
          onClick={() => openWork(work, minutes)}
        >
          <span className="font-sans text-xs tracking-wide opacity-70">
            {minutes > 0 ? `${minutes} minutes` : "Until the end"}
          </span>
          <span className="mt-2 font-sans text-xs tracking-wide opacity-70">
            {work.author} · {work.year}
          </span>
          <span className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {work.title}
          </span>
          {work.pitch ? (
            <span className="mt-3 max-w-xl font-serif text-sm leading-snug opacity-80 sm:text-base">
              {work.pitch}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="cell-wide flex min-h-12 items-center justify-center bg-ink font-sans text-sm text-paper"
          onClick={() => openWork(work, minutes)}
        >
          Open
        </button>
        <button
          type="button"
          className="cell-wide flex min-h-12 items-center justify-center bg-paper font-sans text-sm text-ink"
          onClick={() => pickTime(minutes)}
        >
          Another title
        </button>
      </main>
    );
  }

  return (
    <main className="board board-alive">
      <Mark current="shuffle" />
      <div className="cell-wide flex min-h-0 flex-col justify-end bg-paper p-5 text-ink">
        <span className="font-sans text-xs tracking-wide opacity-70">
          Shuffle
        </span>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          How long would you like to read for?
        </h1>
      </div>
      {SIT_OPTIONS.map((option, index) => (
        <button
          key={option.minutes}
          type="button"
          onClick={() => pickTime(option.minutes)}
          className={cn(
            "cell-wide flex min-h-0 flex-col justify-end p-5 text-left",
            index === 0 && "bg-yellow text-ink",
            index === 1 && "bg-blue text-paper",
            index === 2 && "bg-forest text-paper",
          )}
        >
          <span className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {option.label}
          </span>
        </button>
      ))}
      <div className="cell-more">
        <span className="more-kicker">Shuffle</span>
        <div className="more-links">
          <span className="more-link text-muted">This phone only</span>
          <Link to="/" className="more-link">
            Discover
          </Link>
        </div>
      </div>
    </main>
  );
}

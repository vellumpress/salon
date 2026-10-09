import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ScoreHourglass } from "@/components/score-hourglass";
import { LaneStrip, YouActivity } from "@/components/you-stats";
import {
  CONTRIBUTOR_IDS,
  CONTRIBUTOR_WEIGHTS,
  type ContributorId,
  type ContributorResult,
  type ReadingModel,
  type TrendDay,
} from "@/lib/reading-score";
import type { DeskWork, ReadingStats } from "@/lib/reading-stats";
import { formatActiveMinutes } from "@/lib/reading-stats";
import { useTbr, type WorkProgress } from "@/lib/store";
import { cn } from "@/lib/utils";

const LineOfDay = lazy(() =>
  import("@/components/you-kept").then((mod) => ({ default: mod.LineOfDay })),
);
const YourLines = lazy(() =>
  import("@/components/you-kept").then((mod) => ({ default: mod.YourLines })),
);

class LinesBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LinesFallback({ kicker }: { kicker: string }) {
  return (
    <section className="border-b border-ink px-4 py-5">
      <p className="type-kicker text-muted">{kicker}</p>
      <p className="type-lede mt-2">Still learning</p>
    </section>
  );
}

const COLOR: Record<ContributorId, string> = {
  immersion: "var(--color-forest)",
  rhythm: "var(--color-yellow)",
  return: "var(--color-blue)",
  range: "var(--color-red)",
  restfulness: "var(--color-ink)",
  connection: "var(--color-navy)",
};

const NAME: Record<ContributorId, string> = {
  immersion: "Immersion",
  rhythm: "Rhythm",
  return: "Return",
  range: "Range",
  restfulness: "Restfulness",
  connection: "Connection",
};

const ABOUT: Record<ContributorId, { evidence: string; about: string; why: string; try: string; how: string }> = {
  immersion: {
    evidence: "Strong",
    about: "Long, quiet stretches with a story — the reading most tied to comprehension.",
    why: "Screen readers drift more under time pressure. Unhurried reading narrows the gap with paper. One long study found that; it isn’t a promise about a single sit.",
    try: "Set tonight’s sit to 20 minutes and leave the phone face-up on the page.",
    how: "Focused minutes, compared with your usual sit over the last 28 reading days (your sit length until four days are in). Time past one and a half times that usual adds nothing. Breaths much faster than your own pace don’t count. Unbroken runs need a log we don’t keep yet, so that part stays out and the rest of Immersion scales up.",
  },
  rhythm: {
    evidence: "Strong",
    about: "A regular habit, measured gently over two weeks.",
    why: "Habits form through a repeated cue. One miss doesn’t undo them, so a missed day is a small dip, not a reset.",
    try: "A ten-minute sit tonight picks the thread back up.",
    how: "Each of the last 14 days counts a little less than the day after it. That weight is compared with how often you read over the previous eight weeks. A quick visit — under three focused minutes — neither helps nor hurts. There is no streak.",
  },
  return: {
    evidence: "Moderate",
    about: "Coming back to the same story, and later to the lines you kept.",
    why: "Spacing a return over a few days keeps characters and plot in place. Trying to recall a line helps it stay. That second part is still learning on this device.",
    try: "Open yesterday’s book before starting a new one.",
    how: "Over the last week, the share of sits that continued a book you’d already opened in the previous three days. Starting a new book is never a penalty. How many lines you keep is not scored.",
  },
  range: {
    evidence: "Mixed",
    about: "Variety over a month — or real commitment to one long book.",
    why: "A life of reading is linked with later language and knowledge. There isn’t direct evidence that hopping between books helps, so one novel can score the whole contributor.",
    try: "Stay with the book on your desk. Or sit with a form you haven’t opened this month.",
    how: "The better of two routes over 28 days: several forms, countries, and eras with at least 15 focused minutes each, or one work you have carried at least a fifth of the way. No monthly cap.",
  },
  restfulness: {
    evidence: "Moderate",
    about: "Evening reading with a place to stop.",
    why: "Hours of bright screens before bed are hard on sleep. This only notices whether the sit was bounded and whether it ran past 1am. It does not claim Daylight colors improve sleep.",
    try: "Tonight, try a 20-minute sit — the hourglass will tell you when to stop.",
    how: "Scored only on days you read after 8pm. A timed sit that ends near its plan scores highest. Sessions past 1am, or more than twice the planned length, step down. Other days leave it out.",
  },
  connection: {
    evidence: "Moderate",
    about: "Reading with other people: a shared sit, a club, a line kept together.",
    why: "Guided shared reading is linked with company and mood, though the studies are small. Solitary readers are never marked down.",
    try: "If you already read with someone, keep one line together.",
    how: "Opt-in, once you’ve joined a club or read with a friend. Over 14 days, one shared session is 70 and two or more is 100, with a small lift for a line kept together. It never counts friends or compares you with them.",
  },
};

type View = "today" | "trends" | "lines" | "settings" | "calc";
type TrendSpan = "week" | "month" | "year";

export function YouReading({
  reading,
  hydrated,
  handle,
  progress,
  favorites,
  last,
  notice,
  headerEnd,
  settings,
  trendsEnd,
}: {
  reading: ReadingStats;
  hydrated: boolean;
  handle: string;
  progress: Record<string, WorkProgress>;
  favorites: string[];
  last: { id: string; title: string; author: string; breathIndex: number } | null;
  notice?: string;
  headerEnd?: ReactNode;
  settings: ReactNode;
  trendsEnd?: ReactNode;
}) {
  const model = reading.readingModel;
  const scoreHide = useTbr((s) => s.scoreHide);
  const scorePausedAt = useTbr((s) => s.scorePausedAt);
  const setScoreHide = useTbr((s) => s.setScoreHide);
  const setScorePaused = useTbr((s) => s.setScorePaused);
  const dismissInsight = useTbr((s) => s.dismissInsight);
  const noteInsight = useTbr((s) => s.noteInsight);
  const [view, setView] = useState<View>("today");
  const [detail, setDetail] = useState<ContributorId | null>(null);
  const [span, setSpan] = useState<TrendSpan>("week");

  useEffect(() => {
    const card = model.insight;
    if (!card || !hydrated) return;
    const day = model.week.days[model.week.days.length - 1]?.key;
    if (!day) return;
    noteInsight(card.id, day);
  }, [model.insight, model.week.days, hydrated, noteInsight]);

  return (
    <>
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">You</h1>
        <button
          type="button"
          onClick={() => {
            setDetail(null);
            setView(view === "settings" ? "today" : "settings");
          }}
          className={cn(
            "type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink px-4",
            view === "settings" ? "bg-yellow text-ink" : "bg-paper text-ink",
          )}
          aria-pressed={view === "settings"}
        >
          Settings
        </button>
        <Link
          to="/friends"
          preload="intent"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper px-4 text-ink"
        >
          Friends
        </Link>
        {headerEnd}
      </header>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto">
        {notice ? (
          <p className="border-b border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{notice}</p>
        ) : null}
        {view === "settings" ? (
          <SettingsView
            settings={settings}
            scoreHide={scoreHide}
            paused={scorePausedAt != null}
            onHide={setScoreHide}
            onPause={setScorePaused}
            onCalculated={() => setView("calc")}
          />
        ) : view === "calc" ? (
          <HowCalculated onBack={() => setView("settings")} />
        ) : detail ? (
          <ContributorSheet
            id={detail}
            part={model.daily.contributors.find((row) => row.id === detail) ?? null}
            model={model}
            scoreHide={scoreHide}
            paused={scorePausedAt != null}
            onBack={() => setDetail(null)}
            onHide={setScoreHide}
            onPause={setScorePaused}
            onCalculated={() => {
              setDetail(null);
              setView("calc");
            }}
          />
        ) : (
          <>
            <YouNav view={view} onView={setView} />
            {view === "trends" ? (
              <Trends
                reading={reading}
                model={model}
                span={span}
                onSpan={setSpan}
                onOpen={setDetail}
                end={trendsEnd}
              />
            ) : view === "lines" ? (
              <LinesBoundary fallback={<LinesFallback kicker="Your lines" />}>
                <Suspense fallback={<LinesFallback kicker="Your lines" />}>
                  <YourLines progress={progress} favorites={favorites} hydrated={hydrated} />
                </Suspense>
              </LinesBoundary>
            ) : (
              <Today
                reading={reading}
                model={model}
                handle={handle}
                last={last}
                progress={progress}
                hydrated={hydrated}
                scoreHide={scoreHide}
                paused={scorePausedAt != null}
                onOpen={setDetail}
                onDismiss={(id) => dismissInsight(id)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

function YouNav({ view, onView }: { view: View; onView: (view: View) => void }) {
  const tabs: { id: View; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "trends", label: "Trends" },
    { id: "lines", label: "Your lines" },
  ];
  return (
    <nav className="flex border-b border-ink" aria-label="You">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onView(tab.id)}
          className={cn(
            "type-kicker min-h-12 flex-1 px-2",
            view === tab.id ? "bg-ink text-paper" : "bg-paper text-ink",
          )}
          aria-current={view === tab.id ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
      <Link
        to="/together"
        className="type-kicker inline-flex min-h-12 flex-1 items-center justify-center border-l border-ink bg-paper px-2 text-ink"
      >
        Clubs
      </Link>
    </nav>
  );
}

function Today({
  reading,
  model,
  handle,
  last,
  progress,
  hydrated,
  scoreHide,
  paused,
  onOpen,
  onDismiss,
}: {
  reading: ReadingStats;
  model: ReadingModel;
  handle: string;
  last: { id: string; title: string; author: string; breathIndex: number } | null;
  progress: Record<string, WorkProgress>;
  hydrated: boolean;
  scoreHide: boolean;
  paused: boolean;
  onOpen: (id: ContributorId) => void;
  onDismiss: (id: string) => void;
}) {
  const daily = model.daily;
  const readingDay = daily.kind === "reading";
  return (
    <>
      <section className="border-b border-ink bg-paper px-4 py-6 text-ink">
        <p className="type-kicker text-muted">{handle || "This sitting"}</p>
        <ScoreHourglass model={model} hide={scoreHide} paused={paused} />
        {paused ? (
          <p className="type-pitch mx-auto mt-4 max-w-sm text-center text-ink/80">
            Scoring is paused. Baselines stay where they were, so coming back won’t look like a decline.
          </p>
        ) : null}
        {daily.learningNote ? (
          <p className="type-pitch mx-auto mt-3 max-w-sm text-center text-ink/70">{daily.learningNote}</p>
        ) : null}
        {readingDay && daily.versusUsual != null && !scoreHide ? (
          <p className="type-chrome mx-auto mt-4 inline-flex bg-yellow px-3 py-2 text-ink">
            {versusCopy(daily.versusUsual)}
          </p>
        ) : null}
        {!readingDay ? (
          <p className="type-pitch mx-auto mt-4 max-w-sm text-center text-ink/80">
            {daily.line}
            {model.week.score != null ? ` This week is ${model.week.score}.` : ""}
          </p>
        ) : (
          <p className="type-pitch mx-auto mt-3 max-w-sm text-center text-ink/75">{daily.line}</p>
        )}
      </section>
      <ContributorBars parts={daily.contributors} onOpen={onOpen} />
      {model.insight ? <InsightCard card={model.insight} onDismiss={onDismiss} /> : null}
      <ReadingNow last={last} desk={reading.desk} />
      <LinesBoundary fallback={<LinesFallback kicker="Line of the day" />}>
        <Suspense fallback={<LinesFallback kicker="Line of the day" />}>
          <LineOfDay progress={progress} hydrated={hydrated} />
        </Suspense>
      </LinesBoundary>
    </>
  );
}

function versusCopy(delta: number) {
  if (delta > 0) return `↑ ${delta} vs your usual`;
  if (delta < 0) return `↓ ${Math.abs(delta)} vs your usual`;
  return "Level with your usual";
}

function ContributorBars({
  parts,
  onOpen,
}: {
  parts: ContributorResult[];
  onOpen: (id: ContributorId) => void;
}) {
  const order = CONTRIBUTOR_IDS.map((id) => parts.find((part) => part.id === id)).filter(
    (part): part is ContributorResult => Boolean(part),
  );
  return (
    <section aria-label="Contributors">
      {order.map((part) => {
        const width = part.status === "scored" && part.value != null ? part.value : 0;
        const value =
          part.status === "scored" && part.value != null
            ? String(part.value)
            : part.status === "learning"
              ? "Still learning"
              : "—";
        return (
          <button
            key={part.id}
            type="button"
            onClick={() => onOpen(part.id)}
            className="flex w-full items-center gap-3 border-b border-ink bg-paper px-4 py-3 text-left"
          >
            <span className="type-chrome w-[6.5rem] shrink-0 text-ink">{NAME[part.id]}</span>
            <span className="relative h-2.5 flex-1 bg-paper-deep" aria-hidden>
              <span className="absolute inset-y-0 left-0" style={{ width: `${width}%`, background: COLOR[part.id] }} />
            </span>
            <span
              className={cn(
                "shrink-0 text-right text-ink",
                part.status === "scored" ? "type-card w-10 tabular-nums" : "type-kicker w-24",
              )}
            >
              {value}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function InsightCard({
  card,
  onDismiss,
}: {
  card: ReadingModel["insight"];
  onDismiss: (id: string) => void;
}) {
  if (!card) return null;
  return (
    <section className="border-b border-ink bg-yellow px-4 py-5 text-ink">
      <p className="type-kicker">{card.kicker}</p>
      <h2 className="type-lede mt-2">{card.title}</h2>
      <p className="type-pitch mt-3 max-w-prose">{card.body}</p>
      <button
        type="button"
        onClick={() => onDismiss(card.id)}
        className="type-chrome mt-4 text-ink/70 underline decoration-ink/30 underline-offset-4"
      >
        Don’t show this kind again
      </button>
    </section>
  );
}

function ReadingNow({
  last,
  desk,
}: {
  last: { id: string; title: string; author: string; breathIndex: number } | null;
  desk: DeskWork[];
}) {
  const primary =
    last ??
    (desk[0]
      ? { id: desk[0].id, title: desk[0].title, author: desk[0].author, breathIndex: desk[0].breathIndex }
      : null);
  const more = desk.filter((work) => work.id !== primary?.id);
  const [open, setOpen] = useState(false);
  if (!primary) {
    return (
      <section className="border-b border-ink bg-paper px-4 py-5">
        <p className="type-kicker text-muted">Reading now</p>
        <p className="type-lede mt-2">Nothing open on the desk.</p>
        <Link to="/rituals" className="type-chrome mt-3 inline-flex text-ink underline underline-offset-4">
          Open a ritual
        </Link>
      </section>
    );
  }
  return (
    <section className="border-b border-ink bg-forest text-paper">
      <div className="flex items-stretch">
        <Link
          to="/read/$workId"
          params={{ workId: primary.id }}
          search={{ at: primary.breathIndex }}
          className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5"
        >
          <span className="type-kicker opacity-80">Reading now</span>
          <span className="type-lede mt-1">{primary.title}</span>
          {primary.author ? <span className="type-pitch mt-2 opacity-80">{primary.author}</span> : null}
        </Link>
        <Link
          to="/read/$workId"
          params={{ workId: primary.id }}
          search={{ at: primary.breathIndex }}
          className="type-chrome flex items-center border-l border-paper/30 px-4"
        >
          Continue
        </Link>
      </div>
      {more.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="type-chrome flex min-h-12 w-full items-center border-t border-paper/30 px-4 text-left"
          aria-expanded={open}
        >
          {more.length === 1 ? "1 more on your desk" : `${more.length} more on your desk`}
        </button>
      ) : null}
      {open
        ? more.map((work) => (
            <Link
              key={work.id}
              to="/read/$workId"
              params={{ workId: work.id }}
              search={{ at: work.breathIndex }}
              className="block border-t border-paper/30 px-4 py-3"
            >
              <span className="type-kicker opacity-75">{work.author}</span>
              <span className="type-card mt-1 block">{work.title}</span>
            </Link>
          ))
        : null}
    </section>
  );
}


function Trends({
  reading,
  model,
  span,
  onSpan,
  onOpen,
  end,
}: {
  reading: ReadingStats;
  model: ReadingModel;
  span: TrendSpan;
  onSpan: (span: TrendSpan) => void;
  onOpen: (id: ContributorId) => void;
  end?: ReactNode;
}) {
  return (
    <>
      <div className="grid grid-cols-3 border-b border-ink" role="tablist" aria-label="Trends">
        {(["week", "month", "year"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={span === id}
            onClick={() => onSpan(id)}
            className={cn(
              "type-kicker min-h-12 capitalize",
              span === id ? "bg-blue text-paper" : "bg-paper text-ink",
            )}
          >
            {id}
          </button>
        ))}
      </div>
      {span === "week" ? <WeekTrend model={model} /> : null}
      {span === "month" ? <MonthTrend model={model} /> : null}
      {span === "year" ? <YearTrend model={model} /> : null}
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Contributor trends · 4 weeks</p>
      <ContributorBars parts={model.week.contributors} onOpen={onOpen} />
      <YouActivity items={reading.activity} />
      <LaneStrip lanes={reading.lanes} />
      {end}
    </>
  );
}

function WeekTrend({ model }: { model: ReadingModel }) {
  const days = model.week.days;
  const band = model.week.usualBand;
  return (
    <section>
      <div className="border-b border-ink px-4 py-4">
        <p className="type-title tabular-nums">{model.week.score ?? "—"}</p>
        <p className="type-pitch mt-2 text-ink/70">{model.week.detail}</p>
      </div>
      <div className="grid grid-cols-7 gap-px bg-ink" role="group" aria-label="This week">
        {days.map((day) => (
          <WeekBar key={day.key} day={day} band={band} />
        ))}
      </div>
    </section>
  );
}

function WeekBar({ day, band }: { day: TrendDay; band: { low: number; high: number } | null }) {
  const height = day.score != null ? Math.max(12, Math.round((day.score / 100) * 88)) : 8;
  const label = day.kind === "reading" ? String(day.score) : day.kind === "quick-visit" ? "visit" : day.kind === "paused" ? "pause" : "rest";
  return (
    <div className={cn("flex min-h-36 flex-col justify-end px-1 py-2", day.kind === "reading" ? "bg-paper text-ink" : "bg-paper-deep text-ink/70")}>
      <span className="relative mx-auto mb-2 w-3 flex-1">
        {band && day.kind === "reading" ? (
          <span
            className="absolute inset-x-[-4px] bg-yellow/70"
            style={{
              bottom: `${band.low}%`,
              height: `${Math.max(4, band.high - band.low)}%`,
            }}
            aria-hidden
          />
        ) : null}
        {day.score != null ? (
          <span className="absolute inset-x-0 bottom-0 bg-forest" style={{ height }} aria-hidden />
        ) : null}
      </span>
      <span className="type-kicker text-center">{day.label}</span>
      <span className="type-kicker mt-1 text-center tabular-nums">{label}</span>
      {day.minutes > 0 && day.kind !== "reading" ? (
        <span className="sr-only">{formatActiveMinutes(day.minutes)} active</span>
      ) : null}
    </div>
  );
}

function MonthTrend({ model }: { model: ReadingModel }) {
  return (
    <section className="border-b border-ink bg-paper px-4 py-5">
      <p className="type-kicker text-muted">This month</p>
      <p className="type-title mt-2 tabular-nums">{model.month.score ?? "—"}</p>
      <p className="type-pitch mt-3 max-w-prose">{model.month.line}</p>
      {model.month.versusPrior != null ? (
        <p className="type-chrome mt-3 text-ink/70">{versusCopy(model.month.versusPrior)} over the previous months</p>
      ) : null}
    </section>
  );
}

function YearTrend({ model }: { model: ReadingModel }) {
  const year = model.year;
  const peak = Math.max(1, ...year.months.map((month) => month.score ?? 0));
  return (
    <section className="border-b border-ink px-4 py-5">
      <p className="type-kicker text-muted">Year so far</p>
      <p className="type-lede mt-2">
        {year.books} {year.books === 1 ? "book" : "books"} · {year.hours} h · {year.lines}{" "}
        {year.lines === 1 ? "line" : "lines"} · {year.countries} {year.countries === 1 ? "country" : "countries"}
      </p>
      {year.forms > 0 ? (
        <p className="type-pitch mt-1 text-ink/65">
          {year.forms} {year.forms === 1 ? "form" : "forms"}
        </p>
      ) : null}
      <div className="mt-5 flex items-end gap-1" aria-label="Monthly scores">
        {year.months.map((month) => (
          <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center">
            <span
              className="w-full bg-blue"
              style={{ height: month.score != null ? Math.max(4, Math.round((month.score / peak) * 72)) : 2, opacity: month.score != null ? 1 : 0.25 }}
            />
            <span className="type-kicker mt-1 text-ink/60">{month.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}


function ContributorSheet({
  id,
  part,
  model,
  scoreHide,
  paused,
  onBack,
  onHide,
  onPause,
  onCalculated,
}: {
  id: ContributorId;
  part: ContributorResult | null;
  model: ReadingModel;
  scoreHide: boolean;
  paused: boolean;
  onBack: () => void;
  onHide: (hide: boolean) => void;
  onPause: (paused: boolean) => void;
  onCalculated: () => void;
}) {
  const copy = ABOUT[id];
  const value = part?.status === "scored" && part.value != null ? String(part.value) : part?.status === "learning" ? "Still learning" : "—";
  return (
    <section className="bg-paper text-ink">
      <button type="button" onClick={onBack} className="type-kicker flex min-h-12 items-center px-4">
        ← Today
      </button>
      <div className="border-y border-ink px-4 py-5" style={{ background: COLOR[id], color: id === "rhythm" ? "var(--color-ink)" : "var(--color-paper)" }}>
        <p className="type-kicker opacity-80">{NAME[id]}</p>
        <p className="type-title mt-2 tabular-nums">{scoreHide && part?.status === "scored" ? NAME[id] : value}</p>
        <p className="type-chrome mt-3 opacity-80">
          Weight {CONTRIBUTOR_WEIGHTS[id]}%
          {model.daily.usualMinutes != null && id === "immersion"
            ? ` · your usual ${Math.round(model.daily.usualMinutes)} min`
            : ""}
        </p>
      </div>
      <div className="px-4 py-5">
        <p className="type-lede">{copy.about}</p>
        <p className="type-pitch mt-3 text-ink/75">{part?.note}</p>
        <dl className="mt-5 grid grid-cols-1 gap-px bg-ink sm:grid-cols-2">
          {factsFor(id, model).map((fact) => (
            <div key={fact.label} className="bg-paper px-3 py-3">
              <dt className="type-kicker text-muted">{fact.label}</dt>
              <dd className="type-lede mt-1">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 type-kicker text-muted">Why it matters · {copy.evidence}</p>
        <p className="type-pitch mt-2">{copy.why}</p>
        <p className="mt-5 type-kicker text-muted">Try</p>
        <p className="type-pitch mt-2">{copy.try}</p>
        <button type="button" onClick={onCalculated} className="type-chrome mt-5 underline underline-offset-4">
          How this is calculated
        </button>
      </div>
      <ScoreSwitches scoreHide={scoreHide} paused={paused} onHide={onHide} onPause={onPause} />
    </section>
  );
}

function factsFor(id: ContributorId, model: ReadingModel): { label: string; value: string }[] {
  const daily = model.daily;
  if (id === "immersion") {
    return [
      { label: "Focused minutes", value: daily.minutes > 0 ? `${formatActiveMinutes(daily.minutes)}` : "—" },
      {
        label: "Counted",
        value: daily.skimmed ? `${formatActiveMinutes(daily.plausibleMinutes)} after pace` : daily.minutes > 0 ? formatActiveMinutes(daily.plausibleMinutes) : "—",
      },
      {
        label: "Your usual",
        value: daily.usualMinutes != null ? `${Math.round(daily.usualMinutes)} min` : "Still learning",
      },
      { label: "Longest unbroken run", value: "Still learning" },
      { label: "Times you left the app", value: "Still learning" },
      {
        label: "Breaths at a skim pace",
        value: !daily.paceKnown ? "Still learning" : daily.skimmed ? "Faster than twice your usual" : "Not on today’s average",
      },
    ];
  }
  if (id === "rhythm") {
    return [
      { label: "Reading days", value: model.week.detail },
      { label: "Usual week", value: model.week.usualDays ?? "Still learning" },
      { label: "Streaks", value: "Not used" },
    ];
  }
  if (id === "return") {
    return [
      { label: "Book continuity", value: daily.contributors.find((part) => part.id === "return")?.status === "scored" ? "In the score" : "Still learning" },
      { label: "Kept-line revisits", value: "Still learning" },
    ];
  }
  if (id === "range") {
    return [
      { label: "Routes", value: "Variety or one long book" },
      { label: "Month cap", value: "Removed" },
    ];
  }
  if (id === "restfulness") {
    return [
      { label: "When it counts", value: "Evenings you read" },
      { label: "Bedtime", value: "Still learning" },
      { label: "Daylight colors", value: "Comfort only, not a sleep score" },
    ];
  }
  return [
    { label: "Who it includes", value: "People you already read with" },
    { label: "Club messages", value: "Still learning" },
    { label: "Comparisons", value: "Never" },
  ];
}

function HowCalculated({ onBack }: { onBack: () => void }) {
  return (
    <section>
      <button type="button" onClick={onBack} className="type-kicker flex min-h-12 items-center px-4">
        ← Settings
      </button>
      <div className="border-y border-ink px-4 py-5">
        <h2 className="type-title">How this is calculated</h2>
        <p className="type-pitch mt-3 text-ink/75">
          The score stays on this device. It explains the reading. It doesn’t rank anyone, and it doesn’t send a notification.
        </p>
      </div>
      {CONTRIBUTOR_IDS.map((id) => (
        <article key={id} className="border-b border-ink px-4 py-4">
          <p className="type-kicker" style={{ color: COLOR[id] }}>
            {NAME[id]} · {CONTRIBUTOR_WEIGHTS[id]}% · {ABOUT[id].evidence}
          </p>
          <p className="type-pitch mt-2">{ABOUT[id].how}</p>
        </article>
      ))}
    </section>
  );
}

function SettingsView({
  settings,
  scoreHide,
  paused,
  onHide,
  onPause,
  onCalculated,
}: {
  settings: ReactNode;
  scoreHide: boolean;
  paused: boolean;
  onHide: (hide: boolean) => void;
  onPause: (paused: boolean) => void;
  onCalculated: () => void;
}) {
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Settings</p>
      <ScoreSwitches scoreHide={scoreHide} paused={paused} onHide={onHide} onPause={onPause} />
      <button
        type="button"
        onClick={onCalculated}
        className="type-lede flex min-h-14 w-full items-center border-b border-ink px-4 text-left"
      >
        How this is calculated
      </button>
      {settings}
    </section>
  );
}

function ScoreSwitches({
  scoreHide,
  paused,
  onHide,
  onPause,
}: {
  scoreHide: boolean;
  paused: boolean;
  onHide: (hide: boolean) => void;
  onPause: (paused: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-px border-b border-ink bg-ink">
      <button
        type="button"
        onClick={() => onHide(!scoreHide)}
        className={cn("min-h-16 px-3 py-3 text-left", scoreHide ? "bg-yellow text-ink" : "bg-paper text-ink")}
        aria-pressed={scoreHide}
      >
        <span className="type-kicker">{scoreHide ? "Score hidden" : "Hide score"}</span>
        <span className="type-pitch mt-1 block">
          {scoreHide ? "Contributors stay" : "Keep the bars, hide the number"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onPause(!paused)}
        className={cn("min-h-16 px-3 py-3 text-left", paused ? "bg-ink text-paper" : "bg-paper text-ink")}
        aria-pressed={paused}
      >
        <span className="type-kicker">{paused ? "Paused" : "Pause scoring"}</span>
        <span className="type-pitch mt-1 block">
          {paused ? "Resume when you’re ready" : "Travel, illness, or a rest"}
        </span>
      </button>
    </div>
  );
}

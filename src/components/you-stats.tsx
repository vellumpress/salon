import { Link } from "@tanstack/react-router";
import { fillClass, fillInk, type Fill } from "@/lib/mondrian";
import {
  formatActivityWhen,
  formatMinutes,
  streakLine,
  type ActivityItem,
  type DayMinutes,
  type DeskWork,
  type LaneCount,
  type ReadingStats,
  type RingStat,
} from "@/lib/reading-stats";
import { cn } from "@/lib/utils";

const RING_FILLS: Record<string, Fill> = {
  today: "yellow",
  week: "red",
  breaths: "blue",
  keeps: "forest",
  lanes: "ink",
};

const WEEK_FILLS: Fill[] = ["yellow", "red", "blue", "forest", "ink", "paper", "yellow"];

function ringOffset(value: number, max: number, circumference: number) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return circumference * (1 - pct);
}

export function ReadinessHero({
  reading,
  handle,
  name,
}: {
  reading: ReadingStats;
  handle: string;
  name: string;
}) {
  const size = 168;
  const cx = size / 2;
  const rings = [
    { r: 74, width: 8, stat: reading.rings[1], stroke: "var(--color-yellow)" },
    { r: 60, width: 8, stat: reading.rings[0], stroke: "var(--color-paper)" },
    { r: 46, width: 7, stat: reading.rings[3], stroke: "var(--color-red)" },
  ];

  return (
    <section className="flex flex-col bg-ink text-paper">
      <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-end sm:gap-8 sm:px-8 sm:py-8">
        <div
          className="you-readiness relative mx-auto shrink-0 sm:mx-0"
          aria-label={`Reading score ${reading.readiness.score}, ${reading.readiness.label}`}
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden>
            {rings.map((ring) => {
              const c = 2 * Math.PI * ring.r;
              return (
                <g key={ring.stat?.id ?? ring.r}>
                  <circle
                    cx={cx}
                    cy={cx}
                    r={ring.r}
                    fill="none"
                    stroke="var(--color-paper)"
                    strokeOpacity="0.18"
                    strokeWidth={ring.width}
                  />
                  <circle
                    cx={cx}
                    cy={cx}
                    r={ring.r}
                    fill="none"
                    stroke={ring.stroke}
                    strokeWidth={ring.width}
                    strokeDasharray={c}
                    strokeDashoffset={ringOffset(ring.stat?.value ?? 0, ring.stat?.max ?? 1, c)}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${cx} ${cx})`}
                  />
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="type-kicker text-paper/70">Today</span>
            <span className="type-title text-paper">{reading.readiness.score}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <p className="type-kicker text-paper/70">
            {handle || "This sitting"}
          </p>
          <p className="mt-2 type-title">{reading.readiness.label}</p>
          <p className="type-pitch mt-2.5 max-w-xl text-paper/75">
            {reading.readiness.line}
          </p>
          {reading.hasSignal ? (
            <p className="mt-3 font-sans text-xs tracking-chrome text-paper/55">
              Week {formatMinutes(reading.minutesWeek)}
              {reading.minutesAreEstimated ? " est." : ""}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function YouRings({ rings }: { rings: RingStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-5">
      {rings.map((ring) => {
        const fill = RING_FILLS[ring.id] ?? "paper";
        const size = 72;
        const r = 28;
        const c = 2 * Math.PI * r;
        const wide = ring.id === "lanes";
        return (
          <div
            key={ring.id}
            className={cn(
              "flex min-h-32 flex-col justify-between p-4 sm:min-h-36",
              wide && "col-span-2 flex-row items-end gap-4 sm:col-span-1 sm:flex-col sm:items-stretch sm:gap-0",
              fillClass(fill),
              fillInk(fill),
            )}
          >
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="h-12 w-12"
              aria-label={`${ring.label} ${ring.display} ${ring.unit}`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.22"
                strokeWidth="6"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={c}
                strokeDashoffset={ringOffset(ring.value, ring.max, c)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </svg>
            <div>
              <p className="type-kicker opacity-75">{ring.label}</p>
              <p className="mt-1 type-lede">{ring.display}</p>
              <p className="mt-1 font-sans text-xs opacity-70">{ring.unit}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WeekMinutes({
  days,
  estimated,
}: {
  days: DayMinutes[];
  estimated: boolean;
}) {
  const peak = Math.max(1, ...days.map((day) => day.minutes));
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
        This week{estimated ? " · estimated" : ""}
      </p>
      <div className="grid grid-cols-7 gap-px bg-ink">
        {days.map((day, i) => {
          const fill = WEEK_FILLS[i % WEEK_FILLS.length] ?? "paper";
          const tall = Math.max(day.minutes > 0 ? 18 : 6, Math.round((day.minutes / peak) * 88));
          return (
            <div
              key={day.key}
              className={cn(
                "flex min-h-32 flex-col px-1.5 pb-3 pt-3 sm:min-h-36 sm:px-2",
                fillClass(fill),
                fillInk(fill),
              )}
            >
              <div className="flex min-h-16 flex-1 flex-col">
                <div className="you-week-bar mt-auto shrink-0" style={{ height: tall }} aria-hidden />
              </div>
              <p className="mt-2 type-kicker opacity-75">{day.label}</p>
              <p className="mt-1 font-sans text-xs tabular-nums">
                {day.minutes > 0 ? formatMinutes(day.minutes) : "—"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function InsightStrip({
  reading,
}: {
  reading: ReadingStats;
}) {
  const hour = reading.hourPattern[0];
  const more = reading.hourPattern
    .slice(1, 3)
    .map((row) => row.label)
    .join(" · ");
  return (
    <div className="grid grid-cols-1 gap-px bg-ink sm:grid-cols-3">
      <div className="flex min-h-28 flex-col justify-end bg-paper p-4 text-ink sm:min-h-32 sm:p-5">
        <span className="type-kicker text-muted">Streak</span>
        <span className="mt-1 type-lede">{reading.streak || "—"}</span>
        <span className="mt-1 font-sans text-xs text-ink/65">{streakLine(reading.streak)}</span>
      </div>
      <div className="flex min-h-28 flex-col justify-end bg-blue p-4 text-paper sm:min-h-32 sm:p-5">
        <span className="type-kicker opacity-80">When</span>
        <span className="mt-1 type-lede">{hour?.label ?? "Not yet"}</span>
        <span className="mt-1 font-sans text-xs opacity-75">
          {hour
            ? more || "From the hours and lanes you sit"
            : "Before sleep, waking, unwind — after a sit"}
        </span>
      </div>
      <div className="flex min-h-28 flex-col justify-end bg-forest p-4 text-paper sm:min-h-32 sm:p-5">
        <span className="type-kicker opacity-80">Pace</span>
        <span className="mt-1 type-lede">{reading.pace.label}</span>
        <span className="mt-1 font-sans text-xs opacity-75">{reading.pace.detail}</span>
      </div>
    </div>
  );
}

function CountCell({
  fill,
  label,
  value,
  hint,
  to,
}: {
  fill: Fill;
  label: string;
  value: number;
  hint: string;
  to?: string;
}) {
  const inner = (
    <>
      <span className="type-kicker opacity-80">{label}</span>
      <span className="mt-1 type-title">{value}</span>
      <span className="mt-1 font-sans text-xs opacity-70">{hint}</span>
    </>
  );
  const className = cn(
    "flex min-h-28 flex-col justify-end p-4 sm:min-h-32 sm:p-5",
    fillClass(fill),
    fillInk(fill),
  );
  if (to === "/profile/collection") {
    return (
      <Link to="/profile/collection" className={className}>
        {inner}
      </Link>
    );
  }
  if (to === "/friends") {
    return (
      <Link to="/friends" preload="intent" className={className}>
        {inner}
      </Link>
    );
  }
  if (to === "/together") {
    return (
      <Link to="/together" className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function YouBreakdown({ reading }: { reading: ReadingStats }) {
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Shelf</p>
      <div className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-3">
        <CountCell
          fill="yellow"
          label="On the desk"
          value={reading.inProgress}
          hint={reading.desk[0]?.title ?? "Works in progress"}
        />
        <CountCell
          fill="red"
          label="Finished"
          value={reading.completed}
          hint={reading.completed === 1 ? "work" : "works"}
        />
        <CountCell
          fill="blue"
          label="Favorites"
          value={reading.favorites}
          hint="Hearts"
          to="/profile/collection"
        />
        <CountCell
          fill="forest"
          label="Keeps"
          value={reading.kept}
          hint="Lines held"
          to="/profile/collection"
        />
        <CountCell
          fill="ink"
          label="Together"
          value={reading.togetherKeeps}
          hint="Shared keeps"
          to="/friends"
        />
        <CountCell
          fill="paper"
          label="Hosted sits"
          value={reading.hostedSits}
          hint="Rooms you kept"
          to="/together"
        />
      </div>
    </section>
  );
}

export function DeskStrip({ works }: { works: DeskWork[] }) {
  if (works.length === 0) return null;
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">On the desk</p>
      {works.map((work) => (
        <Link
          key={work.id}
          to="/read/$workId"
          params={{ workId: work.id }}
          search={{ at: work.breathIndex }}
          className="flex items-stretch border-b border-ink"
        >
          <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
            <span className="type-kicker text-muted">{work.author}</span>
            <span className="mt-1 type-lede">{work.title}</span>
          </span>
          <span className="flex items-center px-4 font-sans text-sm text-ink/70">Sit</span>
        </Link>
      ))}
    </section>
  );
}

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  sit: "Sit",
  together: "Together",
  hosted: "Hosted",
  finished: "Finished",
};

export function YouActivity({
  items,
  now,
}: {
  items: ActivityItem[];
  now?: number;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Recent</p>
      {items.map((item, i) => {
        const body = (
          <>
            <span className="flex min-w-0 flex-1 flex-col justify-end px-4 py-5">
              <span className="type-kicker text-muted">
                {KIND_LABEL[item.kind]} · {formatActivityWhen(item.at, now)}
              </span>
              <span className="mt-1 type-lede">{item.title}</span>
              <span className="mt-1 font-serif text-sm text-ink/70">{item.detail}</span>
            </span>
          </>
        );
        if (item.workId) {
          return (
            <Link
              key={`${item.kind}-${item.at}-${item.workId}-${i}`}
              to="/read/$workId"
              params={{ workId: item.workId }}
              className="flex items-stretch border-b border-ink"
            >
              {body}
            </Link>
          );
        }
        return (
          <div key={`${item.kind}-${item.at}-${i}`} className="flex items-stretch border-b border-ink">
            {body}
          </div>
        );
      })}
    </section>
  );
}

export function LaneStrip({ lanes }: { lanes: LaneCount[] }) {
  if (lanes.length === 0) return null;
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Rituals used</p>
      <div className="flex flex-wrap gap-px bg-ink">
        {lanes.map((lane, i) => {
          const fill = WEEK_FILLS[i % WEEK_FILLS.length] ?? "paper";
          return (
            <Link
              key={lane.id}
              to="/rituals"
              className={cn(
                "flex min-h-16 min-w-28 flex-1 flex-col justify-end px-4 py-3",
                fillClass(fill),
                fillInk(fill),
              )}
            >
              <span className="type-kicker opacity-75">{lane.count === 1 ? "1 work" : `${lane.count} works`}</span>
              <span className="mt-1 type-card">{lane.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function YouEmptyInvite({
  label,
  line,
  workId,
}: {
  label: string;
  line: string;
  workId?: string;
}) {
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Begin</p>
      <div className="grid grid-cols-1 gap-px bg-ink sm:grid-cols-2">
        <div className="flex min-h-28 flex-col justify-end bg-yellow p-4 text-ink sm:min-h-32 sm:p-5">
          <span className="type-kicker opacity-80">{label}</span>
          <span className="mt-1 type-lede">{line}</span>
        </div>
        {workId ? (
          <Link
            to="/read/$workId"
            params={{ workId }}
            className="flex min-h-28 flex-col justify-end bg-red p-4 text-paper sm:min-h-32 sm:p-5"
          >
            <span className="type-kicker opacity-80">First sit</span>
            <span className="mt-1 type-lede">Open a page</span>
            <span className="mt-2 font-sans text-sm opacity-80">Sit</span>
          </Link>
        ) : (
          <Link
            to="/rituals"
            className="flex min-h-28 flex-col justify-end bg-red p-4 text-paper sm:min-h-32 sm:p-5"
          >
            <span className="type-kicker opacity-80">Rituals</span>
            <span className="mt-1 type-lede">Open a timed sit</span>
          </Link>
        )}
      </div>
    </section>
  );
}

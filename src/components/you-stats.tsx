import { Link } from "@tanstack/react-router";
import { fillClass, fillInk, fillVar, type Fill } from "@/lib/mondrian";
import {
  formatActivityWhen,
  formatActiveMinutes,
  formatGapShort,
  streakLine,
  type ActivityItem,
  type DayMinutes,
  type DeskWork,
  type LaneCount,
  type ReadingStats,
  type RingStat,
} from "@/lib/reading-stats";
import { useYouHeroPalette } from "@/lib/use-you-hero-palette";
import { radarCaption, radarLayout } from "@/lib/you-radar";
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

function radarFillOpacity(fill: Fill) {
  if (fill === "yellow") return 0.38;
  if (fill === "ink") return 0.14;
  return 0.26;
}

export function ReadinessHero({
  reading,
  handle,
}: {
  reading: ReadingStats;
  handle: string;
  /** Kept for callers; preview names stay off the hero. */
  name?: string;
}) {
  const palette = useYouHeroPalette();
  const accent = fillVar(palette.ring);
  const layout = radarLayout(reading.radar);
  const caption = radarCaption(reading.radar);
  const peak = Math.max(0, ...reading.radar.map((axis) => axis.score));
  const daily = reading.dailyScore;
  const scoreDisplay = Number.isFinite(daily.total) ? String(daily.total) : "—";

  return (
    <section className="flex flex-col border-b border-ink bg-paper text-ink">
      <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-end sm:gap-8 sm:px-8 sm:py-8">
        <figure className="you-readiness relative mx-auto shrink-0 sm:mx-0">
          <svg
            viewBox={`0 0 ${layout.size} ${layout.size}`}
            className="h-full w-full"
            role="img"
            aria-label={`Daily reading score ${scoreDisplay}, ${daily.label}. Week ${reading.weeklyScore.total}. Month ${reading.monthlyScore.total}. ${caption}`}
          >
            <rect width={layout.size} height={layout.size} fill="var(--color-paper)" />
            {layout.grids.map((d, i) => (
              <path
                key={`grid-${i}`}
                d={d}
                fill="none"
                stroke="var(--color-ink)"
                strokeOpacity={i === layout.grids.length - 1 ? 0.26 : 0.12}
                strokeWidth="0.9"
              />
            ))}
            {layout.spokes.map((spoke) => (
              <line
                key={`${spoke.x2}-${spoke.y2}`}
                x1={spoke.x1}
                y1={spoke.y1}
                x2={spoke.x2}
                y2={spoke.y2}
                stroke="var(--color-ink)"
                strokeOpacity="0.14"
                strokeWidth="0.8"
              />
            ))}
            {peak > 0 ? (
              <path
                d={layout.polygon}
                fill={accent}
                fillOpacity={radarFillOpacity(palette.ring)}
                stroke={accent}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            ) : null}
            {layout.labels.map((row) => (
              <text
                key={row.id}
                x={row.x}
                y={row.y}
                textAnchor={row.anchor}
                className="you-radar-label"
              >
                <tspan x={row.x} dy="-0.45em">
                  {row.label}
                </tspan>
                <tspan x={row.x} dy="1.4em" className="you-radar-value">
                  {row.display}
                </tspan>
              </text>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="you-radar-score type-title text-ink">{scoreDisplay}</span>
          </div>
        </figure>
        <div className="min-w-0 flex-1 pb-1">
          <p className="type-kicker text-muted">
            {handle || "This sitting"}
          </p>
          <p className="mt-2 type-title">{daily.label}</p>
          <p className="type-pitch mt-2.5 max-w-xl text-ink/75">
            {daily.line}
          </p>
          <p className="mt-4 font-sans text-xs tracking-chrome text-ink/55">
            <span className="text-ink/70">Week {reading.weeklyScore.total}</span>
            <span className="mx-2 text-ink/30" aria-hidden>
              ·
            </span>
            <span className="text-ink/70">Month {reading.monthlyScore.total}</span>
          </p>
          {reading.hasSignal ? (
            <p className="mt-2 font-sans text-xs tracking-chrome text-ink/45">
              Today {formatActiveMinutes(reading.minutesToday)} active
              {reading.minutesAreEstimated ? " est." : ""}
              <span className="mx-2 text-ink/25" aria-hidden>
                ·
              </span>
              Week {formatActiveMinutes(reading.minutesWeek)} active
            </p>
          ) : null}
          <ul className="you-radar-legend mt-4 grid max-w-72 grid-cols-3 gap-x-3 gap-y-1 text-ink/50">
            {reading.radar.map((axis) => (
              <li key={axis.id}>
                <span className="text-ink/40">{axis.label}</span>{" "}
                <span className="text-ink/70">{axis.display}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function YouRings({ rings }: { rings: RingStat[] }) {
  return (
    <section aria-label="Reading">
      <div className="rail" role="list" aria-label="Reading">
      {rings.map((ring) => {
        const fill = RING_FILLS[ring.id] ?? "paper";
        const size = 72;
        const r = 28;
        const c = 2 * Math.PI * r;
        return (
          <div
            key={ring.id}
            role="listitem"
            className={cn("you-tile is-spread", fillClass(fill), fillInk(fill))}
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
    </section>
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
        This week · active{estimated ? " · estimated" : ""}
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
                {day.minutes > 0 ? formatActiveMinutes(day.minutes) : "—"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ActiveReading({ reading }: { reading: ReadingStats }) {
  const last =
    reading.lastActiveReadAt > 0 ? formatActivityWhen(reading.lastActiveReadAt) : "—";
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Active reading</p>
      <div className="rail" role="list" aria-label="Active reading">
        <CountCell
          fill="yellow"
          label="Breaths today"
          value={reading.advancesToday}
          hint={reading.breaths === 1 ? "1 all-time" : `${reading.breaths} all-time`}
        />
        <CountCell
          fill="red"
          label="Works"
          value={reading.opened}
          hint={reading.completed > 0 ? `${reading.completed} finished` : "touched"}
        />
        <StringCell
          fill="blue"
          label="Pace"
          value={formatGapShort(reading.pace.avgGapSec)}
          hint="between breaths"
        />
        <StringCell fill="forest" label="Last read" value={last} hint="forward tap" />
      </div>
    </section>
  );
}

function StringCell({
  fill,
  label,
  value,
  hint,
}: {
  fill: Fill;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      role="listitem"
      className={cn("you-tile", fillClass(fill), fillInk(fill))}
    >
      <span className="type-kicker opacity-80">{label}</span>
      <span className="mt-1 type-lede">{value}</span>
      <span className="mt-1 font-sans text-xs opacity-70">{hint}</span>
    </div>
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
    <div className="rail" role="list" aria-label="Rhythm">
      <div role="listitem" className="you-tile bg-paper text-ink">
        <span className="type-kicker text-muted">Streak</span>
        <span className="mt-1 type-lede">{reading.streak || "—"}</span>
        <span className="mt-1 font-sans text-xs text-ink/65">{streakLine(reading.streak)}</span>
      </div>
      <div role="listitem" className="you-tile bg-blue text-paper">
        <span className="type-kicker opacity-80">When</span>
        <span className="mt-1 type-lede">{hour?.label ?? "Not yet"}</span>
        <span className="mt-1 font-sans text-xs opacity-75">
          {hour
            ? more || "From the hours and lanes you sit"
            : "Before sleep, waking, unwind — after a sit"}
        </span>
      </div>
      <div role="listitem" className="you-tile bg-forest text-paper">
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
  const className = cn("you-tile", fillClass(fill), fillInk(fill));
  if (to === "/profile/collection") {
    return (
      <Link to="/profile/collection" role="listitem" className={className}>
        {inner}
      </Link>
    );
  }
  if (to === "/friends") {
    return (
      <Link to="/friends" preload="intent" role="listitem" className={className}>
        {inner}
      </Link>
    );
  }
  if (to === "/together") {
    return (
      <Link to="/together" role="listitem" className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <div role="listitem" className={className}>
      {inner}
    </div>
  );
}

export function YouBreakdown({ reading }: { reading: ReadingStats }) {
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Shelf</p>
      <div className="rail" role="list" aria-label="Shelf">
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
      <div className="rail" role="list" aria-label="On the desk">
        {works.map((work, i) => {
          const fill = WEEK_FILLS[i % WEEK_FILLS.length] ?? "paper";
          return (
            <Link
              key={work.id}
              to="/read/$workId"
              params={{ workId: work.id }}
              search={{ at: work.breathIndex }}
              role="listitem"
              className={cn("you-tile is-wide", fillClass(fill), fillInk(fill))}
            >
              <span className="type-kicker opacity-80">{work.author}</span>
              <span className="mt-1 type-lede">{work.title}</span>
              <span className="mt-2 font-sans text-xs opacity-75">Sit</span>
            </Link>
          );
        })}
      </div>
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
      <div className="rail" role="list" aria-label="Recent">
      {items.map((item, i) => {
        const fill = WEEK_FILLS[i % WEEK_FILLS.length] ?? "paper";
        const body = (
          <>
            <span className="type-kicker opacity-80">
              {KIND_LABEL[item.kind]} · {formatActivityWhen(item.at, now)}
            </span>
            <span className="mt-1 type-lede">{item.title}</span>
            <span className="mt-1 font-serif text-sm opacity-75">{item.detail}</span>
          </>
        );
        const className = cn("you-tile is-wide", fillClass(fill), fillInk(fill));
        if (item.workId) {
          return (
            <Link
              key={`${item.kind}-${item.at}-${item.workId}-${i}`}
              to="/read/$workId"
              params={{ workId: item.workId }}
              role="listitem"
              className={className}
            >
              {body}
            </Link>
          );
        }
        return (
          <div key={`${item.kind}-${item.at}-${i}`} role="listitem" className={className}>
            {body}
          </div>
        );
      })}
      </div>
    </section>
  );
}

export function LaneStrip({ lanes }: { lanes: LaneCount[] }) {
  if (lanes.length === 0) return null;
  return (
    <section>
      <p className="border-b border-ink px-4 py-3 type-kicker text-muted">Rituals used</p>
      <div className="rail" role="list" aria-label="Rituals used">
        {lanes.map((lane, i) => {
          const fill = WEEK_FILLS[i % WEEK_FILLS.length] ?? "paper";
          return (
            <Link
              key={lane.id}
              to="/rituals"
              role="listitem"
              className={cn("you-tile is-lane", fillClass(fill), fillInk(fill))}
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
      <div className="rail" role="list" aria-label="Begin">
        <div role="listitem" className="you-tile is-half bg-yellow text-ink">
          <span className="type-kicker opacity-80">{label}</span>
          <span className="mt-1 type-lede">{line}</span>
        </div>
        {workId ? (
          <Link
            to="/read/$workId"
            params={{ workId }}
            role="listitem"
            className="you-tile is-half bg-red text-paper"
          >
            <span className="type-kicker opacity-80">First sit</span>
            <span className="mt-1 type-lede">Open a page</span>
            <span className="mt-2 font-sans text-sm opacity-80">Sit</span>
          </Link>
        ) : (
          <Link to="/rituals" role="listitem" className="you-tile is-half bg-red text-paper">
            <span className="type-kicker opacity-80">Rituals</span>
            <span className="mt-1 type-lede">Open a timed sit</span>
          </Link>
        )}
      </div>
    </section>
  );
}

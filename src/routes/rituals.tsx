import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTbr, type WorkProgress } from "@/lib/store";
import { fillClass, fillInk, mosaicFills, type Fill } from "@/lib/mondrian";
import type { ShelfWork } from "@/lib/catalog/shelf";
import {
  RITUAL_LANES,
  defaultRitualLaneId,
  estimateRitualMinutes,
  ritualDurationLabel,
  ritualLaneStack,
  ritualPitchFor,
} from "@/lib/catalog/rituals";
import {
  SERIALIZE_LANE_ID,
  SERIALIZE_PLANS,
  isSerializeBound,
  serializeDurationLabel,
  serializeEpisodeMinutesLabel,
  serializeSitSearch,
  serializeTonight,
  type SerializePlan,
} from "@/lib/catalog/serialize";
import { nearestSitPreset } from "@/lib/sitting";
import { FavoriteMark } from "@/components/favorite-mark";
import { PlaceChip, RegionSilhouette } from "@/components/place-chip";
import { placeForId } from "@/lib/catalog/places";
import { ResumeLink } from "@/components/resume-link";
import {
  ShelfSearchBar,
  ShelfSearchHits,
  useShelfSearch,
} from "@/components/shelf-search";
import { prefetchWork } from "@/lib/works";
import { cn } from "@/lib/utils";
import { mixSeed, takeShuffled } from "@/lib/recommend";
import { useVisitSeed } from "@/lib/use-visit-seed";


export const Route = createFileRoute("/rituals")({
  component: RitualsPage,
});

function RitualsPage() {
  const progress = useTbr((s) => s.progress);
  const visit = useVisitSeed();
  const [hydrated, setHydrated] = useState(false);
  const { query, setQuery, searching, matches, poolSize } = useShelfSearch("local");
  useEffect(() => setHydrated(true), []);

  return (
    <main
      className={cn(
        "board board-alive board-rituals",
        searching && "is-searching",
      )}
    >
      <div className="cell-mark flex bg-paper">
        <Link
          to="/"
          className="type-chrome inline-flex h-full shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <span className="type-mark flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 text-ink">
          Rituals
        </span>
        <ResumeLink />
        <Link
          to="/together"
          preload="intent"
          className="type-chrome flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 text-ink"
        >
          Together
        </Link>
      </div>

      {searching ? (
        <ShelfSearchHits matches={matches} query={query} />
      ) : (
        <>
          <div className="cell-wide flex min-h-0 flex-col justify-end bg-yellow p-5 text-ink">
            <span className="type-kicker opacity-70">
              For the hour
            </span>
            <span className="type-lede mt-1">
              Reading shaped for before sleep, waking, a walk, unwind.
            </span>
            <span className="type-pitch mt-2 max-w-xl opacity-80">
              Pick a lane. One work at a time — contemporary New York hours, older
              pages.
            </span>
          </div>

          <RitualsSection progress={progress} hydrated={hydrated} visit={visit} />
        </>
      )}

      <ShelfSearchBar
        id="rituals-shelf-search"
        query={query}
        setQuery={setQuery}
        count={searching ? matches.length : poolSize}
      />
    </main>
  );
}

function RitualsSection({
  progress,
  hydrated,
  visit,
}: {
  progress: Record<string, WorkProgress>;
  hydrated: boolean;
  visit: number;
}) {
  const serializeNight = useTbr((s) => s.serializeNight);
  const series = useMemo(
    () => takeShuffled(SERIALIZE_PLANS, mixSeed(visit, "ritual-serialize")),
    [visit],
  );
  const lanes = useMemo(
    () =>
      RITUAL_LANES.map((lane) => ({
        ...lane,
        items: ritualLaneStack(lane, visit),
      })).filter((lane) => lane.id === SERIALIZE_LANE_ID || lane.items.length > 0),
    [visit],
  );
  const [laneId, setLaneId] = useState(() => defaultRitualLaneId());
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [comingId, setComingId] = useState<string | null>(null);
  const active =
    lanes.find((lane) => lane.id === laneId) ??
    lanes.find((lane) => lane.id === defaultRitualLaneId(lanes)) ??
    lanes[0];
  const serializeOpen = active?.id === SERIALIZE_LANE_ID;
  const openPlan = serializeOpen
    ? (series.find((plan) => plan.id === openPlanId) ?? SERIALIZE_PLANS.find((plan) => plan.id === openPlanId))
    : undefined;
  const stackCount = serializeOpen
    ? (openPlan ? openPlan.episodes.length : series.length)
    : (active?.items.length ?? 0);
  const fills = useMemo(
    () =>
      mosaicFills(
        stackCount,
        `rituals-${active?.id ?? "x"}-${openPlan?.id ?? "list"}-${visit || "pending"}`,
      ),
    [active?.id, openPlan?.id, stackCount, visit],
  );

  useEffect(() => {
    if (!active) return;
    if (active.id === SERIALIZE_LANE_ID) {
      const bound = (openPlan ? [openPlan] : series)
        .filter(isSerializeBound)
        .map((plan) => plan.shelfWorkId)
        .filter((id): id is string => Boolean(id));
      for (const id of bound.slice(0, 4)) prefetchWork(id);
      return;
    }
    for (const item of active.items.slice(0, 4)) prefetchWork(item.id);
  }, [active, openPlan, series]);

  useEffect(() => {
    setOpenPlanId(null);
    setComingId(null);
  }, [laneId]);

  if (!active) return null;

  return (
    <>
      <div className="cell-ritual-lanes" role="tablist" aria-label="Ritual lanes">
        <span className="more-kicker">For</span>
        <div className="more-links">
          {lanes.map((lane) => {
            const selected = lane.id === active.id;
            return (
              <button
                key={lane.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn("ritual-chip", selected && "is-active")}
                onClick={() => setLaneId(lane.id)}
              >
                {lane.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="cell-rail cell-ritual-stack" aria-label={`${active.label} ritual works`}>
        <div className="ritual-stack" key={`${active.id}-${openPlan?.id ?? "lane"}`}>
          {serializeOpen && openPlan ? (
            <SerializeEpisodeStack
              plan={openPlan}
              fills={fills}
              lastCompleted={hydrated ? serializeNight?.[openPlan.id] ?? 0 : 0}
              coming={comingId === openPlan.id}
              onBack={() => {
                setOpenPlanId(null);
                setComingId(null);
              }}
              onComing={() => setComingId(openPlan.id)}
            />
          ) : serializeOpen ? (
            series.map((plan, i) => (
              <SerializeSeriesCell
                key={plan.id}
                plan={plan}
                fill={fills[i]}
                tonight={
                  hydrated
                    ? serializeTonight(plan, serializeNight?.[plan.id] ?? 0)
                    : 1
                }
                onOpen={() => {
                  setComingId(null);
                  setOpenPlanId(plan.id);
                  if (plan.shelfWorkId && isSerializeBound(plan)) {
                    prefetchWork(plan.shelfWorkId);
                  }
                }}
              />
            ))
          ) : (
            active.items.map((item, i) => (
              <BookCell
                key={`ritual-${active.id}-${item.id}`}
                item={item}
                fill={fills[i]}
                pitch={ritualPitchFor(item.id)}
                duration={ritualDurationLabel(item)}
                ratio={hydrated ? progressRatio(progress[item.id], item.breaths) : 0}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function SerializeSeriesCell({
  plan,
  fill: fillProp,
  tonight,
  onOpen,
}: {
  plan: SerializePlan;
  fill?: Fill;
  tonight: number;
  onOpen: () => void;
}) {
  const fill = fillProp ?? "paper";
  const bound = isSerializeBound(plan);
  const ratio = plan.nights > 0 ? Math.min(0.92, Math.max(0, (tonight - 1) / plan.nights)) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex min-h-0 flex-col justify-end overflow-hidden p-4 text-left sm:p-5",
        "ritual-card",
        fillClass(fill),
        fillInk(fill),
      )}
    >
      <span className="type-kicker opacity-70">
        {serializeDurationLabel(plan)}
        {bound ? "" : " · text coming"}
      </span>
      <span className="mt-1 type-kicker opacity-70">
        {plan.author}
        <span className="opacity-60"> · {plan.year}</span>
      </span>
      {plan.shelfWorkId ? (
        <PlaceChip workId={plan.shelfWorkId} className="mt-1.5 opacity-80" />
      ) : null}
      <span className="type-card mt-1">
        {plan.title}
      </span>
      <span className="type-pitch mt-1.5 line-clamp-5 opacity-75">
        {plan.framing}
      </span>
      <span className="mt-2 type-kicker opacity-70">
        Tonight: Episode {tonight}
      </span>
      {ratio > 0 ? (
        <span
          className={cn(
            "absolute bottom-0 left-0 h-1",
            fill === "yellow" || fill === "paper" ? "bg-ink" : "bg-paper",
          )}
          style={{ width: `${Math.max(10, ratio * 100)}%`, opacity: 0.5 }}
        />
      ) : null}
      {plan.shelfWorkId && bound ? (
        <FavoriteMark
          workId={plan.shelfWorkId}
          compact
          className={cn(
            "absolute right-1 top-1 z-10 border border-ink/20",
            fill === "yellow" || fill === "paper"
              ? "bg-paper/90 text-ink"
              : "bg-ink/25 text-paper",
          )}
        />
      ) : null}
    </button>
  );
}

function SerializeEpisodeStack({
  plan,
  fills,
  lastCompleted,
  coming,
  onBack,
  onComing,
}: {
  plan: SerializePlan;
  fills: Fill[];
  lastCompleted: number;
  coming: boolean;
  onBack: () => void;
  onComing: () => void;
}) {
  const bound = isSerializeBound(plan);
  const workId = plan.shelfWorkId;
  const tonight = serializeTonight(plan, lastCompleted);
  const place = workId ? placeForId(workId) : null;
  return (
    <>
      <div className="flex min-h-0 flex-col justify-end bg-paper p-4 text-ink sm:p-5">
        <button
          type="button"
          onClick={onBack}
          className="self-start type-kicker text-ink/70"
        >
          Serialize
        </button>
        <span className="mt-3 type-kicker opacity-70">
          {serializeDurationLabel(plan)}
          {bound ? "" : " · text coming"}
        </span>
        <span className="mt-1 type-lede">
          {plan.title}
        </span>
        <span className="mt-1 type-kicker opacity-70">
          {plan.author}
          <span className="opacity-60"> · {plan.year}</span>
        </span>
        <span className="type-pitch mt-2 opacity-80">
          {plan.framing}
        </span>
        <span className="mt-2 flex min-w-0 items-center gap-2">
          {place ? (
            <RegionSilhouette region={place.region} className="place-chip-ink" />
          ) : null}
          <span className="type-kicker opacity-70">{plan.geography}</span>
        </span>
      </div>
      {coming ? (
        <div className="bg-yellow p-4 text-ink sm:p-5">
          <p className="type-kicker opacity-70">Not on the shelf yet</p>
          <p className="mt-2 type-lede">
            This text is still coming
          </p>
          <p className="type-pitch mt-2 opacity-80">
            The nights are mapped. The bound file is not live — Read tonight stays closed
            until the shelf has it.
          </p>
        </div>
      ) : null}
      {plan.episodes.map((episode, i) => {
        const fill = fills[i] ?? "paper";
        const isTonight = episode.n === tonight;
        const body = (
          <>
            <span className="type-kicker opacity-70">
              Night {episode.n} of {plan.nights}
              {isTonight ? " · tonight" : ""}
              <span className="opacity-60"> · {serializeEpisodeMinutesLabel(episode.minutes)}</span>
            </span>
            <span className="type-card mt-1">
              {episode.title}
            </span>
            <span className="mt-1 type-kicker opacity-70">
              {episode.source}
            </span>
            {bound ? (
              <span className="mt-2 type-kicker opacity-80">Read tonight</span>
            ) : (
              <span className="mt-2 type-kicker opacity-70">Text coming</span>
            )}
          </>
        );
        const className = cn(
          "relative flex min-h-0 flex-col justify-end overflow-hidden p-4 text-left sm:p-5",
          "ritual-card",
          fillClass(fill),
          fillInk(fill),
        );
        if (bound && workId) {
          return (
            <Link
              key={episode.n}
              to="/read/$workId"
              params={{ workId }}
              search={serializeSitSearch(plan, episode.n)}
              onPointerDown={() => prefetchWork(workId)}
              onFocus={() => prefetchWork(workId)}
              className={className}
            >
              {body}
            </Link>
          );
        }
        return (
          <button key={episode.n} type="button" onClick={onComing} className={className}>
            {body}
          </button>
        );
      })}
    </>
  );
}


function progressRatio(p: WorkProgress | undefined, breaths?: number) {
  if (!p) return 0;
  if (p.completedAt) return 1;
  return Math.min(0.92, p.breathIndex / Math.max(12, breaths ?? 200));
}

function BookCell({
  item,
  ratio,
  fill: fillProp,
  pitch,
  duration,
}: {
  item: ShelfWork;
  ratio: number;
  fill?: Fill;
  pitch?: string;
  duration: string;
}) {
  const fill = fillProp ?? "paper";
  return (
    <Link
      to="/read/$workId"
      params={{ workId: item.id }}
      search={{ sit: nearestSitPreset(estimateRitualMinutes(item)) }}
      onPointerDown={() => prefetchWork(item.id)}
      onFocus={() => prefetchWork(item.id)}
      className={cn(
        "relative flex min-h-0 flex-col justify-end overflow-hidden p-4 sm:p-5",
        "ritual-card",
        fillClass(fill),
        fillInk(fill),
      )}
    >
      <span className="type-kicker opacity-70">{duration}</span>
      <span className="mt-1 type-kicker opacity-70">
        {item.author}
        <span className="opacity-60"> · {item.year}</span>
      </span>
      <PlaceChip work={item} className="mt-1.5 opacity-80" />
      <span className="type-card mt-1">
        {item.title}
      </span>
      {pitch ? (
        <span className="type-pitch mt-1.5 line-clamp-5 opacity-75">
          {pitch}
        </span>
      ) : null}
      {ratio > 0 ? (
        <span
          className={cn(
            "absolute bottom-0 left-0 h-1",
            fill === "yellow" || fill === "paper" ? "bg-ink" : "bg-paper",
          )}
          style={{ width: `${Math.max(10, ratio * 100)}%`, opacity: 0.5 }}
        />
      ) : null}
      <FavoriteMark
        workId={item.id}
        compact
        className={cn(
          "absolute right-1 top-1 z-10 border border-ink/20",
          fill === "yellow" || fill === "paper"
            ? "bg-paper/90 text-ink"
            : "bg-ink/25 text-paper",
        )}
      />
    </Link>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Work } from "../catalog/works";
import {
  chapterStartIndex,
  type Breath,
} from "../lib/breaths";
import { cn } from "../lib/hash";
import {
  SIT_PRESETS,
  asSittingMinutes,
  formatSitClock,
  sitLabel,
} from "../lib/sitting";
import {
  clearSitting,
  completeWork,
  setBreath,
  setSittingMinutes,
  startSitting,
  toggleKept,
} from "../lib/storage";
import { useWorkProgress } from "../lib/use-shelf";
import { FavoriteButton } from "./FavoriteButton";
import { Hourglass } from "./Hourglass";

type Overlay = "none" | "threshold" | "spine" | "end";

const LOOKBACK = 12;

export function ChamberReader({
  work,
  breaths,
  initialSit,
  skipVeil = false,
}: {
  work: Work;
  breaths: Breath[];
  initialSit: number;
  skipVeil?: boolean;
}) {
  const progress = useWorkProgress(work.id);
  const [overlay, setOverlay] = useState<Overlay>(() =>
    skipVeil ? "none" : "threshold",
  );
  const [sit, setSit] = useState(() => asSittingMinutes(initialSit));
  const [still, setStill] = useState(true);
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const [lookbackPx, setLookbackPx] = useState(0);
  const [sandCue, setSandCue] = useState(false);
  const [navReveal, setNavReveal] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lockUntil = useRef(0);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const booted = useRef(false);
  const breathSlotRef = useRef<HTMLDivElement>(null);
  const lookbackSlotRef = useRef<HTMLDivElement>(null);

  const lastBreath = Math.max(0, breaths.length - 1);
  const index = Math.min(lastBreath, Math.max(0, progress.breathIndex));
  const breath = breaths[index];
  const lookback = useMemo(() => {
    const start = Math.max(0, index - LOOKBACK);
    return breaths.slice(start, index);
  }, [breaths, index]);
  const kept = progress.kept;
  const isKept = breath ? kept.includes(breath.id) : false;
  const chapters = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; title: string }[] = [];
    for (const item of breaths) {
      if (seen.has(item.chapterId)) continue;
      seen.add(item.chapterId);
      list.push({ id: item.chapterId, title: item.chapterTitle });
    }
    return list;
  }, [breaths]);

  useLayoutEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (skipVeil) {
      startSitting(work.id, sit, true);
    }
  }, [sit, skipVeil, work.id]);

  useEffect(() => {
    document.documentElement.classList.add("sitting");
    return () => document.documentElement.classList.remove("sitting");
  }, []);

  function goTo(next: number) {
    if (next < 0 || next >= breaths.length) return;
    const target = breaths[next];
    const words = target ? target.text.split(/\s+/).length : 8;
    const wait = Math.min(140, 36 + words * 5);
    lockUntil.current = Date.now() + wait;
    setBreath(work.id, next, {
      paragraphIndex: target?.paragraphIndex,
      total: breaths.length,
    });
    setStill(true);
  }

  function advance() {
    if (overlayRef.current !== "none") return;
    if (Date.now() < lockUntil.current) return;
    if (!breath) return;
    if (index >= breaths.length - 1) {
      completeWork(work.id);
      setOverlay("end");
      return;
    }
    goTo(index + 1);
  }

  function retreat() {
    if (overlayRef.current !== "none") return;
    goTo(index - 1);
  }

  function begin() {
    setSandCue(false);
    setNavReveal(false);
    setSittingMinutes(sit);
    startSitting(work.id, sit, true);
    setOverlay("none");
  }

  function chooseSit(minutes: number, restart = false) {
    const next = asSittingMinutes(minutes);
    setSit(next);
    setSittingMinutes(next);
    setSandCue(false);
    if (restart && overlay === "none") {
      startSitting(work.id, next, true);
    }
  }

  function jumpKept(breathId: string) {
    const next = breaths.findIndex((item) => item.id === breathId);
    if (next < 0) return;
    setOverlay("none");
    goTo(next);
  }

  function closeSit() {
    clearSitting(work.id);
  }

  function toggleNavReveal() {
    setStill(false);
    setNavReveal((open) => !open);
  }

  const advanceRef = useRef(advance);
  const retreatRef = useRef(retreat);
  const beginRef = useRef(begin);
  const breathRef = useRef(breath);
  advanceRef.current = advance;
  retreatRef.current = retreat;
  beginRef.current = begin;
  breathRef.current = breath;

  useEffect(() => {
    if (overlay !== "none") {
      setStill(false);
      setNavReveal(false);
    }
  }, [overlay]);

  useEffect(() => {
    if (overlay !== "none" || still || navReveal) return undefined;
    let t = window.setTimeout(() => setStill(true), 3200);
    const poke = (event: PointerEvent) => {
      const node = event.target as HTMLElement | null;
      if (!node?.closest(".chrome-fade, .reader-glass, .nav-reveal")) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => setStill(true), 3200);
    };
    window.addEventListener("pointerdown", poke);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", poke);
    };
  }, [still, overlay, navReveal]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const now = overlayRef.current;
      if (now === "threshold") {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          beginRef.current();
        }
        return;
      }
      if (event.key === "ArrowRight" || event.key === " " || event.key === "Enter") {
        event.preventDefault();
        advanceRef.current();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        retreatRef.current();
      } else if (event.key === "k" || event.key === "K") {
        const current = breathRef.current;
        if (current && now === "none") toggleKept(work.id, current.id);
      } else if (event.key === "Escape") {
        if (navReveal) {
          setNavReveal(false);
          return;
        }
        if (sandCue) {
          setSandCue(false);
          return;
        }
        if (now === "spine") setOverlay("none");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navReveal, sandCue, work.id]);

  useEffect(() => {
    if (overlay !== "none") return undefined;
    if (!progress.sittingMinutes || !progress.sittingStartedAt) return undefined;
    const endsAt = progress.sittingStartedAt + progress.sittingMinutes * 60 * 1000;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      setSandCue(true);
      return undefined;
    }
    const t = window.setTimeout(() => setSandCue(true), remaining);
    return () => window.clearTimeout(t);
  }, [overlay, progress.sittingMinutes, progress.sittingStartedAt]);

  useEffect(() => {
    if (overlay !== "none") return undefined;
    if (!progress.sittingMinutes || !progress.sittingStartedAt || sandCue) {
      return undefined;
    }
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [overlay, progress.sittingMinutes, progress.sittingStartedAt, sandCue]);

  useLayoutEffect(() => {
    const slot = breathSlotRef.current;
    if (!slot) {
      setOverflows(false);
      setAtEnd(true);
      return undefined;
    }
    slot.scrollTop = 0;
    let live = true;
    const measure = () => {
      if (!live) return;
      const next = slot.scrollHeight - slot.clientHeight > 1;
      setOverflows((prev) => (prev === next ? prev : next));
      const end = slot.scrollHeight - slot.scrollTop - slot.clientHeight <= 2;
      setAtEnd((prev) => (prev === end ? prev : end));
      const look = lookbackSlotRef.current;
      if (look) {
        const height = Math.round(look.getBoundingClientRect().height);
        setLookbackPx((prev) => (prev === height ? prev : height));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    const inner = slot.querySelector(".breath-now");
    if (inner) ro.observe(inner);
    const pane = slot.parentElement;
    if (pane) ro.observe(pane);
    const look = lookbackSlotRef.current;
    if (look) ro.observe(look);
    slot.addEventListener("scroll", measure, { passive: true });
    void document.fonts?.ready.then(measure);
    return () => {
      live = false;
      ro.disconnect();
      slot.removeEventListener("scroll", measure);
    };
  }, [index, breath?.text, overlay]);

  const durationMs =
    progress.sittingMinutes && progress.sittingMinutes > 0
      ? progress.sittingMinutes * 60 * 1000
      : 0;
  const endsAt =
    durationMs && progress.sittingStartedAt
      ? progress.sittingStartedAt + durationMs
      : 0;
  const leftMs =
    durationMs && endsAt ? (sandCue ? 0 : Math.max(0, endsAt - tick)) : 0;
  const sandRemaining = durationMs > 0 ? (sandCue ? 0 : leftMs / durationMs) : 1;
  const sandRunning =
    Boolean(progress.sittingMinutes) &&
    Boolean(progress.sittingStartedAt) &&
    overlay === "none" &&
    !sandCue &&
    leftMs > 0;

  if (!breath) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="relative z-20 flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Back
          </Link>
        </header>
        <div className="veil-body">
          <h1 className="veil-title">{work.title}</h1>
          <p className="veil-note">This text has no lines to sit with.</p>
        </div>
      </div>
    );
  }

  const place = breath.chapterTitle;

  return (
    <div
      className={cn(
        "frame-screen bg-paper text-ink",
        still && overlay === "none" && "still",
      )}
    >
      <h1 className="sr-only">{work.title}</h1>
      <header className="chrome-fade relative z-20 flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 font-sans text-sm text-paper"
          onClick={() => closeSit()}
        >
          Back
        </Link>
        <button
          type="button"
          onClick={() => setOverlay("spine")}
          className="flex min-w-0 flex-1 items-center truncate bg-paper px-4 font-sans text-xs tracking-wide text-ink"
        >
          {place}
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1"
        onTouchStart={(event) => {
          const touch = event.changedTouches[0];
          if (!touch) return;
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
          if (dx < 0) advance();
          else retreat();
        }}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Previous breath"
          className={cn(
            "absolute left-0 z-10 w-1/2 cursor-w-resize",
            overflows ? "top-0" : "inset-y-0",
          )}
          style={overflows ? { height: lookbackPx } : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={retreat}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Next breath"
          className={cn(
            "absolute right-0 z-10 w-1/2 cursor-e-resize",
            overflows ? "top-0" : "inset-y-0",
          )}
          style={overflows ? { height: lookbackPx } : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={advance}
        />

        <div className="reading-pane z-0">
          <div ref={lookbackSlotRef} className="lookback-slot" aria-hidden>
            {lookback.map((item, i) => {
              const last = lookback.length - 1;
              const opacity = last <= 0 ? 0.38 : 0.1 + (i / last) * 0.4;
              return (
                <p key={item.id} className="look-line text-ink" style={{ opacity }}>
                  {item.text}
                </p>
              );
            })}
          </div>
          <div
            ref={breathSlotRef}
            className={cn("breath-slot", overflows && "overflows", atEnd && "at-end")}
          >
            <p
              className={cn(
                "breath-now relative z-[1] font-serif",
                isKept && "border-l-2 border-red pl-4",
              )}
            >
              {breath.text}
            </p>
          </div>
        </div>
      </div>

      <footer className="relative z-20 flex shrink-0 items-stretch border-t border-ink">
        <div className="chrome-fade flex min-w-0 flex-1 items-stretch">
          <button
            type="button"
            onClick={() => toggleKept(work.id, breath.id)}
            className={cn(
              "inline-flex h-12 shrink-0 items-center justify-center border-r border-ink px-4 font-sans text-sm",
              isKept ? "bg-red text-paper" : "bg-paper text-ink",
            )}
          >
            Keep
          </button>
          <FavoriteButton workId={work.id} className="border-r border-ink" />
          {kept.length > 0 ? (
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto bg-paper px-2">
              {kept.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-label="Return to a kept breath"
                  onClick={() => jumpKept(id)}
                  className={cn(
                    "size-2.5 shrink-0",
                    id === breath.id ? "bg-ink" : "bg-red",
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="min-w-0 flex-1 bg-paper" />
          )}
        </div>
        <button
          type="button"
          aria-expanded={navReveal}
          aria-label={
            sandCue
              ? "Sand has run — open sitting length"
              : progress.sittingMinutes && progress.sittingMinutes > 0
                ? `Sitting timer ${formatSitClock(leftMs)} remaining — open sitting length`
                : "Open sitting length"
          }
          title={
            sandCue
              ? "Sand has run"
              : progress.sittingMinutes && progress.sittingMinutes > 0
                ? formatSitClock(leftMs)
                : "Sitting"
          }
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            toggleNavReveal();
          }}
          className={cn(
            "reader-glass inline-flex h-12 w-14 shrink-0 items-center justify-center bg-paper text-ink",
            sandCue && !navReveal && "reader-glass-done",
          )}
        >
          <Hourglass
            size="sm"
            remaining={progress.sittingMinutes ? sandRemaining : 1}
            running={sandRunning}
          />
        </button>
      </footer>

      {overlay === "threshold" ? (
        <div className="veil bg-paper text-ink">
          <div className="flex items-center justify-between border-b border-ink/15">
            <Link
              to="/"
              className="flex h-12 items-center px-4 font-sans text-sm text-ink"
            >
              Back
            </Link>
            <span className="min-w-0 truncate px-2 font-sans text-xs tracking-wide text-muted">
              {work.author} · {work.year}
            </span>
            <FavoriteButton
              workId={work.id}
              compact
              className="mr-2 border border-ink/20"
            />
          </div>
          <div className="veil-body">
            <h1 className="veil-title">{work.title}</h1>
            {work.intro ? <p className="veil-note">{work.intro}</p> : null}
            <p className="mt-8 font-sans text-xs tracking-wide text-muted">
              How long will you sit
            </p>
            <div className="sit-presets mt-3" role="group" aria-label="Sitting length">
              {SIT_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => chooseSit(preset.minutes)}
                  className={cn(
                    "sit-preset",
                    sit === preset.minutes && "sit-preset-on",
                  )}
                >
                  {preset.short}
                </button>
              ))}
            </div>
            <p className="mt-2 font-sans text-xs text-muted">{sitLabel(sit)}</p>
          </div>
          <button type="button" onClick={begin} className="veil-action-full">
            {progress.breathIndex > 0 || progress.paragraphIndex > 0
              ? "Continue"
              : "Begin"}
          </button>
        </div>
      ) : null}

      {overlay === "spine" ? (
        <div className="veil bg-paper text-ink">
          <button
            type="button"
            onClick={() => setOverlay("none")}
            className="flex h-12 shrink-0 items-center justify-between border-b border-ink px-4"
          >
            <span className="truncate font-display text-lg">{work.title}</span>
            <span className="font-sans text-sm">Close</span>
          </button>
          <div className="veil-rooms">
            {chapters.map((chapter) => {
              const start = chapterStartIndex(breaths, chapter.id);
              const current = chapter.id === breath.chapterId;
              const reached = start <= index;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  disabled={!reached}
                  onClick={() => {
                    if (!reached) return;
                    setOverlay("none");
                    goTo(start);
                  }}
                  className={cn("veil-room", !reached && "opacity-40")}
                >
                  <span className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                    {chapter.title}
                  </span>
                  {current ? (
                    <span className="mt-1 font-sans text-xs tracking-wide text-muted">
                      Here
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {overlay === "end" ? (
        <div className="veil bg-paper text-ink">
          <div className="veil-body">
            <h2 className="veil-title">{work.title}</h2>
            <p className="veil-note">The last line. Stay, or go home.</p>
          </div>
          <div className="veil-actions">
            <button
              type="button"
              className="veil-action bg-paper text-ink"
              onClick={() => setOverlay("none")}
            >
              Stay
            </button>
            <Link
              to="/"
              onClick={() => closeSit()}
              className="veil-action bg-ink text-paper"
            >
              Home
            </Link>
          </div>
        </div>
      ) : null}

      {navReveal && overlay === "none" ? (
        <div className="nav-reveal" role="dialog" aria-label="Sitting length">
          <div className="sit-presets nav-reveal-sits" role="group" aria-label="Sitting length">
            {SIT_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => {
                  chooseSit(preset.minutes, true);
                }}
                className={cn(
                  "sit-preset",
                  sit === preset.minutes && "sit-preset-on",
                )}
              >
                {preset.short}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setNavReveal(false)}
            className="flex h-10 w-full items-center justify-center border-t border-ink font-sans text-xs tracking-wide text-muted"
          >
            Close
          </button>
        </div>
      ) : null}

      {sandCue && overlay === "none" ? (
        <div className="sand-cue" role="status">
          <p className="font-serif text-sm text-ink/80">
            The sand has run. Stay as long as you like.
          </p>
          <div className="flex shrink-0 items-stretch gap-px bg-ink">
            <button
              type="button"
              className="bg-paper px-3 py-2 font-sans text-xs tracking-wide text-ink"
              onClick={() => {
                setSandCue(false);
                closeSit();
              }}
            >
              Continue
            </button>
            <button
              type="button"
              className="bg-ink px-3 py-2 font-sans text-xs tracking-wide text-paper"
              onClick={() => {
                setSandCue(false);
                startSitting(
                  work.id,
                  asSittingMinutes(progress.sittingMinutes || sit || 20),
                  true,
                );
              }}
            >
              Again
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

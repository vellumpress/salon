import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  chapterStartIndex,
  sceneOf,
  sceneStartIndex,
  workIsComplete,
  type Work,
} from "@/lib/works";
import { useVellum } from "@/lib/store";
import { fillClass, planeOf, type Fill } from "@/lib/mondrian";
import { readerIntro } from "@/lib/reader-intro";
import { splitEmphasis } from "@/lib/emphasized-text";
import { shouldShowPreface } from "@/lib/reader-threshold";
import { FavoriteMark } from "@/components/favorite-mark";
import { PlaceChip } from "@/components/place-chip";
import { Hourglass } from "@/components/hourglass";
import { TogetherShell } from "@/components/sitting-room";
import { estimateRitualMinutes } from "@/lib/catalog/rituals";
import { shelfWork } from "@/lib/catalog/shelf";
import {
  serializeEpisode,
  serializeNightChrome,
  serializePlanByWorkId,
} from "@/lib/catalog/serialize";
import {
  canNativeShare,
  makePair,
  shareOrCopy,
  sittingSharePath,
} from "@/lib/shuffle";
import { clipLine } from "@/lib/share-codec";
import { liveBackendEnabled, publicUrl, salonShareText, salonShareTitle } from "@/lib/site";
import { createSentenceShare } from "@/lib/sentence-share";
import { cardReadUrl } from "@/lib/salon-card";
import {
  SIT_PRESETS,
  asSittingMinutes,
  formatSitClock,
  nearestSitPreset,
  sitLabel,
} from "@/lib/sitting";
import { SalonCardShare } from "@/components/salon-card-share";
import {
  decodeEchoInvite,
  findEchoBreath,
  pairTogetherKeep,
} from "@/lib/together-keep";
import { decodeHostedSit } from "@/lib/hosted-sit";
import { formatHandle, normalizeHandle } from "@/lib/social";

type Overlay =
  | "none"
  | "threshold"
  | "reentry"
  | "spine"
  | "sitting-end"
  | "end"
  | "send";

const LOOKBACK = 12;

function EmphasizedText({ text }: { text: string }) {
  return splitEmphasis(text).map((part, i) =>
    part.type === "em" ? <em key={i}>{part.value}</em> : part.value,
  );
}

export function VellumReader({
  work,
  shuffle = false,
  sit,
  pair,
  at,
  episode: episodeN,
  echo: echoToken,
  hosted: hostedToken,
}: {
  work: Work;
  shuffle?: boolean;
  sit?: number;
  pair?: string;
  at?: number;
  episode?: number;
  echo?: string;
  hosted?: string;
}) {
  const navigate = useNavigate();
  const sittingMinutes = useVellum((s) => s.sittingMinutes);
  const setSittingMinutes = useVellum((s) => s.setSittingMinutes);
  const progress = useVellum((s) => s.progress[work.id]);
  const setBreath = useVellum((s) => s.setBreath);
  const startSitting = useVellum((s) => s.startSitting);
  const endSitting = useVellum((s) => s.endSitting);
  const completeSerializeNight = useVellum((s) => s.completeSerializeNight);
  const serializePlan = episodeN ? serializePlanByWorkId(work.id) : undefined;
  const serializeEp =
    serializePlan && episodeN ? serializeEpisode(serializePlan, episodeN) : undefined;
  const nightChrome =
    serializePlan && serializeEp ? serializeNightChrome(serializePlan, serializeEp.n) : "";

  const toggleKept = useVellum((s) => s.toggleKept);
  const rememberTogetherKeep = useVellum((s) => s.rememberTogetherKeep);
  const rememberHostedSit = useVellum((s) => s.rememberHostedSit);
  const keepWithSit = useVellum((s) => s.keepWithSit);
  const myHandle = useVellum((s) => s.handle) ?? "";
  const complete = useVellum((s) => s.complete);
  const ensure = useVellum((s) => s.ensure);
  const setReadingNow = useVellum((s) => s.setReadingNow);
  const echo = useMemo(
    () => (echoToken ? decodeEchoInvite(echoToken) : null),
    [echoToken],
  );
  const hostedSit = useMemo(
    () => (hostedToken ? decodeHostedSit(hostedToken) : null),
    [hostedToken],
  );
  const echoAt = echo ? findEchoBreath(work.breaths, echo) : null;
  const together = Boolean(pair);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [sendPhone, setSendPhone] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendResult, setSendResult] = useState<"shared" | "copied" | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [still, setStill] = useState(true);
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const [lookbackPx, setLookbackPx] = useState(0);
  const [sandCue, setSandCue] = useState(false);
  const [navReveal, setNavReveal] = useState(false);
  const [customSit, setCustomSit] = useState("");
  /** threshold: full = length+company; length = pair already set, sit missing; share = invite friend */
  const [gateMode, setGateMode] = useState<"full" | "length" | "share">("full");
  const [showPreface, setShowPreface] = useState(false);
  const [company, setCompany] = useState<"alone" | "together" | null>(null);
  const [invitePair, setInvitePair] = useState<string | null>(null);
  const [inviteHref, setInviteHref] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lockUntil = useRef(0);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const booted = useRef(false);
  const breathSlotRef = useRef<HTMLDivElement>(null);
  const lookbackSlotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    ensure(work.id);
    if (sit !== undefined) {
      useVellum.getState().setSittingMinutes(sit);
    }
    if (booted.current) {
      return;
    }
    booted.current = true;
    const prior = useVellum.getState().progress[work.id];
    const firstSit = shouldShowPreface(prior);
    setShowPreface(firstSit);
    if (shuffle) {
      useVellum.getState().startShuffle(work.id);
      setShowPreface(false);
      setOverlay("none");
      return;
    }
    const deepLink =
      typeof at === "number" &&
      Number.isFinite(at) &&
      at >= 0 &&
      at < work.breaths.length
        ? Math.floor(at)
        : echoAt != null
          ? echoAt
          : null;
    if (hostedSit) {
      rememberHostedSit(hostedSit);
    }
    if (deepLink !== null) {
      startSitting(work.id);
      setBreath(work.id, deepLink);
      setShowPreface(false);
      setOverlay("none");
      return;
    }
    const chapterAt = chapterStartIndex(work);
    const index = prior?.breathIndex ?? 0;
    if (!prior?.entered || index < chapterAt) {
      useVellum.getState().setBreath(work.id, chapterAt);
    }
    // Friend already joining with pair+sit — skip the gate.
    if (pair && sit !== undefined) {
      startSitting(work.id);
      setShowPreface(false);
      setOverlay("none");
      return;
    }
    if (sit === undefined) {
      const shelf = shelfWork(work.id);
      if (shelf) {
        useVellum
          .getState()
          .setSittingMinutes(nearestSitPreset(estimateRitualMinutes(shelf)));
      }
    }
    // pair without sit → length only; otherwise always ask length + company.
    setCompany(null);
    setInvitePair(null);
    setInviteHref("");
    setGateMode(pair ? "length" : "full");
    setOverlay("threshold");
  }, [at, echoAt, ensure, hostedSit, pair, rememberHostedSit, setBreath, shuffle, sit, startSitting, work]);

  useEffect(() => {
    document.documentElement.classList.add("sitting");
    return () => document.documentElement.classList.remove("sitting");
  }, []);

  useEffect(() => {
    setCanShare(canNativeShare());
  }, []);

  const lastBreath = Math.max(0, work.breaths.length - 1);
  const index = Math.min(lastBreath, Math.max(0, progress?.breathIndex ?? 0));
  const breath = work.breaths[index];
  const scene = breath ? sceneOf(work, breath.sceneId) : work.scenes[0];
  const lookback = useMemo(() => {
    const start = Math.max(0, index - LOOKBACK);
    return work.breaths.slice(start, index);
  }, [index, work.breaths]);
  const kept = progress?.kept ?? [];
  const isKept = breath ? kept.includes(breath.id) : false;
  const plane: Fill = planeOf(breath?.sceneId ?? work.id);
  const intro = showPreface ? readerIntro(work) : "";
  const palimpsest = progress?.keywords[breath?.sceneId ?? ""] ?? "";
  const showPalimpsest = Boolean(palimpsest && palimpsest !== "—" && index > 0);

  function haptic(ms = 8) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* ignore */
    }
  }

  function goTo(next: number) {
    if (next < 0 || next >= work.breaths.length) return;
    const target = work.breaths[next];
    const words = target ? target.text.split(/\s+/).length : 8;
    const wait = Math.min(140, 36 + words * 5);
    lockUntil.current = Date.now() + wait;
    setBreath(work.id, next);
    if (!together) setStill(true);
  }

  function advance() {
    if (overlayRef.current !== "none") return;
    if (Date.now() < lockUntil.current) return;
    if (!breath) return;
    if (index >= work.breaths.length - 1) {
      if (!workIsComplete(work.id)) return;
      complete(work.id);
      setOverlay("end");
      return;
    }
    goTo(index + 1);
  }

  function retreat() {
    if (overlayRef.current !== "none") return;
    goTo(index - 1);
  }

  function beginFromReentry() {
    setSandCue(false);
    startSitting(work.id, { restart: true });
    setOverlay("none");
    setBreath(work.id, index);
  }

  function crossThreshold() {
    setSandCue(false);
    startSitting(work.id, { restart: true });
    setOverlay("none");
  }

  function beginAlone() {
    setCompany("alone");
    crossThreshold();
  }

  function beginTogetherShare() {
    const minutes = asSittingMinutes(sittingMinutes);
    const code = makePair();
    const href = publicUrl(sittingSharePath(work.id, minutes, code, serializeEp?.n));
    setCompany("together");
    setInvitePair(code);
    setInviteHref(href);
    setInviteCopied(false);
    setGateMode("share");
  }

  function beginTogetherSit() {
    if (!invitePair) return;
    const minutes = asSittingMinutes(sittingMinutes);
    void navigate({
      to: "/read/$workId",
      params: { workId: work.id },
      search: { sit: minutes, pair: invitePair, episode: serializeEp?.n },
    });
  }

  async function sendInviteLink() {
    if (!inviteHref) return;
    const result = await shareOrCopy({
      title: salonShareTitle(work.title),
      text: salonShareText(`Sit together with ${work.title}.`),
      url: inviteHref,
    });
    if (result === "copied") {
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1400);
    }
  }

  async function sendKeptLine() {
    if (sendBusy || !breath) return;
    setSendBusy(true);
    setSendResult(null);
    const url = cardReadUrl({ workId: work.id, at: index });
    const result = await shareOrCopy({
      title: salonShareTitle(work.title),
      text: salonShareText(clipLine(breath.text, 160)),
      url,
    });
    if (liveBackendEnabled) {
      void createSentenceShare({
        data: {
          workId: work.id,
          breathIndex: index,
          sentenceText: breath.text,
          toPhone: sendPhone.trim() || undefined,
        },
      }).catch(() => undefined);
    }
    if (result === "shared" || result === "copied") {
      setSendResult(result);
    }
    setSendBusy(false);
  }

  function beginFromGate() {
    if (gateMode === "length") {
      crossThreshold();
      return;
    }
    if (gateMode === "share") {
      beginTogetherSit();
      return;
    }
    if (company === "alone") {
      beginAlone();
      return;
    }
    if (company === "together") {
      beginTogetherShare();
    }
  }

  function chooseSit(minutes: number, restart = false) {
    const next = asSittingMinutes(minutes);
    setSittingMinutes(next);
    setCustomSit("");
    setSandCue(false);
    if (restart && overlay === "none") {
      startSitting(work.id, { restart: true });
    }
  }

  function applyCustomSit(restart = false) {
    const raw = customSit.trim();
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    chooseSit(n, restart);
    setNavReveal(false);
  }

  function toggleNavReveal() {
    setStill(false);
    haptic(12);
    setNavReveal((open) => !open);
  }

  function closeNavReveal() {
    setNavReveal(false);
  }

  function jumpKept(breathId: string) {
    const next = work.breaths.findIndex((item) => item.id === breathId);
    if (next < 0) return;
    setOverlay("none");
    goTo(next);
  }

  function keepCurrent() {
    const current = work.breaths[Math.min(lastBreath, Math.max(0, progress?.breathIndex ?? 0))];
    if (!current) return;
    const already = (progress?.kept ?? []).includes(current.id);
    toggleKept(work.id, current.id);
    if (already) return;
    const you = normalizeHandle(myHandle);
    if (echo && you) {
      const pairRow = pairTogetherKeep({
        workId: work.id,
        theirs: {
          handle: echo.handle,
          name: echo.name,
          breathId: echo.breathId || work.breaths[echoAt ?? 0]?.id || current.id,
          line: echo.line,
          at: echoAt ?? 0,
        },
        yours: {
          handle: you,
          name: formatHandle(you),
          breathId: current.id,
          line: current.text,
          at: work.breaths.findIndex((row) => row.id === current.id),
        },
      });
      if (pairRow) rememberTogetherKeep(pairRow);
    }
    if (hostedSit && you) {
      rememberHostedSit(hostedSit);
      keepWithSit(hostedSit.id, {
        handle: you,
        name: formatHandle(you),
        breathId: current.id,
        line: current.text,
        at: work.breaths.findIndex((row) => row.id === current.id),
      });
    }
  }

  function closeSit() {
    endSitting(work.id);
    if (serializePlan && serializeEp) {
      completeSerializeNight(serializePlan.id, serializeEp.n);
    }
  }

  /** Restart the same timed sit without leaving the work. */
  function sitAgain() {
    startSitting(work.id, { restart: true });
    setTick(Date.now());
    setSandCue(false);
  }

  /** Dismiss the sand-run sheet and keep reading without a timer. */
  function sitContinue() {
    setSandCue(false);
    closeSit();
  }

  function leaveTogether() {
    closeSit();
    void navigate({ to: "/" });
  }

  const advanceRef = useRef(advance);
  const retreatRef = useRef(retreat);
  const crossRef = useRef(beginFromGate);
  const breathRef = useRef(breath);
  const keepRef = useRef(keepCurrent);
  advanceRef.current = advance;
  retreatRef.current = retreat;
  crossRef.current = beginFromGate;
  breathRef.current = breath;
  keepRef.current = keepCurrent;

  useEffect(() => {
    if (together || overlay !== "none") {
      setStill(false);
      setNavReveal(false);
      return;
    }
  }, [together, overlay]);

  useEffect(() => {
    if (together || overlay !== "none" || still || navReveal) return;
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
  }, [still, overlay, together, navReveal]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
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
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          crossRef.current();
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advanceRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        retreatRef.current();
      } else if (e.key === "k" || e.key === "K") {
        if (now === "none") keepRef.current();
      } else if (e.key === "Escape") {
        if (navReveal) {
          setNavReveal(false);
          return;
        }
        if (sandCue) {
          setSandCue(false);
          return;
        }
        if ((now === "spine" || now === "send") && !together) setOverlay("none");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [together, work.id, navReveal, sandCue]);

  useEffect(() => {
    if (overlay !== "none") return;
    if (sandCue) return;
    if (!sittingMinutes || !progress?.sittingStartedAt) return;
    const endsAt = progress.sittingStartedAt + sittingMinutes * 60 * 1000;
    const remaining = endsAt - Date.now();
    const finish = () => {
      endSitting(work.id);
      if (together) setOverlay("sitting-end");
      else setSandCue(true);
    };
    if (remaining <= 0) {
      finish();
      return;
    }
    const t = window.setTimeout(finish, remaining);
    return () => window.clearTimeout(t);
  }, [
    overlay,
    sittingMinutes,
    progress?.sittingStartedAt,
    together,
    sandCue,
    endSitting,
    work.id,
  ]);

  useEffect(() => {
    if (overlay !== "none") return;
    if (!sittingMinutes || !progress?.sittingStartedAt || sandCue) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [overlay, sittingMinutes, progress?.sittingStartedAt, sandCue]);

  useEffect(() => {
    if (!breath || !scene) return;
    setReadingNow({
      id: work.id,
      title: work.title,
      author: work.author,
      place: scene.place,
      sentence: breath.text.slice(0, 400),
    });
    return () => setReadingNow(null);
  }, [breath, scene, setReadingNow, work.author, work.id, work.title]);

  useLayoutEffect(() => {
    const slot = breathSlotRef.current;
    if (!slot) {
      setOverflows(false);
      setAtEnd(true);
      return;
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
  }, [index, breath?.text, together, overlay]);

  const durationMs = sittingMinutes > 0 ? sittingMinutes * 60 * 1000 : 0;
  const endsAt =
    durationMs && progress?.sittingStartedAt
      ? progress.sittingStartedAt + durationMs
      : 0;
  const leftMs =
    durationMs && endsAt
      ? sandCue
        ? 0
        : Math.max(0, endsAt - tick)
      : 0;
  const sandRemaining =
    durationMs > 0 ? (sandCue ? 0 : leftMs / durationMs) : 1;
  const sandRunning =
    Boolean(sittingMinutes) &&
    Boolean(progress?.sittingStartedAt) &&
    overlay === "none" &&
    !sandCue &&
    leftMs > 0;

  if (!breath || !scene) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="relative z-20 flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="type-chrome reader-mark-slot inline-flex h-12 shrink-0 items-center justify-center bg-ink text-paper"
          >
            Home
          </Link>
          <span className="min-w-0 flex-1" />
          <Link
            to="/profile"
            preload="intent"
            className="type-chrome reader-mark-slot inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper text-ink"
          >
            You
          </Link>
        </header>
        <div className="veil-body">
          <h1 className="veil-title">{work.title}</h1>
        </div>
      </div>
    );
  }

  const pane = (
    <div
      className="relative flex min-h-0 flex-1"
      onTouchStart={(e) => {
        const t = e.changedTouches[0];
        touchStart.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) advance();
        else retreat();
      }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Previous sentence"
        className={cn(
          "absolute left-0 z-10 w-1/3 cursor-w-resize",
          overflows ? "top-0" : "inset-y-0",
        )}
        style={overflows ? { height: lookbackPx } : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={retreat}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Next sentence"
        className={cn(
          "absolute right-0 z-10 w-2/3 cursor-e-resize",
          overflows ? "top-0" : "inset-y-0",
        )}
        style={overflows ? { height: lookbackPx } : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={advance}
      />

      <div className="reading-pane z-0">
        {showPalimpsest ? <p className="palimpsest font-display">{palimpsest}</p> : null}

        <div ref={lookbackSlotRef} className="lookback-slot" aria-hidden>
          {lookback.map((item, i) => {
            const last = lookback.length - 1;
            const opacity = last <= 0 ? 0.38 : 0.1 + (i / last) * 0.4;
            return (
              <p key={item.id} className="look-line text-ink" style={{ opacity }}>
                <EmphasizedText text={item.text} />
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
            <EmphasizedText text={breath.text} />
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "frame-screen bg-paper text-ink",
        together && "together-lock",
        still && overlay === "none" && "still",
      )}
    >
      <h1 className="sr-only">{work.title}</h1>
      {together && pair ? (
        <TogetherShell
          pair={pair}
          place={nightChrome || scene.place}
          breathIndex={index}
          onLeave={leaveTogether}
        >
          {pane}
        </TogetherShell>
      ) : (
        <>
          <header className="chrome-fade reader-mark relative z-20 flex shrink-0 items-stretch border-b border-ink">
            <Link
              to="/"
              className="type-chrome reader-mark-slot inline-flex h-12 shrink-0 items-center justify-center bg-ink text-paper"
              onClick={() => closeSit()}
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => setOverlay("spine")}
              className="flex min-w-0 flex-1 items-center truncate bg-paper px-2.5 type-kicker text-ink sm:px-4"
            >
              {nightChrome || scene.place}
            </button>
            <Link
              to="/rituals"
              className="type-chrome reader-mark-slot inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-yellow text-ink"
              onClick={() => closeSit()}
            >
              Rituals
            </Link>
            <Link
              to="/together"
              className="type-chrome reader-mark-slot inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-red text-paper"
              onClick={() => closeSit()}
            >
              Together
            </Link>
            <Link
              to="/profile"
              preload="intent"
              className="type-chrome reader-mark-slot inline-flex h-12 shrink-0 items-center justify-center border-l border-ink bg-paper text-ink"
              onClick={() => closeSit()}
            >
              You
            </Link>
            <span className={cn("w-2.5 shrink-0 sm:w-4", fillClass(plane))} />
          </header>
          {pane}
          {echo ? (
            <div className="relative z-20 border-t border-ink bg-yellow px-4 py-3 text-ink">
              <p className="type-kicker opacity-70">Together</p>
              <p className="mt-1 font-serif text-base leading-snug">
                {formatHandle(echo.handle)} kept a line on this page. Keep one of yours.
              </p>
              {echo.line ? (
                <p className="mt-1 font-serif text-sm italic text-ink/70">{echo.line}</p>
              ) : null}
            </div>
          ) : null}
          {navReveal && overlay === "none" ? (
            <div className="nav-reveal" role="dialog" aria-label="Reading navigation">
              <div className="nav-reveal-nav" role="group" aria-label="Page">
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={retreat}
                  className="nav-reveal-btn"
                >
                  Prev
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={advance}
                  className="nav-reveal-btn nav-reveal-btn-ink"
                >
                  Next
                </button>
              </div>
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
                      sittingMinutes === preset.minutes && "sit-preset-on",
                    )}
                  >
                    {preset.short}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 border-t border-ink px-3 py-2">
                <span className="type-kicker text-muted">Custom</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  inputMode="numeric"
                  value={customSit}
                  onChange={(e) => setCustomSit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCustomSit(true);
                    }
                  }}
                  placeholder="min"
                  className="min-w-0 flex-1 border-0 bg-transparent font-sans text-base text-ink outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={() => applyCustomSit(true)}
                  className="type-kicker"
                >
                  Set
                </button>
                <button
                  type="button"
                  onClick={closeNavReveal}
                  className="type-kicker text-muted"
                >
                  Close
                </button>
              </label>
            </div>
          ) : null}
          <footer className="relative z-30 flex shrink-0 items-stretch">
            <div className="chrome-fade flex min-w-0 flex-1 items-stretch">
            <button
              type="button"
              onClick={keepCurrent}
              className={cn(
                "inline-flex h-12 shrink-0 items-center justify-center border-r border-ink px-4 font-sans text-sm",
                isKept ? "bg-red text-paper" : "bg-paper text-ink",
              )}
            >
              Keep
            </button>
            <FavoriteMark workId={work.id} className="border-r border-ink" />
            {isKept ? (
              <SalonCardShare
                compact
                workId={work.id}
                at={index}
                text={breath.text}
                title={work.title}
                author={work.author}
                className="border-r border-ink bg-yellow text-ink"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSendResult(null);
                  setOverlay("send");
                }}
                className="inline-flex h-12 shrink-0 items-center justify-center border-r border-ink bg-paper px-4 font-sans text-sm text-ink"
              >
                Send
              </button>
            )}
              {kept.length > 0 ? (
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto bg-paper px-2">
                  {kept.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-label="Return to a kept sentence"
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
                  ? "Sand has run — open navigation"
                  : sittingMinutes > 0
                    ? `Sitting timer ${formatSitClock(leftMs)} remaining — open navigation`
                    : "Open navigation and sitting timer"
              }
              title={
                sandCue
                  ? "Sand has run"
                  : sittingMinutes > 0
                    ? formatSitClock(leftMs)
                    : "Navigation"
              }
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                toggleNavReveal();
              }}
              className={cn(
                "reader-glass inline-flex h-12 w-14 shrink-0 items-center justify-center bg-paper text-ink",
                sandCue && !navReveal && "reader-glass-done",
              )}
            >
              <Hourglass
                size="sm"
                remaining={sittingMinutes > 0 ? sandRemaining : 1}
                running={sandRunning}
              />
            </button>
          </footer>
        </>
      )}

      {overlay === "threshold" ? (
        <div className="veil bg-paper text-ink">
          {gateMode === "share" ? (
            <>
              <div className="veil-body">
                <p className="mb-3 type-kicker text-muted">{work.author}</p>
                <h1 className="veil-title">{work.title}</h1>
                <p className="veil-note">They sit the same hour. The page holds both of you.</p>
                <p className="mt-5 break-all font-sans text-xs leading-relaxed tracking-wide text-ink">
                  {inviteHref}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-rule bg-ink">
                <button
                  type="button"
                  className="flex h-16 items-center justify-center bg-paper font-sans text-sm text-ink"
                  onClick={() => void sendInviteLink()}
                >
                  {inviteCopied ? "Copied" : canShare ? "Send the link" : "Copy the link"}
                </button>
                <button
                  type="button"
                  className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper"
                  onClick={beginTogetherSit}
                >
                  Begin
                </button>
              </div>
            </>
          ) : showPreface ? (
            <>
              <div className="veil-body veil-preface">
                <p className="type-kicker text-muted">
                  {nightChrome ? `${work.title} · ${work.author}` : work.author}
                </p>
                <PlaceChip workId={work.id} tone="accent" className="mt-2" />
                <h1 className="veil-title">{nightChrome || work.title}</h1>
                {intro ? <p className="veil-note veil-preface-note">{intro}</p> : null}
                {gateMode === "length" ? (
                  <>
                    <p className="mt-8 type-kicker text-muted">How long will you sit</p>
                    <div className="sit-presets mt-3" role="group" aria-label="Sitting length">
                      {SIT_PRESETS.map((preset) => (
                        <button
                          key={preset.minutes}
                          type="button"
                          onClick={() => chooseSit(preset.minutes)}
                          className={cn(
                            "sit-preset",
                            sittingMinutes === preset.minutes && "sit-preset-on",
                          )}
                        >
                          {preset.short}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 font-sans text-xs text-muted">{sitLabel(sittingMinutes)}</p>
                  </>
                ) : null}
              </div>
              {gateMode === "full" ? (
                <div className="flex shrink-0 flex-col gap-rule bg-ink">
                  <button
                    type="button"
                    className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper"
                    onClick={beginAlone}
                  >
                    Sit
                  </button>
                  <button
                    type="button"
                    className="flex h-16 items-center justify-center bg-red font-sans text-sm text-paper"
                    onClick={beginTogetherShare}
                  >
                    With a friend
                  </button>
                </div>
              ) : (
                <button type="button" onClick={crossThreshold} className="veil-action-full">
                  Sit
                </button>
              )}
            </>
          ) : (
            <>
              <div className="veil-body">
                <h1 className="veil-title">{nightChrome || work.title}</h1>
                <p className="mt-3 font-sans text-sm text-muted">
                  {nightChrome ? `${work.title} · ${work.author}` : work.author}
                </p>
                <PlaceChip workId={work.id} tone="accent" className="mt-2" />
                <p className="mt-8 type-kicker text-muted">How long will you sit</p>
                <div className="sit-presets mt-3" role="group" aria-label="Sitting length">
                  {SIT_PRESETS.map((preset) => (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => chooseSit(preset.minutes)}
                      className={cn(
                        "sit-preset",
                        sittingMinutes === preset.minutes && "sit-preset-on",
                      )}
                    >
                      {preset.short}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex items-center gap-2 border border-ink px-3 py-2">
                  <span className="type-kicker text-muted">Custom</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    inputMode="numeric"
                    value={customSit}
                    onChange={(e) => setCustomSit(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCustomSit();
                      }
                    }}
                    placeholder="min"
                    className="min-w-0 flex-1 border-0 bg-transparent font-sans text-base text-ink outline-none placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => applyCustomSit()}
                    className="type-kicker text-ink"
                  >
                    Set
                  </button>
                </label>
                <p className="mt-2 font-sans text-xs text-muted">{sitLabel(sittingMinutes)}</p>
                {gateMode === "full" ? (
                  <p className="mt-8 type-kicker text-muted">Read with a friend?</p>
                ) : null}
              </div>
              {gateMode === "full" ? (
                <div className="flex shrink-0 flex-col gap-rule bg-ink">
                  <button
                    type="button"
                    className="flex h-16 items-center justify-center bg-paper font-sans text-sm text-ink"
                    onClick={beginAlone}
                  >
                    Alone
                  </button>
                  <button
                    type="button"
                    className="flex h-16 items-center justify-center bg-red font-sans text-sm text-paper"
                    onClick={beginTogetherShare}
                  >
                    With a friend
                  </button>
                </div>
              ) : (
                <>
                  <span className={cn("h-1 shrink-0", fillClass(plane))} />
                  <button type="button" onClick={crossThreshold} className="veil-action-full">
                    Begin
                  </button>
                </>
              )}
            </>
          )}
        </div>
      ) : null}

      {overlay === "reentry" && scene ? (
        <button type="button" onClick={beginFromReentry} className="veil bg-paper text-ink">
          <div className="veil-body text-left">
            <span className={cn("mb-4 block h-2 w-10", fillClass(plane))} />
            <h2 className="veil-title">{scene.place}</h2>
            <p className="veil-note">{scene.reentry}</p>
          </div>
          <span className="veil-action-full">Continue</span>
        </button>
      ) : null}

      {overlay === "spine" && !together ? (
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
            {work.scenes.map((item) => {
              const start = sceneStartIndex(work, item.id);
              const current = item.id === breath.sceneId;
              const reached = start <= index;
              const word = progress?.keywords[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!reached}
                  onClick={() => {
                    if (!reached) return;
                    setOverlay("none");
                    goTo(start);
                  }}
                  className={cn("veil-room", !reached && "opacity-40")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-block size-2.5 shrink-0",
                        current ? fillClass(planeOf(item.id)) : reached ? "bg-ink" : "bg-paper-deep",
                      )}
                    />
                    <span className="type-lede">
                      {item.place}
                    </span>
                  </span>
                  {word && word !== "—" ? (
                    <span className="mt-1 pl-5 font-serif text-sm italic text-ink/60">{word}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {overlay === "sitting-end" ? (
        <div className="veil bg-paper text-ink">
          <div className="veil-body">
            <h2 className="veil-title">{scene.place}</h2>
            {together ? (
              <p className="veil-note">The hour is up. Stay in the story, or hold to leave.</p>
            ) : null}
          </div>
          {together ? (
            <button
              type="button"
              className="veil-action-full"
              onClick={() => {
                setSandCue(false);
                startSitting(work.id, { restart: true });
                setOverlay("none");
              }}
            >
              Stay
            </button>
          ) : (
            <div className="veil-actions">
              <Link
                to="/"
                onClick={() => closeSit()}
                className="veil-action bg-ink text-paper"
              >
                Home
              </Link>
              <button
                type="button"
                className="veil-action bg-paper text-ink"
                onClick={() => {
                  setSandCue(false);
                  startSitting(work.id, { restart: true });
                  setOverlay("none");
                }}
              >
                Stay
              </button>
            </div>
          )}
        </div>
      ) : null}

      {overlay === "end" ? (
        <div className="veil bg-paper text-ink">
          <div className="veil-body">
            <h2 className="veil-title">{work.title}</h2>
            {together ? (
              <p className="veil-note">Stay on the last page, or hold to leave.</p>
            ) : null}
          </div>
          {together ? (
            <button
              type="button"
              className="veil-action-full"
              onClick={() => setOverlay("none")}
            >
              Stay
            </button>
          ) : (
            <Link
              to="/"
              onClick={() => closeSit()}
              className="veil-action-full"
            >
              Home
            </Link>
          )}
        </div>
      ) : null}

      {sandCue && !together && overlay === "none" ? (
        <div
          className="sand-cue"
          role="status"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="font-serif text-sm text-ink/80">The sand has run. Stay as long as you like.</p>
          <div className="sand-cue-actions">
            <button
              type="button"
              className="sand-cue-btn"
              onClick={sitContinue}
            >
              Continue
            </button>
            <button
              type="button"
              className="sand-cue-btn sand-cue-btn-again"
              onClick={sitAgain}
            >
              Again
            </button>
          </div>
        </div>
      ) : null}

      {overlay === "send" && !together ? (
        <div className="veil bg-paper text-ink">
          <button
            type="button"
            onClick={() => setOverlay("none")}
            className="flex h-12 shrink-0 items-center justify-between border-b border-ink px-4"
          >
            <span className="truncate font-display text-lg">Send</span>
            <span className="font-sans text-sm">Close</span>
          </button>
          <div className="veil-body text-left">
            <p className="font-serif text-lg leading-relaxed sm:text-xl">
              <EmphasizedText text={breath.text} />
            </p>
            <label className="mt-8 block">
              <span className="sr-only">Friend&apos;s phone</span>
              <input
                type="tel"
                value={sendPhone}
                onChange={(e) => setSendPhone(e.target.value)}
                placeholder="Friend's phone — for later"
                className="w-full border border-ink bg-paper px-4 py-3 font-sans text-base text-ink outline-none placeholder:text-muted"
              />
            </label>
          </div>
          <div className="veil-actions">
            <button
              type="button"
              disabled={sendBusy}
              className="veil-action bg-ink text-paper disabled:opacity-60"
              onClick={() => {
                void sendKeptLine();
              }}
            >
              {sendBusy
                ? "Making link…"
                : sendResult === "shared"
                  ? "Shared"
                  : sendResult === "copied"
                    ? "Copied"
                    : canShare
                      ? "Share"
                      : "Copy private link"}
            </button>
            <button
              type="button"
              className="veil-action bg-paper text-ink"
              onClick={() => setOverlay("none")}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const ChamberReader = VellumReader;
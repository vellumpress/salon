import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { openingBreathIndex } from "@/lib/opening-scene";
import {
  chapterStartIndex,
  loadWork,
  lookbackBreaths,
  sceneOf,
  workIsComplete,
  type Work,
} from "@/lib/works";
import { breathRemapLoaded, loadBreathRemap, readBreathRemap } from "@/lib/breath-remap";
import { placeStamp, reanchorProgress, shouldLoadBindRemap } from "@/lib/rebind-guard";
import { anchorKeptLine, keptBreathId, keptIncludes, type KeptStored } from "@/lib/kept-lines";
import { chapterPlace, spineChapters } from "@/lib/spine-nav";
import { useTbr } from "@/lib/store";
import { fillClass, planeOf, type Fill } from "@/lib/mondrian";
import { readerIntro } from "@/lib/reader-intro";
import { isSectionBreak, splitEmphasis } from "@/lib/emphasized-text";
import { shouldShowPreface } from "@/lib/reader-threshold";
import { FavoriteMark } from "@/components/favorite-mark";
import { PlaceChip } from "@/components/place-chip";
import { Hourglass } from "@/components/hourglass";
import { closedReaderBar, reduceReaderBar, type ReaderBarState } from "@/lib/reader-chrome";
import { TogetherShell } from "@/components/sitting-room";
import { estimateRitualMinutes } from "@/lib/catalog/rituals";
import { shelfWork } from "@/lib/catalog/shelf";
import { isDeviceImport } from "@/lib/import/private";
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
import { useReaderDaylight } from "@/lib/use-reader-daylight";
import {
  breathTooTall,
  centerLineOffset,
  focusAnchorPx,
  upcomingBreaths,
  upcomingOpacity,
} from "@/lib/center-line";
import {
  classifyTurnGesture,
  GHOST_MOUSE_MS,
  ghostMousePointer,
  SCROLL_ARM_PX,
  turnZone,
} from "@/lib/reader-turn";
import { useCenterLine } from "@/lib/use-center-line";

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
  if (isSectionBreak(text)) {
    return (
      <span className="section-break" role="separator" aria-label="Section break">
        <span aria-hidden="true">· · ·</span>
      </span>
    );
  }
  return splitEmphasis(text).map((part, i) =>
    part.type === "em" ? <em key={i}>{part.value}</em> : part.value,
  );
}

export function TbrReader({
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
  const device = isDeviceImport(work.id);
  const sittingMinutes = useTbr((s) => s.sittingMinutes);
  const setSittingMinutes = useTbr((s) => s.setSittingMinutes);
  const progress = useTbr((s) => s.progress[work.id]);
  const setBreath = useTbr((s) => s.setBreath);
  const advanceBreath = useTbr((s) => s.advanceBreath);
  const pauseActiveRead = useTbr((s) => s.pauseActiveRead);
  const resumeActiveRead = useTbr((s) => s.resumeActiveRead);
  const startSitting = useTbr((s) => s.startSitting);
  const endSitting = useTbr((s) => s.endSitting);
  const completeSerializeNight = useTbr((s) => s.completeSerializeNight);
  const serializePlan = episodeN ? serializePlanByWorkId(work.id) : undefined;
  const serializeEp =
    serializePlan && episodeN ? serializeEpisode(serializePlan, episodeN) : undefined;
  const nightChrome =
    serializePlan && serializeEp ? serializeNightChrome(serializePlan, serializeEp.n) : "";

  const toggleKept = useTbr((s) => s.toggleKept);
  const rememberTogetherKeep = useTbr((s) => s.rememberTogetherKeep);
  const rememberHostedSit = useTbr((s) => s.rememberHostedSit);
  const keepWithSit = useTbr((s) => s.keepWithSit);
  const myHandle = useTbr((s) => s.handle) ?? "";
  const complete = useTbr((s) => s.complete);
  const ensure = useTbr((s) => s.ensure);
  const setReadingNow = useTbr((s) => s.setReadingNow);
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
  const [bar, setBar] = useState<ReaderBarState>(closedReaderBar);
  const still = bar.still;
  const navReveal = bar.navReveal;
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  /** Top of the focus line, relative to the reading column. Taps above it go back. */
  const [prevZonePx, setPrevZonePx] = useState(0);
  const [sandCue, setSandCue] = useState(false);
  const [customSit, setCustomSit] = useState("");
  /** threshold: full = length+company; length = pair already set, sit missing; share = invite friend */
  const [gateMode, setGateMode] = useState<"full" | "length" | "share">("full");
  const [showPreface, setShowPreface] = useState(false);
  const [company, setCompany] = useState<"alone" | "together" | null>(null);
  const [invitePair, setInvitePair] = useState<string | null>(null);
  const [inviteHref, setInviteHref] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const daylight = useReaderDaylight();
  const centerLine = useCenterLine();
  const centerOn = centerLine.enabled;
  const turnHostRef = useRef<HTMLDivElement>(null);
  /**
   * One finger-down. The matching pointerup is the only turn.
   * A ghost mouse sequence after the touch must not start another one.
   */
  const gestureRef = useRef<{
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    t: number;
    pointerType: string;
    scrollTop: number;
    scrolled: boolean;
    turned: boolean;
    zone: "prev" | "next" | null;
  } | null>(null);
  /** Clicks owed to pointer gestures. Each one is swallowed, not turned. */
  const owedClicksRef = useRef(0);
  /** When a pointer gesture last turned. A click in this window is that finger. */
  const turnedAtRef = useRef(0);
  /** Last real touch, so the synthesized mouse that follows is ignored. */
  const lastTouchAtRef = useRef(0);
  const lastTouchPointRef = useRef<{ x: number; y: number } | null>(null);
  const touchPlacesRef = useRef<{ x: number; y: number; t: number }[]>([]);
  /**
   * Fallback split when the focus line has no box yet.
   * A tap uses the line on screen at finger-down, and the sentence index
   * comes from the store, never from how far the column has scrolled.
   */
  const zoneRef = useRef<{ tall: boolean; split: number; ready: boolean }>({
    tall: false,
    split: 0,
    ready: false,
  });
  /** While the sentence is still sliding, taps use the rested split. */
  const slidingUntilRef = useRef(0);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const booted = useRef(false);
  const seenBreaths = useRef(0);
  /** Share link past the opening excerpt. Applied when the rest of the book arrives. */
  const awaitingAt = useRef<number | null>(
    typeof at === "number" && Number.isFinite(at) && at >= 0 ? Math.floor(at) : null,
  );
  const breathSlotRef = useRef<HTMLDivElement>(null);
  const lookbackSlotRef = useRef<HTMLDivElement>(null);
  const readingPaneRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const topPadRef = useRef<HTMLDivElement>(null);
  const bottomPadRef = useRef<HTMLDivElement>(null);
  const upcomingSlotRef = useRef<HTMLDivElement>(null);
  const placedIndex = useRef<number | null>(null);
  const motionArmed = useRef(false);
  /** Height of the breath just read, plus the gap under it. Advance travels up by this. */
  const lastTravel = useRef(0);

  function fullBind(book: Work) {
    if (isDeviceImport(book.id)) return book.breaths.length > 0;
    if (workIsComplete(book.id)) return true;
    const shelf = shelfWork(book.id);
    return shelf?.breaths != null && shelf.breaths === book.breaths.length;
  }

  function stampAt(book: Work, index: number) {
    if (!fullBind(book) || index < 0 || index >= book.breaths.length) return undefined;
    return placeStamp(book.breaths, index);
  }

  useLayoutEffect(() => {
    let cancel = false;
    ensure(work.id);
    if (sit !== undefined) {
      useTbr.getState().setSittingMinutes(sit);
    }
    const grew = work.breaths.length > seenBreaths.current;
    seenBreaths.current = work.breaths.length;
    const deepLink =
      typeof at === "number" &&
      Number.isFinite(at) &&
      at >= 0 &&
      at < work.breaths.length
        ? Math.floor(at)
        : echoAt != null
          ? echoAt
          : null;

    async function settlePlace(book: Work) {
      if (!fullBind(book)) return;
      const prior = useTbr.getState().progress[book.id];
      if (!prior?.entered) return;
      let remap = readBreathRemap();
      if (shouldLoadBindRemap(prior, book.breaths) && !breathRemapLoaded()) {
        remap = await loadBreathRemap();
      }
      if (cancel) return;
      const next = reanchorProgress(prior, book.breaths, remap, book.id);
      if (
        prior.breathIndex === next.index &&
        prior.breathId === next.breathId &&
        prior.breathCount === next.breathCount &&
        prior.bindHash === next.bindHash
      ) {
        return;
      }
      useTbr.getState().setBreath(book.id, next.index, {
        breathId: next.breathId,
        breathCount: next.breathCount,
        bindHash: next.bindHash,
      });
    }

    void (async () => {
      // The opening sit is already on the prose. When the full novel arrives,
      // breath 0 can be a publication note or dedication. Nudge a fresh start
      // past that leading front matter only — do not re-apply chapter jumps,
      // and do not move a saved index that is already on the prose.
      if (booted.current) {
        const waiting = awaitingAt.current;
        if (grew && waiting !== null && waiting < work.breaths.length) {
          if (cancel) return;
          awaitingAt.current = null;
          startSitting(work.id);
          setBreath(work.id, waiting, stampAt(work, waiting));
          setShowPreface(false);
          setOverlay("none");
          return;
        }
        if (grew && !shuffle && deepLink === null) {
          await settlePlace(work);
          if (cancel) return;
          const index = useTbr.getState().progress[work.id]?.breathIndex ?? 0;
          const frontAt = openingBreathIndex(work);
          if (index < frontAt) setBreath(work.id, frontAt, stampAt(work, frontAt));
        }
        return;
      }
      if (!shuffle && deepLink === null) await settlePlace(work);
      if (cancel) return;
      booted.current = true;
      const prior = useTbr.getState().progress[work.id];
      const firstSit = shouldShowPreface(prior);
      setShowPreface(firstSit);
      if (shuffle) {
        useTbr.getState().startShuffle(work.id);
        setShowPreface(false);
        setOverlay("none");
        return;
      }
      if (hostedSit) {
        rememberHostedSit(hostedSit);
      }
      if (deepLink !== null) {
        awaitingAt.current = null;
        startSitting(work.id);
        setBreath(work.id, deepLink, stampAt(work, deepLink));
        setShowPreface(false);
        setOverlay("none");
        return;
      }
      const chapterAt = chapterStartIndex(work);
      const startAt = Math.max(chapterAt, openingBreathIndex(work));
      const index = prior?.breathIndex ?? 0;
      if (!prior?.entered || index < startAt) {
        useTbr.getState().setBreath(work.id, startAt, stampAt(work, startAt));
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
          useTbr
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
    })();
    return () => {
      cancel = true;
    };
  }, [at, echoAt, ensure, hostedSit, pair, rememberHostedSit, setBreath, shuffle, sit, startSitting, work]);

  useEffect(() => {
    document.documentElement.classList.add("sitting");
    return () => {
      document.documentElement.classList.remove("sitting");
    };
  }, []);

  useEffect(() => {
    const host = turnHostRef.current;
    if (!host) return;
    const blockCallout = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest("a[href], input, textarea, select")) return;
      if (event.cancelable) event.preventDefault();
    };
    host.addEventListener("touchstart", blockCallout, { passive: false });
    return () => host.removeEventListener("touchstart", blockCallout);
  }, [centerOn, overlay]);

  // Idle, background, and the threshold / timer sheets are not reading.
  // The anchor is cleared so the next advance cannot claim that gap.
  useEffect(() => {
    if (overlay !== "none") {
      pauseActiveRead(work.id);
      return;
    }
    resumeActiveRead(work.id);
    const onVis = () => {
      if (document.hidden) pauseActiveRead(work.id);
      else resumeActiveRead(work.id);
    };
    document.addEventListener("visibilitychange", onVis);
    const onHide = () => pauseActiveRead(work.id);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      pauseActiveRead(work.id);
    };
  }, [overlay, pauseActiveRead, resumeActiveRead, work.id]);

  useEffect(() => {
    setCanShare(canNativeShare());
  }, []);

  const lastBreath = Math.max(0, work.breaths.length - 1);
  const index = Math.min(lastBreath, Math.max(0, progress?.breathIndex ?? 0));
  const breath = work.breaths[index];
  const scene = breath ? sceneOf(work, breath.sceneId) : work.scenes[0];
  const placeLabel = chapterPlace(work.id, scene);
  const spine = useMemo(
    () => spineChapters(work, index, workIsComplete(work.id) || isDeviceImport(work.id)),
    [index, work],
  );
  const lookback = useMemo(
    () => lookbackBreaths(work, index, LOOKBACK),
    [index, work],
  );
  const upcoming = useMemo(
    () => (centerOn ? upcomingBreaths(work, index) : []),
    [centerOn, index, work],
  );
  const kept = progress?.kept ?? [];
  const isKept = breath ? keptIncludes(kept, breath.id) : false;
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

  function liveIndex() {
    const raw = useTbr.getState().progress[work.id]?.breathIndex ?? 0;
    const last = Math.max(0, work.breaths.length - 1);
    if (!Number.isFinite(raw)) return 0;
    return Math.min(last, Math.max(0, Math.floor(raw)));
  }

  function goTo(next: number) {
    if (next < 0 || next >= work.breaths.length) return;
    const at = liveIndex();
    const from = work.breaths[at];
    const to = work.breaths[next];
    // Only a step onto the next breath is active reading. Retreats, jumps,
    // and scrolling the line do not add time. The index is read from the
    // store so a second tap in the same frame moves again.
    if (next === at + 1) {
      advanceBreath(work.id, next, {
        crossedScene: Boolean(from && to && from.sceneId !== to.sceneId),
        place: stampAt(work, next),
      });
    } else setBreath(work.id, next, stampAt(work, next));
  }

  function stepBy(delta: 1 | -1) {
    if (overlayRef.current !== "none") return;
    const at = liveIndex();
    const next = at + delta;
    if (next < 0) return;
    if (next >= work.breaths.length) {
      if (delta > 0 && workIsComplete(work.id)) {
        complete(work.id);
        setOverlay("end");
      }
      return;
    }
    goTo(next);
  }

  function advance() {
    stepBy(1);
  }

  function retreat() {
    stepBy(-1);
  }

  function beginFromReentry() {
    setSandCue(false);
    startSitting(work.id, { restart: true });
    setOverlay("none");
    setBreath(work.id, liveIndex(), stampAt(work, liveIndex()));
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
    closeNavReveal();
  }

  function toggleNavReveal() {
    haptic(12);
    setBar((state) => reduceReaderBar(state, "hourglass"));
  }

  function closeNavReveal() {
    setBar(closedReaderBar);
  }

  async function jumpKept(entry: KeptStored) {
    const fromId = keptBreathId(entry);
    const stored = typeof entry === "string" ? "" : (entry.text ?? "");
    let breaths = work.breaths;
    let anchor = anchorKeptLine({ id: fromId, text: stored }, breaths, readBreathRemap(), work.id);
    if (anchor.index == null && stored && !workIsComplete(work.id)) {
      try {
        const full = await loadWork(work.id);
        if (full) {
          breaths = full.breaths;
          anchor = anchorKeptLine({ id: fromId, text: stored }, breaths, readBreathRemap(), work.id);
        }
      } catch {
        /* Stay on the sentence already open. */
      }
    }
    if (anchor.updated && anchor.breathId && fromId && anchor.breathId !== fromId) {
      useTbr.getState().retargetKept(work.id, fromId, anchor.breathId);
    }
    if (anchor.index == null) return;
    setOverlay("none");
    if (anchor.index < work.breaths.length) goTo(anchor.index);
    else setBreath(work.id, anchor.index, stampAt(work, anchor.index));
  }

  function keepCurrent() {
    const current = work.breaths[Math.min(lastBreath, Math.max(0, progress?.breathIndex ?? 0))];
    if (!current) return;
    const already = keptIncludes(progress?.kept, current.id);
    const sceneTitle = sceneOf(work, current.sceneId)?.title;
    toggleKept(work.id, current.id, {
      text: current.text,
      title: work.title,
      author: work.author,
      scene: sceneTitle,
    });
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

  // The gate, the end card, and a re-entry used to force Keep open. Starting
  // the sit only clears that sheet, so the bar was already up when the page
  // appeared and stayed up until the first turn. The hourglass is the only
  // control that opens it. Send and the spine fold the length sheet and
  // leave an already-open bar alone.
  useEffect(() => {
    if (overlay === "none") return;
    if (overlay === "send" || overlay === "spine") {
      setBar((state) => (state.navReveal ? { ...state, navReveal: false } : state));
      return;
    }
    setBar((state) => (state.still && !state.navReveal ? state : closedReaderBar));
  }, [overlay]);

  useEffect(() => {
    if (together || overlay !== "none" || still || navReveal) return;
    let t = window.setTimeout(() => {
      setBar((state) => (state.still ? state : { ...state, still: true }));
    }, 3200);
    const poke = (event: PointerEvent) => {
      const node = event.target as HTMLElement | null;
      if (!node?.closest(".chrome-fade, .reader-glass, .nav-reveal")) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        setBar((state) => (state.still ? state : { ...state, still: true }));
      }, 3200);
    };
    window.addEventListener("pointerdown", poke);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", poke);
    };
  }, [still, overlay, together, navReveal]);

  // Page / breath taps never open the bar. A tap outside an open bar closes
  // it and still bubbles so the sentence buttons turn the page.
  useEffect(() => {
    if (together || overlay !== "none") return;
    const onOutside = (event: MouseEvent) => {
      const node = event.target as HTMLElement | null;
      if (!node?.closest) return;
      // Veil controls (Send's Dismiss) stay in the detached sheet for this
      // click, after the overlay has already closed. They are not page taps.
      if (node.closest(".chrome-fade, .reader-glass, .nav-reveal, .veil")) return;
      setBar((state) => reduceReaderBar(state, "page"));
    };
    window.addEventListener("click", onOutside);
    return () => window.removeEventListener("click", onOutside);
  }, [together, overlay]);

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
          setBar(closedReaderBar);
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
      place: placeLabel,
      sentence: breath.text.slice(0, 400),
    });
    return () => setReadingNow(null);
  }, [breath, placeLabel, scene, setReadingNow, work.author, work.id, work.title]);

  useEffect(() => {
    motionArmed.current = true;
  }, []);

  useLayoutEffect(() => {
    const slot = breathSlotRef.current;
    const stepped =
      placedIndex.current !== null && Math.abs(index - placedIndex.current) === 1;
    placedIndex.current = index;
    if (!slot) {
      setOverflows(false);
      setAtEnd(true);
      zoneRef.current = { tall: false, split: 0, ready: false };
      return;
    }
    let didLand = false;
    const landScroll = () => {
      if (didLand) return;
      didLand = true;
      // Every sentence opens on its first line. The index in the store is
      // where we are; scroll position is not another sentence.
      slot.scrollTop = 0;
    };
    const rememberZone = (tall: boolean) => {
      const host = turnHostRef.current;
      const line = slot.querySelector(".breath-now");
      if (!host || !line) {
        zoneRef.current = { tall, split: 0, ready: false };
        return 0;
      }
      const hostRect = host.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      const split = Math.max(
        0,
        Math.min(Math.round(hostRect.height), Math.round(lineRect.top - hostRect.top)),
      );
      zoneRef.current = { tall, split, ready: true };
      return split;
    };

    if (!centerOn) {
      let live = true;
      const measure = () => {
        if (!live) return;
        const next = slot.scrollHeight - slot.clientHeight > 1;
        landScroll();
        setOverflows((prev) => (prev === next ? prev : next));
        const end = slot.scrollHeight - slot.scrollTop - slot.clientHeight <= 2;
        setAtEnd((prev) => (prev === end ? prev : end));
        const split = rememberZone(next);
        setPrevZonePx((prev) => (prev === split ? prev : split));
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
    }

    const pane = readingPaneRef.current;
    const track = trackRef.current;
    if (!pane || !track) return;

    let live = true;
    let layoutSig = "";
    let holdMotionUntil = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const place = (animate: boolean) => {
      if (!live) return;
      const line = slot.querySelector<HTMLElement>(".breath-now");
      const topPad = topPadRef.current;
      const bottomPad = bottomPadRef.current;
      if (!line) return;
      const height = pane.clientHeight;
      const host = turnHostRef.current;
      const marginBottom = host ? Number.parseFloat(getComputedStyle(host).marginBottom) : 0;
      const overlap = Number.isFinite(marginBottom) && marginBottom < 0 ? -marginBottom : 0;
      const readingHeight = Math.max(0, height - overlap);
      const anchorPx = focusAnchorPx(height, overlap);
      const tooTall = breathTooTall(line.scrollHeight, readingHeight || height);
      const look = lookbackSlotRef.current;
      const ahead = upcomingSlotRef.current;
      if (tooTall) {
        if (topPad) topPad.style.height = "0px";
        if (bottomPad) bottomPad.style.height = "0px";
        slot.style.maxHeight = `${Math.floor(height)}px`;
        slot.style.overflowY = "auto";
        if (look) look.style.display = "none";
        if (ahead) ahead.style.display = "none";
      } else {
        if (topPad) topPad.style.height = `${anchorPx}px`;
        if (bottomPad) bottomPad.style.height = `${Math.max(0, height - anchorPx)}px`;
        slot.style.maxHeight = "";
        slot.style.overflowY = "";
        if (look) look.style.display = "";
        if (ahead) ahead.style.display = "";
        if (look) void look.offsetHeight;
      }
      landScroll();

      const trackRect = track.getBoundingClientRect();
      const targetRect = line.getBoundingClientRect();
      const lineTop = targetRect.top - trackRect.top;
      const shift = tooTall
        ? 0
        : centerLineOffset({
            paneHeight: height,
            lineTop,
            lineHeight: targetRect.height,
            anchor: height > 0 ? anchorPx / height : undefined,
          });
      const travel = Math.min(Math.max(0, lastTravel.current), height);
      const motion =
        animate &&
        motionArmed.current &&
        stepped &&
        !reduceMotion &&
        !tooTall &&
        travel > 1 &&
        track.dataset.ready === "1";
      // Measure the landed line, not the first frame of the slide. A zone
      // taken mid-animation sits below the sentence the reader sees, and the
      // next-sentence button then covers the back area until the next resize.
      const previousTransition = track.style.transition;
      track.style.transition = "none";
      track.dataset.ready = "0";
      track.style.transform = `translate3d(0, ${shift}px, 0)`;
      void track.offsetHeight;
      const aheadLine = ahead?.querySelector<HTMLElement>(".look-line");
      const lineRect = line.getBoundingClientRect();
      const gapPx = aheadLine
        ? Math.max(0, aheadLine.getBoundingClientRect().top - lineRect.bottom)
        : 10;
      lastTravel.current = lineRect.height + gapPx;
      const hostRect = host?.getBoundingClientRect();
      const focusTop = lineRect.top - (hostRect?.top ?? 0);
      const zone = hostRect
        ? Math.max(0, Math.min(Math.round(hostRect.height), Math.round(focusTop)))
        : 0;
      zoneRef.current = { tall: tooTall, split: zone, ready: true };
      setPrevZonePx((prev) => (prev === zone ? prev : zone));
      if (motion) {
        // Land on the true center, but start one breath lower so the column
        // moves up. Windowed lookback can change height by much more than a
        // breath; that jump is applied before paint, and only the breath
        // travels in view.
        holdMotionUntil = performance.now() + 320;
        slidingUntilRef.current = holdMotionUntil;
        track.style.transform = `translate3d(0, ${shift + travel}px, 0)`;
        void track.offsetHeight;
        track.style.transition = previousTransition;
        track.dataset.ready = "1";
        void track.offsetHeight;
        track.style.transform = `translate3d(0, ${shift}px, 0)`;
      } else {
        slidingUntilRef.current = 0;
        track.style.transition = previousTransition;
        if (!reduceMotion) {
          requestAnimationFrame(() => {
            if (live && track.isConnected) track.dataset.ready = "1";
          });
        }
      }

      const overflowsNow = tooTall || slot.scrollHeight - slot.clientHeight > 1;
      setOverflows((prev) => (prev === overflowsNow ? prev : overflowsNow));
      const end = slot.scrollHeight - slot.scrollTop - slot.clientHeight <= 2;
      setAtEnd((prev) => (prev === end ? prev : end));
      layoutSig = sigNow();
    };

    const sigNow = () => {
      const lineNow = slot.querySelector<HTMLElement>(".breath-now");
      const hostEl = turnHostRef.current;
      const margin = hostEl ? Number.parseFloat(getComputedStyle(hostEl).marginBottom) : 0;
      const overlapNow = Number.isFinite(margin) && margin < 0 ? Math.round(-margin) : 0;
      return `${Math.round(pane.clientHeight)}:${lineNow?.clientHeight ?? 0}:${lookbackSlotRef.current?.offsetHeight ?? 0}:${upcomingSlotRef.current?.offsetHeight ?? 0}:${overlapNow}`;
    };

    place(true);
    const onScroll = () => {
      if (!live) return;
      const end = slot.scrollHeight - slot.scrollTop - slot.clientHeight <= 2;
      setAtEnd((prev) => (prev === end ? prev : end));
    };
    slot.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      const finish = () => {
        if (!live) return;
        const sig = sigNow();
        if (sig === layoutSig) return;
        layoutSig = sig;
        place(false);
      };
      if (performance.now() < holdMotionUntil) {
        window.setTimeout(finish, Math.max(16, holdMotionUntil - performance.now() + 16));
        return;
      }
      finish();
    });
    ro.observe(pane);
    const line = slot.querySelector(".breath-now");
    if (line) ro.observe(line);
    if (lookbackSlotRef.current) ro.observe(lookbackSlotRef.current);
    if (upcomingSlotRef.current) ro.observe(upcomingSlotRef.current);
    if (!motionArmed.current) {
      void document.fonts?.ready.then(() => {
        if (live) place(false);
      });
    }
    return () => {
      live = false;
      ro.disconnect();
      slot.removeEventListener("scroll", onScroll);
    };
  }, [index, breath?.text, together, overlay, centerOn]);

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
      <div
        className={cn("frame-screen reader-frame bg-paper text-ink", daylight.className)}
        style={daylight.style}
        data-daylight={daylight.active ? daylight.sample.phase : "off"}
      >
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

  const readLines = lookback.map((item, i) => {
    const last = lookback.length - 1;
    const opacity = last <= 0 ? 0.38 : 0.1 + (i / last) * 0.4;
    return (
      <p key={item.id} className="look-line text-ink" style={{ opacity }}>
        <EmphasizedText text={item.text} />
      </p>
    );
  });
  const previewLines = upcoming.map((item, i) => (
    <p
      key={item.id}
      className="look-line text-ink"
      style={{ opacity: upcomingOpacity(i, upcoming.length) }}
    >
      <EmphasizedText text={item.text} />
    </p>
  ));
  const currentLine = (
    <p
      className={cn(
        "breath-now relative z-[1] font-serif",
        isKept && "border-l-2 border-red pl-4",
      )}
    >
      <EmphasizedText text={breath.text} />
    </p>
  );
  const breathClass = cn("breath-slot", overflows && "overflows", atEnd && "at-end");

  function noteOwed(by: number) {
    owedClicksRef.current = Math.max(0, owedClicksRef.current + by);
    turnHostRef.current?.setAttribute("data-swallow-owed", String(owedClicksRef.current));
  }

  function rememberTouch(x: number, y: number) {
    const now = performance.now();
    lastTouchAtRef.current = now;
    lastTouchPointRef.current = { x, y };
    const places = touchPlacesRef.current.filter((place) => now - place.t < 12_000);
    places.push({ x, y, t: now });
    touchPlacesRef.current = places.slice(-24);
  }

  function ghostPointer(e: ReactPointerEvent<HTMLDivElement>) {
    return ghostMousePointer({
      pointerType: e.pointerType,
      firesTouchEvents: Boolean(
        (e.nativeEvent as { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities
          ?.firesTouchEvents,
      ),
      now: performance.now(),
      lastTouchAt: lastTouchAtRef.current,
      x: e.clientX,
      y: e.clientY,
      lastX: lastTouchPointRef.current?.x,
      lastY: lastTouchPointRef.current?.y,
      places: touchPlacesRef.current,
    });
  }

  function ghostClick(x: number, y: number) {
    return ghostMousePointer({
      pointerType: "mouse",
      now: performance.now(),
      lastTouchAt: lastTouchAtRef.current,
      x,
      y,
      lastX: lastTouchPointRef.current?.x,
      lastY: lastTouchPointRef.current?.y,
      places: touchPlacesRef.current,
    });
  }

  function pinnedToTop() {
    const slot = breathSlotRef.current;
    const host = turnHostRef.current;
    if (!slot || !host) return false;
    const line = slot.querySelector(".breath-now");
    if (!line) return zoneRef.current.tall;
    // Scene-length lines are pinned under the header. Nothing sits above
    // them, so the left third is the back tap even when they do not scroll.
    return line.getBoundingClientRect().top <= host.getBoundingClientRect().top + 12;
  }

  function columnScrolls() {
    const slot = breathSlotRef.current;
    if (!slot) return false;
    return slot.scrollHeight - slot.clientHeight > 24;
  }

  function lineIsSliding() {
    if (performance.now() < slidingUntilRef.current) return true;
    const track = trackRef.current;
    if (!track) return false;
    return track.getAnimations().some((anim) => anim.playState === "running");
  }

  function zoneAt(x: number, y: number) {
    const host = turnHostRef.current;
    if (!host) return null;
    const hostRect = host.getBoundingClientRect();
    const box = {
      left: hostRect.left,
      top: hostRect.top,
      right: hostRect.right,
      bottom: hostRect.bottom,
      width: hostRect.width,
    };
    if (pinnedToTop()) {
      return turnZone({ x, y, host: box, focusTop: null, focusBottom: null, tall: true });
    }
    // The sentence on screen is the boundary once it has settled.
    // While it is still sliding, the moving box sits lower than the rested
    // line, and a second tap on the same spot would reverse the first.
    const line = breathSlotRef.current?.querySelector(".breath-now");
    const lineRect = line?.getBoundingClientRect();
    const lineInColumn =
      lineRect &&
      lineRect.height > 0 &&
      lineRect.bottom > hostRect.top &&
      lineRect.top < hostRect.bottom;
    if (!lineIsSliding() && lineInColumn && lineRect) {
      return turnZone({
        x,
        y,
        host: box,
        focusTop: lineRect.top,
        focusBottom: lineRect.bottom,
      });
    }
    const zone = zoneRef.current;
    if (zone.ready && zone.tall) {
      return turnZone({ x, y, host: box, focusTop: null, focusBottom: null, tall: true });
    }
    if (zone.ready) {
      const focusTop = hostRect.top + zone.split;
      return turnZone({
        x,
        y,
        host: box,
        focusTop,
        focusBottom: focusTop + 1,
      });
    }
    return turnZone({ x, y, host: box, focusTop: null, focusBottom: null });
  }

  function stepZone(zone: "prev" | "next" | null) {
    if (!zone) return;
    if (zone === "prev") retreat();
    else advance();
    setBar((state) => reduceReaderBar(state, "page"));
  }

  function turnAt(x: number, y: number) {
    stepZone(zoneAt(x, y));
  }

  function beginTurn(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !e.isPrimary) return;
    if (ghostPointer(e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const host = turnHostRef.current;
    if (!host) return;
    const target = e.target;
    if (
      target instanceof Element &&
      target.closest("a[href], input, textarea, select, label")
    ) {
      return;
    }
    if (e.pointerType === "touch") rememberTouch(e.clientX, e.clientY);
    const slot = breathSlotRef.current;
    // Arm before the lift. iOS can deliver the compatibility click before
    // pointerup; that click must not turn, and the lift still does.
    noteOwed(1);
    const zone = zoneAt(e.clientX, e.clientY);
    gestureRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      t: performance.now(),
      pointerType: e.pointerType,
      scrollTop: slot?.scrollTop ?? 0,
      scrolled: false,
      turned: false,
      // Frozen at finger-down. The sentence keeps sliding after the touch,
      // and reading the line again on the lift flips a back tap into forward.
      zone,
    };
    try {
      host.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer already ended */
    }
    // Stops the text callout, native scrolling, and the extra click after a tap.
    e.preventDefault();
  }

  function moveTurn(e: ReactPointerEvent<HTMLDivElement>) {
    const start = gestureRef.current;
    if (!start || start.id !== e.pointerId || ghostPointer(e)) return;
    start.lastX = e.clientX;
    start.lastY = e.clientY;
    const slot = breathSlotRef.current;
    if (!slot || !columnScrolls()) return;
    const dy = e.clientY - start.y;
    const dx = e.clientX - start.x;
    if (!start.scrolled) {
      if (Math.abs(dy) < SCROLL_ARM_PX || Math.abs(dy) < Math.abs(dx)) return;
      start.scrolled = true;
      start.scrollTop = slot.scrollTop;
    }
    slot.scrollTop = start.scrollTop - (e.clientY - start.y);
    if (e.cancelable) e.preventDefault();
  }

  function finishTurn(e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (ghostPointer(e)) {
      e.preventDefault();
      return;
    }
    const start = gestureRef.current;
    if (!start || start.id !== e.pointerId) return;
    gestureRef.current = null;
    if (start.turned) return;
    turnedAtRef.current = performance.now();
    if (start.pointerType === "touch") {
      rememberTouch(cancelled ? start.lastX : e.clientX, cancelled ? start.lastY : e.clientY);
    }
    if (start.scrolled) return;
    const dx = (cancelled ? start.lastX : e.clientX) - start.x;
    const dy = (cancelled ? start.lastY : e.clientY) - start.y;
    const dt = performance.now() - start.t;
    const kind = classifyTurnGesture({
      dx,
      dy,
      dt,
      canScroll: columnScrolls(),
      scrolled: false,
    });
    if (cancelled && kind !== "tap") return;
    if (kind === "swipe-next") {
      stepZone("next");
      return;
    }
    if (kind === "swipe-prev") {
      stepZone("prev");
      return;
    }
    if (kind !== "tap") return;
    stepZone(start.zone);
  }

  function endTurn(e: ReactPointerEvent<HTMLDivElement>) {
    finishTurn(e, false);
  }

  function cancelTurn(e: ReactPointerEvent<HTMLDivElement>) {
    finishTurn(e, true);
  }

  function onTurnClick(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const start = gestureRef.current;
    // The compatibility click can beat pointerup. One open gesture means
    // this click is that finger: turn now, and let the lift do nothing.
    if (start && !start.turned && owedClicksRef.current === 1) {
      start.turned = true;
      turnedAtRef.current = performance.now();
      noteOwed(-1);
      if (!start.scrolled) stepZone(start.zone);
      return;
    }
    if (owedClicksRef.current > 0) {
      noteOwed(-1);
      return;
    }
    // The phone's extra click can land after the sentence has moved, on the
    // same spot, and step forward. That undoes the back tap. A mouse click
    // somewhere else still turns.
    if (ghostClick(e.clientX, e.clientY)) return;
    if (turnedAtRef.current > 0 && performance.now() - turnedAtRef.current < GHOST_MOUSE_MS) {
      return;
    }
    turnAt(e.clientX, e.clientY);
  }

  const pane = (
    <div
      ref={turnHostRef}
      data-reader-text
      data-swallow-owed="0"
      className={cn("reader-turn relative flex min-h-0 flex-1", !together && "reader-turn-bleed")}
      onPointerDownCapture={beginTurn}
      onPointerMoveCapture={moveTurn}
      onPointerUpCapture={endTurn}
      onPointerCancelCapture={cancelTurn}
      onClickCapture={onTurnClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        data-turn="prev"
        tabIndex={-1}
        aria-label="Previous sentence"
        className={cn(
          "absolute top-0 z-10 cursor-w-resize",
          overflows ? "left-0 h-full w-1/3" : "inset-x-0",
        )}
        style={overflows ? undefined : { height: Math.max(0, prevZonePx) }}
        onMouseDown={(e) => e.preventDefault()}
      />
      <button
        type="button"
        data-turn="next"
        tabIndex={-1}
        aria-label="Next sentence"
        className={cn(
          "absolute z-10 cursor-e-resize",
          overflows ? "top-0 right-0 h-full w-2/3" : "inset-x-0 bottom-0",
        )}
        style={overflows ? undefined : { top: Math.max(0, prevZonePx) }}
        onMouseDown={(e) => e.preventDefault()}
      />

      <div
        ref={readingPaneRef}
        className={cn("reading-pane z-0", centerOn && "reading-pane-centered")}
      >
        {showPalimpsest ? <p className="palimpsest font-display">{palimpsest}</p> : null}
        {centerOn ? (
          <div ref={trackRef} className="center-track">
            <div ref={topPadRef} className="center-pad" aria-hidden />
            <div className="center-lines">
              <div ref={lookbackSlotRef} className="lookback-slot" aria-hidden>
                {readLines}
              </div>
              <div ref={breathSlotRef} className={breathClass}>
                {currentLine}
              </div>
              <div ref={upcomingSlotRef} className="upcoming-slot" aria-hidden>
                {previewLines}
              </div>
            </div>
            <div ref={bottomPadRef} className="center-pad" aria-hidden />
          </div>
        ) : (
          /* bottom-anchor */
          <>
            <div ref={lookbackSlotRef} className="lookback-slot" aria-hidden>
              {readLines}
            </div>
            <div ref={breathSlotRef} className={breathClass}>
              {currentLine}
            </div>
            {/* bottom-anchor-end */}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "frame-screen reader-frame bg-paper text-ink",
        daylight.className,
        together && "together-lock",
        still && "still",
      )}
      style={daylight.style}
      data-daylight={daylight.active ? daylight.sample.phase : "off"}
      data-center-line={centerOn ? "on" : "off"}
      data-bound={workIsComplete(work.id) ? "full" : "opening"}
      data-breath-index={index}
      data-breath-count={work.breaths.length}
    >
      <h1 className="sr-only">{work.title}</h1>
      {together && pair ? (
        <TogetherShell
          pair={pair}
          place={nightChrome || placeLabel}
          breathIndex={index}
          workId={work.id}
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
              {nightChrome || placeLabel}
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
              <button
                type="button"
                role="switch"
                aria-checked={daylight.enabled}
                onClick={() => daylight.setEnabled(!daylight.enabled)}
                className="daylight-switch"
              >
                <span>Daylight colors</span>
                <span aria-hidden="true">{daylight.enabled ? "On" : "Off"}</span>
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={centerLine.enabled}
                onClick={() => centerLine.setEnabled(!centerLine.enabled)}
                className="daylight-switch"
              >
                <span>Center the line</span>
                <span aria-hidden="true">{centerLine.enabled ? "On" : "Off"}</span>
              </button>
            </div>
          ) : null}
          <footer
            className="relative z-30 flex shrink-0 items-stretch"
            data-reader-bar={still ? "closed" : "open"}
          >
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
            {device ? null : <FavoriteMark workId={work.id} className="border-r border-ink" />}
            {device ? null : isKept ? (
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
                <div className="kept-dots flex min-w-0 flex-1 items-center gap-1 overflow-x-auto bg-paper px-2">
                  {kept.map((entry, dot) => {
                    const id = keptBreathId(entry);
                    if (!id) return null;
                    return (
                      <button
                        key={`${id}-${dot}`}
                        type="button"
                        aria-label="Return to a kept sentence"
                        onClick={() => void jumpKept(entry)}
                        className={cn(
                          "size-2.5 shrink-0",
                          id === breath.id ? "bg-ink" : "bg-red",
                        )}
                      />
                    );
                  })}
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
                {gateMode === "full" && !device ? (
                  <p className="mt-8 type-kicker text-muted">Read with a friend?</p>
                ) : null}
              </div>
              {gateMode === "full" && !device ? (
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
            <h2 className="veil-title">{placeLabel}</h2>
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
            {spine.map((item) => {
              const word = progress?.keywords[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.open}
                  onClick={() => {
                    if (!item.open) return;
                    setOverlay("none");
                    goTo(item.start);
                  }}
                  className={cn("veil-room", !item.open && "opacity-40")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-block size-2.5 shrink-0",
                        item.current
                          ? fillClass(planeOf(item.id))
                          : item.open
                            ? "bg-ink"
                            : "bg-paper-deep",
                      )}
                    />
                    <span className="type-lede">{item.place}</span>
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
            <h2 className="veil-title">{placeLabel}</h2>
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

export const ChamberReader = TbrReader;
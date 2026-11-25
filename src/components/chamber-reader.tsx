import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { adoptFrameIndex, bootShouldKeepPlace, firstPaintIndex, pendingLinkAt, savedSentenceAt } from "@/lib/deep-link-breath";
import { noteUserMove, readUserMove, tapOwnsVisit } from "@/lib/place-guard";
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
import { bindHash, reanchorProgress, shouldLoadBindRemap } from "@/lib/rebind-guard";
import { anchorKeptLine, keptBreathId, keptIncludes, type KeptStored } from "@/lib/kept-lines";
import { chapterPlace, spineChapters } from "@/lib/spine-nav";
import { useTbr } from "@/lib/store";
import { fillClass, planeOf, type Fill } from "@/lib/mondrian";
import { readerIntro } from "@/lib/reader-intro";
import { isSectionBreak, splitEmphasis } from "@/lib/emphasized-text";
import { openSitInProgress, shouldShowPreface } from "@/lib/reader-threshold";
import { FavoriteMark } from "@/components/favorite-mark";
import { PlaceChip } from "@/components/place-chip";
import { Hourglass } from "@/components/hourglass";
import { ReadingProgress } from "@/components/reading-progress";
import { closedReaderBar, reduceReaderBar, type ReaderBarState } from "@/lib/reader-chrome";
import { TogetherShell } from "@/components/sitting-room";
import { CLAP_WINDOW_MS, isSilentClap, type TapPoint } from "@/lib/multiplayer/together-bond";
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
import {
  SIT_PRESETS,
  asSittingMinutes,
  formatSitClock,
  nearestSitPreset,
  sitLabel,
} from "@/lib/sitting";
import { SalonCardShare } from "@/components/salon-card-share";
import { creditLine } from "@/lib/credit-line";
import {
  decodeEchoInvite,
  findEchoBreath,
  pairTogetherKeep,
} from "@/lib/together-keep";
import { decodeHostedSit } from "@/lib/hosted-sit";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { useReaderDaylight } from "@/lib/use-reader-daylight";
import { displayKindForForm, displayLinePx, measureStyledHeight } from "@/lib/display-blocks";
import { breathSentenceCount } from "@/lib/sentence-step";
import {
  countFocusRows,
  groupCovering,
  liftShortWindow,
  locateSpotlight,
  markSpotlight,
  paintFocusRows,
  repeatSpotlight,
  spotlightKey,
  spotlightNear,
  stepSpotlight,
  type GroupsAt,
  type SpotlightGroup,
  type SpotlightMark,
  type SpotlightQuery,
} from "@/lib/spotlight";
import { cutsForWork, stopsForWork } from "@/lib/catalog/merge-stop-index";
import { chapterStartOffsets, readingLength } from "@/lib/reading-progress";
import { columnMetricsNow, useDisplayBlocks } from "@/lib/use-display-blocks";
import { FittedCopy } from "@/components/fitted-copy";
import {
  breathTooTall,
  CENTER_LINE_ANCHOR,
  centerLineOffset,
  focusAnchorPx,
  focusBands,
  upcomingBreaths,
} from "@/lib/center-line";
import {
  classifyTurnGesture,
  coastFromSamples,
  GHOST_MOUSE_MS,
  ghostMousePointer,
  HOLD_ARM_MS,
  holdStepIntervalMs,
  SCROLL_ARM_PX,
  TAP_SLOP_PX,
  turnZone,
} from "@/lib/reader-turn";
import { useCenterLine } from "@/lib/use-center-line";
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN, TEXT_SIZE_STEP } from "@/lib/text-size";
import { useTextSize } from "@/lib/use-text-size";

type Overlay =
  | "none"
  | "threshold"
  | "reentry"
  | "spine"
  | "sitting-end"
  | "end"
  | "send";

const LOOKBACK = 12;

/**
 * Every sentence is painted the same. The fixed bands, not these nodes,
 * decide what is faded, sharp, or washed. `markFocus` is off on the blur
 * mirror so the document only has one current sentence.
 */
function PassagePieces({
  pieces,
  focusIndex,
  markFocus = true,
}: {
  pieces: readonly SpotlightMark[];
  focusIndex: number;
  markFocus?: boolean;
}) {
  return pieces.map((piece, pi) => (
    <span
      key={pi}
      className="breath-sentence"
      data-sentence-index={piece.role === "focus" ? focusIndex : `${piece.role}-${pi}`}
      data-focus-sentence={markFocus && piece.role === "focus" ? "" : undefined}
    >
      <EmphasizedText text={piece.text} />
    </span>
  ));
}

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

const MIRROR_INK = ".look-line, .breath-now, .breath-block, .breath-sentence, .section-break, em";

/**
 * The blur mirror is a shadow tree. Daylight selectors in the light DOM do
 * not reach it, and WebKit paints an inherited color black once `filter`
 * is set. Stamp the sharp band's resolved ink onto the filtered text.
 */
function paintMirrorInk(clone: HTMLElement, source: HTMLElement, host: HTMLElement) {
  const live = source.querySelector<HTMLElement>(".look-line, .breath-now, .breath-sentence");
  const ink = getComputedStyle(live ?? source).color;
  if (!ink || clone.dataset.mirrorInk === ink) return;
  clone.dataset.mirrorInk = ink;
  host.dataset.mirrorInk = ink;
  const apply = (node: HTMLElement) => {
    node.style.color = ink;
    node.style.setProperty("-webkit-text-fill-color", ink);
  };
  apply(clone);
  for (const node of clone.querySelectorAll<HTMLElement>(MIRROR_INK)) apply(node);
}

/** Negative margin that lets the column run under chrome. Positive margins are not bleed. */
function columnBleed(host: HTMLElement | null): { top: number; bottom: number } {
  if (!host) return { top: 0, bottom: 0 };
  const style = getComputedStyle(host);
  const top = Number.parseFloat(style.marginTop);
  const bottom = Number.parseFloat(style.marginBottom);
  return {
    top: Number.isFinite(top) && top < 0 ? -top : 0,
    bottom: Number.isFinite(bottom) && bottom < 0 ? -bottom : 0,
  };
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
  const [sendResult, setSendResult] = useState<"shared" | "copied" | "downloaded" | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [bar, setBar] = useState<ReaderBarState>(closedReaderBar);
  const still = bar.still;
  const navReveal = bar.navReveal;
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
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
  const textSize = useTextSize();
  const turnHostRef = useRef<HTMLDivElement>(null);
  const togetherClapRef = useRef<(breath: number) => void>(() => {});
  const pendingTapRef = useRef<TapPoint | null>(null);
  const pendingTapTimerRef = useRef(0);
  const stepZoneRef = useRef<(zone: "prev" | "next" | null) => void>(() => {});
  useEffect(
    () => () => {
      if (pendingTapTimerRef.current) window.clearTimeout(pendingTapTimerRef.current);
    },
    [],
  );
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
    /** This finger landed while a fling was running, or within the quiet after one. */
    stoppedMomentum: boolean;
    zone: "prev" | "next" | null;
    vy?: number;
    sampleT?: number;
  } | null>(null);
  /** Pending press-and-hold. Cleared on release so the repeat stops on that frame. */
  const holdTimerRef = useRef(0);
  useEffect(
    () => () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    },
    [],
  );
  /** Clicks owed to pointer gestures. Each one is swallowed, not turned. */
  const owedClicksRef = useRef(0);
  /** When a pointer gesture last turned. A click in this window is that finger. */
  const turnedAtRef = useRef(0);
  /** Last real touch, so the synthesized mouse that follows is ignored. */
  const lastTouchAtRef = useRef(0);
  const lastTouchPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchZoneRef = useRef<"prev" | "next" | null>(null);
  /** Nav Prev/Next: one step per finger, even when iOS never fires click. */
  const navGestureRef = useRef<number | null>(null);
  const navTouchAtRef = useRef(0);
  const touchPlacesRef = useRef<{ x: number; y: number; t: number }[]>([]);
  /**
   * The page split is the left third, not the focus line. This only records
   * whether the sentence is taller than the column. The sentence index comes
   * from the store, never from how far the column has scrolled.
   */
  const zoneRef = useRef<{ tall: boolean; split: number; ready: boolean }>({
    tall: false,
    split: 0,
    ready: false,
  });
  /** While the sentence is still sliding, a tap still uses the side it landed on. */
  const slidingUntilRef = useRef(0);
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const booted = useRef(false);
  /** False until boot writes `at` into the store, so the first paint is that breath. */
  const linkApplied = useRef(false);
  /**
   * A tap can land while boot is still waiting for the saved place.
   * Hydration then replaces the store, which used to wipe that tap and
   * leave the frame on breath 0. The place is applied again after hydration.
   */
  const steppedPlace = useRef<number | null>(null);
  /** A real tap owns the breath. A later full bind must not jump back to `?at=`. */
  const userStepped = useRef(false);
  const seenBreaths = useRef(0);
  /** Share link past the opening excerpt. Applied when the rest of the book arrives. */
  const awaitingAt = useRef<number | null>(
    typeof at === "number" && Number.isFinite(at) && at >= 0 ? Math.floor(at) : null,
  );
  const breathSlotRef = useRef<HTMLDivElement>(null);
  const breathLineRef = useRef<HTMLDivElement>(null);
  const lookbackSlotRef = useRef<HTMLDivElement>(null);
  const readingPaneRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const flingRef = useRef(0);
  /** Real scroll positions, from scroll events. The newest is the coast signal. */
  const motionRef = useRef<{ t: number; top: number }[]>([]);
  const scrollLockRef = useRef(false);
  const scrollIgnoreUntilRef = useRef(0);
  /** scrollTop last written to keep the sentence in the sharp band. */
  const anchoredScrollRef = useRef<number | null>(null);
  /** A finger or wheel scroll owns the column. Taps clear it and recenter. */
  const userScrolledRef = useRef(false);
  const placeTokenRef = useRef(0);
  /** The next place() is a text-size change and must settle after reflow. */
  const resizeAnchorRef = useRef(false);
  const anchorGenRef = useRef(0);
  const stickSentenceRef = useRef<() => number>(() => 0);
  const appliedTokenRef = useRef(-1);
  const blurHostRef = useRef<HTMLDivElement>(null);
  const blurRootRef = useRef<ShadowRoot | null>(null);
  const blurSigRef = useRef("");
  const upcomingSlotRef = useRef<HTMLDivElement>(null);
  const placedIndex = useRef<{ index: number; cursor: number; window: number } | null>(null);
  /**
   * Which sentence of the current breath the spotlight starts on.
   * A saved place still opens on that sentence. A long sentence also
   * keeps a window, so a reload can return to the same lines.
   */
  const openingCursor = savedSentenceAt(
    progress,
    firstPaintIndex({
      at,
      breathCount: work.breaths.length,
      storedIndex: progress?.breathIndex ?? 0,
      linkApplied: linkApplied.current,
    }),
  ) ?? 0;
  const cursorRef = useRef(openingCursor);
  const [cursor, setCursor] = useState(openingCursor);
  const windowRef = useRef(0);
  const [spotWindow, setSpotWindow] = useState(0);
  /** First character of the passage on screen. A reflow keeps those words lit. */
  const litAnchor = useRef<{ index: number; start: number } | null>(null);
  const anchorPlace = useRef("");
  const paintedGroupRef = useRef<SpotlightGroup | null>(null);
  const ownedIndexRef = useRef<number | null>(null);
  /** Sentence a tap landed on. A store flicker must not drop it. */
  const sentenceOwned = useRef<{ index: number; cursor: number; window: number } | null>(null);
  const groupCache = useRef(new Map<string, SpotlightGroup[]>());
  const sceneCache = useRef(new Map<string, { index: number; text: string }[]>());
  const groupCacheKey = useRef("");
  const groupsAtRef = useRef<GroupsAt>(() => []);
  /** A tap or a hold step, so the column slides. A spine jump does not. */
  const stepPulse = useRef(false);
  const motionArmed = useRef(false);
  /** Height of the breath just read, plus the gap under it. Advance travels up by this. */
  const lastTravel = useRef(0);

  function fullBind(book: Work) {
    if (isDeviceImport(book.id)) return book.breaths.length > 0;
    if (workIsComplete(book.id)) return true;
    const shelf = shelfWork(book.id);
    return shelf?.breaths != null && shelf.breaths === book.breaths.length;
  }

  const editionHash = useMemo(
    () => (fullBind(work) ? bindHash(work.breaths) : ""),
    [work],
  );

  function stampAt(book: Work, index: number) {
    if (!fullBind(book) || index < 0 || index >= book.breaths.length) return undefined;
    return {
      breathId: book.breaths[index]?.id ?? "",
      breathCount: book.breaths.length,
      bindHash: editionHash,
    };
  }

  /**
   * A tap during the opening still names the breath. The full book can then
   * follow that id. Stamping the short count on every boot write would scale
   * a saved place; only a tap takes this stamp.
   */
  function stampTap(book: Work, index: number, sentence?: number) {
    if (index < 0 || index >= book.breaths.length) return undefined;
    const breathId = book.breaths[index]?.id ?? "";
    const sentenceAt = typeof sentence === "number" && sentence >= 0 ? Math.floor(sentence) : undefined;
    const base = breathId
      ? {
          breathId,
          breathCount: book.breaths.length,
          bindHash: fullBind(book) ? editionHash : "",
        }
      : stampAt(book, index);
    if (!base) return undefined;
    return sentenceAt == null ? base : { ...base, sentenceAt };
  }

  useLayoutEffect(() => {
    let cancel = false;
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
      // A tap owns its breath. Follow that id into the full book, and do not
      // scale an opening index or jump back to the link.
      if (userStepped.current) {
        const id = prior.breathId?.trim() ?? "";
        if (!id) return;
        const found = book.breaths.findIndex((breath) => breath.id === id);
        if (found < 0 || found === prior.breathIndex) return;
        useTbr.getState().setBreath(book.id, found, stampAt(book, found));
        return;
      }
      let remap = readBreathRemap();
      if (shouldLoadBindRemap(prior, book.breaths, book.id) && !breathRemapLoaded()) {
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

    const placeNow = () => useTbr.getState().progress[work.id]?.breathIndex ?? 0;

    void (async () => {
      const href = `${window.location.pathname}${window.location.search}`;
      const visit = readUserMove();
      if (visit && tapOwnsVisit(visit, work.id, href) && steppedPlace.current === null) {
        userStepped.current = true;
        awaitingAt.current = null;
        steppedPlace.current = visit.index;
      }
      if (!useTbr.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useTbr.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
          if (useTbr.persist.hasHydrated()) {
            unsub();
            resolve();
          }
        });
      }
      if (cancel) return;
      // A tap during the hydration wait already chose a breath. Hydration
      // replaces the store, so write that breath again or the frame falls
      // back to 0 while the catalog walk is still on the old page.
      const tappedDuringBoot = steppedPlace.current;
      if (tappedDuringBoot !== null && tappedDuringBoot >= 0 && tappedDuringBoot < work.breaths.length) {
        booted.current = true;
        awaitingAt.current = null;
        const owned = readUserMove();
        const ownedHere =
          owned && owned.workId === work.id && owned.index === tappedDuringBoot ? owned : null;
        if (ownedHere) useTbr.getState().stampUserMove(work.id, ownedHere.at);
        setBreath(
          work.id,
          tappedDuringBoot,
          stampTap(work, tappedDuringBoot, ownedHere ? ownedHere.cursor : undefined),
        );
        if (ownedHere) rememberSentence(ownedHere.index, ownedHere.cursor);
        linkApplied.current = true;
        startSitting(work.id);
        setShowPreface(false);
        setOverlay("none");
        return;
      }
      // Snapshot after hydration. A tap during a later await moves this.
      // Hydration itself is not a tap, and must not count as one.
      const settledAt = placeNow();
      const tappedSinceHydration = () =>
        userStepped.current ||
        bootShouldKeepPlace(settledAt, placeNow()) ||
        steppedPlace.current !== null;
      ensure(work.id);
      if (sit !== undefined) {
        useTbr.getState().setSittingMinutes(sit);
      }
      // The opening sit is already on the prose. When the full novel arrives,
      // breath 0 can be a publication note or dedication. Nudge a fresh start
      // past that leading front matter only — do not re-apply chapter jumps,
      // and do not move a saved index that is already on the prose.
      if (booted.current) {
        const waiting = awaitingAt.current;
        if (grew && waiting !== null && waiting < work.breaths.length) {
          if (cancel) return;
          const tapped = tappedSinceHydration();
          awaitingAt.current = null;
          startSitting(work.id);
          if (!tapped) setBreath(work.id, waiting, stampAt(work, waiting));
          if (!tapped || userStepped.current || steppedPlace.current !== null) linkApplied.current = true;
          setShowPreface(false);
          setOverlay("none");
          return;
        }
        // The shell can boot before the route search arrives. A later `at`
        // still has to land on that breath and take the sit gate down.
        // A tap that already left the hydrated place is kept.
        if (!linkApplied.current && deepLink !== null) {
          if (cancel) return;
          const tapped = tappedSinceHydration();
          awaitingAt.current = null;
          startSitting(work.id);
          if (!tapped) setBreath(work.id, deepLink, stampAt(work, deepLink));
          if (!tapped || userStepped.current || steppedPlace.current !== null) linkApplied.current = true;
          setShowPreface(false);
          setOverlay("none");
          return;
        }
        if (grew && !shuffle && deepLink === null) {
          await settlePlace(work);
          if (cancel) return;
          if (!userStepped.current) {
            const index = useTbr.getState().progress[work.id]?.breathIndex ?? 0;
            const frontAt = openingBreathIndex(work);
            if (index < frontAt) setBreath(work.id, frontAt, stampAt(work, frontAt));
          }
        }
        return;
      }
      if (!shuffle && deepLink === null) await settlePlace(work);
      if (cancel) return;
      const movedWhileSettling = tappedSinceHydration();
      booted.current = true;
      const prior = useTbr.getState().progress[work.id];
      const firstSit = shouldShowPreface(prior);
      setShowPreface(firstSit);
      if (shuffle) {
        linkApplied.current = true;
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
        if (!movedWhileSettling) setBreath(work.id, deepLink, stampAt(work, deepLink));
        if (!movedWhileSettling || userStepped.current || steppedPlace.current !== null) {
          linkApplied.current = true;
        }
        setShowPreface(false);
        setOverlay("none");
        return;
      }
      // A reload mid-sit (service worker, or a new build) keeps this breath.
      // The clock stays. A book with no open sit still asks how long.
      if (openSitInProgress(prior)) {
        setShowPreface(false);
        setOverlay("none");
        return;
      }
      const chapterAt = chapterStartIndex(work);
      const startAt = Math.max(chapterAt, openingBreathIndex(work));
      const index = prior?.breathIndex ?? 0;
      if (!movedWhileSettling && (!prior?.entered || index < startAt)) {
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

  // The frame paints `?at=` only while the link is unapplied. If boot marks
  // the link applied without writing the store, the next paint is breath 0
  // and a chapter past the opening (Banjo at 314) stays on chapter I.
  useLayoutEffect(() => {
    if (userStepped.current || steppedPlace.current !== null) return;
    const href = `${window.location.pathname}${window.location.search}`;
    const visit = readUserMove();
    if (visit && tapOwnsVisit(visit, work.id, href)) {
      userStepped.current = true;
      awaitingAt.current = null;
      if ((useTbr.getState().progress[work.id]?.breathIndex ?? 0) === visit.index) {
        linkApplied.current = true;
      }
      return;
    }
    const want = pendingLinkAt(at, work.breaths.length);
    if (want === null) return;
    if (liveIndex() !== want) setBreath(work.id, want, stampAt(work, want));
    if (liveIndex() === want) linkApplied.current = true;
    setShowPreface(false);
    setOverlay("none");
  }, [at, setBreath, work]);

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
  const index = firstPaintIndex({
    at,
    breathCount: work.breaths.length,
    storedIndex: progress?.breathIndex ?? 0,
    linkApplied: linkApplied.current,
  });
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
  const displayTexts = useMemo(() => {
    const list: string[] = [];
    if (breath) list.push(breath.text);
    for (const item of lookback) list.push(item.text);
    for (const item of upcoming) list.push(item.text);
    return list;
  }, [breath, lookback, upcoming]);
  const kept = progress?.kept ?? [];
  const isKept = breath ? keptIncludes(kept, breath.id) : false;
  const displayKind = displayKindForForm(shelfWork(work.id)?.form);
  const mergeStops = useMemo(() => stopsForWork(work.id), [work.id]);
  const mergeCuts = useMemo(() => cutsForWork(work.id), [work.id]);
  const mergeStopKey = `${mergeStops ? [...mergeStops].join(",") : ""}|${mergeCuts ? [...mergeCuts].map(([index, end]) => `${index}:${end}`).join(",") : ""}`;
  const display = useDisplayBlocks(
    breathLineRef,
    displayTexts,
    `${together ? 1 : 0}:${centerOn ? 1 : 0}:${isKept ? 1 : 0}:${index}:${textSize.scale.toFixed(2)}`,
    displayKind,
  );
  const metricsCacheKey = `${display.metricsKey}|${display.limit}|${display.linePx}|${displayKind}|${work.breaths.length}|${work.breaths[0]?.id ?? ""}|${mergeStopKey}`;
  if (groupCacheKey.current !== metricsCacheKey) {
    groupCacheKey.current = metricsCacheKey;
    groupCache.current.clear();
    sceneCache.current.clear();
  }
  function sceneBreaths(sceneId: string) {
    const hit = sceneCache.current.get(sceneId);
    if (hit) return hit;
    const scene: { index: number; text: string }[] = [];
    for (let i = 0; i < work.breaths.length; i += 1) {
      const breathAt = work.breaths[i];
      if (breathAt?.sceneId === sceneId) scene.push({ index: i, text: breathAt.text });
    }
    sceneCache.current.set(sceneId, scene);
    return scene;
  }
  function groupsAt(breathIndex: number, query?: SpotlightQuery): readonly SpotlightGroup[] {
    const item = work.breaths[breathIndex];
    if (!item) return [];
    const edge = query?.edge ?? "around";
    const cursor = query?.cursor ?? 0;
    const spot = query?.window ?? 0;
    const after = query?.after ?? (edge === "around" ? 1 : 0);
    const metrics = columnMetricsNow(breathLineRef.current, display.metrics);
    const limit = metrics?.limit || display.limit;
    const linePx = metrics ? displayLinePx(metrics) : display.linePx;
    const measure = (text: string) => (metrics ? measureStyledHeight(text, metrics) : display.measure(text));
    const key = `${metricsCacheKey}|${metrics?.viewport ?? 0}|${limit}|${edge}|${item.sceneId}|${breathIndex}|${cursor}|${spot}|${after}`;
    const hit = groupCache.current.get(key);
    if (hit) return hit;
    const countRows = (text: string, start: number, end: number) => {
      if (metrics) return countFocusRows(text, start, end, metrics, displayKind);
      const line = linePx > 0 ? linePx : 1;
      const lines = Math.ceil(measure(text.slice(start, end)) / line);
      return lines + (start > 0 ? 1 : 0);
    };
    const groups = spotlightNear(
      sceneBreaths(item.sceneId),
      { index: breathIndex, cursor, window: spot },
      measure,
      limit,
      linePx,
      displayKind,
      mergeStops,
      mergeCuts,
      edge,
      after,
      countRows,
    );
    groupCache.current.set(key, groups);
    return groups;
  }
  groupsAtRef.current = groupsAt;
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

  function markUserPlace(index: number, cursor: number, spotWindow = windowRef.current) {
    const atMs = Date.now();
    noteUserMove({
      workId: work.id,
      index,
      cursor,
      window: spotWindow,
      at: atMs,
      href: `${window.location.pathname}${window.location.search}`,
      breathId: work.breaths[index]?.id ?? "",
    });
    useTbr.getState().stampUserMove(work.id, atMs);
    useTbr.getState().setSentenceAt(work.id, index, cursor, spotWindow);
  }

  function goTo(next: number, sentence = 0, reading = false) {
    if (next < 0 || next >= work.breaths.length) return;
    markUserPlace(next, sentence);
    const at = liveIndex();
    const from = work.breaths[at];
    const to = work.breaths[next];
    // A forward step is active reading, including a group that covers more
    // than one breath. Retreats, jumps, and scrolling the line do not add time.
    // The index is read from the store so a second tap in the same frame moves again.
    if (reading ? next > at : next === at + 1) {
      advanceBreath(work.id, next, {
        crossedScene: Boolean(from && to && from.sceneId !== to.sceneId),
        place: stampTap(work, next, sentence),
      });
    } else setBreath(work.id, next, stampTap(work, next, sentence));
  }

  function rememberSentence(nextIndex: number, nextCursor: number, nextWindow = 0) {
    ownedIndexRef.current = nextIndex;
    sentenceOwned.current = { index: nextIndex, cursor: nextCursor, window: nextWindow };
    cursorRef.current = nextCursor;
    windowRef.current = nextWindow;
    setCursor(nextCursor);
    setSpotWindow(nextWindow);
  }

  /** The tap owns the breath. A later full bind must not write `?at=` back. */
  function ownTap() {
    userStepped.current = true;
    linkApplied.current = true;
    awaitingAt.current = null;
  }

  function stepBy(delta: 1 | -1) {
    if (overlayRef.current !== "none") return;
    const frameRaw = Number(
      turnHostRef.current?.closest(".reader-frame")?.getAttribute("data-breath-index"),
    );
    const at = adoptFrameIndex({
      storeIndex: liveIndex(),
      frameIndex: Number.isFinite(frameRaw) ? frameRaw : null,
      linkApplied: linkApplied.current,
      breathCount: work.breaths.length,
    });
    if (at !== liveIndex()) setBreath(work.id, at, stampTap(work, at));
    const moved = stepSpotlight({
      place: { index: at, cursor: cursorRef.current, window: windowRef.current },
      delta,
      groupsAt: groupsAtRef.current,
      breathCount: work.breaths.length,
    });
    if (moved === "start") {
      ownTap();
      markUserPlace(at, cursorRef.current, windowRef.current);
      return;
    }
    if (moved === "end") {
      ownTap();
      markUserPlace(at, cursorRef.current, windowRef.current);
      if (delta > 0 && workIsComplete(work.id)) {
        complete(work.id);
        setOverlay("end");
      }
      return;
    }
    ownTap();
    stepPulse.current = true;
    userScrolledRef.current = false;
    placeTokenRef.current += 1;
    if (!booted.current) steppedPlace.current = moved.index;
    rememberSentence(moved.index, moved.cursor, moved.window);
    if (moved.index !== at) goTo(moved.index, moved.cursor, moved.index > at);
    else {
      markUserPlace(moved.index, moved.cursor, moved.window);
      if (delta > 0) useTbr.getState().creditReadingStep(work.id);
    }
  }

  function advance() {
    stepBy(1);
  }

  function retreat() {
    stepBy(-1);
  }

  useLayoutEffect(() => {
    const href = `${window.location.pathname}${window.location.search}`;
    const visit = readUserMove();
    if (visit && tapOwnsVisit(visit, work.id, href) && visit.index === index) {
      ownedIndexRef.current = index;
      const visitWindow = visit.window ?? 0;
      sentenceOwned.current = { index: visit.index, cursor: visit.cursor, window: visitWindow };
      if (cursorRef.current !== visit.cursor || windowRef.current !== visitWindow) {
        cursorRef.current = visit.cursor;
        windowRef.current = visitWindow;
        setCursor(visit.cursor);
        setSpotWindow(visitWindow);
      }
      return;
    }
    const saved = savedSentenceAt(progress, index);
    if (saved != null) {
      const savedWindow =
        progress?.breathIndex === index && typeof progress.sentenceWindow === "number"
          ? Math.max(0, Math.floor(progress.sentenceWindow))
          : 0;
      ownedIndexRef.current = index;
      sentenceOwned.current = { index, cursor: saved, window: savedWindow };
      if (cursorRef.current !== saved || windowRef.current !== savedWindow) {
        cursorRef.current = saved;
        windowRef.current = savedWindow;
        setCursor(saved);
        setSpotWindow(savedWindow);
      }
      return;
    }
    const owned = sentenceOwned.current;
    if (userStepped.current && owned && owned.index === index) {
      ownedIndexRef.current = index;
      if (cursorRef.current !== owned.cursor || windowRef.current !== owned.window) {
        cursorRef.current = owned.cursor;
        windowRef.current = owned.window;
        setCursor(owned.cursor);
        setSpotWindow(owned.window);
      }
      return;
    }
    if (ownedIndexRef.current === index) return;
    ownedIndexRef.current = index;
    if (cursorRef.current !== 0 || windowRef.current !== 0) {
      cursorRef.current = 0;
      windowRef.current = 0;
      setCursor(0);
      setSpotWindow(0);
    }
  }, [index, progress, work.id]);

  useLayoutEffect(() => {
    const frame = breathLineRef.current?.closest(".reader-frame");
    if (!(frame instanceof HTMLElement)) return;
    const host = frame as HTMLElement & {
      spotlightStep?: (
        delta: 1 | -1,
        steps?: number,
      ) => ReturnType<typeof repeatSpotlight>;
    };
    host.spotlightStep = (delta, steps = 1) =>
      repeatSpotlight(
        { index: liveIndex(), cursor: cursorRef.current, window: windowRef.current },
        delta < 0 ? -1 : 1,
        steps,
        groupsAtRef.current,
        work.breaths.length,
      );
    return () => {
      delete host.spotlightStep;
    };
  });

  useLayoutEffect(() => {
    const group = paintedGroupRef.current;
    const part = group?.parts[0];
    if (!part || !group) return;
    const place = `${index}:${cursor}:${spotWindow}`;
    if (anchorPlace.current === place) return;
    anchorPlace.current = place;
    const held = litAnchor.current;
    if (held && group.parts.some((p) => p.index === held.index && p.start <= held.start && p.end > held.start)) {
      return;
    }
    litAnchor.current = { index: part.index, start: part.start };
  }, [index, cursor, spotWindow]);

  useLayoutEffect(() => {
    const anchor = litAnchor.current;
    if (!anchor || !display.metrics) return;
    const item = work.breaths[anchor.index];
    if (!item) return;
    const countRows = (text: string, start: number, end: number) =>
      countFocusRows(text, start, end, display.metrics!, displayKind);
    const placeIndex = liveIndex();
    const groups = spotlightNear(
      sceneBreaths(item.sceneId),
      { index: placeIndex, cursor: cursorRef.current, window: windowRef.current },
      display.measure,
      display.limit,
      display.linePx,
      displayKind,
      mergeStops,
      mergeCuts,
      "around",
      1,
      countRows,
    );
    const hit = groupCovering(groups, anchor.index, anchor.start);
    if (!hit) return;
    const at = locateSpotlight(groups, placeIndex, cursorRef.current, windowRef.current);
    const located = groups[at];
    if (located && groupCovering([located], anchor.index, anchor.start)) return;
    // A link can open a sentence inside a window that starts on the previous
    // breath. That sentence stays put. A resize only rewrites a window of the
    // same breath, so the next tap is not aimed at a slice that moved.
    if (hit.index !== placeIndex) return;
    if (hit.cursor === cursorRef.current && hit.window === windowRef.current) return;
    rememberSentence(hit.index, hit.cursor, hit.window);
    markUserPlace(hit.index, hit.cursor, hit.window);
  }, [metricsCacheKey]);

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
    const { shareQuoteCard } = await import("@/lib/quote-share");
    const result = await shareQuoteCard({
      workId: work.id,
      at: index,
      text: breath.text,
      title: work.title,
      author: work.author,
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
    if (result === "shared" || result === "copied" || result === "downloaded") {
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
    else {
      markUserPlace(anchor.index, 0);
      setBreath(work.id, anchor.index, stampAt(work, anchor.index));
    }
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
    // A size change reflows the column. Stick to the sentence already in
    // the sharp band instead of letting that reflow become a scroll.
    // This runs in the same turn as the font change, before the next read.
    placeTokenRef.current += 1;
    userScrolledRef.current = false;
    resizeAnchorRef.current = true;
    let delta = stickSentenceRef.current();
    for (let pass = 0; Math.abs(delta) >= 1 && pass < 3; pass += 1) {
      delta = stickSentenceRef.current();
    }
    const gen = ++anchorGenRef.current;
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled || anchorGenRef.current !== gen) return;
      let again = stickSentenceRef.current();
      for (let pass = 0; Math.abs(again) >= 1 && pass < 2; pass += 1) {
        again = stickSentenceRef.current();
      }
      requestAnimationFrame(() => {
        if (cancelled || anchorGenRef.current !== gen) return;
        let left = stickSentenceRef.current();
        for (let pass = 0; Math.abs(left) >= 1 && pass < 2; pass += 1) {
          left = stickSentenceRef.current();
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [textSize.scale]);

  useLayoutEffect(() => {
    const slot = breathSlotRef.current;
    const stepped = stepPulse.current;
    stepPulse.current = false;
    placedIndex.current = { index, cursor, window: spotWindow };
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
      const mirrorSlot = blurRootRef.current?.querySelector<HTMLElement>(".breath-slot");
      if (mirrorSlot) mirrorSlot.scrollTop = 0;
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
        rememberZone(next);
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

    const shadowCss = () => {
      const parts: string[] = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) parts.push(rule.cssText);
        } catch {
          /* a cross-origin sheet is not the reader */
        }
      }
      return parts.join("\n");
    };

    const ensureBlurMirror = () => {
      const host = blurHostRef.current;
      const source = trackRef.current;
      if (!host || !source) return null;
      if (!blurRootRef.current || blurRootRef.current.host !== host) {
        blurRootRef.current = host.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.dataset.focusStyles = "1";
        style.textContent = shadowCss();
        blurRootRef.current.appendChild(style);
        blurSigRef.current = "";
      }
      const root = blurRootRef.current;
      const sig = source.innerHTML;
      let clone = root.querySelector<HTMLElement>(".center-track");
      if (!clone || blurSigRef.current !== sig) {
        const next = source.cloneNode(true) as HTMLElement;
        next.classList.add("focus-blur-track");
        for (const node of next.querySelectorAll("[data-focus-sentence]")) {
          node.removeAttribute("data-focus-sentence");
        }
        if (clone) clone.replaceWith(next);
        else root.appendChild(next);
        clone = next;
        blurSigRef.current = sig;
        delete clone.dataset.mirrorInk;
      }
      // A flick's scroll must not flush layout. Reading the live color here
      // makes WebKit treat the finger's lift as a tap.
      if (!clone.dataset.mirrorInk) paintMirrorInk(clone, source, host);
      host.dataset.mirrorFilter = getComputedStyle(clone).filter;
      return clone;
    };

    const syncMirror = (scrollTop: number) => {
      const mirror = ensureBlurMirror();
      if (!mirror) return;
      mirror.style.transition = "none";
      mirror.style.transform = `translate3d(0, ${-scrollTop}px, 0)`;
    };

    const place = (animate: boolean) => {
      if (!live) return;
      const line = slot.querySelector<HTMLElement>(".breath-now");
      if (!line) return;
      const height = pane.clientHeight;
      const host = turnHostRef.current;
      const bleed = columnBleed(host);
      const overlap = bleed.bottom;
      const paneTop = Number.parseFloat(getComputedStyle(pane).marginTop);
      const lead = Number.isFinite(paneTop) && paneTop < 0 ? -paneTop : 0;
      const readingHeight = Math.max(0, height - overlap - lead);
      const anchorPx = focusAnchorPx(height, overlap, CENTER_LINE_ANCHOR, lead);
      const focuses = [...line.querySelectorAll<HTMLElement>("[data-focus-sentence]")];
      let unionTop = Infinity;
      let unionBottom = -Infinity;
      for (const node of focuses) {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        unionTop = Math.min(unionTop, rect.top);
        unionBottom = Math.max(unionBottom, rect.bottom);
      }
      const unionHeight = unionBottom > unionTop ? unionBottom - unionTop : 0;
      const focus = focuses[0] ?? null;
      const alone = line.querySelectorAll("[data-sentence-index]").length <= 1;
      // A split passage centers the current sentence, not the middle of the stack.
      // Only a breath that is still one unwindowed block scrolls inside the slot.
      // The three bands stay put either way.
      const tooTall = alone && breathTooTall(line.scrollHeight, readingHeight || height);
      // The page stays one column. A tall paragraph scrolls with the rest of it.
      pane.dataset.focusTall = "0";
      const bands = focusBands(height, lead);
      const focusY = (bands.now.top + bands.now.bottom) / 2 || anchorPx;
      pane.style.setProperty("--focus-pad-top", `${Math.round(focusY)}px`);
      pane.style.setProperty("--focus-pad-bottom", `${Math.round(Math.max(0, height - focusY))}px`);
      pane.style.removeProperty("--focus-slot-max");
      ensureBlurMirror();
      landScroll();

      const flow = flowRef.current;
      const tokenMoved = placeTokenRef.current !== appliedTokenRef.current;
      const shouldStick = tokenMoved || !userScrolledRef.current;
      // Measure the sentence that is already in the sharp band and put its
      // middle back on that band. A font change reflows after the first
      // write, so the same measurement runs until the line stops moving,
      // and once more on the following frame.
      const stickSentence = () => {
        const column = flowRef.current;
        const lineNow = slot.querySelector<HTMLElement>(".breath-now");
        if (!column || !lineNow) return 0;
        void column.offsetHeight;
        const nodes = [...lineNow.querySelectorAll<HTMLElement>("[data-focus-sentence]")];
        let top = Infinity;
        let bottom = -Infinity;
        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          top = Math.min(top, rect.top);
          bottom = Math.max(bottom, rect.bottom);
        }
        const lineBox = lineNow.getBoundingClientRect();
        const targetTop = bottom > top ? top : lineBox.top;
        const targetHeight = bottom > top ? bottom - top : lineBox.height;
        const focusMid = targetTop + targetHeight / 2;
        const heightNow = pane.clientHeight;
        const paneTopNow = Number.parseFloat(getComputedStyle(pane).marginTop);
        const leadNow = Number.isFinite(paneTopNow) && paneTopNow < 0 ? -paneTopNow : 0;
        const bandsNow = focusBands(heightNow, leadNow);
        const focusYNow = (bandsNow.now.top + bandsNow.now.bottom) / 2 || focusY;
        const flowTop = column.getBoundingClientRect().top;
        const delta = focusMid - (flowTop + focusYNow);
        if (Math.abs(delta) < 1) return delta;
        const nextTop = Math.max(0, column.scrollTop + delta);
        scrollIgnoreUntilRef.current = performance.now() + 180;
        scrollLockRef.current = true;
        anchoredScrollRef.current = nextTop;
        column.scrollTop = nextTop;
        scrollLockRef.current = false;
        syncMirror(column.scrollTop);
        void column.offsetHeight;
        return delta;
      };
      stickSentenceRef.current = stickSentence;
      if (flow && shouldStick) {
        if (tokenMoved) appliedTokenRef.current = placeTokenRef.current;
        const fromResize = resizeAnchorRef.current;
        if (fromResize) resizeAnchorRef.current = false;
        let delta = stickSentence();
        for (let pass = 0; Math.abs(delta) >= 1 && pass < 3; pass += 1) {
          delta = stickSentence();
        }
        if (fromResize) {
          const gen = ++anchorGenRef.current;
          requestAnimationFrame(() => {
            if (!live || anchorGenRef.current !== gen) return;
            let again = stickSentence();
            for (let pass = 0; Math.abs(again) >= 1 && pass < 2; pass += 1) {
              again = stickSentence();
            }
            requestAnimationFrame(() => {
              if (!live || anchorGenRef.current !== gen) return;
              let left = stickSentence();
              for (let pass = 0; Math.abs(left) >= 1 && pass < 2; pass += 1) {
                left = stickSentence();
              }
            });
          });
        }
        void track.offsetHeight;
      } else if (flow) {
        syncMirror(flow.scrollTop);
        scrollLockRef.current = false;
      }
      track.dataset.ready = "1";
      const ahead = upcomingSlotRef.current;
      const aheadLine = ahead?.querySelector<HTMLElement>(".look-line");
      const landed = [...line.querySelectorAll<HTMLElement>("[data-focus-sentence]")];
      let landedTop = Infinity;
      let landedBottom = -Infinity;
      for (const node of landed) {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        landedTop = Math.min(landedTop, rect.top);
        landedBottom = Math.max(landedBottom, rect.bottom);
      }
      const lineRect =
        landedBottom > landedTop
          ? { top: landedTop, bottom: landedBottom, height: landedBottom - landedTop }
          : (focus ?? line).getBoundingClientRect();
      const gapPx = aheadLine
        ? Math.max(0, aheadLine.getBoundingClientRect().top - lineRect.bottom)
        : 10;
      lastTravel.current = lineRect.height + gapPx;
      const hostRect = host?.getBoundingClientRect();
      const focusTop = lineRect.top - (hostRect?.top ?? 0);
      const zone = hostRect
        ? Math.max(0, Math.min(Math.round(hostRect.height), Math.round(focusTop)))
        : 0;
      zoneRef.current = { tall: false, split: zone, ready: true };
      slidingUntilRef.current = 0;
      void animate;
      void reduceMotion;
      void stepped;

      const overflowsNow = tooTall || slot.scrollHeight - slot.clientHeight > 1;
      setOverflows((prev) => (prev === overflowsNow ? prev : overflowsNow));
      const end = slot.scrollHeight - slot.scrollTop - slot.clientHeight <= 2;
      setAtEnd((prev) => (prev === end ? prev : end));
      layoutSig = sigNow();
    };

    const sigNow = () => {
      const lineNow = slot.querySelector<HTMLElement>(".breath-now");
      const bleedNow = columnBleed(turnHostRef.current);
      const paneTopNow = Number.parseFloat(getComputedStyle(pane).marginTop);
      const leadNow = Number.isFinite(paneTopNow) && paneTopNow < 0 ? Math.round(-paneTopNow) : 0;
      return `${Math.round(pane.clientHeight)}:${lineNow?.clientHeight ?? 0}:${lookbackSlotRef.current?.offsetHeight ?? 0}:${upcomingSlotRef.current?.offsetHeight ?? 0}:${Math.round(bleedNow.bottom)}:${leadNow}`;
    };

    place(true);
    const flow = flowRef.current;
    let placeTimer = 0;
    const onScroll = () => {
      if (!live || !flow) return;
      syncMirror(flow.scrollTop);
      if (scrollLockRef.current) return;
      const anchored = anchoredScrollRef.current;
      const top = flow.scrollTop;
      if (anchored != null && Math.abs(top - anchored) <= 1) {
        // The tap's own recenter, even if the scroll event arrives late.
        anchoredScrollRef.current = null;
      } else {
        if (anchored != null) anchoredScrollRef.current = null;
        noteScrollMotion(top);
      }
      if (performance.now() < scrollIgnoreUntilRef.current) return;
      window.clearTimeout(placeTimer);
      placeTimer = window.setTimeout(() => {
        if (!live) return;
        const box = flow.getBoundingClientRect();
        const leadNow = Number.parseFloat(getComputedStyle(pane).marginTop);
        const leadPx = Number.isFinite(leadNow) && leadNow < 0 ? -leadNow : 0;
        const mid = box.top + (focusBands(box.height, leadPx).now.top + focusBands(box.height, leadPx).now.bottom) / 2;
        const nodes = [...flow.querySelectorAll<HTMLElement>("[data-sentence]")];
        let best: HTMLElement | null = null;
        for (const node of nodes) {
          const rect = node.getBoundingClientRect();
          if (rect.height < 2) continue;
          if (rect.top <= mid && rect.bottom >= mid) best = node;
        }
        const next = Number(best?.getAttribute("data-sentence"));
        if (!Number.isFinite(next)) return;
        userScrolledRef.current = true;
        const current = useTbr.getState().progress[work.id]?.breathIndex ?? 0;
        if (next === current) return;
        useTbr.getState().setBreath(work.id, next, stampAt(work, next));
      }, 90);
    };
    flow?.addEventListener("scroll", onScroll, { passive: true, capture: true });
    const onWheel = (event: WheelEvent) => {
      if (!flow) return;
      if (Math.abs(event.deltaY) < 1) return;
      flow.scrollTop += event.deltaY;
      event.preventDefault();
    };
    turnHostRef.current?.addEventListener("wheel", onWheel, { passive: false });
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
    const onFonts = () => {
      if (!live) return;
      // A face that arrives mid-slide has to wait out the breath, or the
      // correction cancels the step the finger just took.
      if (performance.now() < slidingUntilRef.current) {
        window.setTimeout(onFonts, Math.max(16, slidingUntilRef.current - performance.now() + 16));
        return;
      }
      place(false);
    };
    document.fonts?.addEventListener("loadingdone", onFonts);
    if (!motionArmed.current) void document.fonts?.ready.then(onFonts);
    return () => {
      live = false;
      document.fonts?.removeEventListener("loadingdone", onFonts);
      ro.disconnect();
      flow?.removeEventListener("scroll", onScroll, { capture: true });
      turnHostRef.current?.removeEventListener("wheel", onWheel);
      window.clearTimeout(placeTimer);
    };
  }, [index, cursor, spotWindow, breath?.text, together, overlay, centerOn, display.metricsKey, navReveal]);

  useLayoutEffect(() => {
    const host = blurHostRef.current;
    const root = blurRootRef.current;
    const source = trackRef.current;
    const clone = root?.querySelector<HTMLElement>(".focus-blur-track");
    if (!host || !source || !clone) return;
    paintMirrorInk(clone, source, host);
  }, [daylight.sample.ink, daylight.active]);

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

  const sentenceCount = breathSentenceCount(breath.text, displayKind);
  const atSentence = Math.min(sentenceCount - 1, Math.max(0, cursor));
  const progressLength = readingLength(work.id, work.breaths.length, shelfWork(work.id)?.breaths);
  const chapterStarts = chapterStartOffsets(work.breaths);
  const sceneGroups = groupsAt(index, { cursor: atSentence, window: spotWindow, edge: "around", after: 1 });
  const groupAt = sceneGroups.length
    ? locateSpotlight(sceneGroups, index, atSentence, spotWindow)
    : 0;
  const group = sceneGroups[groupAt];
  paintedGroupRef.current = group ?? null;
  const metricsNow = columnMetricsNow(breathLineRef.current, display.metrics);
  let shownRows = 2;
  if (group && metricsNow) {
    shownRows = 0;
    for (const part of group.parts) {
      const text = work.breaths[part.index]?.text ?? "";
      shownRows += paintFocusRows(text, part.start, part.end, metricsNow, displayKind);
    }
  }
  const sceneRows = sceneBreaths(breath.sceneId);
  const firstBreath = sceneRows[0];
  const openingPart = group?.parts[0];
  const opening = Boolean(
    group &&
      firstBreath &&
      openingPart &&
      openingPart.index === firstBreath.index &&
      openingPart.start === 0 &&
      group.window === 0,
  );
  let windowBody = group?.sample ?? "";
  if (group?.parts.length === 1 && openingPart) {
    const text = work.breaths[openingPart.index]?.text ?? "";
    windowBody = text.slice(openingPart.start, openingPart.end);
  }
  const lift = liftShortWindow({
    rows: shownRows,
    title: scene.title ?? "",
    body: windowBody,
    opening,
    titleRows: (title) => (metricsNow ? paintFocusRows(title, 0, title.length, metricsNow, displayKind) : 1),
  });
  const headerPlace =
    nightChrome ||
    (lift.lead && lift.lead.replace(/\s+/g, " ").trim() === placeLabel.replace(/\s+/g, " ").trim()
      ? work.title
      : placeLabel);
  const groupStart = group?.index ?? index;
  const groupEnd = group?.endIndex ?? index;
  const shownLookback = lookback.filter((item) => {
    const at = work.breaths.indexOf(item);
    return at >= 0 && at < groupStart;
  });
  const shownUpcoming = upcoming.filter((item) => {
    const at = work.breaths.indexOf(item);
    return at > groupEnd;
  });
  const readLines = shownLookback.flatMap((item) => {
    const sentence = work.breaths.indexOf(item);
    return display.blocksFor(item.text).map((block, bi) => (
      <p
        key={`${item.id}-${bi}`}
        className="look-line text-ink"
        data-sentence={sentence >= 0 ? sentence : undefined}
        data-block-sentences={block.sentences}
      >
        <EmphasizedText text={block.text} />
      </p>
    ));
  });
  const previewLines = (key: string) =>
    shownUpcoming.flatMap((item) => {
      const sentence = work.breaths.indexOf(item);
      return display.blocksFor(item.text).map((block, bi) => (
        <p
          key={`${key}-${item.id}-${bi}`}
          className="look-line text-ink"
          data-sentence={sentence >= 0 ? sentence : undefined}
          data-block-sentences={block.sentences}
        >
          <EmphasizedText text={block.text} />
        </p>
      ));
    });
  const passage: number[] = [];
  for (let breathIndex = groupStart; breathIndex <= groupEnd; breathIndex += 1) {
    passage.push(breathIndex);
  }
  const currentLine = (
    <div
      ref={breathLineRef}
      className={cn(
        "breath-now relative z-[1] font-serif",
        (groupEnd > groupStart || lift.lead || lift.lines) && "is-passage",
        isKept && "border-l-2 border-red pl-4",
      )}
      data-sentence={index}
      data-sentence-count={sentenceCount}
      data-window-lift={lift.lead ? "lead" : lift.lines ? "lines" : "none"}
    >
      {passage.map((breathIndex) => {
            const item = work.breaths[breathIndex];
            if (!item) return null;
            const blocks = display.blocksFor(item.text);
            const part = group?.parts.find((row) => row.index === breathIndex);
            const range = part
              ? { start: part.start, end: part.end }
              : { start: 0, end: item.text.length };
            const marked = markSpotlight(item.text, blocks, range, displayKind);
            return blocks.map((block, bi) => {
              const pieces = marked[bi] ?? [{ text: block.text, role: "focus" as const }];
              return (
                <p
                  key={`${breathIndex}-${bi}`}
                  className="breath-block"
                  data-block-sentences={block.sentences}
                >
                  <PassagePieces pieces={pieces} focusIndex={atSentence} />
                </p>
              );
            });
          })}
    </div>
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

  function ghostPointer(e: ReactPointerEvent<HTMLElement>) {
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

  function columnScrolls() {
    const flow = flowRef.current;
    if (!flow) return false;
    return flow.scrollHeight - flow.clientHeight > 24;
  }

  function noteScrollMotion(top: number) {
    if (!Number.isFinite(top)) return;
    const now = performance.now();
    const samples = motionRef.current;
    const prev = samples[samples.length - 1];
    if (prev && Math.abs(top - prev.top) < 0.01) return;
    samples.push({ t: now, top });
    const keep = now - 500;
    while (samples.length > 12 && samples[0].t < keep) samples.shift();
    (window as Window & { __salonMotionAt?: number }).__salonMotionAt = now;
  }

  function pageCoasting() {
    return coastFromSamples(motionRef.current, performance.now());
  }

  function noteMomentumStopped() {
    if (!flingRef.current) return;
    cancelAnimationFrame(flingRef.current);
    flingRef.current = 0;
  }

  function fling(flow: HTMLElement, velocity: number) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      noteMomentumStopped();
      return;
    }
    if (Math.abs(velocity) < 0.05) {
      noteMomentumStopped();
      return;
    }
    cancelAnimationFrame(flingRef.current);
    userScrolledRef.current = true;
    noteScrollMotion(flow.scrollTop);
    let v = velocity;
    let last = performance.now();
    let stuck = 0;
    const step = (now: number) => {
      if (flingRef.current === 0) return;
      const dt = Math.min(32, Math.max(0, now - last));
      last = now;
      const before = flow.scrollTop;
      flow.scrollTop = before + v * dt;
      // A finger that landed in the scroll event already cancelled this fling.
      if (flingRef.current === 0) return;
      if (flow.scrollTop === before) {
        stuck += 1;
        if (stuck < 3) {
          flingRef.current = requestAnimationFrame(step);
          return;
        }
        flingRef.current = 0;
        return;
      }
      stuck = 0;
      noteScrollMotion(flow.scrollTop);
      v *= Math.pow(0.9, dt / 16);
      if (Math.abs(v) > 0.02) {
        flingRef.current = requestAnimationFrame(step);
        return;
      }
      flingRef.current = 0;
    };
    flingRef.current = requestAnimationFrame(step);
  }

  function zoneFrom(target: EventTarget | null, x: number, y: number) {
    if (target instanceof Element) {
      const which = target.closest("[data-turn]")?.getAttribute("data-turn");
      if (which === "prev" || which === "next") return which;
    }
    return zoneAt(x, y);
  }

  /**
   * A mouse event in the other zone, clearly away from the last finger, is a
   * new tap. iOS delivers a quick second tap that way, and the 1.5s ghost
   * window must not swallow it.
   */
  function differentZoneTap(target: EventTarget | null, x: number, y: number) {
    const zone = zoneFrom(target, x, y);
    const last = lastTouchZoneRef.current;
    const lastPoint = lastTouchPointRef.current;
    return Boolean(
      zone &&
        last &&
        zone !== last &&
        lastPoint &&
        Math.hypot(x - lastPoint.x, y - lastPoint.y) > 8,
    );
  }

  /**
   * The mouse echo of the finger already down is ignored. A later tap in the
   * other zone is not that finger.
   */
  function swallowMouse(e: ReactPointerEvent<HTMLElement>) {
    if (!ghostPointer(e)) return false;
    if (gestureRef.current) return true;
    if (differentZoneTap(e.target, e.clientX, e.clientY)) return false;
    return true;
  }

  function zoneAt(x: number, y: number) {
    const host = turnHostRef.current;
    if (!host) return null;
    const hostRect = host.getBoundingClientRect();
    const pane = readingPaneRef.current;
    const paneTop = pane ? Number.parseFloat(getComputedStyle(pane).marginTop) : 0;
    const lead = Number.isFinite(paneTop) && paneTop < 0 ? -paneTop : 0;
    return turnZone({
      x,
      y,
      host: {
        left: hostRect.left,
        top: hostRect.top - lead,
        right: hostRect.right,
        bottom: hostRect.bottom,
        width: hostRect.width,
      },
      focusTop: null,
      focusBottom: null,
    });
  }

  function stepZone(zone: "prev" | "next" | null) {
    if (!zone) return;
    if (zone === "prev") retreat();
    else advance();
    setBar((state) => reduceReaderBar(state, "page"));
  }
  stepZoneRef.current = stepZone;

  function releaseTap(zone: "prev" | "next" | null, x: number, y: number) {
    if (!zone) return;
    if (!together) {
      stepZone(zone);
      return;
    }
    const now = performance.now();
    const pending = pendingTapRef.current;
    if (isSilentClap(pending, { at: now, x, y, zone })) {
      if (pendingTapTimerRef.current) window.clearTimeout(pendingTapTimerRef.current);
      pendingTapTimerRef.current = 0;
      const breath = pending?.breath ?? 0;
      pendingTapRef.current = null;
      togetherClapRef.current(breath);
      return;
    }
    if (pendingTapTimerRef.current) {
      window.clearTimeout(pendingTapTimerRef.current);
      const earlier = pendingTapRef.current;
      pendingTapRef.current = null;
      if (earlier?.zone === "prev" || earlier?.zone === "next") stepZone(earlier.zone);
    }
    const frameBreath = Number(
      turnHostRef.current?.closest(".reader-frame")?.getAttribute("data-breath-index"),
    );
    pendingTapRef.current = {
      at: now,
      x,
      y,
      zone,
      breath: Number.isFinite(frameBreath) ? frameBreath : index,
    };
    pendingTapTimerRef.current = window.setTimeout(() => {
      pendingTapTimerRef.current = 0;
      const tapped = pendingTapRef.current;
      pendingTapRef.current = null;
      if (tapped?.zone === "prev" || tapped?.zone === "next") stepZoneRef.current(tapped.zone);
    }, CLAP_WINDOW_MS);
  }

  function clearHoldTimer() {
    if (!holdTimerRef.current) return;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = 0;
  }

  function fingerSlipped(start: NonNullable<(typeof gestureRef)["current"]>) {
    return Math.hypot(start.lastX - start.x, start.lastY - start.y) >= SCROLL_ARM_PX;
  }

  /**
   * Keep stepping while the finger stays still. The first step is the arm,
   * not an extra tap on the way down. Book start, book end, and an open
   * gate stop the repeat. The lift does not step again.
   */
  function pumpHold(start: NonNullable<(typeof gestureRef)["current"]>) {
    holdTimerRef.current = 0;
    if (gestureRef.current !== start || start.scrolled || fingerSlipped(start)) return;
    const zone = start.zone;
    if (!zone) return;
    start.turned = true;
    turnedAtRef.current = performance.now();
    if (overlayRef.current !== "none") return;
    const before = `${liveIndex()}:${cursorRef.current}:${windowRef.current}`;
    stepZone(zone);
    if (
      overlayRef.current !== "none" ||
      `${liveIndex()}:${cursorRef.current}:${windowRef.current}` === before
    ) {
      return;
    }
    const held = performance.now() - start.t - HOLD_ARM_MS;
    holdTimerRef.current = window.setTimeout(() => pumpHold(start), holdStepIntervalMs(held));
  }

  function armHold(start: NonNullable<(typeof gestureRef)["current"]>) {
    clearHoldTimer();
    if (!start.zone) return;
    holdTimerRef.current = window.setTimeout(() => pumpHold(start), HOLD_ARM_MS);
  }

  function completeGesture(
    start: NonNullable<(typeof gestureRef)["current"]>,
    x: number,
    y: number,
    cancelled: boolean,
  ) {
    if (start.turned) {
      if (gestureRef.current === start) gestureRef.current = null;
      return;
    }
    start.turned = true;
    if (gestureRef.current === start) gestureRef.current = null;
    turnedAtRef.current = performance.now();
    if (start.pointerType === "touch") rememberTouch(x, y);
    const flow = flowRef.current;
    const moved = Boolean(flow && Math.abs(flow.scrollTop - start.scrollTop) > 3);
    const dx = x - start.x;
    const dy = y - start.y;
    // A finger that caught a fling is only there to stop it.
    if (start.stoppedMomentum) return;
    // A drag that actually moved the page is a scroll, and it keeps going.
    // The lift must not also step a sentence. A gesture dispatched in one
    // frame has no real velocity, so it does not leave a fling behind.
    if ((start.scrolled || moved) && (start.scrolled || Math.hypot(dx, dy) > TAP_SLOP_PX)) {
      const dt = performance.now() - start.t;
      if (start.scrolled && moved && flow && dt >= 12) fling(flow, start.vy ?? 0);
      return;
    }
    const kind = classifyTurnGesture({
      dx,
      dy,
      dt: performance.now() - start.t,
      canScroll: columnScrolls(),
      scrolled: start.scrolled || moved,
      momentum: false,
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
    if (pageCoasting()) return;
    releaseTap(start.zone, x, y);
  }

  function beginTurn(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !e.isPrimary) return;
    if (swallowMouse(e)) {
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
    const zone = zoneFrom(target, e.clientX, e.clientY);
    if (e.pointerType === "touch") {
      rememberTouch(e.clientX, e.clientY);
      lastTouchZoneRef.current = zone;
    }
    const flow = flowRef.current;
    const stoppedMomentum = pageCoasting();
    if (flingRef.current) noteMomentumStopped();
    scrollLockRef.current = false;
    // Arm before the lift. iOS can deliver the compatibility click before
    // pointerup; that click must not turn, and the lift still does.
    noteOwed(1);
    const gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      t: performance.now(),
      pointerType: e.pointerType,
      scrollTop: flow?.scrollTop ?? 0,
      scrolled: false,
      turned: false,
      stoppedMomentum,
      // Frozen at finger-down. The left third stays back even while the
      // sentence is still sliding.
      zone,
    };
    gestureRef.current = gesture;
    if (!stoppedMomentum) armHold(gesture);
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
    const prevY = start.lastY;
    const prevT = start.sampleT ?? start.t;
    start.lastX = e.clientX;
    start.lastY = e.clientY;
    if (fingerSlipped(start)) clearHoldTimer();
    if (start.zone === "prev") return;
    const flow = flowRef.current;
    if (!flow || !columnScrolls()) return;
    const dy = e.clientY - start.y;
    const dx = e.clientX - start.x;
    if (!start.scrolled) {
      if (Math.abs(dy) < SCROLL_ARM_PX || Math.abs(dy) < Math.abs(dx)) return;
      start.scrolled = true;
      start.scrollTop = flow.scrollTop;
      cancelAnimationFrame(flingRef.current);
    }
    const now = performance.now();
    start.sampleT = now;
    start.vy = (prevY - e.clientY) / Math.max(16, now - prevT);
    // The finger owns the column now. A layout pass must not snap it back
    // under the sentence and turn the coast into a tap.
    userScrolledRef.current = true;
    flow.scrollTop = start.scrollTop - (e.clientY - start.y);
    noteScrollMotion(flow.scrollTop);
    if (e.cancelable) e.preventDefault();
  }

  function finishTurn(e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    clearHoldTimer();
    // iOS can drop the touch pointerup and deliver the lift as a mouse
    // pointerup. That used to return here and leave the sentence unmoved.
    if (swallowMouse(e)) {
      const start = gestureRef.current;
      if (start && !start.turned && (start.pointerType === "touch" || start.id === e.pointerId)) {
        const fromTouch = start.pointerType === "touch" && start.id !== e.pointerId;
        completeGesture(
          start,
          fromTouch || cancelled ? start.lastX : e.clientX,
          fromTouch || cancelled ? start.lastY : e.clientY,
          cancelled,
        );
      }
      e.preventDefault();
      return;
    }
    const start = gestureRef.current;
    if (!start || start.id !== e.pointerId) return;
    completeGesture(
      start,
      cancelled ? start.lastX : e.clientX,
      cancelled ? start.lastY : e.clientY,
      cancelled,
    );
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
      noteOwed(-1);
      completeGesture(start, start.lastX, start.lastY, false);
      return;
    }
    if (owedClicksRef.current > 0) {
      noteOwed(-1);
      return;
    }
    // The phone's extra click can land after the sentence has moved, on the
    // same spot, and step forward. That undoes the back tap. A click in the
    // other zone is a new tap, including one iOS delivered only as a click.
    if (ghostClick(e.clientX, e.clientY)) {
      if (differentZoneTap(e.target, e.clientX, e.clientY)) {
        stepZone(zoneFrom(e.target, e.clientX, e.clientY));
      }
      return;
    }
    if (turnedAtRef.current > 0 && performance.now() - turnedAtRef.current < GHOST_MOUSE_MS) {
      return;
    }
    if (pageCoasting()) return;
    stepZone(zoneFrom(e.target, e.clientX, e.clientY));
  }

  function onTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    const start = gestureRef.current;
    if (!start || start.turned) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    completeGesture(start, touch.clientX, touch.clientY, false);
  }

  function navDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || !e.isPrimary) return;
    // The compatibility mouse after a touch must not arm a second step.
    // A new touch does: that is a real second tap on Previous.
    if (e.pointerType !== "touch" && performance.now() - navTouchAtRef.current < 700) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    navGestureRef.current = e.pointerId;
  }

  function navUp(e: ReactPointerEvent<HTMLButtonElement>, go: () => void) {
    if (navGestureRef.current !== e.pointerId) return;
    navGestureRef.current = null;
    if (e.pointerType === "touch") navTouchAtRef.current = performance.now();
    e.preventDefault();
    e.stopPropagation();
    go();
  }

  function navCancel(e: ReactPointerEvent<HTMLButtonElement>) {
    if (navGestureRef.current === e.pointerId) navGestureRef.current = null;
  }

  function navClick(e: ReactMouseEvent<HTMLButtonElement>, go: () => void) {
    e.preventDefault();
    e.stopPropagation();
    // Pointerup already stepped and cleared the id. Keyboard activation
    // (detail 0) never had a pointer.
    if (navGestureRef.current != null) {
      navGestureRef.current = null;
      go();
      return;
    }
    if (e.detail === 0) go();
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
      onTouchEndCapture={onTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        data-turn="prev"
        tabIndex={-1}
        aria-label="Previous sentence"
        className="reader-side absolute left-0 top-0 z-10 h-full w-1/3 cursor-w-resize"
        onMouseDown={(e) => e.preventDefault()}
      />
      <button
        type="button"
        data-turn="next"
        tabIndex={-1}
        aria-label="Next sentence"
        className="reader-side absolute top-0 right-0 z-10 h-full w-2/3 cursor-e-resize"
        onMouseDown={(e) => e.preventDefault()}
      />

      <div
        ref={readingPaneRef}
        className={cn("reading-pane z-0", centerOn && "reading-pane-centered")}
      >
        {showPalimpsest ? <p className="palimpsest font-display">{palimpsest}</p> : null}
        {centerOn ? (
          <>
            <div ref={flowRef} className="focus-live">
              <div ref={trackRef} className="center-track">
                <div className="center-pad center-pad-top" aria-hidden />
                <div className="center-lines">
                  <div ref={lookbackSlotRef} className="lookback-slot" aria-hidden>
                    {readLines}
                  </div>
                  <div ref={breathSlotRef} className={breathClass}>
                    {currentLine}
                  </div>
                  <div className="upcoming-fold" aria-hidden>
                    <div ref={upcomingSlotRef} className="upcoming-slot">
                      {previewLines("near")}
                    </div>
                  </div>
                </div>
                <div className="center-pad center-pad-bottom" aria-hidden />
              </div>
            </div>
            <div ref={blurHostRef} className="focus-blur-clip" aria-hidden="true" />
            <div className="focus-frost focus-frost-read" aria-hidden="true" />
            <div className="focus-wash" aria-hidden="true" />
            <div className="focus-bands" aria-hidden="true">
              <div className="focus-band focus-band-read" data-focus-band="read" />
              <div className="focus-band focus-band-now" data-focus-band="now" />
              <div className="focus-band focus-band-next" data-focus-band="next" />
            </div>
          </>
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
      data-scene={breath?.sceneId ?? ""}
      data-breath-count={work.breaths.length}
      data-sentence-at={atSentence}
      data-sentence-count={sentenceCount}
      data-spotlight-key={spotlightKey({ index, cursor: atSentence, window: spotWindow })}
      data-spotlight-window={spotWindow}
      data-display-blocks={display.ready ? "ready" : "pending"}
      data-face-ready={display.faceReady ? "yes" : "no"}
      data-block-viewport={display.viewport ? String(display.viewport) : ""}
      data-block-limit={display.limit ? String(display.limit) : ""}
      data-block-width={display.width ? String(display.width) : ""}
    >
      <h1 className="sr-only">{work.title}</h1>
      {together && pair ? (
        <TogetherShell
          pair={pair}
          place={headerPlace}
          breathIndex={index}
          workId={work.id}
          sceneId={breath?.sceneId ?? ""}
          chapterPlace={placeLabel}
          inviteUrl={publicUrl(sittingSharePath(work.id, asSittingMinutes(sittingMinutes), pair, serializeEp?.n))}
          onFollow={(breath) => goTo(breath)}
          onClap={togetherClapRef}
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
              {headerPlace}
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
                  onPointerDown={navDown}
                  onPointerUp={(e) => navUp(e, retreat)}
                  onPointerCancel={navCancel}
                  onClick={(e) => navClick(e, retreat)}
                  className="nav-reveal-btn"
                >
                  Prev
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerDown={navDown}
                  onPointerUp={(e) => navUp(e, advance)}
                  onPointerCancel={navCancel}
                  onClick={(e) => navClick(e, advance)}
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
              <div className="text-size-row">
                <span id="reader-text-size-label">Text size</span>
                <span className="text-size-slider">
                  <span className="text-size-mark text-size-mark-small" aria-hidden="true">
                    A
                  </span>
                  <input
                    type="range"
                    min={TEXT_SIZE_MIN}
                    max={TEXT_SIZE_MAX}
                    step={TEXT_SIZE_STEP}
                    value={textSize.scale}
                    aria-labelledby="reader-text-size-label"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      textSize.setScale(Number(event.currentTarget.value));
                    }}
                  />
                  <span className="text-size-mark text-size-mark-large" aria-hidden="true">
                    A
                  </span>
                </span>
              </div>
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
            {isKept && breath ? (
              <SalonCardShare
                compact
                workId={work.id}
                at={index}
                text={breath.text}
                title={work.title}
                author={work.author}
                className="border-r border-ink bg-yellow text-ink"
              />
            ) : device ? null : (
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
                "reader-glass inline-flex h-12 w-14 shrink-0 items-center justify-center bg-transparent text-ink",
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
          <ReadingProgress
            title={work.title}
            index={index}
            sentenceAt={atSentence}
            sentenceCount={sentenceCount}
            window={spotWindow}
            length={progressLength}
            chapterStarts={chapterStarts}
          />
        </>
      )}

      {overlay === "threshold" ? (
        <div className="veil bg-paper text-ink">
          {gateMode === "share" ? (
            <>
              <div className="veil-body">
                <p className="mb-3 type-kicker text-muted">{creditLine(work.author, work.year)}</p>
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
                  {nightChrome ? `${work.title} · ${creditLine(work.author, work.year)}` : creditLine(work.author, work.year)}
                </p>
                <PlaceChip workId={work.id} tone="accent" className="mt-2" />
                <h1 className="veil-title">{nightChrome || work.title}</h1>
                {device ? null : (
                  <FavoriteMark workId={work.id} className="mt-4 border border-ink" />
                )}
                {intro ? (
                  <FittedCopy text={intro} className="veil-note veil-preface-note" />
                ) : null}
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
                  {nightChrome ? `${work.title} · ${creditLine(work.author, work.year)}` : creditLine(work.author, work.year)}
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
            {scene.reentry ? (
              <FittedCopy text={scene.reentry} className="veil-note" />
            ) : null}
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
                  : sendResult === "downloaded"
                    ? "Saved"
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
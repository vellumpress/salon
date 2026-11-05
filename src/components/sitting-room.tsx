import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { shareOrCopy } from "@/lib/invite-share";
import { fillClass, hashSeed, type Fill } from "@/lib/mondrian";
import { HoldLeave } from "@/components/hourglass";
import { PassageBond } from "@/components/passage-bond";
import { publishClubProgress } from "@/lib/clubs";
import { asClubId } from "@/lib/club-time";
import { formatHandle } from "@/lib/social";
import { dayKey } from "@/lib/day-key";
import { useTbr } from "@/lib/store";
import {
  chatLineId,
  chatWithoutMargin,
  isLivePeer,
  marginMarkFromChat,
  mergeMarginMarks,
  mergeSitLines,
  peerAside,
  shouldSyncNewcomer,
  sitStatusLabel,
  type MarginMark,
  type SitLine,
} from "@/lib/multiplayer/sit-logic";
import {
  CHAPTER_TOAST_MS,
  CLAP_MS,
  MARGIN_EMOJI,
  claimChapterToast,
  clapForOther,
  cleanChapter,
  cleanClap,
  cleanEmoji,
  cleanLedger,
  cleanPin,
  cleanPulse,
  cleanUnderline,
  finishedScene,
  emojiOn,
  jumpTarget,
  mergeChapters,
  mergeClaps,
  mergeEmoji,
  mergeLedger,
  mergePins,
  mergePulses,
  mergeUnderlines,
  nextEmoji,
  nextPin,
  nextUnderline,
  noteFinished,
  paceCue,
  paceLabel,
  pinsOn,
  pulsesOn,
  scoreLabel,
  sharedFinished,
  underlinesOn,
  type ChapterMark,
  type PassageEmoji,
  type PassagePin,
  type ReactionPulse,
  type ReadLedger,
  type SilentClap,
  type Underline,
} from "@/lib/multiplayer/together-bond";
import { enterTogetherCompose, exitTogetherCompose } from "@/lib/vvh";
import { cn } from "@/lib/utils";

const MARKS: Fill[] = ["red", "blue", "yellow", "ink"];

export function markOf(id: string): Fill {
  return MARKS[hashSeed(id) % MARKS.length] ?? "ink";
}

export type ChatLine = SitLine;

type HereNote = { breath: number; place: string };

type BondSync = {
  underlines?: Underline[];
  pins?: PassagePin[];
  emoji?: PassageEmoji[];
  pulses?: ReactionPulse[];
  claps?: SilentClap[];
  chapters?: ChapterMark[];
  read?: ReadLedger;
};

type Wire =
  | { t: "chat"; text: string; at: number; breath?: number; name?: string }
  | { t: "here"; breath: number; place: string }
  | { t: "line"; mark: Underline }
  | { t: "pin"; pin: PassagePin }
  | { t: "pulse"; pulse: ReactionPulse }
  | { t: "emoji"; mark: PassageEmoji }
  | { t: "read"; ledger: ReadLedger }
  | { t: "chapter"; chapter: ChapterMark }
  | { t: "clap"; clap: SilentClap }
  | ({ t: "sync"; chat: ChatLine[]; here: HereNote; marks?: MarginMark[] } & BondSync);

function isChat(data: unknown): data is { t: "chat"; text: string; at: number; breath?: number; name?: string } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Wire;
  return msg.t === "chat" && typeof msg.text === "string";
}

function isHere(data: unknown): data is { t: "here"; breath: number; place: string } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Wire;
  return msg.t === "here" && typeof msg.place === "string";
}

function isSync(data: unknown): data is { t: "sync"; chat: ChatLine[]; here: HereNote; marks?: MarginMark[] } & BondSync {
  if (!data || typeof data !== "object") return false;
  const msg = data as Wire;
  return msg.t === "sync" && Array.isArray(msg.chat);
}

function wireKind(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const kind = (data as { t?: unknown }).t;
  return typeof kind === "string" ? kind : "";
}

function bondId(prefix: string, selfId: string) {
  return `${prefix}-${selfId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useSittingLock(onLeave: () => void) {
  const [hold, setHold] = useState(0);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef(0);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const left = useRef(false);

  const clearHold = useCallback(() => {
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHold(0);
  }, []);

  const unlockScreen = useCallback(async () => {
    try {
      await wake.current?.release();
    } catch {
      /* already released */
    }
    wake.current = null;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    clearHold();
    void unlockScreen();
    onLeave();
  }, [clearHold, onLeave, unlockScreen]);

  const startHold = useCallback(() => {
    holdStart.current = Date.now();
    setHold(0.04);
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - holdStart.current) / 3200);
      setHold(p);
      if (p >= 1) {
        if (holdTimer.current) window.clearInterval(holdTimer.current);
        holdTimer.current = null;
        leave();
      }
    }, 50);
  }, [leave]);

  useEffect(() => {
    async function lockScreen() {
      let embedded = false;
      try {
        embedded = window.self !== window.top;
      } catch {
        embedded = true;
      }
      if (embedded) return;
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        /* iframe or iOS may refuse */
      }
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        wake.current = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        wake.current = null;
      }
    }
    void lockScreen();
  }, []);

  useEffect(() => {
    let active = true;
    const trap = () => {
      if (!active) return;
      history.pushState({ sit: 1 }, "");
    };
    history.pushState({ sit: 1 }, "");
    window.addEventListener("popstate", trap);
    const release = () => {
      active = false;
    };
    window.addEventListener("pagehide", release);
    return () => {
      active = false;
      window.removeEventListener("popstate", trap);
      window.removeEventListener("pagehide", release);
    };
  }, []);

  useEffect(
    () => () => {
      if (holdTimer.current) window.clearInterval(holdTimer.current);
      void unlockScreen();
    },
    [unlockScreen],
  );

  return { hold, startHold, clearHold, leave };
}

export function useSittingChat(
  pair: string,
  place: string,
  breathIndex: number,
  workId = "",
  sceneId = "",
  chapterPlace = "",
) {
  const handle = useTbr((s) => s.handle) ?? "";
  const joined = useTbr((s) => s.joined) ?? [];
  const [attempt, setAttempt] = useState(0);
  const p2p = useP2PRoom({
    room: `sit-${pair}`.slice(0, 64),
    name: handle,
    attempt,
  });
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [marks, setMarks] = useState<MarginMark[]>([]);
  const [underlines, setUnderlines] = useState<Underline[]>([]);
  const [pins, setPins] = useState<PassagePin[]>([]);
  const [emoji, setEmoji] = useState<PassageEmoji[]>([]);
  const [pulses, setPulses] = useState<ReactionPulse[]>([]);
  const [claps, setClaps] = useState<SilentClap[]>([]);
  const [selfChapters, setSelfChapters] = useState<ChapterMark[]>([]);
  const [peerChapters, setPeerChapters] = useState<Record<string, ChapterMark[]>>({});
  const [toastAt, setToastAt] = useState(0);
  const [selfRead, setSelfRead] = useState<number[]>([]);
  const [peerRead, setPeerRead] = useState<Record<string, ReadLedger>>({});
  const [here, setHere] = useState<Record<string, HereNote>>({});
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const readDay = useRef(dayKey(Date.now()));
  const prevBreath = useRef(breathIndex);
  const prevScene = useRef({ id: sceneId, place: chapterPlace, breath: breathIndex });
  const seenChapters = useRef(new Set<string>());
  const snap = useRef({
    lines,
    marks,
    underlines,
    pins,
    emoji,
    pulses,
    claps,
    selfChapters,
    selfRead,
    breathIndex,
    place,
    selfId: p2p.selfId,
    workId,
  });
  snap.current = {
    lines,
    marks,
    underlines,
    pins,
    emoji,
    pulses,
    claps,
    selfChapters,
    selfRead,
    breathIndex,
    place,
    selfId: p2p.selfId,
    workId,
  };
  const prevConnected = useRef(new Set<string>());
  const progressTimer = useRef<number | null>(null);

  const syncPayload = useCallback(() => {
    const current = snap.current;
    return {
      t: "sync" as const,
      chat: current.lines,
      marks: current.marks,
      underlines: current.underlines,
      pins: current.pins,
      emoji: current.emoji,
      pulses: current.pulses,
      claps: current.claps,
      chapters: current.selfChapters,
      read: {
        from: current.selfId,
        day: readDay.current,
        at: Date.now(),
        breaths: current.selfRead,
      },
      here: { breath: current.breathIndex, place: current.place },
    };
  }, []);

  useEffect(
    () =>
      p2p.onMessage((from, data) => {
        if (isChat(data)) {
          const text = data.text.trim().slice(0, 280);
          if (!text) return;
          const at = typeof data.at === "number" ? data.at : Date.now();
          const id = chatLineId(from, at);
          const mark = marginMarkFromChat({
            from,
            text,
            at,
            breath: data.breath,
            id,
            name: data.name,
          });
          if (mark) {
            setMarks((prev) => mergeMarginMarks(prev, [mark]));
            return;
          }
          setLines((prev) => mergeSitLines(prev, [{ id, from, text, at }]));
          return;
        }
        if (isHere(data)) {
          setHere((prev) => ({
            ...prev,
            [from]: { breath: Number(data.breath) || 0, place: data.place.slice(0, 80) },
          }));
          return;
        }
        const kind = wireKind(data);
        if (kind === "line") {
          const mark = cleanUnderline((data as { mark?: unknown }).mark, from);
          if (!mark) return;
          setUnderlines((prev) => mergeUnderlines(prev, [mark]));
          return;
        }
        if (kind === "pin") {
          const pin = cleanPin((data as { pin?: unknown }).pin, from);
          if (!pin) return;
          setPins((prev) => mergePins(prev, [pin]));
          return;
        }
        if (kind === "pulse") {
          const pulse = cleanPulse((data as { pulse?: unknown }).pulse, from);
          if (!pulse) return;
          setPulses((prev) => mergePulses(prev, [pulse], Date.now()));
          setNow(Date.now());
          return;
        }
        if (kind === "emoji") {
          const mark = cleanEmoji((data as { mark?: unknown }).mark, from);
          if (!mark) return;
          setEmoji((prev) => mergeEmoji(prev, [mark]));
          return;
        }
        if (kind === "chapter") {
          const mark = cleanChapter((data as { chapter?: unknown }).chapter, from);
          if (!mark) return;
          setPeerChapters((prev) => ({
            ...prev,
            [from]: mergeChapters(prev[from] ?? [], [mark]),
          }));
          return;
        }
        if (kind === "clap") {
          const clap = cleanClap((data as { clap?: unknown }).clap, from);
          if (!clap) return;
          setClaps((prev) => mergeClaps(prev, [clap], Date.now()));
          setNow(Date.now());
          return;
        }
        if (kind === "read") {
          setPeerRead((prev) => {
            const ledger = mergeLedger(prev[from], (data as { ledger?: unknown }).ledger, from);
            if (!ledger || ledger === prev[from]) return prev;
            return { ...prev, [from]: ledger };
          });
          return;
        }
        if (kind === "hello") {
          const current = snap.current;
          if (
            current.lines.length === 0 &&
            current.marks.length === 0 &&
            current.underlines.length === 0 &&
            current.pins.length === 0 &&
            current.emoji.length === 0 &&
            current.pulses.length === 0 &&
            current.claps.length === 0 &&
            current.selfChapters.length === 0 &&
            current.selfRead.length === 0
          ) {
            return;
          }
          p2p.send(syncPayload(), from);
          return;
        }
        if (isSync(data)) {
          setHere((prev) => ({
            ...prev,
            [from]: {
              breath: Number(data.here?.breath) || 0,
              place: (data.here?.place ?? "").slice(0, 80),
            },
          }));
          const incoming = (data.chat ?? [])
            .filter((line) => line && typeof line.text === "string" && typeof line.from === "string")
            .map((line) => ({
              id: line.id || `${line.from}-${line.at}`,
              from: line.from,
              text: line.text.trim().slice(0, 280),
              at: line.at || Date.now(),
            }));
          const syncedMarks = Array.isArray(data.marks) ? mergeMarginMarks([], data.marks) : [];
          if (syncedMarks.length > 0) setMarks((prev) => mergeMarginMarks(prev, syncedMarks));
          if (Array.isArray(data.underlines) && data.underlines.length > 0) {
            setUnderlines((prev) => mergeUnderlines(prev, data.underlines ?? []));
          }
          if (Array.isArray(data.pins) && data.pins.length > 0) {
            setPins((prev) => mergePins(prev, data.pins ?? []));
          }
          if (Array.isArray(data.emoji) && data.emoji.length > 0) {
            setEmoji((prev) => mergeEmoji(prev, data.emoji ?? []));
          }
          if (Array.isArray(data.pulses) && data.pulses.length > 0) {
            setPulses((prev) => mergePulses(prev, data.pulses ?? [], Date.now()));
          }
          if (Array.isArray(data.claps) && data.claps.length > 0) {
            setClaps((prev) => mergeClaps(prev, data.claps ?? [], Date.now()));
            setNow(Date.now());
          }
          if (Array.isArray(data.chapters) && data.chapters.length > 0) {
            setPeerChapters((prev) => ({
              ...prev,
              [from]: mergeChapters(prev[from] ?? [], data.chapters ?? []),
            }));
          }
          if (data.read) {
            setPeerRead((prev) => {
              const ledger = mergeLedger(prev[from], data.read, from);
              if (!ledger || ledger === prev[from]) return prev;
              return { ...prev, [from]: ledger };
            });
          }
          const spoken = chatWithoutMargin(incoming, syncedMarks);
          if (spoken.length > 0) setLines((prev) => mergeSitLines(prev, spoken));
        }
      }),
    [p2p.onMessage, p2p.send, syncPayload],
  );

  useEffect(() => {
    if (!p2p.joined) return;
    p2p.send({ t: "hello" });
  }, [p2p.joined, p2p.send]);

  const connectedKey = p2p.peers
    .filter((peer) => peer.connectionState === "connected")
    .map((peer) => peer.id)
    .join();

  useEffect(() => {
    p2p.setMeta({
      name: handle,
      breath: breathIndex,
      place,
      workId,
    });
    p2p.broadcast({ t: "here", breath: breathIndex, place, workId });
  }, [breathIndex, place, workId, handle, connectedKey, p2p.broadcast, p2p.setMeta]);

  useEffect(() => {
    const clubId = asClubId(pair);
    if (!clubId || !workId || !joined.includes(clubId)) return;
    if (progressTimer.current) window.clearTimeout(progressTimer.current);
    progressTimer.current = window.setTimeout(() => {
      void publishClubProgress(clubId, { workId, breathIndex, place });
    }, 1200);
    return () => {
      if (progressTimer.current) window.clearTimeout(progressTimer.current);
    };
  }, [pair, workId, breathIndex, place, joined]);

  useEffect(() => {
    const connected = new Set(connectedKey.split(",").filter(Boolean));
    const newcomers = [...connected].filter((id) => !prevConnected.current.has(id));
    const incumbents = [...prevConnected.current];
    for (const id of newcomers) {
      if (!shouldSyncNewcomer(snap.current.selfId, incumbents)) continue;
      p2p.send(syncPayload(), id);
    }
    for (const id of prevConnected.current) {
      if (!connected.has(id)) {
        setHere((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
    prevConnected.current = connected;
  }, [connectedKey, p2p.send, syncPayload]);

  useEffect(() => {
    const prev = prevBreath.current;
    prevBreath.current = breathIndex;
    if (!(breathIndex > prev)) return;
    setSelfRead((curr) => noteFinished(curr, prev, breathIndex));
  }, [breathIndex]);

  useEffect(() => {
    const prev = prevScene.current;
    prevScene.current = { id: sceneId, place: chapterPlace, breath: breathIndex };
    const finished = finishedScene(prev.id, sceneId, prev.breath, breathIndex);
    if (!finished) return;
    const mark = cleanChapter(
      { id: finished, place: prev.place, at: Date.now() },
      p2p.selfId,
    );
    if (!mark) return;
    setSelfChapters((curr) => mergeChapters(curr, [mark]));
    p2p.send({ t: "chapter", chapter: mark });
  }, [sceneId, chapterPlace, breathIndex, p2p.selfId, p2p.send]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = dayKey(Date.now());
      if (next === readDay.current) return;
      readDay.current = next;
      setSelfRead([]);
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const pulseLive = pulses.some((pulse) => now - pulse.at < 3600 && now - pulse.at > -5000);
  const clapLive = claps.some((clap) => now - clap.at < CLAP_MS + 400 && now - clap.at > -5000);
  const toastLive = toastAt > 0 && now - toastAt < CHAPTER_TOAST_MS + 200;
  useEffect(() => {
    if (!pulseLive && !clapLive && !toastLive) return;
    const id = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(id);
  }, [pulseLive, clapLive, toastLive]);

  const presentIds = p2p.peers.filter((peer) => isLivePeer(peer.connectionState)).map((peer) => peer.id);
  const presentKey = presentIds.join();
  useEffect(() => {
    if (presentIds.length === 0) return;
    const peers = presentIds.map((id) => peerChapters[id] ?? []);
    const next = claimChapterToast(selfChapters, peers, seenChapters.current);
    if (!next) return;
    setToastAt(Date.now());
    setNow(Date.now());
  }, [selfChapters, peerChapters, presentKey]);

  useEffect(() => {
    if (!p2p.joined) return;
    p2p.send({
      t: "read",
      ledger: { from: p2p.selfId, day: readDay.current, at: Date.now(), breaths: selfRead },
    });
  }, [selfRead, p2p.joined, p2p.selfId, p2p.send]);

  const sendChat = useCallback(() => {
    const text = draft.trim().slice(0, 280);
    if (!text) return;
    const at = Date.now();
    const from = p2p.selfId;
    p2p.send({ t: "chat", text, at });
    setLines((prev) => mergeSitLines(prev, [{ id: chatLineId(from, at), from, text, at }]));
    setDraft("");
  }, [draft, p2p]);

  const publishUnderline = useCallback(() => {
    const { underlines: current, selfId, breathIndex: breath } = snap.current;
    const mark = nextUnderline(current, selfId, breath, Date.now(), bondId("line", selfId));
    if (!mark) return;
    setUnderlines((prev) => mergeUnderlines(prev, [mark]));
    p2p.send({ t: "line", mark });
  }, [p2p]);

  const publishPin = useCallback(() => {
    const { pins: current, selfId, breathIndex: breath, place: herePlace } = snap.current;
    const pin = nextPin(current, selfId, breath, Date.now(), bondId("pin", selfId), herePlace);
    if (!pin) return;
    setPins((prev) => mergePins(prev, [pin]));
    p2p.send({ t: "pin", pin });
  }, [p2p]);

  const publishPulse = useCallback(() => {
    const { selfId, breathIndex: breath } = snap.current;
    const at = Date.now();
    const pulse = cleanPulse({ id: bondId("pulse", selfId), breath, at }, selfId);
    if (!pulse) return;
    setPulses((prev) => mergePulses(prev, [pulse], at));
    setNow(at);
    p2p.send({ t: "pulse", pulse });
  }, [p2p]);

  const publishEmoji = useCallback(
    (glyph: (typeof MARGIN_EMOJI)[number]) => {
      const { emoji: current, selfId, breathIndex: breath } = snap.current;
      const mark = nextEmoji(current, selfId, breath, glyph, Date.now(), bondId("emoji", selfId));
      if (!mark) return;
      setEmoji((prev) => mergeEmoji(prev, [mark]));
      p2p.send({ t: "emoji", mark });
    },
    [p2p],
  );

  const publishClap = useCallback(
    (breath: number) => {
      const at = Date.now();
      const clap = cleanClap({ id: bondId("clap", p2p.selfId), breath, at }, p2p.selfId);
      if (!clap) return;
      setClaps((prev) => mergeClaps(prev, [clap], at));
      p2p.send({ t: "clap", clap });
    },
    [p2p],
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const ownLine = underlinesOn(underlines, breathIndex).some((mark) => mark.from === p2p.selfId);
  const ownPin = pinsOn(pins, breathIndex).some((pin) => pin.from === p2p.selfId);
  const passageEmoji = emojiOn(emoji, breathIndex)?.emoji ?? "";
  const glowing = pulsesOn(pulses, breathIndex, now).length > 0;
  const clapping = clapForOther(claps, p2p.selfId, now);
  const toastOn = toastAt > 0 && now - toastAt < CHAPTER_TOAST_MS;

  return {
    selfId: p2p.selfId,
    peers: p2p.peers,
    joined: p2p.joined,
    unavailable: p2p.unavailable,
    link: p2p.link,
    lines,
    marks,
    underlines,
    pins,
    emoji,
    here,
    peerRead,
    selfRead,
    day: readDay.current,
    draft,
    setDraft,
    sendChat,
    publishUnderline,
    publishPin,
    publishPulse,
    publishEmoji,
    publishClap,
    ownLine,
    ownPin,
    passageEmoji,
    glowing,
    clapping,
    toastOn,
    now,
    retry,
  };
}

function isPresent(peer: PeerInfo) {
  return isLivePeer(peer.connectionState);
}



export function TogetherShell({
  pair,
  place,
  breathIndex,
  workId = "",
  sceneId = "",
  chapterPlace = "",
  onLeave,
  inviteUrl,
  onFollow,
  onClap,
  children,
}: {
  pair: string;
  place: string;
  breathIndex: number;
  workId?: string;
  sceneId?: string;
  chapterPlace?: string;
  onLeave: () => void;
  inviteUrl?: string;
  onFollow?: (breath: number) => void;
  onClap?: { current: (breath: number) => void };
  children: ReactNode;
}) {
  const lock = useSittingLock(onLeave);
  const chat = useSittingChat(pair, place, breathIndex, workId, sceneId, chapterPlace);
  if (onClap) onClap.current = chat.publishClap;
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => setLive(true), []);
  useEffect(() => () => exitTogetherCompose(), []);

  const beginCompose = useCallback(() => {
    enterTogetherCompose({ dockHeight: dockRef.current?.offsetHeight });
  }, []);

  const endCompose = useCallback((root: HTMLElement) => {
    requestAnimationFrame(() => {
      if (root.contains(document.activeElement)) return;
      exitTogetherCompose();
    });
  }, []);

  const present = chat.peers.filter((peer) => isPresent(peer));
  useEffect(() => {
    if (present.length === 0) return;
    useTbr.getState().noteJointDay(dayKey(Date.now()));
  }, [present.length]);
  const heardIds = Object.keys(chat.here).filter((id) => id !== chat.selfId);
  const followNote = heardIds
    .map((id) => chat.here[id])
    .find((note) => note && note.breath !== breathIndex);
  const status = chat.unavailable ? "" : sitStatusLabel(chat.link, chat.joined, present.length);

  async function sendInvite() {
    if (!inviteUrl) return;
    const result = await shareOrCopy({
      title: "Sit together",
      text: "The same page, live.",
      url: inviteUrl,
    });
    if (result === "copied" || result === "shared") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }
  const elsewhere = [
    ...new Set(
      present
        .map((peer) => {
          const note = peerAside({
            selfPlace: place,
            selfWorkId: workId,
            peerPlace: peer.place || chat.here[peer.id]?.place || "",
            peerWorkId: peer.workId || "",
            selfBreath: breathIndex,
            peerBreath: peer.breath ?? chat.here[peer.id]?.breath ?? breathIndex,
          });
          if (!note) return "";
          const who = peer.name ? formatHandle(peer.name) : "";
          return who ? `${who} · ${note}` : note;
        })
        .filter(Boolean),
    ),
  ];
  const visible = chatWithoutMargin(chat.lines, chat.marks).slice(-6);
  const peerBreaths = present
    .map((peer) => {
      const noted = chat.here[peer.id]?.breath;
      return typeof noted === "number" ? noted : peer.breath;
    })
    .filter((breath): breath is number => typeof breath === "number" && Number.isFinite(breath));
  const pace = paceCue(breathIndex, peerBreaths);
  const paceText = paceLabel(pace);
  const peerLedgers: ReadLedger[] = present.map((peer) => {
    const got = chat.peerRead[peer.id];
    if (got && got.day === chat.day) return got;
    return { from: peer.id, day: chat.day, at: 0, breaths: [] };
  });
  const shared = sharedFinished(
    chat.day,
    { from: chat.selfId, day: chat.day, at: chat.now, breaths: chat.selfRead },
    present.length > 0 ? peerLedgers : [],
  );
  const jump = jumpTarget(chat.pins, chat.selfId, breathIndex);
  const showJump = Boolean(jump && onFollow && jump.breath !== followNote?.breath);
  const underlined = underlinesOn(chat.underlines, breathIndex).length > 0;
  const pinned = pinsOn(chat.pins, breathIndex).length > 0;

  return (
    <>
      <header className="relative z-50 flex h-12 shrink-0 items-stretch overflow-hidden border-b border-ink">
        <HoldLeave progress={lock.hold} onStart={lock.startHold} onEnd={lock.clearHold} />
        <p className="flex min-w-0 flex-1 items-center truncate bg-paper px-3 type-kicker text-ink">
          {place}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 bg-paper px-3">
          <span
            className={cn("size-2.5 shrink-0", live ? fillClass(markOf(chat.selfId)) : "bg-ink")}
          />
          {live
            ? chat.peers.map((peer) => (
                <span
                  key={peer.id}
                  className={cn(
                    "size-2.5 shrink-0",
                    isPresent(peer)
                      ? fillClass(markOf(peer.id))
                      : peer.connectionState === "failed"
                        ? "bg-ink/30"
                        : "border border-ink bg-paper",
                  )}
                />
              ))
            : null}
          {live
            ? heardIds
                .filter((id) => !chat.peers.some((peer) => peer.id === id))
                .map((id) => (
                  <span key={id} className={cn("size-2.5 shrink-0", fillClass(markOf(id)))} />
                ))
            : null}
          {chat.unavailable ? (
            <span className="type-kicker">Coming soon</span>
          ) : status ? (
            <span className="type-kicker text-muted" data-sit-status={status}>
              {status}
            </span>
          ) : (
            <span className="sr-only" data-sit-status="here">
              here
            </span>
          )}
          {inviteUrl ? (
            <button type="button" className="type-kicker" onClick={() => void sendInvite()}>
              {copied ? "Copied" : "Invite"}
            </button>
          ) : null}
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {children}
        <PassageBond
          breathIndex={breathIndex}
          underlined={underlined}
          pinned={pinned}
          pulsing={chat.glowing}
          clapping={chat.clapping}
          emoji={chat.passageEmoji}
        />
        {chat.toastOn ? (
          <p className="chapter-toast" data-chapter-toast="on" role="status">
            We made it
          </p>
        ) : null}
      </div>
      {chat.unavailable ? (
        <button
          type="button"
          onClick={chat.retry}
          className="flex h-11 w-full shrink-0 items-center justify-center border-b border-ink bg-yellow font-sans text-sm text-ink"
        >
          The room is quiet. Try again.
        </button>
      ) : null}
      <div
        ref={dockRef}
        className="together-dock"
        onPointerDownCapture={beginCompose}
        onFocusCapture={beginCompose}
        onBlurCapture={(event) => endCompose(event.currentTarget)}
      >
        {followNote && onFollow ? (
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center border-t border-ink bg-yellow font-sans text-sm text-ink"
            onClick={() => onFollow(followNote.breath)}
          >
            Read there{followNote.place ? ` · ${followNote.place}` : ""}
          </button>
        ) : null}
        <div className="chat-slot" aria-live="polite">
          {elsewhere.map((item) => (
            <p key={item} className="chat-aside">
              {item}
            </p>
          ))}
          {visible.map((line, i) => {
            const last = visible.length - 1;
            const opacity = last <= 0 ? 0.72 : 0.28 + (i / last) * 0.62;
            return (
              <p key={line.id} className="chat-line text-ink" style={{ opacity }}>
                <span className={cn("chat-mark", fillClass(markOf(line.from)))} />
                <span>{line.text}</span>
              </p>
            );
          })}
        </div>
        {showJump && jump && onFollow ? (
          <button type="button" className="bond-jump" data-pin-breath={jump.breath} onClick={() => onFollow(jump.breath)}>
            This line
          </button>
        ) : null}
        <div className="bond-status" data-pace={pace || "quiet"} data-shared-read={shared} aria-live="polite">
          {paceText ? <span>{paceText}</span> : <span className="sr-only">Reading together</span>}
          <span>{scoreLabel(shared)}</span>
        </div>
        <div className="bond-tools">
          <div className="bond-actions" role="group" aria-label="Together">
            <button
              type="button"
              className={cn("bond-tool", chat.ownLine && "is-on")}
              aria-pressed={chat.ownLine}
              aria-label="Underline"
              onClick={() => chat.publishUnderline()}
            >
              Line
            </button>
            <button
              type="button"
              className={cn("bond-tool", chat.ownPin && "is-on")}
              aria-pressed={chat.ownPin}
              aria-label="Pin"
              onClick={() => chat.publishPin()}
            >
              Pin
            </button>
            <button type="button" className="bond-tool" aria-label="React" onClick={() => chat.publishPulse()}>
              Glow
            </button>
          </div>
          <div className="bond-emoji-set" role="group" aria-label="Margin emoji">
            {MARGIN_EMOJI.map((glyph) => (
              <button
                key={glyph}
                type="button"
                className={cn("bond-emoji-btn", chat.passageEmoji === glyph && "is-on")}
                aria-pressed={chat.passageEmoji === glyph}
                aria-label={`Emoji ${glyph}`}
                onClick={() => chat.publishEmoji(glyph)}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>
        <form
          className="chat-compose"
          onSubmit={(e) => {
            e.preventDefault();
            chat.sendChat();
          }}
        >
          <input
            className="chat-field"
            value={chat.draft}
            maxLength={280}
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            placeholder={present.length > 0 ? "On this page" : "Waiting on the same page"}
            onChange={(e) => chat.setDraft(e.target.value)}
            suppressHydrationWarning
          />
          <button type="submit" className="chat-send">
            Send
          </button>
        </form>
      </div>
    </>
  );
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { shareOrCopy } from "@/lib/invite-share";
import { fillClass, hashSeed, type Fill } from "@/lib/mondrian";
import { HoldLeave } from "@/components/hourglass";
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
  marginPlace,
  marginReaderName,
  mergeMarginMarks,
  mergeSitLines,
  passedReactionNote,
  peerAside,
  shouldSyncNewcomer,
  sitStatusLabel,
  SIT_REACTIONS,
  type MarginMark,
  type SitLine,
  type SitReaction,
} from "@/lib/multiplayer/sit-logic";
import { enterTogetherCompose, exitTogetherCompose } from "@/lib/vvh";
import { cn } from "@/lib/utils";

const MARKS: Fill[] = ["red", "blue", "yellow", "ink"];

export function markOf(id: string): Fill {
  return MARKS[hashSeed(id) % MARKS.length] ?? "ink";
}

export type ChatLine = SitLine;

type HereNote = { breath: number; place: string };

type Wire =
  | { t: "chat"; text: string; at: number; breath?: number; name?: string }
  | { t: "here"; breath: number; place: string }
  | { t: "sync"; chat: ChatLine[]; here: HereNote; marks?: MarginMark[] };

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

function isSync(data: unknown): data is { t: "sync"; chat: ChatLine[]; here: HereNote; marks?: MarginMark[] } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Wire;
  return msg.t === "sync" && Array.isArray(msg.chat);
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

export function useSittingChat(pair: string, place: string, breathIndex: number, workId = "") {
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
  const [here, setHere] = useState<Record<string, HereNote>>({});
  const [draft, setDraft] = useState("");
  const snap = useRef({ lines, marks, breathIndex, place, selfId: p2p.selfId, workId });
  snap.current = { lines, marks, breathIndex, place, selfId: p2p.selfId, workId };
  const prevConnected = useRef(new Set<string>());
  const progressTimer = useRef<number | null>(null);

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
        if (data && typeof data === "object" && (data as { t?: string }).t === "hello") {
          if (snap.current.lines.length === 0 && snap.current.marks.length === 0) return;
          p2p.send(
            {
              t: "sync",
              chat: snap.current.lines,
              marks: snap.current.marks,
              here: { breath: snap.current.breathIndex, place: snap.current.place },
            },
            from,
          );
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
          const spoken = chatWithoutMargin(incoming, syncedMarks);
          if (spoken.length > 0) setLines((prev) => mergeSitLines(prev, spoken));
        }
      }),
    [p2p.onMessage],
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
      p2p.send(
        {
          t: "sync",
          chat: snap.current.lines,
          marks: snap.current.marks,
          here: { breath: snap.current.breathIndex, place: snap.current.place },
        },
        id,
      );
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
  }, [connectedKey, p2p.send]);

  const sendChat = useCallback(() => {
    const text = draft.trim().slice(0, 280);
    if (!text) return;
    const at = Date.now();
    const from = p2p.selfId;
    p2p.send({ t: "chat", text, at });
    setLines((prev) => mergeSitLines(prev, [{ id: chatLineId(from, at), from, text, at }]));
    setDraft("");
  }, [draft, p2p]);

  const sendReaction = useCallback(
    (word: SitReaction) => {
      const at = Date.now();
      const from = p2p.selfId;
      const id = chatLineId(from, at);
      p2p.send({ t: "chat", text: word, at, breath: breathIndex, name: handle });
      const mark = marginMarkFromChat({
        from,
        text: word,
        at,
        breath: breathIndex,
        id,
        name: handle,
      });
      if (mark) setMarks((prev) => mergeMarginMarks(prev, [mark]));
    },
    [breathIndex, handle, p2p],
  );
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    selfId: p2p.selfId,
    peers: p2p.peers,
    joined: p2p.joined,
    unavailable: p2p.unavailable,
    link: p2p.link,
    lines,
    marks,
    here,
    draft,
    setDraft,
    sendChat,
    sendReaction,
    retry,
  };
}

function isPresent(peer: PeerInfo) {
  return isLivePeer(peer.connectionState);
}

type PlacedMark = {
  id: string;
  top: number;
  name: string;
  text: string;
  word: string;
  from: string;
  place: "beside" | "passed";
};

function samePlace(prev: PlacedMark[], next: PlacedMark[]) {
  if (prev.length !== next.length) return false;
  return prev.every((item, index) => {
    const other = next[index];
    return (
      other &&
      item.id === other.id &&
      item.top === other.top &&
      item.text === other.text &&
      item.name === other.name &&
      item.place === other.place &&
      item.word === other.word
    );
  });
}

function readerName(mark: MarginMark, selfId: string, peers: PeerInfo[]) {
  if (mark.from === selfId) return "you";
  const peer = peers.find((item) => item.id === mark.from);
  const raw = mark.name || peer?.name || "";
  const named = raw ? formatHandle(raw) : "";
  return marginReaderName({ from: mark.from, selfId, name: named });
}

function MarginReactions({
  marks,
  breathIndex,
  selfId,
  peers,
}: {
  marks: MarginMark[];
  breathIndex: number;
  selfId: string;
  peers: PeerInfo[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<PlacedMark[]>([]);
  const liveRef = useRef({ marks, breathIndex, selfId, peers });
  liveRef.current = { marks, breathIndex, selfId, peers };
  const markKey = marks.map((mark) => `${mark.id}:${mark.word}:${mark.breath}:${mark.name ?? ""}`).join("|");
  const nameKey = `${selfId}:${peers.map((peer) => `${peer.id}:${peer.name}`).join("|")}`;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const frame = root?.parentElement;
    if (!root || !frame) return;
    let frameId = 0;
    const measure = () => {
      const { marks: current, breathIndex: viewer, selfId: me, peers: room } = liveRef.current;
      const pane = frame.querySelector(".reading-pane");
      const paneBox = pane?.getBoundingClientRect();
      const frameBox = frame.getBoundingClientRect();
      const anchors = new Map<number, number>();
      if (pane && paneBox) {
        for (const node of pane.querySelectorAll<HTMLElement>("[data-sentence]")) {
          const breath = Number(node.getAttribute("data-sentence"));
          if (!Number.isInteger(breath) || breath < 0) continue;
          const box = node.getBoundingClientRect();
          const visible = Math.min(box.bottom, paneBox.bottom) - Math.max(box.top, paneBox.top);
          if (visible < 12) continue;
          const top = Math.round(Math.max(box.top, paneBox.top) - frameBox.top);
          const previous = anchors.get(breath);
          if (previous == null || top < previous) anchors.set(breath, top);
        }
      }
      const onScreen = [...anchors.keys()];
      const besideCount = new Map<number, number>();
      const passed: MarginMark[] = [];
      const next: PlacedMark[] = [];
      for (const mark of current) {
        const place = marginPlace(mark.breath, viewer, onScreen);
        if (place === "waiting") continue;
        if (place === "passed") {
          passed.push(mark);
          continue;
        }
        const count = besideCount.get(mark.breath) ?? 0;
        besideCount.set(mark.breath, count + 1);
        const top = (anchors.get(mark.breath) ?? 0) + count * 22;
        next.push({
          id: mark.id,
          top,
          name: readerName(mark, me, room),
          text: mark.word,
          word: mark.word,
          from: mark.from,
          place: "beside",
        });
      }
      const nearest = passed.sort((a, b) => b.breath - a.breath || b.at - a.at).slice(0, 4);
      nearest.forEach((mark, index) => {
        next.push({
          id: mark.id,
          top: 8 + index * 22,
          name: readerName(mark, me, room),
          text: passedReactionNote(mark.word, viewer - mark.breath),
          word: mark.word,
          from: mark.from,
          place: "passed",
        });
      });
      setPlaced((prev) => (samePlace(prev, next) ? prev : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(frame);
    const pane = frame.querySelector(".reading-pane");
    if (pane) ro.observe(pane);
    pane?.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      pane?.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [markKey, nameKey, breathIndex]);

  return (
    <div
      ref={rootRef}
      className="margin-reactions"
      data-margin-reactions={marks.length}
      aria-live="polite"
      aria-label="In the margin"
    >
      {placed.map((mark) => (
        <span
          key={mark.id}
          className="margin-reaction"
          style={{ top: mark.top }}
          data-reaction={mark.word}
          data-margin-place={mark.place}
        >
          <span className={cn("margin-dot", fillClass(markOf(mark.from)))} />
          <span className="margin-who">{mark.name}</span>
          <span className="margin-word">{mark.text}</span>
        </span>
      ))}
    </div>
  );
}

export function TogetherShell({
  pair,
  place,
  breathIndex,
  workId = "",
  onLeave,
  inviteUrl,
  onFollow,
  children,
}: {
  pair: string;
  place: string;
  breathIndex: number;
  workId?: string;
  onLeave: () => void;
  inviteUrl?: string;
  onFollow?: (breath: number) => void;
  children: ReactNode;
}) {
  const lock = useSittingLock(onLeave);
  const chat = useSittingChat(pair, place, breathIndex, workId);
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
        <MarginReactions
          marks={chat.marks}
          breathIndex={breathIndex}
          selfId={chat.selfId}
          peers={chat.peers}
        />
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
        <div className="border-t border-ink bg-paper">
          <p id="margin-word-label" className="type-kicker px-3 pb-1 pt-2 text-ink">
            A word on this sentence
          </p>
          <div className="flex" role="group" aria-labelledby="margin-word-label">
            {SIT_REACTIONS.map((word) => (
              <button
                key={word}
                type="button"
                className="h-11 min-w-0 flex-1 border-l border-ink font-sans text-sm text-ink first:border-l-0"
                onClick={() => chat.sendReaction(word)}
              >
                {word}
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

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { ComingSoon } from "@/components/coming-soon";
import { fillClass, hashSeed, type Fill } from "@/lib/mondrian";
import { HoldLeave } from "@/components/hourglass";
import { publishClubProgress } from "@/lib/clubs";
import { asClubId } from "@/lib/club-time";
import { formatHandle } from "@/lib/social";
import { useTbr } from "@/lib/store";
import {
  chatLineId,
  isLivePeer,
  mergeSitLines,
  peerAside,
  shouldSyncNewcomer,
  sitStatusLabel,
  SIT_REACTIONS,
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
  | { t: "chat"; text: string; at: number }
  | { t: "here"; breath: number; place: string }
  | { t: "sync"; chat: ChatLine[]; here: HereNote };

function isChat(data: unknown): data is { t: "chat"; text: string; at: number } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Wire;
  return msg.t === "chat" && typeof msg.text === "string";
}

function isHere(data: unknown): data is { t: "here"; breath: number; place: string } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Wire;
  return msg.t === "here" && typeof msg.place === "string";
}

function isSync(data: unknown): data is { t: "sync"; chat: ChatLine[]; here: HereNote } {
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
  const p2p = useP2PRoom({
    room: `sit-${pair}`.slice(0, 64),
    name: handle,
  });
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [here, setHere] = useState<Record<string, HereNote>>({});
  const [draft, setDraft] = useState("");
  const snap = useRef({ lines, breathIndex, place, selfId: p2p.selfId, workId });
  snap.current = { lines, breathIndex, place, selfId: p2p.selfId, workId };
  const prevConnected = useRef(new Set<string>());
  const progressTimer = useRef<number | null>(null);

  useEffect(
    () =>
      p2p.onMessage((from, data) => {
        if (isChat(data)) {
          const text = data.text.trim().slice(0, 280);
          if (!text) return;
          const at = typeof data.at === "number" ? data.at : Date.now();
          setLines((prev) => mergeSitLines(prev, [{ id: chatLineId(from, at), from, text, at }]));
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
          if (snap.current.lines.length === 0) return;
          p2p.send(
            {
              t: "sync",
              chat: snap.current.lines,
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
          if (incoming.length === 0) return;
          setLines((prev) => mergeSitLines(prev, incoming));
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
      p2p.send({ t: "chat", text: word, at });
      setLines((prev) => mergeSitLines(prev, [{ id: chatLineId(from, at), from, text: word, at }]));
    },
    [p2p],
  );

  return {
    selfId: p2p.selfId,
    peers: p2p.peers,
    joined: p2p.joined,
    unavailable: p2p.unavailable,
    link: p2p.link,
    lines,
    here,
    draft,
    setDraft,
    sendChat,
    sendReaction,
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
  onLeave,
  children,
}: {
  pair: string;
  place: string;
  breathIndex: number;
  workId?: string;
  onLeave: () => void;
  children: ReactNode;
}) {
  const lock = useSittingLock(onLeave);
  const chat = useSittingChat(pair, place, breathIndex, workId);
  const [live, setLive] = useState(false);
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
  const status = chat.unavailable ? "" : sitStatusLabel(chat.link, chat.joined, present.length);
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
  const visible = chat.lines.slice(-6);

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
        </div>
      </header>
      {children}
      {chat.unavailable ? (
        <ComingSoon detail="A live room with a friend is coming soon. This page is still yours to read." />
      ) : (
      <div
        ref={dockRef}
        className="together-dock"
        onPointerDownCapture={beginCompose}
        onFocusCapture={beginCompose}
        onBlurCapture={(event) => endCompose(event.currentTarget)}
      >
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
        <div className="flex overflow-x-auto border-t border-ink">
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
      )}
    </>
  );
}

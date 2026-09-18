import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { fillClass, hashSeed, type Fill } from "@/lib/mondrian";
import { HoldLeave } from "@/components/hourglass";
import { enterTogetherCompose, exitTogetherCompose } from "@/lib/vvh";
import { cn } from "@/lib/utils";

const MARKS: Fill[] = ["red", "blue", "yellow", "ink"];

export function markOf(id: string): Fill {
  return MARKS[hashSeed(id) % MARKS.length] ?? "ink";
}

export type ChatLine = {
  id: string;
  from: string;
  text: string;
  at: number;
};

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

export function useSittingChat(pair: string, place: string, breathIndex: number) {
  const p2p = useP2PRoom({ room: `sit-${pair}`.slice(0, 64), name: "" });
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [here, setHere] = useState<Record<string, HereNote>>({});
  const [draft, setDraft] = useState("");
  const snap = useRef({ lines, breathIndex, place, selfId: p2p.selfId });
  snap.current = { lines, breathIndex, place, selfId: p2p.selfId };
  const prevConnected = useRef(new Set<string>());

  useEffect(
    () =>
      p2p.onMessage((from, data) => {
        if (isChat(data)) {
          const text = data.text.trim().slice(0, 280);
          if (!text) return;
          const at = typeof data.at === "number" ? data.at : Date.now();
          setLines((prev) => {
            const id = `${from}-${at}`;
            if (prev.some((line) => line.id === id)) return prev;
            return [...prev, { id, from, text, at }].slice(-16);
          });
          return;
        }
        if (isHere(data)) {
          setHere((prev) => ({
            ...prev,
            [from]: { breath: Number(data.breath) || 0, place: data.place.slice(0, 80) },
          }));
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
          setLines((prev) => {
            const seen = new Set(prev.map((line) => line.id));
            const next = [...prev];
            for (const line of incoming) {
              if (seen.has(line.id) || !line.text) continue;
              seen.add(line.id);
              next.push(line);
            }
            return next.sort((a, b) => a.at - b.at).slice(-16);
          });
        }
      }),
    [p2p.onMessage],
  );

  const connectedKey = p2p.peers
    .filter((peer) => peer.connectionState === "connected")
    .map((peer) => peer.id)
    .join();

  useEffect(() => {
    p2p.broadcast({ t: "here", breath: breathIndex, place });
  }, [breathIndex, place, connectedKey, p2p.broadcast]);

  useEffect(() => {
    const connected = new Set(connectedKey.split(",").filter(Boolean));
    const newcomers = [...connected].filter((id) => !prevConnected.current.has(id));
    const incumbents = [snap.current.selfId, ...prevConnected.current];
    for (const id of newcomers) {
      if (incumbents.slice().sort()[0] !== snap.current.selfId) continue;
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
    p2p.send({ t: "chat", text, at });
    setLines((prev) =>
      [...prev, { id: `${p2p.selfId}-${at}`, from: p2p.selfId, text, at }].slice(-16),
    );
    setDraft("");
  }, [draft, p2p]);

  return {
    selfId: p2p.selfId,
    peers: p2p.peers,
    joined: p2p.joined,
    lines,
    here,
    draft,
    setDraft,
    sendChat,
  };
}

function isPresent(peer: PeerInfo, here: Record<string, HereNote>, lines: ChatLine[]) {
  if (peer.connectionState === "connected") return true;
  if (peer.rttMs != null) return true;
  if (here[peer.id]) return true;
  return lines.some((line) => line.from === peer.id);
}

function presenceLabel(joined: boolean, present: number, peers: PeerInfo[], offline?: boolean) {
  if (present > 0) return "";
  if (offline && !joined) return "needs a server";
  if (!joined) return "sitting";
  const failed = peers.filter((peer) => peer.connectionState === "failed");
  if (failed.length > 0 && failed.length === peers.length) return "can't reach";
  return "waiting";
}

export function TogetherShell({
  pair,
  place,
  breathIndex,
  onLeave,
  children,
}: {
  pair: string;
  place: string;
  breathIndex: number;
  onLeave: () => void;
  children: ReactNode;
}) {
  const lock = useSittingLock(onLeave);
  const chat = useSittingChat(pair, place, breathIndex);
  const [live, setLive] = useState(false);
  const [offline, setOffline] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => setLive(true), []);
  useEffect(() => {
    if (chat.joined) return;
    const timer = window.setTimeout(() => setOffline(true), 4000);
    return () => window.clearTimeout(timer);
  }, [chat.joined]);
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

  const present = chat.peers.filter((peer) => isPresent(peer, chat.here, chat.lines));
  const status = presenceLabel(chat.joined, present.length, chat.peers, offline);
  const elsewhere = [
    ...new Set(
      present
        .map((peer) => chat.here[peer.id]?.place)
        .filter((item): item is string => Boolean(item) && item !== place),
    ),
  ];
  const visible = chat.lines.slice(-6);

  return (
    <>
      <header className="relative z-50 flex h-12 shrink-0 items-stretch overflow-hidden border-b border-ink">
        <HoldLeave progress={lock.hold} onStart={lock.startHold} onEnd={lock.clearHold} />
        <p className="flex min-w-0 flex-1 items-center truncate bg-paper px-3 font-sans text-xs tracking-wide text-ink">
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
                    isPresent(peer, chat.here, chat.lines)
                      ? fillClass(markOf(peer.id))
                      : peer.connectionState === "failed"
                        ? "bg-ink/30"
                        : "border border-ink bg-paper",
                  )}
                />
              ))
            : null}
          {status ? (
            <span className="font-sans text-xs tracking-wide text-muted">{status}</span>
          ) : null}
        </div>
      </header>
      {children}
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
              at {item}
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

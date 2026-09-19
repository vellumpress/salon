import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HoldLeave, Hourglass } from "@/components/hourglass";

export const Route = createFileRoute("/glass")({
  component: GlassPage,
});

const DURATIONS = [1, 15, 20, 30, 45, 60] as const;

type Phase = "pick" | "run" | "broken" | "done";

function formatLeft(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function GlassPage() {
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState<number>(20);
  const [phase, setPhase] = useState<Phase>("pick");
  const [endsAt, setEndsAt] = useState(0);
  const [leftMs, setLeftMs] = useState(0);
  const [durationMs, setDurationMs] = useState(20 * 60 * 1000);
  const [hold, setHold] = useState(0);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef(0);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const remaining = durationMs > 0 ? leftMs / durationMs : 0;

  function clearHold() {
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHold(0);
  }

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

  async function unlockScreen() {
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
  }

  function begin() {
    const ms = minutes * 60 * 1000;
    setDurationMs(ms);
    setEndsAt(Date.now() + ms);
    setLeftMs(ms);
    setPhase("run");
    void lockScreen();
  }

  function leave() {
    clearHold();
    void unlockScreen();
    void navigate({ to: "/" });
  }

  function resume() {
    setEndsAt(Date.now() + leftMs);
    setPhase("run");
    void lockScreen();
  }

  function startHold() {
    holdStart.current = Date.now();
    setHold(0.04);
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - holdStart.current) / 3200);
      setHold(p);
      if (p >= 1) {
        clearHold();
        leave();
      }
    }, 50);
  }

  useEffect(() => {
    if (phase !== "run") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setLeftMs(left);
      if (left <= 0) {
        setPhase("done");
        void unlockScreen();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, endsAt]);

  useEffect(() => {
    if (phase !== "run") return;
    const trap = () => {
      history.pushState({ glass: 1 }, "");
    };
    history.pushState({ glass: 1 }, "");
    window.addEventListener("popstate", trap);
    return () => window.removeEventListener("popstate", trap);
  }, [phase]);

  useEffect(() => {
    if (phase !== "run") return;
    const onVis = () => {
      if (document.hidden) {
        setLeftMs(Math.max(0, endsAt - Date.now()));
        setPhase("broken");
        void unlockScreen();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, endsAt]);

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  useEffect(() => () => {
    clearHold();
    void unlockScreen();
  }, []);

  if (phase === "pick") {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <button
            type="button"
            onClick={leave}
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </button>
          <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
            Hourglass
          </h1>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto p-5 sm:p-10">
          <p className="font-serif text-lg text-ink/70">A sitting for a book in the hand.</p>
          <div className="mt-6 grid grid-cols-3 gap-px bg-ink sm:mt-10 sm:grid-cols-6">
            {DURATIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMinutes(n)}
                className={`h-16 font-sans text-sm ${minutes === n ? "bg-ink text-paper" : "bg-paper text-ink"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={begin}
            className="mt-px flex h-16 items-center justify-center bg-red font-sans text-sm text-paper"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        {phase === "run" ? (
          <HoldLeave progress={hold} onStart={startHold} onEnd={clearHold} />
        ) : (
          <button
            type="button"
            onClick={leave}
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Home
          </button>
        )}
        <p className="flex min-w-0 flex-1 items-center justify-end px-4 font-sans text-sm tracking-wide">
          {phase === "done" ? "0:00" : formatLeft(leftMs)}
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <Hourglass remaining={phase === "done" ? 0 : remaining} running={phase === "run"} />
        {phase === "broken" ? (
          <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-px bg-ink">
            <button
              type="button"
              onClick={leave}
              className="h-14 bg-ink font-sans text-sm text-paper"
            >
              Leave
            </button>
            <button
              type="button"
              onClick={resume}
              className="h-14 bg-paper font-sans text-sm text-ink"
            >
              Continue
            </button>
          </div>
        ) : null}
        {phase === "done" ? (
          <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-px bg-ink">
            <button
              type="button"
              onClick={leave}
              className="h-14 bg-ink font-sans text-sm text-paper"
            >
              Leave
            </button>
            <button
              type="button"
              onClick={begin}
              className="h-14 bg-paper font-sans text-sm text-ink"
            >
              Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

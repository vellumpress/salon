import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLASSIC_LOCAL_WORKS } from "@/lib/catalog/full-pdf";
import { useVisitSeed } from "@/lib/use-visit-seed";
import {
  nextStripCount,
  STRIP_BATCH,
  STRIP_DRIFT_START_MS,
  STRIP_PRELOAD_PX,
  stripDriftDelta,
  stripItems,
} from "@/lib/works-strip";
import { WorksCard } from "@/components/works-card";

export function WorksStrip() {
  const visit = useVisitSeed();
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(STRIP_BATCH);
  const [browsing, setBrowsing] = useState(false);

  const items = useMemo(
    () => stripItems(CLASSIC_LOCAL_WORKS, visit, count),
    [visit, count],
  );

  const engage = useCallback(() => setBrowsing(true), []);

  const grow = useCallback(() => {
    setCount((current) => nextStripCount(current, CLASSIC_LOCAL_WORKS.length));
  }, []);

  useEffect(() => {
    setCount(STRIP_BATCH);
    setBrowsing(false);
  }, [visit]);

  // One extra batch if the first doesn't overflow. Drift must not keep
  // appending the whole shelf — that mounted thousands of cards.
  useEffect(() => {
    const pane = scroller.current;
    if (!pane) return;
    if (pane.scrollWidth > pane.clientWidth + STRIP_PRELOAD_PX) return;
    const cap = Math.min(CLASSIC_LOCAL_WORKS.length, STRIP_BATCH * 2);
    setCount((current) => {
      if (current >= cap) return current;
      return Math.min(cap, nextStripCount(current, CLASSIC_LOCAL_WORKS.length));
    });
  }, [items]);

  useEffect(() => {
    if (!browsing) return;
    const pane = scroller.current;
    const target = sentinel.current;
    if (!pane || !target || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) grow();
      },
      { root: pane, rootMargin: `0px ${STRIP_PRELOAD_PX}px 0px 0px`, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [browsing, items.length, grow]);

  useEffect(() => {
    const pane = scroller.current;
    const host = root.current;
    if (!pane || !host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let paused = false;
    let drifting = false;
    let onScreen = true;
    let last = 0;
    let raf = 0;
    let carry = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = (now: number) => {
      if (!drifting || paused || motion.matches || document.hidden || !onScreen) {
        raf = 0;
        last = now;
        return;
      }
      carry += stripDriftDelta(now - last);
      last = now;
      const step = Math.floor(carry);
      if (step > 0) {
        pane.scrollLeft += step;
        carry -= step;
      }
      raf = requestAnimationFrame(tick);
    };

    const arm = () => {
      if (raf || !drifting || paused || motion.matches || document.hidden || !onScreen) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
      stop();
    };

    const start = window.setTimeout(() => {
      drifting = true;
      arm();
    }, STRIP_DRIFT_START_MS);

    const opts = { passive: true } as const;
    host.addEventListener("pointerdown", pause, opts);
    host.addEventListener("wheel", pause, opts);
    host.addEventListener("focusin", pause);
    const onMotion = () => {
      if (motion.matches) pause();
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else arm();
    };
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    const watch =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            onScreen = Boolean(entry?.isIntersecting);
            if (onScreen) arm();
            else stop();
          })
        : null;
    watch?.observe(host);

    return () => {
      window.clearTimeout(start);
      stop();
      host.removeEventListener("pointerdown", pause);
      host.removeEventListener("wheel", pause);
      host.removeEventListener("focusin", pause);
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      watch?.disconnect();
    };
  }, []);

  if (CLASSIC_LOCAL_WORKS.length === 0) return null;

  return (
    <nav ref={root} className="cell-works" aria-label="Works">
      <div
        ref={scroller}
        className="works-scroller"
        onPointerDown={engage}
        onWheel={engage}
        onFocus={engage}
        onScroll={(event) => {
          if (!browsing) return;
          const pane = event.currentTarget;
          if (pane.scrollWidth - pane.scrollLeft - pane.clientWidth < STRIP_PRELOAD_PX) {
            grow();
          }
        }}
      >
        {items.map((item) => (
          <WorksCard key={item.key} work={item.work} />
        ))}
        <div ref={sentinel} className="works-sentinel" aria-hidden="true" />
      </div>
    </nav>
  );
}

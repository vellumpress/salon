import { Link } from "@tanstack/react-router";
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
import { PlaceChip } from "@/components/place-chip";
import { prefetchWork } from "@/lib/works";

export function WorksStrip() {
  const visit = useVisitSeed();
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(STRIP_BATCH);

  const items = useMemo(
    () => stripItems(CLASSIC_LOCAL_WORKS, visit, count),
    [visit, count],
  );

  const grow = useCallback(() => {
    setCount((current) => nextStripCount(current, CLASSIC_LOCAL_WORKS.length));
  }, []);

  useEffect(() => {
    setCount(STRIP_BATCH);
  }, [visit]);

  useEffect(() => {
    const pane = scroller.current;
    if (!pane) return;
    if (pane.scrollWidth <= pane.clientWidth + STRIP_PRELOAD_PX) grow();
  }, [items, grow]);

  useEffect(() => {
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
  }, [items.length, grow]);

  useEffect(() => {
    const pane = scroller.current;
    const host = root.current;
    if (!pane || !host) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let paused = false;
    let drifting = false;
    let last = 0;
    let raf = 0;
    let carry = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!drifting || paused || motion.matches) {
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
    };

    const pause = () => {
      paused = true;
    };

    const start = window.setTimeout(() => {
      drifting = true;
      last = performance.now();
    }, STRIP_DRIFT_START_MS);

    raf = requestAnimationFrame(tick);
    const opts = { passive: true } as const;
    host.addEventListener("pointerdown", pause, opts);
    host.addEventListener("wheel", pause, opts);
    host.addEventListener("focusin", pause);
    const onMotion = () => {
      if (motion.matches) paused = true;
    };
    motion.addEventListener("change", onMotion);

    return () => {
      window.clearTimeout(start);
      cancelAnimationFrame(raf);
      host.removeEventListener("pointerdown", pause);
      host.removeEventListener("wheel", pause);
      host.removeEventListener("focusin", pause);
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  if (CLASSIC_LOCAL_WORKS.length === 0) return null;

  return (
    <nav ref={root} className="cell-works" aria-label="Works">
      <div
        ref={scroller}
        className="works-scroller"
        onScroll={(event) => {
          const pane = event.currentTarget;
          if (pane.scrollWidth - pane.scrollLeft - pane.clientWidth < STRIP_PRELOAD_PX) {
            grow();
          }
        }}
      >
        {items.map((item) => (
          <Link
            key={item.key}
            to="/read/$workId"
            params={{ workId: item.work.id }}
            preload="intent"
            onPointerDown={() => prefetchWork(item.work.id)}
            onFocus={() => prefetchWork(item.work.id)}
            className="works-card"
          >
            <span className="works-title">{item.work.title}</span>
            <span className="works-author">{item.work.author}</span>
            <PlaceChip work={item.work} tone="accent" className="works-place" />
          </Link>
        ))}
        <div ref={sentinel} className="works-sentinel" aria-hidden="true" />
      </div>
    </nav>
  );
}

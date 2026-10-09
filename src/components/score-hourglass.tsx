import { useId, useLayoutEffect, useState } from "react";
import type { ReadingModel } from "@/lib/reading-score";
import {
  GLASS,
  GLASS_LOWER_CLIP,
  GLASS_UPPER_CLIP,
  SETTLE_MS,
  easeSettle,
  hourglassCopy,
  sandBands,
  sandGrains,
} from "@/lib/score-hourglass";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Today's score as a small classical hourglass. The number, or a state word,
 * sits under the glass in Cormorant and does not cross the sand.
 */
export function ScoreHourglass({
  model,
  hide,
  paused,
}: {
  model: ReadingModel;
  hide: boolean;
  paused: boolean;
}) {
  const daily = model.daily;
  const bands = sandBands(daily.contributors);
  const copy = hourglassCopy({
    kind: daily.kind,
    total: daily.total,
    label: daily.label,
    hide,
    paused,
    learning: Boolean(daily.learningNote),
    scored: bands.length > 0,
  });
  const target = copy.sand;
  const [shown, setShown] = useState<number | null>(target == null ? null : 0);
  const uid = useId().replace(/:/g, "");
  const upperClip = `${uid}-up`;
  const lowerClip = `${uid}-dn`;

  useLayoutEffect(() => {
    if (target == null) {
      setShown(null);
      return;
    }
    if (target === 0 || prefersReducedMotion()) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    setShown(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SETTLE_MS);
      setShown(target * easeSettle(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const grains = shown == null ? [] : sandGrains(shown);

  return (
    <figure
      className="score-glass mx-auto mt-3 flex w-full max-w-xs flex-col items-center"
      data-score-glass={copy.state}
      data-sand={copy.sand == null ? "empty" : String(copy.sand)}
    >
      <svg
        viewBox={`0 0 ${GLASS.viewW} ${GLASS.viewH}`}
        className="score-glass-svg text-ink"
        role="img"
        aria-label={copy.aria}
      >
        <defs>
          <clipPath id={upperClip}>
            <polygon points={GLASS_UPPER_CLIP} />
          </clipPath>
          <clipPath id={lowerClip}>
            <polygon points={GLASS_LOWER_CLIP} />
          </clipPath>
        </defs>
        {grains.map((grain) => (
          <circle
            key={grain.id}
            cx={grain.cx}
            cy={grain.cy}
            r={grain.r}
            fill="currentColor"
            clipPath={
              grain.id.startsWith("neck-")
                ? undefined
                : grain.cy <= GLASS.upper.apexY
                  ? `url(#${upperClip})`
                  : `url(#${lowerClip})`
            }
          />
        ))}
        <polygon
          points={GLASS.outline}
          fill="none"
          stroke="currentColor"
          strokeWidth={GLASS.stroke}
          strokeLinejoin="miter"
        />
        <rect
          x={GLASS.cap.x}
          y={GLASS.cap.top}
          width={GLASS.cap.width}
          height={GLASS.cap.height}
          fill="currentColor"
        />
        <rect
          x={GLASS.cap.x}
          y={GLASS.cap.bottom}
          width={GLASS.cap.width}
          height={GLASS.cap.height}
          fill="currentColor"
        />
      </svg>
      <figcaption className="score-glass-label">
        <span className="type-title tabular-nums text-ink">{copy.primary}</span>
        {copy.secondary ? <span className="type-kicker mt-1 block text-ink/70">{copy.secondary}</span> : null}
      </figcaption>
    </figure>
  );
}

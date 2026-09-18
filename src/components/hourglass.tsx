import { useId } from "react";
import { cn } from "@/lib/utils";

export function Hourglass({
  remaining,
  running,
  size = "lg",
  className,
}: {
  remaining: number;
  running: boolean;
  size?: "lg" | "sm";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const upper = Math.max(0, Math.min(1, remaining));
  const lower = 1 - upper;
  const upperH = 6 + upper * 68;
  const lowerH = 6 + lower * 68;
  const upperClip = `${uid}-up`;
  const lowerClip = `${uid}-dn`;
  const compact = size === "sm";

  return (
    <svg
      viewBox="0 0 120 220"
      className={cn(
        compact ? "h-7 w-4" : "h-64 w-36 sm:h-80 sm:w-44",
        className,
      )}
      aria-hidden
    >
      <defs>
        <clipPath id={upperClip}>
          <polygon points="22,22 98,22 60,108" />
        </clipPath>
        <clipPath id={lowerClip}>
          <polygon points="22,198 98,198 60,112" />
        </clipPath>
      </defs>
      <polygon
        points="16,12 104,12 60,110 104,208 16,208 60,110"
        fill="none"
        stroke="currentColor"
        strokeWidth={compact ? 5 : 3}
      />
      <rect x="10" y="8" width="100" height="8" fill="currentColor" />
      <rect x="10" y="204" width="100" height="8" fill="currentColor" />
      <rect
        x="22"
        y={108 - upperH}
        width="76"
        height={upperH}
        clipPath={`url(#${upperClip})`}
        className="fill-yellow"
      />
      <rect
        x="22"
        y={112}
        width="76"
        height={lowerH}
        clipPath={`url(#${lowerClip})`}
        className="fill-yellow"
      />
      {running && remaining > 0.02 && remaining < 0.98 ? (
        <line
          x1="60"
          y1="108"
          x2="60"
          y2="140"
          stroke="currentColor"
          strokeWidth={compact ? 3 : 1.75}
          className="glass-stream"
        />
      ) : null}
    </svg>
  );
}

export function HoldLeave({
  progress,
  onStart,
  onEnd,
}: {
  progress: number;
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Hold to leave"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onStart();
      }}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      className="relative inline-flex h-12 min-w-32 shrink-0 items-center justify-center bg-ink px-3 text-paper"
    >
      <span className="absolute inset-x-0 bottom-0 bg-red" style={{ height: `${Math.round(progress * 100)}%` }} />
      <span className={cn("relative font-sans text-sm", progress > 0.5 && "text-paper")}>Hold to leave</span>
    </button>
  );
}

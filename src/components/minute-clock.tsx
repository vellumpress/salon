import type { FocusEvent } from "react";
import { clockFace, clockValue, parseClock } from "@/lib/streak-notify";
import { cn } from "@/lib/utils";

/**
 * WebKit draws seconds on a native time field even when the value is hours
 * and minutes. The field stays native so the system picker still opens.
 * The resting face is hours and minutes only.
 */
export function MinuteClock({
  value,
  onChange,
  onFocus,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  const parsed = parseClock(value);
  const shown = parsed ? clockValue(parsed.hour, parsed.minute) : value;
  return (
    <span className="relative flex min-w-0 flex-1 items-center">
      <span aria-hidden="true" className={cn(className, "pointer-events-none")}>
        {parsed ? clockFace(shown) : value}
      </span>
      <input
        type="time"
        step={60}
        value={shown}
        onChange={(event) => {
          const next = parseClock(event.target.value);
          onChange(next ? clockValue(next.hour, next.minute) : event.target.value);
        }}
        onFocus={onFocus}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}

import { cn } from "../lib/hash";
import { SIT_OPTIONS, type SitMinutes } from "../lib/sitting";

type Props = {
  value: SitMinutes;
  onChange: (value: SitMinutes) => void;
  compact?: boolean;
};

export function DurationControl({ value, onChange, compact = false }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="How long to sit"
      className={cn(
        "duration-control",
        compact ? "duration-control-compact" : "",
      )}
    >
      {SIT_OPTIONS.map((option) => {
        const on = option.minutes === value;
        return (
          <button
            key={option.minutes}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn("duration-option", on && "is-on")}
            onClick={() => onChange(option.minutes)}
          >
            {compact ? option.short : option.label}
          </button>
        );
      })}
    </div>
  );
}

import { cn } from "../lib/hash";
import { SIT_PRESETS } from "../lib/sitting";

type Props = {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
};

export function DurationControl({ value, onChange, compact = false }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="How long to sit"
      className={cn("sit-presets", compact && "sit-presets-compact")}
    >
      {SIT_PRESETS.map((option) => {
        const on = option.minutes === value;
        return (
          <button
            key={option.minutes}
            type="button"
            role="radio"
            aria-checked={on}
            className={cn("sit-preset", on && "sit-preset-on")}
            onClick={() => onChange(option.minutes)}
          >
            {compact ? option.short : option.label}
          </button>
        );
      })}
    </div>
  );
}

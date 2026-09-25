import { cn } from "@/lib/utils";

/**
 * Hourglass seal — time waiting to be spent.
 * Drawn small enough to sit beside You without a second wordmark.
 */
export function BrandSeal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 36"
      className={cn("h-4 w-2.5 shrink-0 text-oxblood", className)}
      aria-hidden="true"
    >
      <rect x="3" y="1.5" width="18" height="2" fill="currentColor" />
      <rect x="3" y="32.5" width="18" height="2" fill="currentColor" />
      <path
        d="M5 4.5 L19 4.5 L12 17.2 L19 31.5 L5 31.5 L12 17.2 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="miter"
      />
      <path d="M8.2 8.2 L15.8 8.2 L12 14.2 Z" fill="currentColor" />
      <path d="M7.2 28.4 L16.8 28.4 L12 21.2 Z" fill="currentColor" opacity="0.55" />
      <line
        x1="12"
        y1="17.2"
        x2="12"
        y2="21"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeDasharray="0.8 1.1"
      />
    </svg>
  );
}

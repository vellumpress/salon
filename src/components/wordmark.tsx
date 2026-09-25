import { cn } from "@/lib/utils";

/**
 * Logo. Always lowercase `tbr` plus the oxblood full stop.
 * The stop belongs to the mark; the tagline is not shown beside it.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("wordmark", className)}>
      <span className="wordmark-name">
        tbr<span className="wordmark-stop">.</span>
      </span>
    </span>
  );
}

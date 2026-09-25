import { cn } from "@/lib/utils";

/**
 * Brand lockup. Always lowercase `tbr` plus the oxblood full stop.
 * The stop belongs to the logo; running copy keeps using APP_NAME.
 */
export function Wordmark({
  lockup = false,
  className,
}: {
  /** Stack the italic tagline under the mark. */
  lockup?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("wordmark", lockup && "wordmark-lockup", className)}>
      <span className="wordmark-name">
        tbr<span className="wordmark-stop">.</span>
      </span>
      {lockup ? <span className="wordmark-tagline">to be read</span> : null}
    </span>
  );
}

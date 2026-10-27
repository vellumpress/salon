import {
  chapterTickPercents,
  readingProgressRatio,
  type ReadingProgressInput,
} from "@/lib/reading-progress";
import "./reading-progress.css";

/**
 * Title and hairline progress along the bottom of the solo reader,
 * beside the hourglass. Absolute, so it does not move the column.
 */
export function ReadingProgress({
  title,
  chapterStarts,
  ...place
}: ReadingProgressInput & {
  title: string;
  chapterStarts: readonly number[];
}) {
  const label = title.replace(/\s+/g, " ").trim();
  const ratio = readingProgressRatio(place);
  const ticks = chapterTickPercents(chapterStarts, place.length);
  return (
    <div className="reading-progress" data-reading-progress="" data-progress={String(ratio)}>
      {label ? <p className="reading-progress-title">{label}</p> : null}
      <div
        className="reading-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={1000}
        aria-valuenow={Math.round(ratio * 1000)}
        aria-label={label || "Reading progress"}
      >
        <span className="reading-progress-rail" aria-hidden="true" />
        <span className="reading-progress-fill" style={{ width: `${ratio * 100}%` }} />
        {ticks.map((tick, index) => (
          <span
            key={`${tick.toFixed(4)}-${index}`}
            className="reading-progress-tick"
            style={{ left: `${tick}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

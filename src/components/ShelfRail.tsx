import type { Work } from "../catalog/works";
import { fillSequence } from "../lib/mondrian";
import type { WorkProgress } from "../lib/storage";
import { WorkCard } from "./WorkCard";

type Props = {
  label: string;
  items: Work[];
  progress: Record<string, WorkProgress>;
  visit: number;
};

export function progressRatio(
  progress: WorkProgress | undefined,
  fallback = 200,
): number {
  if (!progress?.entered) return 0;
  if (progress.completedAt) return 1;
  if (progress.scrollRatio > 0) return Math.min(0.92, progress.scrollRatio);
  return Math.min(0.92, progress.paragraphIndex / Math.max(12, fallback));
}

export function ShelfRail({ label, items, progress, visit }: Props) {
  const fills = fillSequence(items.length, `${label}-${visit}`);

  return (
    <>
      <div className="cell-label">
        <span className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
          {label}
        </span>
      </div>
      <div className="cell-rail" aria-label={label}>
        <div className="rail">
          {items.map((work, index) => (
            <WorkCard
              key={`${label}-${work.id}`}
              work={work}
              fill={fills[index]}
              rail="unit"
              ratio={progressRatio(progress[work.id])}
            />
          ))}
        </div>
      </div>
    </>
  );
}

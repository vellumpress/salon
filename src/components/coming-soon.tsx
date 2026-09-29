import { cn } from "@/lib/utils";

/** Quiet stand-in for a hosted action this Pages build cannot run. */
export function ComingSoon({
  detail,
  className,
}: {
  detail: string;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-ink bg-yellow px-4 py-4 text-ink", className)}>
      <p className="type-kicker">Coming soon</p>
      <p className="mt-1 font-serif text-lg leading-snug">{detail}</p>
    </div>
  );
}

import { projectPin, type PlacedWork } from "@/lib/literature-geo";

type Props = {
  works: PlacedWork[];
  selected: string | null;
  onSelect: (id: string) => void;
};

export function TitlesMap({ works, selected, onSelect }: Props) {
  return (
    <div className="titles-map relative overflow-hidden bg-paper" role="img" aria-label="Map of titles by literary geography">
      <span className="pointer-events-none absolute inset-y-0 left-[12%] w-px bg-ink/15" />
      <span className="pointer-events-none absolute inset-y-0 left-[32%] w-px bg-ink/15" />
      <span className="pointer-events-none absolute inset-y-0 left-[52%] w-px bg-ink/15" />
      <span className="pointer-events-none absolute inset-y-0 left-[72%] w-px bg-ink/15" />
      <span className="pointer-events-none absolute inset-x-0 top-[22%] h-px bg-ink/15" />
      <span className="pointer-events-none absolute inset-x-0 top-[48%] h-px bg-ink/15" />
      <span className="pointer-events-none absolute inset-x-0 top-[72%] h-px bg-ink/15" />
      {/* soft continent hints */}
      <span className="pointer-events-none absolute left-[8%] top-[28%] h-[34%] w-[18%] rounded-[40%] bg-ink/[0.04]" />
      <span className="pointer-events-none absolute left-[28%] top-[22%] h-[42%] w-[14%] rounded-[45%] bg-ink/[0.05]" />
      <span className="pointer-events-none absolute left-[48%] top-[30%] h-[28%] w-[22%] rounded-[40%] bg-ink/[0.04]" />
      <span className="pointer-events-none absolute left-[72%] top-[34%] h-[26%] w-[16%] rounded-[40%] bg-ink/[0.04]" />
      <span className="pointer-events-none absolute left-[78%] top-[62%] h-[16%] w-[12%] rounded-[40%] bg-ink/[0.04]" />
      {works.map((work) => {
        const live = work.id === selected;
        return (
          <button
            key={work.id}
            type="button"
            title={`${work.title} — ${work.place}`}
            aria-label={`${work.title} by ${work.author}`}
            aria-pressed={live}
            onClick={() => onSelect(work.id)}
            className={`title-pin${live ? " is-live" : ""}${work.readable ? " is-readable" : ""}`}
            style={projectPin(work.lat, work.lng)}
          />
        );
      })}
    </div>
  );
}

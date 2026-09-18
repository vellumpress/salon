import { Link } from "@tanstack/react-router";

type Props = {
  current: "discover" | "you" | "shuffle";
};

export function Mark({ current }: Props) {
  return (
    <div className="cell-mark flex bg-paper">
      <Link
        to="/"
        className="flex h-full min-w-0 flex-1 items-center self-stretch bg-paper px-4 font-display text-xl font-medium tracking-tight text-ink sm:text-2xl"
      >
        Salon
      </Link>
      {current === "you" ? (
        <Link
          to="/"
          className="flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 font-sans text-sm text-ink"
        >
          Discover
        </Link>
      ) : (
        <Link
          to="/you"
          className="flex h-full shrink-0 items-center self-stretch border-l border-ink/15 bg-paper px-4 font-sans text-sm text-ink"
        >
          You
        </Link>
      )}
    </div>
  );
}

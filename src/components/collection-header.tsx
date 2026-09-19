import { Link } from "@tanstack/react-router";

/** Quiet section rule; when `linked`, the header opens the private collection. */
export function CollectionHeader({
  children,
  hash,
  linked = false,
}: {
  children: string;
  hash?: "books" | "lines";
  linked?: boolean;
}) {
  const className =
    "flex items-center justify-between border-b border-ink px-4 py-3 type-kicker text-muted";
  if (linked) {
    return (
      <Link to="/profile/collection" hash={hash} className={className}>
        <span>{children}</span>
        <span>Collection</span>
      </Link>
    );
  }
  return <p className={className}>{children}</p>;
}

import { Wordmark } from "@/components/wordmark";

/**
 * The Pages shell prerenders this mark. The first client paint of a direct
 * open must match it, or React hydration error #418 fires.
 */
export function PagesShell() {
  return (
    <div className="flex min-h-svh items-end bg-paper p-8 text-ink">
      <Wordmark />
    </div>
  );
}

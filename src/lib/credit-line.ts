/**
 * Author, then the year, the same way the shelf card writes it.
 * A missing year leaves the name alone, with no stray separator.
 */
export function creditLine(author: string, year: number | string | null | undefined): string {
  const name = author.trim();
  const dated = year == null ? "" : String(year).trim();
  if (!dated) return name;
  if (!name) return dated;
  return `${name} · ${dated}`;
}

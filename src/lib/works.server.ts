import { isEnReadableOff } from "./catalog/en-rights";
import { shelfWork } from "./catalog/shelf";
import { loadGutenbergOpening, loadGutenbergWork } from "./gutenberg.server";
import { doorWork, packWork, type PackedWork } from "./work-shape";

export async function loadShelfWork(id: string, opening: boolean): Promise<PackedWork | null> {
  const entry = shelfWork(id);
  if (!entry) return null;
  if (isEnReadableOff(id)) return packWork(doorWork(entry), true);

  if (entry.gutenberg && !entry.local) {
    try {
      const data = {
        id: entry.id,
        title: entry.title,
        author: entry.author,
        year: String(entry.year),
        minutes: entry.minutes,
        gutenberg: entry.gutenberg,
      };
      if (opening) {
        const next = await loadGutenbergOpening(data);
        return packWork(next.work, next.complete);
      }
      return packWork(await loadGutenbergWork(data), true);
    } catch {
      return packWork(doorWork(entry), true);
    }
  }

  return packWork(doorWork(entry), true);
}

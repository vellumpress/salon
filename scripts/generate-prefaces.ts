/**
 * Fill src/lib/catalog/prefaces-stored.ts with 2–3 sentence settle-in copy
 * for every shelf work that does not already have a usable editorial pitch,
 * ritual pitch, shelf.intro, or hand-tuned PREFACES entry.
 */
import { writeFileSync } from "node:fs";
import { pitchFor } from "../src/lib/catalog/pitches.ts";
import { PREFACES, composePreface } from "../src/lib/catalog/prefaces.ts";
import { ritualPitchFor } from "../src/lib/catalog/rituals.ts";
import { SHELF } from "../src/lib/catalog/shelf.ts";
import { splitSentences } from "../src/lib/sentences.ts";

const MIN = 24;

function usable(value: string | undefined) {
  const copy = value?.replace(/\s+/g, " ").trim() ?? "";
  if (copy.length < MIN) return "";
  if (/^Project Gutenberg\b/i.test(copy)) return "";
  if (/^(novel|stories|play|poem|other)$/i.test(copy)) return "";
  if (/public domain|copyright|gutenberg/i.test(copy)) return "";
  return copy;
}

function editorial(id: string, intro: string | undefined) {
  return (
    usable(pitchFor(id)) ||
    usable(ritualPitchFor(id)) ||
    usable(intro) ||
    usable(PREFACES[id])
  );
}

function enough(copy: string) {
  if (!copy) return false;
  return splitSentences(copy, 3).length >= 2 || copy.length >= 80;
}

const stored: Record<string, string> = {};
for (const work of SHELF) {
  if (enough(editorial(work.id, work.intro))) continue;
  const copy = usable(composePreface(work));
  if (!copy) continue;
  stored[work.id] = copy;
}

const keys = Object.keys(stored).sort();
const body = keys
  .map((id) => {
    const text = stored[id]
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    return `  ${JSON.stringify(id)}: \`${text}\`,`;
  })
  .join("\n");

const file = `/** Generated settle-in copy for shelf works that lack a 2–3 sentence editorial pitch. */
export const STORED_PREFACES: Record<string, string> = {
${body}
};
`;

writeFileSync(new URL("../src/lib/catalog/prefaces-stored.ts", import.meta.url), file);
console.log(`wrote ${keys.length} stored prefaces`);

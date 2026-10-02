import { breathsFor, type Breath, type Scene, type Work } from "../literature.ts";
import { splitSentences } from "../sentences.ts";

/** Sentences per scene when a text has no chapter headings. */
export const SCENE_FALLBACK = 40;

export type ImportBlock = {
  title: string;
  paragraphs: string[];
};

export function noteFor(source: string) {
  const src = source.replace(/\s+/g, " ").trim() || "this phone";
  return `Imported on this phone from ${src}.`;
}

export function assembleWork(input: {
  id?: string;
  title: string;
  author: string;
  source: string;
  blocks: ImportBlock[];
  hadHeading: boolean;
}): Work {
  const chunks: { title: string; lines: string[] }[] = [];
  for (const block of input.blocks) {
    const lines = block.paragraphs.flatMap((para) => splitSentences(para));
    if (!lines.length) continue;
    chunks.push({ title: block.title.trim(), lines });
  }

  let scenesSource = chunks;
  if (!input.hadHeading) {
    const all = chunks.flatMap((chunk) => chunk.lines);
    if (all.length > SCENE_FALLBACK) {
      scenesSource = [];
      for (let i = 0; i < all.length; i += SCENE_FALLBACK) {
        scenesSource.push({
          title: `Part ${scenesSource.length + 1}`,
          lines: all.slice(i, i + SCENE_FALLBACK),
        });
      }
    } else if (scenesSource.length === 1 && !scenesSource[0]?.title) {
      scenesSource[0]!.title = "Part 1";
    }
  } else {
    scenesSource = chunks.map((chunk, index) => ({
      ...chunk,
      title: chunk.title || (index === 0 ? "Opening" : `Part ${index + 1}`),
    }));
  }

  const scenes: Scene[] = [];
  const breaths: Breath[] = [];
  scenesSource.forEach((chunk, index) => {
    const title = chunk.title || `Part ${index + 1}`;
    const id = `s${index}`;
    scenes.push({
      id,
      title,
      place: title,
      reentry: chunk.lines[0] ?? "",
      prompt: "A word from this stretch.",
    });
    breaths.push(...breathsFor(id, chunk.lines));
  });

  const count = breaths.length;
  return {
    id: input.id || "import-pending",
    title: input.title.replace(/\s+/g, " ").trim() || "Imported",
    author: input.author.replace(/\s+/g, " ").trim() || "Imported",
    year: "",
    note: noteFor(input.source),
    minutes: Math.max(8, Math.round(count / 4)),
    cover: "",
    coverAlt: "",
    scenes,
    breaths,
  };
}

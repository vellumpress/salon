import { breathsFor, type Work } from "./literature";
import { splitSentences } from "./sentences";

export function splitIntoBreaths(text: string) {
  return splitSentences(text, 280);
}

export function workFromPage(opts: {
  url: string;
  title: string;
  author: string;
  breaths: string[];
}): Work {
  const lines = opts.breaths.map((line) => line.trim()).filter((line) => line.length > 0);
  const size = 20;
  const scenes = [];
  const breaths = [];
  for (let i = 0; i < lines.length; i += size) {
    const n = Math.floor(i / size);
    const id = `p${n}`;
    const slice = lines.slice(i, i + size);
    scenes.push({
      id,
      title: `Part ${n + 1}`,
      place: n === 0 ? "the page" : `the page, ${n + 1}`,
      reentry: slice[0] ?? "",
      prompt: "A word from this stretch.",
    });
    breaths.push(...breathsFor(id, slice));
  }
  let host = "";
  try {
    host = new URL(opts.url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return {
    id: "page",
    title: opts.title || host || "Untitled",
    author: opts.author || host,
    year: "",
    note: opts.url,
    minutes: Math.max(8, Math.round(lines.length / 4)),
    cover: "",
    coverAlt: "",
    scenes,
    breaths,
  };
}

export type EmphasisPart =
  | { type: "text"; value: string }
  | { type: "em"; value: string };

/** PG `_italics_`, markdown `*italics*`, or `<em>` → parts. */
const EMPHASIS_RE = /<em>([\s\S]*?)<\/em>|_([^_\n]+)_|\*([^*\n]+)\*/g;

/** Leftover emphasis marks that never found a mate (`house_.`, a lone opening `_`). */
function stripUnpairedMarks(value: string) {
  return value.replace(/[_*]/g, "");
}

export function splitEmphasis(text: string): EmphasisPart[] {
  const parts: EmphasisPart[] = [];
  let last = 0;
  for (const match of text.matchAll(EMPHASIS_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    const inner = match[1] ?? match[2] ?? match[3] ?? "";
    parts.push({ type: "em", value: inner });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  const cleaned = parts
    .map((part) =>
      part.type === "text" ? { ...part, value: stripUnpairedMarks(part.value) } : part,
    )
    .filter((part) => part.value.length > 0);
  return cleaned.length > 0 ? cleaned : [{ type: "text", value: stripUnpairedMarks(text) }];
}

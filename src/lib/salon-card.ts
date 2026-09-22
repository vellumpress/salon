import type { Fill } from "./mondrian.ts";
import { fillOf } from "./mondrian.ts";
import { clipLine } from "./share-codec.ts";
import { APP_NAME, publicUrl } from "./site.ts";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const INK = "#111111";
const PAPER = "#f3f1eb";
const RED = "#c41230";
const BLUE = "#1b4b8a";
const FOREST = "#0f5c38";

const FILL_HEX: Record<Fill, string> = {
  red: RED,
  blue: BLUE,
  yellow: "#e2c200",
  forest: FOREST,
  paper: PAPER,
  ink: INK,
};

export type SalonCardInput = {
  text: string;
  title: string;
  author: string;
  workId?: string;
  fill?: Fill;
};

export function cardFill(input: SalonCardInput): Fill {
  if (input.fill) return input.fill;
  if (input.workId) return fillOf(input.workId);
  return "red";
}

export function cardReadPath(input: { workId: string; at?: number }): string {
  const at = typeof input.at === "number" && input.at >= 0 ? Math.floor(input.at) : 0;
  return `/read/${encodeURIComponent(input.workId)}?at=${at}`;
}

export function cardReadUrl(input: { workId: string; at?: number }): string {
  return publicUrl(cardReadPath(input));
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = clipLine(text, 360).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = last.replace(/[.,;: ]*$/, "") + "…";
  }
  return lines;
}

export function paintSalonCard(
  ctx: CanvasRenderingContext2D,
  input: SalonCardInput,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
): void {
  const fill = cardFill(input);
  const accent = FILL_HEX[fill] ?? RED;
  const rule = 18;
  const inset = 54;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, width, rule);
  ctx.fillRect(0, 0, rule, height);
  ctx.fillRect(width - rule, 0, rule, height);
  ctx.fillRect(0, height - rule, width, rule);

  ctx.fillStyle = accent;
  ctx.fillRect(rule, rule, width - rule * 2, 96);
  ctx.fillStyle = fill === "yellow" || fill === "paper" ? INK : PAPER;
  ctx.font = '500 28px "Outfit", ui-sans-serif, sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText(APP_NAME.toUpperCase(), inset, rule + 48);

  ctx.fillStyle = INK;
  ctx.fillRect(rule, rule + 96, width - rule * 2, rule);

  const quoteTop = rule + 96 + rule + 80;
  const quoteWidth = width - inset * 2;
  ctx.fillStyle = INK;
  ctx.font = 'italic 64px "Cormorant Garamond", "Times New Roman", serif';
  const lines = wrapLines(ctx, input.text, quoteWidth, 8);
  let y = quoteTop;
  for (const line of lines) {
    ctx.fillText(line, inset, y);
    y += 78;
  }

  const bandTop = height - 220;
  ctx.fillStyle = INK;
  ctx.fillRect(rule, bandTop, width - rule * 2, rule);
  ctx.fillStyle = fill === "blue" ? FOREST : fill === "forest" ? BLUE : fill === "red" ? INK : RED;
  ctx.fillRect(rule, bandTop + rule, 160, height - bandTop - rule * 2);
  ctx.fillStyle = PAPER;
  ctx.fillRect(rule + 160, bandTop + rule, width - rule * 2 - 160, height - bandTop - rule * 2);

  ctx.fillStyle = INK;
  ctx.font = '500 22px "Outfit", ui-sans-serif, sans-serif';
  ctx.fillText((input.author || "Anonymous").toUpperCase(), inset + 160, bandTop + 78);
  ctx.font = '400 40px "Cormorant Garamond", "Times New Roman", serif';
  ctx.fillText(clipLine(input.title || "A sitting", 42), inset + 160, bandTop + 132);
}

export async function renderSalonCard(input: SalonCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The card would not draw.");
  try {
    await document.fonts?.ready;
  } catch {
    /* system fonts still paint */
  }
  paintSalonCard(ctx, input);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The card would not draw."));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function cardFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "vellum-card";
}

/**
 * Quote card for the share-card function. Same paper, rules, and faces as
 * paintSalonCard: Outfit for the wordmark and author, Cormorant Garamond
 * for the sentence and title. No import from the app source tree.
 */
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { cormorantItalic, cormorantRegular, outfitMedium } from "./fonts.ts";
import { resvgWasmBytes } from "./resvg-wasm.ts";

const CARD_W = 1080;
const CARD_H = 1350;
const PAPER = "#f3f1eb";
const INK = "#111111";
const RED = "#c41230";
const BLUE = "#1b4b8a";
const YELLOW = "#e2c200";
const FOREST = "#0f5c38";

const FILL_HEX = {
  red: RED,
  blue: BLUE,
  yellow: YELLOW,
  forest: FOREST,
  paper: PAPER,
  ink: INK,
} as const;

type Fill = keyof typeof FILL_HEX;

export type QuoteCard = {
  w: string;
  i: number;
  t: string;
  n: string;
  a: string;
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Outfit:wght@300;400;500&display=swap";

function hashSeed(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same special cases and hash as the app's fillOf, without importing it. */
export function cardFill(id: string): Fill {
  switch (id) {
    case "passing":
      return "red";
    case "gold":
      return "paper";
    case "manhattan":
      return "blue";
    case "berlin":
      return "ink";
    case "we":
      return "yellow";
    default: {
      const fills: Fill[] = ["red", "blue", "yellow", "paper", "forest"];
      return fills[hashSeed(id) % fills.length] ?? "paper";
    }
  }
}

/** Same tile as the header bar: the book's accent, not a swapped ink block. */
function footerFill(fill: Fill): string {
  return FILL_HEX[fill];
}

export function decodeQuoteToken(token: string): QuoteCard | null {
  try {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const bytes = new Uint8Array(json.length);
    for (let i = 0; i < json.length; i++) bytes[i] = json.charCodeAt(i);
    const card = JSON.parse(new TextDecoder().decode(bytes)) as QuoteCard & { v?: number; k?: string };
    if (card.v !== 1 || card.k !== "line" || !card.w || !card.t) return null;
    return {
      w: String(card.w).slice(0, 80),
      i: Math.max(0, Math.floor(Number(card.i) || 0)),
      t: String(card.t).replace(/\s+/g, " ").trim().slice(0, 220),
      n: String(card.n ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
      a: String(card.a ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    };
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function pagesOpenUrl(origin: string, token: string) {
  const card = decodeQuoteToken(token);
  const base = origin.replace(/\/$/, "");
  if (!card) return `${base}/salon/`;
  return `${base}/salon/read/${encodeURIComponent(card.w)}?at=${card.i}`;
}

const SHARE_CARD_ORIGIN = "https://thuxsshowkxacbfjdaks.supabase.co";

/** Public image/page URL. Edge req.url is http and drops /functions/v1. */
export function shareCardFunctionUrl(base: string, token: string, image = false): string {
  let parsed: URL;
  try {
    parsed = new URL(base.trim() || SHARE_CARD_ORIGIN);
  } catch {
    parsed = new URL(SHARE_CARD_ORIGIN);
  }
  if (parsed.protocol !== "https:") parsed.protocol = "https:";
  parsed.username = "";
  parsed.password = "";
  parsed.pathname = "/functions/v1/share-card";
  parsed.search = "";
  parsed.hash = "";
  parsed.searchParams.set("t", token);
  if (image) parsed.searchParams.set("img", "1");
  return parsed.toString();
}

export function renderQuoteHtml(
  token: string,
  urls: { imageUrl: string; openUrl: string },
): string | null {
  const card = decodeQuoteToken(token);
  if (!card) return null;
  const title = escapeHtml([card.n || "A sitting", card.a].filter(Boolean).join(" · "));
  const description = escapeHtml(card.t);
  const image = escapeHtml(urls.imageUrl);
  const open = escapeHtml(urls.openUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="${FONT_HREF}">
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body style="margin:0;background:${PAPER};color:${INK};font-family:'Cormorant Garamond',serif">
<main style="max-width:36rem;margin:0 auto;padding:2.5rem 1.25rem">
<p style="letter-spacing:.14em;text-transform:uppercase;font-family:Outfit,sans-serif;font-weight:500;font-size:.75rem">tbr</p>
<h1 style="font-weight:400;font-size:2rem;margin:.5rem 0">${title}</h1>
<blockquote style="font-size:1.35rem;font-style:italic;line-height:1.45;margin:1.5rem 0">${description}</blockquote>
<p><a href="${open}" style="color:${INK};font-family:Outfit,sans-serif;font-size:.875rem;letter-spacing:.02em;text-decoration:none">Open the sitting</a></p>
</main>
</body>
</html>`;
}

type Box = {
  type: "div";
  props: {
    style: Record<string, string | number>;
    children?: string | Box | Box[];
  };
};

function rect(x: number, y: number, w: number, h: number, background: string): Box {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background,
        display: "flex",
      },
    },
  };
}

function label(
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  extra: Record<string, string | number>,
): Box {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        left: x,
        top: y,
        width,
        height: fontSize,
        display: "flex",
        alignItems: "center",
        color: INK,
        fontSize,
        ...extra,
      },
      children: text,
    },
  };
}

function cardTree(card: QuoteCard): Box {
  const fill = cardFill(card.w);
  const accent = FILL_HEX[fill];
  const onAccent = fill === "yellow" || fill === "paper" ? INK : PAPER;
  const quoteWidth = CARD_W - 54 * 2;
  return {
    type: "div",
    props: {
      style: {
        width: CARD_W,
        height: CARD_H,
        background: PAPER,
        display: "flex",
        position: "relative",
      },
      children: [
        rect(0, 0, CARD_W, 18, INK),
        rect(0, 0, 18, CARD_H, INK),
        rect(CARD_W - 18, 0, 18, CARD_H, INK),
        rect(0, CARD_H - 18, CARD_W, 18, INK),
        rect(18, 18, CARD_W - 36, 96, accent),
        label("tbr", 54, 52, quoteWidth, 28, {
          fontFamily: "Outfit",
          fontWeight: 500,
          color: onAccent,
        }),
        rect(18, 114, CARD_W - 36, 18, INK),
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              left: 54,
              top: 173,
              width: quoteWidth,
              height: 900,
              display: "flex",
              color: INK,
              fontFamily: "Cormorant Garamond",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 64,
              lineHeight: "78px",
            },
            children: card.t,
          },
        },
        rect(18, 1130, CARD_W - 36, 18, INK),
        rect(18, 1148, 160, 184, footerFill(fill)),
        rect(178, 1148, CARD_W - 36 - 160, 184, PAPER),
        label((card.a || "Anonymous").toUpperCase(), 214, 1197, CARD_W - 214 - 54, 22, {
          fontFamily: "Outfit",
          fontWeight: 500,
        }),
        label(card.n || "A sitting", 214, 1242, CARD_W - 214 - 54, 40, {
          fontFamily: "Cormorant Garamond",
          fontWeight: 400,
        }),
      ],
    },
  };
}

let wasmReady: Promise<void> | null = null;

async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const bytes = resvgWasmBytes();
      if (bytes[0] !== 0 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) {
        throw new Error("embedded resvg wasm is not a wasm module");
      }
      await initWasm(bytes);
    })().catch((err) => {
      wasmReady = null;
      throw err;
    });
  }
  return wasmReady;
}

function fontBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function renderQuotePng(token: string): Promise<Uint8Array | null> {
  const card = decodeQuoteToken(token);
  if (!card) return null;
  await ensureWasm();
  const svg = await satori(cardTree(card) as never, {
    width: CARD_W,
    height: CARD_H,
    fonts: [
      { name: "Outfit", data: fontBuffer(outfitMedium), weight: 500, style: "normal" },
      { name: "Cormorant Garamond", data: fontBuffer(cormorantRegular), weight: 400, style: "normal" },
      { name: "Cormorant Garamond", data: fontBuffer(cormorantItalic), weight: 400, style: "italic" },
    ],
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_W },
    font: {
      loadSystemFonts: false,
      fontBuffers: [outfitMedium, cormorantRegular, cormorantItalic],
    },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  rendered.free();
  resvg.free();
  return png;
}

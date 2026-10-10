// Per-share Open Graph for a kept sentence.
// GitHub Pages is one static HTML file, so iMessage and Slack never see the
// sentence unless this function answers the link.
//
// Crawlers do not send a user JWT. Deploy with verify_jwt off:
//   supabase functions deploy share-card --no-verify-jwt --use-api
//
// Files this function deploys with (this directory only — do not import src):
//   index.ts
//   card.ts
//   fonts.ts
//   html-fonts.ts
//   resvg-wasm.ts
//   deno.json
//   fonts/CormorantGaramond-Regular.ttf
//   fonts/CormorantGaramond-Italic.ttf
//   fonts/Outfit-Medium.ttf
//   fonts/OFL-cormorant.txt
//   fonts/OFL-outfit.txt
//
// fonts.ts and resvg-wasm.ts are the bytes the renderer uses. The edge
// compiler cannot import a .wasm module, so resvg is initialized from those
// embedded bytes. The function does not read the filesystem.

import { pagesOpenUrl, renderQuoteHtml, renderQuotePng, shareCardFunctionUrl } from "./card.ts";

const PAGES_ORIGIN = "https://vellumpress.github.io";

/** Project origin, or a full function URL. Edge req.url is not this address. */
function publicBase() {
  const configured = Deno.env.get("SHARE_CARD_PUBLIC_URL")?.trim();
  if (configured) return configured;
  const hosted = Deno.env.get("SUPABASE_URL")?.trim();
  if (hosted) return hosted;
  return "https://thuxsshowkxacbfjdaks.supabase.co";
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      },
    });
  }
  const token = url.searchParams.get("t") ?? "";
  const openUrl = pagesOpenUrl(PAGES_ORIGIN, token);
  const imageUrl = shareCardFunctionUrl(publicBase(), token, true);
  if (url.searchParams.get("img") === "1") {
    const png = await renderQuotePng(token);
    if (!png) return new Response("This share would not come", { status: 404 });
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const html = renderQuoteHtml(token, { imageUrl, openUrl });
  if (!html) {
    return new Response("<!doctype html><title>tbr</title><p>This share would not come</p>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

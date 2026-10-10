/**
 * Local unfurl for quote cards. GitHub Pages cannot do this; dev and the
 * share-card function can. Crawlers need the sentence in the first HTML byte.
 */
export function quoteOgPlugin() {
  return {
    name: "tbr-quote-og",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const raw = req.url ?? "";
          const pathOnly = raw.split("?", 1)[0] ?? "";
          const match = pathOnly.match(/^\/(?:salon\/)?og\/(.+)$/);
          if (!match) {
            next();
            return;
          }
          let token = match[1] ?? "";
          const wantsPng = token.endsWith(".png");
          if (wantsPng) token = token.slice(0, -".png".length);
          token = decodeURIComponent(token);
          const mod = await server.ssrLoadModule("/src/lib/quote-unfurl-server.ts");
          const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "127.0.0.1:8080");
          const proto = String(req.headers["x-forwarded-proto"] ?? "http");
          const origin = `${proto}://${host}`;
          const imageUrl = `${origin}/salon/og/${encodeURIComponent(token)}.png`;
          const openUrl = mod.pagesOpenUrl(origin, token);
          if (wantsPng) {
            const png = await mod.renderQuotePng(token);
            if (!png) {
              res.statusCode = 404;
              res.end("This share would not come");
              return;
            }
            res.statusCode = 200;
            res.setHeader("content-type", "image/png");
            res.setHeader("cache-control", "public, max-age=86400");
            res.end(png);
            return;
          }
          const html = mod.renderQuoteHtml(token, { imageUrl, openUrl });
          if (!html) {
            res.statusCode = 404;
            res.setHeader("content-type", "text/html; charset=utf-8");
            res.end("<!doctype html><title>tbr</title><p>This share would not come</p>");
            return;
          }
          res.statusCode = 200;
          res.setHeader("content-type", "text/html; charset=utf-8");
          res.setHeader("cache-control", "public, max-age=300");
          res.end(html);
        } catch (err) {
          console.error("[tbr] quote og failed", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end("The card would not draw.");
          }
        }
      });
    },
  };
}

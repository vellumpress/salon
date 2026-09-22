import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import {
  SHELL_CACHE_ATTR,
  applyPagesHtmlSafety,
  injectShellNetworkHints,
  renderShellServiceWorker,
  rewriteDehydrateSsrMatchId,
  stripHtmlNulBytes,
} from "./ssr-nul.mjs";

/** Published router-core 1.171 ESM codec, slash step still U+0000. */
function publishedCodec() {
  return [
    "function dehydrateSsrMatchId(id) {",
    '\treturn id.replaceAll("~", "~~").replaceAll("\\0", "~0").replaceAll("\uFFFD", "~r").replaceAll("/", "\\0");',
    "}",
    "function hydrateSsrMatchId(id) {",
    '\treturn id.replaceAll("\\0", "/").replaceAll("\uFFFD", "/").replace(/~([~0r])/g, (_, code) => code === "0" ? "\\0" : code === "r" ? "\uFFFD" : code);',
    "}",
    "export { dehydrateSsrMatchId, hydrateSsrMatchId };",
    "",
  ].join("\n");
}

test("rewrites only the slash delimiter, not the ~0 escape", () => {
  const source = publishedCodec();
  const { code, hits } = rewriteDehydrateSsrMatchId(source);
  assert.equal(hits, 1);
  assert.match(code, /replaceAll\("\/", "\\uFFFD"\)/);
  assert.match(code, /replaceAll\("\\0", "~0"\)/);
  assert.match(code, /replaceAll\("\\0", "\/"\)/);
  assert.equal(rewriteDehydrateSsrMatchId(code).hits, 0);
});

test("rewrites the TypeScript single-quoted slash step", () => {
  const source = ".replaceAll('\\0', '~0').replaceAll('/', '\\0')";
  const { code, hits } = rewriteDehydrateSsrMatchId(source);
  assert.equal(hits, 1);
  assert.equal(code, ".replaceAll('\\0', '~0').replaceAll('/', '\\uFFFD')");
});

test("dehydrated root match id round-trips without a NUL", async () => {
  const { code } = rewriteDehydrateSsrMatchId(publishedCodec());
  const file = join(mkdtempSync(join(tmpdir(), "ssr-nul-")), "codec.mjs");
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href);
  const rootId = "__root__/";
  const dehydrated = mod.dehydrateSsrMatchId(rootId);
  assert.equal(dehydrated.includes("\0"), false);
  assert.equal(dehydrated, "__root__\uFFFD");
  assert.equal(mod.hydrateSsrMatchId(dehydrated), rootId);
  assert.equal(mod.hydrateSsrMatchId("__root__\0"), rootId);

  const shaped = "/$orgId/projects/$projectId//acme/projects/dashboard/{}";
  const hidden = mod.dehydrateSsrMatchId(shaped);
  assert.equal(hidden.includes("/"), false);
  assert.equal(hidden.includes("\0"), false);
  assert.equal(mod.hydrateSsrMatchId(hidden), shaped);

  const mixed = "a/\0b/\uFFFDc/~d";
  assert.equal(mod.hydrateSsrMatchId(mod.dehydrateSsrMatchId(mixed)), mixed);
});

test("strip removes NUL bytes and keeps the slash delimiter decodable", () => {
  const raw = Buffer.from('matches:{i:"__root__\0",s:"success"}', "utf8");
  assert.ok(raw.includes(0));
  const { buf, removed } = stripHtmlNulBytes(raw);
  assert.equal(removed, 1);
  assert.equal(buf.includes(0), false);
  assert.equal(buf.toString("utf8"), 'matches:{i:"__root__\uFFFD",s:"success"}');
  const again = stripHtmlNulBytes(buf);
  assert.equal(again.removed, 0);
  assert.equal(again.buf.equals(buf), true);
});

test("pages safety strips index and 404 without touching hashed assets", () => {
  const dest = mkdtempSync(join(tmpdir(), "salon-html-"));
  const asset = "/salon/assets/index-19cvAC2M.js";
  writeFileSync(
    join(dest, "index.html"),
    `<!DOCTYPE html><html><head><script data-spa-pages-restore type="text/javascript">/*restore*/</script></head><body><script>i:"__root__\0"</script><script type="module" src="${asset}"></script></body></html>`,
  );
  writeFileSync(join(dest, "404.html"), `<html><body>Opening\0</body></html>`);
  writeFileSync(join(dest, "assets-note.js"), `keep\0this`);
  const { files, removed } = applyPagesHtmlSafety(dest);
  assert.equal(files, 2);
  assert.equal(removed, 2);
  const index = readFileSync(join(dest, "index.html"));
  const fallback = readFileSync(join(dest, "404.html"));
  const js = readFileSync(join(dest, "assets-note.js"));
  assert.equal(index.includes(0), false);
  assert.equal(fallback.includes(0), false);
  assert.ok(js.includes(0));
  const html = index.toString("utf8");
  assert.match(html, new RegExp(SHELL_CACHE_ATTR));
  assert.match(html, /\/salon\/sw\.js/);
  assert.match(html, /updateViaCache:"none"/);
  assert.ok(html.includes(asset));
  assert.ok(html.includes("__root__\uFFFD"));
  assert.match(html, /data-spa-pages-restore[\s\S]*data-shell-network/);
  const twice = injectShellNetworkHints(html);
  assert.equal(twice, html);
  const sw = readFileSync(join(dest, "sw.js"), "utf8");
  assert.equal(sw, renderShellServiceWorker());
  assert.match(sw, /req\.mode !== "navigate"/);
  assert.match(sw, /cache:\s*"no-store"/);
  assert.match(sw, /cache\.put\(req\.url/);
  assert.match(sw, /cache\.match\(req\.url\)/);
  assert.match(sw, /Hashed assets are not intercepted/);
});

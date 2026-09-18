import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const helper = `var __defProp = Object.defineProperty;
var __exportAll$1 = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
`;

function patch(path, transform) {
  let source;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    console.log(`[fix-ssr] missing ${path}`);
    return;
  }
  const next = transform(source);
  if (next === source) {
    console.log(`[fix-ssr] ${path} already valid`);
    return;
  }
  writeFileSync(path, next);
  console.log(`[fix-ssr] patched ${path}`);
}

function exportBlock(source) {
  const start = source.lastIndexOf("export {");
  if (start < 0) return { start: -1, inner: "", full: "" };
  const end = source.indexOf("};", start);
  if (end < 0) return { start: -1, inner: "", full: "" };
  return {
    start,
    inner: source.slice(start + "export {".length, end),
    full: source.slice(start, end + 2),
  };
}

function ensureServerEntryExport(source) {
  let next = source.replace("ssr_exports as s", "server_default as s");
  const block = exportBlock(next);
  if (block.start < 0) return next;
  if (/(^|,)\s*server_default as s\s*(,|$)/.test(block.inner)) return next;
  if (/(^|,)\s*\w+ as s\s*(,|$)/.test(block.inner)) {
    return next.replace(block.full, `export {${block.inner.replace(/\w+ as s/, "server_default as s")}};`);
  }
  const inner = block.inner.replace(/\s*$/, "") + ", server_default as s";
  return next.replace(block.full, `export {${inner}};`);
}

patch(
  resolve(".vercel/output/functions/__server.func/_ssr/ssr.mjs"),
  ensureServerEntryExport,
);

patch(resolve(".vercel/output/functions/__server.func/_ssr/ssr2.mjs"), (source) => {
  if (!source.includes('from "./ssr.mjs"')) return source;
  return source.replace(
    /import \{ c as __exportAll\$1 \} from "\.\/ssr\.mjs";\n/,
    helper,
  );
});

const libs = resolve(".vercel/output/functions/__server.func/_libs");
const dist = resolve("node_modules/@electric-sql/pglite/dist");
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  const from = resolve(dist, name);
  const to = resolve(libs, name);
  if (!existsSync(from) || !existsSync(libs)) continue;
  if (existsSync(to)) {
    console.log(`[fix-ssr] ${name} already in output`);
    continue;
  }
  copyFileSync(from, to);
  console.log(`[fix-ssr] copied ${name}`);
}

// @ts-check
/**
 * Staff bind notes stay in source JSON for the pipeline. Production builds
 * drop the top-level `note` before a texts/openings file becomes a client
 * chunk, so DevTools cannot read Host / Inventory / reading-ease remarks.
 *
 * Book breaths, scene titles, and Gutenberg lines are left as printed.
 *
 * @typedef {{ name: string, pattern: RegExp }} StaffPattern
 * @typedef {{ name: string, includes: string, reason: string }} ProseAllow
 * @typedef {{ where: string, name: string, snippet: string }} StaffHit
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BOOK_JSON = /\/catalog\/(?:texts|openings)\/[^/]+\.json$/;

/**
 * Vite module id for a catalog book chunk (query string ignored).
 * @param {string} id
 */
export function isCatalogBookModule(id) {
  const path = String(id).split("?")[0].replaceAll("\\", "/");
  return BOOK_JSON.test(path);
}

/**
 * Drop staff-only bind metadata. `note` is the only such field on book JSON.
 * Returns the same object when there is nothing to drop.
 * @param {Record<string, unknown> | null | undefined} data
 * @returns {Record<string, unknown> | null | undefined}
 */
export function stripBindStaff(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  if (!Object.prototype.hasOwnProperty.call(data, "note")) return data;
  const rest = { ...data };
  delete rest.note;
  return rest;
}

/**
 * Rewrite raw catalog JSON for the production bundle.
 * Null when the source is not a book object with a `note`.
 * @param {string} code
 * @returns {string | null}
 */
export function stripCatalogBookSource(code) {
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(code);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!Object.prototype.hasOwnProperty.call(data, "note")) return null;
  return JSON.stringify(stripBindStaff(/** @type {Record<string, unknown>} */ (data)));
}

/**
 * Phrases that are staff metadata, not the book.
 * Capital `Inventory` is the bind label ("Inventory 81"); lowercase
 * "inventory" inside a story is left alone. `Host:` is the scope label;
 * Chaucer's "our Host:" and Milton's "Heav’ns Host:" are allowlisted.
 */
/** @type {StaffPattern[]} */
export const SHIPPED_STAFF_PATTERNS = [
  { name: "Host OK", pattern: /\bHost OK\b/i },
  { name: "Host:", pattern: /\bHost:/ },
  { name: "Inventory", pattern: /\bInventory\b/ },
  { name: "PG reading-ease", pattern: /PG reading-ease/i },
  { name: "reading-ease", pattern: /reading-ease/i },
  { name: "Launch shelf", pattern: /Launch shelf/i },
  { name: "soft-inflate", pattern: /soft-inflate/i },
  { name: "weighted lead", pattern: /weighted lead/i },
  { name: "SHIP BLOCKER", pattern: /SHIP BLOCKER/ },
];

/**
 * Printed book phrases that share a staff token. A hit is kept only when
 * this exact window is present. Do not widen the patterns to skip a hit.
 */
/** @type {ProseAllow[]} */
export const SHIPPED_PROSE_ALLOWLIST = [
  {
    name: "Host:",
    includes: "our Host:",
    reason: "Chaucer, the Host of the pilgrimage (The Canterbury Tales)",
  },
  {
    name: "Host:",
    includes: "Heav\u2019ns Host:",
    reason: "Milton, Heaven’s host (Paradise Lost), curly apostrophe as printed",
  },
  {
    name: "Inventory",
    includes: "Inventory of Sunday school prize stock",
    reason: "Bennett, Clayhanger, a document title in the chapter",
  },
  {
    name: "Inventory",
    includes: "Inventory of Furniture at No. 59",
    reason: "Bennett, Hilda Lessways, a printed heading",
  },
  {
    name: "Inventory",
    includes: "Inventory OF Articles",
    reason: "Melville, Typee, a chapter title",
  },
];

/**
 * @param {string} text
 * @param {string} where
 * @returns {StaffHit[]}
 */
export function scanStaffText(text, where) {
  /** @type {StaffHit[]} */
  const hits = [];
  for (const { name, pattern } of SHIPPED_STAFF_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    for (const match of text.matchAll(re)) {
      const at = match.index ?? 0;
      const window = text.slice(Math.max(0, at - 90), at + match[0].length + 90);
      const allowed = SHIPPED_PROSE_ALLOWLIST.some(
        (item) => item.name === name && window.includes(item.includes),
      );
      if (allowed) continue;
      hits.push({
        where,
        name,
        snippet: window.replace(/\s+/g, " ").trim(),
      });
    }
  }
  return hits;
}

const DIST_EXT = new Set([".js", ".mjs", ".cjs", ".css", ".json", ".txt", ".webmanifest"]);

/**
 * @param {string} dir
 * @param {string[]} out
 */
function walkDistFiles(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Static route shells are copies of index.html, not book chunks.
      if (entry.name === "read") continue;
      walkDistFiles(path, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name);
    if (DIST_EXT.has(ext) || entry.name === "index.html" || entry.name === "404.html") {
      out.push(path);
    }
  }
}

/**
 * Scan Pages output for staff bind metadata.
 * @param {string} distDir
 * @returns {StaffHit[]}
 */
export function scanDist(distDir) {
  const root = resolve(distDir);
  let info;
  try {
    info = statSync(root);
  } catch {
    throw new Error(`dist not found at ${root}`);
  }
  if (!info.isDirectory()) throw new Error(`dist is not a directory: ${root}`);
  /** @type {string[]} */
  const files = [];
  walkDistFiles(root, files);
  /** @type {StaffHit[]} */
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const where = file.slice(root.length + 1);
    hits.push(...scanStaffText(text, where));
  }
  return hits;
}

/** Drop `note` on catalog book JSON during `vite build` only. Dev keeps the source note. */
export function stripBindNotesPlugin() {
  return {
    name: "strip-bind-notes",
    apply: /** @type {"build"} */ ("build"),
    enforce: /** @type {"pre"} */ ("pre"),
    /**
     * @param {string} code
     * @param {string} id
     */
    transform(code, id) {
      if (!isCatalogBookModule(id)) return null;
      const next = stripCatalogBookSource(code);
      if (next == null) return null;
      return { code: next, map: null };
    },
  };
}

function isCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isCli()) {
  const dist = resolve(process.argv[2] ?? "dist");
  const hits = scanDist(dist);
  if (hits.length) {
    console.error(`[assert-shipped-staff] ${hits.length} staff hit(s) in ${dist}`);
    for (const hit of hits.slice(0, 40)) {
      console.error(`${hit.where} [${hit.name}] ${hit.snippet}`);
    }
    process.exit(1);
  }
  console.log("[assert-shipped-staff] dist has no bind-note staff metadata");
}

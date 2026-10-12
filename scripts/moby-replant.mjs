/**
 * Content stamp so the Moby-Dick book chunks and the reader chunk get new
 * hashed filenames. The book text stays the default export; the stamp is
 * appended after the module so a phone cannot reuse the previous file.
 */

export const MOBY_REPLANT_MARK = "replant-1";

export function replantStamp() {
  return `\nglobalThis.__mobyReplant=${JSON.stringify(MOBY_REPLANT_MARK)};\n`;
}

/**
 * @param {{ name?: string, fileName?: string, moduleIds?: string[], modules?: object }} chunk
 */
export function chunkNeedsReplant(chunk) {
  const ids = [];
  if (Array.isArray(chunk?.moduleIds)) ids.push(...chunk.moduleIds);
  if (chunk?.modules && typeof chunk.modules === "object") ids.push(...Object.keys(chunk.modules));
  for (const id of ids) {
    const norm = String(id).replaceAll("\\", "/");
    if (norm.includes("/catalog/texts/moby-dick.json")) return true;
    if (norm.includes("/catalog/openings/moby-dick.json")) return true;
    if (norm.includes("/routes/read.$workId")) return true;
  }
  const name = String(chunk?.name || "");
  const fileName = String(chunk?.fileName || "");
  if (name === "moby-dick" || fileName.startsWith("moby-dick-") || fileName.includes("/moby-dick-")) {
    return true;
  }
  if (name === "read._workId" || fileName.includes("read._workId")) return true;
  return false;
}

export function mobyReplantPlugin() {
  const stamp = replantStamp();
  return {
    name: "moby-replant",
    apply: "build",
    enforce: "post",
    renderChunk(code, chunk) {
      if (!chunkNeedsReplant(chunk)) return null;
      if (code.includes(`__mobyReplant=${JSON.stringify(MOBY_REPLANT_MARK)}`)) return null;
      return { code: `${code}${stamp}`, map: null };
    },
  };
}

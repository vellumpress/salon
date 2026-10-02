/**
 * A sitting that lives only on this phone.
 * `page` is the older single import. `import-` is the homepage list.
 * Neither is a catalog work.
 */
export function isDeviceImport(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === "page" || id.startsWith("import-");
}

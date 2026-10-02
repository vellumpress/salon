import type { Work } from "../literature.ts";

const DB_NAME = "tbr-imports";
const STORE = "imports";

export type SavedImport = {
  id: string;
  title: string;
  author: string;
  source: string;
  kind: "pdf" | "link";
  createdAt: number;
  breathCount: number;
  work: Work;
};

const listeners = new Set<() => void>();

export function subscribeImports(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

export function newImportId() {
  const raw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `import-${raw.replace(/[^a-z0-9-]/gi, "")}`;
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("no indexedDB"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB"));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB"));
  });
}

export async function listImports(): Promise<SavedImport[]> {
  try {
    const db = await openDb();
    const rows = await request(db.transaction(STORE, "readonly").objectStore(STORE).getAll());
    db.close();
    return (rows as SavedImport[])
      .filter((row) => row && typeof row.id === "string" && row.work)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getImport(id: string): Promise<SavedImport | null> {
  if (!id) return null;
  try {
    const db = await openDb();
    const row = await request(db.transaction(STORE, "readonly").objectStore(STORE).get(id));
    db.close();
    return (row as SavedImport | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveImport(row: SavedImport): Promise<void> {
  const db = await openDb();
  await request(db.transaction(STORE, "readwrite").objectStore(STORE).put(row));
  db.close();
  emit();
}

export async function deleteImport(id: string): Promise<void> {
  const db = await openDb();
  await request(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
  db.close();
  emit();
}

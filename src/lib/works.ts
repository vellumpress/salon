import { isLocalBound } from "./catalog/full-pdf";
import { readableIds } from "./catalog/shelf";
import { fetchShelfWork } from "./fetch-work";
import type { Work } from "./literature";
import { preferLoadedWork } from "./spine-nav";
import { inflateWork } from "./work-shape";

export type { Scene, Breath, Work } from "./literature";
export { breathsFor } from "./literature";
export {
  chapterStartIndex,
  doorWork,
  isLastBreathOfScene,
  lookbackBreaths,
  progressInScene,
  sceneOf,
  sceneStartIndex,
} from "./work-shape";

const files = import.meta.glob("./catalog/texts/*.json", { import: "default" });
const openings = import.meta.glob("./catalog/openings/*.json", { import: "default" });
const cache = new Map<string, Work>();
const complete = new Map<string, boolean>();
const openingWait = new Map<string, Promise<Work | undefined>>();
const fullWait = new Map<string, Promise<Work | undefined>>();
const localWait = new Map<string, Promise<Work | undefined>>();

export function peekWork(id: string) {
  return cache.get(id);
}

export function workIsComplete(id: string) {
  return complete.get(id) === true;
}

export function catalogIds() {
  return readableIds();
}

async function pullRemote(id: string, opening: boolean) {
  let packed;
  try {
    packed = await fetchShelfWork({ data: { id, opening } });
  } catch {
    return undefined;
  }
  if (!packed) return undefined;
  const work = inflateWork(packed);
  const prior = cache.get(id);
  if (prior && !packed.complete && prior.breaths.length > work.breaths.length) {
    return prior;
  }
  cache.set(id, work);
  if (packed.complete) complete.set(id, true);
  else if (!complete.get(id)) complete.set(id, false);
  return work;
}

function hydrateLocal(id: string) {
  if (!isLocalBound(id)) return Promise.resolve(undefined);
  const loader = files[`./catalog/texts/${id}.json`];
  if (typeof loader !== "function") return Promise.resolve(undefined);
  if (complete.get(id)) return Promise.resolve(cache.get(id));
  const waiting = localWait.get(id);
  if (waiting) return waiting;
  const pending = loader()
    .then((raw) => {
      const work = raw as Work;
      cache.set(id, work);
      complete.set(id, true);
      return work;
    })
    .finally(() => localWait.delete(id));
  localWait.set(id, pending);
  return pending;
}

function loadLocalOpening(id: string) {
  if (!isLocalBound(id)) return Promise.resolve(undefined);
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const loader = openings[`./catalog/openings/${id}.json`];
  if (typeof loader !== "function") return hydrateLocal(id);
  const waiting = openingWait.get(id);
  if (waiting) return waiting;
  const pending = loader()
    .then((raw) => {
      if (complete.get(id)) return cache.get(id);
      const chosen = preferLoadedWork(cache.get(id), raw as Work);
      if (chosen && cache.get(id) !== chosen) cache.set(id, chosen);
      if (!complete.has(id)) complete.set(id, false);
      return cache.get(id) ?? chosen;
    })
    .finally(() => openingWait.delete(id));
  openingWait.set(id, pending);
  return pending;
}

function loadOpening(id: string) {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const waiting = openingWait.get(id);
  if (waiting) return waiting;
  const pending = pullRemote(id, true).finally(() => openingWait.delete(id));
  openingWait.set(id, pending);
  return pending;
}

function loadFull(id: string) {
  if (complete.get(id)) return Promise.resolve(cache.get(id));
  const waiting = fullWait.get(id);
  if (waiting) return waiting;
  const pending = pullRemote(id, false)
    .then((work) => {
      if (!work && cache.has(id)) complete.set(id, true);
      return work;
    })
    .finally(() => fullWait.delete(id));
  fullWait.set(id, pending);
  return pending;
}

export async function loadWork(
  id: string,
  onUpdate?: (work: Work) => void,
): Promise<Work | undefined> {
  if (!id || id === "page") return undefined;
  const cached = cache.get(id);
  if (cached) onUpdate?.(cached);
  if (cached && complete.get(id)) return cached;

  const localLoader = isLocalBound(id) ? files[`./catalog/texts/${id}.json`] : undefined;
  if (typeof localLoader === "function") {
    void hydrateLocal(id);
    const opened = cached ?? (await loadLocalOpening(id));
    // The full bind can land while the opening is parsing. Publish that,
    // not the sit, or the reader stays on the first pages.
    if (complete.get(id)) {
      const ready = preferLoadedWork(opened, cache.get(id));
      if (ready) onUpdate?.(ready);
      return ready;
    }
    if (opened) onUpdate?.(opened);
    if (typeof requestAnimationFrame === "function") {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    let full: Work | undefined;
    try {
      full = await hydrateLocal(id);
    } catch {
      try {
        full = await hydrateLocal(id);
      } catch {
        full = undefined;
      }
    }
    const next = preferLoadedWork(opened, full ?? cache.get(id));
    if (next && next !== opened) onUpdate?.(next);
    return next;
  }

  const opened = cached ?? (await loadOpening(id));
  if (!opened) return undefined;
  onUpdate?.(opened);
  if (complete.get(id)) return opened;

  if (typeof requestAnimationFrame === "function") {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  const full = await loadFull(id);
  if (full) onUpdate?.(full);
  return full ?? opened;
}

export function prefetchWork(id: string) {
  if (!id || id === "page") return;
  void loadWork(id);
}

/** Opening only — enough for the first page, without parsing a full novel. */
export function prefetchOpening(id: string) {
  if (!id || id === "page") return;
  if (cache.get(id)) return;
  if (isLocalBound(id)) {
    const loader = openings[`./catalog/openings/${id}.json`];
    if (typeof loader !== "function") return;
    void loadLocalOpening(id);
    return;
  }
  void loadOpening(id);
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const hit = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!hit) return;
      const href = hit.getAttribute("href") ?? "";
      const match = href.match(/\/read\/([a-z0-9-]+)/i);
      const next = match?.[1];
      if (next) prefetchWork(next);
    },
    { capture: true, passive: true },
  );
}

import { hashSeed } from "../mondrian.ts";
import { canonicalWorkId } from "../work-id-alias.ts";
import { shuffleWithSeed } from "../recommend.ts";
import { blurbFor } from "./blurbs.ts";
import { isAdaptedBySalon } from "./curatorial.ts";
import { isBoundLocal, isEnReadableOff } from "./en-rights.ts";
import { CLASSIC_LOCAL_WORKS } from "./full-pdf.ts";
import { chipOnlyLabel, placeFor } from "./places.ts";
import type { PlaceRegion } from "./region-shapes.ts";
import { SHELF, type ShelfForm, type ShelfWork } from "./shelf.ts";

/** Home stays a short shelf: personal rows first, then a few daily shelves. */
export const HOME_MIX_MAX_ROWS = 8;
export const HOME_MIX_CARD_CAP = 12;
const MIN_PERSONAL = 4;
const MIN_GENRE = 5;
/** A place row needs a real shelf, not a handful of titles. */
const MIN_PLACE = 6;
const MIN_BLURB = 24;
const BECAUSE_CAP = 2;

/**
 * Soft hold, and the Japanese catalog alias of the same book.
 * Unhuman Tour (Kusamakura) stays off every row: its generated line still
 * repeats Botchan's plot. The book text is left as stored.
 */
const MIX_UNRELEASED_IDS = new Set<string>([
  "unhuman-tour-kusamakura",
  "kusamakura-unhuman-tour",
]);

/** Broad place rows a new reader can start from. Niche countries come later. */
const LEAD_PLACES = ["place:fr", "place:jp"] as const;

export type MixHistory = {
  opened: string[];
  finished: string[];
  kept: string[];
  favorites: string[];
  /** Minutes actually sat with, per work. */
  minutesByWork: Record<string, number>;
};

export type MixCard = {
  work: ShelfWork;
  blurb: string;
  time: string;
};

export type MixRow = {
  id: string;
  title: string;
  cards: MixCard[];
};

type MixState = {
  progress?: Record<
    string,
    {
      lastOpenedAt?: number;
      entered?: boolean;
      completedAt?: number | null;
      kept?: unknown[] | null;
      activeMs?: number;
    } | null
  > | null;
  favorites?: string[] | null;
  sitHistory?: { workId?: string; minutes?: number }[] | null;
};

type Profile = {
  work: ShelfWork;
  author: string;
  region: string | null;
  place: string | null;
  form: ShelfForm;
  ghost: boolean;
  sea: boolean;
  era: number | null;
  length: string;
  readability: string | null;
};

const REGION_LABEL: Record<PlaceRegion, string> = {
  us: "The United States",
  "us-south": "The American South",
  gb: "Britain",
  ie: "Ireland",
  fr: "France",
  it: "Italy",
  jp: "Stories from Japan",
  in: "India",
  de: "Germany",
  ru: "Russia",
  cn: "China",
  es: "Spain",
  pt: "Portugal",
  ua: "Ukraine",
  hu: "Hungary",
  hr: "Croatia",
  im: "The Isle of Man",
  ng: "Nigeria",
  cz: "Czechia",
  pl: "Poland",
  se: "Sweden",
  no: "Norway",
  dk: "Denmark",
  fi: "Finland",
  nl: "The Netherlands",
  be: "Belgium",
  at: "Austria",
  gr: "Greece",
  tr: "Turkey",
  eg: "Egypt",
  ir: "Persia",
  kr: "Korea",
  jm: "Jamaica",
  bb: "Barbados",
  lb: "Lebanon",
  br: "Brazil",
  mx: "Mexico",
  ar: "Argentina",
  za: "South Africa",
  au: "Australia",
  nz: "New Zealand",
  ca: "Canada",
  pe: "Peru",
  ro: "Romania",
  ph: "The Philippines",
  co: "Colombia",
  cu: "Cuba",
  is: "Iceland",
  uy: "Uruguay",
  ve: "Venezuela",
  gy: "Guyana",
  gt: "Guatemala",
  ni: "Nicaragua",
  my: "Malaysia",
  vn: "Vietnam",
  la: "Laos",
  th: "Thailand",
  id: "Indonesia",
  iq: "Iraq",
  by: "Belarus",
  ps: "Palestine",
  il: "Israel",
  gh: "Ghana",
  ws: "Samoa",
  sg: "Singapore",
  hk: "Hong Kong",
  ge: "Georgia",
  cl: "Chile",
  ch: "Switzerland",
  cd: "Congo",
  dz: "Algeria",
  lk: "Ceylon",
};

const FORM_TITLE: Record<ShelfForm, string> = {
  novel: "Novels",
  stories: "Short stories",
  play: "Plays",
  poem: "Poetry",
  other: "Other",
};

/** A story collection whose title already says it is ghost stories. */
export function isGhostStories(work: ShelfWork): boolean {
  if (work.form !== "stories") return false;
  return /\bghosts?\b|\bghostly\b/i.test(work.title);
}

/**
 * Sea writing only when the title, or the book's own opening, says ship or sea
 * voyage. A metaphorical "sea of" is not enough.
 */
export function isSeaWork(work: ShelfWork): boolean {
  if (work.form === "poem" || work.form === "play") return false;
  if (/\bsea-wolf\b|\bmoby-dick\b|\bsouth sea\b|twixt land and sea|\bsea tales\b|\bsea stories\b/i.test(work.title)) {
    return true;
  }
  if (/\bsea of\b/i.test(work.title)) return false;
  const lead = `${work.intro ?? ""} ${work.opening ?? ""}`.slice(0, 480);
  return /\b(south seas|prison ship|handsome sailor|whaling voyage|common sailor|shallow sea)\b/i.test(lead);
}

/** Catalog minutes, rounded. Blank when the shelf has no real length. */
export function mixTimeLabel(minutes: number): string {
  if (!(minutes > 0) || !Number.isFinite(minutes)) return "";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function emptyMixHistory(): MixHistory {
  return { opened: [], finished: [], kept: [], favorites: [], minutesByWork: {} };
}

/** Local store and the signed-in shelf use the same fields. */
export function mixHistoryFromState(state: MixState | null | undefined): MixHistory {
  const history = emptyMixHistory();
  if (!state) return history;
  const opened = new Set<string>();
  const finished = new Set<string>();
  const kept = new Set<string>();
  const minutes: Record<string, number> = {};
  const addMinutes = (id: string, n: number) => {
    if (!id || !(n > 0) || !Number.isFinite(n)) return;
    minutes[id] = (minutes[id] ?? 0) + n;
  };
  for (const [id, row] of Object.entries(state.progress ?? {})) {
    if (!row) continue;
    if ((row.lastOpenedAt ?? 0) > 0 || row.entered) opened.add(id);
    if ((row.completedAt ?? 0) > 0) finished.add(id);
    if (Array.isArray(row.kept) && row.kept.length > 0) kept.add(id);
    if ((row.activeMs ?? 0) > 0) addMinutes(id, (row.activeMs ?? 0) / 60000);
  }
  for (const sit of state.sitHistory ?? []) {
    if (!sit?.workId) continue;
    addMinutes(sit.workId, sit.minutes ?? 0);
  }
  history.opened = [...opened];
  history.finished = [...finished];
  history.kept = [...kept];
  history.favorites = [...new Set((state.favorites ?? []).filter((id) => id.trim()))];
  history.minutesByWork = minutes;
  return history;
}

export function homeMixRows(
  history: MixHistory,
  day: string,
  pool: readonly ShelfWork[] = CLASSIC_LOCAL_WORKS,
): MixRow[] {
  const ready = pool.flatMap((work) => {
    if (!releasedForMix(work)) return [];
    const card = toCard(work);
    return card ? [card] : [];
  });
  const profiles = new Map(ready.map((card) => [card.work.id, profileOf(card.work)]));
  const rows: MixRow[] = [];
  const used = new Set<string>();

  if (hasHistory(history)) {
    const seeds = anchors(history, profiles);
    const because: MixRow[] = [];
    for (const seed of seeds) {
      if (because.length >= BECAUSE_CAP) break;
      const cards = rankCards(
        [seed],
        [...profiles.values()],
        new Set([seed.work.id, ...history.finished]),
        blurbKeysOf([seed.work]),
        laneSeed(day, `because:${seed.work.id}`),
        HOME_MIX_CARD_CAP,
      );
      if (cards.length < MIN_PERSONAL) continue;
      const ids = cards.map((card) => card.work.id);
      if (because.some((row) => overlap(row.cards.map((card) => card.work.id), ids) >= 0.5)) continue;
      because.push({
        id: `because:${seed.work.id}`,
        title: becauseTitle(seed.work, history),
        cards,
      });
    }
    const finished = history.finished.flatMap((id) => {
      const profile = profiles.get(id);
      return profile ? [profile] : [];
    });
    if (finished.length) {
      const cards = rankCards(
        finished,
        [...profiles.values()],
        new Set(history.finished),
        blurbKeysOf(finished.map((profile) => profile.work)),
        laneSeed(day, "finish"),
        HOME_MIX_CARD_CAP,
      );
      if (cards.length >= MIN_PERSONAL) {
        rows.push(...because, {
          id: "finish",
          title: "More like what you finish",
          cards,
        });
      } else {
        rows.push(...because);
      }
    } else {
      rows.push(...because);
    }
  } else {
    const starter = pickStarter(ready.map((card) => card.work), laneSeed(day, "start"));
    const cards = starter.flatMap((work) => {
      const card = toCard(work);
      return card ? [card] : [];
    });
    if (cards.length >= MIN_PERSONAL) {
      rows.push({ id: "start", title: "Start here", cards });
    }
  }

  for (const row of rows) {
    for (const card of row.cards) used.add(card.work.id);
  }

  const catalog = orderedCatalog(catalogCandidates(ready.map((card) => card.work)), day);
  for (const candidate of catalog) {
    if (rows.length >= HOME_MIX_MAX_ROWS) break;
    const minimum = candidate.kind === "place" ? MIN_PLACE : MIN_GENRE;
    const cards = takeShelf(candidate.works, laneSeed(day, candidate.id), used, minimum);
    if (cards.length < minimum) continue;
    rows.push({ id: candidate.id, title: candidate.title, cards });
    for (const card of cards) used.add(card.work.id);
  }
  return rows.slice(0, HOME_MIX_MAX_ROWS);
}

function hasHistory(history: MixHistory) {
  if (history.opened.length || history.finished.length || history.kept.length || history.favorites.length) {
    return true;
  }
  return Object.values(history.minutesByWork).some((n) => n > 0);
}

function becauseTitle(work: ShelfWork, history: MixHistory) {
  const read =
    history.finished.includes(work.id) ||
    history.opened.includes(work.id) ||
    (history.minutesByWork[work.id] ?? 0) > 0;
  if (read) return `Because you read ${work.title}`;
  if (history.kept.includes(work.id)) return `Because you kept a line from ${work.title}`;
  return `Because you saved ${work.title}`;
}

function anchors(history: MixHistory, profiles: Map<string, Profile>) {
  const ids = new Set<string>([
    ...history.opened,
    ...history.finished,
    ...history.kept,
    ...history.favorites,
    ...Object.keys(history.minutesByWork),
  ]);
  return [...ids]
    .map((id) => ({ id, weight: anchorWeight(id, history), profile: profiles.get(id) }))
    .filter((row): row is { id: string; weight: number; profile: Profile } => Boolean(row.profile) && row.weight > 0)
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        (history.minutesByWork[b.id] ?? 0) - (history.minutesByWork[a.id] ?? 0) ||
        a.id.localeCompare(b.id),
    )
    .map((row) => row.profile);
}

function anchorWeight(id: string, history: MixHistory) {
  let weight = 0;
  if (history.finished.includes(id)) weight += 8;
  if (history.kept.includes(id)) weight += 5;
  if (history.favorites.includes(id)) weight += 4;
  const minutes = history.minutesByWork[id] ?? 0;
  if (minutes > 0) weight += Math.min(4, minutes / 45);
  if (history.opened.includes(id)) weight += 1;
  return weight;
}

function catalogCandidates(works: ShelfWork[]) {
  const rows: { id: string; title: string; kind: "genre" | "place"; works: ShelfWork[] }[] = [];
  const forms: ShelfForm[] = ["novel", "stories", "poem", "play"];
  for (const form of forms) {
    const shelf = works.filter((work) => work.form === form);
    if (shelf.length >= MIN_GENRE) {
      rows.push({ id: `form:${form}`, title: FORM_TITLE[form], kind: "genre", works: shelf });
    }
  }
  const ghosts = works.filter(isGhostStories);
  if (ghosts.length >= MIN_GENRE) {
    rows.push({ id: "genre:ghost", title: "Ghost stories", kind: "genre", works: ghosts });
  }
  const seas = works.filter(isSeaWork);
  if (seas.length >= MIN_GENRE) {
    rows.push({ id: "genre:sea", title: "Sea stories", kind: "genre", works: seas });
  }
  const byRegion = new Map<string, ShelfWork[]>();
  for (const work of works) {
    const region = placeFor(work)?.region;
    if (!region || !(region in REGION_LABEL)) continue;
    const list = byRegion.get(region) ?? [];
    list.push(work);
    byRegion.set(region, list);
  }
  for (const [region, shelf] of byRegion) {
    if (shelf.length < MIN_PLACE) continue;
    rows.push({
      id: `place:${region}`,
      title: REGION_LABEL[region as PlaceRegion],
      kind: "place",
      works: shelf,
    });
  }
  return rows;
}

function orderedCatalog(
  catalog: { id: string; title: string; kind: "genre" | "place"; works: ShelfWork[] }[],
  day: string,
) {
  const byId = new Map(catalog.map((row) => [row.id, row]));
  const taken = new Set<string>();
  const ordered: typeof catalog = [];
  const take = (id: string | undefined) => {
    if (!id || taken.has(id)) return;
    const row = byId.get(id);
    if (!row) return;
    taken.add(id);
    ordered.push(row);
  };
  take("form:stories");
  take("form:novel");
  const lead = shuffleWithSeed(
    LEAD_PLACES.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    }),
    laneSeed(day, "lead-place"),
  )[0];
  if (lead) take(lead.id);
  ordered.push(
    ...shuffleWithSeed(
      catalog.filter((row) => !taken.has(row.id)),
      laneSeed(day, "rest-order"),
    ),
  );
  return ordered;
}

function rankCards(
  targets: Profile[],
  pool: Profile[],
  exclude: Set<string>,
  seedBlurbs: Set<string>,
  seed: number,
  limit: number,
) {
  const ranked = pool
    .filter((item) => !exclude.has(item.work.id))
    .map((item) => ({ item, tier: bestTier(targets, item) }))
    .filter((row) => row.tier <= 4);
  const buckets = [0, 1, 2, 3, 4].map((tier) =>
    shuffleWithSeed(
      ranked.filter((row) => row.tier === tier),
      seed + tier,
    ),
  );
  const picked = [];
  for (const bucket of buckets) {
    if (picked.length >= MIN_PERSONAL && bucket[0] && bestTier(targets, bucket[0].item) >= 3) break;
    for (const row of bucket) {
      picked.push(row);
      if (picked.length >= limit) break;
    }
    if (picked.length >= limit) break;
  }
  return picked.flatMap((row) => {
    const card = toCard(row.item.work);
    if (!card || seedBlurbs.has(blurbKey(card.blurb)) || sharesDescription(card.work.id, card.blurb)) return [];
    return [card];
  });
}

/** 0 author, 1 place, 2 region plus form and era, 3 region, 4 a real likeness. */
function bestTier(targets: Profile[], item: Profile) {
  let tier = 9;
  for (const target of targets) {
    let mine = 9;
    if (target.author && target.author === item.author) mine = 0;
    else if (target.place && target.place === item.place) mine = 1;
    else if (
      target.region &&
      target.region === item.region &&
      target.form === item.form &&
      target.era != null &&
      item.era != null &&
      Math.abs(target.era - item.era) <= 25
    ) {
      mine = 2;
    } else if (target.region && target.region === item.region) mine = 3;
    else if (similarity(target, item) >= 5) mine = 4;
    if (mine < tier) tier = mine;
  }
  return tier;
}

function takeShelf(works: ShelfWork[], seed: number, used: Set<string>, minimum: number) {
  const fresh = works.filter((work) => !used.has(work.id));
  const source = fresh.length >= minimum ? fresh : works;
  return shuffleWithSeed(source, seed)
    .slice(0, HOME_MIX_CARD_CAP)
    .flatMap((work) => {
      const card = toCard(work);
      return card ? [card] : [];
    });
}

function pickStarter(works: ShelfWork[], seed: number) {
  const mid = works.filter(
    (work) => work.minutes >= 40 && work.minutes <= 420 && (placeFor(work) || chipOnlyLabel(work.id)),
  );
  const pool = mid.length >= HOME_MIX_CARD_CAP ? mid : works;
  const mixed = shuffleWithSeed(pool, seed);
  const picked: ShelfWork[] = [];
  const regions = new Set<string>();
  const forms = new Set<string>();
  const authors = new Set<string>();
  const take = (work: ShelfWork, strict: boolean) => {
    if (picked.length >= HOME_MIX_CARD_CAP) return;
    if (picked.some((item) => item.id === work.id)) return;
    const region = placeFor(work)?.region ?? "";
    const author = authorKey(work.author);
    if (strict) {
      if (region && regions.has(region)) return;
      if (forms.has(work.form)) return;
      if (authors.has(author)) return;
    } else if (authors.has(author)) {
      return;
    }
    picked.push(work);
    if (region) regions.add(region);
    forms.add(work.form);
    authors.add(author);
  };
  for (const work of mixed) take(work, true);
  for (const work of mixed) take(work, false);
  return picked;
}

function similarity(a: Profile, b: Profile) {
  if (a.work.id === b.work.id) return 0;
  let score = 0;
  if (a.author && a.author === b.author) score += 6;
  if (a.region && a.region === b.region) score += 3;
  if (a.place && a.place === b.place) score += 2;
  if (a.form === b.form) score += 2;
  if (a.ghost && b.ghost) score += 2;
  if (a.sea && b.sea) score += 2;
  if (a.era != null && b.era != null) {
    const gap = Math.abs(a.era - b.era);
    if (gap === 0) score += 2;
    else if (gap === 25) score += 1;
  }
  if (a.length === b.length) score += 1;
  if (a.readability && a.readability === b.readability) score += 1;
  return score;
}

function profileOf(work: ShelfWork): Profile {
  const place = placeFor(work);
  return {
    work,
    author: authorKey(work.author),
    region: place?.region ?? null,
    place: place?.label ?? chipOnlyLabel(work.id),
    form: work.form,
    ghost: isGhostStories(work),
    sea: isSeaWork(work),
    era: work.year == null ? null : Math.floor(work.year / 25) * 25,
    length: lengthBucket(work.minutes),
    readability: readabilityOf(work),
  };
}

function authorKey(author: string) {
  return author
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function lengthBucket(minutes: number) {
  if (minutes < 90) return "short";
  if (minutes < 240) return "mid";
  if (minutes < 600) return "long";
  return "vast";
}

/** Opening sentences only. No score is shown; missing text stays unmatched. */
function readabilityOf(work: ShelfWork) {
  const text = (work.opening ?? "").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean);
  if (words.length < 20) return null;
  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter((part) => part.split(/\s+/).length >= 4);
  if (!sentences.length) return null;
  const average = words.length / sentences.length;
  if (average < 18) return "plain";
  if (average < 28) return "mixed";
  return "dense";
}

function toCard(work: ShelfWork): MixCard | null {
  const blurb = blurbFor(work).replace(/\s+/g, " ").trim();
  const time = mixTimeLabel(work.minutes);
  if (!work.title.trim() || !work.author.trim() || blurb.length < MIN_BLURB || !time) return null;
  if (sharesDescription(work.id, blurb)) return null;
  return { work, blurb, time };
}

/** Held, draft, catalog-only, and soft-hold titles never join a row. */
function releasedForMix(work: ShelfWork) {
  if (canonicalWorkId(work.id) !== work.id) return false;
  if (MIX_UNRELEASED_IDS.has(work.id)) return false;
  if (isEnReadableOff(work.id)) return false;
  if (!isBoundLocal(work)) return false;
  if (isAdaptedBySalon(work.id)) return false;
  if (work.author === "tbr" || work.author === "Salon") return false;
  return true;
}

let ownersByBlurb: Map<string, string[]> | null = null;

function ownersMap() {
  if (ownersByBlurb) return ownersByBlurb;
  const map = new Map<string, string[]>();
  for (const work of SHELF) {
    const key = blurbKey(blurbFor(work));
    if (key.length < MIN_BLURB) continue;
    const list = map.get(key) ?? [];
    list.push(work.id);
    map.set(key, list);
  }
  ownersByBlurb = map;
  return map;
}

/** Shelf ids whose description is this exact line. */
export function descriptionOwners(blurb: string): string[] {
  return ownersMap().get(blurbKey(blurb)) ?? [];
}

/** Ids that would show a line already used by a different book. */
export function sharedDescriptionIds(cards: { id: string; blurb: string }[]): Set<string> {
  const owners = new Map<string, string[]>();
  for (const card of cards) {
    const key = blurbKey(card.blurb);
    if (key.length < MIN_BLURB) continue;
    const list = owners.get(key) ?? [];
    list.push(card.id);
    owners.set(key, list);
  }
  const shared = new Set<string>();
  for (const ids of owners.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) shared.add(id);
  }
  return shared;
}

function sharesDescription(id: string, blurb: string) {
  const owners = descriptionOwners(blurb);
  return owners.length !== 1 || owners[0] !== id;
}

function blurbKeysOf(works: ShelfWork[]) {
  const keys = new Set<string>();
  for (const work of works) {
    const key = blurbKey(blurbFor(work));
    if (key.length >= MIN_BLURB) keys.add(key);
  }
  return keys;
}

function blurbKey(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function overlap(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const ids = new Set(left);
  const shared = right.filter((id) => ids.has(id)).length;
  return shared / Math.min(left.length, right.length);
}

function laneSeed(day: string, lane: string) {
  const seed = hashSeed(`${day || "1970-01-01"}:${lane}`);
  return seed === 0 ? 1 : seed;
}

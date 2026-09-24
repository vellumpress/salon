import { shelfWork } from "./catalog/shelf.ts";
import {
  openReadingFromActivity,
  type FriendActivity,
  type FriendActivityKind,
  type FriendGraph,
} from "./friend-profile.ts";
import type { HostedSit } from "./hosted-sit.ts";
import { normalizeHandle } from "./social.ts";
import type { SitPledge } from "./sit-pledge.ts";
import type { SitSession, WorkProgress } from "./store.ts";
import type { TogetherKeep } from "./together-keep.ts";

export type ActivityKind = Exclude<FriendActivityKind, "invited">;

export type ActivityDraft = {
  key: string;
  kind: ActivityKind;
  bookId: string;
  at: number;
  payload: Record<string, string | number>;
};

const READING_BUCKET_MS = 5 * 60 * 1000;

const LABELS: Record<ActivityKind, string> = {
  reading: "Reading",
  kept: "Kept",
  sit: "Sit",
  hosted: "Hosted",
  joined: "Joined",
  tonight: "Tonight",
  together: "Together",
  finished: "Finished",
};

type ShelfMeta = { workId: string; workTitle: string; author: string };

function metaFor(workId: string, fallbackTitle = "", fallbackAuthor = ""): ShelfMeta {
  const work = workId ? shelfWork(workId) : undefined;
  return {
    workId: work?.id ?? workId,
    workTitle: work?.title ?? fallbackTitle,
    author: work?.author ?? fallbackAuthor,
  };
}

function bookPayload(meta: ShelfMeta, summary: string, extra: Record<string, string | number> = {}) {
  const payload: Record<string, string | number> = { summary, ...extra };
  if (meta.workTitle) payload.workTitle = meta.workTitle;
  if (meta.author) payload.author = meta.author;
  return payload;
}

export type LocalHistory = {
  handle: string;
  progress: Record<string, WorkProgress>;
  sitHistory: SitSession[];
  hostedSits: HostedSit[];
  sitPledges: SitPledge[];
  togetherKeeps: TogetherKeep[];
};

/** Local events worth a hosted activity row. Existing history is included. */
export function draftsFromLocal(input: LocalHistory): ActivityDraft[] {
  const self = normalizeHandle(input.handle);
  if (self.length < 2) return [];
  const drafts: ActivityDraft[] = [];

  for (const [workId, item] of Object.entries(input.progress)) {
    if (!item || workId === "page" || !item.entered) continue;
    const meta = metaFor(workId);
    if (!item.completedAt && item.lastOpenedAt) {
      const bucket = Math.floor(item.lastOpenedAt / READING_BUCKET_MS);
      drafts.push({
        key: `reading:${workId}:${bucket}`,
        kind: "reading",
        bookId: meta.workId,
        at: item.lastOpenedAt,
        payload: bookPayload(meta, `reading ${meta.workTitle || workId}`, {
          atIndex: Math.max(0, item.breathIndex ?? 0),
        }),
      });
    }
    if (item.completedAt) {
      drafts.push({
        key: `finished:${workId}`,
        kind: "finished",
        bookId: meta.workId,
        at: item.completedAt,
        payload: bookPayload(meta, `finished ${meta.workTitle || workId}`),
      });
    }
    for (const breathId of item.kept ?? []) {
      if (!breathId) continue;
      drafts.push({
        key: `kept:${workId}:${breathId}`,
        kind: "kept",
        bookId: meta.workId,
        at: item.lastOpenedAt || item.completedAt || 0,
        payload: bookPayload(meta, `kept a line from ${meta.workTitle || workId}`, { breathId }),
      });
    }
  }

  for (const sit of input.sitHistory) {
    if (!sit.workId || !sit.endedAt) continue;
    const meta = metaFor(sit.workId);
    const minutes = sit.minutes > 0 ? Math.max(1, Math.round(sit.minutes)) : 0;
    drafts.push({
      key: `sit:${sit.workId}:${sit.endedAt}`,
      kind: "sit",
      bookId: meta.workId,
      at: sit.endedAt,
      payload: bookPayload(
        meta,
        `sat with ${meta.workTitle || sit.workId}`,
        minutes ? { progress: `${minutes} min` } : {},
      ),
    });
  }

  for (const sit of input.hostedSits) {
    const meta = metaFor(sit.workId, sit.workTitle, sit.author);
    if (sit.hostHandle === self) {
      drafts.push({
        key: `hosted:${sit.id}`,
        kind: "hosted",
        bookId: meta.workId,
        at: sit.createdAt,
        payload: bookPayload(meta, `hosted ${meta.workTitle || "a sit"}`),
      });
    }
    const guest = sit.rsvps.find((row) => row.handle === self && row.status === "yes");
    if (guest && sit.hostHandle !== self) {
      drafts.push({
        key: `joined:${sit.id}`,
        kind: "joined",
        bookId: meta.workId,
        at: guest.at || sit.createdAt,
        payload: bookPayload(meta, `joined a sit with ${meta.workTitle || "a book"}`),
      });
    }
    for (const keep of sit.keeps) {
      if (keep.handle !== self || !keep.line) continue;
      drafts.push({
        key: `kept:sit:${sit.id}:${keep.breathId}`,
        kind: "kept",
        bookId: meta.workId,
        at: keep.keptAt || sit.createdAt,
        payload: bookPayload(meta, `kept a line from ${meta.workTitle || "a book"}`, {
          line: keep.line,
          atIndex: keep.at,
          breathId: keep.breathId,
        }),
      });
    }
  }

  for (const pledge of input.sitPledges) {
    if (pledge.fromHandle !== self) continue;
    drafts.push({
      key: `tonight:${pledge.id}`,
      kind: "tonight",
      bookId: "",
      at: pledge.createdAt,
      payload: {
        summary:
          pledge.status === "done"
            ? "sat, as promised"
            : pledge.status === "cancelled"
              ? "set the tonight-note aside"
              : "will sit tonight",
      },
    });
  }

  for (const pair of input.togetherKeeps) {
    const side =
      pair.yours.handle === self ? pair.yours : pair.theirs.handle === self ? pair.theirs : null;
    if (!side) continue;
    const meta = metaFor(pair.workId, pair.workTitle, pair.author);
    drafts.push({
      key: `together:${pair.id}:${self}`,
      kind: "together",
      bookId: meta.workId,
      at: pair.createdAt,
      payload: bookPayload(meta, `kept a line from ${meta.workTitle || "a book"}`, {
        line: side.line,
        atIndex: side.at,
        breathId: side.breathId,
      }),
    });
  }

  return drafts.sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
}

export type ActivityRow = {
  id: number;
  user_id: string;
  kind: string;
  book_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const KINDS = new Set<ActivityKind>([
  "reading",
  "kept",
  "sit",
  "hosted",
  "joined",
  "tonight",
  "together",
  "finished",
]);

function asKind(value: string): ActivityKind | null {
  return KINDS.has(value as ActivityKind) ? (value as ActivityKind) : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberOf(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function activityFromRow(row: ActivityRow): FriendActivity | null {
  const kind = asKind(row.kind);
  if (!kind) return null;
  const payload = row.payload ?? {};
  const bookId = text(row.book_id);
  const meta = bookId ? metaFor(bookId, text(payload.workTitle), text(payload.author)) : null;
  const summary = text(payload.summary) || defaultSummary(kind, meta?.workTitle || bookId);
  const at = Date.parse(row.created_at);
  return {
    id: `remote:${row.id}`,
    at: Number.isFinite(at) ? at : 0,
    kind,
    label: LABELS[kind],
    summary,
    line: text(payload.line) || undefined,
    workId: meta?.workId || undefined,
    workTitle: meta?.workTitle || undefined,
    author: meta?.author || undefined,
    atIndex: numberOf(payload.atIndex),
    breathId: text(payload.breathId) || undefined,
    progress: text(payload.progress) || undefined,
  };
}

function defaultSummary(kind: ActivityKind, title: string) {
  const book = title || "a book";
  if (kind === "reading") return `reading ${book}`;
  if (kind === "finished") return `finished ${book}`;
  if (kind === "kept" || kind === "together") return `kept a line from ${book}`;
  if (kind === "sit") return `sat with ${book}`;
  if (kind === "hosted") return `hosted ${book}`;
  if (kind === "joined") return `joined a sit with ${book}`;
  return "a note from tbr";
}

/**
 * Fold synced activity into the device graph.
 * Contacts gain a current book. People who are not already contacts stay off the list.
 */
export function withRemoteActivity(
  graph: FriendGraph,
  byHandle: Record<string, FriendActivity[]>,
): FriendGraph {
  const remoteActivity: Record<string, FriendActivity[]> = {};
  for (const [handle, events] of Object.entries(byHandle)) {
    const clean = normalizeHandle(handle);
    if (clean.length < 2 || !events?.length) continue;
    remoteActivity[clean] = events;
  }
  if (!Object.keys(remoteActivity).length) return graph;
  const contacts = graph.contacts.map((contact) => {
    const events = remoteActivity[contact.handle];
    if (!events?.length) return contact;
    const current = openReadingFromActivity(events);
    if (current) {
      return { ...contact, reading: current.workId, workTitle: current.workTitle };
    }
    const finished = new Set(
      events.filter((event) => event.kind === "finished" && event.workId).map((event) => event.workId),
    );
    if (contact.reading && finished.has(contact.reading)) {
      return { ...contact, reading: undefined, workTitle: undefined };
    }
    return contact;
  });
  return { ...graph, contacts, remoteActivity };
}

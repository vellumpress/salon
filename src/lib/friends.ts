import { lastReadProgress } from "./continuity.ts";
import { shelfWork } from "./catalog/shelf.ts";
import type { HostedSit } from "./hosted-sit.ts";
import { formatHandle, normalizeHandle } from "./social.ts";
import type { WorkProgress } from "./store.ts";
import type { TogetherKeep } from "./together-keep.ts";

export type FriendContact = {
  id: string;
  handle: string;
  name: string;
  addedAt: number;
  reading?: string;
  workTitle?: string;
};

export type FriendPerson = {
  id: string;
  handle: string;
  name: string;
  city: string;
  reading: string;
  workTitle: string;
  author: string;
  line?: string;
  catalog: boolean;
};

export type FriendActivity = FriendPerson & {
  kind: "sitting" | "kept";
};

export function friendKeptLine(person: FriendPerson): string {
  return (person.line ?? "").trim();
}

export function contactId(handle: string) {
  return `local:${normalizeHandle(handle)}`;
}

export function asContact(input: {
  handle: string;
  name?: string;
  reading?: string;
  workTitle?: string;
}): FriendContact | null {
  const handle = normalizeHandle(input.handle);
  if (handle.length < 2) return null;
  const work = input.reading ? shelfWork(input.reading) : undefined;
  return {
    id: contactId(handle),
    handle,
    name: (input.name ?? "").trim().slice(0, 80) || formatHandle(handle),
    addedAt: Date.now(),
    reading: work?.id ?? input.reading,
    workTitle: work?.title ?? input.workTitle,
  };
}

function workMeta(workId: string, fallbackTitle = "") {
  const work = shelfWork(workId);
  return {
    reading: workId,
    workTitle: work?.title ?? fallbackTitle,
    author: work?.author ?? "",
  };
}

export function personFromContact(contact: FriendContact): FriendPerson {
  const reading = contact.reading ?? "";
  return {
    id: contact.id,
    handle: contact.handle,
    name: contact.name,
    city: "",
    ...workMeta(reading, contact.workTitle ?? ""),
    catalog: false,
  };
}

export function resolvePerson(
  idOrHandle: string,
  contacts: FriendContact[] = [],
): FriendPerson | undefined {
  const handle = normalizeHandle(idOrHandle.replace(/^local:/, ""));
  const contact = contacts.find(
    (row) => row.id === idOrHandle || row.handle === handle,
  );
  return contact ? personFromContact(contact) : undefined;
}

/** Contacts on this device only. Demo salon readers are not suggestions. */
export function searchPeople(query: string, contacts: FriendContact[] = []): FriendPerson[] {
  const q = query.trim().toLowerCase().replace(/^@+/, "");
  return contacts
    .map(personFromContact)
    .filter((row) => {
      if (!q) return true;
      return row.handle.includes(q) || row.name.toLowerCase().includes(q);
    });
}

export function friendsFeed(
  following: string[],
  contacts: FriendContact[] = [],
): FriendActivity[] {
  const rows: FriendActivity[] = [];
  const seen = new Set<string>();
  for (const id of following) {
    const person = resolvePerson(id, contacts);
    if (!person || seen.has(person.id) || !person.reading) continue;
    seen.add(person.id);
    rows.push({ ...person, kind: "sitting" });
    if (friendKeptLine(person)) {
      rows.push({ ...person, kind: "kept" });
    }
  }
  return rows;
}

/** A kept line this phone actually holds — never a catalog sentence. */
export type BoardKeptLine = {
  id: string;
  handle: string;
  name: string;
  line: string;
  workId: string;
  workTitle: string;
  atIndex: number;
  breathId?: string;
};

/**
 * Kept lines from this device only: the reader's own keeps, together-keeps,
 * and lines saved on a hosted sit. Empty in, empty out.
 */
export function boardKeptLines(input: {
  selfHandle: string;
  selfName?: string;
  selfLines?: Array<{
    workId: string;
    breathId: string;
    text: string;
    title: string;
    at: number;
  }>;
  togetherKeeps?: TogetherKeep[];
  hostedSits?: HostedSit[];
}): BoardKeptLine[] {
  const self = normalizeHandle(input.selfHandle);
  const rows: BoardKeptLine[] = [];
  const seen = new Set<string>();

  function push(row: BoardKeptLine) {
    const line = row.line.trim();
    const handle = normalizeHandle(row.handle);
    const workId = row.workId.trim();
    if (!line || !workId || handle.length < 2) return;
    const key = `${handle}|${workId}|${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ ...row, handle, line, workId });
  }

  for (const line of input.selfLines ?? []) {
    if (!self) continue;
    push({
      id: `self:${line.workId}:${line.breathId}`,
      handle: self,
      name: (input.selfName ?? "").trim() || formatHandle(self),
      line: line.text,
      workId: line.workId,
      workTitle: line.title,
      atIndex: line.at,
      breathId: line.breathId,
    });
  }

  for (const pair of input.togetherKeeps ?? []) {
    for (const side of [pair.theirs, pair.yours]) {
      push({
        id: `together:${pair.id}:${side.handle}:${side.breathId}`,
        handle: side.handle,
        name: side.name,
        line: side.line,
        workId: pair.workId,
        workTitle: pair.workTitle,
        atIndex: side.at,
        breathId: side.breathId,
      });
    }
  }

  for (const sit of input.hostedSits ?? []) {
    for (const keep of sit.keeps) {
      push({
        id: `sit:${sit.id}:${keep.handle}:${keep.breathId}`,
        handle: keep.handle,
        name: keep.name,
        line: keep.line,
        workId: sit.workId,
        workTitle: sit.workTitle,
        atIndex: keep.at,
        breathId: keep.breathId,
      });
    }
  }

  return rows;
}

/**
 * Friends rails must be exactly as tall as their cards. iOS gives an auto-height
 * flex row inside the page scroller the scrollport's height, and `.rail`'s ink
 * fill then paints a void under the cards. Callers pin the row to this value.
 */
export function fitRailHeight(cardHeights: readonly number[]): number {
  let h = 0;
  for (const card of cardHeights) {
    if (card > h) h = card;
  }
  return h > 0 ? Math.ceil(h) : 0;
}

export function youCard(input: {
  handle: string;
  name?: string;
  progress: Record<string, WorkProgress>;
}): FriendPerson {
  const last = lastReadProgress(input.progress);
  const work = last ? shelfWork(last.id) : undefined;
  const handle = normalizeHandle(input.handle);
  return {
    id: "you",
    handle,
    name: (input.name ?? "").trim() || (handle ? formatHandle(handle) : "You"),
    city: "This sitting",
    reading: last?.id ?? "",
    workTitle: work?.title ?? "",
    author: work?.author ?? "",
    line: handle
      ? "Friends on this phone can follow your current sit."
      : "Claim an @name so people can find you.",
    catalog: false,
  };
}


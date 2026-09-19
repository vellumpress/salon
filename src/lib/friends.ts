import { lastReadProgress } from "./continuity.ts";
import { shelfWork } from "./catalog/shelf.ts";
import {
  READERS,
  formatHandle,
  normalizeHandle,
  readerByHandle,
  searchReaders,
  type Reader,
} from "./social.ts";
import type { WorkProgress } from "./store.ts";

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
  kind: "sitting";
};

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

export function personFromReader(reader: Reader): FriendPerson {
  return {
    id: reader.id,
    handle: reader.handle,
    name: reader.name,
    city: reader.city,
    ...workMeta(reader.reading, reader.workTitle),
    line: reader.line,
    catalog: true,
  };
}

export function personFromContact(contact: FriendContact): FriendPerson {
  const catalog = readerByHandle(contact.handle);
  if (catalog) return personFromReader(catalog);
  const reading = contact.reading ?? "";
  return {
    id: contact.id,
    handle: contact.handle,
    name: contact.name,
    city: "This device",
    ...workMeta(reading, contact.workTitle ?? ""),
    catalog: false,
  };
}

export function resolvePerson(
  idOrHandle: string,
  contacts: FriendContact[] = [],
): FriendPerson | undefined {
  const reader = READERS.find((row) => row.id === idOrHandle) ?? readerByHandle(idOrHandle);
  if (reader) return personFromReader(reader);
  const handle = normalizeHandle(idOrHandle.replace(/^local:/, ""));
  const contact = contacts.find(
    (row) => row.id === idOrHandle || row.handle === handle,
  );
  return contact ? personFromContact(contact) : undefined;
}

export function searchPeople(query: string, contacts: FriendContact[] = []): FriendPerson[] {
  const catalog = searchReaders(query).map(personFromReader);
  const seen = new Set(catalog.map((row) => row.handle));
  const extras = contacts
    .map(personFromContact)
    .filter((row) => {
      if (seen.has(row.handle)) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase().replace(/^@+/, "");
      return row.handle.includes(q) || row.name.toLowerCase().includes(q);
    });
  return [...catalog, ...extras];
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
  }
  return rows;
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


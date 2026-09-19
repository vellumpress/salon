import { shelfWork } from "./catalog/shelf.ts";
import { clipLine, decodeShare, encodeShare, makeShortId } from "./share-codec.ts";
import { formatHandle, normalizeHandle, readerByHandle } from "./social.ts";

export type TogetherKeepSide = {
  handle: string;
  name: string;
  breathId: string;
  line: string;
  at: number;
};

export type TogetherKeep = {
  id: string;
  workId: string;
  workTitle: string;
  author: string;
  theirs: TogetherKeepSide;
  yours: TogetherKeepSide;
  createdAt: number;
};

export type EchoInvite = {
  workId: string;
  handle: string;
  name: string;
  line: string;
  breathId?: string;
  at?: number;
  word?: string;
};

type EchoWire = {
  v: 1;
  k: "echo";
  w: string;
  h: string;
  n?: string;
  l: string;
  b?: string;
  a?: number;
  d?: string;
};

export function echoInvitePath(invite: EchoInvite): string {
  return `/read/${encodeURIComponent(invite.workId)}?at=${Math.max(0, invite.at ?? 0)}&echo=${encodeURIComponent(encodeEchoInvite(invite))}`;
}

export function encodeEchoInvite(invite: EchoInvite): string {
  const wire: EchoWire = {
    v: 1,
    k: "echo",
    w: invite.workId,
    h: normalizeHandle(invite.handle),
    n: invite.name.trim().slice(0, 80) || undefined,
    l: clipLine(invite.line, 220),
    b: invite.breathId,
    a: invite.at,
    d: invite.word,
  };
  return encodeShare(wire);
}

export function decodeEchoInvite(token: string): EchoInvite | null {
  const wire = decodeShare<EchoWire>(token);
  if (!wire || wire.v !== 1 || wire.k !== "echo") return null;
  const handle = normalizeHandle(wire.h ?? "");
  const workId = (wire.w ?? "").trim();
  if (!handle || !workId) return null;
  const catalog = readerByHandle(handle);
  return {
    workId,
    handle,
    name: (wire.n ?? "").trim() || catalog?.name || formatHandle(handle),
    line: clipLine(wire.l ?? "", 220),
    breathId: wire.b,
    at: typeof wire.a === "number" && wire.a >= 0 ? Math.floor(wire.a) : undefined,
    word: wire.d,
  };
}

export function findEchoBreath(
  breaths: ReadonlyArray<{ id: string; text: string }>,
  invite: Pick<EchoInvite, "breathId" | "at" | "word"> & { line?: string },
): number {
  if (invite.breathId) {
    const byId = breaths.findIndex((row) => row.id === invite.breathId);
    if (byId >= 0) return byId;
  }
  if (typeof invite.at === "number" && invite.at >= 0 && invite.at < breaths.length) {
    return Math.floor(invite.at);
  }
  const needle = (invite.line || invite.word || "").toLowerCase().trim();
  if (needle) {
    const exact = breaths.findIndex((row) => row.text.trim().toLowerCase() === needle);
    if (exact >= 0) return exact;
    const word = (invite.word || firstWord(invite.line ?? "")).toLowerCase();
    if (word.length > 2) {
      const hit = breaths.findIndex((row) => row.text.toLowerCase().includes(word));
      if (hit >= 0) return hit;
    }
  }
  return 0;
}

function firstWord(line: string): string {
  return (line.match(/[A-Za-z][A-Za-z'-]{2,}/) ?? [""])[0];
}

export function pairTogetherKeep(input: {
  workId: string;
  theirs: TogetherKeepSide;
  yours: TogetherKeepSide;
  createdAt?: number;
}): TogetherKeep | null {
  const workId = input.workId.trim();
  if (!workId) return null;
  if (!input.theirs.handle || !input.theirs.line.trim()) return null;
  if (!input.yours.breathId || !input.yours.line.trim()) return null;
  const work = shelfWork(workId);
  return {
    id: makeShortId("tk"),
    workId,
    workTitle: work?.title ?? workId,
    author: work?.author ?? "",
    theirs: {
      ...input.theirs,
      handle: normalizeHandle(input.theirs.handle),
      line: clipLine(input.theirs.line),
    },
    yours: {
      ...input.yours,
      handle: normalizeHandle(input.yours.handle),
      line: clipLine(input.yours.line),
    },
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function sameTogetherPair(a: TogetherKeep, b: TogetherKeep): boolean {
  return (
    a.workId === b.workId &&
    a.theirs.handle === b.theirs.handle &&
    a.theirs.breathId === b.theirs.breathId &&
    a.yours.breathId === b.yours.breathId
  );
}

export function togetherKeepKey(row: TogetherKeep): string {
  return `${row.workId}:${row.theirs.handle}:${row.theirs.breathId}:${row.yours.breathId}`;
}

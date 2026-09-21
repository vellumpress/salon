import { clipLine, decodeShare, encodeShare, makeShortId } from "./share-codec.ts";
import { publicUrl } from "./site.ts";
import { formatHandle, normalizeHandle } from "./social.ts";

export type EveningWindow = "tonight" | "early" | "late";

export const EVENING_WINDOWS: ReadonlyArray<{
  id: EveningWindow;
  label: string;
  line: string;
}> = [
  { id: "tonight", label: "Tonight", line: "Before the day closes." },
  { id: "early", label: "Early evening", line: "Around seven to nine." },
  { id: "late", label: "Later", line: "After nine, before sleep." },
];

export type SitPledgeStatus = "pending" | "done" | "cancelled";

export type SitPledge = {
  id: string;
  fromHandle: string;
  fromName: string;
  toHandle: string;
  toName: string;
  window: EveningWindow;
  dueAt: number;
  createdAt: number;
  status: SitPledgeStatus;
  note?: string;
};

type PledgeWire = {
  v: 1;
  k: "pledge";
  id: string;
  f: string;
  fn?: string;
  t: string;
  tn?: string;
  w: EveningWindow;
  d: number;
  c: number;
  s?: SitPledgeStatus;
  n?: string;
};

export function isEveningWindow(value: unknown): value is EveningWindow {
  return value === "tonight" || value === "early" || value === "late";
}

export function windowHours(window: EveningWindow): { start: number; end: number } {
  if (window === "early") return { start: 19, end: 21 };
  if (window === "late") return { start: 21, end: 23 };
  return { start: 18, end: 23 };
}

export function dueAtForWindow(window: EveningWindow, now = new Date()): number {
  const hours = windowHours(window);
  const due = new Date(now);
  due.setHours(hours.end, 0, 0, 0);
  if (due.getTime() <= now.getTime()) {
    due.setDate(due.getDate() + 1);
  }
  return due.getTime();
}

export function windowLabel(window: EveningWindow): string {
  return EVENING_WINDOWS.find((row) => row.id === window)?.label ?? "Tonight";
}

export function pledgeLine(pledge: SitPledge): string {
  if (pledge.status === "done") return "They sat.";
  if (pledge.status === "cancelled") return "Set aside.";
  return clipLine(
    pledge.note || `${formatHandle(pledge.fromHandle)} will sit ${windowLabel(pledge.window).toLowerCase()}.`,
    160,
  );
}

export function createSitPledge(input: {
  fromHandle: string;
  fromName?: string;
  toHandle: string;
  toName?: string;
  window?: EveningWindow;
  note?: string;
  createdAt?: number;
}): SitPledge | null {
  const fromHandle = normalizeHandle(input.fromHandle);
  const toHandle = normalizeHandle(input.toHandle);
  if (!fromHandle || !toHandle || fromHandle === toHandle) return null;
  const createdAt = input.createdAt ?? Date.now();
  const window = isEveningWindow(input.window) ? input.window : "tonight";
  return {
    id: makeShortId("pl"),
    fromHandle,
    fromName: (input.fromName ?? "").trim() || formatHandle(fromHandle),
    toHandle,
    toName: (input.toName ?? "").trim() || formatHandle(toHandle),
    window,
    dueAt: dueAtForWindow(window, new Date(createdAt)),
    createdAt,
    status: "pending",
    note: input.note?.trim().slice(0, 160) || undefined,
  };
}

export function encodeSitPledge(pledge: SitPledge): string {
  const wire: PledgeWire = {
    v: 1,
    k: "pledge",
    id: pledge.id,
    f: pledge.fromHandle,
    fn: pledge.fromName || undefined,
    t: pledge.toHandle,
    tn: pledge.toName || undefined,
    w: pledge.window,
    d: pledge.dueAt,
    c: pledge.createdAt,
    s: pledge.status === "pending" ? undefined : pledge.status,
    n: pledge.note,
  };
  return encodeShare(wire);
}

export function decodeSitPledge(token: string): SitPledge | null {
  const wire = decodeShare<PledgeWire>(token);
  if (!wire || wire.v !== 1 || wire.k !== "pledge") return null;
  const fromHandle = normalizeHandle(wire.f ?? "");
  const toHandle = normalizeHandle(wire.t ?? "");
  if (!fromHandle || !toHandle) return null;
  const window = isEveningWindow(wire.w) ? wire.w : "tonight";
  const status: SitPledgeStatus =
    wire.s === "done" || wire.s === "cancelled" ? wire.s : "pending";
  return {
    id: (wire.id ?? makeShortId("pl")).slice(0, 16),
    fromHandle,
    fromName: (wire.fn ?? "").trim() || formatHandle(fromHandle),
    toHandle,
    toName: (wire.tn ?? "").trim() || formatHandle(toHandle),
    window,
    dueAt: typeof wire.d === "number" ? wire.d : dueAtForWindow(window),
    createdAt: typeof wire.c === "number" ? wire.c : Date.now(),
    status,
    note: wire.n,
  };
}

export function sitPledgePath(pledge: SitPledge): string {
  return `/pledge/${encodeURIComponent(encodeSitPledge(pledge))}`;
}

export function sitPledgeUrl(pledge: SitPledge): string {
  return publicUrl(sitPledgePath(pledge));
}

export function setPledgeStatus(pledge: SitPledge, status: SitPledgeStatus): SitPledge {
  return { ...pledge, status };
}

export function mergePledge(local: SitPledge | undefined, incoming: SitPledge): SitPledge {
  if (!local || local.id !== incoming.id) return incoming;
  const rank = { pending: 0, done: 1, cancelled: 1 };
  const status = rank[incoming.status] >= rank[local.status] ? incoming.status : local.status;
  return { ...local, ...incoming, status };
}

export function pledgeInvolves(pledge: SitPledge, handle: string): boolean {
  const me = normalizeHandle(handle);
  if (!me) return false;
  return pledge.fromHandle === me || pledge.toHandle === me;
}

export function isPledgePending(pledge: SitPledge, now = Date.now()): boolean {
  return pledge.status === "pending" && pledge.dueAt + 6 * 60 * 60 * 1000 > now;
}

/** In-tab reminder only — no push service on Pages. */
export function remindPledgeLocally(pledge: SitPledge): void {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const wait = Math.max(0, pledge.dueAt - Date.now() - 30 * 60 * 1000);
  if (wait > 12 * 60 * 60 * 1000) return;
  window.setTimeout(() => {
    try {
      new Notification("A sitting is waiting", {
        body: `${formatHandle(pledge.toHandle)} still has your word.`,
      });
    } catch {
      /* ignore */
    }
  }, wait);
}

import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { isLocalBound } from "@/lib/catalog/full-pdf";
import {
  isSerializeBound,
  serializeClubNight,
  serializeClubNightLine,
  serializePlan,
} from "@/lib/catalog/serialize";
import { shelfWork } from "@/lib/catalog/shelf";
import { fillOf, type Fill } from "@/lib/mondrian";
import { CLUBS } from "@/lib/social";
import type { BookClubView, ClubSessionView, UpcomingSit } from "./clubs";
import { asClubFill, isIsoInWindow } from "./club-time";

type ClubRow = {
  id: string;
  name: string;
  work_id: string;
  host_user_id: string | null;
  invite_token: string;
  fill: string;
  note: string;
  created_at: string | Date;
  serialize_plan_id: string | null;
  start_episode: number | null;
};

type SessionRow = {
  id: number;
  club_id: string;
  starts_at: string | Date;
  label: string;
};

const RESERVED = new Set(["invite", "new", "start", ...CLUBS.map((club) => club.id)]);
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function makeClubId() {
  let id = "";
  for (let i = 0; i < 8; i += 1) {
    id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return id;
}

function makeInviteToken() {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

function asIso(value: string | Date) {
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return value.toISOString();
}

function workMeta(workId: string) {
  const work = shelfWork(workId);
  return {
    workTitle: work?.title ?? workId,
    author: work?.author ?? "",
  };
}

function toSession(row: SessionRow): ClubSessionView {
  return {
    id: Number(row.id),
    startsAt: asIso(row.starts_at),
    label: row.label ?? "",
  };
}

function pickNext(sessions: ClubSessionView[], now = Date.now()) {
  const horizon = now - 8 * 60 * 60 * 1000;
  const upcoming = sessions
    .filter((session) => new Date(session.startsAt).getTime() >= horizon)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return upcoming[0] ?? sessions[0] ?? null;
}

function serializeView(planId: string | null, startEpisode: number | null, sessionIndex = 0) {
  const plan = serializePlan(planId);
  if (!plan) {
    return { serializePlanId: null, startEpisode: null, serializeLabel: null, episode: null as number | null };
  }
  const start = startEpisode ?? 1;
  const episode = serializeClubNight(start, sessionIndex, plan.nights);
  return {
    serializePlanId: plan.id,
    startEpisode: start,
    serializeLabel: serializeClubNightLine(plan, episode),
    episode,
  };
}

function sessionLabelFor(planId: string | null, startEpisode: number | null, sessionIndex: number, fallback: string) {
  const view = serializeView(planId, startEpisode, sessionIndex);
  return view.serializeLabel ?? fallback;
}

function toClub(row: ClubRow, sessions: SessionRow[]): BookClubView {
  const mapped = sessions
    .map(toSession)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const meta = workMeta(row.work_id);
  const next = pickNext(mapped);
  const nextIndex = next ? Math.max(0, mapped.findIndex((session) => session.id === next.id)) : 0;
  const serial = serializeView(row.serialize_plan_id, row.start_episode, nextIndex);
  return {
    id: row.id,
    name: row.name,
    workId: row.work_id,
    workTitle: meta.workTitle,
    author: meta.author,
    fill: asClubFill(row.fill),
    inviteToken: row.invite_token,
    note: row.note ?? "",
    hostUserId: row.host_user_id,
    createdAt: asIso(row.created_at),
    serializePlanId: serial.serializePlanId,
    startEpisode: serial.startEpisode,
    serializeLabel: serial.serializeLabel,
    nextSession: next,
    sessions: mapped,
  };
}

async function sessionsFor(clubId: string) {
  const sql = await getSql();
  return sql<SessionRow>`
    select id, club_id, starts_at, label
    from club_sessions
    where club_id = ${clubId}
    order by starts_at asc
  `;
}

async function loadClub(id: string): Promise<BookClubView | null> {
  const sql = await getSql();
  const rows = await sql<ClubRow>`
    select id, name, work_id, host_user_id, invite_token, fill, note, created_at,
           serialize_plan_id, start_episode
    from book_clubs
    where id = ${id}
  `;
  const row = rows[0];
  if (!row) return null;
  return toClub(row, await sessionsFor(row.id));
}

async function loadClubByToken(token: string): Promise<BookClubView | null> {
  const sql = await getSql();
  const rows = await sql<ClubRow>`
    select id, name, work_id, host_user_id, invite_token, fill, note, created_at,
           serialize_plan_id, start_episode
    from book_clubs
    where invite_token = ${token}
  `;
  const row = rows[0];
  if (!row) return null;
  return toClub(row, await sessionsFor(row.id));
}

function requireLocalWork(workId: string) {
  if (!isLocalBound(workId)) {
    throw new Error("Pick a bound book from the shelf");
  }
}

function requireSerialize(workId: string, planId?: string, startEpisode?: number) {
  if (!planId) {
    return { serializePlanId: null as string | null, startEpisode: null as number | null };
  }
  const plan = serializePlan(planId);
  if (!plan) throw new Error("That series is not on the board");
  if (!isSerializeBound(plan) || plan.shelfWorkId !== workId) {
    throw new Error("Pick a bound series from the shelf");
  }
  const start = Math.min(plan.nights, Math.max(1, startEpisode ?? 1));
  return { serializePlanId: plan.id, startEpisode: start };
}

function requireStartsAt(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()) || !isIsoInWindow(date.toISOString())) {
    throw new Error("Pick a day and time that can be kept");
  }
  return date.toISOString();
}

async function addMember(clubId: string, userId: string | null) {
  if (!userId) return;
  const sql = await getSql();
  await sql`
    insert into club_members (club_id, user_id)
    values (${clubId}, ${userId})
    on conflict (club_id, user_id) do nothing
  `;
}

export async function createClubHandler(input: {
  name: string;
  workId: string;
  startsAt: string;
  note?: string;
  serializePlanId?: string;
  startEpisode?: number;
  hostUserId: string | null;
}): Promise<BookClubView> {
  requireLocalWork(input.workId);
  const serial = requireSerialize(input.workId, input.serializePlanId, input.startEpisode);
  const startsAt = requireStartsAt(input.startsAt);
  const name = input.name.trim().slice(0, 80);
  const note = (input.note ?? "").trim().slice(0, 240);
  const fill: Fill = fillOf(input.workId);
  const firstLabel = sessionLabelFor(serial.serializePlanId, serial.startEpisode, 0, note);
  const sql = await getSql();

  let clubId = makeClubId();
  let token = makeInviteToken();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (RESERVED.has(clubId)) {
      clubId = makeClubId();
      continue;
    }
    try {
      await sql`
        insert into book_clubs (
          id, name, work_id, host_user_id, invite_token, fill, note,
          serialize_plan_id, start_episode
        )
        values (
          ${clubId},
          ${name},
          ${input.workId},
          ${input.hostUserId},
          ${token},
          ${fill},
          ${note},
          ${serial.serializePlanId},
          ${serial.startEpisode}
        )
      `;
      break;
    } catch (err) {
      clubId = makeClubId();
      token = makeInviteToken();
      if (attempt === 7) {
        throw err instanceof Error ? err : new Error("Could not open the club");
      }
    }
  }

  await sql`
    insert into club_sessions (club_id, starts_at, label)
    values (${clubId}, ${startsAt}::timestamptz, ${firstLabel})
  `;
  await addMember(clubId, input.hostUserId);
  const created = await loadClub(clubId);
  if (!created) throw new Error("Could not open the club");
  return created;
}

export async function listUpcomingSessionsHandler(): Promise<UpcomingSit[]> {
  const sql = await getSql();
  const rows = await sql<
    SessionRow & {
      name: string;
      work_id: string;
      invite_token: string;
      fill: string;
      note: string;
      serialize_plan_id: string | null;
      start_episode: number | null;
      session_index: number;
    }
  >`
    select
      s.id,
      s.club_id,
      s.starts_at,
      s.label,
      c.name,
      c.work_id,
      c.invite_token,
      c.fill,
      c.note,
      c.serialize_plan_id,
      c.start_episode,
      (
        select count(*)::int
        from club_sessions earlier
        where earlier.club_id = s.club_id
          and earlier.starts_at < s.starts_at
      ) as session_index
    from club_sessions s
    join book_clubs c on c.id = s.club_id
    where s.starts_at > now() - interval '8 hours'
    order by s.starts_at asc
    limit 48
  `;
  return rows.map((row) => {
    const meta = workMeta(row.work_id);
    const serial = serializeView(
      row.serialize_plan_id,
      row.start_episode,
      Number(row.session_index) || 0,
    );
    return {
      sessionId: Number(row.id),
      clubId: row.club_id,
      name: row.name,
      workId: row.work_id,
      workTitle: meta.workTitle,
      author: meta.author,
      fill: asClubFill(row.fill),
      inviteToken: row.invite_token,
      note: row.note ?? "",
      startsAt: asIso(row.starts_at),
      label: row.label ?? "",
      serializePlanId: serial.serializePlanId,
      serializeLabel: serial.serializeLabel,
      episode: serial.episode,
    };
  });
}

export async function getClubByInviteHandler(token: string): Promise<BookClubView | null> {
  const trimmed = token.trim();
  if (trimmed.length < 10) return null;
  return loadClubByToken(trimmed);
}

export async function getBookClubHandler(id: string): Promise<BookClubView | null> {
  return loadClub(id.trim().toLowerCase());
}

export async function listBookClubsHandler(ids: string[]): Promise<BookClubView[]> {
  const clean = [...new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))].slice(0, 40);
  const out: BookClubView[] = [];
  for (const id of clean) {
    const club = await loadClub(id);
    if (club) out.push(club);
  }
  return out;
}

export async function addClubSessionHandler(input: {
  token: string;
  startsAt: string;
  label?: string;
}): Promise<BookClubView> {
  const club = await loadClubByToken(input.token.trim());
  if (!club) throw new Error("This club would not come");
  const startsAt = requireStartsAt(input.startsAt);
  const sessionIndex = club.sessions.length;
  const serialLabel = sessionLabelFor(
    club.serializePlanId,
    club.startEpisode,
    sessionIndex,
    "",
  );
  const label = (input.label ?? serialLabel).trim().slice(0, 80);
  const sql = await getSql();
  await sql`
    insert into club_sessions (club_id, starts_at, label)
    values (${club.id}, ${startsAt}::timestamptz, ${label})
  `;
  const next = await loadClub(club.id);
  if (!next) throw new Error("Could not keep the sitting");
  return next;
}

export async function joinClubByInviteHandler(
  token: string,
  userId: string | null,
): Promise<BookClubView | null> {
  const club = await loadClubByToken(token.trim());
  if (!club) return null;
  await addMember(club.id, userId);
  return club;
}

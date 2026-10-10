import { z } from "zod";
import {
  serializeClubNight,
  serializeClubNightLine,
  serializePlan,
} from "@/lib/catalog/serialize";
import { shelfWork } from "@/lib/catalog/shelf";
import { canonicalWorkId } from "@/lib/work-id-alias";
import { fillOf, type Fill } from "@/lib/mondrian";
import { isOffline } from "@/lib/net";
import { getSupabase } from "@/lib/supabase";
import { CLUBS } from "@/lib/social";
import {
  clubDirectoryMessage,
  mergeClubMessages,
  SIGN_IN_ADD_SITTING,
  SIGN_IN_EDIT_CLUB,
  SIGN_IN_JOIN_CLUB,
  SIGN_IN_LEAVE_CLUB,
  SIGN_IN_OPEN_CLUB,
  SIGN_IN_START_CLUB,
  SIGN_IN_WRITE_CLUB,
} from "./club-flow";
import {
  asClubFill,
  asClubId,
  asInviteToken,
  clubInvitePath,
  clubInviteUrl,
  clubJoinPath,
  CLUB_ID_RE,
  INVITE_TOKEN_RE,
} from "./club-time";

export type { Fill };
export {
  clubDirectoryMessage,
  SIGN_IN_ADD_SITTING,
  SIGN_IN_EDIT_CLUB,
  SIGN_IN_JOIN_CLUB,
  SIGN_IN_LEAVE_CLUB,
  SIGN_IN_OPEN_CLUB,
  SIGN_IN_START_CLUB,
  SIGN_IN_WRITE_CLUB,
};
export {
  asClubFill,
  asClubId,
  asInviteToken,
  clubInvitePath,
  clubInviteUrl,
  clubJoinPath,
  CLUB_ID_RE,
  INVITE_TOKEN_RE,
};

export type ClubSessionView = {
  id: number;
  startsAt: string;
  label: string;
};

export type BookClubView = {
  id: string;
  name: string;
  workId: string;
  workTitle: string;
  author: string;
  fill: Fill;
  inviteToken: string;
  note: string;
  hostUserId: string | null;
  createdAt: string;
  serializePlanId: string | null;
  startEpisode: number | null;
  serializeLabel: string | null;
  nextSession: ClubSessionView | null;
  sessions: ClubSessionView[];
};

export type UpcomingSit = {
  sessionId: number;
  clubId: string;
  name: string;
  workId: string;
  workTitle: string;
  author: string;
  fill: Fill;
  inviteToken: string;
  note: string;
  startsAt: string;
  label: string;
  serializePlanId: string | null;
  serializeLabel: string | null;
  episode: number | null;
};

export type ClubMessage = {
  id: number;
  clubId: string;
  userId: string;
  handle: string;
  body: string;
  createdAt: string;
};

export type ClubMemberView = {
  userId: string;
  handle: string;
  name: string;
  joinedAt: string;
  breathIndex: number | null;
  place: string;
  workId: string;
};

const MIGRATION = "supabase/migrations/20260929180000_clubs.sql";

const createInput = z.object({
  name: z.string().trim().min(1).max(80),
  workId: z.string().min(1).max(80),
  startsAt: z.string().min(10).max(40),
  note: z.string().max(240).optional(),
  serializePlanId: z.string().trim().min(1).max(80).optional(),
  startEpisode: z.number().int().min(1).max(40).optional(),
});

type ClubRecord = {
  id: string;
  name: string;
  work_id: string;
  owner_id: string;
  invite_token: string;
  fill: string;
  note: string;
  created_at: string;
  serialize_plan_id: string | null;
  start_episode: number | null;
  sittings: ClubSessionView[] | null;
};

const RESERVED = new Set(["invite", "new", "start", ...CLUBS.map((club) => club.id)]);
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function makeClubId() {
  let id = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return id;
}

function makeInviteToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function asIso(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function workMeta(workId: string) {
  const work = shelfWork(workId);
  return {
    workTitle: work?.title ?? workId,
    author: work?.author ?? "",
  };
}

function normalizeSessions(raw: ClubSessionView[] | null | undefined) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row.startsAt === "string")
    .map((row) => ({
      id: Number(row.id) || 0,
      startsAt: asIso(row.startsAt),
      label: typeof row.label === "string" ? row.label : "",
    }))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
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
    return {
      serializePlanId: null,
      startEpisode: null,
      serializeLabel: null,
      episode: null as number | null,
    };
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

function toClub(row: ClubRecord): BookClubView {
  const sessions = normalizeSessions(row.sittings);
  const meta = workMeta(row.work_id);
  const next = pickNext(sessions);
  const nextIndex = next ? Math.max(0, sessions.findIndex((session) => session.id === next.id)) : 0;
  const serial = serializeView(row.serialize_plan_id, row.start_episode, nextIndex);
  return {
    id: row.id,
    name: row.name,
    workId: canonicalWorkId(row.work_id),
    workTitle: meta.workTitle,
    author: meta.author,
    fill: asClubFill(row.fill),
    inviteToken: row.invite_token,
    note: row.note ?? "",
    hostUserId: row.owner_id,
    createdAt: asIso(row.created_at),
    serializePlanId: serial.serializePlanId,
    startEpisode: serial.startEpisode,
    serializeLabel: serial.serializeLabel,
    nextSession: next,
    sessions,
  };
}

function toUpcoming(club: BookClubView): UpcomingSit[] {
  const horizon = Date.now() - 8 * 60 * 60 * 1000;
  return club.sessions
    .filter((session) => new Date(session.startsAt).getTime() >= horizon)
    .map((session, index) => {
      const serial = serializeView(club.serializePlanId, club.startEpisode, index);
      return {
        sessionId: session.id,
        clubId: club.id,
        name: club.name,
        workId: club.workId,
        workTitle: club.workTitle,
        author: club.author,
        fill: club.fill,
        inviteToken: club.inviteToken,
        note: club.note,
        startsAt: session.startsAt,
        label: session.label || serial.serializeLabel || "",
        serializePlanId: serial.serializePlanId,
        serializeLabel: serial.serializeLabel,
        episode: serial.episode,
      };
    });
}

function raise(error: unknown, fallback?: string): never {
  throw new Error(clubDirectoryMessage(error, fallback));
}

export async function hostedUserId(): Promise<string | null> {
  if (isOffline()) return null;
  const { data, error } = await getSupabase().auth.getSession();
  if (error) return null;
  return data.session?.user?.id ?? null;
}

async function requireUserId(message = SIGN_IN_OPEN_CLUB) {
  if (isOffline()) throw new Error("Offline");
  const id = await hostedUserId();
  if (!id) throw new Error(message);
  return id;
}

export async function createClub(input: z.input<typeof createInput>): Promise<BookClubView> {
  const data = createInput.parse(input);
  const ownerId = await requireUserId(SIGN_IN_START_CLUB);
  const plan = data.serializePlanId ? serializePlan(data.serializePlanId) : null;
  const serial = serializeView(plan?.id ?? null, data.startEpisode ?? null, 0);
  const label = serial.serializeLabel ?? "";
  let id = makeClubId();
  for (let attempt = 0; attempt < 4 && RESERVED.has(id); attempt += 1) id = makeClubId();
  const record: ClubRecord = {
    id,
    name: data.name,
    work_id: canonicalWorkId(data.workId),
    owner_id: ownerId,
    invite_token: makeInviteToken(),
    fill: fillOf(canonicalWorkId(data.workId)),
    note: data.note?.trim() ?? "",
    created_at: new Date().toISOString(),
    serialize_plan_id: serial.serializePlanId,
    start_episode: serial.startEpisode,
    sittings: [{ id: 1, startsAt: new Date(data.startsAt).toISOString(), label }],
  };
  const { data: inserted, error } = await getSupabase()
    .from("clubs")
    .insert(record)
    .select("*")
    .single();
  if (error) raise(error, SIGN_IN_START_CLUB);
  return toClub(inserted as ClubRecord);
}

export async function listUpcomingSessions(): Promise<UpcomingSit[]> {
  if (isOffline()) return [];
  const { data, error } = await getSupabase().from("clubs").select("*");
  if (error) {
    if (clubDirectoryMessage(error).includes(MIGRATION)) return [];
    raise(error);
  }
  return ((data ?? []) as ClubRecord[])
    .flatMap((row) => toUpcoming(toClub(row)))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export async function getClubByInvite(token: string): Promise<BookClubView | null> {
  const parsed = asInviteToken(token);
  if (!parsed) return null;
  if (isOffline()) throw new Error("Offline");
  const { data, error } = await getSupabase().rpc("club_by_invite", { p_token: parsed });
  if (error) raise(error);
  if (!data || typeof data !== "object") return null;
  return toClub(data as ClubRecord);
}

export async function getBookClub(id: string): Promise<BookClubView | null> {
  const parsed = asClubId(id);
  if (!parsed) return null;
  const { data, error } = await getSupabase().from("clubs").select("*").eq("id", parsed).maybeSingle();
  if (error) {
    if (clubDirectoryMessage(error).includes(MIGRATION)) return null;
    raise(error);
  }
  if (!data) return null;
  return toClub(data as ClubRecord);
}

export async function listBookClubs(ids: string[]): Promise<BookClubView[]> {
  const parsed = [...new Set(ids.map((id) => asClubId(id)).filter((id): id is string => Boolean(id)))].slice(0, 40);
  if (parsed.length === 0) return [];
  if (isOffline()) return [];
  const { data, error } = await getSupabase().from("clubs").select("*").in("id", parsed);
  if (error) {
    if (clubDirectoryMessage(error).includes(MIGRATION)) return [];
    raise(error);
  }
  const order = new Map(parsed.map((id, index) => [id, index]));
  return ((data ?? []) as ClubRecord[])
    .map(toClub)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function addClubSession(input: {
  token: string;
  startsAt: string;
  label?: string;
}): Promise<BookClubView> {
  const token = asInviteToken(input.token);
  if (!token) throw new Error("This invite would not come.");
  const club = await getClubByInvite(token);
  if (!club) throw new Error("This invite would not come.");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Pick a day and time.");
  const serial = serializeView(club.serializePlanId, club.startEpisode, club.sessions.length);
  const label = input.label?.trim() || serial.serializeLabel || "";
  const rpc = await getSupabase().rpc("add_club_sitting", {
    p_club: club.id,
    p_starts_at: startsAt.toISOString(),
    p_label: label,
  });
  if (!rpc.error && rpc.data && typeof rpc.data === "object") return toClub(rpc.data as ClubRecord);
  if (rpc.error && rpc.error.code !== "PGRST202") raise(rpc.error, SIGN_IN_ADD_SITTING);
  const nextId = club.sessions.reduce((max, session) => Math.max(max, session.id), 0) + 1;
  const sittings = [
    ...club.sessions,
    { id: nextId, startsAt: startsAt.toISOString(), label },
  ];
  const { data, error } = await getSupabase()
    .from("clubs")
    .update({ sittings })
    .eq("id", club.id)
    .select("*")
    .single();
  if (error) raise(error, SIGN_IN_ADD_SITTING);
  return toClub(data as ClubRecord);
}

const editInput = z.object({
  id: z.string().min(1).max(16),
  name: z.string().trim().min(1).max(80),
  note: z.string().max(240).optional(),
});

export async function updateClub(input: z.input<typeof editInput>): Promise<BookClubView> {
  const data = editInput.parse(input);
  const id = asClubId(data.id);
  if (!id) throw new Error("This club would not come.");
  await requireUserId(SIGN_IN_EDIT_CLUB);
  const { data: row, error } = await getSupabase()
    .from("clubs")
    .update({ name: data.name, note: data.note?.trim() ?? "" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "PGRST116" || error.code === "42501") {
      throw new Error("Only the host can edit this club.");
    }
    raise(error, SIGN_IN_EDIT_CLUB);
  }
  return toClub(row as ClubRecord);
}

export async function leaveClub(clubId: string): Promise<void> {
  const parsed = asClubId(clubId);
  if (!parsed) return;
  await requireUserId(SIGN_IN_LEAVE_CLUB);
  const { error } = await getSupabase().rpc("leave_club", { p_club: parsed });
  if (!error) return;
  if (error.code === "PGRST202") return;
  raise(error, SIGN_IN_LEAVE_CLUB);
}

export async function joinClubByInvite(token: string): Promise<BookClubView | null> {
  const parsed = asInviteToken(token);
  if (!parsed) return null;
  await requireUserId(SIGN_IN_JOIN_CLUB);
  const { data, error } = await getSupabase().rpc("join_club_by_invite", { p_token: parsed });
  if (error) raise(error, SIGN_IN_JOIN_CLUB);
  if (!data || typeof data !== "object") return null;
  return toClub(data as ClubRecord);
}

function toMessage(row: {
  id: number;
  club_id: string;
  user_id: string;
  body: string;
  created_at: string;
  handle?: string;
}): ClubMessage {
  return {
    id: Number(row.id),
    clubId: row.club_id,
    userId: row.user_id,
    handle: row.handle ?? "",
    body: row.body,
    createdAt: asIso(row.created_at),
  };
}

async function handlesFor(userIds: string[]): Promise<Map<string, { handle: string; name: string }>> {
  const ids = [...new Set(userIds.filter(Boolean))].slice(0, 40);
  const map = new Map<string, { handle: string; name: string }>();
  if (ids.length === 0) return map;
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, handle, display_name")
    .in("id", ids);
  if (error || !data) return map;
  for (const row of data) {
    const id = typeof row.id === "string" ? row.id : "";
    const handle = typeof row.handle === "string" ? row.handle : "";
    if (!id || !handle) continue;
    const name = typeof row.display_name === "string" ? row.display_name : "";
    map.set(id, { handle, name });
  }
  return map;
}

export async function listClubMessages(clubId: string): Promise<ClubMessage[]> {
  const parsed = asClubId(clubId);
  if (!parsed) return [];
  const { data, error } = await getSupabase()
    .from("club_messages")
    .select("id, club_id, user_id, body, created_at")
    .eq("club_id", parsed)
    .order("id", { ascending: true })
    .limit(80);
  if (error) {
    if (clubDirectoryMessage(error).includes(MIGRATION)) return [];
    raise(error);
  }
  const rows = (data ?? []).map((row) => toMessage(row));
  const names = await handlesFor(rows.map((row) => row.userId));
  return rows.map((row) => {
    const who = names.get(row.userId);
    return who ? { ...row, handle: who.handle } : row;
  });
}

export async function listClubRoster(clubId: string): Promise<ClubMemberView[]> {
  const parsed = asClubId(clubId);
  if (!parsed || isOffline()) return [];
  const members = await getSupabase()
    .from("club_members")
    .select("user_id, joined_at")
    .eq("club_id", parsed);
  if (members.error || !members.data) return [];
  const ids = members.data.map((row) => String(row.user_id ?? "")).filter(Boolean);
  const names = await handlesFor(ids);
  const progress = await getSupabase()
    .from("club_progress")
    .select("user_id, work_id, breath_index, place")
    .eq("club_id", parsed);
  const byUser = new Map<string, { workId: string; breathIndex: number; place: string }>();
  if (!progress.error) {
    for (const row of progress.data ?? []) {
      const id = String(row.user_id ?? "");
      if (!id) continue;
      byUser.set(id, {
        workId: typeof row.work_id === "string" ? row.work_id : "",
        breathIndex: Number(row.breath_index) || 0,
        place: typeof row.place === "string" ? row.place : "",
      });
    }
  }
  return members.data.map((row) => {
    const userId = String(row.user_id ?? "");
    const who = names.get(userId);
    const seat = byUser.get(userId);
    return {
      userId,
      handle: who?.handle ?? "",
      name: who?.name ?? "",
      joinedAt: asIso(String(row.joined_at ?? "")),
      breathIndex: seat ? seat.breathIndex : null,
      place: seat?.place ?? "",
      workId: seat?.workId ?? "",
    };
  });
}

export async function publishClubProgress(
  clubId: string,
  input: { workId: string; breathIndex: number; place: string },
): Promise<void> {
  const parsed = asClubId(clubId);
  if (!parsed || isOffline() || !input.workId) return;
  const userId = await hostedUserId();
  if (!userId) return;
  const { error } = await getSupabase().from("club_progress").upsert(
    {
      club_id: parsed,
      user_id: userId,
      work_id: input.workId,
      breath_index: Math.max(0, Math.min(999999, Math.floor(input.breathIndex))),
      place: input.place.slice(0, 80),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id,user_id" },
  );
  if (error && error.code !== "PGRST205" && error.code !== "42P01") return;
}

export async function postClubMessage(clubId: string, body: string): Promise<ClubMessage> {
  const parsed = asClubId(clubId);
  const text = body.trim().slice(0, 500);
  if (!parsed || !text) throw new Error("Write a line first.");
  const userId = await requireUserId(SIGN_IN_WRITE_CLUB);
  const { data, error } = await getSupabase()
    .from("club_messages")
    .insert({ club_id: parsed, user_id: userId, body: text })
    .select("id, club_id, user_id, body, created_at")
    .single();
  if (error) raise(error, SIGN_IN_WRITE_CLUB);
  return toMessage(data);
}

export function subscribeClubMessages(clubId: string, onInsert: (message: ClubMessage) => void) {
  const parsed = asClubId(clubId);
  if (!parsed) return () => undefined;
  let closed = false;
  const channel = getSupabase()
    .channel(`club-messages:${parsed}:${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "club_messages", filter: `club_id=eq.${parsed}` },
      (payload) => {
        if (closed) return;
        const row = payload.new as {
          id: number;
          club_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        if (!row?.body) return;
        const message = toMessage(row);
        void handlesFor([message.userId]).then((names) => {
          if (closed) return;
          const who = names.get(message.userId);
          onInsert(who ? { ...message, handle: who.handle } : message);
        });
      },
    )
    .subscribe();
  return () => {
    closed = true;
    void getSupabase().removeChannel(channel);
  };
}

export { mergeClubMessages };

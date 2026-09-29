import { z } from "zod";
import {
  serializeClubNight,
  serializeClubNightLine,
  serializePlan,
} from "@/lib/catalog/serialize";
import { shelfWork } from "@/lib/catalog/shelf";
import { fillOf, type Fill } from "@/lib/mondrian";
import { getSupabase } from "@/lib/supabase";
import { CLUBS } from "@/lib/social";
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
  body: string;
  createdAt: string;
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
    workId: row.work_id,
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

export function clubDirectoryMessage(error: unknown) {
  const row = error as { code?: string; message?: string } | null;
  const message = row?.message ?? (error instanceof Error ? error.message : String(error ?? ""));
  if (
    row?.code === "42P01" ||
    row?.code === "PGRST205" ||
    /schema cache|does not exist|relation .*clubs/i.test(message)
  ) {
    return `Book clubs are not on the directory yet. Apply ${MIGRATION}.`;
  }
  if (/sign in/i.test(message) || row?.code === "PGRST301") {
    return "Sign in to open a club.";
  }
  return message || "The club would not open.";
}

function raise(error: unknown): never {
  throw new Error(clubDirectoryMessage(error));
}

async function requireUserId() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) raise(error);
  const id = data.session?.user?.id;
  if (!id) throw new Error("Sign in to open a club.");
  return id;
}

export async function createClub(input: z.input<typeof createInput>): Promise<BookClubView> {
  const data = createInput.parse(input);
  const ownerId = await requireUserId();
  const plan = data.serializePlanId ? serializePlan(data.serializePlanId) : null;
  const serial = serializeView(plan?.id ?? null, data.startEpisode ?? null, 0);
  const label = serial.serializeLabel ?? "";
  let id = makeClubId();
  for (let attempt = 0; attempt < 4 && RESERVED.has(id); attempt += 1) id = makeClubId();
  const record: ClubRecord = {
    id,
    name: data.name,
    work_id: data.workId,
    owner_id: ownerId,
    invite_token: makeInviteToken(),
    fill: fillOf(data.workId),
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
  if (error) raise(error);
  return toClub(inserted as ClubRecord);
}

export async function listUpcomingSessions(): Promise<UpcomingSit[]> {
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
  if (Number.isNaN(startsAt.getTime())) throw new Error("Pick a day and time in Eastern time.");
  const nextId = club.sessions.reduce((max, session) => Math.max(max, session.id), 0) + 1;
  const serial = serializeView(club.serializePlanId, club.startEpisode, club.sessions.length);
  const sittings = [
    ...club.sessions,
    {
      id: nextId,
      startsAt: startsAt.toISOString(),
      label: input.label?.trim() || serial.serializeLabel || "",
    },
  ];
  const { data, error } = await getSupabase()
    .from("clubs")
    .update({ sittings })
    .eq("id", club.id)
    .select("*")
    .single();
  if (error) raise(error);
  return toClub(data as ClubRecord);
}

export async function joinClubByInvite(token: string): Promise<BookClubView | null> {
  const parsed = asInviteToken(token);
  if (!parsed) return null;
  await requireUserId();
  const { data, error } = await getSupabase().rpc("join_club_by_invite", { p_token: parsed });
  if (error) raise(error);
  if (!data || typeof data !== "object") return null;
  return toClub(data as ClubRecord);
}

function toMessage(row: {
  id: number;
  club_id: string;
  user_id: string;
  body: string;
  created_at: string;
}): ClubMessage {
  return {
    id: Number(row.id),
    clubId: row.club_id,
    userId: row.user_id,
    body: row.body,
    createdAt: asIso(row.created_at),
  };
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
  return (data ?? []).map((row) => toMessage(row));
}

export async function postClubMessage(clubId: string, body: string): Promise<ClubMessage> {
  const parsed = asClubId(clubId);
  const text = body.trim().slice(0, 500);
  if (!parsed || !text) throw new Error("Write a line first.");
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("club_messages")
    .insert({ club_id: parsed, user_id: userId, body: text })
    .select("id, club_id, user_id, body, created_at")
    .single();
  if (error) raise(error);
  return toMessage(data);
}

export function subscribeClubMessages(clubId: string, onInsert: (message: ClubMessage) => void) {
  const parsed = asClubId(clubId);
  if (!parsed) return () => undefined;
  const channel = getSupabase()
    .channel(`club-messages:${parsed}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "club_messages", filter: `club_id=eq.${parsed}` },
      (payload) => {
        const row = payload.new as {
          id: number;
          club_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        if (row?.body) onInsert(toMessage(row));
      },
    )
    .subscribe();
  return () => {
    void getSupabase().removeChannel(channel);
  };
}

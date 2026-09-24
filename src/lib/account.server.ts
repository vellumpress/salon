import { getSql, type Sql } from "@/lib/db";
import { shelfWork } from "@/lib/catalog/shelf";
import { asSittingMinutes } from "@/lib/sitting";

type Role = "reader" | "staff";
type Me = {
  name: string;
  role: Role;
  sittingMinutes: number;
  taste: string;
};

type FeaturedPin = { workId: string; sort: number; note: string };
type Notice = { id: number; title: string; body: string; createdAt: string };
type Person = { userId: string; name: string; role: Role };

type ProfileRow = {
  user_id: string;
  name: string;
  role: Role;
  sitting_minutes: number;
  taste: string;
};

function asSitting(value: number): number {
  return asSittingMinutes(value, 20);
}

function asRole(value: string): Role {
  return value === "staff" ? "staff" : "reader";
}

/** Real staff mailbox domain. Leave it; a rename would reject every staff account. */
function isStaffEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return false;
  return trimmed.slice(at) === "@vellum.press";
}

async function emailFor(sql: Sql, userId: string): Promise<string> {
  const rows = await sql<{ email: string }>`
    select email from "user" where id = ${userId}
  `;
  return rows[0]?.email ?? "";
}

async function loadProfile(sql: Sql, userId: string): Promise<ProfileRow | undefined> {
  const rows = await sql<ProfileRow>`
    select user_id, name, role, sitting_minutes, taste
    from profiles
    where user_id = ${userId}
  `;
  return rows[0];
}

async function ensureProfile(sql: Sql, userId: string, name = ""): Promise<ProfileRow> {
  const existing = await loadProfile(sql, userId);
  const trimmed = name.trim().slice(0, 80);
  if (existing) {
    if (trimmed && !existing.name) {
      await sql`update profiles set name = ${trimmed} where user_id = ${userId}`;
      return { ...existing, name: trimmed };
    }
    return existing;
  }
  await sql`
    insert into profiles (user_id, name, role)
    values (${userId}, ${trimmed}, 'reader')
    on conflict (user_id) do nothing
  `;
  const created = await loadProfile(sql, userId);
  if (!created) throw new Error("Could not open the profile");
  return created;
}

function toMe(row: ProfileRow): Me {
  return {
    name: row.name,
    role: asRole(row.role),
    sittingMinutes: asSitting(row.sitting_minutes),
    taste: row.taste ?? "",
  };
}

async function requireStaff(sql: Sql, userId: string): Promise<ProfileRow> {
  const row = await ensureProfile(sql, userId);
  if (asRole(row.role) !== "staff") {
    const err = new Error("Forbidden");
    err.name = "ForbiddenError";
    throw err;
  }
  return row;
}

export async function featuredRows(): Promise<FeaturedPin[]> {
  const sql = await getSql();
  const rows = await sql<{ work_id: string; sort: number; note: string }>`
    select work_id, sort, note from featured order by sort asc
  `;
  return rows.map((row) => ({
    workId: row.work_id,
    sort: row.sort,
    note: row.note,
  }));
}

export async function noticeRows(): Promise<Notice[]> {
  const sql = await getSql();
  const rows = await sql<{ id: number; title: string; body: string; created_at: string }>`
    select id, title, body, created_at::text as created_at
    from notices
    order by id desc
    limit 12
  `;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

async function peopleRows(sql: Sql): Promise<Person[]> {
  const rows = await sql<{ user_id: string; name: string; role: string }>`
    select user_id, name, role from profiles order by created_at asc
  `;
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    role: asRole(row.role),
  }));
}

export async function getMeHandler(userId: string, name: string): Promise<Me> {
  const sql = await getSql();
  const row = await ensureProfile(sql, userId, name);
  return toMe(row);
}

export async function saveSettingsHandler(
  userId: string,
  data: { name: string; sittingMinutes: number; taste: string },
): Promise<Me> {
  const sql = await getSql();
  await ensureProfile(sql, userId, data.name);
  await sql`
    update profiles
    set
      name = ${data.name.trim().slice(0, 80)},
      sitting_minutes = ${data.sittingMinutes},
      taste = ${data.taste.trim().slice(0, 400)}
    where user_id = ${userId}
  `;
  const row = await loadProfile(sql, userId);
  if (!row) throw new Error("Could not save");
  return toMe(row);
}

export async function pushReadingHandler(
  userId: string,
  entries: Array<{
    workId: string;
    breathIndex: number;
    kept: number;
    completed: boolean;
    lastOpenedAt: number;
  }>,
) {
  const sql = await getSql();
  await ensureProfile(sql, userId);
  for (const entry of entries) {
    if (!shelfWork(entry.workId)) continue;
    const opened = new Date(entry.lastOpenedAt || Date.now()).toISOString();
    await sql`
      insert into reading (user_id, work_id, breath_index, kept, completed, last_opened_at)
      values (
        ${userId},
        ${entry.workId},
        ${entry.breathIndex},
        ${entry.kept},
        ${entry.completed},
        ${opened}
      )
      on conflict (user_id, work_id) do update set
        breath_index = excluded.breath_index,
        kept = excluded.kept,
        completed = excluded.completed,
        last_opened_at = excluded.last_opened_at
    `;
  }
}

export async function loadDeskHandler(userId: string) {
  const sql = await getSql();
  const mine = await ensureProfile(sql, userId);
  const role = asRole(mine.role);
  if (role !== "staff") {
    return {
      ok: false as const,
      me: toMe({ ...mine, role }),
    };
  }
  const [featured, notices, people] = await Promise.all([
    featuredRows(),
    noticeRows(),
    peopleRows(sql),
  ]);
  return {
    ok: true as const,
    me: toMe({ ...mine, role }),
    featured,
    notices,
    people,
  };
}

export async function claimStaffHandler(userId: string): Promise<Me> {
  const sql = await getSql();
  const email = await emailFor(sql, userId);
  if (!isStaffEmail(email)) {
    throw new Error("Staff sit at vellum.press");
  }
  await ensureProfile(sql, userId);
  await sql`update profiles set role = 'staff' where user_id = ${userId}`;
  const row = await loadProfile(sql, userId);
  if (!row) throw new Error("Could not open the desk");
  return toMe({ ...row, role: "staff" });
}

export async function setFeaturedHandler(userId: string, rawIds: string[]): Promise<FeaturedPin[]> {
  const sql = await getSql();
  await requireStaff(sql, userId);
  const ids: string[] = [];
  for (const id of rawIds) {
    if (!shelfWork(id) || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= 12) break;
  }
  await sql`delete from featured`;
  for (let i = 0; i < ids.length; i += 1) {
    const workId = ids[i];
    if (!workId) continue;
    await sql`
      insert into featured (work_id, sort, note, updated_by)
      values (${workId}, ${i}, '', ${userId})
    `;
  }
  return featuredRows();
}

export async function addNoticeHandler(
  userId: string,
  data: { title: string; body: string },
): Promise<Notice[]> {
  const sql = await getSql();
  await requireStaff(sql, userId);
  await sql`
    insert into notices (title, body, author_id)
    values (${data.title.trim()}, ${data.body.trim()}, ${userId})
  `;
  return noticeRows();
}

export async function deleteNoticeHandler(userId: string, id: number): Promise<Notice[]> {
  const sql = await getSql();
  await requireStaff(sql, userId);
  await sql`delete from notices where id = ${id}`;
  return noticeRows();
}

export async function setRoleHandler(
  userId: string,
  data: { userId: string; role: Role },
): Promise<Person[]> {
  const sql = await getSql();
  await requireStaff(sql, userId);
  const target = await loadProfile(sql, data.userId);
  if (!target) throw new Error("No such reader");
  if (data.role === "staff") {
    const email = await emailFor(sql, data.userId);
    if (!isStaffEmail(email)) {
      throw new Error("Staff sit at vellum.press");
    }
  }
  if (asRole(target.role) === "staff" && data.role === "reader") {
    const count = await sql<{ n: number }>`
      select count(*)::int as n from profiles where role = 'staff'
    `;
    if ((count[0]?.n ?? 0) <= 1) {
      throw new Error("The last of the staff has to stay");
    }
  }
  await sql`update profiles set role = ${data.role} where user_id = ${data.userId}`;
  return peopleRows(sql);
}

export async function listFavoritesHandler(userId: string): Promise<string[]> {
  const sql = await getSql();
  await ensureProfile(sql, userId);
  const rows = await sql<{ work_id: string }>`
    select work_id from favorites
    where user_id = ${userId}
    order by created_at desc
  `;
  return rows.map((row) => row.work_id).filter((id) => Boolean(shelfWork(id)));
}

export async function pushFavoritesHandler(userId: string, workIds: string[]) {
  const sql = await getSql();
  await ensureProfile(sql, userId);
  const clean: string[] = [];
  for (const id of workIds) {
    if (!shelfWork(id) || clean.includes(id)) continue;
    clean.push(id);
    if (clean.length >= 200) break;
  }
  await sql`delete from favorites where user_id = ${userId}`;
  for (const workId of clean) {
    await sql`
      insert into favorites (user_id, work_id)
      values (${userId}, ${workId})
      on conflict (user_id, work_id) do nothing
    `;
  }
}

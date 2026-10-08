/**
 * Three phones for clubs, two for a live sit.
 * Supabase is mocked in-process (no Docker in this environment).
 * Live sitting uses the dev-only loopback mirror.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import test from "node:test";
import { chromium, devices, type Browser, type BrowserContext, type Page, type Route } from "playwright";

import {
  canDirectUpdateClub,
  canInsertClubMessage,
  canReadClubMessages,
  canReadClubRow,
  canReadProgress,
  canWriteProgress,
  type ClubActor,
} from "./club-flow.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const APP = `${ORIGIN}/salon`;
const PHONE = devices["iPhone 12"];
const CHROME = "/opt/google/chrome/chrome";
const RUNS = Number(process.env.SOCIAL_RUNS ?? 5) || 5;

type ClubRow = {
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
  sittings: unknown;
  members: Set<string>;
};

type MessageRow = {
  id: number;
  club_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ProgressRow = {
  club_id: string;
  user_id: string;
  work_id: string;
  breath_index: number;
  place: string;
  updated_at: string;
};

type Profile = { id: string; handle: string; name: string };

const clubs = new Map<string, ClubRow>();
const messages: MessageRow[] = [];
const progress: ProgressRow[] = [];
const profiles = new Map<string, Profile>();
let messageSeq = 1;

function resetDirectory() {
  clubs.clear();
  messages.length = 0;
  progress.length = 0;
  profiles.clear();
  messageSeq = 1;
}

function actor(userId: string | null, club: ClubRow | undefined): ClubActor | null {
  if (!userId || !club) return null;
  return { userId, ownerId: club.owner_id, member: club.members.has(userId) };
}

function userFrom(request: { headers: () => Record<string, string> }) {
  const headers = request.headers();
  const auth = headers.authorization || headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token.startsWith("access.")) return null;
  const id = token.slice("access.".length);
  return profiles.has(id) ? id : null;
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(chunk as Buffer));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sessionFor(user: Profile) {
  return {
    access_token: `access.${user.id}`,
    refresh_token: `refresh.${user.id}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    expires_in: 86400,
    token_type: "bearer",
    user: {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: `${user.handle}@example.com`,
    },
  };
}

async function fulfill(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  const userId = userFrom(request);
  const accept = request.headers().accept ?? "";
  const asObject = accept.includes("vnd.pgrst.object");

  if (url.pathname.startsWith("/auth/v1/")) {
    const token = (request.headers().authorization ?? "").replace(/^Bearer\s+/i, "");
    const id = token.startsWith("access.") ? token.slice(7) : "";
    const profile = profiles.get(id);
    if (!profile && url.pathname.endsWith("/user")) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "no session" }) });
      return;
    }
    if (profile) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.pathname.endsWith("/user") ? sessionFor(profile).user : sessionFor(profile)),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
    return;
  }

  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, body: "" });
    return;
  }

  const json = async (status: number, body: unknown) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  };

  if (url.pathname === "/rest/v1/rpc/club_by_invite" && request.method() === "POST") {
    const payload = request.postDataJSON() as { p_token?: string };
    const club = [...clubs.values()].find((row) => row.invite_token === payload.p_token);
    await json(200, club ? publicClub(club) : null);
    return;
  }

  if (url.pathname === "/rest/v1/rpc/join_club_by_invite" && request.method() === "POST") {
    if (!userId) {
      await json(400, { code: "P0001", message: "Sign in to join a club" });
      return;
    }
    const payload = request.postDataJSON() as { p_token?: string };
    const club = [...clubs.values()].find((row) => row.invite_token === payload.p_token);
    if (!club) {
      await json(200, null);
      return;
    }
    club.members.add(userId);
    await json(200, publicClub(club));
    return;
  }

  if (url.pathname === "/rest/v1/rpc/leave_club" && request.method() === "POST") {
    if (!userId) {
      await json(400, { code: "P0001", message: "Sign in to leave a club" });
      return;
    }
    const payload = request.postDataJSON() as { p_club?: string };
    const club = clubs.get(payload.p_club ?? "");
    const who = actor(userId, club);
    if (!club || !canReadClubRow(who) || !who?.member) {
      await json(200, null);
      return;
    }
    club.members.delete(userId);
    await json(200, null);
    return;
  }

  if (url.pathname === "/rest/v1/rpc/add_club_sitting" && request.method() === "POST") {
    const payload = request.postDataJSON() as { p_club?: string; p_starts_at?: string; p_label?: string };
    const club = clubs.get(payload.p_club ?? "");
    const who = actor(userId, club);
    if (!club || !who || !(who.member || who.userId === who.ownerId)) {
      await json(400, { code: "P0001", message: "Join the club first" });
      return;
    }
    const sittings = Array.isArray(club.sittings) ? [...club.sittings] : [];
    const nextId = sittings.reduce((max, row) => Math.max(max, Number((row as { id?: number }).id) || 0), 0) + 1;
    sittings.push({ id: nextId, startsAt: payload.p_starts_at, label: payload.p_label ?? "" });
    club.sittings = sittings;
    await json(200, publicClub(club));
    return;
  }

  if (url.pathname === "/rest/v1/clubs") {
    if (request.method() === "POST") {
      if (!userId) {
        await json(401, { code: "PGRST301", message: "Sign in to open a club." });
        return;
      }
      const row = request.postDataJSON() as ClubRow;
      if (row.owner_id !== userId) {
        await json(403, { code: "42501", message: "not owner" });
        return;
      }
      const stored: ClubRow = { ...row, members: new Set([userId]) };
      clubs.set(stored.id, stored);
      await json(201, publicClub(stored));
      return;
    }
    const visible = [...clubs.values()].filter((club) => canReadClubRow(actor(userId, club)));
    const idEq = url.searchParams.get("id") ?? "";
    if (idEq.startsWith("eq.")) {
      const club = visible.find((row) => row.id === idEq.slice(3)) ?? null;
      if (asObject) {
        if (!club) {
          await json(406, { code: "PGRST116", message: "No rows" });
          return;
        }
        await json(200, publicClub(club));
        return;
      }
      await json(200, club ? [publicClub(club)] : []);
      return;
    }
    if (idEq.startsWith("in.")) {
      const ids = new Set(idEq.slice(3).replace(/[()]/g, "").split(",").filter(Boolean));
      await json(200, visible.filter((row) => ids.has(row.id)).map(publicClub));
      return;
    }
    await json(200, visible.map(publicClub));
    return;
  }

  if (url.pathname === "/rest/v1/club_members") {
    const clubId = (url.searchParams.get("club_id") ?? "").replace(/^eq\./, "");
    const club = clubs.get(clubId);
    if (!canReadClubRow(actor(userId, club)) || !club) {
      await json(200, []);
      return;
    }
    await json(
      200,
      [...club.members].map((id) => ({ user_id: id, joined_at: new Date().toISOString() })),
    );
    return;
  }

  if (url.pathname === "/rest/v1/club_messages") {
    const clubId = (url.searchParams.get("club_id") ?? "").replace(/^eq\./, "");
    const club = clubs.get(clubId);
    const who = actor(userId, club);
    if (request.method() === "POST") {
      const row = request.postDataJSON() as { club_id?: string; user_id?: string; body?: string };
      const target = clubs.get(row.club_id ?? "");
      if (!canInsertClubMessage(actor(userId, target), row.user_id ?? "")) {
        await json(403, { code: "42501", message: "not a member" });
        return;
      }
      const saved: MessageRow = {
        id: messageSeq,
        club_id: row.club_id ?? "",
        user_id: row.user_id ?? "",
        body: row.body ?? "",
        created_at: new Date().toISOString(),
      };
      messageSeq += 1;
      messages.push(saved);
      await json(201, saved);
      return;
    }
    if (!canReadClubMessages(who)) {
      await json(200, []);
      return;
    }
    await json(
      200,
      messages.filter((row) => row.club_id === clubId),
    );
    return;
  }

  if (url.pathname === "/rest/v1/profiles") {
    const idParam = url.searchParams.get("id") ?? "";
    const handleParam = url.searchParams.get("handle") ?? "";
    let rows = [...profiles.values()];
    if (idParam.startsWith("in.")) {
      const ids = new Set(idParam.slice(3).replace(/[()]/g, "").split(",").filter(Boolean));
      rows = rows.filter((row) => ids.has(row.id));
    } else if (idParam.startsWith("eq.")) {
      rows = rows.filter((row) => row.id === idParam.slice(3));
    }
    if (handleParam.startsWith("eq.")) rows = rows.filter((row) => row.handle === handleParam.slice(3));
    if (handleParam.startsWith("ilike.")) {
      const prefix = handleParam.slice(6).replace(/%$/, "").replace(/\\/g, "");
      rows = rows.filter((row) => row.handle.startsWith(prefix));
    }
    await json(
      200,
      rows.map((row) => ({ id: row.id, handle: row.handle, display_name: row.name, bio: "" })),
    );
    return;
  }

  if (url.pathname === "/rest/v1/club_progress") {
    if (request.method() === "POST" || request.method() === "PATCH") {
      const row = request.postDataJSON() as ProgressRow;
      const club = clubs.get(row.club_id);
      if (!canWriteProgress(actor(userId, club), row.user_id)) {
        await json(403, { code: "42501", message: "not your progress" });
        return;
      }
      const index = progress.findIndex((item) => item.club_id === row.club_id && item.user_id === row.user_id);
      if (index >= 0) progress[index] = row;
      else progress.push(row);
      await json(201, row);
      return;
    }
    const clubId = (url.searchParams.get("club_id") ?? "").replace(/^eq\./, "");
    const club = clubs.get(clubId);
    if (!canReadProgress(actor(userId, club))) {
      await json(200, []);
      return;
    }
    await json(200, progress.filter((row) => row.club_id === clubId));
    return;
  }

  await json(404, { code: "PGRST204", message: url.pathname });
}

function publicClub(club: ClubRow) {
  const { members: _members, ...rest } = club;
  return rest;
}

function strangerCannotWrite(clubId: string, strangerId: string) {
  const club = clubs.get(clubId);
  assert.equal(canReadClubMessages(actor(strangerId, club)), false);
  assert.equal(canInsertClubMessage(actor(strangerId, club), strangerId), false);
  assert.equal(canDirectUpdateClub(actor(strangerId, club)), false);
  assert.equal(canWriteProgress(actor(strangerId, club), strangerId), false);
  const memberId = [...(club?.members ?? [])].find((id) => id !== club?.owner_id);
  if (memberId && club) {
    assert.equal(canDirectUpdateClub(actor(memberId, club)), false);
    assert.equal(canInsertClubMessage(actor(memberId, club), club.owner_id), false);
    assert.equal(canReadClubMessages(actor(memberId, club)), true);
  }
}

type Seat = { id: string; name: string; breath: number; place: string; workId: string; seen: number };
type SitEvent = { id: number; from: string; to: string | null; data: unknown };
type SitRoom = { seats: Map<string, Seat>; events: SitEvent[]; seq: number };

function startMirror() {
  const rooms = new Map<string, SitRoom>();
  const server = createServer(async (req, res) => {
    try {
      await handleMirror(rooms, req, res);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

async function handleMirror(rooms: Map<string, SitRoom>, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  res.setHeader("access-control-allow-origin", "http://127.0.0.1:8080");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname !== "/sit") {
    res.writeHead(404);
    res.end();
    return;
  }
  if (req.method === "POST") {
    const payload = JSON.parse(await readBody(req)) as {
      room?: string;
      selfId?: string;
      op?: string;
      to?: string | null;
      data?: unknown;
      presence?: { name?: string; breath?: number; place?: string; workId?: string };
    };
    const room: SitRoom = rooms.get(payload.room ?? "") ?? { seats: new Map(), events: [], seq: 0 };
    rooms.set(payload.room ?? "", room);
    const selfId = payload.selfId ?? "";
    if (payload.op === "bye") room.seats.delete(selfId);
    if (payload.op === "track" && selfId) {
      room.seats.set(selfId, {
        id: selfId,
        name: payload.presence?.name ?? "",
        breath: Number(payload.presence?.breath) || 0,
        place: payload.presence?.place ?? "",
        workId: payload.presence?.workId ?? "",
        seen: Date.now(),
      });
    }
    if (payload.op === "msg" && selfId) {
      room.seq += 1;
      room.events.push({ id: room.seq, from: selfId, to: payload.to ?? null, data: payload.data });
      if (room.events.length > 80) room.events.splice(0, room.events.length - 80);
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
    return;
  }
  const roomName = url.searchParams.get("room") ?? "";
  const selfId = url.searchParams.get("self") ?? "";
  const cursor = Number(url.searchParams.get("cursor") ?? "0") || 0;
  const room = rooms.get(roomName) ?? { seats: new Map(), events: [], seq: 0 };
  const seat = room.seats.get(selfId);
  if (seat) seat.seen = Date.now();
  const now = Date.now();
  const presence = [...room.seats.values()].filter((item) => now - item.seen < 1600);
  for (const item of [...room.seats.keys()]) {
    const row = room.seats.get(item);
    if (row && now - row.seen >= 1600) room.seats.delete(item);
  }
  const fresh = room.events.filter((event) => event.id > cursor && event.from !== selfId && (!event.to || event.to === selfId));
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ cursor: room.seq, presence, messages: fresh }));
}

async function ensureDev(): Promise<ChildProcess | null> {
  if (await devUp()) return null;
  const child = spawn("npm", ["run", "dev"], {
    cwd: "/workspace",
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 90; i += 1) {
    if (await devUp()) return child;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The reading app did not come up");
}

async function devUp() {
  try {
    const response = await fetch(`${APP}/`);
    return response.ok;
  } catch {
    return false;
  }
}

async function signIn(context: BrowserContext, user: Profile, mirror?: string) {
  await context.addInitScript(
    ({ stored, key, mirrorUrl }) => {
      window.localStorage.setItem(key, JSON.stringify(stored));
      if (mirrorUrl) (window as unknown as { __TBR_SIT_MIRROR?: string }).__TBR_SIT_MIRROR = mirrorUrl;
    },
    { stored: sessionFor(user), key: "tbr-supabase-auth", mirrorUrl: mirror ?? "" },
  );
  await context.route(/supabase\.co/, (route) => fulfill(route));
  await context.route(/supabase\.co\/realtime/, (route) => route.abort());
}

function user(n: number, role: "a" | "b" | "c"): Profile {
  const handle = `${role}${n}reader`.slice(0, 20);
  const id = `00000000-0000-4000-8000-${String(n).padStart(8, "0")}${role === "a" ? "01" : role === "b" ? "02" : "03"}`;
  const profile = { id, handle, name: handle };
  profiles.set(id, profile);
  return profile;
}

async function clubRun(browser: Browser, run: number) {
  resetDirectory();
  const ada = user(run, "a");
  const bea = user(run, "b");
  const cy = user(run, "c");
  const a = await browser.newContext({ ...PHONE });
  const b = await browser.newContext({ ...PHONE });
  const c = await browser.newContext({ ...PHONE });
  try {
    await signIn(a, ada);
    await signIn(b, bea);
    await signIn(c, cy);
    const pageA = await a.newPage();
    const name = `Sunday ${run}`;
    await pageA.goto(`${APP}/together?start=1`, { waitUntil: "domcontentloaded" });
    await pageA.getByPlaceholder("Sunday readers").fill(name);
    await pageA.getByRole("button", { name: "Create club" }).click();
    const invite = pageA.getByText(/\/club\/invite\//).first();
    await invite.waitFor({ timeout: 20000 });
    const token = ((await invite.textContent()) ?? "").match(/invite\/([A-Za-z0-9_-]+)/)?.[1] ?? "";
    const club = [...clubs.values()].find((row) => row.invite_token === token);
    assert.ok(club, `run ${run} stored the club`);
    assert.ok(club.members.has(ada.id));

    const pageB = await b.newPage();
    await pageB.goto(`${APP}/club/invite/${token}`, { waitUntil: "domcontentloaded" });
    await pageB.getByText(name).first().waitFor({ timeout: 20000 });
    await pageB.getByRole("link", { name: "The club" }).click();
    await pageB.getByPlaceholder("A line for the club").fill(`hello from ${run}`);
    await pageB.getByRole("button", { name: "Send" }).click();
    await pageB.getByText(`hello from ${run}`).waitFor({ timeout: 10000 });

    const pageAClub = await a.newPage();
    await pageAClub.goto(`${APP}/club/${club.id}`, { waitUntil: "domcontentloaded" });
    await pageAClub.getByText(`hello from ${run}`).waitFor({ timeout: 20000 });
    await pageAClub.getByText(`@${bea.handle}`).first().waitFor({ timeout: 10000 });

    await pageB.getByRole("button", { name: "Leave" }).click();
    await pageB.getByRole("button", { name: "Join" }).waitFor({ timeout: 10000 });
    await pageB.reload({ waitUntil: "domcontentloaded" });
    await pageB.getByRole("button", { name: "Join" }).waitFor({ timeout: 15000 });
    assert.equal(club.members.has(bea.id), false);
    assert.equal(messages.some((row) => row.body === `hello from ${run}` && row.user_id === bea.id), true);

    const pageC = await c.newPage();
    await pageC.goto(`${APP}/club/${club.id}`, { waitUntil: "domcontentloaded" });
    await pageC.getByText("This club would not come").waitFor({ timeout: 15000 });
    strangerCannotWrite(club.id, cy.id);

    const signedOut = await browser.newContext({ ...PHONE });
    await signedOut.route(/supabase\.co/, (route) => fulfill(route));
    const pageOut = await signedOut.newPage();
    await pageOut.goto(`${APP}/club/invite/${token}`, { waitUntil: "domcontentloaded" });
    await pageOut.getByRole("link", { name: /Sign in to join/ }).click();
    await pageOut.waitForURL(/\/login/, { timeout: 15000 });
    const next = new URL(pageOut.url()).searchParams.get("next") ?? "";
    assert.match(next, new RegExp(`/club/invite/${token}`));
    await signedOut.close();
  } finally {
    await a.close();
    await b.close();
    await c.close();
  }
}

async function friendRun(browser: Browser, mirror: string, run: number) {
  const pair = `p${run}xyza`.slice(0, 8);
  const line = `page ${run} hello`;
  const a = await browser.newContext({ ...PHONE });
  const b = await browser.newContext({ ...PHONE });
  try {
    await a.addInitScript((url) => {
      (window as unknown as { __TBR_SIT_MIRROR?: string }).__TBR_SIT_MIRROR = url;
    }, mirror);
    await b.addInitScript((url) => {
      (window as unknown as { __TBR_SIT_MIRROR?: string }).__TBR_SIT_MIRROR = url;
    }, mirror);
    await a.route(/supabase\.co/, (route) => route.abort());
    await b.route(/supabase\.co/, (route) => route.abort());
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    const read = `${APP}/read/passing?shuffle=1&sit=20&pair=${pair}`;
    await Promise.all([
      pageA.goto(read, { waitUntil: "domcontentloaded" }),
      pageB.goto(read, { waitUntil: "domcontentloaded" }),
    ]);
    await pageA.locator(".chat-field").waitFor({ timeout: 30000 });
    await pageB.locator(".chat-field").waitFor({ timeout: 30000 });
    await pageA.locator(".chat-field").fill(line);
    await pageA.locator(".chat-send").click();
    await pageB.locator(".chat-line", { hasText: line }).waitFor({ timeout: 10000 });
    await pageB.getByRole("button", { name: "yes" }).click();
    await pageA.locator(".chat-line", { hasText: "yes" }).waitFor({ timeout: 10000 });

    await pageA.context().setOffline(true);
    await pageA.locator('[data-sit-status="offline"]').waitFor({ timeout: 10000 });
    await pageB.locator('[data-sit-status="waiting"]').waitFor({ timeout: 10000 });
    await pageA.context().setOffline(false);
    await pageA.reload({ waitUntil: "domcontentloaded" });
    await pageA.getByText(line).waitFor({ timeout: 20000 });

    await pageA.goto(`${APP}/read/gold?shuffle=1&sit=20&pair=${pair}`, { waitUntil: "domcontentloaded" });
    await pageB.getByText("on another book").waitFor({ timeout: 15000 });
  } finally {
    await a.close();
    await b.close();
  }
}

test("book clubs across three phones", { timeout: 300000 }, async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results: { run: number; ok: boolean; error?: string }[] = [];
  try {
    await ensureDev();
    for (let run = 1; run <= RUNS; run += 1) {
      try {
        await clubRun(browser, run);
        results.push({ run, ok: true });
      } catch (error) {
        results.push({ run, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ flow: "clubs", results }));
  assert.deepEqual(
    results.map((row) => row.ok),
    Array.from({ length: RUNS }, () => true),
    JSON.stringify(results),
  );
});

test("live reading across two phones", { timeout: 300000 }, async () => {
  const mirror = await startMirror();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results: { run: number; ok: boolean; error?: string }[] = [];
  try {
    await ensureDev();
    for (let run = 1; run <= RUNS; run += 1) {
      try {
        await friendRun(browser, mirror.url, run);
        results.push({ run, ok: true });
      } catch (error) {
        results.push({ run, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    await browser.close();
    await mirror.close();
  }
  console.log(JSON.stringify({ flow: "friends", results }));
  assert.deepEqual(
    results.map((row) => row.ok),
    Array.from({ length: RUNS }, () => true),
    JSON.stringify(results),
  );
});

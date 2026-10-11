/**
 * Friend's phone already has a book. It publishes that book without opening it.
 * Mike follows. The access rule hides the row from a stranger and shows it on
 * Mike's Friends page. A followed person with no rows gets the empty sentence.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, devices, type BrowserContext, type Route } from "playwright";

import { canReadActivity, canWriteActivity, canWriteFollow, type FollowEdge } from "./friend-access.ts";
import { lastReadCue } from "./continuity.ts";
import { shelfWork } from "./catalog/shelf.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const APP = `${ORIGIN}/salon`;
const PHONE = devices["iPhone 12"];
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CHROME = ["/opt/google/chrome/chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const KEPT = "A line kept on the phone already.";

type Profile = { id: string; handle: string; name: string };
type ActivityRow = {
  id: number;
  user_id: string;
  kind: string;
  book_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

const profiles = new Map<string, Profile>();
const follows: FollowEdge[] = [];
const activity: ActivityRow[] = [];
let activitySeq = 1;

function reset() {
  profiles.clear();
  follows.length = 0;
  activity.length = 0;
  activitySeq = 1;
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

function userFrom(request: { headers: () => Record<string, string> }) {
  const headers = request.headers();
  const auth = headers.authorization || headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token.startsWith("access.")) return null;
  const id = token.slice("access.".length);
  return profiles.has(id) ? id : null;
}

function listArg(value: string) {
  const inner = value.replace(/^in\.\(?/, "").replace(/\)?$/, "");
  return inner
    .split(",")
    .map((part) => part.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

async function fulfill(route: Route) {
  const request = route.request();
  const url = new URL(request.url());
  const userId = userFrom(request);

  if (url.pathname.startsWith("/auth/v1/")) {
    if (request.method() === "POST" && url.pathname.endsWith("/token")) {
      let body: { email?: string; password?: string; refresh_token?: string; grant_type?: string } = {};
      try {
        body = (request.postDataJSON() ?? {}) as typeof body;
      } catch {
        body = {};
      }
      const grant = url.searchParams.get("grant_type") || body.grant_type || "";
      if (grant === "password") {
        const email = (body.email ?? "").trim().toLowerCase();
        const profile = [...profiles.values()].find((item) => `${item.handle}@example.com` === email);
        if (!profile || body.password !== "sitquietly") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              code: "invalid_credentials",
              error_description: "Invalid login credentials",
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(sessionFor(profile)),
        });
        return;
      }
      if (grant === "refresh_token") {
        const refresh = body.refresh_token ?? "";
        const id = refresh.startsWith("refresh.") ? refresh.slice("refresh.".length) : "";
        const profile = profiles.get(id);
        if (!profile) {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ code: "invalid_credentials" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(sessionFor(profile)),
        });
        return;
      }
    }
    const token = (request.headers().authorization ?? "").replace(/^Bearer\s+/i, "");
    const id = token.startsWith("access.") ? token.slice(7) : "";
    const profile = profiles.get(id);
    if (!profile && url.pathname.endsWith("/user")) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "no session" }) });
      return;
    }
    if (profile) {
      const session = sessionFor(profile);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.pathname.endsWith("/user") ? session.user : session),
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
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  };

  if (url.pathname === "/rest/v1/profiles") {
    if (request.method() === "POST") {
      const row = request.postDataJSON() as { id?: string; handle?: string; display_name?: string | null };
      if (!userId || row.id !== userId) {
        await json(403, { code: "42501", message: "not your profile" });
        return;
      }
      const handle = (row.handle ?? "").trim().toLowerCase();
      if ([...profiles.values()].some((item) => item.handle === handle && item.id !== userId)) {
        await json(409, { code: "23505", message: "handle taken" });
        return;
      }
      const profile = { id: userId, handle, name: (row.display_name ?? "").trim() };
      profiles.set(userId, profile);
      await json(201, [{ id: profile.id, handle: profile.handle, display_name: profile.name, bio: "" }]);
      return;
    }
    let rows = [...profiles.values()];
    const idParam = url.searchParams.get("id") ?? "";
    const handleParam = url.searchParams.get("handle") ?? "";
    if (idParam.startsWith("eq.")) rows = rows.filter((row) => row.id === idParam.slice(3));
    if (idParam.startsWith("in.")) {
      const ids = new Set(listArg(idParam));
      rows = rows.filter((row) => ids.has(row.id));
    }
    if (handleParam.startsWith("eq.")) rows = rows.filter((row) => row.handle === handleParam.slice(3));
    if (handleParam.startsWith("in.")) {
      const handles = new Set(listArg(handleParam));
      rows = rows.filter((row) => handles.has(row.handle));
    }
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

  if (url.pathname === "/rest/v1/follows") {
    if (request.method() === "POST") {
      const row = request.postDataJSON() as { follower_id?: string; followee_id?: string };
      if (!canWriteFollow(userId, row.follower_id ?? "")) {
        await json(403, { code: "42501", message: "not yourself" });
        return;
      }
      const edge = { followerId: row.follower_id ?? "", followeeId: row.followee_id ?? "" };
      if (follows.some((item) => item.followerId === edge.followerId && item.followeeId === edge.followeeId)) {
        await json(409, { code: "23505", message: "duplicate" });
        return;
      }
      follows.push(edge);
      await json(201, [{ follower_id: edge.followerId, followee_id: edge.followeeId }]);
      return;
    }
    if (request.method() === "DELETE") {
      const follower = (url.searchParams.get("follower_id") ?? "").replace(/^eq\./, "");
      const followee = (url.searchParams.get("followee_id") ?? "").replace(/^eq\./, "");
      if (!canWriteFollow(userId, follower)) {
        await json(403, { code: "42501", message: "not yourself" });
        return;
      }
      for (let i = follows.length - 1; i >= 0; i -= 1) {
        const row = follows[i]!;
        if (row.followerId === follower && row.followeeId === followee) follows.splice(i, 1);
      }
      await json(200, []);
      return;
    }
    const follower = (url.searchParams.get("follower_id") ?? "").replace(/^eq\./, "");
    await json(
      200,
      follows
        .filter((row) => !follower || row.followerId === follower)
        .map((row) => ({ follower_id: row.followerId, followee_id: row.followeeId })),
    );
    return;
  }

  if (url.pathname === "/rest/v1/activity") {
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as ActivityRow | ActivityRow[];
      const rows = Array.isArray(payload) ? payload : [payload];
      if (rows.some((row) => !canWriteActivity(userId, row.user_id))) {
        await json(403, { code: "42501", message: "not your activity" });
        return;
      }
      const saved = rows.map((row) => {
        const next: ActivityRow = {
          id: activitySeq,
          user_id: row.user_id,
          kind: row.kind,
          book_id: row.book_id ?? null,
          payload: row.payload ?? {},
          created_at: row.created_at || new Date().toISOString(),
        };
        activitySeq += 1;
        activity.push(next);
        return next;
      });
      await json(201, saved);
      return;
    }
    let rows = activity.filter((row) => canReadActivity(userId, row.user_id, follows));
    const userParam = url.searchParams.get("user_id") ?? "";
    if (userParam.startsWith("in.")) {
      const ids = new Set(listArg(userParam));
      rows = rows.filter((row) => ids.has(row.user_id));
    } else if (userParam.startsWith("eq.")) {
      rows = rows.filter((row) => row.user_id === userParam.slice(3));
    }
    const kind = url.searchParams.get("kind") ?? "";
    if (kind.startsWith("in.")) {
      const kinds = new Set(listArg(kind));
      rows = rows.filter((row) => kinds.has(row.kind));
    } else if (kind.startsWith("not.in.")) {
      const kinds = new Set(listArg(kind.slice("not.".length)));
      rows = rows.filter((row) => !kinds.has(row.kind));
    } else if (kind.startsWith("eq.")) {
      rows = rows.filter((row) => row.kind === kind.slice(3));
    }
    rows = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    await json(200, rows);
    return;
  }

  await json(404, { code: "PGRST204", message: url.pathname });
}

function seat(id: string, handle: string): Profile {
  const profile = { id, handle, name: handle };
  profiles.set(id, profile);
  return profile;
}

async function signIn(context: BrowserContext, user: Profile, store: Record<string, unknown>) {
  await context.addInitScript(
    ({ stored, authKey, storeKey, storeValue }) => {
      window.localStorage.setItem(authKey, JSON.stringify(stored));
      window.localStorage.setItem(storeKey, JSON.stringify(storeValue));
    },
    {
      stored: sessionFor(user),
      authKey: "tbr-supabase-auth",
      storeKey: "vellum-v1",
      storeValue: { state: store, version: 2 },
    },
  );
  context.setDefaultTimeout(30_000);
  context.setDefaultNavigationTimeout(30_000);
  await context.route(/supabase\.co/, (route) => fulfill(route));
  await context.route(/supabase\.co\/realtime/, (route) => route.abort());
}

async function devUp() {
  try {
    const response = await fetch(`${APP}/`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureDev(): Promise<ChildProcess | null> {
  if (await devUp()) return null;
  const child = spawn("npm", ["run", "dev"], { cwd: repoRoot, stdio: "ignore", detached: true });
  child.unref();
  for (let i = 0; i < 90; i += 1) {
    if (await devUp()) return child;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The reading app did not come up");
}

async function launchBrowser() {
  for (const executablePath of CHROME) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch {
      /* next */
    }
  }
  return chromium.launch({ headless: true });
}

async function waitFor(label: string, check: () => boolean) {
  const start = Date.now();
  while (Date.now() - start < 20_000) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(label);
}

test("a friend's existing book reaches Mike, and an empty friend stays empty", { timeout: 120_000 }, async () => {
  reset();
  const bea = seat("00000000-0000-4000-8000-0000000000b1", "beareader");
  const mike = seat("00000000-0000-4000-8000-0000000000c1", "mikereader");
  const cy = seat("00000000-0000-4000-8000-0000000000d1", "cyreader");
  const stranger = seat("00000000-0000-4000-8000-0000000000e1", "noreader");
  const opened = Date.now() - 24 * 60 * 60 * 1000;
  const cue = lastReadCue(18, shelfWork("passing")?.breaths);

  await ensureDev();
  const browser = await launchBrowser();
  const friend = await browser.newContext({ ...PHONE });
  const mine = await browser.newContext({ ...PHONE });
  const other = await browser.newContext({ ...PHONE });
  try {
    await signIn(friend, bea, {
      handle: "beareader",
      progress: {
        passing: {
          breathIndex: 18,
          lastOpenedAt: opened,
          sittingStartedAt: null,
          keywords: {},
          kept: [
            {
              v: 1,
              id: "s0-18",
              text: KEPT,
              workId: "passing",
              title: "Passing",
              author: "Nella Larsen",
              savedAt: opened,
            },
          ],
          completedAt: null,
          entered: true,
        },
      },
      following: [],
      contacts: [],
    });
    await signIn(mine, mike, { handle: "mikereader", progress: {}, following: [], contacts: [] });
    await signIn(other, stranger, { handle: "noreader", progress: {}, following: [], contacts: [] });

    const friendPage = await friend.newPage();
    await friendPage.goto(`${APP}/friends`, { waitUntil: "domcontentloaded" });
    assert.equal(friendPage.url().includes("/read/"), false);
    await waitFor("friend phone did not publish the book it already had", () =>
      activity.some((row) => row.user_id === bea.id && row.kind === "reading" && row.book_id === "passing"),
    );
    assert.equal(
      activity.some((row) => row.user_id === bea.id && row.kind === "kept" && row.payload.line === KEPT),
      true,
    );
    assert.equal(canReadActivity(null, bea.id, follows), true);
    assert.equal(canReadActivity(stranger.id, bea.id, follows), true);

    const mikePage = await mine.newPage();
    await mikePage.goto(`${APP}/friends`, { waitUntil: "domcontentloaded" });
    await mikePage.getByPlaceholder("Find @handle").fill("beareader");
    await mikePage
      .locator("section")
      .filter({ has: mikePage.getByPlaceholder("Find @handle") })
      .getByRole("button", { name: "Follow", exact: true })
      .click();
    await waitFor("Mike's follow did not land", () =>
      follows.some((row) => row.followerId === mike.id && row.followeeId === bea.id),
    );
    assert.equal(canReadActivity(mike.id, bea.id, follows), true);
    assert.equal(canReadActivity(null, bea.id, []), true);

    const card = mikePage.locator("article", { hasText: "@beareader" });
    await card.getByText("Passing").waitFor({ timeout: 20000 });
    await card.getByText(cue).waitFor({ timeout: 10000 });
    await card.getByText(KEPT).waitFor({ timeout: 10000 });

    await mikePage.getByPlaceholder("Find @handle").fill("cyreader");
    await mikePage.getByRole("button", { name: "Follow", exact: true }).click();
    const empty = mikePage.locator("article", { hasText: "@cyreader" });
    await empty.getByText("Hasn't opened a book on tbr yet").waitFor({ timeout: 15000 });
    assert.equal(activity.some((row) => row.user_id === cy.id), false);

    const strangerPage = await other.newPage();
    await strangerPage.goto(`${APP}/friends`, { waitUntil: "domcontentloaded" });
    const visible = await strangerPage.evaluate(async (ownerId) => {
      const res = await fetch(
        `https://thuxsshowkxacbfjdaks.supabase.co/rest/v1/activity?select=id,user_id,kind,book_id&user_id=eq.${ownerId}`,
        {
          headers: {
            apikey: "test",
            Accept: "application/json",
          },
        },
      );
      return res.json();
    }, bea.id);
    assert.equal(Array.isArray(visible) && visible.some((row: { book_id?: string }) => row.book_id === "passing"), true);

    const guest = await browser.newContext({ ...PHONE });
    await guest.addInitScript((storeValue) => {
      window.localStorage.setItem("vellum-v1", JSON.stringify(storeValue));
    }, {
      state: {
        handle: "",
        following: ["local:beareader"],
        contacts: [{ id: "local:beareader", handle: "beareader", name: "@beareader", addedAt: 1 }],
      },
      version: 2,
    });
    await guest.route(/supabase\.co/, (route) => fulfill(route));
    await guest.route(/supabase\.co\/realtime/, (route) => route.abort());
    const guestPage = await guest.newPage();
    await guestPage.goto(`${APP}/friends`, { waitUntil: "domcontentloaded" });
    await guestPage.getByText("Passing").waitFor({ timeout: 20000 });
    assert.equal(await guestPage.getByText("Sign in to see").count(), 0);
    assert.equal(await mikePage.getByText("Passing").count(), 1);
  } finally {
    await browser.close();
  }
});

test("a signed-in reader reloads into an active Friends list", { timeout: 120_000 }, async () => {
  reset();
  const bea = seat("00000000-0000-4000-8000-0000000000b1", "beareader");
  const mike = seat("00000000-0000-4000-8000-0000000000c1", "mikereader");
  const cy = seat("00000000-0000-4000-8000-0000000000d1", "cyreader");
  const opened = Date.now() - 60 * 60 * 1000;
  activity.push({
    id: activitySeq,
    user_id: bea.id,
    kind: "reading",
    book_id: "passing",
    payload: {
      atIndex: 18,
      workTitle: "Passing",
      author: "Nella Larsen",
      summary: "Opened Passing",
    },
    created_at: new Date(opened).toISOString(),
  });
  activitySeq += 1;

  await ensureDev();
  const browser = await launchBrowser();
  const context = await browser.newContext({ ...PHONE });
  try {
    context.setDefaultTimeout(30_000);
    context.setDefaultNavigationTimeout(30_000);
    await context.route(/supabase\.co/, (route) => fulfill(route));
    await context.route(/supabase\.co\/realtime/, (route) => route.abort());
    const page = await context.newPage();
    await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.locator('input[name="email"]').fill("mikereader@example.com");
    await page.locator('input[name="password"]').fill("sitquietly");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/profile/, { timeout: 20_000 });

    await page.goto(`${APP}/friends`, { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Find @handle").fill("beareader");
    await page
      .locator("section")
      .filter({ has: page.getByPlaceholder("Find @handle") })
      .getByRole("button", { name: "Follow", exact: true })
      .click();
    await page.locator("article", { hasText: "@beareader" }).getByText("Passing").waitFor({ timeout: 20_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("article", { hasText: "@beareader" }).getByText("Passing").waitFor({ timeout: 20_000 });
    assert.equal(page.url().includes("/friends"), true);
    const stored = await page.evaluate(() => window.localStorage.getItem("tbr-supabase-auth"));
    assert.equal(Boolean(stored && stored.includes(mike.id)), true);

    await page.getByPlaceholder("Find @handle").fill("cyreader");
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await waitFor("reload did not keep the signed-in follow", () =>
      follows.some((row) => row.followerId === mike.id && row.followeeId === cy.id),
    );
  } finally {
    await browser.close();
  }
});

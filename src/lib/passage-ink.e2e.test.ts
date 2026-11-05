/**
 * Two sessions in one sitting: a pen stroke on the passage shows up on the
 * other reader, stays on that passage, and can be undone.
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import test from "node:test";
import { chromium, type Browser, type Page } from "playwright";
import { ensureReaderServer } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const APP = `${ORIGIN}/salon`;
const SHOTS = "/opt/cursor/artifacts";

type Seat = { id: string; name: string; breath: number; place: string; workId: string; seen: number };
type SitEvent = { id: number; from: string; to: string | null; data: unknown };
type SitRoom = { seats: Map<string, Seat>; events: SitEvent[]; seq: number };

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(chunk as Buffer));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

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
      if (room.events.length > 200) room.events.splice(0, room.events.length - 200);
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
  const fresh = room.events.filter(
    (event) => event.id > cursor && event.from !== selfId && (!event.to || event.to === selfId),
  );
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ cursor: room.seq, presence, messages: fresh }));
}

async function columnBox(page: Page) {
  await page.locator(".breath-block").first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    () => document.querySelector(".reader-frame")?.getAttribute("data-face-ready") === "yes",
  );
  return page.evaluate(() => {
    const block = document.querySelector(".breath-block");
    const line = document.querySelector(".breath-now");
    const style = line ? getComputedStyle(line) : null;
    return {
      width: block ? Math.round(block.getBoundingClientRect().width) : 0,
      pad: style?.paddingRight ?? "",
    };
  });
}

async function breathOf(page: Page) {
  return Number(await page.locator(".reader-frame").getAttribute("data-breath-index"));
}

async function tapSide(page: Page, zone: "prev" | "next") {
  const box = await page.locator(".reader-turn").boundingBox();
  assert.ok(box, "the reading column is on screen");
  const x = zone === "next" ? box.x + box.width * 0.86 : box.x + box.width * 0.08;
  const y = box.y + Math.min(box.height * 0.42, 180);
  await page.mouse.click(x, y);
}

async function shot(page: Page, name: string) {
  try {
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  } catch {
    /* artifacts are for the local review pass */
  }
}

test("a pen stroke syncs across two readers and stays on the passage", { timeout: 180_000 }, async () => {
  await ensureReaderServer();
  const mirror = await startMirror();
  const browser: Browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
  try {
    const phone = {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 1,
    };
    const a = await browser.newContext(phone);
    const b = await browser.newContext(phone);
    await a.addInitScript((url) => {
      (window as unknown as { __TBR_SIT_MIRROR?: string }).__TBR_SIT_MIRROR = url;
    }, mirror.url);
    await b.addInitScript((url) => {
      (window as unknown as { __TBR_SIT_MIRROR?: string }).__TBR_SIT_MIRROR = url;
    }, mirror.url);
    await a.route(/supabase\.co/, (route) => route.abort());
    await b.route(/supabase\.co/, (route) => route.abort());
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    const solo = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await solo.goto(`${APP}/read/passing?at=0`, { waitUntil: "domcontentloaded" });
    const read = `${APP}/read/passing?at=0&sit=20&pair=inkroom`;
    await Promise.all([
      pageA.goto(read, { waitUntil: "domcontentloaded" }),
      pageB.goto(read, { waitUntil: "domcontentloaded" }),
    ]);
    await pageA.locator(".chat-field").waitFor({ timeout: 60_000 });
    await pageB.locator(".chat-field").waitFor({ timeout: 60_000 });
    await pageA.locator('[data-draw="off"]').waitFor();
    const alone = await columnBox(solo);
    const together = await columnBox(pageA);
    assert.equal(together.pad, "0px");
    assert.equal(alone.pad, "0px");
    assert.equal(together.width, alone.width, "together text is narrower than the solo reader");
    assert.ok(together.width > 200);

    const wide = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const wideSolo = await wide.newPage();
    const wideSit = await wide.newPage();
    await wideSit.addInitScript((url) => {
      (window as unknown as { __TBR_SIT_MIRROR?: string }).__TBR_SIT_MIRROR = url;
    }, mirror.url);
    await wideSit.route(/supabase\.co/, (route) => route.abort());
    await wideSolo.goto(`${APP}/read/passing?at=0`, { waitUntil: "domcontentloaded" });
    await wideSit.goto(`${APP}/read/passing?at=0&sit=20&pair=inkwide`, { waitUntil: "domcontentloaded" });
    await wideSit.locator(".chat-field").waitFor({ timeout: 60_000 });
    const wideAlone = await columnBox(wideSolo);
    const wideTogether = await columnBox(wideSit);
    assert.equal(wideTogether.pad, "0px");
    assert.equal(wideTogether.width, wideAlone.width);
    await wide.close();

    await shot(pageA, "read-together-390-draw-off");
    const note = `ink ${Date.now().toString(36)}`;
    await pageA.locator(".chat-field").fill(note);
    await pageA.locator(".chat-send").click();
    await pageB.locator(".chat-line", { hasText: note }).waitFor({ timeout: 10_000 });

    const start = await breathOf(pageA);
    await tapSide(pageA, "next");
    await pageA.waitForFunction(
      (before) => Number(document.querySelector(".reader-frame")?.getAttribute("data-breath-index")) !== before,
      start,
    );
    await tapSide(pageA, "prev");
    await pageA.waitForFunction(
      (before) => Number(document.querySelector(".reader-frame")?.getAttribute("data-breath-index")) === before,
      start,
    );

    await pageA.getByRole("button", { name: "Pen", exact: true }).click();
    await pageA.locator('[data-draw="on"]').waitFor();
    await pageA.waitForFunction(() => {
      const sheet = document.querySelector(".passage-ink-sheet");
      if (!sheet) return false;
      const box = sheet.getBoundingClientRect();
      return box.width > 40 && box.height > 24;
    });
    const sheet = await pageA.locator(".passage-ink-sheet").boundingBox();
    assert.ok(sheet, "the pen has the passage");
    const held = await breathOf(pageA);
    await pageA.mouse.move(sheet.x + sheet.width * 0.18, sheet.y + sheet.height * 0.35);
    await pageA.mouse.down();
    await pageA.mouse.move(sheet.x + sheet.width * 0.78, sheet.y + sheet.height * 0.42, { steps: 8 });
    await pageA.mouse.move(sheet.x + sheet.width * 0.42, sheet.y + sheet.height * 0.72, { steps: 8 });
    await shot(pageA, "read-together-390-drawing");
    await pageA.mouse.up();
    assert.equal(await breathOf(pageA), held, "drawing turned the page");

    const mark = pageB.locator(".passage-ink path[data-stroke]");
    await mark.waitFor({ timeout: 10_000 });
    const from = await mark.getAttribute("data-from");
    const breath = await mark.getAttribute("data-breath");
    assert.ok(from && from.startsWith("p-"));
    assert.equal(breath, String(held));
    await shot(pageB, "read-together-390-other-reader");

    await pageA.getByRole("button", { name: "Pen", exact: true }).click();
    await pageA.locator('[data-draw="off"]').waitFor();
    await tapSide(pageA, "next");
    await pageA.waitForFunction(
      (before) => Number(document.querySelector(".reader-frame")?.getAttribute("data-breath-index")) !== before,
      held,
    );
    assert.equal(await pageA.locator(".passage-ink path[data-stroke]").count(), 0);
    await tapSide(pageA, "prev");
    await pageA.locator(`.passage-ink path[data-breath="${held}"]`).waitFor({ timeout: 10_000 });

    await pageA.getByRole("button", { name: "Undo", exact: true }).click();
    await pageB.waitForFunction(() => document.querySelectorAll(".passage-ink path[data-stroke]").length === 0);
    assert.equal(await pageA.locator(".passage-ink path[data-stroke]").count(), 0);
    await solo.close();
  } finally {
    await browser.close();
    await mirror.close();
  }
});

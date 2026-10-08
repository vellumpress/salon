import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, openSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const LOCAL_ORIGIN = !process.env.READER_ORIGIN;
const PHONE = devices["iPhone 12"];
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

type EngineName = "chromium" | "webkit";

type Column = {
  index: number;
  bar: string | null;
  overflows: boolean;
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  host: { left: number; top: number; width: number; height: number; bottom: number };
  lineTop: number;
  lineBottom: number;
  footerTop: number;
  touchAction: string;
  htmlTouch: string;
  sitting: boolean;
  slotTouch: string;
};

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** One text PDF. Lines that do not end a sentence join into a single breath. */
function pdfFromLines(lines: string[]): Uint8Array {
  const perPage = 22;
  const streams: string[] = [];
  for (let p = 0; p < lines.length; p += perPage) {
    const chunk = lines.slice(p, p + perPage);
    const ops = ["BT", "/F1 12 Tf", "72 740 Td"];
    chunk.forEach((line, i) => {
      if (i > 0) ops.push("0 -28 Td");
      ops.push(`(${pdfEscape(line)}) Tj`);
    });
    ops.push("ET");
    streams.push(ops.join("\n"));
  }
  const chunks: { id: number; body: string }[] = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 3, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
  ];
  const kids: number[] = [];
  let id = 4;
  for (const stream of streams) {
    const pageId = id;
    const contentId = id + 1;
    id += 2;
    kids.push(pageId);
    chunks.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    });
    chunks.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
  }
  chunks.push({
    id: 2,
    body: `<< /Type /Pages /Kids [${kids.map((kid) => `${kid} 0 R`).join(" ")}] /Count ${kids.length} >>`,
  });
  chunks.sort((a, b) => a.id - b.id);
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of chunks) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xrefAt = pdf.length;
  const size = chunks.length + 1;
  pdf += `xref\n0 ${size}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < size; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function shortPdf(count: number) {
  const lines: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`Imported sentence ${String(i).padStart(2, "0")} ends here.`);
  }
  return pdfFromLines(lines);
}

function longParagraphPdf() {
  const lines = [
    "A short imported sentence sits before the long one.",
    "Another short imported sentence ends here.",
  ];
  lines.push("The long imported paragraph begins on this line and does not stop");
  for (let i = 1; i <= 70; i += 1) {
    lines.push(`and clause ${String(i).padStart(2, "0")} keeps the same breath going onward`);
  }
  lines.push("until the long imported paragraph finally ends.");
  lines.push("A short imported sentence follows the long one.");
  return pdfFromLines(lines);
}

function loadWork(id: string) {
  return JSON.parse(
    readFileSync(new URL(`./catalog/texts/${id}.json`, import.meta.url), "utf8"),
  ) as { breaths: { sceneId: string; text: string }[] };
}

function sceneBounds(id: string) {
  const work = loadWork(id);
  const bounds: number[] = [];
  for (let i = 1; i < work.breaths.length; i += 1) {
    if (work.breaths[i]?.sceneId !== work.breaths[i - 1]?.sceneId) bounds.push(i);
  }
  return bounds;
}

function sampleBounds(bounds: number[], max: number) {
  if (bounds.length <= max) return bounds;
  const picked = new Set<number>();
  const step = (bounds.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) picked.add(bounds[Math.round(i * step)] ?? bounds[0] ?? 0);
  return [...picked].sort((a, b) => a - b);
}

async function webkitInstalled() {
  try {
    const browser = await webkit.launch();
    await browser.close();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    return false;
  }
}

async function launchEngine(name: EngineName): Promise<Browser> {
  if (name === "webkit") return webkit.launch();
  const args = ["--no-sandbox"];
  for (const executablePath of CHROME_CANDIDATES) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ executablePath, args });
    } catch {
      /* try the next browser */
    }
  }
  try {
    return await chromium.launch({ args });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    execFileSync("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit",
      timeout: 180_000,
    });
    return chromium.launch({ args });
  }
}

async function healthy() {
  try {
    const res = await fetch(`${ORIGIN}/salon/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (!LOCAL_ORIGIN) return async () => {};
  if (await healthy()) return async () => {};
  const log = openSync("/tmp/reader-tap-matrix-dev.log", "a");
  const child: ChildProcess = spawn("npm", ["run", "dev"], {
    cwd: repoRoot,
    detached: true,
    stdio: ["ignore", log, log],
    env: process.env,
  });
  child.unref();
  const failed = new Promise<never>((_, reject) => {
    child.once("error", (error) => {
      reject(new Error(`could not start the reader (${repoRoot}): ${error.message}`));
    });
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const ready = await Promise.race([healthy().then((ok) => (ok ? "up" : "down")), failed]);
    if (ready === "up") {
      return async () => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`reader dev server did not start from ${repoRoot}`);
}

async function phonePage(browser: Browser, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({
    viewport,
    screen: viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
  return page;
}

async function frames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function column(page: Page): Promise<Column> {
  const spot = await page.evaluate(() => {
    const host = document.querySelector("[data-reader-text]");
    const line = document.querySelector(".breath-now");
    const slot = document.querySelector(".breath-slot");
    const frame = document.querySelector("[data-breath-index]");
    if (!host || !line || !slot || !frame) return null;
    const h = host.getBoundingClientRect();
    const row = line.getBoundingClientRect();
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    return {
      index: Number(frame.getAttribute("data-breath-index")),
      bar: document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") ?? null,
      overflows: slot.classList.contains("overflows"),
      scrollTop: (slot as HTMLElement).scrollTop,
      clientHeight: (slot as HTMLElement).clientHeight,
      scrollHeight: (slot as HTMLElement).scrollHeight,
      host: { left: h.left, top: h.top, width: h.width, height: h.height, bottom: h.bottom },
      lineTop: row.top,
      lineBottom: row.bottom,
      footerTop: footer?.top ?? h.bottom,
      touchAction: getComputedStyle(host).touchAction,
      htmlTouch: getComputedStyle(document.documentElement).touchAction,
      sitting: document.documentElement.classList.contains("sitting"),
      slotTouch: getComputedStyle(slot).touchAction,
    };
  });
  assert.ok(spot, "reading column missing");
  return spot;
}

function lineAtTop(spot: Column) {
  return spot.lineTop <= spot.host.top + 12;
}

function backPoint(spot: Column) {
  const limit = Math.min(spot.host.bottom - 8, spot.footerTop - 12);
  // A sentence pinned to the top has no band above the words. The left third
  // is back, including while a taller line is still arriving.
  if (lineAtTop(spot)) {
    // Near the top, not the middle. A line can sit under the header for a
    // frame and then drop to the center; a point halfway down would land on
    // the words and step forward.
    return {
      x: Math.round(spot.host.left + Math.max(12, spot.host.width * 0.12)),
      y: Math.round(Math.min(limit, spot.host.top + 16)),
    };
  }
  const band = spot.lineTop - spot.host.top;
  // Stay near the top of the column. A line still below the screen makes the
  // gap look huge, and a point halfway down that gap is on the sentence once
  // it comes to rest.
  const y = Math.round(
    Math.min(limit - 1, spot.lineTop - 8, spot.host.top + Math.max(12, Math.min(band - 8, 18))),
  );
  return {
    x: Math.round(spot.host.left + spot.host.width * 0.72),
    y: Math.max(Math.round(spot.host.top + 4), y),
  };
}

function forwardPoint(spot: Column) {
  const limit = Math.min(spot.host.bottom - 8, spot.footerTop - 12);
  if (spot.overflows) {
    return {
      x: Math.round(spot.host.left + spot.host.width * 0.72),
      y: Math.round(Math.min(limit, spot.host.top + spot.host.height * 0.62)),
    };
  }
  const onLine = Math.min(limit, Math.max(spot.lineTop + 8, spot.lineBottom - 4));
  return { x: Math.round(spot.host.left + spot.host.width * 0.62), y: Math.round(onLine) };
}

async function assertOnColumn(page: Page, point: { x: number; y: number }, label: string) {
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return {
      on: Boolean(el?.closest("[data-reader-text]")),
      name: el ? `${el.tagName}.${el.className?.toString?.().slice(0, 80) ?? ""}` : "none",
    };
  }, point);
  assert.equal(hit.on, true, `${label} landed on ${hit.name} instead of the reading column`);
}

async function breathIndex(page: Page) {
  const raw = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
  return Number(raw);
}

async function waitIndex(page: Page, expected: number) {
  await page.waitForFunction(
    (want) =>
      document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") ===
      String(want),
    expected,
    { timeout: 4000 },
  );
  await frames(page);
  assert.equal(await breathIndex(page), expected);
}

async function tapIndex(
  page: Page,
  point: { x: number; y: number },
  expected: number,
  label: string,
) {
  await assertOnColumn(page, point, label);
  await page.touchscreen.tap(point.x, point.y);
  try {
    await waitIndex(page, expected);
  } catch (error) {
    const now = await breathIndex(page);
    throw new Error(`${label}: index ${now}, expected ${expected} (${error instanceof Error ? error.message : error})`);
  }
  const bar = await page.locator("[data-reader-bar]").getAttribute("data-reader-bar");
  assert.equal(bar, "closed", `${label} opened Keep/Send`);
}

async function openAt(page: Page, id: string, at: number) {
  await page.goto(`${ORIGIN}/salon/read/${id}?at=${at}`, { waitUntil: "domcontentloaded" });
  await page.locator(".breath-now").waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    (want) => {
      const frame = document.querySelector(".reader-frame");
      const full = frame?.getAttribute("data-bound") === "full";
      const index = frame?.getAttribute("data-breath-index");
      return full && index === String(want) && !document.querySelector(".veil");
    },
    at,
    { timeout: 30_000 },
  );
}

async function sameSpotTwice(
  page: Page,
  direction: 1 | -1,
  label: string,
) {
  await page
    .waitForFunction(
      () => {
        const track = document.querySelector(".center-track");
        if (!(track instanceof Element)) return true;
        return !track.getAnimations().some((anim) => anim.playState === "running");
      },
      { timeout: 2000 },
    )
    .catch(() => undefined);
  const spot = await column(page);
  const limit = Math.min(spot.host.bottom - 8, spot.footerTop - 12);
  const point =
    direction < 0
      ? backPoint(spot)
      : {
          x: Math.round(spot.host.left + spot.host.width * 0.72),
          y: Math.round(Math.min(limit, Math.max(spot.lineTop + 8, spot.host.bottom - 24))),
        };
  await assertOnColumn(page, point, label);
  const start = spot.index;
  await page.touchscreen.tap(point.x, point.y);
  await page.touchscreen.tap(point.x, point.y);
  try {
    await waitIndex(page, start + direction * 2);
  } catch (error) {
    const now = await breathIndex(page);
    throw new Error(
      `${label}: index ${now}, expected ${start + direction * 2} (${error instanceof Error ? error.message : error})`,
    );
  }
  const bar = await page.locator("[data-reader-bar]").getAttribute("data-reader-bar");
  assert.equal(bar, "closed", `${label} opened Keep/Send`);
}

async function burst(
  page: Page,
  direction: 1 | -1,
  count: number,
  gapMs: number,
  label: string,
) {
  const start = await breathIndex(page);
  for (let i = 0; i < count; i += 1) {
    const spot = await column(page);
    assert.equal(spot.overflows, false, `${label} hit a tall breath at ${spot.index}`);
    const point = direction < 0 ? backPoint(spot) : forwardPoint(spot);
    const began = Date.now();
    await tapIndex(page, point, start + direction * (i + 1), `${label} step ${i + 1}`);
    const spent = Date.now() - began;
    if (spent < gapMs) await new Promise((resolve) => setTimeout(resolve, gapMs - spent));
  }
  await frames(page);
  assert.equal(await breathIndex(page), start + direction * count, label);
}

async function slowBack(page: Page, label: string) {
  const spot = await column(page);
  assert.equal(spot.overflows, false, `${label} is a tall breath`);
  const point = backPoint(spot);
  await assertOnColumn(page, point, label);
  await page.evaluate(({ x, y }) => {
    const host = document.querySelector("[data-reader-text]");
    if (!host) throw new Error("missing reading column");
    host.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 6,
        button: 0,
        buttons: 1,
        pointerType: "touch",
        isPrimary: true,
      }),
    );
  }, point);
  await new Promise((resolve) => setTimeout(resolve, 450));
  await page.evaluate(({ x, y }) => {
    const host = document.querySelector("[data-reader-text]");
    if (!host) throw new Error("missing reading column");
    host.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 6,
        button: 0,
        buttons: 0,
        pointerType: "touch",
        isPrimary: true,
      }),
    );
  }, point);
  await waitIndex(page, spot.index - 1);
  assert.equal(await breathIndex(page), spot.index - 1, label);
}

async function dispatchGhost(page: Page, x: number, y: number, clickBeforeUp: boolean) {
  await page.evaluate(
    ({ x, y, clickBeforeUp }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const touch = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 4,
        button: 0,
        pointerType: "touch",
        isPrimary: true,
      };
      const mouse = { ...touch, pointerId: 5, pointerType: "mouse" };
      host.dispatchEvent(new PointerEvent("pointerdown", touch));
      if (clickBeforeUp) {
        host.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      }
      host.dispatchEvent(new PointerEvent("pointerup", touch));
      host.dispatchEvent(new PointerEvent("pointerdown", mouse));
      host.dispatchEvent(new PointerEvent("pointerup", mouse));
      if (!clickBeforeUp) {
        host.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      }
    },
    { x, y, clickBeforeUp },
  );
}

async function tallSteps(page: Page, id: string, at: number, label: string) {
  await openAt(page, id, at);
  const opened = await column(page);
  assert.equal(opened.overflows, true, `${label} is not taller than the column`);
  assert.ok(opened.scrollTop < 4, `${label} did not open at the start`);
  assert.equal(opened.slotTouch, "manipulation", `${label} slot still pans natively`);
  await tapIndex(page, forwardPoint(opened), at + 1, `${label} forward`);
  const next = await column(page);
  assert.ok(next.scrollTop < 4, `${label} next sentence did not open at the start`);
  await tapIndex(page, backPoint(next), at, `${label} back onto the tall sentence`);
  const landed = await column(page);
  assert.equal(landed.index, at, `${label} back skipped or stuck`);
  assert.ok(landed.scrollTop < 4, `${label} back stopped partway through the sentence`);
}

async function dragTall(page: Page, label: string) {
  const spot = await column(page);
  assert.equal(spot.overflows, true, label);
  const x = Math.round(spot.host.left + spot.host.width * 0.7);
  const y0 = Math.round(spot.host.top + spot.host.height * 0.7);
  const y1 = y0 - 90;
  await page.evaluate(
    ({ x, y0, y1 }) => {
      const host = document.querySelector("[data-reader-text]");
      if (!host) throw new Error("missing reading column");
      const fire = (type: string, y: number) => {
        host.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 9,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
      };
      fire("pointerdown", y0);
      fire("pointermove", y0 - 30);
      fire("pointermove", y1);
      fire("pointerup", y1);
    },
    { x, y0, y1 },
  );
  await frames(page);
  const after = await column(page);
  assert.equal(after.index, spot.index, `${label} drag stepped a breath`);
  assert.ok(after.scrollTop > spot.scrollTop + 20, `${label} drag did not scroll`);
}

async function runReaderMatrix(name: EngineName) {
  const browser = await launchEngine(name);
  const tag = name;
  try {
    const page = await phonePage(browser);
    const viewport = page.viewportSize();
    assert.equal(viewport?.width, 390, `${tag} viewport width`);
    assert.equal(viewport?.height, 844, `${tag} viewport height`);

    await openAt(page, "passing", 862);
    const touch = await column(page);
    assert.equal(touch.sitting, true, `${tag} reader is not in sitting mode`);
    assert.equal(touch.htmlTouch, "manipulation", `${tag} page still allows double-tap zoom`);
    assert.equal(touch.touchAction, "manipulation", `${tag} column still allows double-tap zoom`);
    await burst(page, -1, 20, 100, `${tag} passing rapid back`);
    assert.equal(await breathIndex(page), 842, `${tag} twenty backs`);
    await burst(page, 1, 20, 100, `${tag} passing rapid forward`);
    assert.equal(await breathIndex(page), 862, `${tag} twenty forwards did not return`);

    await openAt(page, "passing", 120);
    await sameSpotTwice(page, -1, `${tag} passing double back on one spot`);
    await openAt(page, "passing", 120);
    await sameSpotTwice(page, 1, `${tag} passing double forward on one spot`);

    await openAt(page, "passing", 862);
    await slowBack(page, `${tag} passing slow back`);
    assert.equal(await breathIndex(page), 861);

    await openAt(page, "passing", 0);
    const first = await column(page);
    await assertOnColumn(page, backPoint(first), `${tag} breath 0`);
    await page.touchscreen.tap(backPoint(first).x, backPoint(first).y);
    await frames(page);
    assert.equal(await breathIndex(page), 0, `${tag} back from the first sentence moved`);
    assert.equal(
      await page.locator("[data-reader-bar]").getAttribute("data-reader-bar"),
      "closed",
      `${tag} back from the first sentence opened the bar`,
    );
    await tapIndex(page, forwardPoint(await column(page)), 1, `${tag} forward from the first sentence`);

    await openAt(page, "passing", 12);
    await tapIndex(page, backPoint(await column(page)), 11, `${tag} back from a ?at= open`);

    await openAt(page, "passing", 40);
    await page.setViewportSize({ width: 375, height: 667 });
    await frames(page);
    await tapIndex(page, backPoint(await column(page)), 39, `${tag} back at 375×667`);
    await page.setViewportSize({ width: 320, height: 568 });
    await frames(page);
    await tapIndex(page, backPoint(await column(page)), 38, `${tag} back at 320×568`);
    await page.setViewportSize({ width: 390, height: 844 });
    await frames(page);
    await tapIndex(page, forwardPoint(await column(page)), 39, `${tag} forward after resize`);
    await tapIndex(page, forwardPoint(await column(page)), 40, `${tag} second forward after resize`);

    await openAt(page, "passing", 24);
    const ghostSpot = await column(page);
    const ghostAt = backPoint(ghostSpot);
    await dispatchGhost(page, ghostAt.x, ghostAt.y, false);
    await waitIndex(page, 23);
    await frames(page);
    assert.equal(await breathIndex(page), 23, `${tag} ghost mouse undid the back tap`);
    const ghostAgain = backPoint(await column(page));
    await dispatchGhost(page, ghostAgain.x, ghostAgain.y, true);
    await waitIndex(page, 22);
    await frames(page);
    assert.equal(await breathIndex(page), 22, `${tag} click-before-up doubled the back tap`);

    const books = [
      "passing",
      "strait-is-the-gate",
      "the-house-of-mirth",
      "lamia",
      "ghosts",
      "shahnameh",
      "nights",
    ];
    for (const id of books) {
      const bounds = sceneBounds(id);
      assert.ok(bounds.length > 0, `${id} has no scene boundary`);
      for (const at of bounds) {
        await openAt(page, id, at);
        const spot = await column(page);
        await tapIndex(page, backPoint(spot), at - 1, `${tag} ${id} back from scene breath ${at}`);
      }
    }
    for (const at of sampleBounds(sceneBounds("strange-tales"), 12)) {
      await openAt(page, "strange-tales", at);
      await tapIndex(
        page,
        backPoint(await column(page)),
        at - 1,
        `${tag} strange-tales back from scene breath ${at}`,
      );
    }

    await openAt(page, "don-juan", 50);
    await burst(page, -1, 20, 40, `${tag} don juan back across stanzas`);
    assert.equal(await breathIndex(page), 30);
    await burst(page, 1, 20, 40, `${tag} don juan forward across stanzas`);
    assert.equal(await breathIndex(page), 50);

    await openAt(page, "miss-julie", 47);
    await burst(page, -1, 8, 40, `${tag} miss julie back`);
    await burst(page, 1, 8, 40, `${tag} miss julie forward`);
    assert.equal(await breathIndex(page), 47);

    await tallSteps(page, "lamia", 5, `${tag} lamia`);
    await openAt(page, "lamia", 5);
    await dragTall(page, `${tag} lamia drag`);
    await tallSteps(page, "strait-is-the-gate", 16, `${tag} strait`);
    await tallSteps(page, "nights", 4, `${tag} nights`);
    await tallSteps(page, "shahnameh", 49, `${tag} shahnameh`);
    await tallSteps(page, "strange-tales", 84, `${tag} strange tales`);

    await openAt(page, "passing", 18);
    const beforeGlass = await column(page);
    const glass = await page.locator(".reader-glass").boundingBox();
    assert.ok(glass, "hourglass missing");
    await page.touchscreen.tap(glass.x + glass.width / 2, glass.y + glass.height / 2);
    await page.waitForFunction(
      () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
    );
    assert.equal(await breathIndex(page), beforeGlass.index, `${tag} hourglass turned the page`);
    await tapIndex(page, backPoint(await column(page)), beforeGlass.index - 1, `${tag} back with the bar open`);
    assert.equal(
      await page.locator("[data-reader-bar]").getAttribute("data-reader-bar"),
      "closed",
      `${tag} back tap left the bar open`,
    );
    await tapIndex(page, backPoint(await column(page)), beforeGlass.index - 2, `${tag} back with the bar closed`);

    await page.close();
  } finally {
    await browser.close();
  }
}

async function importPdf(page: Page, bytes: Uint8Array, name: string) {
  await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
  await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
  const sit = page.getByRole("button", { name: "Sit", exact: true });
  const alone = page.getByRole("button", { name: "Alone", exact: true });
  await sit.or(alone).first().waitFor();
  await sit.or(alone).first().click();
  await page.locator("[data-breath-index]").waitFor();
  await page.locator(".breath-now").waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".veil") && document.querySelector(".breath-now"),
    { timeout: 30_000 },
  );
}

async function runPdfMatrix(name: EngineName) {
  const browser = await launchEngine(name);
  const tag = name;
  try {
    const page = await phonePage(browser);
    await importPdf(page, shortPdf(40), "short.pdf");
    assert.equal(await breathIndex(page), 0);
    const first = await column(page);
    await page.touchscreen.tap(backPoint(first).x, backPoint(first).y);
    await frames(page);
    assert.equal(await breathIndex(page), 0, `${tag} pdf back from the first sentence moved`);
    for (let i = 0; i < 24; i += 1) {
      const spot = await column(page);
      await tapIndex(page, forwardPoint(spot), spot.index + 1, `${tag} pdf forward ${i}`);
    }
    assert.equal(await breathIndex(page), 24);
    await burst(page, -1, 20, 80, `${tag} pdf rapid back`);
    assert.equal(await breathIndex(page), 4);
    await burst(page, 1, 20, 80, `${tag} pdf rapid forward`);
    assert.equal(await breathIndex(page), 24);
    const glass = await page.locator(".reader-glass").boundingBox();
    assert.ok(glass, "pdf hourglass missing");
    const before = await breathIndex(page);
    await page.touchscreen.tap(glass.x + glass.width / 2, glass.y + glass.height / 2);
    await page.waitForFunction(
      () => document.querySelector("[data-reader-bar]")?.getAttribute("data-reader-bar") === "open",
    );
    assert.equal(await breathIndex(page), before, `${tag} pdf hourglass turned the page`);
    await tapIndex(page, backPoint(await column(page)), before - 1, `${tag} pdf back with the bar open`);

    await page.close();
    const again = await phonePage(browser);
    await importPdf(again, longParagraphPdf(), "long.pdf");
    let found = -1;
    for (let i = 0; i < 6; i += 1) {
      const spot = await column(again);
      if (spot.overflows) {
        found = spot.index;
        break;
      }
      if (i === 5) break;
      await tapIndex(again, forwardPoint(spot), spot.index + 1, `${tag} pdf seek tall ${i}`);
    }
    assert.ok(found >= 0, `${tag} long pdf paragraph did not scroll in place`);
    const tall = await column(again);
    assert.ok(tall.scrollTop < 4, `${tag} long pdf breath was not at the start`);
    await tapIndex(again, forwardPoint(tall), found + 1, `${tag} pdf forward off a tall paragraph`);
    const stepped = await column(again);
    assert.ok(stepped.scrollTop < 4, `${tag} pdf next sentence opened partway`);
    await tapIndex(again, backPoint(stepped), found, `${tag} pdf back onto a tall paragraph`);
    const returned = await column(again);
    assert.ok(returned.scrollTop < 4, `${tag} pdf back stopped partway through the paragraph`);
    await again.close();
  } finally {
    await browser.close();
  }
}

test(
  "touch back is one breath on Chromium, including rapid taps and scene edges",
  { timeout: 900_000 },
  async () => {
    const stop = await ensureServer();
    try {
      await runReaderMatrix("chromium");
    } finally {
      await stop();
    }
  },
);

test(
  "touch back is one breath on WebKit, including rapid taps and scene edges",
  { timeout: 900_000 },
  async (t: TestContext) => {
    if (!(await webkitInstalled())) {
      t.skip("WebKit is not installed");
      return;
    }
    const stop = await ensureServer();
    try {
      await runReaderMatrix("webkit");
    } finally {
      await stop();
    }
  },
);

test(
  "touch back is one breath in an imported PDF on Chromium and WebKit",
  { timeout: 900_000 },
  async (t: TestContext) => {
    const stop = await ensureServer();
    try {
      await runPdfMatrix("chromium");
      if (await webkitInstalled()) await runPdfMatrix("webkit");
      else t.diagnostic("WebKit is not installed; PDF matrix ran on Chromium only");
    } finally {
      await stop();
    }
  },
);

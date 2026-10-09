import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import {
  CATALOG_WALK_ANCHORS,
  CATALOG_WALK_SAMPLE_SIZE,
  catalogIdsFromDiff,
  catalogWalkMode,
  isPageGotoTimeout,
  resolveEpochDay,
  selectCatalogWalk,
  usableDiffBase,
} from "./catalog-walk.ts";
import { readableIds } from "./catalog/shelf.ts";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TAPS = 500;
const RUNS = Math.max(1, Number(process.env.STRESS_RUNS ?? 10));

const CHROME_CANDIDATES = [
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const ANCHORS = [
  "passing",
  "the-house-of-mirth",
  "strait-is-the-gate",
  "nights",
  "lamia",
  "don-juan",
  "miss-julie",
  "ghosts",
  "shahnameh",
  "strange-tales",
];

type WorkFile = {
  breaths?: { sceneId?: string; text?: string }[];
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function catalogIds() {
  const onDisk = new Set(
    readdirSync(join(repoRoot, "src/lib/catalog/texts"))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5)),
  );
  // A text file can outlive the shelf. The reader will not open those.
  return readableIds()
    .filter((id) => onDisk.has(id))
    .sort();
}

function readWork(id: string): WorkFile {
  return JSON.parse(
    readFileSync(join(repoRoot, "src/lib/catalog/texts", `${id}.json`), "utf8"),
  ) as WorkFile;
}

function breathCount(id: string) {
  return readWork(id).breaths?.length ?? 0;
}

/** First sentence of a later chapter, so one back tap crosses the boundary. */
function chapterOpen(id: string) {
  const breaths = readWork(id).breaths ?? [];
  for (let i = 1; i < breaths.length; i += 1) {
    if (breaths[i]?.sceneId !== breaths[i - 1]?.sceneId) return i;
  }
  return -1;
}

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

function stressPdf(): Uint8Array {
  const lines = [
    "Alpha ends here.",
    "Beta ends here.",
    ...Array.from({ length: 22 }, () => "The river kept its slow green course under the dark trees"),
    "until the long sentence of that afternoon finally ended.",
    "Gamma ends here.",
    "Delta ends here.",
    "Epsilon ends here.",
    "Zeta ends here.",
    "Eta ends here.",
    "Theta ends here.",
  ];
  const ops = ["BT", "/F1 12 Tf", "72 740 Td"];
  lines.forEach((line, i) => {
    if (i > 0) ops.push("0 -28 Td");
    ops.push(`(${pdfEscape(line)}) Tj`);
  });
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function launchChromium(): Promise<Browser> {
  const args = ["--no-sandbox"];
  for (const executablePath of CHROME_CANDIDATES) {
    if (!existsSync(executablePath)) continue;
    try {
      return await chromium.launch({ executablePath, args });
    } catch {
      /* next */
    }
  }
  try {
    return await chromium.launch({ args });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    execFileSync("npx", ["playwright", "install", "chromium"], { stdio: "inherit", timeout: 180_000 });
    return chromium.launch({ args });
  }
}

async function launchWebkit(): Promise<Browser | null> {
  try {
    return await webkit.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch/.test(message)) throw error;
    return null;
  }
}

function ensureServer() {
  return ensureReaderServer();
}

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      get: () => true,
    });
    const media = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (String(query).includes("display-mode") && String(query).includes("standalone")) {
        return {
          matches: true,
          media: String(query),
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        } as MediaQueryList;
      }
      return media(query);
    };
    localStorage.clear();
    const keep = sessionStorage.getItem("keep-progress");
    if (keep) localStorage.setItem("vellum-v1", keep);
  });
  return page;
}

async function safeArea(page: Page) {
  try {
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 47, left: 0, bottom: 34, right: 0 },
    });
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "display-mode", value: "standalone" }],
    });
  } catch {
    /* WebKit has no CDP session. The viewport resize still moves the column. */
  }
}

async function openAt(page: Page, id: string, at: number) {
  // A fresh page is about:blank, which refuses storage. Nothing is saved there.
  await page
    .evaluate(() => sessionStorage.removeItem("keep-progress"))
    .catch(() => undefined);
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/${id}?at=${at}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
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
      return;
    } catch (error) {
      last = error;
      const down = readerDown(error);
      if (attempt >= (down ? 2 : 1)) break;
      if (down) await ensureServer();
    }
  }
  const message = last instanceof Error ? last.message.split("\n")[0] : String(last);
  throw new Error(`${id} at ${at} did not open (${message})`);
}

async function passGate(page: Page) {
  const veil = page.locator(".veil");
  await veil.waitFor({ timeout: 20_000 });
  // A length chip is also named Sit. The gate action is Alone, Begin, or the
  // last Sit, which sits under the chips.
  const alone = veil.getByRole("button", { name: "Alone", exact: true });
  const begin = veil.getByRole("button", { name: "Begin", exact: true });
  if (await alone.count()) await alone.click();
  else if (await begin.count()) await begin.click();
  else await veil.getByRole("button", { name: "Sit", exact: true }).last().click();
  await page.locator(".breath-now").waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => !document.querySelector(".veil"), { timeout: 15_000 });
}

async function resume(page: Page, id: string, at: number) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await resumeOnce(page, id, at);
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureServer();
    }
  }
  throw last;
}

async function resumeOnce(page: Page, id: string, at: number) {
  const saved = JSON.stringify({
    state: {
      activeReadVersion: 1,
      progress: {
        [id]: {
          breathIndex: at,
          lastOpenedAt: Date.now(),
          sittingStartedAt: null,
          keywords: {},
          kept: [],
          completedAt: null,
          entered: true,
          activeAnchorAt: null,
          activeMs: 0,
          activeAdvances: 0,
        },
      },
    },
    version: 2,
  });
  await page.goto(`${ORIGIN}/salon/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((value) => sessionStorage.setItem("keep-progress", value), saved);
  await page.goto(`${ORIGIN}/salon/read/${id}`, { waitUntil: "domcontentloaded" });
  await passGate(page);
  await page.waitForFunction(
    (want) =>
      document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === String(want),
    at,
    { timeout: 15_000 },
  );
  await page.evaluate(() => sessionStorage.removeItem("keep-progress"));
}

type Shot = {
  ok: true;
  from: number;
  x: number;
  y: number;
  scrollTop: number;
  lineTop: number;
  hostTop: number;
  pinned: boolean;
};

async function aim(
  page: Page,
  direction: 1 | -1,
  mode: "ghost" | "click-first" | "touch" | "burst" | "point",
): Promise<Shot | null> {
  const burst = mode === "burst" ? 3 : 1;
  const shot = await page.evaluate(
    ({ direction, mode, burst }) => {
      const hostEl = document.querySelector("[data-reader-text]");
      const line = document.querySelector(".breath-now");
      const slot = document.querySelector(".breath-slot");
      const frame = document.querySelector("[data-breath-index]");
      if (!(hostEl instanceof HTMLElement) || !line || !(slot instanceof HTMLElement) || !frame) {
        return { ok: false as const, reason: "missing column" };
      }
      const host = hostEl.getBoundingClientRect();
      const row = line.getBoundingClientRect();
      const footer = document.querySelector("footer")?.getBoundingClientRect();
      const limit = Math.min(host.bottom - 8, (footer?.top ?? host.bottom) - 12);
      const pinned = row.top <= host.top + 12;
      const x =
        direction < 0
          ? host.left + Math.max(12, host.width * 0.12)
          : host.left + host.width * 0.72;
      const y = Math.min(limit - 1, host.top + (direction < 0 ? host.height * 0.42 : host.height * 0.62));
      if (!(x >= host.left && x < host.right && y >= host.top && y < host.bottom && y < limit)) {
        return { ok: false as const, reason: "point outside" };
      }
      const index = Number(frame.getAttribute("data-breath-index"));
      if (mode === "point") {
        return {
          ok: true as const,
          from: index,
          x,
          y,
          scrollTop: slot.scrollTop,
          lineTop: row.top,
          hostTop: host.top,
          pinned,
        };
      }
      const fire = (kind: "touch" | "mouse", phase: "down" | "up", px: number, py: number) => {
        hostEl.dispatchEvent(
          new PointerEvent(phase === "down" ? "pointerdown" : "pointerup", {
            bubbles: true,
            cancelable: true,
            clientX: px,
            clientY: py,
            pointerId: kind === "touch" ? 7 : 8,
            button: 0,
            buttons: phase === "down" ? 1 : 0,
            pointerType: kind,
            isPrimary: true,
          }),
        );
      };
      const clickAt = (px: number, py: number) => {
        hostEl.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, clientX: px, clientY: py }),
        );
      };
      const once = (px: number, py: number) => {
        if (mode === "click-first") {
          fire("touch", "down", px, py);
          clickAt(px, py);
          fire("touch", "up", px, py);
          fire("mouse", "down", px, py);
          fire("mouse", "up", px, py);
          return;
        }
        fire("touch", "down", px, py);
        fire("touch", "up", px, py);
        if (mode === "ghost" || mode === "burst") {
          fire("mouse", "down", px, py);
          fire("mouse", "up", px, py);
          clickAt(px, py);
        }
      };
      for (let i = 0; i < burst; i += 1) once(x, y);
      return {
        ok: true as const,
        from: index,
        x,
        y,
        scrollTop: slot.scrollTop,
        lineTop: row.top,
        hostTop: host.top,
        pinned,
      };
    },
    { direction, mode, burst },
  );
  if (!shot.ok) return null;
  return shot;
}

async function step(
  page: Page,
  direction: 1 | -1,
  expected: number,
  label: string,
  mode: "ghost" | "click-first" | "touch" | "burst" | "screen" = "ghost",
) {
  if (mode === "screen") {
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
  }
  const burst = mode === "burst" ? 3 : 1;
  let shot: Shot | null = null;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    shot = await aim(page, direction, mode === "screen" ? "point" : mode);
    if (shot) break;
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  }
  if (!shot) throw new Error(`${label}: no tappable ${direction < 0 ? "back" : "forward"} band`);
  if (mode === "screen") await page.touchscreen.tap(shot.x, shot.y);
  try {
    await page.waitForFunction(
      (want) => {
        const frame = document.querySelector("[data-breath-index]");
        const slot = document.querySelector(".breath-slot");
        return (
          frame?.getAttribute("data-breath-index") === String(want) &&
          slot instanceof HTMLElement &&
          slot.scrollTop < 4
        );
      },
      expected,
      { timeout: 4000 },
    );
  } catch (error) {
    const now = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
    const scroll = await page.locator(".breath-slot").evaluate((el) => (el as HTMLElement).scrollTop);
    const from = shot ? shot.from : "?";
    throw new Error(
      `${label}: index ${now} scroll ${scroll}, expected ${expected} after ${burst} (from ${from} pinned=${shot?.pinned} line=${shot?.lineTop} host=${shot?.hostTop} x=${shot?.x} y=${shot?.y}; ${error instanceof Error ? error.message : error})`,
    );
  }
  return shot;
}

async function lateGhost(page: Page, shot: Shot, expected: number, label: string) {
  await page.evaluate(
    ({ x, y }) => {
      const marker = window as Window & { __ghostDone?: boolean };
      marker.__ghostDone = false;
      window.setTimeout(() => {
        const host = document.querySelector("[data-reader-text]");
        if (host) {
          const mouse = {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 11,
            button: 0,
            pointerType: "mouse",
            isPrimary: true,
          };
          host.dispatchEvent(new PointerEvent("pointerdown", { ...mouse, buttons: 1 }));
          host.dispatchEvent(new PointerEvent("pointerup", { ...mouse, buttons: 0 }));
          host.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y }),
          );
        }
        marker.__ghostDone = true;
      }, 1700);
    },
    { x: shot.x, y: shot.y },
  );
  await page.waitForFunction(() => (window as Window & { __ghostDone?: boolean }).__ghostDone === true, {
    timeout: 8000,
  });
  const now = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
  assert.equal(Number(now), expected, `${label}: late click undid the tap`);
}

async function mix(
  page: Page,
  id: string,
  start: number,
  count: number,
  seed: number,
  label: string,
  length: number,
) {
  const random = rng(seed);
  const gaps = [0, 0, 0, 12, 16, 40, 90, 180];
  let index = start;
  const low = 1;
  const high = Math.max(low, length - 2);
  let n = 0;
  let late = 0;
  while (n < count) {
    if (n === 12) {
      await page.evaluate(() => {
        window.dispatchEvent(new Event("pagehide"));
        try {
          Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        } catch {
          /* the flag is already live */
        }
        document.dispatchEvent(new Event("visibilitychange"));
        try {
          Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        } catch {
          /* the flag is already live */
        }
        document.dispatchEvent(new Event("visibilitychange"));
        window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      });
    }
    if (n === 24) await page.setViewportSize({ width: 390, height: 700 });
    if (n === 25) await page.setViewportSize({ width: 390, height: 844 });
    let direction: 1 | -1 = random() < 0.46 ? -1 : 1;
    if (index <= low) direction = 1;
    if (index >= high) direction = -1;
    const roll = random();
    let mode: "ghost" | "click-first" | "touch" | "burst" | "screen" = "ghost";
    if (roll > 0.7) mode = "click-first";
    else if (roll > 0.42) mode = "touch";
    else if (roll > 0.28) mode = "burst";
    if (
      mode === "burst" &&
      (index + direction * 3 < low || index + direction * 3 > high || n + 3 > count)
    ) {
      mode = "ghost";
    }
    const jump = mode === "burst" ? 3 : 1;
    const next = index + direction * jump;
    const shot = await step(page, direction, next, `${label} ${id} tap ${n} ${mode}`, mode);
    index = next;
    n += jump;
    if (mode === "touch" && late < 4 && random() < 0.5) {
      await lateGhost(page, shot, index, `${label} ${id} tap ${n}`);
      late += 1;
    }
    const gap = gaps[Math.floor(random() * gaps.length)] ?? 0;
    if (gap) await new Promise((resolve) => setTimeout(resolve, gap));
  }
  return index;
}

async function importPdf(page: Page) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page
        .evaluate(() => sessionStorage.removeItem("keep-progress"))
        .catch(() => undefined);
      await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="file"]').setInputFiles({
        name: "stress.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(stressPdf()),
      });
      await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
      await passGate(page);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "0",
      );
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureServer();
    }
  }
  throw last;
}

test(
  "five hundred mixed taps step exactly one sentence, ten runs",
  { timeout: 1_800_000 },
  async () => {
    const stop = await ensureServer();
    const browser = await launchChromium();
    const wk = await launchWebkit();
    try {
      const ids = catalogIds();
      assert.ok(ids.length > 1000, "catalog ids missing");
      for (let run = 0; run < RUNS; run += 1) {
        const engine = wk && run % 2 === 1 ? wk : browser;
        const name = wk && run % 2 === 1 ? "webkit" : "chromium";
        const page = await phone(engine);
        await safeArea(page);
        const random = rng(1000 + run);
        const extra = ids
          .filter((id) => !ANCHORS.includes(id))
          .sort(() => random() - 0.5)
          .slice(0, 6);
        const books = [...ANCHORS, ...extra];
        let left = TAPS;
        const resumeId = "the-house-of-mirth";
        const resumed = chapterOpen(resumeId);
        assert.ok(resumed > 1, "house of mirth has no chapter boundary");
        await resume(page, resumeId, resumed);
        await step(page, -1, resumed - 1, `${name} run ${run} resume back`, "ghost");
        await step(page, 1, resumed, `${name} run ${run} resume forward`, "click-first");
        left -= 2;
        let guard = 0;
        while (left > 0 && guard < 40) {
          const id = books[guard % books.length] ?? resumeId;
          guard += 1;
          const length = breathCount(id);
          if (length < 8) continue;
          const bound = chapterOpen(id);
          const start =
            guard <= books.length && bound > 1 && bound < length - 3
              ? bound
              : Math.min(length - 3, 4 + Math.floor(random() * Math.min(30, length - 8)));
          await openAt(page, id, start);
          const touch = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
          assert.equal(touch, "manipulation", `${name} run ${run} still zooms on double tap`);
          const chunk = Math.min(left, 36);
          await mix(page, id, start, chunk, 4000 + run * 97 + start + guard, `${name} run ${run}`, length);
          left -= chunk;
        }
        assert.equal(left, 0, `${name} run ${run} tapped ${TAPS - left}, not ${TAPS}`);
        await importPdf(page);
        let pdfIndex = 0;
        let foundTall = false;
        for (let i = 0; i < 6; i += 1) {
          const overflows = await page.evaluate(
            () => document.querySelector(".breath-slot")?.classList.contains("overflows") === true,
          );
          if (overflows) {
            foundTall = true;
            break;
          }
          await step(page, 1, pdfIndex + 1, `${name} run ${run} pdf seek ${i}`, "ghost");
          pdfIndex += 1;
        }
        assert.equal(foundTall, true, `${name} run ${run} pdf had no sentence taller than the screen`);
        const pdfLength = Number(await page.locator(".reader-frame").getAttribute("data-breath-count"));
        assert.ok(pdfLength > pdfIndex + 1, `${name} run ${run} pdf long sentence is the last of ${pdfLength}`);
        const tallTop = await page.locator(".breath-slot").evaluate((el) => (el as HTMLElement).scrollTop);
        assert.ok(tallTop < 4, `${name} run ${run} pdf long sentence opened partway`);
        await step(page, 1, pdfIndex + 1, `${name} run ${run} pdf off the long sentence`, "ghost");
        await step(page, -1, pdfIndex, `${name} run ${run} pdf back onto the long sentence`, "click-first");
        const backTop = await page.locator(".breath-slot").evaluate((el) => (el as HTMLElement).scrollTop);
        assert.ok(backTop < 4, `${name} run ${run} pdf back stopped partway through the long sentence`);
        await mix(page, "page", pdfIndex, 8, 9000 + run, `${name} run ${run} pdf`, pdfLength);
        await page.close();
      }
    } finally {
      await browser.close();
      await wk?.close();
      await stop();
    }
  },
);

function gitNameDiff(from: string) {
  const rev = usableDiffBase(from);
  if (!rev) return { ok: false, text: "" };
  try {
    return {
      ok: true,
      text: execFileSync(
        "git",
        ["diff", "--name-status", "--diff-filter=ACDMRT", rev, "HEAD", "--", "src/lib/catalog/texts"],
        { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    };
  } catch {
    return { ok: false, text: "" };
  }
}

/** Books whose text this push added, edited, renamed, or removed. */
function changedBooksInPush() {
  const parts: string[] = [];
  const tip = gitNameDiff("HEAD^");
  if (tip.ok) parts.push(tip.text);
  const base = usableDiffBase(process.env.CATALOG_DIFF_BASE);
  if (base && base !== "HEAD^") {
    const pushed = gitNameDiff(base);
    if (pushed.ok) parts.push(pushed.text);
    else console.log(`catalog diff from ${base} unavailable; using the latest commit`);
  }
  return catalogIdsFromDiff(parts.join("\n"));
}

/**
 * One navigation. A page.goto timeout is thrown as Playwright sent it, so the
 * caller can retry that book once. A sentence that never binds fails here.
 */
async function openCatalogOnce(page: Page, id: string, at: number) {
  await page.evaluate(() => sessionStorage.removeItem("keep-progress")).catch(() => undefined);
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/${id}?at=${at}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
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
      return;
    } catch (error) {
      last = error;
      if (isPageGotoTimeout(error)) throw error;
      if (!readerDown(error) || attempt >= 2) break;
      await ensureServer();
    }
  }
  const message = last instanceof Error ? last.message.split("\n")[0] : String(last);
  throw new Error(`${id} at ${at} did not open (${message})`);
}

/** A goto timeout gets one fresh page. A step miss is never retried. */
async function openCatalogWithRetry(browser: Browser, page: Page, id: string, at: number) {
  try {
    await openCatalogOnce(page, id, at);
    return page;
  } catch (error) {
    if (!isPageGotoTimeout(error)) throw error;
    console.log(`page.goto timed out on ${id} at ${at}; retrying once`);
    await Promise.race([
      page.context().close().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const fresh = await phone(browser);
    try {
      await openCatalogOnce(fresh, id, at);
    } catch (retryError) {
      if (isPageGotoTimeout(retryError)) {
        throw new Error(`${id} at ${at} did not open (page.goto: Timeout 30000ms exceeded.)`);
      }
      throw retryError;
    }
    console.log(`page.goto retry opened ${id} at ${at}`);
    return fresh;
  }
}

function writeCatalogWalkFailure(error: unknown, mode: "sample" | "full") {
  const file = process.env.CATALOG_WALK_FAILURE_FILE;
  if (!file || mode !== "full") return;
  const message = error instanceof Error ? error.stack || error.message : String(error);
  try {
    writeFileSync(file, JSON.stringify({ message, mode }, null, 2));
  } catch (writeError) {
    console.error("could not record catalog walk failure", writeError);
  }
}

async function walkCatalog(browser: Browser, mode: "sample" | "full") {
  let page = await phone(browser);
  const ids = catalogIds();
  for (const anchor of CATALOG_WALK_ANCHORS) {
    assert.ok(ids.includes(anchor), `anchor ${anchor} is not in the catalog`);
  }
  const epochDay = resolveEpochDay(process.env.CATALOG_WALK_EPOCH_DAY);
  const changed = mode === "sample" ? changedBooksInPush() : [];
  const planned = mode === "full" ? ids : selectCatalogWalk({ ids, changed, epochDay, mode: "sample" });
  if (mode === "full") {
    console.log(`catalog walk full: ${planned.length} books`);
  } else {
    console.log(changed.length ? `catalog changed books: ${changed.join(" ")}` : "catalog changed books: none");
    console.log(`catalog walk sample: ${planned.length} books on epoch day ${epochDay}`);
    console.log(`catalog sample: ${planned.join(" ")}`);
  }
  let seen = 0;
  const stepped = new Set<string>();
  for (const id of planned) {
    const length = breathCount(id);
    if (length < 2) continue;
    const bound = chapterOpen(id);
    const at = bound > 0 ? Math.min(bound, length - 1) : Math.min(4, length - 1);
    page = await openCatalogWithRetry(browser, page, id, at);
    if (at > 0) {
      await step(page, -1, at - 1, `${id} back`);
      await step(page, 1, at, `${id} forward`);
    }
    seen += 1;
    stepped.add(id);
    if (mode === "full" && seen % 100 === 0) console.log(`catalog taps ${seen}/${ids.length}`);
  }
  if (mode === "full") {
    assert.ok(seen > 1000, `only ${seen} catalog books were tappable`);
  } else {
    for (const anchor of CATALOG_WALK_ANCHORS) {
      assert.ok(stepped.has(anchor), `anchor ${anchor} was not walked`);
    }
    for (const id of changed) {
      if (!ids.includes(id) || breathCount(id) < 2) continue;
      assert.ok(stepped.has(id), `changed book ${id} was not walked`);
    }
    const walkable = planned.filter((id) => breathCount(id) >= 2);
    assert.equal(stepped.size, walkable.length, "sample missed a walkable book");
    const least = Math.min(CATALOG_WALK_SAMPLE_SIZE, ids.length);
    assert.ok(planned.length >= least, `sample planned ${planned.length}, expected at least ${least}`);
    console.log(`catalog sample taps ${seen}`);
  }
  await page.close();
}

test(
  "catalog books step one sentence back and forward",
  { timeout: catalogWalkMode(process.env.CATALOG_WALK) === "sample" ? 600_000 : 2_700_000 },
  async () => {
    const mode = catalogWalkMode(process.env.CATALOG_WALK);
    let stop: (() => Promise<void>) | undefined;
    let browser: Browser | undefined;
    try {
      stop = await ensureServer();
      browser = await launchChromium();
      await walkCatalog(browser, mode);
    } catch (error) {
      writeCatalogWalkFailure(error, mode);
      throw error;
    } finally {
      await browser?.close();
      await stop?.();
    }
  },
);

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { isLocalBound } from "./catalog/full-pdf.ts";
import { unmeasuredBlocks } from "./display-blocks.ts";
import { quoteIntervals, sentenceSpans } from "./sentences.ts";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { skipWithoutWebKit, webKitRequired } from "./require-webkit.ts";
import { planGroups, waitGroup, type GroupPlace } from "./reader-group-tap.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];
const PHONE_VIEW = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };

type BlockSpot = {
  sentences: number;
  height: number;
  viewport: number;
  text: string;
};

function loadWork(id: string) {
  return JSON.parse(
    readFileSync(new URL(`./catalog/texts/${id}.json`, import.meta.url), "utf8"),
  ) as { breaths: { text: string }[] };
}

function longestMulti(id: string) {
  const work = loadWork(id);
  let best = 0;
  let bestLen = 0;
  work.breaths.forEach((breath, index) => {
    if (sentenceSpans(breath.text).length < 2) return;
    if (breath.text.length > bestLen) {
      bestLen = breath.text.length;
      best = index;
    }
  });
  return { index: best, length: bestLen };
}

function catalogLongest(max: number) {
  const dir = new URL("./catalog/texts/", import.meta.url);
  const picks: { id: string; index: number; length: number }[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const id = name.replace(/\.json$/, "");
    if (!isLocalBound(id)) continue;
    const found = longestMulti(id);
    if (found.length > 0) picks.push({ id, index: found.index, length: found.length });
  }
  picks.sort((a, b) => b.length - a.length);
  return picks.slice(0, max);
}

/**
 * WebKit is the phone check. Deploy smoke installs it and sets
 * REQUIRE_WEBKIT=1, so a missing browser fails instead of falling back.
 */
async function launch() {
  try {
    return await webkit.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/Executable doesn't exist|browserType\.launch|missing dependencies|shared libraries/.test(message)) {
      throw error;
    }
    if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
    try {
      execFileSync("npx", ["playwright", "install", "webkit"], { stdio: "inherit", timeout: 180_000 });
      return await webkit.launch();
    } catch {
      return chromium.launch();
    }
  }
}

async function phonePage(browser: Browser, viewport = PHONE_VIEW) {
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

async function openAt(page: Page, id: string, at: number) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${ORIGIN}/salon/read/${id}?at=${at}`, { waitUntil: "domcontentloaded" });
      await page.locator(".breath-now").waitFor({ timeout: 30_000 });
      await page.waitForFunction(
        (want) => {
          const frame = document.querySelector(".reader-frame");
          return (
            frame?.getAttribute("data-bound") === "full" &&
            frame?.getAttribute("data-breath-index") === String(want) &&
            frame?.getAttribute("data-display-blocks") === "ready" &&
            frame?.getAttribute("data-face-ready") === "yes" &&
            !document.querySelector(".veil")
          );
        },
        at,
        { timeout: 30_000 },
      );
      await page.evaluate(() => document.fonts.ready);
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  const state = await page
    .evaluate(() => {
      const frame = document.querySelector(".reader-frame");
      return {
        bound: frame?.getAttribute("data-bound") ?? "",
        index: frame?.getAttribute("data-breath-index") ?? "",
        count: frame?.getAttribute("data-breath-count") ?? "",
        ready: frame?.getAttribute("data-display-blocks") ?? "",
        veil: Boolean(document.querySelector(".veil")),
      };
    })
    .catch(() => null);
  const message = last instanceof Error ? last.message : String(last);
  throw new Error(`${id} @ ${at} (${JSON.stringify(state)}): ${message}`);
}

async function blocks(page: Page, root = ""): Promise<BlockSpot[]> {
  return page.evaluate((selector) => {
    const viewport = window.visualViewport?.height || window.innerHeight;
    const host = selector ? document.querySelector(selector) : document;
    return [...(host?.querySelectorAll<HTMLElement>("[data-block-sentences]") ?? [])].map((node) => ({
      sentences: Number(node.getAttribute("data-block-sentences")),
      height: node.offsetHeight,
      viewport,
      text: node.textContent ?? "",
    }));
  }, root);
}

/** A block may pass the third only when every sentence join sits inside a quotation. */
function heldQuote(text: string) {
  const spans = sentenceSpans(text, "in-quotes");
  if (spans.length <= 1) return true;
  const quotes = quoteIntervals(text);
  for (let i = 0; i < spans.length - 1; i += 1) {
    const boundary = spans[i]!.end;
    if (!quotes.some((range) => range.start < boundary && range.end > boundary)) return false;
  }
  return true;
}

function assertBlockHeights(spots: BlockSpot[], label: string) {
  const laid = spots.filter((spot) => spot.height > 0);
  assert.ok(laid.length > 0, `${label} rendered no blocks`);
  const viewport = laid[0]?.viewport ?? 0;
  assert.ok(viewport > 200, `${label} viewport ${viewport}`);
  const limit = Math.floor(viewport / 3);
  for (const spot of laid) {
    if (spot.sentences <= 1) continue;
    if (spot.height <= limit + 1) continue;
    assert.ok(
      heldQuote(spot.text),
      `${label} multi-sentence block is ${spot.height}px, past a third of ${viewport}px, and it is not one quotation: ${spot.text.slice(0, 80)}`,
    );
  }
}

async function column(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector("[data-reader-text]");
    const frame = document.querySelector("[data-breath-index]");
    if (!host || !frame) return null;
    const box = host.getBoundingClientRect();
    return {
      index: Number(frame.getAttribute("data-breath-index")),
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      bottom: box.bottom,
    };
  });
}

test(
  "paragraph blocks stay within a third of an iPhone viewport on WebKit",
  { timeout: 600_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phonePage(browser);
      const viewport = page.viewportSize();
      assert.equal(viewport?.width, 390);
      assert.equal(viewport?.height, 844);

      const visits = [
        { id: "moby-dick", index: 0, label: "moby-dick opening" },
        { id: "moby-dick", index: longestMulti("moby-dick").index, label: "moby-dick longest" },
        { id: "the-price-of-love", index: 0, label: "fleckring pinafore" },
        ...catalogLongest(6).map((pick) => ({
          id: pick.id,
          index: pick.index,
          label: `${pick.id} longest`,
        })),
      ];

      for (const visit of visits) {
        await openAt(page, visit.id, visit.index);
        const shown = await blocks(page);
        assertBlockHeights(shown, visit.label);
        const book = loadWork(visit.id).breaths[visit.index]?.text ?? "";
        assert.ok(sentenceSpans(book).length > 1, `${visit.label} is one sentence`);
        const focus = await page.evaluate(() => {
          const nodes = [...document.querySelectorAll(".breath-now .breath-block:not([data-window-lead])")];
          return {
            first: nodes[0]?.textContent ?? "",
            joined: nodes.map((node) => node.textContent ?? "").join(""),
          };
        });
        const normalized = (value: string) => value.replace(/\s+/g, " ").trim();
        const first = normalized(focus.first);
        assert.ok(focus.joined.trim().length > 40, `${visit.label} focus was empty`);
        assert.ok(first.length > 0, `${visit.label} first block was empty`);
        assert.ok(
          normalized(book).startsWith(first.slice(0, 48)),
          `${visit.label} focus is not the book text`,
        );
        const focusCount = await page.locator(".breath-now .breath-block").count();
        assert.ok(focusCount >= 1, `${visit.label} focus was empty`);
      }

      await openAt(page, "moby-dick", 0);
      const portrait = await blocks(page);
      assert.ok(portrait.some((spot) => spot.sentences > 1 && spot.height / spot.viewport <= 0.34));
      await page.setViewportSize(LANDSCAPE);
      await page.waitForFunction(
        (height) => {
          const frame = document.querySelector("[data-display-blocks]");
          const got = Number(frame?.getAttribute("data-block-viewport"));
          return (
            frame?.getAttribute("data-display-blocks") === "ready" &&
            Number.isFinite(got) &&
            Math.abs(got - height) <= 4
          );
        },
        LANDSCAPE.height,
        { timeout: 10_000 },
      );
      const turned = await blocks(page);
      assert.equal(turned[0]?.viewport, LANDSCAPE.height);
      assertBlockHeights(turned, "moby-dick landscape");

      await page.setViewportSize(PHONE_VIEW);
      await openAt(page, "moby-dick", 0);
      const spot = await column(page);
      assert.ok(spot);
      const forward = {
        x: Math.round(spot.left + spot.width * 0.72),
        y: Math.round(spot.top + spot.height * 0.42),
      };
      const forwardPlan = await planGroups(page, 1, 1);
      assert.notEqual(forwardPlan, "end");
      await page.touchscreen.tap(forward.x, forward.y);
      await waitGroup(page, forwardPlan as GroupPlace);
      const back = {
        x: Math.round(spot.left + Math.max(12, spot.width * 0.12)),
        y: forward.y,
      };
      const again = await column(page);
      assert.ok(again);
      const backPlan = await planGroups(page, -1, 1);
      assert.notEqual(backPlan, "start");
      await page.touchscreen.tap(
        Math.round(again.left + Math.max(12, again.width * 0.12)),
        Math.round(again.top + again.height * 0.42),
      );
      await waitGroup(page, backPlan as GroupPlace);
      assert.equal(back.x > 0, true);

      await page.close();
    } finally {
      await browser.close();
      await stop();
    }
  },
);

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

/** Lines that do not end a sentence join into one breath. Long lines span pages. */
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
  const xref = pdf.length;
  const size = chunks.length + 1;
  pdf += `xref\n0 ${size}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < size; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

test(
  "an imported PDF splits a long paragraph and leaves a single tall sentence whole",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phonePage(browser);
      const lines = [
        "The imported paragraph opens on this sentence and keeps going.",
        "A second sentence follows with enough words to fill another line of the page.",
        "A third sentence adds still more of the same paragraph before the stop.",
        "A fourth sentence continues the thought without starting a new paragraph.",
        "A fifth sentence is here so the block cannot stay one wall on a phone.",
        "A sixth sentence lands before the paragraph is willing to end.",
        "A seventh sentence keeps the measure honest across the column width.",
        "An eighth sentence closes the long imported paragraph at last.",
      ];
      const wall = ["This single imported sentence keeps running"];
      for (let i = 0; i < 48; i += 1) {
        wall.push(`and clause ${String(i).padStart(2, "0")} stays inside the same sentence`);
      }
      wall.push("until the one sentence finally ends.");
      await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="file"]').setInputFiles({
        name: "paragraphs.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(pdfFromLines([...lines, ...wall])),
      });
      await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
      const sit = page.getByRole("button", { name: "Sit", exact: true });
      const alone = page.getByRole("button", { name: "Alone", exact: true });
      await sit.or(alone).first().waitFor();
      await sit.or(alone).first().click();
      await page.locator("[data-display-blocks]").waitFor();
      await page.waitForFunction(
        () =>
          !document.querySelector(".veil") &&
          document.querySelector("[data-display-blocks]")?.getAttribute("data-display-blocks") === "ready",
        { timeout: 30_000 },
      );
      const breathCount = Number(
        await page.locator("[data-breath-count]").getAttribute("data-breath-count"),
      );
      assert.ok(breathCount >= 9, `pdf imported ${breathCount} breaths`);
      let sawSingleTall = false;
      let stepped = 0;
      for (let step = 0; step < breathCount; step += 1) {
        await page.waitForFunction(
          () => document.querySelector("[data-display-blocks]")?.getAttribute("data-display-blocks") === "ready",
          { timeout: 8000 },
        );
        const shown = await blocks(page);
        assertBlockHeights(shown, `pdf step ${step}`);
        const tallSingle = await page.evaluate(() => {
          const viewport = window.visualViewport?.height || window.innerHeight;
          return [...document.querySelectorAll<HTMLElement>(".breath-now .breath-block")].some((node) => {
            const count = Number(node.getAttribute("data-block-sentences"));
            return count === 1 && node.offsetHeight / viewport > 0.34;
          });
        });
        if (tallSingle) sawSingleTall = true;
        if (step === breathCount - 1) break;
        const spot = await column(page);
        assert.ok(spot, "pdf column missing");
        const planned = await planGroups(page, 1, 1);
        if (planned === "end" || planned === "start") break;
        const before = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
        await page.touchscreen.tap(
          Math.round(spot.left + spot.width * 0.72),
          Math.round(spot.top + spot.height * 0.42),
        );
        try {
          await waitGroup(page, planned);
        } catch (error) {
          const now = await page.locator(".reader-frame").getAttribute("data-spotlight-key");
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`pdf step ${step}: key ${now}, one group is ${planned.index}:${planned.cursor}:${planned.window} from ${before} (${message})`);
        }
        stepped += 1;
      }
      assert.ok(stepped >= 4, "pdf taps did not keep moving one group at a time");
      assert.equal(sawSingleTall, true, "pdf single tall sentence was split or shrunk");
      await page.close();
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "standalone resume still splits when the viewport height arrives without a resize",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const saved = JSON.stringify({
        state: {
          sittingMinutes: 0,
          progress: {
            "moby-dick": {
              breathIndex: 28,
              breathId: "s3-0",
              breathCount: 2472,
              lastOpenedAt: Date.now(),
              sittingStartedAt: Date.now() - 60_000,
              keywords: {},
              kept: [],
              completedAt: null,
              entered: true,
            },
          },
        },
        version: 2,
      });
      async function openBlind(url: string, index: string, text: string) {
        const context = await browser.newContext({
          viewport: PHONE_VIEW,
          screen: PHONE_VIEW,
          hasTouch: true,
          isMobile: true,
          deviceScaleFactor: PHONE.deviceScaleFactor,
          userAgent: PHONE.userAgent,
        });
        const page = await context.newPage();
        await page.addInitScript((raw) => {
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
          localStorage.setItem("vellum-v1", raw);
          Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 0 });
          const visual = window.visualViewport;
          if (visual) Object.defineProperty(visual, "height", { configurable: true, get: () => 0 });
        }, saved);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(
          (want) => {
            const frame = document.querySelector(".reader-frame");
            return (
              frame?.getAttribute("data-bound") === "full" &&
              frame.getAttribute("data-breath-index") === want &&
              document.querySelector(".breath-now .breath-block")
            );
          },
          index,
          { timeout: 30_000 },
        );
        const blind = await blocks(page, ".breath-now");
        const packed = unmeasuredBlocks(text);
        assert.ok(blind.length > 0, `${url} painted no blocks while the viewport was 0`);
        assert.deepEqual(
          blind.map((spot) => spot.sentences),
          packed.map((block) => block.sentences),
          `${url} first paint did not use the phone packing`,
        );
        if (index === "0") {
          assert.deepEqual(
            blind.map((spot) => spot.sentences),
            [2, 1, 1, 3, 1],
            `${url} flashed one block per sentence`,
          );
        }
        for (const spot of blind) assert.doesNotMatch(spot.text, /^\s/);
        await page.evaluate(() => {
          Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 844 });
          const visual = window.visualViewport;
          if (visual) Object.defineProperty(visual, "height", { configurable: true, get: () => 844 });
        });
        await page.waitForFunction(
          () => document.querySelector("[data-display-blocks]")?.getAttribute("data-display-blocks") === "ready",
          null,
          { timeout: 8_000 },
        );
        const shown = await blocks(page);
        assertBlockHeights(shown, url);
        assert.ok(shown.length > 1, `${url} stayed one block after the viewport arrived`);
        await context.close();
      }
      const moby = loadWork("moby-dick");
      await openBlind(`${ORIGIN}/salon/read/moby-dick`, "28", moby.breaths[28]?.text ?? "");
      await openBlind(`${ORIGIN}/salon/read/moby-dick?at=0`, "0", moby.breaths[0]?.text ?? "");
    } finally {
      await browser.close();
      await stop();
    }
  },
);

const NESTED_QUOTE =
  "He leaned back. “My father used to say to me, ‘Never lend money to a friend. You will lose the money. You will lose the friend. And worst of all you will lose your good opinion of yourself.’ I did not listen to him, of course. Nobody listens to fathers. That is what fathers are for, I suppose, to be ignored until it is too late to matter.” He laughed.";

/**
 * Mira's 232/116/261/261/377/232/377/58 figures are the character estimate
 * (ceil(chars / 29.5) * 29). WebKit with the self-hosted Cormorant face
 * paints a shorter line, so those two "377" sentences fit in the third.
 */
test(
  "a WebKit phone with Cormorant splits a quote only when the quote itself exceeds a third",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phonePage(browser);
      const faceOf = async () =>
        page.evaluate(() => {
          const block = document.querySelector(".breath-now .breath-block");
          const frame = document.querySelector(".reader-frame");
          const style = block ? getComputedStyle(block) : null;
          const viewport = window.visualViewport?.height || window.innerHeight;
          return {
            family: style?.fontFamily ?? "",
            size: Number.parseFloat(style?.fontSize ?? "0"),
            line: Number.parseFloat(style?.lineHeight ?? "0"),
            width: block?.clientWidth ?? 0,
            limit: Number(frame?.getAttribute("data-block-limit") ?? "0"),
            face: frame?.getAttribute("data-face-ready") ?? "",
            check: document.fonts.check('400 20px "Cormorant Garamond"'),
            viewport,
          };
        });

      await openAt(page, "cranford", 46);
      const face = await faceOf();
      // CI WebKit quotes the computed family. Local WebKit does not.
      const primary = face.family.replace(/["']/g, "").split(",")[0]?.trim();
      assert.equal(primary, "Cormorant Garamond");
      assert.equal(face.check, true);
      assert.equal(face.face, "yes");
      assert.equal(face.viewport, 844);
      assert.equal(face.limit, 281);
      assert.ok(Math.abs(face.line - face.size * 1.45) < 0.2, `line ${face.line} size ${face.size}`);
      assert.ok(face.width > 320 && face.width < 360, `column ${face.width}`);

      const third = 281;
      const s24 = await blocks(page, ".breath-now");
      assert.ok(s24.length > 1);
      assert.match(s24[0]?.text ?? "", /Lord Mauleverer/);
      assert.match(s24[0]?.text ?? "", /little town/);
      const mundane = s24.filter((spot) => spot.text.includes("mundane failings"));
      const aristocracy = s24.find((spot) => spot.text.includes("British aristocracy"));
      assert.equal(mundane.length, 1);
      assert.doesNotMatch(mundane[0]?.text ?? "", /British aristocracy/);
      assert.equal(mundane[0]?.sentences, 1);
      assert.ok((mundane[0]?.height ?? 0) <= third);
      assert.ok(aristocracy);
      assert.doesNotMatch(aristocracy?.text ?? "", /mundane failings/);
      assert.ok((aristocracy?.height ?? 999) <= third, `aristocracy ${aristocracy?.height}px`);
      for (const spot of s24) {
        assert.ok(spot.sentences >= 1, `s2-4 sentence count ${spot.sentences}`);
        if (spot.sentences > 1) assert.ok(spot.height <= third, `${spot.height}px ${spot.text.slice(0, 40)}`);
      }
      assert.equal(
        s24.reduce((sum, spot) => sum + spot.sentences, 0),
        Number(await page.locator(".breath-now").getAttribute("data-sentence-count")),
      );

      await openAt(page, "cranford", 14);
      const s014 = await blocks(page, ".breath-now");
      const advice = s014.find((spot) => spot.text.includes("kill the poor creature"));
      assert.match(advice?.text ?? "", /alive\. But my advice is, kill the poor creature at once/);
      for (const spot of s014) assert.ok(spot.height <= third, `${spot.height}`);

      await openAt(page, "cranford", 59);
      const s217 = await blocks(page, ".breath-now");
      assert.equal(s217.length, 1);
      assert.match(s217[0]?.text ?? "", /Come in—come to my sister/);
      assert.ok((s217[0]?.height ?? 0) <= third);

      await openAt(page, "cranford", 78);
      const s236 = await blocks(page, ".breath-now");
      const light = s236.filter((spot) => spot.text.includes("A light came into Miss Jessie"));
      assert.equal(light.length, 1);
      assert.match(light[0]?.text ?? "", /He knows now how you loved him/);
      assert.ok((light[0]?.height ?? 0) <= third);

      await openAt(page, "new-grub-street", 511);
      const s785 = await blocks(page, ".breath-now");
      const fellow = s785.filter((spot) => spot.text.includes("do you suppose"));
      const right = s785.filter((spot) => spot.text.includes("abundantly right"));
      assert.equal(fellow.length, 1);
      assert.doesNotMatch(fellow[0]?.text ?? "", /abundantly right/);
      assert.equal(right.length, 1);
      assert.doesNotMatch(right[0]?.text ?? "", /do you suppose/);
      assert.ok((right[0]?.sentences ?? 0) >= 1);
      assert.ok((right[0]?.height ?? 0) <= third, `abundantly ${right[0]?.height}px`);
      assert.ok(
        (right[0]?.height ?? 0) >= third / 3,
        `abundantly tail stayed a stub at ${right[0]?.height}px`,
      );
      for (const spot of s785) {
        assert.ok(spot.sentences >= 1, `s7-85 sentence count ${spot.sentences}`);
        if (spot.sentences > 1) assert.ok(spot.height <= third, `${spot.height}px ${spot.text.slice(0, 40)}`);
      }

      await openAt(page, "moby-dick", 867);
      const s461 = await blocks(page, ".breath-now");
      const tall = s461.filter((spot) => spot.height > third);
      assert.ok(tall.length >= 2);
      for (const spot of tall) assert.equal(spot.sentences, 1);
      assert.ok(tall.some((spot) => spot.text.includes("than Moby Dick")));
      assert.ok(tall.some((spot) => spot.text.includes("final dash")));

      const nested = await page.evaluate(async (sample: string) => {
        const specifier = "/salon/src/lib/" + "display-blocks.ts";
        const mod = (await import(specifier)) as {
          measureStyledHeight: (
            text: string,
            metrics: {
              width: number;
              viewport: number;
              limit: number;
              fontFamily: string;
              fontSize: string;
              fontWeight: string;
              fontStyle: string;
              lineHeight: string;
              letterSpacing: string;
              faceReady: boolean;
            },
          ) => number;
          packDisplayBlocks: (
            text: string,
            measure: (value: string) => number,
            limit: number,
          ) => { text: string; sentences: number }[];
        };
        const block = document.querySelector(".breath-now .breath-block");
        const style = block ? getComputedStyle(block) : null;
        if (!block || !style) return [];
        const viewport = window.visualViewport?.height || window.innerHeight;
        const metrics = {
          width: block.clientWidth,
          viewport,
          limit: Math.floor(viewport / 3),
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          faceReady: true,
        };
        return mod
          .packDisplayBlocks(sample, (value) => mod.measureStyledHeight(value, metrics), metrics.limit)
          .map((item) => ({
            sentences: item.sentences,
            height: Math.round(mod.measureStyledHeight(item.text, metrics)),
            text: item.text,
          }));
      }, NESTED_QUOTE);
      assert.equal(nested.length, 1);
      assert.match(nested[0]?.text ?? "", /Nobody listens to fathers\. That is what fathers are for/);
      assert.ok((nested[0]?.height ?? 0) <= third);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

type GlyphSpot = {
  selector: string;
  missing: boolean;
  differ: number;
  sampled: number;
  fill: string;
  color: string;
  text: string;
};

function fillIsClear(value: string) {
  return value === "transparent" || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(value);
}

/** Pixels in each box that differ from that element's own background. */
async function glyphSpots(page: Page, selectors: string[]): Promise<GlyphSpot[]> {
  // Playwright otherwise waits for document.fonts.ready, which never settles while the files are withheld.
  process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
  const shot = await page.screenshot({ type: "png", scale: "css" });
  return page.evaluate(
    async ({ href, selectors: wanted }) => {
      const img = new Image();
      img.src = href;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return [];
      ctx.drawImage(img, 0, 0);
      const scale = img.naturalWidth / (window.visualViewport?.width || window.innerWidth);
      const parse = (value: string) => {
        const match = value.match(
          /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/,
        );
        if (!match) return null;
        return [
          Number(match[1]),
          Number(match[2]),
          Number(match[3]),
          match[4] === undefined ? 1 : Number(match[4]),
        ] as const;
      };
      const backgroundOf = (el: Element) => {
        let node: Element | null = el;
        while (node) {
          const parsed = parse(getComputedStyle(node).backgroundColor);
          if (parsed && parsed[3] > 0.5) return parsed;
          node = node.parentElement;
        }
        return [243, 241, 235, 1] as const;
      };
      return wanted.map((selector) => {
        const el = document.querySelector(selector);
        if (!el) {
          return { selector, missing: true, differ: 0, sampled: 0, fill: "", color: "", text: "" };
        }
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const inset = 1;
        const x0 = Math.max(0, Math.floor((rect.x + inset) * scale));
        const y0 = Math.max(0, Math.floor((rect.y + inset) * scale));
        const x1 = Math.min(canvas.width, Math.ceil((rect.right - inset) * scale));
        const y1 = Math.min(canvas.height, Math.ceil((rect.bottom - inset) * scale));
        const bg = backgroundOf(el);
        let differ = 0;
        let sampled = 0;
        if (x1 > x0 && y1 > y0) {
          const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
          for (let i = 0; i < data.length; i += 4) {
            sampled += 1;
            const dist = Math.hypot(data[i]! - bg[0], data[i + 1]! - bg[1], data[i + 2]! - bg[2]);
            if (dist > 28) differ += 1;
          }
        }
        return {
          selector,
          missing: false,
          differ,
          sampled,
          fill: style.getPropertyValue("-webkit-text-fill-color"),
          color: style.color,
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
        };
      });
    },
    { href: `data:image/png;base64,${shot.toString("base64")}`, selectors },
  );
}

test(
  "WebKit: withheld webfonts paint no fallback glyphs at 390x844",
  { timeout: 180_000 },
  async (t) => {
    process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
    const stop = await ensureReaderServer();
    let sawWebKit = false;
    const engines: { name: "webkit" | "chromium"; open: () => Promise<Browser> }[] = [
      { name: "webkit", open: () => webkit.launch() },
      { name: "chromium", open: () => chromium.launch({ args: ["--no-sandbox"] }) },
    ];
    try {
      engineLoop: for (const engine of engines) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
        let browser: Browser;
        try {
          browser = await engine.open();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (
            engine.name === "webkit" &&
            /Executable doesn't exist|browserType\.launch|missing dependencies|shared libraries/.test(
              message,
            )
          ) {
            if (webKitRequired()) throw new Error("WebKit is not installed; REQUIRE_WEBKIT=1");
            continue engineLoop;
          }
          throw error;
        }
        if (engine.name === "webkit") sawWebKit = true;
        let releaseFonts = () => {};
        let retry = false;
        try {
          const context = await browser.newContext({
            viewport: PHONE_VIEW,
            screen: PHONE_VIEW,
            hasTouch: true,
            isMobile: true,
            deviceScaleFactor: 1,
            userAgent: PHONE.userAgent,
          });
          let held = 0;
          let open = true;
          const gate = new Promise<void>((resolve) => {
            releaseFonts = () => {
              if (!open) return;
              open = false;
              resolve();
            };
          });
          await context.route(/\.woff2(\?|$)/, async (route) => {
            held += 1;
            await gate;
            await route.continue().catch(() => {});
          });
          const page = await context.newPage();
          await page.addInitScript(() => {
            const leaks: { text: string; fill: string; color: string }[] = [];
            const clear = (value: string) =>
              value === "transparent" || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(value);
            const sample = () => {
              const faces = document.documentElement.dataset.faces ?? "";
              if (faces === "ready") return;
              for (const selector of [
                ".breath-now",
                ".wordmark-name",
                ".type-kicker",
                ".type-chrome",
              ]) {
                const el = document.querySelector(selector);
                const text = (el?.textContent ?? "").replace(/\s+/g, " ").trim();
                if (!el || text.length < 2) continue;
                const style = getComputedStyle(el);
                const fill = style.getPropertyValue("-webkit-text-fill-color");
                const color = style.color;
                if (!clear(fill) || !clear(color))
                  leaks.push({ text: text.slice(0, 60), fill, color });
              }
            };
            const loop = () => {
              sample();
              requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
            (window as unknown as { __faceLeaks: typeof leaks }).__faceLeaks = leaks;
          });
          await page.goto(`${ORIGIN}/salon/read/moby-dick?at=60`, {
            waitUntil: "domcontentloaded",
          });
          await page.waitForFunction(
            () => (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().length > 2,
            { timeout: 20_000 },
          );
          assert.notEqual(
            await page.evaluate(() => document.documentElement.dataset.faces ?? ""),
            "ready",
            "faces became ready while the font files were still withheld",
          );
          assert.ok(held > 0, "no webfont request was withheld");
          const heldSpots = await glyphSpots(page, [
            ".wordmark-name",
            ".breath-now",
            ".type-kicker",
          ]);
          const present = heldSpots.filter((spot) => !spot.missing && spot.text.length > 1);
          assert.ok(present.length > 0, `nothing to sample: ${JSON.stringify(heldSpots)}`);
          for (const spot of present) {
            assert.ok(
              fillIsClear(spot.fill) && fillIsClear(spot.color),
              `${spot.selector} fill ${spot.fill} color ${spot.color}`,
            );
            assert.ok(
              spot.differ <= 8,
              `${spot.selector} painted ${spot.differ} fallback pixels (${spot.text})`,
            );
          }
          const breathHeld = present.find((spot) => spot.selector === ".breath-now");
          if (breathHeld) assert.match(breathHeld.text, /landlord/i);
          else {
            const wordmark = present.find((spot) => spot.selector === ".wordmark-name");
            assert.ok(
              wordmark && /tbr/i.test(wordmark.text),
              `shell missing while the book waited: ${JSON.stringify(heldSpots)}`,
            );
          }

          await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
          const file = page.locator('input[type="file"]');
          await file.waitFor({ state: "attached", timeout: 15_000 });
          const lines = [
            "The imported paragraph opens on this sentence and keeps going.",
            "A second sentence follows with enough words to fill another line of the page.",
          ];
          await file.setInputFiles({
            name: "paragraphs.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from(pdfFromLines(lines)),
          });
          await page.waitForURL(/\/read\/page/, { timeout: 20_000, waitUntil: "commit" });
          const sit = page.getByRole("button", { name: "Sit", exact: true });
          const alone = page.getByRole("button", { name: "Alone", exact: true });
          await sit.or(alone).first().waitFor({ timeout: 15_000 });
          await sit.or(alone).first().click();
          await page
            .locator(".breath-now")
            .filter({ hasText: "imported paragraph" })
            .waitFor({ timeout: 15_000 });
          assert.notEqual(
            await page.evaluate(() => document.documentElement.dataset.faces ?? ""),
            "ready",
          );
          const pdfHeld = await glyphSpots(page, [".breath-now"]);
          const pdfSpot = pdfHeld[0];
          assert.ok(pdfSpot && !pdfSpot.missing, "imported breath was not on screen");
          assert.match(pdfSpot.text, /imported paragraph/);
          assert.ok(fillIsClear(pdfSpot.fill) && fillIsClear(pdfSpot.color), pdfSpot.fill);
          assert.ok(pdfSpot.differ <= 8, `imported PDF painted ${pdfSpot.differ} fallback pixels`);

          releaseFonts();
          await page.waitForFunction(
            () =>
              document.documentElement.dataset.faces === "ready" &&
              (document.querySelector(".breath-now")?.textContent ?? "").length > 20,
            { timeout: 30_000 },
          );
          const shown = await glyphSpots(page, [".breath-now"]);
          const breath = shown[0];
          assert.ok(breath && !breath.missing, "breath missing after the faces loaded");
          assert.ok(
            breath.differ > 40,
            `ready breath painted only ${breath.differ} pixels (${breath.text})`,
          );
          assert.equal(await page.evaluate(() => document.documentElement.dataset.faces), "ready");
          const leaks = await page.evaluate(
            () =>
              (
                window as unknown as {
                  __faceLeaks?: { text: string; fill: string; color: string }[];
                }
              ).__faceLeaks ?? [],
          );
          assert.deepEqual(
            leaks,
            [],
            `fallback ink before the faces were ready: ${JSON.stringify(leaks.slice(0, 4))}`,
          );
          const gaps = await page.evaluate(() => {
            const width = (family: string, style: string) => {
              const probe = document.createElement("span");
              probe.textContent = "Hamburgefonts";
              probe.style.cssText = `position:fixed;visibility:hidden;white-space:nowrap;font-size:100px;font-weight:400;font-style:${style};font-family:${family}`;
              document.body.appendChild(probe);
              const value = probe.getBoundingClientRect().width;
              probe.remove();
              return value;
            };
            return {
              cormorant: Math.abs(
                width('"Cormorant Garamond"', "normal") - width("serif", "normal"),
              ),
              italic: Math.abs(width('"Cormorant Garamond"', "italic") - width("serif", "italic")),
              outfit: Math.abs(width('"Outfit"', "normal") - width("sans-serif", "normal")),
            };
          });
          assert.ok(
            gaps.cormorant >= 6 && gaps.italic >= 6 && gaps.outfit >= 6,
            JSON.stringify(gaps),
          );
          await page.goto(`${ORIGIN}/salon/read/moby-dick?at=60`, {
            waitUntil: "domcontentloaded",
          });
          await page
            .locator(".breath-now")
            .filter({ hasText: "landlord" })
            .waitFor({ timeout: 20_000 });
          const bookShown = await glyphSpots(page, [".breath-now"]);
          const bookBreath = bookShown[0];
          assert.ok(
            bookBreath && !bookBreath.missing,
            "book breath missing after the faces loaded",
          );
          assert.match(bookBreath.text, /landlord/i);
          assert.ok(bookBreath.differ > 40, `book breath painted only ${bookBreath.differ} pixels`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // A second WebKit in the smoke suite can crash this browser while fonts are withheld.
          retry = attempt === 0 && /internal error|has been closed/.test(message);
          if (!retry) throw error;
        } finally {
          releaseFonts();
          await browser.close().catch(() => {});
        }
        if (!retry) break;
        }
      }
    } finally {
      await stop();
    }
    if (!sawWebKit) skipWithoutWebKit(t);
  },
);

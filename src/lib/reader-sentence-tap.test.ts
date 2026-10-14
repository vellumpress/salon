import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";
import { groupKey, planGroups, waitGroup, type GroupPlace } from "./reader-group-tap.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

function fixturePdf(lines: string[]): Uint8Array {
  const stream = ["BT", "/F1 12 Tf", "72 740 Td"];
  lines.forEach((line, i) => {
    if (i > 0) stream.push("0 -28 Td");
    stream.push(`(${pdfEscape(line)}) Tj`);
  });
  stream.push("ET");
  const body = stream.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n",
    `5 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

async function launch(name: "chromium" | "webkit"): Promise<Browser> {
  if (name === "webkit") return webkit.launch();
  return chromium.launch({ args: ["--no-sandbox"] });
}

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    userAgent: PHONE.userAgent,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.clear();
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
  });
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
            frame.getAttribute("data-breath-index") === String(want) &&
            frame.getAttribute("data-display-blocks") === "ready" &&
            frame.getAttribute("data-face-ready") === "yes" &&
            !document.querySelector(".veil")
          );
        },
        at,
        { timeout: 30_000 },
      );
      return;
    } catch (error) {
      last = error;
      if (!readerDown(error) || attempt === 2) break;
      await ensureReaderServer();
    }
  }
  throw last;
}

async function place(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const focuses = [...document.querySelectorAll("[data-focus-sentence]")];
    const focus = focuses[0] ?? null;
    const slot = document.querySelector(".breath-slot");
    const host = document.querySelector("[data-reader-text]");
    const pane = document.querySelector(".reading-pane");
    const block = focus?.closest(".breath-block");
    const blocks = [...document.querySelectorAll(".breath-now .breath-block")];
    const hostBox = host?.getBoundingClientRect();
    let focusTop = Infinity;
    let focusBottom = -Infinity;
    for (const node of focuses) {
      const box = node.getBoundingClientRect();
      if (box.height <= 0) continue;
      focusTop = Math.min(focusTop, box.top);
      focusBottom = Math.max(focusBottom, box.bottom);
    }
    const focusBox = Number.isFinite(focusBottom)
      ? { top: focusTop, height: focusBottom - focusTop, bottom: focusBottom }
      : null;
    const paneBox = pane?.getBoundingClientRect();
    let sentencesBefore = 0;
    for (const item of blocks) {
      if (item === block) break;
      sentencesBefore += Number(item.getAttribute("data-block-sentences") ?? 1);
    }
    return {
      index: Number(frame?.getAttribute("data-breath-index") ?? -1),
      cursor: Number(frame?.getAttribute("data-sentence-at") ?? -1),
      window: Number(frame?.getAttribute("data-spotlight-window") ?? 0),
      key: frame?.getAttribute("data-spotlight-key") ?? "",
      count: Number(frame?.getAttribute("data-sentence-count") ?? 0),
      text: focuses
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
      focusHeight: focusBox?.height ?? 0,
      block: block ? blocks.indexOf(block) : -1,
      blockSentences: Number(block?.getAttribute("data-block-sentences") ?? 0),
      sentencesBefore,
      scrollTop: slot instanceof HTMLElement ? slot.scrollTop : -1,
      standalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
      focusMid: focusBox ? focusBox.top + focusBox.height / 2 : -1,
      anchor:
        hostBox && paneBox
          ? paneBox.top + paneBox.height * 0.64
          : -1,
      host: hostBox
        ? { left: hostBox.left, top: hostBox.top, width: hostBox.width, height: hostBox.height }
        : null,
    };
  });
}

async function tapSide(page: Page, side: "prev" | "next") {
  const spot = await place(page);
  assert.ok(spot.host, "reading column missing");
  const planned = await planGroups(page, side === "prev" ? -1 : 1, 1);
  assert.notEqual(planned, "start", `${side} tap walked off the start`);
  assert.notEqual(planned, "end", `${side} tap walked off the end`);
  const next = planned as GroupPlace;
  assert.notEqual(groupKey(next), spot.key, `${side} tap planned the group already on screen`);
  const x = Math.round(spot.host.left + spot.host.width * (side === "prev" ? 0.12 : 0.72));
  const y = Math.round(spot.host.top + spot.host.height * 0.55);
  await page.touchscreen.tap(x, y);
  await waitGroup(page, next);
  const now = await place(page);
  assert.equal(now.key, groupKey(next), `${side} tap landed on ${now.key}, one group is ${groupKey(next)}`);
  assert.ok(now.focusHeight <= 281, `${side} tap lit ${now.focusHeight}px`);
  return now;
}

async function runSplitTaps(name: "chromium" | "webkit") {
  const browser = await launch(name);
  try {
    const page = await phone(browser);
    const viewport = page.viewportSize();
    assert.equal(viewport?.width, 390);
    assert.equal(viewport?.height, 844);

    await openAt(page, "moby-dick", 60);
    const opened = await place(page);
    assert.equal(opened.standalone, true, `${name} is not standalone`);
    assert.equal(opened.index, 60);
    assert.equal(opened.cursor, 0, `${name} s3-32 did not open on the first sentence`);
    assert.equal(opened.count, 2);
    assert.match(opened.text, /^The landlord chuckled/);
    assert.equal(opened.block, 0, `${name} opened on the continuation block`);
    assert.ok(opened.scrollTop < 4, `${name} s3-32 opened partway`);
    assert.ok(
      Math.abs(opened.focusMid - opened.anchor) < 120,
      `${name} focus ${opened.focusMid} is off the anchor ${opened.anchor}`,
    );
    assert.ok(opened.focusHeight > 0 && opened.focusHeight <= 281, `${name} focus is ${opened.focusHeight}px`);

    const quote = await tapSide(page, "next");
    assert.notEqual(quote.key, opened.key, `${name} right tap did not move one group`);
    const backInside = await tapSide(page, "prev");
    assert.equal(backInside.key, opened.key, `${name} left tap skipped a group`);
    assert.match(backInside.text, /^The landlord chuckled/);
    const previous = await tapSide(page, "prev");
    assert.ok(previous.index <= 60, `${name} left tap left the chapter`);
    assert.notEqual(previous.key, opened.key);

    await openAt(page, "moby-dick", 62);
    const after = await place(page);
    assert.equal(after.count, 1, `${name} the breath after the split is not one sentence`);
    const intoSplit = await tapSide(page, "prev");
    assert.ok(intoSplit.index < 62, `${name} left tap did not enter the split paragraph`);
    assert.notEqual(intoSplit.key, after.key);

    await openAt(page, "moby-dick", 0);
    const ishmael = await place(page);
    assert.ok(ishmael.count > 2);
    assert.equal(ishmael.cursor, 0);
    const seen = new Set([ishmael.key]);
    let current = ishmael;
    for (let step = 0; step < 8; step += 1) {
      current = await tapSide(page, "next");
      assert.ok(!seen.has(current.key), `${name} repeated or skipped a group`);
      seen.add(current.key);
      if (current.index !== 0) break;
    }
    const restored = await tapSide(page, "prev");
    assert.notEqual(restored.key, current.key, `${name} left tap did not go back one group`);

    await openAt(page, "the-father", 51);
    const speech = await place(page);
    assert.ok(speech.count > 3, `${name} father speech is one sentence`);
    assert.equal(speech.cursor, 0);
    const speechSeen = new Set([speech.key]);
    let speechNow = speech;
    for (let i = 0; i < speech.count && speechNow.index === 51; i += 1) {
      speechNow = await tapSide(page, "next");
      assert.ok(!speechSeen.has(speechNow.key), `${name} speech tap skipped a group`);
      speechSeen.add(speechNow.key);
    }
    const speechBack = await tapSide(page, "prev");
    assert.notEqual(speechBack.key, speechNow.key, `${name} left tap skipped a speech group`);

    const heldFrom = await place(page);
    const oneHold = await planGroups(page, 1, 1);
    const twoHold = await planGroups(page, 1, 2);
    const x = Math.round(heldFrom.host!.left + heldFrom.host!.width * 0.72);
    const y = Math.round(heldFrom.host!.top + heldFrom.host!.height * 0.55);
    await page.evaluate(
      ({ x, y }) => {
        const host = document.querySelector("[data-reader-text]");
        if (!host) throw new Error("missing column");
        host.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 4,
            button: 0,
            buttons: 1,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
      },
      { x, y },
    );
    await page.waitForTimeout(1200);
    await page.evaluate(
      ({ x, y }) => {
        const host = document.querySelector("[data-reader-text]");
        host?.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 4,
            button: 0,
            buttons: 0,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
      },
      { x, y },
    );
    await page.waitForTimeout(80);
    const during = await place(page);
    await page.waitForTimeout(450);
    const afterHold = await place(page);
    assert.notEqual(during.key, heldFrom.key, `${name} hold stopped on the first group`);
    if (oneHold !== "start" && oneHold !== "end" && twoHold !== "start" && twoHold !== "end") {
      assert.notEqual(during.key, groupKey(oneHold), `${name} hold stopped after one group`);
    }
    assert.equal(afterHold.key, during.key, `${name} release stepped another group`);

    await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="file"]').setInputFiles({
      name: "sentences.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(
        fixturePdf([
          "Alpha imported sentence ends here.",
          "Beta imported sentence ends here.",
          "Gamma imported sentence ends here.",
        ]),
      ),
    });
    await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
    const sit = page.getByRole("button", { name: "Sit", exact: true });
    const aloneButton = page.getByRole("button", { name: "Alone", exact: true });
    await sit.or(aloneButton).first().waitFor();
    await sit.or(aloneButton).first().click();
    await page.locator(".breath-now").waitFor();
    await page.waitForFunction(
      () => {
        const frame = document.querySelector(".reader-frame");
        return (
          frame?.getAttribute("data-face-ready") === "yes" &&
          frame.getAttribute("data-display-blocks") === "ready" &&
          !document.querySelector(".veil")
        );
      },
      { timeout: 30_000 },
    );
    const imported = await place(page);
    assert.match(imported.text, /Alpha imported/);
    assert.ok(imported.focusHeight <= 281, `${name} pdf focus is ${imported.focusHeight}px`);
    let blob = imported.text;
    const importedSeen = new Set([imported.key]);
    for (let i = 0; i < 4 && !/Gamma imported/.test(blob); i += 1) {
      const now = await tapSide(page, "next");
      assert.ok(!importedSeen.has(now.key), `${name} pdf tap skipped a group`);
      importedSeen.add(now.key);
      blob = `${blob} ${now.text}`;
    }
    assert.match(blob, /Beta imported/);
    assert.match(blob, /Gamma imported/);
    let back = await place(page);
    for (let i = 0; i < 4 && back.key !== imported.key; i += 1) back = await tapSide(page, "prev");
    assert.equal(back.key, imported.key, `${name} pdf left taps did not return one group at a time`);
    assert.match(back.text, /Alpha imported/);
    await page.close();
  } finally {
    await browser.close();
  }
}

const HOLD_MS = 15_000;

async function blockSpots(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".breath-now .breath-block")].map((node) => ({
      sentences: Number(node.getAttribute("data-block-sentences")),
      height: (node as HTMLElement).offsetHeight,
      text: node.textContent ?? "",
    })),
  );
}

async function holdPlace(page: Page, label: string) {
  const start = await place(page);
  const steps = Math.ceil(HOLD_MS / 1000);
  for (let i = 0; i < steps; i += 1) {
    await page.waitForTimeout(1000);
    const now = await place(page);
    assert.equal(now.index, start.index, `${label} reverted after ${i + 1}s`);
    assert.equal(now.cursor, start.cursor, `${label} reverted after ${i + 1}s`);
    assert.equal(now.text, start.text, `${label} focus reverted after ${i + 1}s`);
  }
}

async function walkQuote(
  page: Page,
  name: string,
  id: string,
  at: number,
  opening: RegExp,
) {
  await openAt(page, id, at);
  const opened = await place(page);
  assert.equal(opened.index, at, `${name} ${id}`);
  assert.equal(opened.cursor, 0, `${name} ${id} did not open on the first sentence`);
  assert.ok(opened.count > 1, `${name} ${id} is one sentence`);
  assert.match(opened.text, opening);
  const spots = await blockSpots(page);
  assert.ok(spots.length > 1, `${name} ${id} did not split`);
  assert.ok(
    spots.every((spot) => spot.sentences >= 1),
    `${name} ${id} sentence counts ${spots.map((spot) => spot.sentences).join(",")}`,
  );
  assert.ok(
    spots.reduce((sum, spot) => sum + spot.sentences, 0) >= opened.count,
    `${name} ${id} dropped sentences from the breath`,
  );
  for (const spot of spots) {
    assert.ok(spot.height > 0, `${name} ${id} painted an empty block`);
    if (spot.sentences > 1) assert.ok(spot.height <= 281, `${name} ${id} block is ${spot.height}px`);
  }
  const seen = new Set([opened.key]);
  let now = opened;
  let guard = 0;
  while (guard < 80) {
    const planned = await planGroups(page, 1, 1);
    if (planned === "end" || planned === "start" || planned.index !== at) break;
    now = await tapSide(page, "next");
    assert.equal(now.index, at, `${name} ${id} left the paragraph early`);
    assert.ok(!seen.has(now.key), `${name} ${id} skipped or repeated a group`);
    seen.add(now.key);
    assert.ok(now.text.length > 0, `${name} ${id} empty focus`);
    guard += 1;
  }
  assert.ok(guard < 80, `${name} ${id} never reached the end of the paragraph`);
  assert.ok(seen.size >= 1);
  const left = await tapSide(page, "next");
  assert.ok(left.index > at, `${name} ${id} stalled on the last group`);
  const returned = await tapSide(page, "prev");
  assert.equal(returned.index, at, `${name} ${id} left tap did not return`);
  assert.equal(returned.key, now.key, `${name} ${id} left tap skipped a group`);
  await holdPlace(page, `${name} ${id} left tap`);
  let home = returned;
  const backSeen = new Set([home.key]);
  while (home.key !== opened.key && backSeen.size < 80) {
    home = await tapSide(page, "prev");
    assert.equal(home.index, at, `${name} ${id} skipped back out of the paragraph`);
    assert.ok(!backSeen.has(home.key), `${name} ${id} skipped a group on the way back`);
    backSeen.add(home.key);
  }
  assert.equal(home.key, opened.key, `${name} ${id} did not walk back to the first group`);
  assert.match(home.text, opening);
}

async function runQuoteTaps(name: "chromium" | "webkit") {
  const browser = await launch(name);
  try {
    const page = await phone(browser);
    const viewport = page.viewportSize();
    assert.equal(viewport?.width, 390);
    assert.equal(viewport?.height, 844);
    await walkQuote(page, name, "cranford", 46, /Honourable Mrs Jamieson/);
    const cranford = await blockSpots(page);
    const mundane = cranford.filter((spot) => spot.text.includes("mundane failings"));
    assert.equal(mundane.length, 1, `${name} mundane failings`);
    assert.doesNotMatch(mundane[0]?.text ?? "", /British aristocracy/);
    const aristocracy = cranford.find((spot) => spot.text.includes("British aristocracy"));
    assert.ok(aristocracy, `${name} aristocracy block`);
    assert.doesNotMatch(aristocracy?.text ?? "", /mundane failings/);
    assert.ok((aristocracy?.height ?? 999) <= 281);

    await walkQuote(page, name, "new-grub-street", 511, /can’t pretend/);
    const grub = await blockSpots(page);
    const right = grub.filter((spot) => spot.text.includes("abundantly right"));
    assert.equal(right.length, 1, `${name} abundantly right`);
    assert.doesNotMatch(right[0]?.text ?? "", /do you suppose/);
    assert.ok((right[0]?.height ?? 999) <= 281);
    const fellow = grub.find((spot) => spot.text.includes("do you suppose"));
    assert.ok(fellow, `${name} do you suppose`);
    assert.doesNotMatch(fellow?.text ?? "", /abundantly right/);
    assert.ok((fellow?.height ?? 999) <= 281, `${name} suppose block ${fellow?.height}px`);
    await page.close();
  } finally {
    await browser.close();
  }
}

test(
  "Chromium standalone: quote sentences step one at a time and a left tap holds",
  { timeout: 240_000 },
  async () => {
    const stop = await ensureReaderServer();
    try {
      await runQuoteTaps("chromium");
    } finally {
      await stop();
    }
  },
);

test(
  "WebKit standalone: quote sentences step one at a time and a left tap holds",
  { timeout: 240_000 },
  async (t) => {
    try {
      const probe = await webkit.launch();
      await probe.close();
    } catch {
      t.skip("WebKit is not installed");
      return;
    }
    const stop = await ensureReaderServer();
    try {
      await runQuoteTaps("webkit");
    } finally {
      await stop();
    }
  },
);

test(
  "Chromium standalone: a left tap goes back one sentence inside a split paragraph",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureReaderServer();
    try {
      await runSplitTaps("chromium");
    } finally {
      await stop();
    }
  },
);

test(
  "WebKit standalone: a left tap goes back one sentence inside a split paragraph",
  { timeout: 180_000 },
  async (t) => {
    try {
      const probe = await webkit.launch();
      await probe.close();
    } catch {
      t.skip("WebKit is not installed");
      return;
    }
    const stop = await ensureReaderServer();
    try {
      await runSplitTaps("webkit");
    } finally {
      await stop();
    }
  },
);

import assert from "node:assert/strict";
import test from "node:test";
import { chromium, devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

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
    const focus = document.querySelector("[data-focus-sentence]");
    const slot = document.querySelector(".breath-slot");
    const host = document.querySelector("[data-reader-text]");
    const pane = document.querySelector(".reading-pane");
    const block = focus?.closest(".breath-block");
    const blocks = [...document.querySelectorAll(".breath-now .breath-block")];
    const hostBox = host?.getBoundingClientRect();
    const focusBox = focus?.getBoundingClientRect();
    const paneBox = pane?.getBoundingClientRect();
    let sentencesBefore = 0;
    for (const item of blocks) {
      if (item === block) break;
      sentencesBefore += Number(item.getAttribute("data-block-sentences") ?? 1);
    }
    return {
      index: Number(frame?.getAttribute("data-breath-index") ?? -1),
      cursor: Number(frame?.getAttribute("data-sentence-at") ?? -1),
      count: Number(frame?.getAttribute("data-sentence-count") ?? 0),
      text: (focus?.textContent ?? "").replace(/\s+/g, " ").trim(),
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
  const x = Math.round(spot.host.left + spot.host.width * (side === "prev" ? 0.12 : 0.72));
  const y = Math.round(spot.host.top + spot.host.height * 0.55);
  await page.touchscreen.tap(x, y);
  await page.waitForFunction(
    (prev) => {
      const frame = document.querySelector(".reader-frame");
      const index = frame?.getAttribute("data-breath-index");
      const cursor = frame?.getAttribute("data-sentence-at");
      return !(index === String(prev.index) && cursor === String(prev.cursor));
    },
    { index: spot.index, cursor: spot.cursor },
    { timeout: 4000 },
  );
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

    await tapSide(page, "next");
    const quote = await place(page);
    assert.equal(quote.index, 60, `${name} right tap left the paragraph`);
    assert.equal(quote.cursor, 1, `${name} right tap did not move one sentence`);
    assert.ok(quote.block >= 0, `${name} quote has no focus`);
    assert.match(quote.text, /No,/);

    await tapSide(page, "prev");
    const backInside = await place(page);
    assert.equal(backInside.index, 60);
    assert.equal(backInside.cursor, 0, `${name} left tap on the continuation skipped a sentence`);
    assert.match(backInside.text, /^The landlord chuckled/);

    await tapSide(page, "prev");
    const previous = await place(page);
    assert.equal(previous.index, 59);
    assert.equal(previous.cursor, previous.count - 1, `${name} left tap did not land on the previous sentence`);

    await openAt(page, "moby-dick", 62);
    const after = await place(page);
    assert.equal(after.count, 1, `${name} the breath after the split is not one sentence`);
    await tapSide(page, "prev");
    const intoSplit = await place(page);
    assert.equal(intoSplit.index, 61, `${name} left tap from after the split skipped the paragraph`);
    assert.equal(intoSplit.cursor, intoSplit.count - 1);
    assert.ok(intoSplit.count > 1);

    await openAt(page, "moby-dick", 0);
    const ishmael = await place(page);
    assert.ok(ishmael.count > 2);
    assert.equal(ishmael.cursor, 0);
    await tapSide(page, "next");
    const inside = await place(page);
    assert.equal(inside.index, 0);
    assert.equal(inside.cursor, 1);
    assert.equal(inside.block, 0, `${name} the second sentence left its block`);
    assert.ok(inside.blockSentences > 1);
    await tapSide(page, "prev");
    assert.equal((await place(page)).cursor, 0);

    let continuation = await place(page);
    for (let step = 0; step < 12 && continuation.block === 0; step += 1) {
      await tapSide(page, "next");
      continuation = await place(page);
    }
    assert.equal(continuation.index, 0);
    assert.equal(continuation.cursor, continuation.sentencesBefore, `${name} not on the first sentence of the next block`);
    assert.ok(continuation.block > 0);
    await tapSide(page, "prev");
    const restored = await place(page);
    assert.equal(restored.index, 0);
    assert.equal(restored.cursor, continuation.cursor - 1);

    await openAt(page, "the-father", 51);
    const speech = await place(page);
    assert.ok(speech.count > 3, `${name} father speech is one sentence`);
    assert.equal(speech.cursor, 0);
    for (let i = 0; i < speech.blockSentences; i += 1) await tapSide(page, "next");
    const speechNext = await place(page);
    assert.equal(speechNext.index, 51);
    assert.equal(speechNext.block, 1, `${name} play continuation block was skipped`);
    assert.equal(speechNext.cursor, speechNext.sentencesBefore);
    assert.match(speechNext.text, /^Captain:/);
    await tapSide(page, "prev");
    const speechBack = await place(page);
    assert.equal(speechBack.index, 51, `${name} left tap left the speech`);
    assert.equal(speechBack.cursor, speechNext.cursor - 1);

    const heldFrom = await place(page);
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
    assert.ok(
      during.index > heldFrom.index || during.cursor > heldFrom.cursor + 1,
      `${name} hold stopped after one sentence (${heldFrom.index}:${heldFrom.cursor} -> ${during.index}:${during.cursor})`,
    );
    assert.equal(afterHold.index, during.index, `${name} release stepped again`);
    assert.equal(afterHold.cursor, during.cursor, `${name} release stepped a sentence`);

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
    await page.waitForFunction(() => !document.querySelector(".veil"));
    await tapSide(page, "next");
    const beta = await place(page);
    assert.equal(beta.index, 1);
    assert.match(beta.text, /^Beta imported/);
    await tapSide(page, "prev");
    const alpha = await place(page);
    assert.equal(alpha.index, 0);
    assert.equal(alpha.cursor, 0);
    assert.match(alpha.text, /^Alpha imported/);
    await page.close();
  } finally {
    await browser.close();
  }
}

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

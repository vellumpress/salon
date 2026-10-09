import assert from "node:assert/strict";
import test from "node:test";
import { devices, webkit, type Browser, type Page } from "playwright";
import { ensureReaderServer, readerDown } from "./reader-dev-server.ts";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const PHONE = devices["iPhone 12"];

function pdfEscape(text: string) {
  return text.replace(/[\\()]/g, (ch) => `\\${ch}`);
}

function fixturePdf(count: number): Uint8Array {
  const lines: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`Imported sentence ${String(i).padStart(2, "0")} ends here.`);
  }
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
    `4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`,
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

async function launch(): Promise<Browser> {
  return webkit.launch();
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
  await page.addInitScript(() => localStorage.clear());
  return page;
}

async function breathIndex(page: Page) {
  const raw = await page.locator("[data-breath-index]").getAttribute("data-breath-index");
  return Number(raw);
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

async function column(page: Page) {
  const spot = await page.evaluate(() => {
    const host = document.querySelector("[data-reader-text]");
    const line = document.querySelector(".breath-now");
    const slot = document.querySelector(".breath-slot");
    const frame = document.querySelector("[data-breath-index]");
    if (!host || !line || !slot || !frame) return null;
    const h = host.getBoundingClientRect();
    const row = line.getBoundingClientRect();
    return {
      index: Number(frame.getAttribute("data-breath-index")),
      overflows: slot.classList.contains("overflows"),
      scrollTop: (slot as HTMLElement).scrollTop,
      host: { left: h.left, top: h.top, width: h.width, height: h.height, bottom: h.bottom },
      lineTop: row.top,
      lineBottom: row.bottom,
    };
  });
  assert.ok(spot, "reading column missing");
  return spot;
}

function forwardPoint(spot: Awaited<ReturnType<typeof column>>) {
  return {
    x: Math.round(spot.host.left + spot.host.width * 0.62),
    y: Math.round(Math.min(spot.host.bottom - 12, Math.max(spot.lineTop + 8, spot.lineBottom - 4))),
  };
}

function backPoint(spot: Awaited<ReturnType<typeof column>>) {
  return {
    x: Math.round(spot.host.left + 16),
    y: Math.round(spot.host.top + 18),
  };
}

async function mouseOnlyTap(page: Page, x: number, y: number) {
  await page.evaluate(({ x, y }) => {
    const host = document.querySelector("[data-reader-text]");
    if (!host) throw new Error("missing reading column");
    const base = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 8,
      button: 0,
      pointerType: "mouse",
      isPrimary: true,
    };
    host.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1 }));
    host.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0 }));
    host.dispatchEvent(new MouseEvent("click", base));
  }, { x, y });
}

/** Touch pointerdown, then the lift as a mouse pointerup. No click. */
async function mouseLift(page: Page, x: number, y: number) {
  await page.evaluate(({ x, y }) => {
    const host = document.querySelector("[data-reader-text]");
    if (!host) throw new Error("missing reading column");
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
    host.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 8,
        button: 0,
        buttons: 0,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
  }, { x, y });
}

test(
  "WebKit: a mouse back tap just after a forward touch goes back one sentence",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phone(browser);
      await openAt(page, "the-house-of-mirth", 12);
      const spot = await column(page);
      const fwd = forwardPoint(spot);
      await page.touchscreen.tap(fwd.x, fwd.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "13",
      );
      const next = await column(page);
      const back = backPoint(next);
      assert.ok(Math.hypot(back.x - fwd.x, back.y - fwd.y) > 24, "back point is still the forward finger");
      await mouseOnlyTap(page, back.x, back.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "12",
        undefined,
        { timeout: 2000 },
      );
      assert.equal(await breathIndex(page), 12);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "WebKit: a mouse pointerup finishes a back touch that never got pointerup",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phone(browser);
      await openAt(page, "the-house-of-mirth", 12);
      const back = backPoint(await column(page));
      await mouseLift(page, back.x, back.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "11",
        undefined,
        { timeout: 2000 },
      );
      assert.equal(await breathIndex(page), 11);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "WebKit: Prev goes back when the click never arrives",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phone(browser);
      await openAt(page, "the-house-of-mirth", 12);
      const glass = await page.locator(".reader-glass").boundingBox();
      assert.ok(glass, "hourglass missing");
      await page.touchscreen.tap(glass.x + glass.width / 2, glass.y + glass.height / 2);
      await page.getByRole("button", { name: "Prev", exact: true }).waitFor();
      await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((node) => node.textContent === "Prev");
        if (!button) throw new Error("Prev missing");
        const box = button.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        button.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 2,
            button: 0,
            buttons: 1,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
        button.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            pointerId: 2,
            button: 0,
            buttons: 0,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
      });
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "11",
        undefined,
        { timeout: 2000 },
      );
      assert.equal(await breathIndex(page), 11);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "WebKit: a tall sentence returns to its top before the next back tap steps",
  { timeout: 120_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phone(browser);
      await openAt(page, "lamia", 5);
      const opened = await column(page);
      assert.equal(opened.overflows, true, "lamia 5 is not taller than the column");
      assert.ok(opened.scrollTop < 4);
      const x = Math.round(opened.host.left + opened.host.width * 0.7);
      const y0 = Math.round(opened.host.top + opened.host.height * 0.72);
      await page.evaluate(({ x, y0 }) => {
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
        fire("pointermove", y0 - 40);
        fire("pointermove", y0 - 90);
        fire("pointerup", y0 - 90);
      }, { x, y0 });
      const scrolled = await column(page);
      assert.equal(scrolled.index, 5);
      assert.ok(scrolled.scrollTop > 20, "drag did not leave the top of the sentence");
      const back = { x: Math.round(scrolled.host.left + 20), y: Math.round(scrolled.host.top + scrolled.host.height * 0.4) };
      await page.touchscreen.tap(back.x, back.y);
      await page.waitForFunction(
        () => {
          const slot = document.querySelector(".breath-slot") as HTMLElement | null;
          return slot != null && slot.scrollTop < 4;
        },
        undefined,
        { timeout: 2000 },
      );
      const topped = await column(page);
      assert.equal(topped.index, 5, "first back tap left the tall sentence");
      assert.ok(topped.scrollTop < 4, "first back tap did not reach the top");
      await page.touchscreen.tap(back.x, back.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "4",
        undefined,
        { timeout: 2000 },
      );
      assert.equal(await breathIndex(page), 4);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

test(
  "WebKit: an imported PDF mouse back tap just after a forward touch goes back",
  { timeout: 180_000 },
  async () => {
    const stop = await ensureReaderServer();
    const browser = await launch();
    try {
      const page = await phone(browser);
      await page.goto(`${ORIGIN}/salon/page`, { waitUntil: "domcontentloaded" });
      await page.locator('input[type="file"]').setInputFiles({
        name: "fixture.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(fixturePdf(12)),
      });
      await page.waitForURL(/\/read\/page/, { timeout: 30_000 });
      const sit = page.getByRole("button", { name: "Sit", exact: true });
      const alone = page.getByRole("button", { name: "Alone", exact: true });
      await sit.or(alone).first().waitFor();
      await sit.or(alone).first().click();
      await page.locator(".breath-now").waitFor();
      for (let i = 0; i < 4; i += 1) {
        const spot = await column(page);
        const fwd = forwardPoint(spot);
        await page.touchscreen.tap(fwd.x, fwd.y);
        await page.waitForFunction(
          (want) =>
            document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === String(want),
          spot.index + 1,
        );
      }
      assert.equal(await breathIndex(page), 4);
      const spot = await column(page);
      const fwd = forwardPoint(spot);
      await page.touchscreen.tap(fwd.x, fwd.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "5",
      );
      const back = backPoint(await column(page));
      await mouseOnlyTap(page, back.x, back.y);
      await page.waitForFunction(
        () => document.querySelector("[data-breath-index]")?.getAttribute("data-breath-index") === "4",
        undefined,
        { timeout: 2000 },
      );
      assert.equal(await breathIndex(page), 4);
    } finally {
      await browser.close();
      await stop();
    }
  },
);

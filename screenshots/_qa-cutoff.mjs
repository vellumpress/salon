import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function measure(page) {
  return page.evaluate(() => {
    const pane = document.querySelector(".reading-pane");
    const slot = document.querySelector(".breath-slot");
    const now = document.querySelector(".breath-now");
    const look = document.querySelector(".lookback-slot");
    if (!pane || !slot || !now) return null;
    const paneR = pane.getBoundingClientRect();
    const slotR = slot.getBoundingClientRect();
    const nowR = now.getBoundingClientRect();
    const lookR = look?.getBoundingClientRect();
    const nowCs = getComputedStyle(now);
    const lookLine = document.querySelector(".look-line");
    const lookCs = lookLine ? getComputedStyle(lookLine) : null;
    const hidden = nowR.bottom - paneR.bottom;
    const slotClip = nowR.bottom - slotR.bottom;
    return {
      textLen: now.textContent?.length ?? 0,
      text: now.textContent?.slice(0, 90),
      overflows: slot.classList.contains("overflows"),
      paneH: Math.round(paneR.height),
      slotH: Math.round(slotR.height),
      nowH: Math.round(nowR.height),
      lookH: lookR ? Math.round(lookR.height) : 0,
      scrollH: slot.scrollHeight,
      clientH: slot.clientHeight,
      canScroll: slot.scrollHeight > slot.clientHeight + 1,
      clippedByPane: hidden > 2,
      clippedBySlot: slotClip > 2,
      nowSize: nowCs.fontSize,
      lookSize: lookCs?.fontSize ?? null,
      sameSize: lookCs ? nowCs.fontSize === lookCs.fontSize : true,
    };
  });
}

async function openPassing(page, { index, height }) {
  await page.setViewportSize({ width: 390, height });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((at) => {
    const parsed = { state: {}, version: 0 };
    parsed.state.progress = {
      passing: {
        breathIndex: at,
        lastOpenedAt: Date.now(),
        sittingStartedAt: Date.now(),
        keywords: {},
        kept: [],
        completedAt: null,
        entered: true,
      },
    };
    localStorage.clear();
    localStorage.setItem("vellum-v1", JSON.stringify(parsed));
  }, index);
  await page.goto(`${url.replace(/\/$/, "")}/read/passing`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(".breath-now", { timeout: 15000 });
  await page.waitForTimeout(index > 90 ? 2500 : 800);
}

const results = {};
const errors = [];

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
phone.on("pageerror", (err) => errors.push(`pageerror ${err.message}`));

await openPassing(phone, { index: 17, height: 844 });
results.longPhone = await measure(phone);
await phone.screenshot({
  path: "/workspace/screenshots/cutoff-long-phone.png",
  fullPage: false,
});

await phone.getByRole("button", { name: "Next sentence" }).click({ force: true });
await phone.waitForTimeout(250);
results.afterAdvance = await measure(phone);
await phone.screenshot({
  path: "/workspace/screenshots/cutoff-after-advance.png",
  fullPage: false,
});

const mark = phone.locator(".chrome-mark");
results.markVisible = await mark.isVisible().catch(() => false);
if (results.markVisible) {
  await mark.click();
  await phone.waitForTimeout(200);
  results.chromeAfterMark = await phone.evaluate(
    () => !document.querySelector(".frame-screen")?.classList.contains("still"),
  );
}

const short = await browser.newPage({ viewport: { width: 390, height: 560 } });
short.on("pageerror", (err) => errors.push(`short pageerror ${err.message}`));
await openPassing(short, { index: 17, height: 560 });
results.longShort = await measure(short);
await short.screenshot({
  path: "/workspace/screenshots/cutoff-long-short.png",
  fullPage: false,
});

if (results.longShort?.canScroll) {
  await short.evaluate(() => {
    const slot = document.querySelector(".breath-slot");
    if (slot) slot.scrollTop = slot.scrollHeight;
  });
  await short.waitForTimeout(150);
  results.scrolled = await measure(short);
  await short.screenshot({
    path: "/workspace/screenshots/cutoff-scrolled-short.png",
    fullPage: false,
  });
}

const tiny = await browser.newPage({ viewport: { width: 390, height: 480 } });
tiny.on("pageerror", (err) => errors.push(`tiny pageerror ${err.message}`));
await openPassing(tiny, { index: 17, height: 480 });
results.longTiny = await measure(tiny);
await tiny.screenshot({
  path: "/workspace/screenshots/cutoff-long-tiny.png",
  fullPage: false,
});

function judge(label, info) {
  if (!info) {
    errors.push(`${label} missing`);
    return;
  }
  if (info.clippedByPane && !info.canScroll) {
    errors.push(`${label} clipped by pane with no scroll`);
  }
  if (info.clippedBySlot && !info.canScroll) {
    errors.push(`${label} clipped by slot with no scroll`);
  }
  if (info.canScroll && !info.overflows) {
    errors.push(`${label} scrollable but missing overflows class`);
  }
  if (!info.sameSize) {
    errors.push(`${label} lookback font size drifted`);
  }
}

judge("longPhone", results.longPhone);
judge("afterAdvance", results.afterAdvance);
judge("longShort", results.longShort);
judge("longTiny", results.longTiny);
if (results.markVisible === false) errors.push("chrome mark missing");
if (results.chromeAfterMark === false) errors.push("chrome mark did not reveal nav");

console.log(JSON.stringify({ errors, results }, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);

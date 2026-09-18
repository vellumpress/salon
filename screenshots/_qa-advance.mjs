import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.fill("#shelf-search", "Passing");
await page.waitForTimeout(200);
await page.getByRole("link").filter({ hasText: /Passing/i }).first().click();
await page.waitForTimeout(1800);

async function measure(label) {
  const info = await page.evaluate(() => {
    const now = document.querySelector(".breath-now");
    const look = [...document.querySelectorAll(".look-line")];
    const last = look[look.length - 1];
    const r = now?.getBoundingClientRect();
    const l = last?.getBoundingClientRect();
    const cs = now ? getComputedStyle(now) : null;
    const ls = last ? getComputedStyle(last) : null;
    return {
      now: now
        ? {
            y: Math.round(r.top),
            h: Math.round(r.height),
            size: cs.fontSize,
            lh: cs.lineHeight,
            text: now.textContent?.slice(0, 80),
            lines: Math.round(r.height / parseFloat(cs.lineHeight)),
          }
        : null,
      lastLook: last
        ? {
            y: Math.round(l.top),
            h: Math.round(l.height),
            size: ls.fontSize,
            text: last.textContent?.slice(0, 80),
          }
        : null,
    };
  });
  await page.screenshot({
    path: `/workspace/screenshots/advance-${label}.png`,
    fullPage: false,
  });
  return info;
}

const before = await measure("0");
await page.getByRole("button", { name: "Next sentence" }).click({ force: true });
await page.waitForTimeout(250);
const after1 = await measure("1");
await page.getByRole("button", { name: "Next sentence" }).click({ force: true });
await page.waitForTimeout(250);
const after2 = await measure("2");

console.log(
  JSON.stringify(
    {
      before,
      after1,
      after2,
      dy1: (after1.now?.y ?? 0) - (before.now?.y ?? 0),
      dy2: (after2.now?.y ?? 0) - (after1.now?.y ?? 0),
      sameSize: before.now?.size === after1.lastLook?.size,
    },
    null,
    2,
  ),
);
await browser.close();

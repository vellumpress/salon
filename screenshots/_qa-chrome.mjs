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
await page.waitForTimeout(1600);

async function chromeState() {
  return page.evaluate(() => {
    const header = document.querySelector("header.chrome-fade");
    const footer = document.querySelector("footer.chrome-fade");
    const now = document.querySelector(".breath-now");
    const frame = document.querySelector(".frame-screen");
    const mark = document.querySelector(".chrome-mark");
    const plane = mark?.querySelector(".chrome-mark-plane");
    const box = mark?.getBoundingClientRect();
    return {
      still: frame?.classList.contains("still") ?? null,
      headerOpacity: header ? getComputedStyle(header).opacity : null,
      footerOpacity: footer ? getComputedStyle(footer).opacity : null,
      headerPE: header ? getComputedStyle(header).pointerEvents : null,
      mark: Boolean(mark),
      markW: box ? Math.round(box.width) : 0,
      markH: box ? Math.round(box.height) : 0,
      planeFill: plane ? getComputedStyle(plane).backgroundColor : null,
      text: now?.textContent?.slice(0, 60) ?? "",
    };
  });
}

const open = await chromeState();
await page.screenshot({ path: "/workspace/screenshots/chrome-open.png" });

const before = await chromeState();
await page.getByRole("button", { name: "Next sentence" }).click({ force: true });
await page.waitForTimeout(200);
const afterTap = await chromeState();
await page.screenshot({ path: "/workspace/screenshots/chrome-tap.png" });

await page.getByRole("button", { name: "Show navigation" }).click();
await page.waitForTimeout(200);
const afterMark = await chromeState();
await page.screenshot({ path: "/workspace/screenshots/chrome-mark.png" });

const homeVisible = await page.getByRole("link", { name: "Home" }).isVisible();
const keepVisible = await page.getByRole("button", { name: "Keep" }).isVisible();
await page.getByRole("button", { name: "Next", exact: true }).click();
await page.waitForTimeout(200);
const afterFooterNext = await chromeState();
await page.screenshot({ path: "/workspace/screenshots/chrome-after-next.png" });

const errors = [];
if (!open.still || open.headerOpacity !== "0" || !open.mark) errors.push("open: chrome should be hidden with mark visible");
if (open.markW < 44 || open.markH < 44) errors.push("open: mark hit target under 44px");
if (!afterTap.still || afterTap.headerOpacity !== "0" || !afterTap.mark) errors.push("tap: chrome flashed or hid the mark");
if (before.text === afterTap.text) errors.push("tap: sentence did not advance");
if (afterMark.still || afterMark.headerOpacity !== "1" || afterMark.mark) errors.push("mark: chrome should show and mark should hide");
if (afterMark.text !== afterTap.text) errors.push("mark: tapping the mark advanced the sentence");
if (!homeVisible || !keepVisible) errors.push("mark: Home/Keep not visible after tapping mark");
if (!afterFooterNext.still || afterFooterNext.headerOpacity !== "0" || !afterFooterNext.mark) {
  errors.push("footer next: chrome should hide and mark return");
}

console.log(
  JSON.stringify(
    { open, afterTap, afterMark, afterFooterNext, homeVisible, keepVisible, errors },
    null,
    2,
  ),
);
await browser.close();
if (errors.length) process.exitCode = 1;

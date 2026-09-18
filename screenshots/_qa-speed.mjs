import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => console.log("ERR", e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());

async function open(q) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.fill("#shelf-search", q);
  await page.waitForTimeout(80);
  const t0 = Date.now();
  await page.getByRole("link").filter({ hasText: new RegExp(q, "i") }).first().click();
  await page.waitForFunction(
    () => Boolean(document.querySelector(".breath-now")?.textContent?.trim()),
    null,
    { timeout: 45000 },
  );
  const ready = Date.now() - t0;
  const info = await page.evaluate(() => ({
    text: document.querySelector(".breath-now")?.textContent?.slice(0, 72) ?? "",
    breathsHint: document.body.innerText.slice(0, 40),
  }));
  console.log(JSON.stringify({ q, ready, ...info }));
  return ready;
}

const results = {};
for (const q of [
  "Passing",
  "Gatsby",
  "Wallpaper",
  "Dorian",
  "Ulysses",
  "Manhattan Transfer",
  "Dracula",
  "Jews Without Money",
]) {
  results[q] = await open(q);
}

console.log("SUMMARY", JSON.stringify(results, null, 2));
await browser.close();

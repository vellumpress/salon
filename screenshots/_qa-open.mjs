import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE", msg.text());
});

async function openBook(name, shot) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.fill("#shelf-search", name);
  await page.waitForTimeout(200);
  await page.getByRole("link").filter({ hasText: new RegExp(name, "i") }).first().click();
  await page.waitForTimeout(name === "Yellow" || name === "Gatsby" ? 9000 : 2500);
  const body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `/workspace/screenshots/${shot}`, fullPage: false });
  return body;
}

const passing = await openBook("Passing", "open-passing.png");
const gold = await openBook("Jews Without Money", "open-gold.png");
const wallpaper = await openBook("Yellow Wallpaper", "open-wallpaper.png");
const gatsby = await openBook("Great Gatsby", "open-gatsby.png");

function summary(label, text) {
  const hasBegin = /\nBegin\n/.test(text) || text.trim().endsWith("Begin");
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  return { label, hasBegin, header: lines.slice(0, 6), snippet: text.slice(0, 420) };
}

console.log(JSON.stringify({
  passing: summary("passing", passing),
  gold: summary("gold", gold),
  wallpaper: summary("wallpaper", wallpaper),
  gatsby: summary("gatsby", gatsby),
}, null, 2));
await browser.close();

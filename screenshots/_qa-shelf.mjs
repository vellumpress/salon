import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(500);
const home = await page.evaluate(() => ({
  vellum: document.body.innerText.includes("Vellum"),
  search: Boolean(document.querySelector("#shelf-search")),
  count: document.querySelector("#shelf-search")?.parentElement?.innerText ?? "",
  gatsby: document.body.innerText.includes("The Great Gatsby"),
  passing: document.body.innerText.includes("Passing"),
  shahnameh: document.body.innerText.includes("Shahnameh"),
}));
await page.screenshot({ path: "/workspace/screenshots/shelf-home-phone.png" });

await page.fill("#shelf-search", "gatsby");
await page.waitForTimeout(200);
const filtered = await page.evaluate(() => ({
  gatsby: document.body.innerText.includes("The Great Gatsby"),
  passing: document.body.innerText.includes("Passing") && document.body.innerText.includes("Nella Larsen"),
  count: [...document.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.startsWith("/read/")).length,
}));
await page.screenshot({ path: "/workspace/screenshots/shelf-search-gatsby.png" });

await page.fill("#shelf-search", "");
await page.waitForTimeout(100);
await page.getByRole("link", { name: /Passing/ }).first().click();
await page.waitForTimeout(1200);
const passing = await page.evaluate(() => document.body.innerText.slice(0, 400));
await page.screenshot({ path: "/workspace/screenshots/shelf-read-passing.png" });

await page.goto(url, { waitUntil: "networkidle" });
await page.fill("#shelf-search", "yellow wallpaper");
await page.waitForTimeout(200);
await page.getByRole("link", { name: /Yellow Wallpaper/ }).first().click();
await page.waitForFunction(() => !document.body.innerText.includes("Opening") || document.body.innerText.length > 40, null, { timeout: 25000 }).catch(() => {});
await page.waitForTimeout(800);
const wallpaper = await page.evaluate(() => document.body.innerText.slice(0, 500));
await page.screenshot({ path: "/workspace/screenshots/shelf-read-wallpaper.png" });

await page.goto(url, { waitUntil: "networkidle" });
await page.fill("#shelf-search", "shahnameh");
await page.waitForTimeout(200);
await page.getByRole("link", { name: /Shahnameh/ }).first().click();
await page.waitForTimeout(1200);
const door = await page.evaluate(() => document.body.innerText.slice(0, 500));
await page.screenshot({ path: "/workspace/screenshots/shelf-read-door.png" });

const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await desk.goto(url, { waitUntil: "networkidle" });
await desk.waitForTimeout(400);
await desk.screenshot({ path: "/workspace/screenshots/shelf-home-desktop.png" });

console.log(JSON.stringify({ home, filtered, passing: passing.slice(0, 180), wallpaper: wallpaper.slice(0, 220), door: door.slice(0, 220), errors }, null, 2));
await browser.close();

import { chromium } from "playwright";

const origin = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];

page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('main[data-hydrated="1"]');
if ((await page.getByRole("link", { name: /^Import$/i }).count()) < 1) {
  errors.push("home missing Import");
}
await page.screenshot({ path: "/workspace/screenshots/import-home.png", fullPage: false });

await page.goto(`${origin}/page`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[name="import-url"]');
await page.screenshot({ path: "/workspace/screenshots/import-page.png", fullPage: false });

const t0 = Date.now();
await page.locator('input[type="file"]').setInputFiles("/workspace/screenshots/import-sample.pdf");
try {
  await page.waitForFunction(
    () => Boolean(document.querySelector(".breath-now")?.textContent?.includes("last letter")),
    { timeout: 20000 },
  );
} catch {
  errors.push(`pdf after upload: ${(await page.locator("body").innerText()).slice(0, 240)}`);
}
const pdfMs = Date.now() - t0;
await page.screenshot({ path: "/workspace/screenshots/import-pdf-read.png", fullPage: false });

await page.goto(`${origin}/page`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[name="import-url"]');
await page.fill('input[name="import-url"]', "https://www.gutenberg.org/cache/epub/11/pg11.txt");
const tLink = Date.now();
await page.getByRole("button", { name: /Read the link/i }).click();
let linkOk = false;
try {
  await page.waitForFunction(
    () => Boolean(document.querySelector(".breath-now")?.textContent?.trim()),
    { timeout: 25000 },
  );
  linkOk = true;
} catch {
  errors.push(`link import: ${(await page.locator("body").innerText()).slice(0, 240)}`);
}
const linkMs = Date.now() - tLink;
await page.screenshot({ path: "/workspace/screenshots/import-link-read.png", fullPage: false });

await browser.close();
const consoleNoise = errors.filter((e) => !e.includes("hydrated but some attributes"));
console.log(JSON.stringify({ ok: consoleNoise.length === 0, errors: consoleNoise, pdfMs, linkMs, linkOk }, null, 2));
if (consoleNoise.length) process.exit(1);

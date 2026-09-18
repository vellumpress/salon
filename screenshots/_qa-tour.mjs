import { chromium } from "playwright";

const origin = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
const pages = [];

page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

async function shot(name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}`, fullPage: false });
}

async function visit(path, expect, name) {
  const t0 = Date.now();
  await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
  let found = true;
  try {
    await page.waitForFunction(
      (needle) => document.body.innerText.includes(needle),
      expect,
      { timeout: 8000 },
    );
  } catch {
    found = false;
    errors.push(`missing "${expect}" on ${path}: ${(await page.locator("body").innerText()).slice(0, 180)}`);
  }
  const ms = Date.now() - t0;
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (overflow) errors.push(`overflow ${path}`);
  if (path.includes("door=staff")) {
    try {
      await page.waitForFunction(() => {
        const n = document.getElementById("staff");
        if (!n) return false;
        const r = n.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 48;
      }, { timeout: 3000 });
    } catch {
      errors.push("staff door did not scroll");
    }
  }
  await shot(name);
  pages.push({ path, ms, found, url: page.url() });
  return ms;
}

await visit("/", "Curated for you", "tour-home.png");
await visit("/login", "Sign in to sit", "tour-login.png");
await visit("/login?door=staff", "vellum.press", "tour-login-staff.png");
await visit("/shuffle", "How long", "tour-shuffle.png");
await visit("/shuffle?together=true", "How long", "tour-together.png");
await visit("/clubs", "Clubs", "tour-clubs.png");
await visit("/club/drayton", "Drayton", "tour-club.png");
await visit("/reader/ada", "Ada", "tour-reader.png");
await visit("/map", "New York", "tour-map.png");
await visit("/glass", "Hourglass", "tour-glass.png");
await visit("/curator", "Curator", "tour-curator.png");
await visit("/page", "Import", "tour-page.png");
await visit("/form", "Irene", "tour-form.png");
await visit("/profile", "Sign in to sit", "tour-profile-guest.png");
await visit("/desk", "The desk", "tour-desk-guest.png");
await visit("/read/passing", "Passing", "tour-read-passing.png");
await page.waitForSelector(".breath-now", { timeout: 10000 });
await page.waitForSelector(".chrome-mark", { timeout: 4000 });
await shot("tour-read-passing.png");
await visit("/read/gatsby", "Gatsby", "tour-read-gatsby.png");
await page.waitForSelector(".breath-now", { timeout: 20000 });
await shot("tour-read-gatsby.png");

await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#shelf-search");
await page.waitForSelector('main[data-hydrated="1"]');
const tSearch = Date.now();
await page.fill("#shelf-search", "Gatsby");
await page.waitForFunction(() => document.body.innerText.includes("The Great Gatsby"), { timeout: 4000 });
pages.push({ path: "search:Gatsby", ms: Date.now() - tSearch, found: true });
await shot("tour-search.png");

const tOpen = Date.now();
await page.getByRole("link").filter({ hasText: /Great Gatsby/i }).first().click();
await page.waitForFunction(() => Boolean(document.querySelector(".breath-now")?.textContent?.trim()), { timeout: 20000 });
pages.push({ path: "open:gatsby", ms: Date.now() - tOpen, found: true });
await shot("tour-open-gatsby.png");

await page.getByRole("button", { name: /Next sentence/i }).click({ force: true }).catch(() => {});
await page.waitForTimeout(200);
await shot("tour-advance.png");

await page.goto(`${origin}/shuffle`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-step="length"]');
await page.getByRole("button", { name: "Twenty minutes" }).click();
try {
  await page.waitForSelector('[data-step="company"]', { timeout: 4000 });
} catch {
  errors.push(`shuffle after length: ${(await page.locator("body").innerText()).slice(0, 160)}`);
}
await shot("tour-shuffle-length.png");

await page.goto(`${origin}/glass`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /^20$/ }).click().catch(async () => {
  await page.getByText("20", { exact: true }).click();
});
await page.getByRole("button", { name: /^Start$/ }).click();
await page.waitForTimeout(400);
await shot("tour-glass-run.png");

await page.goto(`${origin}/map`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".map-pane");
const mapPins = await page.locator(".shop-pin").count();
if (mapPins < 8) errors.push(`map pins ${mapPins}`);
await page.locator(".shop-pin").first().click({ force: true });
await page.waitForTimeout(200);
await shot("tour-map-ready.png");

await page.goto(`${origin}/clubs`, { waitUntil: "domcontentloaded" });
const loginChip = page.getByRole("link", { name: /Log in|You/i }).first();
if ((await loginChip.count()) === 0) errors.push("clubs missing Log in/You");
const join = page.getByRole("link", { name: /Drayton/i }).first();
if (await join.count()) await join.click();
await page.waitForTimeout(200);
const clubJoin = page.getByRole("button", { name: /^Join$/ });
if (await clubJoin.count()) await clubJoin.click();
await page.waitForTimeout(200);
await shot("tour-clubs-join.png");

await page.goto(`${origin}/curator`, { waitUntil: "domcontentloaded" });
const starter = page.getByRole("button", { name: /Quiet/i }).first();
if (await starter.count()) {
  await starter.click();
  await page.waitForTimeout(1500);
}
await shot("tour-curator-ask.png");

await browser.close();
const slow = pages.filter((p) => p.ms > 1500);
console.log(JSON.stringify({ ok: errors.length === 0 && slow.length === 0, errors, slow, pages }, null, 2));
if (errors.length) process.exit(1);

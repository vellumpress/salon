import { chromium } from "playwright";

const origin = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => errors.push(`page: ${e.message}`));

await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#shelf-search");
await page.waitForSelector('main[data-hydrated="1"]');
const homeLogin = page.getByRole("link", { name: /^Log in$/ });
if ((await homeLogin.count()) < 1) errors.push("home missing Log in");
await page.screenshot({ path: "/workspace/screenshots/login-home.png", fullPage: false });

await homeLogin.click();
await page.waitForURL(/\/login/);
await page.waitForTimeout(250);

const google = page.getByRole("button", { name: /Continue with Google/i });
const x = page.getByRole("button", { name: /Continue with X/i });
const signIn = page.getByRole("button", { name: /^Sign in$/ });
const create = page.getByRole("button", { name: /^Create$/ });
const staff = page.locator("#staff");

if ((await google.count()) < 1) errors.push("missing Google");
if ((await x.count()) < 1) errors.push("missing X");
if ((await signIn.count()) < 2) errors.push("missing reader and staff Sign in");
if ((await create.count()) < 2) errors.push("missing reader and staff Create");
if ((await staff.count()) < 1) errors.push("missing staff block");
const staffText = (await staff.innerText()).toLowerCase();
if (!staffText.includes("vellum.press")) errors.push("staff block missing vellum.press");

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
);
if (overflow) errors.push("login horizontal overflow");

await page.screenshot({ path: "/workspace/screenshots/login-reader.png", fullPage: false });

const staffCreates = page.getByRole("button", { name: /^Create$/ });
await staffCreates.last().click();
await page.waitForTimeout(200);
const body = (await page.locator("body").innerText()).toLowerCase();
if (!body.includes("vellum.press")) errors.push("staff create did not require vellum.press");

await page.goto(`${origin}/login?door=staff`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
const staffTop = await page.evaluate(() => {
  const el = document.getElementById("staff");
  if (!el) return null;
  return el.getBoundingClientRect().top;
});
if (staffTop === null) errors.push("staff hash missing");
else if (staffTop > 500) errors.push(`staff block not brought up: top ${staffTop}`);
await page.screenshot({ path: "/workspace/screenshots/login-staff.png", fullPage: false });

await page.goto(`${origin}/profile`, { waitUntil: "domcontentloaded" });
try {
  await page.waitForURL(/\/login/, { timeout: 8000 });
} catch {
  errors.push(`profile did not send guests to login: ${page.url()}`);
}

await page.goto(`${origin}/desk`, { waitUntil: "domcontentloaded" });
try {
  await page.waitForURL(/\/login/, { timeout: 8000 });
} catch {
  errors.push(`desk did not send guests to login: ${page.url()}`);
}

await browser.close();
if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, staffTop }, null, 2));

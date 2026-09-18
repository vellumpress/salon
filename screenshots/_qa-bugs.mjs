import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const notes = [];

function attach(page, tag) {
  page.on("pageerror", (e) => errors.push(`${tag} page: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${tag} console: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes("fonts.g") || url.includes("basemaps.cartocdn") || url.includes("stun")) return;
    errors.push(`${tag} fail ${req.failure()?.errorText} ${url.slice(0, 120)}`);
  });
}

async function metrics(page, tag) {
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    return {
      dcl: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      fcp: Math.round(paint.find((p) => p.name === "first-contentful-paint")?.startTime ?? 0),
      transfer: Math.round(nav?.transferSize ?? 0),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  notes.push(`${tag} dcl=${m.dcl} load=${m.load} fcp=${m.fcp} xfer=${m.transfer} overflow=${m.overflow}`);
  if (m.overflow > 1) errors.push(`${tag}: horizontal overflow ${m.overflow}`);
  return m;
}

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
attach(page, "phone");
const t0 = Date.now();
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
notes.push(`goto dcl ${Date.now() - t0}ms`);
await page.waitForTimeout(400);
await metrics(page, "home");
await page.screenshot({ path: "/workspace/screenshots/bugs-home-phone.png" });

const hero = page.getByRole("link", { name: "Read something new together" });
const bg = await hero.evaluate((el) => getComputedStyle(el).backgroundColor);
notes.push(`hero bg ${bg} href=${await hero.getAttribute("href")}`);
if (bg === "rgb(196, 18, 48)") errors.push("hero still red");

await hero.click();
await page.waitForURL(/together=true/);
await page.waitForTimeout(200);
const header = await page.locator("header").innerText();
notes.push(`shuffle header ${JSON.stringify(header)}`);
if (!/Together/i.test(header)) errors.push("together landing did not say Together");
await page.screenshot({ path: "/workspace/screenshots/bugs-together-length.png" });
await metrics(page, "shuffle");

await page.getByRole("button", { name: "Twelve minutes" }).click();
await page.getByRole("button", { name: "Begin" }).waitFor({ timeout: 4000 });
const company = await page.getByRole("button", { name: "Alone" }).count();
if (company) errors.push("together still asked Alone");
await page.screenshot({ path: "/workspace/screenshots/bugs-together-share.png" });

const tBegin = Date.now();
await page.getByRole("button", { name: "Begin" }).click();
await page.waitForURL(/\/read\//);
notes.push(`begin->read ${Date.now() - tBegin}ms url=${page.url()}`);
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/bugs-together-read.png" });
const sentence = await page.locator(".breath-slot").innerText().catch(() => "");
notes.push(`together sentence ${JSON.stringify(sentence.slice(0, 90))}`);
if (!sentence.trim()) errors.push("together read has no sentence");
const hold = await page.getByRole("button", { name: "Hold to leave" }).count();
if (!hold) errors.push("missing hold to leave");
if (await page.getByText("Begin", { exact: true }).count()) errors.push("threshold Begin still on shuffle");

await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/bugs-hour.png" });
const hourText = await page.evaluate(() => document.body.innerText.slice(0, 200));
notes.push(`hour text=${hourText.slice(0, 80).replace(/\n/g, " ")}`);
if (!/Hour|Begin|Mallard|parlor/i.test(hourText)) errors.push("hour page blank");

await page.goto("http://127.0.0.1:8080/glass", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(250);
await page.screenshot({ path: "/workspace/screenshots/bugs-glass.png" });
const start = await page.getByRole("button", { name: "Start" }).count();
if (!start) errors.push("glass missing Start");

await page.goto("http://127.0.0.1:8080/map", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
const mapH = await page.locator(".leaflet-container, .store-map, .map-pane").evaluateAll((els) =>
  els.map((el) => ({ h: Math.round(el.getBoundingClientRect().height), c: el.className.slice(0, 40) })),
);
notes.push(`map ${JSON.stringify(mapH)}`);
if (!mapH.some((el) => el.h > 80)) errors.push("map has no height");
await page.screenshot({ path: "/workspace/screenshots/bugs-map.png" });

const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
attach(desk, "desk");
await desk.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await desk.waitForTimeout(250);
await metrics(desk, "desk-home");
await desk.screenshot({ path: "/workspace/screenshots/bugs-home-desktop.png" });

await browser.close();
console.log(notes.join("\n"));
if (errors.length) {
  console.log("ERRORS\n" + errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("bugs qa ok");
}

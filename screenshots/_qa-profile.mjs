import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const notes = [];

function attach(page, tag) {
  page.on("pageerror", (e) => errors.push(`${tag} page: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("hydration-mismatch") || text.includes("hydrated but some attributes")) return;
    errors.push(`${tag} console: ${text}`);
  });
}

async function overflow(page, tag) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  notes.push(`${tag} overflow ${extra}`);
  if (extra > 1) errors.push(`${tag}: horizontal overflow ${extra}`);
}

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
attach(phone, "phone");
await phone.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await phone.waitForTimeout(250);
const youHome = await phone.getByRole("link", { name: "You", exact: true }).count();
if (!youHome) errors.push("home missing You");
await phone.screenshot({ path: "/workspace/screenshots/profile-home-phone.png" });

await phone.getByRole("link", { name: "You", exact: true }).click();
await phone.waitForURL(/\/profile/);
await phone.waitForTimeout(200);
await overflow(phone, "empty");
const empty = await phone.locator("body").innerText();
notes.push(`empty ${empty.slice(0, 180).replace(/\n/g, " | ")}`);
if (!/Opened/.test(empty) || !/Following/.test(empty)) errors.push("profile missing stats");
if (!/No one yet/.test(empty)) errors.push("empty following missing");
await phone.screenshot({ path: "/workspace/screenshots/profile-empty-phone.png" });

await phone.getByRole("link", { name: "Clubs", exact: true }).first().click();
await phone.waitForURL(/\/clubs/);
await phone.waitForTimeout(200);
await phone.getByRole("button", { name: "Follow" }).first().click();
await phone.waitForTimeout(150);
await phone.getByRole("link", { name: "You", exact: true }).click();
await phone.waitForURL(/\/profile/);
await phone.waitForTimeout(250);
const followed = await phone.locator("body").innerText();
notes.push(`followed ${followed.slice(0, 220).replace(/\n/g, " | ")}`);
if (/No one yet/.test(followed)) errors.push("follow did not appear on profile");
if (!/Ada Voss|Jules Mallard|Nora Chen|Vera S|Ivo Reed|Cleo Hart|Leo Joyce|René Loisel/.test(followed)) {
  errors.push("followed name missing");
}
await phone.screenshot({ path: "/workspace/screenshots/profile-follow-phone.png" });

await phone.evaluate(() => {
  const raw = localStorage.getItem("vellum-v1");
  const parsed = raw ? JSON.parse(raw) : { state: {} };
  parsed.state = parsed.state ?? {};
  parsed.state.progress = {
    ...(parsed.state.progress ?? {}),
    hour: {
      breathIndex: 4,
      lastOpenedAt: Date.now(),
      sittingStartedAt: null,
      keywords: {},
      kept: ["parlor-0", "window-1"],
      completedAt: Date.now(),
      entered: true,
    },
    law: {
      breathIndex: 2,
      lastOpenedAt: Date.now() - 1000,
      sittingStartedAt: null,
      keywords: {},
      kept: ["gate-0"],
      completedAt: null,
      entered: true,
    },
  };
  parsed.state.lastShuffle = "window";
  localStorage.setItem("vellum-v1", JSON.stringify(parsed));
});
await phone.reload({ waitUntil: "domcontentloaded" });
await phone.waitForTimeout(300);
const stats = await phone.locator("body").innerText();
notes.push(`stats ${stats.slice(0, 280).replace(/\n/g, " | ")}`);
if (!/The Story of an Hour/.test(stats)) errors.push("opened work missing");
if (!/The Open Window/.test(stats)) errors.push("last shuffle missing");
await overflow(phone, "stats");
await phone.screenshot({ path: "/workspace/screenshots/profile-stats-phone.png" });

const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
attach(desk, "desk");
await desk.goto("http://127.0.0.1:8080/profile", { waitUntil: "domcontentloaded" });
await desk.waitForTimeout(250);
await overflow(desk, "desk");
await desk.screenshot({ path: "/workspace/screenshots/profile-empty-desktop.png" });

await browser.close();
console.log(notes.join("\n"));
if (errors.length) {
  console.log("ERRORS\n" + errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("profile qa ok");
}

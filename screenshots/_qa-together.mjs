import { chromium } from "playwright";

const browser = await chromium.launch({
  args: ["--no-sandbox", "--enable-features=WebRTC"],
});
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}

const phone = { width: 390, height: 844 };
const desktop = { width: 1280, height: 800 };

const page = await browser.newPage({ viewport: phone });
page.on("pageerror", (e) => errors.push(`phone: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`phone console: ${msg.text()}`);
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Shuffle a story" }).click();
await page.waitForTimeout(250);
await page.getByRole("button", { name: "Twelve minutes" }).click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "With a friend" }).click();
await page.waitForTimeout(200);
await shot(page, "together-share-phone");
await page.getByRole("button", { name: "Begin" }).click();
await page.waitForTimeout(500);
await shot(page, "together-wait-phone");

const url = page.url();
console.log("pair url", url);
if (!url.includes("pair=")) errors.push("missing pair in url");

const hold = await page.getByRole("button", { name: "Hold to leave" }).count();
const home = await page.getByRole("link", { name: "Home" }).count();
const shuffle = await page.getByRole("link", { name: "Shuffle a story" }).count();
const curator = await page.getByRole("link", { name: /Curator/i }).count();
const next = await page.getByRole("button", { name: "Next", exact: true }).count();
const field = page.locator(".chat-field");
const waiting = await page.getByText("waiting").count();
console.log({ hold, home, shuffle, curator, next, field: await field.count(), waiting });
if (!hold) errors.push("missing Hold to leave");
if (home) errors.push("Home still visible in together mode");
if (shuffle) errors.push("Shuffle still visible in together mode");
if (curator) errors.push("Curator still visible in together mode");
if (next) errors.push("Next footer still visible in together mode");
if (!(await field.count())) errors.push("missing chat field");

await page.getByRole("button", { name: "Next sentence" }).click();
await page.waitForTimeout(180);
await shot(page, "together-advance-phone");

const friend = await browser.newPage({ viewport: phone });
friend.on("pageerror", (e) => errors.push(`friend: ${e.message}`));
friend.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`friend console: ${msg.text()}`);
});
await friend.goto(url, { waitUntil: "load" });
await friend.waitForTimeout(2500);
await shot(friend, "together-friend-phone");

const sittingA = await page.getByText("2 sitting").count();
const sittingB = await friend.getByText("2 sitting").count();
const waitA = await page.getByText("waiting", { exact: true }).count();
const waitB = await friend.getByText("waiting", { exact: true }).count();
const reachA = await page.getByText("can't reach").count();
const reachB = await friend.getByText("can't reach").count();
console.log({ sittingA, sittingB, waitA, waitB, reachA, reachB });

await field.fill("the gate is open");
await page.getByRole("button", { name: "Send" }).click();
await page.waitForTimeout(800);
await shot(page, "together-sent-phone");
await shot(friend, "together-recv-phone");

const sent = await page.getByText("the gate is open").count();
const recv = await friend.getByText("the gate is open").count();
console.log({ sent, recv });
if (!sent) errors.push("local chat echo missing");
if (sittingA + sittingB > 0 && !recv) {
  errors.push("connected but chat did not arrive");
}

await friend.getByRole("textbox").fill("I am at the door");
await friend.getByRole("button", { name: "Send" }).click();
await friend.waitForTimeout(800);
await shot(page, "together-reply-phone");
const reply = await page.getByText("I am at the door").count();
console.log({ reply });
if (sittingA + sittingB > 0 && !reply) {
  errors.push("connected but reply did not arrive");
}

const wide = await browser.newPage({ viewport: desktop });
wide.on("pageerror", (e) => errors.push(`desktop: ${e.message}`));
await wide.goto(url, { waitUntil: "load" });
await wide.waitForTimeout(400);
await shot(wide, "together-wait-desktop");
const homeD = await wide.getByRole("link", { name: "Home" }).count();
const holdD = await wide.getByRole("button", { name: "Hold to leave" }).count();
if (homeD) errors.push("desktop Home visible in together mode");
if (!holdD) errors.push("desktop missing Hold to leave");

await page.close();
await friend.close();
await wide.close();
await browser.close();

if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("together qa ok");
}

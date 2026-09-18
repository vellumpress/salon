import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}

for (const v of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => errors.push(`${v.name}: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${v.name} console: ${msg.text()}`);
  });

  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await shot(page, `fade-home-${v.name}`);
  const homeText = await page.locator("body").innerText();
  console.log(`${v.name} home has Map=${homeText.includes("Map")} Hourglass=${homeText.includes("Hourglass")} NY=${homeText.includes("New York")}`);

  await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot(page, `fade-threshold-${v.name}`);
  await page.getByText("Begin", { exact: true }).click();
  await page.waitForTimeout(1600);
  await shot(page, `fade-breath0-${v.name}`);
  for (let i = 0; i < 7; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(950);
  }
  await shot(page, `fade-lookback-${v.name}`);
  const chrome = await page.locator("body").innerText();
  console.log(
    `${v.name} nav Home=${chrome.includes("Home")} Keep=${chrome.includes("Keep")} Prev=${chrome.includes("Prev")} Next=${chrome.includes("Next")} Rooms=${chrome.includes("Rooms")}`,
  );
  const looks = await page.locator(".look-line").count();
  console.log(`${v.name} lookback lines=${looks}`);

  await page.goto("http://127.0.0.1:8080/map", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await shot(page, `fade-map-${v.name}`);

  await page.goto("http://127.0.0.1:8080/glass", { waitUntil: "networkidle" });
  await shot(page, `fade-glass-${v.name}`);
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForTimeout(700);
  await shot(page, `fade-glass-run-${v.name}`);
  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("ok");
}

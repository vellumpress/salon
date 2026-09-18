import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}

const errors = [];

for (const v of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "short", width: 900, height: 420 },
]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => errors.push(`${v.name}: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${v.name} console: ${msg.text()}`);
  });
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await shot(page, `quiet-home-${v.name}`);
  await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "networkidle" });
  await shot(page, `quiet-threshold-${v.name}`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1600);
  await shot(page, `quiet-breath-${v.name}`);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1100);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1100);
  await shot(page, `quiet-advance-${v.name}`);
  const pane = page.locator(".reading-pane");
  const box = await pane.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.waitForTimeout(520);
    await shot(page, `quiet-weigh-${v.name}`);
    await page.mouse.up();
  }
  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exit(1);
}
console.log("ok");

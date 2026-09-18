import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(400);
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

  await page.goto("http://127.0.0.1:8080/map", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, `tool-map-${v.name}`);
  const magic = page.locator("text=Books Are Magic").first();
  if (await magic.count()) {
    await magic.click();
    await page.waitForTimeout(600);
    await shot(page, `tool-map-select-${v.name}`);
  }
  const tiles = await page.locator(".leaflet-tile-loaded").count();
  const pins = await page.locator(".shop-pin").count();
  console.log(`${v.name} map tiles=${tiles} pins=${pins}`);

  await page.goto("http://127.0.0.1:8080/glass", { waitUntil: "networkidle" });
  await shot(page, `tool-glass-pick-${v.name}`);
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "Turn" }).click();
  await page.waitForTimeout(800);
  await shot(page, `tool-glass-run-${v.name}`);
  const hold = page.getByRole("button", { name: "Hold to leave" });
  if (await hold.count()) {
    const box = await hold.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(900);
      await shot(page, `tool-glass-hold-${v.name}`);
      await page.mouse.up();
    }
  }
  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("ok");
}

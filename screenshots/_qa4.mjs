import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
async function shot(page, name) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}
for (const v of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "short", width: 900, height: 420 },
]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await shot(page, `qa4-home-${v.name}`);
  await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "networkidle" });
  await page.locator("h1").click();
  await page.waitForTimeout(1800);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(450);
  await shot(page, `qa4-breath-${v.name}`);
  const pane = page.locator(".reading-pane");
  const box = await pane.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await shot(page, `qa4-weigh-${v.name}`);
    await page.mouse.up();
  }
  await page.close();
}
await browser.close();

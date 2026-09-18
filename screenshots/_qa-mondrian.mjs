import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });

async function shot(page, name) {
  await page.waitForTimeout(280);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}

const views = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "short", width: 900, height: 420 },
];

for (const v of views) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (err) => console.log("PAGEERROR", v.name, err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE", v.name, msg.text());
  });

  await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "networkidle" });
  await shot(page, `now-threshold-${v.name}`);

  await page.locator("h1").click();
  await page.waitForTimeout(400);
  await shot(page, `now-plate-${v.name}`);
  await page.waitForTimeout(1600);
  await shot(page, `now-breath-${v.name}`);

  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(280);
  }
  await shot(page, `now-advance-${v.name}`);

  const pane = page.locator(".reading-pane");
  const box = await pane.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.waitForTimeout(560);
    await shot(page, `now-weigh-${v.name}`);
    await page.mouse.up();
  }

  await page.waitForTimeout(5400);
  await shot(page, `now-kernel-${v.name}`);

  await page.goto("http://127.0.0.1:8080/read/law", { waitUntil: "networkidle" });
  await page.locator("h1").click();
  await page.waitForTimeout(1800);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await shot(page, `now-law-${v.name}`);

  await page.close();
}

await browser.close();
console.log("ok");

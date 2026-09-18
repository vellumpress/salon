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
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await shot(page, `qa3-home-${v.name}`);

  await page.goto("http://127.0.0.1:8080/form", { waitUntil: "networkidle" });
  await shot(page, `qa3-form-${v.name}`);

  await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "networkidle" });
  await shot(page, `qa3-threshold-${v.name}`);

  const twenty = page.getByRole("button", { name: "20" });
  if (await twenty.count()) await twenty.click();
  await page.locator("h1").click();
  await page.waitForTimeout(450);
  await shot(page, `qa3-plate-${v.name}`);
  await page.waitForTimeout(1400);
  await shot(page, `qa3-breath-${v.name}`);

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(550);
  await shot(page, `qa3-breath2-${v.name}`);

  const pane = page.locator(".reading-pane");
  if (await pane.count()) {
    const box = await pane.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.waitForTimeout(520);
      await shot(page, `qa3-weigh-${v.name}`);
      await page.mouse.up();
    }
  }

  const keep = page.getByRole("button", { name: "Keep this sentence" });
  if (await keep.count()) {
    await keep.click();
    await page.waitForTimeout(200);
    await shot(page, `qa3-kept-${v.name}`);
  }

  const rooms = page.getByRole("button", { name: "Rooms" });
  if (await rooms.count()) {
    await rooms.click();
    await page.waitForTimeout(300);
    await shot(page, `qa3-spine-${v.name}`);
  }

  if (errors.length) console.log(v.name, "ERRORS", errors);
  else console.log(v.name, "ok");
  await page.close();
}

await browser.close();

import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(160);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}

function inView(box, w, h, pad = 8) {
  if (!box) return false;
  return box.y >= -2 && box.x >= -2 && box.y + box.height <= h + pad && box.x + box.width <= w + pad;
}

async function overflowReport(page, label) {
  return page.evaluate((tag) => {
    const w = window.innerWidth;
    const h =
      Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vvh")) ||
      window.innerHeight;
    const offenders = [];
    for (const el of document.querySelectorAll(
      "h1,h2,.veil-title,.veil-action,.veil-action-full,.veil-field,footer button",
    )) {
      const r = el.getBoundingClientRect();
      if (r.height < 4 || r.width < 4) continue;
      if (r.bottom > h + 4 || r.top < -4 || r.right > w + 4) {
        offenders.push({
          tag,
          text: (el.textContent || "").trim().slice(0, 48),
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          h: Math.round(h),
        });
      }
    }
    return { h, w, offenders: offenders.slice(0, 8) };
  }, label);
}

for (const v of [
  { name: "phone", width: 390, height: 844 },
  { name: "short", width: 390, height: 520 },
  { name: "tiny", width: 390, height: 420 },
]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => errors.push(`${v.name}: ${e.message}`));
  await page.addInitScript(() => localStorage.removeItem("vellum-v1"));
  await page.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "networkidle" });
  await page.waitForTimeout(200);

  await shot(page, `fit3-threshold-${v.name}`);
  console.log(v.name, "threshold", await overflowReport(page, "threshold"));

  await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForTimeout(120);
  await shot(page, `fit3-plate-${v.name}`);
  console.log(v.name, "plate", await overflowReport(page, "plate"));
  await page.waitForTimeout(700);

  const t0 = Date.now();
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(160);
  }
  console.log(v.name, "advance8ms", Date.now() - t0);
  await shot(page, `fit3-breath-${v.name}`);

  await page.getByRole("button", { name: "Rooms" }).click();
  await page.waitForTimeout(160);
  await shot(page, `fit3-rooms-${v.name}`);
  console.log(v.name, "rooms", await overflowReport(page, "rooms"));
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(120);

  for (let i = 0; i < 6; i++) {
    if (await page.locator(".veil-field").count()) break;
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(180);
  }
  await shot(page, `fit3-seam-${v.name}`);
  const fieldCount = await page.locator(".veil-field").count();
  console.log(v.name, "seam field", fieldCount, await overflowReport(page, "seam"));
  if (fieldCount) {
    const keep = page.locator(".veil-action").first();
    const box = await keep.boundingBox();
    console.log(v.name, "Keep in view", inView(box, v.width, v.height), box);
  }

  if (v.name === "short") {
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--vvh", "320px");
      document.documentElement.style.setProperty("--vv-offset", "0px");
    });
    await shot(page, "fit3-seam-keyboard");
    console.log("keyboard", await overflowReport(page, "keyboard"));
    const kbox = await keep.boundingBox();
    console.log("keyboard Keep", inView(kbox, v.width, 320), kbox);
  }

  if (v.name === "short") {
    await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
    await shot(page, "fit3-home-short");
    await page.goto("http://127.0.0.1:8080/glass", { waitUntil: "domcontentloaded" });
    await shot(page, "fit3-glass-short");
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

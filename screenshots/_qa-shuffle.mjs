import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(180);
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
  const shuffle = page.getByRole("link", { name: "Shuffle a story" });
  console.log(v.name, "home Shuffle", await shuffle.count());
  await shuffle.click();
  await page.waitForTimeout(250);
  await shot(page, `shuffle-length-${v.name}`);
  const howLong = await page.getByText("How long would you like to read for?").count();
  console.log(v.name, "how long", howLong);
  if (!howLong) errors.push(`${v.name}: missing length prompt`);

  await page.getByRole("button", { name: "Twelve minutes" }).click();
  await page.waitForTimeout(200);
  await shot(page, `shuffle-company-${v.name}`);
  const friend = await page.getByText("Read with a friend?").count();
  console.log(v.name, "friend", friend);
  if (!friend) errors.push(`${v.name}: missing friend prompt`);

  await page.getByRole("button", { name: "With a friend" }).click();
  await page.waitForTimeout(200);
  await shot(page, `shuffle-share-${v.name}`);
  const copy = page.getByRole("button", { name: /Copy the link|Send the link|Copied/ });
  console.log(v.name, "copy", await copy.count());
  const urlText = await page.locator(".veil-body").innerText();
  if (!urlText.includes("/read/") || !urlText.includes("pair=")) {
    errors.push(`${v.name}: missing share url ${urlText.slice(0, 80)}`);
  }

  await page.getByRole("button", { name: "Begin" }).click();
  await page.waitForTimeout(400);
  await shot(page, `shuffle-pair-read-${v.name}`);
  const begin = await page.getByText("Begin", { exact: true }).count();
  const linkBtn = await page.getByRole("button", { name: "Copy sitting link" }).count();
  console.log(v.name, "pair url", page.url(), "Begin", begin, "Link", linkBtn);
  if (begin) errors.push(`${v.name}: still showing Begin overlay`);
  if (!linkBtn) errors.push(`${v.name}: missing share button in reader`);
  if (!page.url().includes("shuffle=true") && !page.url().includes("shuffle=1")) {
    errors.push(`${v.name}: missing shuffle search`);
  }
  if (!page.url().includes("pair=")) errors.push(`${v.name}: missing pair search`);

  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Shuffle a story" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Twenty minutes" }).click();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: "Alone" }).click();
  await page.waitForTimeout(400);
  await shot(page, `shuffle-alone-read-${v.name}`);
  const begin2 = await page.getByText("Begin", { exact: true }).count();
  console.log(v.name, "alone url", page.url(), "Begin", begin2);
  if (begin2) errors.push(`${v.name}: alone still showing Begin`);

  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("ok");
}

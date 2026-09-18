import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(200);
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
  await shot(page, `club-home-${v.name}`);
  const clubsLink = page.getByRole("link", { name: /Clubs/ }).first();
  console.log(v.name, "home Clubs", await clubsLink.count());

  await clubsLink.click();
  await page.waitForTimeout(300);
  await shot(page, `club-list-${v.name}`);
  console.log(v.name, "list Hour", await page.getByText("The Hour").count());

  await page.getByRole("link", { name: /The Hour/ }).first().click();
  await page.waitForTimeout(250);
  await shot(page, `club-room-${v.name}`);

  await page.getByRole("button", { name: "Join" }).click();
  await page.waitForTimeout(150);
  await shot(page, `club-joined-${v.name}`);
  console.log(v.name, "You", await page.getByText("You", { exact: true }).count());

  await page.getByRole("button", { name: "Follow" }).first().click();
  await page.waitForTimeout(120);
  console.log(v.name, "Following", await page.getByRole("button", { name: "Following" }).count());

  await page.getByRole("link", { name: "Jules Mallard" }).click();
  await page.waitForTimeout(250);
  await shot(page, `club-reader-${v.name}`);

  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("ok");
}

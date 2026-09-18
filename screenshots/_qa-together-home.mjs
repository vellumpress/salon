import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function shot(page, name) {
  await page.waitForTimeout(160);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
}

for (const v of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "short", width: 390, height: 560 },
]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => errors.push(`${v.name}: ${e.message}`));
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);
  await shot(page, `together-home-${v.name}`);

  const hero = page.getByRole("link", { name: "Read something new together" });
  const n = await hero.count();
  console.log(v.name, "hero", n, "shuffle btn", await page.getByRole("link", { name: "Shuffle a story" }).count());
  if (!n) errors.push(`${v.name}: missing together hero`);

  const box = await hero.boundingBox();
  console.log(v.name, "hero box", box);
  if (box && box.y > 140) errors.push(`${v.name}: hero too far down ${box.y}`);
  if (box && v.name === "phone" && box.height < 140) errors.push(`${v.name}: hero too short ${box.height}`);

  await hero.click();
  await page.waitForTimeout(280);
  await shot(page, `together-home-length-${v.name}`);
  const togetherHdr = await page.getByText("Together", { exact: true }).count();
  const howLong = await page.getByText("How long would you like to read for?").count();
  console.log(v.name, "together hdr", togetherHdr, "how long", howLong, page.url());
  if (!howLong) errors.push(`${v.name}: missing length prompt`);
  if (!page.url().includes("together")) errors.push(`${v.name}: missing together search`);

  await page.getByRole("button", { name: "Twelve minutes" }).click();
  await page.waitForTimeout(250);
  await shot(page, `together-home-share-${v.name}`);
  const alone = await page.getByRole("button", { name: "Alone" }).count();
  const begin = await page.getByRole("button", { name: "Begin" }).count();
  const company = await page.getByText("Read with a friend?").count();
  console.log(v.name, "alone", alone, "begin", begin, "company", company);
  if (alone || company) errors.push(`${v.name}: still asking company`);
  if (!begin) errors.push(`${v.name}: missing Begin on together path`);

  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("together home qa ok");
}

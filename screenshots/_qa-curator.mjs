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
  const curatorHome = page.getByRole("link", { name: "Talk to the curator" });
  console.log(v.name, "home Curator", await curatorHome.count());
  await shot(page, `curator-home-${v.name}`);

  await page.getByRole("link", { name: /The Story of an Hour/ }).first().click();
  await page.waitForTimeout(250);
  if (await page.getByText("Begin", { exact: true }).count()) {
    await page.getByText("Begin", { exact: true }).click();
    await page.waitForTimeout(200);
  }
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(80);
  }
  const pass = await page.getByRole("button", { name: "Pass" }).count();
  const keepOverlay = await page.getByRole("button", { name: "Keep", exact: true }).count();
  const prompt = await page.getByText(/In a few words/).count();
  console.log(v.name, "seam Pass", pass, "Keep", keepOverlay, "prompt", prompt);
  if (pass || prompt) errors.push(`${v.name}: seam still interrupting`);
  await shot(page, `curator-read-${v.name}`);

  await page.getByRole("link", { name: "Talk to the curator" }).click();
  await page.waitForTimeout(250);
  await shot(page, `curator-empty-${v.name}`);
  const heading = await page.getByText(/What do you like to read|The Story of an Hour/).count();
  if (!heading) errors.push(`${v.name}: missing curator greeting`);

  await page.getByRole("button", { name: "Quiet, and short" }).click();
  await page.waitForTimeout(400);
  await shot(page, `curator-listen-${v.name}`);
  try {
    await page.getByText("Listening.").waitFor({ state: "hidden", timeout: 25000 });
  } catch {
    errors.push(`${v.name}: curator did not finish`);
  }
  await shot(page, `curator-reply-${v.name}`);
  const listening = await page.getByText("Listening.").count();
  const userLine = await page.getByText("Quiet, and short.").count();
  console.log(v.name, "listening", listening, "user", userLine, "body", (await page.locator("body").innerText()).slice(0, 180));
  if (listening) errors.push(`${v.name}: stuck listening`);
  if (!userLine) errors.push(`${v.name}: missing user turn`);

  await page.close();
}

await browser.close();
if (errors.length) {
  console.log(JSON.stringify(errors, null, 2));
  process.exitCode = 1;
} else {
  console.log("ok");
}

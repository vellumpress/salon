import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const notes = [];

function attach(page, tag) {
  page.on("pageerror", (e) => errors.push(`${tag} page: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("hydration-mismatch") || text.includes("hydrated but some attributes")) return;
    errors.push(`${tag} console: ${text}`);
  });
}

async function frameFit(page, tag) {
  const m = await page.evaluate(() => {
    const frame = document.querySelector(".frame-screen");
    const r = frame?.getBoundingClientRect();
    return {
      vvh: document.documentElement.style.getPropertyValue("--vvh"),
      off: document.documentElement.style.getPropertyValue("--vv-offset"),
      inner: window.innerHeight,
      innerW: window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
      top: r ? Math.round(r.top) : null,
      h: r ? Math.round(r.height) : null,
      bottom: r ? Math.round(r.bottom) : null,
      w: r ? Math.round(r.width) : null,
      hasFrame: Boolean(frame),
    };
  });
  notes.push(
    `${tag} vvh=${m.vvh} off=${m.off} inner=${m.inner}x${m.innerW} box=${m.w}x${m.h} top=${m.top} bot=${m.bottom} scrollW=${m.scrollW}`,
  );
  if (m.scrollW - m.innerW > 1) errors.push(`${tag}: horizontal overflow ${m.scrollW - m.innerW}`);
  if (!m.hasFrame) return m;
  if (m.top != null && m.top > 1) errors.push(`${tag}: frame offset top ${m.top}`);
  if (m.h != null && m.h > m.inner + 2) errors.push(`${tag}: frame taller than viewport ${m.h}>${m.inner}`);
  if (m.w != null && m.w > m.innerW + 2) errors.push(`${tag}: frame wider than viewport ${m.w}>${m.innerW}`);
  return m;
}

async function dismissVeil(page) {
  const veil = page.locator("button.veil");
  if (await veil.count()) {
    await veil.click({ force: true });
    await page.locator("button.veil").waitFor({ state: "hidden", timeout: 2000 }).catch(() => {});
  }
}

async function sentence(page) {
  return page.locator(".breath-slot p").first().innerText();
}

const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
attach(phone, "phone");
await phone.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await phone.waitForTimeout(250);
await frameFit(phone, "home");
await phone.screenshot({ path: "/workspace/screenshots/fix-home-phone.png" });

await phone.goto("http://127.0.0.1:8080/read/hour?shuffle=true&sit=12&pair=abc234", {
  waitUntil: "domcontentloaded",
});
await phone.waitForTimeout(300);
await frameFit(phone, "direct-together");
const direct0 = await sentence(phone);
notes.push(`direct0 ${JSON.stringify(direct0.slice(0, 70))}`);
if (!direct0.trim()) errors.push("direct together has no sentence");
await phone.screenshot({ path: "/workspace/screenshots/fix-direct-0.png" });
await phone.getByRole("button", { name: "Next sentence" }).click();
await phone.waitForTimeout(200);
const direct1 = await sentence(phone);
notes.push(`direct1 ${JSON.stringify(direct1.slice(0, 70))}`);
if (direct1 === direct0) errors.push("direct together Next did not advance");
await phone.getByRole("button", { name: "Next sentence" }).click();
await phone.waitForTimeout(200);
const direct2 = await sentence(phone);
if (direct2 === direct1) errors.push("direct together second Next did not advance");
await phone.screenshot({ path: "/workspace/screenshots/fix-direct-1.png" });

await phone.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await phone.waitForTimeout(200);

await phone.getByRole("link", { name: "Read something new together" }).click();
await phone.waitForURL(/together=true/);
await phone.waitForTimeout(300);
await phone.getByRole("button", { name: "Twelve minutes" }).click();
await phone.waitForTimeout(200);
if ((await phone.getByRole("button", { name: "Begin" }).count()) === 0) {
  const friend = phone.getByRole("button", { name: "With a friend" });
  if (await friend.count()) await friend.click();
  await phone.waitForTimeout(150);
}
const shareText = (await phone.locator("body").innerText()).slice(0, 180).replace(/\n/g, " | ");
notes.push(`share ${shareText}`);
await phone.getByRole("button", { name: "Begin" }).click();
await phone.waitForURL(/\/read\//);
await phone.waitForTimeout(250);
await frameFit(phone, "together");
const first = await sentence(phone);
notes.push(`together first ${JSON.stringify(first.slice(0, 70))}`);
if (!first.trim()) errors.push("together has no sentence");
await phone.screenshot({ path: "/workspace/screenshots/fix-together-0.png" });

await phone.getByRole("button", { name: "Next sentence" }).click();
await phone.waitForTimeout(180);
const second = await sentence(phone);
notes.push(`together next ${JSON.stringify(second.slice(0, 70))}`);
if (second === first) errors.push("together Next did not advance");
await phone.screenshot({ path: "/workspace/screenshots/fix-together-1.png" });

await phone.getByRole("button", { name: "Next sentence" }).click();
await phone.waitForTimeout(180);
const third = await sentence(phone);
if (third === second) errors.push("together second Next did not advance");

const hold = await phone.getByRole("button", { name: "Hold to leave" }).count();
if (!hold) errors.push("missing hold to leave");
const chat = await phone.locator(".chat-field").count();
if (!chat) errors.push("missing chat field");

const shortCtx = await browser.newContext({ viewport: { width: 390, height: 560 } });
const short = await shortCtx.newPage();
attach(short, "short");
await short.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await short.waitForTimeout(200);
await frameFit(short, "short-home");
await short.screenshot({ path: "/workspace/screenshots/fix-home-short.png" });
await short.goto("http://127.0.0.1:8080/read/hour", { waitUntil: "domcontentloaded" });
await short.waitForTimeout(250);
await frameFit(short, "short-read");
await dismissVeil(short);
await short.waitForTimeout(120);
const solo0 = await sentence(short);
await short.getByRole("button", { name: "Next sentence" }).click();
await short.waitForTimeout(180);
const solo1 = await sentence(short);
notes.push(`solo ${JSON.stringify(solo0.slice(0, 50))} -> ${JSON.stringify(solo1.slice(0, 50))}`);
if (!solo0.trim()) errors.push("solo has no sentence");
if (solo1 === solo0) errors.push("solo Next did not advance");
await short.screenshot({ path: "/workspace/screenshots/fix-read-short.png" });
await shortCtx.close();

const deskCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const desk = await deskCtx.newPage();
attach(desk, "desk");
await desk.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await desk.waitForTimeout(200);
await frameFit(desk, "desk-home");
await desk.screenshot({ path: "/workspace/screenshots/fix-home-desktop.png" });
await desk.goto("http://127.0.0.1:8080/read/law", { waitUntil: "domcontentloaded" });
await desk.waitForTimeout(200);
await dismissVeil(desk);
await desk.waitForTimeout(120);
await frameFit(desk, "desk-read");
const d0 = await sentence(desk);
await desk.getByRole("button", { name: "Next sentence" }).click();
await desk.waitForTimeout(180);
const d1 = await sentence(desk);
if (d1 === d0) errors.push("desktop Next did not advance");
await desk.screenshot({ path: "/workspace/screenshots/fix-read-desktop.png" });
await deskCtx.close();

const wrap = await browser.newPage({ viewport: { width: 430, height: 780 } });
attach(wrap, "iframe");
await wrap.setContent(
  `<iframe src="http://127.0.0.1:8080/read/hour" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`,
  { waitUntil: "domcontentloaded" },
);
const frame = wrap.frameLocator("iframe");
await wrap.waitForTimeout(500);
const iframeText = await frame.locator("body").innerText();
notes.push(`iframe text ${JSON.stringify(iframeText.slice(0, 80).replace(/\n/g, " "))}`);
if (!/Hour|Begin|Vellum|Mallard/i.test(iframeText)) errors.push("iframe reader empty");
await wrap.screenshot({ path: "/workspace/screenshots/fix-iframe.png" });

await browser.close();
console.log(notes.join("\n"));
if (errors.length) {
  console.log("ERRORS\n" + errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("fit-reader qa ok");
}

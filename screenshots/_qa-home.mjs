import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];

async function measure(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const labels = [...document.querySelectorAll(".cell-label")].map((n) => n.textContent?.trim());
    const search = document.querySelector("#shelf-search");
    const together = document.querySelector('a[aria-label="Read something new together"]')
      || [...document.querySelectorAll("a")].find((a) =>
          /Read something/.test(a.getAttribute("aria-label") ?? "") ||
          /Read something/.test(a.textContent ?? ""),
        );
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const first = document.querySelector(".cell-label")?.textContent?.trim();
    const searchTop = search?.getBoundingClientRect().top ?? -1;
    const curatedTop = document.querySelector(".cell-label")?.getBoundingClientRect().top ?? -1;
    const togetherTop = together?.getBoundingClientRect().top ?? -1;
    return {
      labels,
      first,
      hasSearch: Boolean(search),
      hasTogether: Boolean(together),
      togetherHref: together?.getAttribute("href") ?? "",
      overflow,
      orderOk: curatedTop < searchTop && searchTop < togetherTop,
      curatedTop: Math.round(curatedTop),
      searchTop: Math.round(searchTop),
      togetherTop: Math.round(togetherTop),
      shuffle: Boolean([...document.querySelectorAll("a")].find((a) => a.textContent?.trim() === "Shuffle" || a.getAttribute("aria-label") === "Shuffle a story" || /Shuffle/.test(a.textContent ?? "") && a.getAttribute("href") === "/shuffle")),
      clubs: Boolean([...document.querySelectorAll("a")].find((a) => /Clubs/.test(a.textContent ?? "") && (a.getAttribute("href") ?? "").includes("club"))),
      map: Boolean([...document.querySelectorAll("a")].find((a) => /New York/.test(a.textContent ?? ""))),
      glass: Boolean([...document.querySelectorAll("a")].find((a) => /Hourglass/.test(a.textContent ?? ""))),
      curator: Boolean([...document.querySelectorAll("a")].find((a) => /Curator/.test(a.textContent ?? ""))),
      you: Boolean([...document.querySelectorAll("a")].find((a) => {
        const t = (a.textContent ?? "").trim();
        return t === "You" || t === "Log in";
      })),
      page: Boolean([...document.querySelectorAll("a")].find((a) => (a.textContent ?? "").trim() === "Page")),
      rails: document.querySelectorAll(".rail").length,
      text: (main?.innerText ?? "").slice(0, 400),
    };
  });
}

for (const v of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "short", width: 390, height: 560 },
]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => errors.push(`${v.name}: ${e.message}`));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#shelf-search");
  await page.waitForSelector('main[data-hydrated="1"]');
  await page.waitForTimeout(200);
  const info = await measure(page);
  await page.screenshot({ path: `/workspace/screenshots/home-${v.name}.png`, fullPage: false });
  console.log(v.name, JSON.stringify(info, null, 2));
  if (!info.hasSearch) errors.push(`${v.name}: missing search`);
  if (!info.hasTogether) errors.push(`${v.name}: missing together`);
  if (!info.togetherHref.includes("together")) errors.push(`${v.name}: together href ${info.togetherHref}`);
  if (!info.orderOk) errors.push(`${v.name}: order curated/search/together ${info.curatedTop}/${info.searchTop}/${info.togetherTop}`);
  if (info.overflow) errors.push(`${v.name}: horizontal overflow`);
  if (info.first !== "Curated for you") errors.push(`${v.name}: first label ${info.first}`);
  for (const key of ["shuffle", "clubs", "map", "glass", "curator", "you", "page"]) {
    if (!info[key]) errors.push(`${v.name}: missing ${key}`);
  }
  if (info.rails < 2) errors.push(`${v.name}: expected discover rails, got ${info.rails}`);

  await page.fill("#shelf-search", "Gatsby");
  await page.waitForTimeout(250);
  const gatsby = page.getByText(/Great Gatsby/i);
  if ((await gatsby.count()) < 1) errors.push(`${v.name}: search missed Gatsby`);
  await page.screenshot({ path: `/workspace/screenshots/home-search-${v.name}.png`, fullPage: false });

  if (v.name === "phone") {
    await page.fill("#shelf-search", "");
    await page.waitForTimeout(200);
    await page.getByRole("link", { name: /Read something/i }).click();
    await page.waitForTimeout(400);
    if (!page.url().includes("together")) errors.push("together click missing search");
    const howLong = await page.getByText("How long would you like to read for?").count();
    if (!howLong) errors.push("together missing length prompt");
    await page.screenshot({ path: "/workspace/screenshots/home-together-phone.png", fullPage: false });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".rail");
    const before = await page.evaluate(() => document.querySelector(".rail")?.scrollLeft ?? 0);
    await page.evaluate(() => {
      const rail = document.querySelector(".rail");
      if (rail) rail.scrollLeft = 220;
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.querySelector(".rail")?.scrollLeft ?? 0);
    if (after <= before) errors.push("rail did not scroll");
    await page.screenshot({ path: "/workspace/screenshots/home-rail-phone.png", fullPage: false });
    const passing = page.getByRole("link").filter({ hasText: /Passing/i }).first();
    await passing.click();
    await page.waitForTimeout(1200);
    const breath = await page.locator(".breath-now").count();
    if (!breath) errors.push("curated book did not open");
    await page.screenshot({ path: "/workspace/screenshots/home-open-passing.png", fullPage: false });
  }
  await page.close();
}

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);

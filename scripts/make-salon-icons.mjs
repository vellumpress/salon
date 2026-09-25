#!/usr/bin/env node
/**
 * Rasterize public/favicon.svg — the shelf, ruled — into home-screen PNGs.
 * The SVG is the source of truth (navy t, paper b, forest r, square oxblood stop).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "public");
const svg = readFileSync(join(publicDir, "favicon.svg"), "utf8");
const chrome =
  process.env.CHROME_PATH ||
  ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].find((bin) => {
    const found = spawnSync("bash", ["-lc", `command -v ${bin}`], { encoding: "utf8" });
    return found.status === 0 && found.stdout.trim();
  });

if (!chrome) {
  console.error("Chrome or Chromium is required to rasterize the shelf icon.");
  process.exit(1);
}

const bin = spawnSync("bash", ["-lc", `command -v ${chrome}`], { encoding: "utf8" }).stdout.trim();

function raster(size, dest) {
  const dir = join(tmpdir(), `tbr-shelf-${size}`);
  mkdirSync(dir, { recursive: true });
  const htmlPath = join(dir, "icon.html");
  const shot = join(dir, "icon.png");
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#F3F1EB}svg{display:block;width:${size}px;height:${size}px}</style>${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}`;
  writeFileSync(htmlPath, html);
  const result = spawnSync(
    "timeout",
    [
      "20",
      bin,
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      `--user-data-dir=${join(dir, "profile")}`,
      `--screenshot=${shot}`,
      `--window-size=${size},${size}`,
      `file://${htmlPath}`,
    ],
    { encoding: "utf8" },
  );
  if (!result.stdout.includes("bytes written") && result.status !== 0 && result.status !== 124) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  const png = readFileSync(shot);
  writeFileSync(dest, png);
  console.log(`wrote ${dest} (${png.length} bytes)`);
}

raster(180, join(publicDir, "icon-180.png"));
raster(192, join(publicDir, "icon-192.png"));
raster(512, join(publicDir, "icon-512.png"));
raster(180, join(publicDir, "__grok", "icon-180.png"));
console.log("wrote tbr shelf icons");

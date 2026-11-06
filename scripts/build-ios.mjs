#!/usr/bin/env node
/**
 * Stage the existing GitHub Pages client for the Capacitor iOS shell.
 *
 * Runs the same `npm run build` the Pages workflow runs, then copies `dist/`
 * under `dist-ios/salon/` so the hardcoded `/salon/` base still resolves.
 * A paper-colored redirect at the web view root sends the app there.
 * The status-bar script is injected only into that copy.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const staged = join(root, "dist-ios");
const salon = join(staged, "salon");
const nativeStatus = join(root, "ios", "native-status.js");
const marker = "data-tbr-native-status";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(nativeStatus)) {
  console.error("[build-ios] missing ios/native-status.js");
  process.exit(1);
}

run("npm", ["run", "build"], {
  GITHUB_PAGES: "1",
  VITE_AUTH_ENABLED: "false",
  VITE_LIVE_BACKEND: "false",
});

if (!existsSync(join(dist, "index.html"))) {
  console.error("[build-ios] dist/index.html missing after the Pages build");
  process.exit(1);
}

rmSync(staged, { recursive: true, force: true });
mkdirSync(salon, { recursive: true });
cpSync(dist, salon, { recursive: true });
cpSync(nativeStatus, join(salon, "native-status.js"));

const indexPath = join(salon, "index.html");
let html = readFileSync(indexPath, "utf8");
if (!html.includes(marker)) {
  const tag = `<script ${marker} src="/salon/native-status.js"></script>`;
  if (!html.includes("</head>")) {
    console.error("[build-ios] dist index has no </head>");
    process.exit(1);
  }
  html = html.replace("</head>", `${tag}</head>`);
  writeFileSync(indexPath, html);
}

writeFileSync(
  join(staged, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#F3F1EB" />
  <title>tbr</title>
  <style>html,body{margin:0;background:#F3F1EB;color:#111111}</style>
  <script>location.replace("/salon/")</script>
</head>
<body></body>
</html>
`,
);

run("npx", ["cap", "sync", "ios"]);
console.log("[build-ios] synced ios/ from dist-ios");

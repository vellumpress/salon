#!/usr/bin/env node
/**
 * Playwright's --with-deps step installs apt packages. A runner DNS blip
 * ("Temporary failure resolving") fails that step before any book is opened,
 * and the catalog walk then files that as a book failure. One retry covers
 * the blip. A second failure still fails the job.
 *
 * The installer is this project's Playwright, not whatever `npx` resolves.
 * After it exits, each named browser has to launch. A missing executable
 * gets one forced reinstall. Any other launch failure fails the job with
 * the browser's own message.
 */
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const INSTALL_ATTEMPTS = 2;

const cliPath = fileURLToPath(new URL("../node_modules/playwright/cli.js", import.meta.url));

export async function installBrowsers(browsers, { run, pause, attempts = INSTALL_ATTEMPTS, log = () => {}, force = false } = {}) {
  const names = [...browsers].map((name) => String(name).trim()).filter(Boolean);
  if (names.length === 0) throw new Error("name at least one browser");
  const install = run ?? ((list) => defaultRun(list, { force }));
  const wait = pause ?? defaultPause;
  let code = 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    code = await install(names);
    if (code === 0) return 0;
    if (attempt < attempts) {
      log(`playwright install failed (attempt ${attempt} of ${attempts}), retrying`);
      await wait(attempt);
    }
  }
  return code === 0 ? 0 : code || 1;
}

export function installArgs(browsers, { force = false } = {}) {
  const args = ["install", "--with-deps"];
  if (force) args.push("--force");
  args.push(...browsers);
  return args;
}

export function defaultRun(browsers, { force = false } = {}) {
  return spawnCli(installArgs(browsers, { force }));
}

function spawnCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], { stdio: "inherit" });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function defaultPause(attempt) {
  return new Promise((resolve) => setTimeout(resolve, attempt * 20_000));
}

/** Empty string when every named browser launches. Otherwise the first error. */
export async function browserLaunchError(browsers) {
  const playwright = await import("playwright");
  for (const name of browsers) {
    const type = playwright[name];
    if (!type?.launch) return `unknown browser ${name}`;
    try {
      const browser = await type.launch(name === "chromium" ? { args: ["--no-sandbox"] } : {});
      await browser.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return message.split("\n").slice(0, 12).join("\n");
    }
  }
  return "";
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  const names = process.argv.slice(2);
  const log = (line) => console.error(line);
  let code = await installBrowsers(names, { log });
  if (code !== 0) process.exit(code);
  let problem = await browserLaunchError(names);
  if (problem && /Executable doesn't exist/.test(problem)) {
    log("a browser executable is missing after install; installing again");
    code = await installBrowsers(names, { log, force: true, attempts: 1 });
    if (code !== 0) process.exit(code);
    problem = await browserLaunchError(names);
  }
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
}

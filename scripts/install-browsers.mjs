#!/usr/bin/env node
/**
 * Playwright's --with-deps step installs apt packages. A runner DNS blip
 * ("Temporary failure resolving") fails that step before any book is opened,
 * and the catalog walk then files that as a book failure. One retry covers
 * the blip. A second failure still fails the job.
 */
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const INSTALL_ATTEMPTS = 2;

export async function installBrowsers(browsers, { run, pause, attempts = INSTALL_ATTEMPTS, log = () => {} } = {}) {
  const names = [...browsers].map((name) => String(name).trim()).filter(Boolean);
  if (names.length === 0) throw new Error("name at least one browser");
  const install = run ?? defaultRun;
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

function defaultRun(browsers) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["playwright", "install", "--with-deps", ...browsers], {
      stdio: "inherit",
    });
    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function defaultPause(attempt) {
  return new Promise((resolve) => setTimeout(resolve, attempt * 20_000));
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
  const code = await installBrowsers(process.argv.slice(2), { log: (line) => console.error(line) });
  process.exit(code);
}

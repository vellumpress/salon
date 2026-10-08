import { spawn } from "node:child_process";
import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.READER_ORIGIN ?? "http://127.0.0.1:8080";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCK = "/tmp/reader-dev-server.lock";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The page never loaded because nothing was listening, not because the book failed. */
export function readerDown(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_EMPTY_RESPONSE|ECONNREFUSED|ECONNRESET|socket hang up/.test(
    message,
  );
}

async function healthy() {
  try {
    const res = await fetch(`${ORIGIN}/salon/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function pidAlive(pid: number) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    unlinkSync(LOCK);
  } catch {
    /* another worker already released it */
  }
}

function takeLock(): boolean {
  try {
    const fd = openSync(LOCK, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "EEXIST") throw error;
    let holder = 0;
    try {
      holder = Number(readFileSync(LOCK, "utf8"));
    } catch {
      holder = 0;
    }
    if (!pidAlive(holder)) {
      releaseLock();
      return takeLock();
    }
    return false;
  }
}

async function spawnServer() {
  if (!takeLock()) return false;
  const log = openSync("/tmp/reader-dev-server.log", "a");
  try {
    const child = spawn("npm", ["run", "dev"], {
      cwd: repoRoot,
      detached: true,
      stdio: ["ignore", log, log],
      env: process.env,
    });
    child.unref();
    let exited = false;
    child.once("exit", () => {
      exited = true;
    });
    const until = Date.now() + 30_000;
    while (Date.now() < until) {
      if (await healthy()) return true;
      if (exited) return false;
      await sleep(400);
    }
    return healthy();
  } finally {
    releaseLock();
  }
}

/**
 * The reader tests share one dev server. Stopping it when a file finishes
 * drops the next file mid-page, so this only starts a server and leaves it up.
 */
export async function ensureReaderServer() {
  if (process.env.READER_ORIGIN) return async () => {};
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await healthy()) {
      await sleep(400);
      if (await healthy()) return async () => {};
      continue;
    }
    if (await spawnServer()) {
      if (await healthy()) return async () => {};
    }
    await sleep(400);
  }
  throw new Error("reader did not start");
}

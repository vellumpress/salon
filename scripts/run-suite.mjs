#!/usr/bin/env node
/**
 * One list of test files. Deploy runs unit and smoke in parallel.
 * The ten-run tap stress stays in the smoke file and is skipped there;
 * the after-deploy workflow runs that test against the built site.
 */
import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const scriptTests = "scripts/**/*.test.mjs";

/** Browser smoke that still runs before a Pages deploy.
 * Even indexes land in shard 1, odd in shard 2. The long tap file and the
 * three-phone sit lead, so they land on different machines. Hold stays with
 * the taps: a busy three-phone sit can make a release look like an extra step. */
export const smokeFiles = [
  "src/lib/reader-back-tap.test.ts",
  "src/lib/social-rooms.e2e.test.ts",
  "src/lib/reader-tap-matrix.test.ts",
  "src/lib/reader-chrome-bar.test.ts",
  "src/lib/reader-hold.test.ts",
  "src/lib/reader-sit-resume.test.ts",
  "src/lib/reader-tap-stress.test.ts",
  "src/lib/reader-back-ios.test.ts",
  "src/lib/you-score-open.test.ts",
];

/** Every TypeScript test, in the historical npm test order. */
export const allTsFiles = [
  "src/lib/app-data/app-data.test.ts",
  "src/lib/reader-intro.test.ts",
  "src/lib/emphasized-text.test.ts",
  "src/lib/reader-threshold.test.ts",
  "src/lib/reader-sit-resume.test.ts",
  "src/lib/catalog/rituals-duration.test.ts",
  "src/lib/catalog/rituals-lead.test.ts",
  "src/lib/catalog/serialize.test.ts",
  "src/lib/catalog/en-rights.test.ts",
  "src/lib/catalog/card-copy.test.ts",
  "src/lib/catalog/poetry-bind.test.ts",
  "src/lib/catalog/curatorial.test.ts",
  "src/lib/catalog/adapted.test.ts",
  "src/lib/catalog/pipeline-leak.test.ts",
  "src/lib/catalog/text-apparatus.test.ts",
  "src/lib/catalog/curated.test.ts",
  "src/lib/catalog/places.test.ts",
  "src/lib/catalog/place-chip-ui.test.ts",
  "src/lib/catalog/dialogue-formatting.test.ts",
  "src/lib/sitting.test.ts",
  "src/lib/shuffle.test.ts",
  "src/lib/continuity.test.ts",
  "src/lib/kept-lines.test.ts",
  "src/lib/rebind-guard.test.ts",
  "src/lib/friends.test.ts",
  "src/lib/friend-profile.test.ts",
  "src/lib/notable-authors.test.ts",
  "src/lib/remote-activity.test.ts",
  "src/lib/remote-auth.test.ts",
  "src/lib/favorites.test.ts",
  "src/lib/auth/gate-identity.test.ts",
  "src/lib/auth/start-cookie-options.test.ts",
  "src/lib/recommend.test.ts",
  "src/lib/works-strip.test.ts",
  "src/lib/club-time.test.ts",
  "src/lib/vvh.test.ts",
  "src/lib/chat-field-contrast.test.ts",
  "src/lib/share-codec.test.ts",
  "src/lib/together-keep.test.ts",
  "src/lib/hosted-sit.test.ts",
  "src/lib/sit-pledge.test.ts",
  "src/lib/salon-card.test.ts",
  "src/lib/reading-stats.test.ts",
  "src/lib/reading-score.test.ts",
  "src/lib/score-hourglass.test.ts",
  "src/lib/active-read.test.ts",
  "src/lib/chamber-reader-chrome.test.ts",
  "src/lib/reader-chrome.test.ts",
  "src/lib/daylight-colors.test.ts",
  "src/lib/center-line.test.ts",
  "src/lib/reader-turn.test.ts",
  "src/lib/reader-hold.test.ts",
  "src/lib/status-bar-color.test.ts",
  "src/lib/reader-chrome-bar.test.ts",
  "src/lib/reader-back-tap.test.ts",
  "src/lib/reader-back-ios.test.ts",
  "src/lib/reader-tap-matrix.test.ts",
  "src/lib/catalog-walk.test.ts",
  "src/lib/reader-tap-stress.test.ts",
  "src/lib/spine-nav.test.ts",
  "src/lib/opening-scene.test.ts",
  "src/lib/reader-account.test.ts",
  "src/lib/you-hero-palette.test.ts",
  "src/lib/you-radar.test.ts",
  "src/lib/site.test.ts",
  "src/lib/chunk-reload.test.ts",
  "src/lib/net.test.ts",
  "src/lib/invite-share.test.ts",
  "src/lib/import/pdf-text.test.ts",
  "src/lib/import/html-text.test.ts",
  "src/lib/import/url.test.ts",
  "src/lib/import/pdf-error.test.ts",
  "src/lib/import/pdf-page-text.test.ts",
  "src/lib/import/readable-stream-async-iterator.test.ts",
  "src/lib/auth-return.test.ts",
  "src/lib/club-flow.test.ts",
  "src/lib/multiplayer/sit-logic.test.ts",
  "src/lib/social-rooms.e2e.test.ts",
  "src/lib/you-score-paint.test.ts",
  "src/lib/you-score-open.test.ts",
  "src/lib/streak-freeze.test.ts",
  "src/lib/quote-share.test.ts",
  "src/lib/quote-unfurl.test.ts",
  "src/lib/streak-notify.test.ts",
];

const smokeSet = new Set(smokeFiles);

export function unitFiles() {
  return allTsFiles.filter((file) => !smokeSet.has(file));
}

/** Shard "1/2" keeps indexes 0, 2, 4… so the two halves are a partition. */
export function shardFiles(files, spec = process.env.TEST_SHARD) {
  if (!spec) return files;
  const match = /^(\d+)\/(\d+)$/.exec(spec);
  if (!match) throw new Error(`TEST_SHARD must look like 1/2, got ${spec}`);
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (total < 1 || index < 1 || index > total) {
    throw new Error(`TEST_SHARD ${spec} is out of range`);
  }
  return files.filter((_, i) => i % total === index - 1);
}

export function filesFor(mode) {
  if (mode === "unit") return unitFiles();
  if (mode === "smoke") return smokeFiles;
  if (mode === "all") return allTsFiles;
  throw new Error(`unknown suite ${mode}`);
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`node ${args.join(" ")} exited ${code}`));
    });
  });
}

function testArgs(files) {
  const args = ["--experimental-strip-types", "--test"];
  const concurrency = process.env.TEST_CONCURRENCY;
  if (concurrency) args.push(`--test-concurrency=${concurrency}`);
  args.push(...files);
  return args;
}

/** Smoke never runs the ten-run stress or the full catalog unless asked. */
export function smokeDefaults(env = {}) {
  return {
    ...env,
    TAP_STRESS: env.TAP_STRESS || "skip",
    CATALOG_WALK: env.CATALOG_WALK || "sample",
  };
}

export async function runSuite(mode) {
  if (mode === "smoke") Object.assign(process.env, smokeDefaults(process.env));
  const files = shardFiles(filesFor(mode)).filter((file) => existsSync(file));
  if (mode !== "smoke") {
    const scripts = shardFiles([scriptTests]);
    if (scripts.length) await run(["--test", ...scripts]);
  }
  if (files.length) await run(testArgs(files));
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
  const mode = process.argv[2] ?? "all";
  runSuite(mode).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

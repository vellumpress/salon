#!/usr/bin/env node
/**
 * Regenerates the PWA tiles. Favicon SVG is hand-authored (no full stop).
 * PNG tiles are drawn by scripts/make-salon-icons.py (Pillow + Liberation Serif).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "make-salon-icons.py");
const result = spawnSync("python3", [script], { stdio: "inherit" });
process.exit(result.status ?? 1);

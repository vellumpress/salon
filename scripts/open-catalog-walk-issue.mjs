#!/usr/bin/env node
/**
 * The full catalog walk is not allowed to fail quietly. A red workflow is
 * the visible signal; an open issue is the one the owner sees later.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CATALOG_WALK_ISSUE_TITLE = "Catalog walk failed";

export function buildIssueBody({ message, runUrl, sha }) {
  const text = String(message ?? "The catalog walk failed before it named a book.");
  const clipped = text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
  const safe = clipped.replaceAll("```", "'''");
  let kind = "The walk failed.";
  if (/page\.goto: Timeout \d+ms exceeded/.test(text)) {
    kind = "A book still did not open after one retry of a page.goto timeout.";
  } else if (/\b(?:back|forward): index /.test(text)) {
    kind = "A sentence step failed. That is a real failure, and it is not retried.";
  }
  return [
    kind,
    "",
    "The Pages deploy does not wait for this walk. Before deploy, the suite walks every book changed in the push, a rotating sample of 40, and the anchors the-house-of-mirth, the-goose-man, dona-perfecta, and falcon.",
    "",
    "```",
    safe,
    "```",
    "",
    `Run: ${runUrl}`,
    `Commit: \`${sha}\``,
  ].join("\n");
}

export function catalogIssuePlan(openIssueNumbers) {
  const number = openIssueNumbers.find((value) => Number.isInteger(value) && value > 0);
  if (number) return { action: "comment", number };
  return { action: "create" };
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

function readFailureMessage() {
  const file = process.env.CATALOG_WALK_FAILURE_FILE ?? "catalog-walk-failure.json";
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed && typeof parsed.message === "string" && parsed.message.trim())
      return parsed.message;
  } catch {
    /* the workflow log is the fallback */
  }
  return "The catalog walk failed before it recorded a book.";
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.error("GITHUB_REPOSITORY is not set");
    process.exit(1);
  }
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runUrl = runId ? `${server}/${repo}/actions/runs/${runId}` : server;
  const body = buildIssueBody({
    message: readFailureMessage(),
    runUrl,
    sha: process.env.GITHUB_SHA ?? "",
  });
  const listed = gh([
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--limit",
    "5",
    "--search",
    `${CATALOG_WALK_ISSUE_TITLE} in:title`,
    "--json",
    "number",
  ]);
  const open = JSON.parse(listed);
  const numbers = Array.isArray(open) ? open.map((issue) => issue?.number) : [];
  const plan = catalogIssuePlan(numbers);
  const bodyFile = join(tmpdir(), "catalog-walk-issue.md");
  writeFileSync(bodyFile, body);
  if (plan.action === "comment") {
    gh(["issue", "comment", String(plan.number), "--repo", repo, "--body-file", bodyFile]);
    console.log(`commented on catalog walk issue #${plan.number}`);
    return;
  }
  gh([
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    CATALOG_WALK_ISSUE_TITLE,
    "--body-file",
    bodyFile,
  ]);
  console.log("opened a catalog walk issue");
}

if (isDirectRun()) main();

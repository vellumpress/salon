import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIssueBody,
  catalogIssuePlan,
  CATALOG_WALK_ISSUE_TITLE,
} from "./open-catalog-walk-issue.mjs";

test("a goto timeout that survived the retry is named as such", () => {
  const body = buildIssueBody({
    message: "the-trespasser at 189 did not open (page.goto: Timeout 30000ms exceeded.)",
    runUrl: "https://github.com/vellumpress/salon/actions/runs/1",
    sha: "abc1234",
  });
  assert.match(body, /still did not open after one retry/);
  assert.match(body, /the-trespasser at 189/);
  assert.match(body, /actions\/runs\/1/);
  assert.match(body, /`abc1234`/);
  assert.doesNotMatch(body, /sentence step failed/);
});

test("a real step failure is not described as a timeout flake", () => {
  const body = buildIssueBody({
    message: "gods-trombones back: index 7 scroll 0, expected 7 after 1 (from 8)",
    runUrl: "https://github.com/vellumpress/salon/actions/runs/2",
    sha: "def5678",
  });
  assert.match(body, /sentence step failed/);
  assert.match(body, /not retried/);
  assert.doesNotMatch(body, /page\.goto/);
});

test("an open catalog issue gets a comment instead of a second issue", () => {
  assert.deepEqual(catalogIssuePlan([]), { action: "create" });
  assert.deepEqual(catalogIssuePlan([undefined, 0, 42]), { action: "comment", number: 42 });
  assert.equal(CATALOG_WALK_ISSUE_TITLE, "Catalog walk failed");
});

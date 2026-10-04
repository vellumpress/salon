import assert from "node:assert/strict";
import test from "node:test";
import { PDF_FAIL, PDF_LOCKED } from "./messages.ts";
import { PDF_CAUSE_LIMIT, isWorkerStartupError, pdfFail, pdfFailDetail } from "./pdf-error.ts";

test("pdf fail keeps the friendly line and carries the real error", () => {
  const cause = new Error("x".repeat(200));
  cause.name = "UnknownErrorException";
  const err = pdfFail(cause);
  assert.equal(err.message, PDF_FAIL);
  assert.equal(err.cause, cause);
  const detail = pdfFailDetail(err);
  assert.equal(detail.length, PDF_CAUSE_LIMIT);
  assert.equal(detail.startsWith("UnknownErrorException: "), true);
  assert.equal(detail.endsWith("…"), true);
});

test("short causes stay whole", () => {
  const cause = new Error("Setting up fake worker failed.");
  cause.name = "Error";
  const detail = pdfFailDetail(pdfFail(cause));
  assert.equal(detail, "Error: Setting up fake worker failed.");
  assert.equal(pdfFailDetail(new Error(PDF_LOCKED)), "");
});

test("worker and startup failures can retry; a bad pdf cannot", () => {
  assert.equal(isWorkerStartupError(new Error('Setting up fake worker failed: "missing".')), true);
  const missing = new Error("Promise.withResolvers is not a function");
  missing.name = "UnknownErrorException";
  assert.equal(isWorkerStartupError(missing), true);
  assert.equal(isWorkerStartupError(new Error("Importing a module script failed.")), true);
  const invalid = new Error("Invalid PDF structure.");
  invalid.name = "InvalidPDFException";
  assert.equal(isWorkerStartupError(invalid), false);
  const format = new Error("bad xref");
  format.name = "FormatError";
  assert.equal(isWorkerStartupError(format), false);
  const password = new Error("No password given");
  password.name = "PasswordException";
  assert.equal(isWorkerStartupError(password), false);
});

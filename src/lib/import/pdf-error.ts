import { PDF_FAIL, PDF_NOT, PDF_TOO_LARGE, SCANNED_PDF } from "./messages.ts";

/** Shown under the friendly line. About one short sentence. */
export const PDF_CAUSE_LIMIT = 120;

const KNOWN_MESSAGES = new Set<string>([SCANNED_PDF, PDF_TOO_LARGE, PDF_NOT]);

const STARTUP =
  /worker|withresolvers|getorinsertcomputed|sumprecise|frombase64|failed to fetch|dynamically imported|module script|networkerror|importscripts|api version/i;

const NOT_WORKER = new Set(["InvalidPDFException", "FormatError", "PasswordException", "AbortException"]);

export function isKnownPdfMessage(message: string) {
  return KNOWN_MESSAGES.has(message);
}

/**
 * The real worker failed to boot, or pdf.js reported a worker/startup failure.
 * A bad file (invalid PDF, format, password, abort) is not one of these.
 */
export function isWorkerStartupError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (NOT_WORKER.has(err.name)) return false;
  if (err.name === "UnknownErrorException") return true;
  if (STARTUP.test(err.name) || STARTUP.test(err.message)) return true;
  if (err.cause && err.cause !== err) return isWorkerStartupError(err.cause);
  return false;
}

export function pdfFail(err: unknown): Error {
  const cause = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Error");
  return new Error(PDF_FAIL, { cause });
}

/** `${name}: ${message}`, collapsed and cut to about 120 characters. */
export function pdfFailDetail(err: unknown): string {
  if (!(err instanceof Error) || err.message !== PDF_FAIL) return "";
  const cause = err.cause;
  if (!(cause instanceof Error)) return "";
  const text = `${cause.name}: ${cause.message}`.replace(/\s+/g, " ").trim();
  if (text.length <= PDF_CAUSE_LIMIT) return text;
  return `${text.slice(0, PDF_CAUSE_LIMIT - 1)}…`;
}

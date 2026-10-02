import assert from "node:assert/strict";
import test from "node:test";
import { URL_BAD, URL_PRIVATE, URL_SCHEME } from "./messages.ts";
import { assertImportUrl } from "./url.ts";

test("public http and https addresses pass", () => {
  assert.equal(assertImportUrl("https://example.com/story").href, "https://example.com/story");
  assert.equal(assertImportUrl("  http://example.com/a  ").protocol, "http:");
  assert.equal(assertImportUrl("https://8.8.8.8/x").hostname, "8.8.8.8");
  assert.equal(assertImportUrl("https://172.15.0.1/x").hostname, "172.15.0.1");
});

test("non-web schemes and broken addresses fail", () => {
  assert.throws(() => assertImportUrl("ftp://example.com"), (err: unknown) => err instanceof Error && err.message === URL_SCHEME);
  assert.throws(() => assertImportUrl("javascript:alert(1)"), (err: unknown) => err instanceof Error && err.message === URL_SCHEME);
  assert.throws(() => assertImportUrl("not a url"), (err: unknown) => err instanceof Error && err.message === URL_BAD);
  assert.throws(() => assertImportUrl(""), (err: unknown) => err instanceof Error && err.message === URL_BAD);
});

test("localhost and private addresses are refused", () => {
  const blocked = [
    "http://localhost/secret",
    "http://LOCALHOST:8080/",
    "http://printer.local/page",
    "http://127.0.0.1/",
    "http://127.1/",
    "http://10.1.2.3/a",
    "http://192.168.0.2/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://169.254.1.1/",
    "http://0.0.0.0/",
    "http://[::1]/",
    "http://[fc00::1]/",
    "http://[fe80::1]/",
    "http://metadata.google.internal/compute",
    "http://2130706433/",
    "https://user:pass@example.com/",
  ];
  for (const raw of blocked) {
    assert.throws(
      () => assertImportUrl(raw),
      (err: unknown) => err instanceof Error && err.message === URL_PRIVATE,
      raw,
    );
  }
});

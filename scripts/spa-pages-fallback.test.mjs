import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  PATH_SEGMENTS_TO_KEEP,
  SPA_RESTORE_ATTR,
  applySpaPagesFallback,
  encodeSpaRedirectPath,
  injectSpaRestoreScript,
  public404Path,
  renderSpa404Html,
  restoreSpaRedirectPath,
} from "./spa-pages-fallback.mjs";

function loc(pathname, search = "", hash = "") {
  return { pathname, search, hash };
}

test("keeps /salon as the Pages project prefix", () => {
  assert.equal(PATH_SEGMENTS_TO_KEEP, 1);
});

test("encodes reader and chrome routes under /salon/", () => {
  assert.equal(
    encodeSpaRedirectPath(loc("/salon/read/enchanted-april")),
    "/salon/?/read/enchanted-april",
  );
  assert.equal(encodeSpaRedirectPath(loc("/salon/rituals")), "/salon/?/rituals");
  assert.equal(encodeSpaRedirectPath(loc("/salon/profile")), "/salon/?/profile");
  assert.equal(encodeSpaRedirectPath(loc("/salon/friends")), "/salon/?/friends");
  assert.equal(
    encodeSpaRedirectPath(loc("/salon/read/enchanted-april", "?at=3", "#n")),
    "/salon/?/read/enchanted-april&at=3#n",
  );
  assert.equal(
    encodeSpaRedirectPath(loc("/salon/read/foo", "?at=1&x=2")),
    "/salon/?/read/foo&at=1~and~x=2",
  );
});

test("restores the encoded query back to the client route", () => {
  assert.equal(
    restoreSpaRedirectPath(loc("/salon/", "?/read/enchanted-april")),
    "/salon/read/enchanted-april",
  );
  assert.equal(
    restoreSpaRedirectPath(loc("/salon/", "?/rituals")),
    "/salon/rituals",
  );
  assert.equal(
    restoreSpaRedirectPath(loc("/salon/", "?/read/enchanted-april&at=3", "#n")),
    "/salon/read/enchanted-april?at=3#n",
  );
  assert.equal(
    restoreSpaRedirectPath(loc("/salon/", "?/read/foo&at=1~and~x=2")),
    "/salon/read/foo?at=1&x=2",
  );
  assert.equal(
    restoreSpaRedirectPath(loc("/salon", "?/friends")),
    "/salon/friends",
  );
  assert.equal(restoreSpaRedirectPath(loc("/salon/", "?utm=1")), "/salon/?utm=1");
});

test("encode then restore is a round trip for cold deep links", () => {
  const samples = [
    loc("/salon/read/enchanted-april"),
    loc("/salon/rituals"),
    loc("/salon/profile"),
    loc("/salon/friends"),
    loc("/salon/adapted"),
    loc("/salon/together"),
    loc("/salon/read/the-willows", "?at=12"),
    loc("/salon/s/abc", "", "#line"),
  ];
  for (const sample of samples) {
    const encoded = encodeSpaRedirectPath(sample);
    const qAt = encoded.indexOf("?");
    const hashAt = encoded.indexOf("#");
    const pathname = encoded.slice(0, qAt);
    const search = hashAt === -1 ? encoded.slice(qAt) : encoded.slice(qAt, hashAt);
    const hash = hashAt === -1 ? "" : encoded.slice(hashAt);
    assert.equal(
      restoreSpaRedirectPath({ pathname, search, hash }),
      `${sample.pathname}${sample.search}${sample.hash}`,
    );
  }
});

test("404.html is the redirect shim, not a copy of the SPA shell", () => {
  const html = renderSpa404Html();
  assert.ok(Buffer.byteLength(html) > 512);
  assert.match(html, /pathSegmentsToKeep = 1/);
  assert.match(html, /spa-github-pages/);
  assert.match(html, /l\.replace/);
  assert.doesNotMatch(html, /\$_TSR|modulepreload|board-doors/);
  assert.equal(readFileSync(public404Path(), "utf8"), html);
});

test("injects the restore script once, first thing in head", () => {
  const once = injectSpaRestoreScript(
    '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body></body></html>',
  );
  assert.match(once, new RegExp(`<head><script ${SPA_RESTORE_ATTR}`));
  assert.match(once, /history\.replaceState/);
  const twice = injectSpaRestoreScript(once);
  assert.equal(twice, once);
  assert.equal(injectSpaRestoreScript("<p>no head</p>"), "<p>no head</p>");
});

test("applySpaPagesFallback writes 404.html and patches index.html", () => {
  const dest = mkdtempSync(join(tmpdir(), "salon-pages-"));
  mkdirSync(dest, { recursive: true });
  writeFileSync(
    join(dest, "index.html"),
    "<html><head><title>Salon</title></head><body>home</body></html>",
  );
  applySpaPagesFallback(dest);
  const fallback = readFileSync(join(dest, "404.html"), "utf8");
  const index = readFileSync(join(dest, "index.html"), "utf8");
  assert.equal(fallback, renderSpa404Html());
  assert.match(index, new RegExp(SPA_RESTORE_ATTR));
  assert.match(index, /<title>Salon<\/title>/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  isCatalogBookModule,
  scanStaffText,
  stripBindStaff,
  stripCatalogBookSource,
} from "./strip-bind-notes.mjs";

test("catalog book module ids match texts and openings only", () => {
  assert.equal(
    isCatalogBookModule("/workspace/src/lib/catalog/texts/south-wind.json"),
    true,
  );
  assert.equal(
    isCatalogBookModule("/workspace/src/lib/catalog/openings/south-wind.json?import"),
    true,
  );
  assert.equal(isCatalogBookModule("/workspace/src/lib/catalog/shelf.ts"), false);
  assert.equal(isCatalogBookModule("/workspace/src/lib/catalog/texts/note.txt"), false);
});

test("strip drops the bind note and keeps the printed book", () => {
  const raw = JSON.stringify({
    id: "sample",
    title: "Sample",
    note: "Host: Ch I — Inventory 81. PG reading-ease 80.0. Launch shelf NO — do not soft-inflate. Daisy-weighted lead.",
    breaths: [{ id: "s0-0", text: "And to the Manciple then spake our Host: “Because that drink." }],
  });
  const next = stripCatalogBookSource(raw);
  assert.ok(next);
  const data = JSON.parse(next);
  assert.equal("note" in data, false);
  assert.equal(data.breaths[0].text.includes("our Host:"), true);
  assert.equal(scanStaffText(next, "sample").length, 0);
  assert.equal(scanStaffText(raw, "raw-note").some((hit) => hit.name === "PG reading-ease"), true);
});

test("a staff Host: label in the book body is not an allowlisted prose hit", () => {
  const body = JSON.stringify({
    breaths: [{ text: "Host: Ch I — open here. Inventory 81 medium." }],
  });
  const names = scanStaffText(body, "body").map((hit) => hit.name);
  assert.ok(names.includes("Host:"));
  assert.ok(names.includes("Inventory"));
});

test("known literary collisions stay allowlisted", () => {
  const prose = [
    "And to the Manciple then spake our Host:",
    "Drew after him the third part of Heav\u2019ns Host:",
    'Inventory of Sunday school prize stock.',
    "Inventory of Furniture at No. 59 Preston Street",
    "Disappointment--Inventory OF Articles BROUGHT FROM THE SHIP",
  ].join("\n");
  assert.deepEqual(scanStaffText(prose, "prose"), []);
});

test("stripBindStaff is a no-op without a note", () => {
  const data = { id: "x", breaths: [] };
  assert.equal(stripBindStaff(data), data);
  assert.equal(stripCatalogBookSource(JSON.stringify(data)), null);
});

test("vite config registers the production strip plugin", () => {
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /stripBindNotesPlugin\(/);
});

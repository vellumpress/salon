#!/usr/bin/env node
/**
 * Mondrian home-screen icons: red / blue / green planes, black grid, paper ground.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAPER = [0xf3, 0xf1, 0xeb];
const RED = [0xc4, 0x12, 0x30];
const BLUE = [0x1b, 0x4b, 0x8a];
const GREEN = [0x0f, 0x5c, 0x38];
const INK = [0x11, 0x11, 0x11];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([name, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function paint(size) {
  const pixels = Buffer.alloc(size * size * 3);
  const u = size / 32;
  const fill = (x0, y0, w, h, color) => {
    const x1 = Math.round(x0 * u);
    const y1 = Math.round(y0 * u);
    const x2 = Math.round((x0 + w) * u);
    const y2 = Math.round((y0 + h) * u);
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * size + x) * 3;
        pixels[i] = color[0];
        pixels[i + 1] = color[1];
        pixels[i + 2] = color[2];
      }
    }
  };
  fill(0, 0, 32, 32, PAPER);
  fill(0, 0, 18, 13, RED);
  fill(21, 0, 11, 18, BLUE);
  fill(0, 16, 12, 16, GREEN);
  fill(18, 0, 3, 32, INK);
  fill(0, 13, 21, 3, INK);
  fill(21, 18, 11, 3, INK);
  fill(12, 16, 3, 16, INK);
  return pixels;
}

function encodePng(size) {
  const rgb = paint(size);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "public");
writeFileSync(join(publicDir, "icon-180.png"), encodePng(180));
writeFileSync(join(publicDir, "icon-192.png"), encodePng(192));
writeFileSync(join(publicDir, "icon-512.png"), encodePng(512));
writeFileSync(join(publicDir, "__grok", "icon-180.png"), encodePng(180));
console.log("wrote tbr Mondrian icons");

#!/usr/bin/env node
/** 生成 TabBar 图标（81x81 PNG，简易矢量造型） */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createIconPng(size, drawFn) {
  const pixels = Array.from({ length: size }, () => Array(size).fill([0, 0, 0, 0]));

  function set(x, y, rgba) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    pixels[y][x] = rgba;
  }

  function fillRect(x, y, w, h, rgba) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) set(x + dx, y + dy, rgba);
    }
  }

  function fillCircle(cx, cy, r, rgba) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r ** 2) set(x, y, rgba);
      }
    }
  }

  drawFn({ set, fillRect, fillCircle, size });

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const [r, g, b, a] = pixels[y][x];
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function rgba(hex, alpha = 255) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

function drawHome({ fillRect, size }, color) {
  const c = rgba(color);
  const s = size;
  fillRect(Math.floor(s * 0.38), Math.floor(s * 0.42), Math.floor(s * 0.24), Math.floor(s * 0.28), c);
  for (let i = 0; i < Math.floor(s * 0.22); i++) {
    fillRect(Math.floor(s * 0.5) - i, Math.floor(s * 0.22) + i, 1 + i * 2, 1, c);
  }
}

function drawCategory({ fillRect, size }, color) {
  const c = rgba(color);
  const box = Math.floor(size * 0.18);
  const gap = Math.floor(size * 0.08);
  const start = Math.floor(size * 0.23);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      fillRect(start + col * (box + gap), start + row * (box + gap), box, box, c);
    }
  }
}

function drawCart({ fillRect, fillCircle, size }, color) {
  const c = rgba(color);
  const s = size;
  fillCircle(Math.floor(s * 0.32), Math.floor(s * 0.72), Math.floor(s * 0.06), c);
  fillCircle(Math.floor(s * 0.62), Math.floor(s * 0.72), Math.floor(s * 0.06), c);
  fillRect(Math.floor(s * 0.24), Math.floor(s * 0.34), Math.floor(s * 0.44), Math.floor(s * 0.3), c);
  fillRect(Math.floor(s * 0.3), Math.floor(s * 0.28), Math.floor(s * 0.32), Math.floor(s * 0.08), c);
}

function drawProfile({ fillCircle, fillRect, size }, color) {
  const c = rgba(color);
  const s = size;
  fillCircle(Math.floor(s * 0.5), Math.floor(s * 0.34), Math.floor(s * 0.12), c);
  fillRect(Math.floor(s * 0.34), Math.floor(s * 0.5), Math.floor(s * 0.32), Math.floor(s * 0.22), c);
}

const dir = path.join(__dirname, '../miniprogram/assets/icons');
fs.mkdirSync(dir, { recursive: true });

const icons = [
  ['home.png', drawHome, '#999999'],
  ['home-active.png', drawHome, '#E85D4C'],
  ['category.png', drawCategory, '#999999'],
  ['category-active.png', drawCategory, '#E85D4C'],
  ['cart.png', drawCart, '#999999'],
  ['cart-active.png', drawCart, '#E85D4C'],
  ['profile.png', drawProfile, '#999999'],
  ['profile-active.png', drawProfile, '#E85D4C'],
];

for (const [name, draw, color] of icons) {
  fs.writeFileSync(
    path.join(dir, name),
    createIconPng(81, (ctx) => draw(ctx, color))
  );
}

console.log('[generate-icons] TabBar 图标已生成（造型图标）');

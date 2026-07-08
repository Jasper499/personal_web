#!/usr/bin/env node
/** 生成演示商品图与 Banner（PNG）到 backend/uploads/demo/ */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '../backend/uploads/demo');

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

function createPng(width, height, r, g, b) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4;
      const shade = Math.max(0, Math.min(255, r + (x % 24) - 12 + (y % 24) - 12));
      raw[i] = shade;
      raw[i + 1] = Math.max(0, Math.min(255, g + (x % 16) - 8));
      raw[i + 2] = Math.max(0, Math.min(255, b + (y % 16) - 8));
      raw[i + 3] = 255;
    }
  }
  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const palette = {
  baihuo: [232, 93, 76],
  wenchuang: [45, 52, 54],
  meishi: [249, 202, 36],
  shenghuo: [0, 184, 148],
  banner1: [232, 93, 76],
  banner2: [45, 52, 54],
  banner3: [0, 184, 148],
};

const products = [
  ['product-1', 'baihuo'], ['product-2', 'baihuo'], ['product-3', 'baihuo'], ['product-4', 'baihuo'],
  ['product-5', 'wenchuang'], ['product-6', 'wenchuang'], ['product-7', 'wenchuang'], ['product-8', 'wenchuang'],
  ['product-9', 'meishi'], ['product-10', 'meishi'], ['product-11', 'meishi'], ['product-12', 'meishi'],
  ['product-13', 'shenghuo'], ['product-14', 'shenghuo'], ['product-15', 'shenghuo'], ['product-16', 'shenghuo'],
];

fs.mkdirSync(OUT_DIR, { recursive: true });

products.forEach(([name, key]) => {
  const [r, g, b] = palette[key];
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), createPng(400, 400, r, g, b));
});

['banner-1', 'banner-2', 'banner-3'].forEach((name, index) => {
  const key = `banner${index + 1}`;
  const [r, g, b] = palette[key];
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), createPng(750, 320, r, g, b));
});

console.log(`[generate-demo-assets] 已生成 ${products.length} 张商品图、3 张 Banner → backend/uploads/demo/`);

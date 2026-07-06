#!/usr/bin/env node
/** 生成 TabBar 占位图标（81x81 PNG） */
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

function createPng(r, g, b, size = 81) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
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

const dir = path.join(__dirname, '../miniprogram/assets/icons');
fs.mkdirSync(dir, { recursive: true });

const icons = {
  'home.png': [153, 153, 153],
  'home-active.png': [232, 93, 76],
  'category.png': [153, 153, 153],
  'category-active.png': [232, 93, 76],
  'cart.png': [153, 153, 153],
  'cart-active.png': [232, 93, 76],
  'profile.png': [153, 153, 153],
  'profile-active.png': [232, 93, 76],
};

for (const [name, rgb] of Object.entries(icons)) {
  fs.writeFileSync(path.join(dir, name), createPng(...rgb));
}
console.log('TabBar icons generated.');

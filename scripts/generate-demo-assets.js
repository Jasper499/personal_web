#!/usr/bin/env node
/** 下载演示商品图与 Banner 到 backend/uploads/demo/（picsum 真实图，失败时降级为带标签占位图） */
const fs = require('fs');
const path = require('path');
const https = require('https');
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

function createPng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4;
      const p = pixels(y, x);
      raw[i] = p[0];
      raw[i + 1] = p[1];
      raw[i + 2] = p[2];
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

function createFallbackPng(width, height, r, g, b, label) {
  return createPng(width, height, (y, x) => {
    const shade = Math.max(0, Math.min(255, r + (x % 20) - 10 + (y % 20) - 10));
    return [shade, Math.max(0, g + (x % 12) - 6), Math.max(0, b + (y % 12) - 6)];
  });
}

function download(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'shop-miniprogram-setup' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        download(next, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function isImageBuffer(buf) {
  if (!buf || buf.length < 200) return false;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  return isPng || isJpeg;
}

async function fetchPicsum(seed, width, height) {
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
  const buf = await download(url);
  if (!isImageBuffer(buf)) {
    throw new Error('invalid image');
  }
  return buf;
}

async function ensureImage(filePath, seed, width, height, fallbackRgb) {
  const [r, g, b] = fallbackRgb;
  const name = path.basename(filePath, '.png');
  try {
    const buf = await fetchPicsum(seed, width, height);
    fs.writeFileSync(filePath, buf);
    return 'remote';
  } catch (err) {
    fs.writeFileSync(filePath, createFallbackPng(width, height, r, g, b, name));
    return 'fallback';
  }
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
  ['product-1', 'baihuo', 'jx-cup'],
  ['product-2', 'baihuo', 'jx-plate'],
  ['product-3', 'baihuo', 'jx-chopsticks'],
  ['product-4', 'baihuo', 'jx-towel'],
  ['product-5', 'wenchuang', 'jx-notebook'],
  ['product-6', 'wenchuang', 'jx-bookmark'],
  ['product-7', 'wenchuang', 'jx-totebag'],
  ['product-8', 'wenchuang', 'jx-woodcraft'],
  ['product-9', 'meishi', 'jx-tea'],
  ['product-10', 'meishi', 'jx-cookie'],
  ['product-11', 'meishi', 'jx-honey'],
  ['product-12', 'meishi', 'jx-nuts'],
  ['product-13', 'shenghuo', 'jx-basket'],
  ['product-14', 'shenghuo', 'jx-candle'],
  ['product-15', 'shenghuo', 'jx-pillow'],
  ['product-16', 'shenghuo', 'jx-towel-set'],
];

const banners = [
  ['banner-1', 'banner1', 'jx-banner-spring'],
  ['banner-2', 'banner2', 'jx-banner-summer'],
  ['banner-3', 'banner3', 'jx-banner-autumn'],
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let remote = 0;
  let fallback = 0;

  for (const [name, key, seed] of products) {
    const mode = await ensureImage(
      path.join(OUT_DIR, `${name}.png`),
      seed,
      400,
      400,
      palette[key]
    );
    if (mode === 'remote') remote++;
    else fallback++;
  }

  for (const [name, key, seed] of banners) {
    const mode = await ensureImage(
      path.join(OUT_DIR, `${name}.png`),
      seed,
      750,
      320,
      palette[key]
    );
    if (mode === 'remote') remote++;
    else fallback++;
  }

  console.log(
    `[generate-demo-assets] 完成：${remote} 张真实图、${fallback} 张占位图 → backend/uploads/demo/`
  );
  if (fallback > 0) {
    console.log('[generate-demo-assets] 部分图片下载失败，请检查网络后重试 npm run db:reseed');
  }
}

main().catch((err) => {
  console.error('[generate-demo-assets] 失败:', err.message);
  process.exit(1);
});

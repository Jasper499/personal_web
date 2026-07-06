#!/usr/bin/env node
/**
 * 启动 localtunnel，将 API 暴露为公网 HTTPS 地址（绕过 Cursor Ports 转发）。
 * 无需 localhost:3000，直接在浏览器打开输出的链接即可。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.PORT) || 3000;
const OUT_DIR = path.join(__dirname, '../.cursor');
const OUT_FILE = path.join(OUT_DIR, 'preview-url.txt');

function waitForApi() {
  return new Promise((resolve) => {
    const tryOnce = (left) => {
      const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => {
        if (left > 0) setTimeout(() => tryOnce(left - 1), 1000);
        else resolve(false);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (left > 0) setTimeout(() => tryOnce(left - 1), 1000);
        else resolve(false);
      });
    };
    tryOnce(30);
  });
}

async function main() {
  console.log('[preview-tunnel] 等待 API 就绪...');
  const apiUp = await waitForApi();
  if (!apiUp) {
    console.error(`[preview-tunnel] API 未在 :${PORT} 响应，请先运行 npm run dev`);
    process.exit(1);
  }

  console.log(`[preview-tunnel] 启动公网隧道 (localtunnel → :${PORT})...`);

  const child = spawn('npx', ['--yes', 'localtunnel', '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    const match = text.match(/your url is:\s*(https:\/\/\S+)/i);
    if (!match) return;

    const base = match[1].replace(/\/$/, '');
    const adminUrl = `${base}/admin/`;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, `${adminUrl}\n`);

    console.log('');
    console.log('========================================');
    console.log('  公网预览（无需 Ports 转发）');
    console.log(`  管理后台: ${adminUrl}`);
    console.log(`  已保存:   ${OUT_FILE}`);
    console.log('');
    console.log('  首次打开若出现 loca.lt 验证页，点击 Continue');
    console.log('========================================');
    console.log('');
  };

  child.stderr.on('data', handleOutput);
  child.stdout.on('data', handleOutput);

  child.on('exit', (code) => {
    console.error(`[preview-tunnel] 隧道已退出 (code ${code})`);
    process.exit(code || 0);
  });
}

main();

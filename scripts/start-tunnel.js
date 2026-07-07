#!/usr/bin/env node
/**
 * 启动 Cloudflare Quick Tunnel，将 API 暴露为公网 HTTPS 地址。
 * 比 localtunnel 更稳定，避免 503 Tunnel Unavailable。
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.PORT) || 3000;
const OUT_DIR = path.join(__dirname, '../.cursor');
const OUT_FILE = path.join(OUT_DIR, 'preview-url.txt');
const LOG_FILE = path.join(OUT_DIR, 'tunnel.log');

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

function saveUrl(adminUrl) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${adminUrl}\n`);
  console.log('');
  console.log('========================================');
  console.log('  公网预览（Cloudflare 隧道）');
  console.log(`  管理后台: ${adminUrl}`);
  console.log(`  已保存:   ${OUT_FILE}`);
  console.log('');
  console.log('  链接在隧道进程运行期间有效');
  console.log('  若出现 503，重新运行: npm run preview:tunnel');
  console.log('========================================');
  console.log('');
}

function startTunnel() {
  console.log(`[preview-tunnel] 启动 Cloudflare 隧道 → 127.0.0.1:${PORT}`);

  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  const child = spawn(
    'npx',
    ['--yes', 'cloudflared', 'tunnel', '--url', `http://127.0.0.1:${PORT}`],
    { stdio: ['ignore', 'pipe', 'pipe'], env: process.env }
  );

  let urlSaved = false;

  const handleOutput = (chunk) => {
    const text = chunk.toString();
    logStream.write(text);
    process.stderr.write(text);

    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match && !urlSaved) {
      urlSaved = true;
      const base = match[0].replace(/\/$/, '');
      saveUrl(`${base}/admin/`);
    }
  };

  child.stdout.on('data', handleOutput);
  child.stderr.on('data', handleOutput);

  child.on('exit', (code) => {
    logStream.end();
    console.error(`[preview-tunnel] 隧道已退出 (code ${code})，5 秒后重连...`);
    urlSaved = false;
    setTimeout(startTunnel, 5000);
  });
}

async function main() {
  console.log('[preview-tunnel] 等待 API 就绪...');
  const apiUp = await waitForApi();
  if (!apiUp) {
    console.error(`[preview-tunnel] API 未在 :${PORT} 响应，请先运行 npm run dev`);
    process.exit(1);
  }
  startTunnel();
}

main();

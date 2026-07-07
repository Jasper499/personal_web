#!/usr/bin/env node
/**
 * 诊断小程序 API 连接问题（本机运行）
 * 用法: npm run miniprogram:doctor
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'miniprogram/config/env.js');
const ENV_EXAMPLE = path.join(ROOT, 'miniprogram/config/env.example.js');
const PORT = Number(process.env.PORT) || 3000;
const LOCAL_BASE = `http://localhost:${PORT}`;

let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function bad(msg) {
  console.log(`  ✗ ${msg}`);
  failed += 1;
}

function warn(msg) {
  console.log(`  ! ${msg}`);
}

function readApiBase() {
  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const match = content.match(/apiBase:\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  }
  if (fs.existsSync(ENV_EXAMPLE)) {
    const content = fs.readFileSync(ENV_EXAMPLE, 'utf8');
    const match = content.match(/apiBase:\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  }
  return null;
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
  });
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  匠心小铺 - 小程序 API 诊断');
  console.log('========================================');
  console.log('');

  console.log('[1] 检查 env.js');
  const apiBase = readApiBase();
  if (!apiBase) {
    bad('未找到 miniprogram/config/env.js');
    warn('请执行: npm run miniprogram:setup');
  } else {
    ok(`apiBase = ${apiBase}`);
    if (!apiBase.endsWith('/api')) {
      bad('apiBase 必须以 /api 结尾');
    } else if (apiBase.includes('trycloudflare.com')) {
      bad('仍指向云端隧道，本机开发应改为 http://localhost:3000/api');
    } else if (!apiBase.includes('localhost') && !apiBase.includes('127.0.0.1')) {
      warn(`apiBase 不是本机地址: ${apiBase}`);
    } else {
      ok('apiBase 格式正确');
    }
  }

  console.log('');
  console.log('[2] 检查 API 服务');
  const health = await httpGet(`${LOCAL_BASE}/health`);
  if (health.status === 200) {
    ok(`GET ${LOCAL_BASE}/health → 200`);
  } else {
    bad(`GET ${LOCAL_BASE}/health → ${health.status || health.error}`);
    warn('请先运行: npm run dev  （并保持窗口不关）');
  }

  console.log('');
  console.log('[3] 检查小程序接口');
  const endpoints = ['/api/banners', '/api/categories', '/api/products?sort=sales&pageSize=6'];
  for (const ep of endpoints) {
    const res = await httpGet(`${LOCAL_BASE}${ep}`);
    if (res.status === 200) {
      ok(`GET ${LOCAL_BASE}${ep} → 200`);
    } else {
      bad(`GET ${LOCAL_BASE}${ep} → ${res.status || res.error}`);
    }
  }

  const wrong = await httpGet(`${LOCAL_BASE}/banners`);
  if (wrong.status === 404) {
    ok('确认: /banners 无 /api 前缀会 404（这是常见误配原因）');
  }

  console.log('');
  console.log('[4] 检查微信开发者工具导入目录');
  const mpDir = path.join(ROOT, 'miniprogram');
  const appJson = path.join(mpDir, 'app.json');
  if (fs.existsSync(appJson)) {
    ok(`小程序目录: ${mpDir}`);
    warn('请确认微信开发者工具导入的是上述目录');
    warn('不要导入 WeChatProjects\\miniprogram（旧副本）');
  } else {
    bad(`缺少 ${appJson}`);
  }

  console.log('');
  if (failed === 0) {
    console.log('========================================');
    console.log('  诊断通过！若微信里仍 404，请：');
    console.log('  1. 微信开发者工具 → 编译');
    console.log('  2. 调试器 → Console 查看 [API] 日志');
    console.log('  3. 详情 → 不校验合法域名');
    console.log('========================================');
  } else {
    console.log('========================================');
    console.log(`  发现 ${failed} 个问题，请按上面提示修复后执行：`);
    console.log('');
    console.log('  PowerShell:');
    console.log('    cd ' + ROOT);
    console.log('    npm run dev');
    console.log('    $env:MINIPROGRAM_API_BASE="http://localhost:3000"');
    console.log('    npm run miniprogram:setup');
    console.log('');
    console.log('  或一键修复: npm run fix:miniprogram');
    console.log('========================================');
    process.exit(1);
  }
  console.log('');
}

main();

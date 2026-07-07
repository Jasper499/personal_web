#!/usr/bin/env node
/**
 * 自动配置微信小程序开发环境：
 * - 从 .cursor/preview-url.txt 或环境变量读取 API 地址
 * - 健康检查通过后写入 miniprogram/config/env.js
 * - 生成 project.private.config.json（关闭域名校验等）
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const MP = path.join(ROOT, 'miniprogram');
const PREVIEW_FILE = path.join(ROOT, '.cursor/preview-url.txt');
const ENV_FILE = path.join(MP, 'config/env.js');
const PRIVATE_CONFIG = path.join(MP, 'project.private.config.json');

function checkHealth(base) {
  return new Promise((resolve) => {
    const healthUrl = `${base.replace(/\/$/, '')}/health`;
    const lib = healthUrl.startsWith('https') ? https : http;
    const req = lib.get(healthUrl, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(res.statusCode === 200 && json.status === 'ok');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function collectCandidates(port) {
  const seen = new Set();
  const list = [];

  function add(raw) {
    if (!raw) return;
    const base = raw.replace(/\/$/, '').replace(/\/api$/, '');
    if (!base || seen.has(base)) return;
    seen.add(base);
    list.push(base);
  }

  add(process.env.MINIPROGRAM_API_BASE);

  const localhost = `http://localhost:${port}`;
  const loopback = `http://127.0.0.1:${port}`;

  // 本机开发优先 localhost，避免仓库内过期云端隧道地址导致 404
  if (!process.env.CURSOR_AGENT) {
    add(localhost);
    add(loopback);
  }

  if (fs.existsSync(PREVIEW_FILE)) {
    const url = fs.readFileSync(PREVIEW_FILE, 'utf8').trim().split('\n')[0].trim();
    if (url) {
      try {
        const u = new URL(url);
        add(`${u.protocol}//${u.host}`);
      } catch {
        /* ignore */
      }
    }
  }

  if (process.env.CURSOR_AGENT) {
    add(localhost);
    add(loopback);
  }

  return list;
}

async function resolveApiBase(port) {
  const candidates = collectCandidates(port);
  for (const base of candidates) {
    if (await checkHealth(base)) {
      return { apiBase: `${base}/api`, healthy: true, source: base };
    }
  }
  const fallback = `http://localhost:${port}`;
  return { apiBase: `${fallback}/api`, healthy: false, source: fallback };
}

async function main() {
  const port = process.env.PORT || 3000;
  const { apiBase, healthy, source } = await resolveApiBase(port);

  fs.mkdirSync(path.dirname(ENV_FILE), { recursive: true });
  fs.writeFileSync(
    ENV_FILE,
    `/**
 * 由 scripts/setup-miniprogram.js 自动生成，请勿手动编辑。
 * 重新生成: npm run miniprogram:setup
 */
module.exports = {
  apiBase: '${apiBase}',
};
`
  );

  const privateConfig = {
    description: '本地私有配置（自动生成）',
    projectname: '匠心小铺',
    setting: {
      urlCheck: false,
      es6: true,
      enhance: true,
      postcss: true,
      minified: false,
      compileHotReLoad: true,
      bigPackageSizeSupport: true,
    },
    condition: {},
  };
  fs.writeFileSync(PRIVATE_CONFIG, JSON.stringify(privateConfig, null, 2) + '\n');

  console.log('[miniprogram:setup] 配置完成');
  console.log(`  API 地址: ${apiBase}`);
  console.log(`  选用来源: ${source}`);
  console.log(`  API 健康: ${healthy ? '✓ 正常' : '✗ 未响应（请先 npm run dev）'}`);
  console.log(`  已写入: miniprogram/config/env.js`);
  console.log(`  已写入: miniprogram/project.private.config.json`);
  console.log('');
  if (!healthy) {
    console.log('⚠️  后端未运行，小程序只能显示空壳页面。');
    console.log('   请在项目根目录执行: npm run dev');
    console.log('   然后重新执行: npm run miniprogram:setup');
    console.log('');
  }
  console.log('下一步: npm run miniprogram:open  （自动打开微信开发者工具）');
}

main();

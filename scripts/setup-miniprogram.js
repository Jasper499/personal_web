#!/usr/bin/env node
/**
 * 自动配置微信小程序开发环境：
 * - 从 .cursor/preview-url.txt 或环境变量读取 API 地址
 * - 生成 miniprogram/config/env.js
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

function readPreviewBase() {
  if (process.env.MINIPROGRAM_API_BASE) {
    return process.env.MINIPROGRAM_API_BASE.replace(/\/$/, '');
  }
  if (fs.existsSync(PREVIEW_FILE)) {
    const url = fs.readFileSync(PREVIEW_FILE, 'utf8').trim().split('\n')[0].trim();
    if (url) {
      try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
      } catch {
        /* ignore */
      }
    }
  }
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

function checkHealth(base) {
  return new Promise((resolve) => {
    const healthUrl = `${base.replace(/\/$/, '')}/health`;
    const lib = healthUrl.startsWith('https') ? https : http;
    const req = lib.get(healthUrl, (res) => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const base = readPreviewBase();
  const apiBase = `${base.replace(/\/$/, '')}/api`;
  const healthy = await checkHealth(base);

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
  console.log(`  API 健康: ${healthy ? '✓ 正常' : '✗ 未响应（请先 npm run dev）'}`);
  console.log(`  已写入: miniprogram/config/env.js`);
  console.log(`  已写入: miniprogram/project.private.config.json`);
  console.log('');
  console.log('下一步: npm run miniprogram:open  （自动打开微信开发者工具）');
}

main();

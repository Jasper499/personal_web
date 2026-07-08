#!/usr/bin/env node
/**
 * 验证 Cursor Cloud Agent 开发环境是否就绪。
 * 用法：
 *   node scripts/verify-agent-env.js           # 完整检查（含 API 健康）
 *   node scripts/verify-agent-env.js --deps-only  # 仅检查依赖与数据库
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const PORT = Number(process.env.PORT) || 3000;
const depsOnly = process.argv.includes('--deps-only');

let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  failed++;
}

function checkFile(rel, label) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) ok(`${label}: ${rel}`);
  else fail(`缺少 ${label}: ${rel}`);
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ ok: res.statusCode === 200, body }));
    });
    req.on('error', () => resolve({ ok: false, body: '' }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ ok: false, body: '' });
    });
  });
}

async function main() {
  console.log('[verify-agent-env] 检查 Cursor Agent 环境...\n');

  console.log('配置文件:');
  checkFile('.cursor/environment.json', 'Cloud 环境配置');
  checkFile('AGENTS.md', 'Agent 说明');
  checkFile('backend/.env.example', '环境变量模板');
  checkFile('backend/prisma/schema.prisma', '数据库模型');

  console.log('\n依赖与数据:');
  if (fs.existsSync(path.join(BACKEND, 'node_modules'))) ok('backend 依赖已安装');
  else fail('backend 依赖未安装，运行 npm run setup');

  if (fs.existsSync(path.join(BACKEND, 'prisma/dev.db'))) ok('SQLite 数据库已初始化');
  else fail('数据库未初始化，运行 npm run setup');

  if (depsOnly) {
    console.log(failed ? `\n${failed} 项未通过` : '\n依赖检查通过');
    process.exit(failed ? 1 : 0);
  }

  console.log('\nAPI 服务:');
  const health = await checkHealth();
  if (health.ok) ok(`API 健康检查通过 (:${PORT})`);
  else {
    fail(`API 未响应 (:${PORT})，运行 npm run dev 或检查 shop-api 终端`);
  }

  console.log('\nCursor Cloud 提示:');
  console.log('  浏览器访问需在 Ports 面板转发端口 3000');
  console.log('  管理后台: http://localhost:3000/admin/');

  if (failed) {
    console.log(`\n${failed} 项未通过`);
    process.exit(1);
  }
  console.log('\n环境验证通过');
}

main();

#!/usr/bin/env node
/**
 * 确保后端 API 已安装、已初始化并在 PORT（默认 3000）上运行。
 * 用法：
 *   node scripts/ensure-api.js           # 后台启动（已运行则跳过）
 *   node scripts/ensure-api.js --foreground  # 前台运行（开发调试）
 *   node scripts/ensure-api.js --setup-only  # 仅安装依赖与数据库
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const ENV_FILE = path.join(BACKEND, '.env');
const ENV_EXAMPLE = path.join(BACKEND, '.env.example');
const PID_FILE = path.join(ROOT, '.api-server.pid');
const LOG_FILE = path.join(ROOT, '.api-server.log');
const PORT = Number(process.env.PORT) || 3000;

const args = process.argv.slice(2);
const foreground = args.includes('--foreground');
const setupOnly = args.includes('--setup-only');

function log(msg) {
  console.log(`[ensure-api] ${msg}`);
}

function loadEnv() {
  if (!fs.existsSync(ENV_FILE) && fs.existsSync(ENV_EXAMPLE)) {
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    log('已创建 backend/.env');
  }
}

function run(cmd, cwd = BACKEND) {
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, PORT: String(PORT) } });
}

function setup() {
  loadEnv();
  if (!fs.existsSync(path.join(BACKEND, 'node_modules'))) {
    log('安装后端依赖...');
    run('npm install');
  }
  const dbFile = path.join(BACKEND, 'prisma', 'dev.db');
  if (!fs.existsSync(dbFile)) {
    log('初始化数据库与种子数据...');
    run('npm run db:setup');
  }
  if (!fs.existsSync(path.join(ROOT, 'miniprogram/assets/icons/home.png'))) {
    log('生成小程序 TabBar 图标...');
    execSync('node scripts/generate-icons.js', { cwd: ROOT, stdio: 'inherit' });
  }
}

function checkHealth(timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function readPid() {
  if (!fs.existsSync(PID_FILE)) return null;
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  return Number.isFinite(pid) ? pid : null;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writePid(pid) {
  fs.writeFileSync(PID_FILE, String(pid));
}

function removePidFile() {
  if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
}

async function waitForHealth(maxAttempts = 30, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkHealth()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function startBackground() {
  const out = fs.openSync(LOG_FILE, 'a');
  const child = spawn('node', ['src/index.js'], {
    cwd: BACKEND,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, PORT: String(PORT) },
  });
  child.unref();
  writePid(child.pid);
  log(`已在后台启动 API (pid ${child.pid})，日志: .api-server.log`);

  const ok = await waitForHealth();
  if (!ok) {
    log('启动超时，请查看 .api-server.log');
    process.exit(1);
  }
}

async function main() {
  setup();

  if (setupOnly) {
    log('setup 完成');
    return;
  }

  if (await checkHealth()) {
    log(`API 已在运行: http://localhost:${PORT}`);
    log(`管理后台: http://localhost:${PORT}/admin/`);
    return;
  }

  const stalePid = readPid();
  if (stalePid && !isProcessAlive(stalePid)) {
    removePidFile();
  }

  if (foreground) {
    log(`前台启动 API (PORT=${PORT})，按 Ctrl+C 停止`);
    run('node src/index.js');
    return;
  }

  await startBackground();
  log(`API 已就绪: http://localhost:${PORT}`);
  log(`管理后台: http://localhost:${PORT}/admin/`);
  log(`健康检查: http://localhost:${PORT}/health`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

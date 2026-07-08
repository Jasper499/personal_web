#!/usr/bin/env node
/**
 * 确保后端 API 已安装、已初始化并在 PORT（默认 3000）上运行。
 *
 * 用法：
 *   node scripts/ensure-api.js              # 启动（Cursor Cloud 用 tmux，本地用后台进程）
 *   node scripts/ensure-api.js --foreground # 前台运行
 *   node scripts/ensure-api.js --setup-only # 仅安装依赖与数据库
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
const TMUX_SESSION = 'shop-api-server';
const TMUX_CONF = '-f /exec-daemon/tmux.portal.conf';
const PORT = Number(process.env.PORT) || 3000;
const IS_CURSOR_CLOUD = Boolean(process.env.CURSOR_AGENT);

const args = process.argv.slice(2);
const foreground = args.includes('--foreground');
const setupOnly = args.includes('--setup-only');

function log(msg) {
  console.log(`[ensure-api] ${msg}`);
}

function printPortForwardHint() {
  if (!IS_CURSOR_CLOUD) return;
  log('');
  log('=== Cursor Cloud 端口转发提示 ===');
  log('云端 API 已运行，但浏览器需通过 Cursor 转发才能访问。');
  log('1. 点击 Agent 面板右上角的「插头」图标');
  log('2. 在 Ports 列表中确认 3000 已转发（Forward）');
  log('3. 若未出现，手动添加端口 3000');
  log('4. 使用 Ports 面板提供的链接打开，或刷新 localhost:3000');
  log('================================');
}

function loadEnv() {
  if (!fs.existsSync(ENV_FILE) && fs.existsSync(ENV_EXAMPLE)) {
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    log('已创建 backend/.env');
  }
}

function run(cmd, cwd = BACKEND) {
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT), HOST: '0.0.0.0' },
  });
}

function runQuiet(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function setup() {
  loadEnv();
  if (!fs.existsSync(path.join(BACKEND, 'node_modules'))) {
    log('安装后端依赖...');
    execSync('npm install', { cwd: BACKEND, stdio: 'inherit' });
  }
  const dbFile = path.join(BACKEND, 'prisma', 'dev.db');
  if (!fs.existsSync(dbFile)) {
    log('初始化数据库与种子数据...');
    run('npm run db:setup', BACKEND);
  } else {
    try {
      execSync('node scripts/ensure-demo-data.js', { cwd: ROOT, stdio: 'inherit' });
    } catch {
      log('演示数据检查跳过（可手动执行 npm run db:reseed）');
    }
  }
  log('生成小程序 TabBar 图标...');
  execSync('node scripts/generate-icons.js', { cwd: ROOT, stdio: 'inherit' });
  const demoDir = path.join(BACKEND, 'uploads', 'demo');
  if (!fs.existsSync(path.join(demoDir, 'product-1.png'))) {
    log('生成演示商品图与 Banner...');
    execSync('node scripts/generate-demo-assets.js', { cwd: ROOT, stdio: 'inherit' });
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

function stopDetachedServer() {
  const pid = readPid();
  if (pid && isProcessAlive(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
      log(`已停止旧的后台 API 进程 (pid ${pid})`);
    } catch {
      /* ignore */
    }
  }
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
    env: { ...process.env, PORT: String(PORT), HOST: '0.0.0.0' },
  });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));
  log(`已在后台启动 API (pid ${child.pid})，日志: .api-server.log`);

  const ok = await waitForHealth();
  if (!ok) {
    log('启动超时，请查看 .api-server.log');
    process.exit(1);
  }
}

async function startInTmux() {
  stopDetachedServer();

  const hasSession = runQuiet(`tmux ${TMUX_CONF} has-session -t "=${TMUX_SESSION}"`);
  if (!hasSession) {
    execSync(
      `tmux ${TMUX_CONF} new-session -d -s "${TMUX_SESSION}" -c "${BACKEND}" -- "${process.env.SHELL || 'bash'}" -l`,
      { stdio: 'inherit' }
    );
    execSync(
      `tmux ${TMUX_CONF} send-keys -t "${TMUX_SESSION}:0.0" 'HOST=0.0.0.0 PORT=${PORT} node src/index.js' C-m`,
      { stdio: 'inherit' }
    );
    log(`已在 tmux 会话「${TMUX_SESSION}」中启动 API（便于 Cursor 端口转发）`);
  } else if (!(await checkHealth())) {
    execSync(
      `tmux ${TMUX_CONF} send-keys -t "${TMUX_SESSION}:0.0" C-c 'HOST=0.0.0.0 PORT=${PORT} node src/index.js' C-m`,
      { stdio: 'inherit' }
    );
    log(`已重启 tmux 会话「${TMUX_SESSION}」中的 API`);
  } else {
    log(`tmux 会话「${TMUX_SESSION}」中 API 已在运行`);
  }

  const ok = await waitForHealth();
  if (!ok) {
    log('启动超时，请检查 tmux 会话 shop-api-server');
    process.exit(1);
  }
}

async function main() {
  setup();

  if (setupOnly) {
    log('setup 完成');
    return;
  }

  if (foreground) {
    log(`前台启动 API (0.0.0.0:${PORT})，按 Ctrl+C 停止`);
    run('node src/index.js');
    return;
  }

  if (IS_CURSOR_CLOUD) {
    await startInTmux();
  } else if (await checkHealth()) {
    log(`API 已在运行: http://localhost:${PORT}`);
    log(`管理后台: http://localhost:${PORT}/admin/`);
    return;
  } else {
    await startBackground();
  }

  log(`API 已就绪: http://localhost:${PORT}`);
  log(`管理后台: http://localhost:${PORT}/admin/`);
  printPortForwardHint();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

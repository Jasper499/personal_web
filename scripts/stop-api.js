#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(__dirname, '..', '.api-server.pid');

if (!fs.existsSync(PID_FILE)) {
  console.log('[stop-api] 未找到运行中的 API 进程');
  process.exit(0);
}

const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
try {
  process.kill(pid, 'SIGTERM');
  console.log(`[stop-api] 已停止 API (pid ${pid})`);
} catch (err) {
  console.log(`[stop-api] 进程 ${pid} 已不存在`);
}
fs.unlinkSync(PID_FILE);

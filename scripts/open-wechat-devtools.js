#!/usr/bin/env node
/**
 * 自动打开微信开发者工具并导入 miniprogram 项目。
 * 需在本地已安装微信开发者工具。
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MP_DIR = path.resolve(__dirname, '../miniprogram');

const CLI_PATHS = {
  darwin: [
    '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
    path.join(os.homedir(), 'Applications/wechatwebdevtools.app/Contents/MacOS/cli'),
  ],
  win32: [
    'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
    'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
    path.join(os.homedir(), 'AppData', 'Local', '微信开发者工具', 'cli.bat'),
  ],
  linux: [
    '/usr/bin/wechat-devtools-cli',
    path.join(os.homedir(), '.local/bin/wechat-devtools-cli'),
  ],
};

function findCli() {
  const candidates = CLI_PATHS[process.platform] || [];
  return candidates.find((p) => fs.existsSync(p));
}

function runSetup() {
  execSync('node scripts/setup-miniprogram.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}

function openDevtools(cli) {
  const args = ['open', '--project', MP_DIR];
  console.log(`[miniprogram:open] 执行: ${cli} ${args.join(' ')}`);

  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/c', cli, ...args], { stdio: 'inherit', detached: true }).unref();
  } else {
    spawn(cli, args, { stdio: 'inherit', detached: true }).unref();
  }
}

function printManualGuide() {
  console.log('');
  console.log('未找到微信开发者工具 CLI，请手动操作：');
  console.log('');
  console.log('1. 打开「微信开发者工具」');
  console.log('2. 导入项目 → 目录选择：');
  console.log(`   ${MP_DIR}`);
  console.log('3. AppID 选择「测试号」或「游客模式」');
  console.log('4. 详情 → 本地设置 → 勾选「不校验合法域名...」');
  console.log('');
  console.log('CLI 安装位置参考：');
  console.log('  macOS: 微信开发者工具 → 设置 → 安全设置 → 开启服务端口');
  console.log('  Windows: 设置 → 安全 → 开启服务端口');
  console.log('');
  const envJs = path.join(MP_DIR, 'config/env.js');
  if (fs.existsSync(envJs)) {
    const api = require(envJs).apiBase;
    console.log(`当前 API 已配置为: ${api}`);
  }
}

function main() {
  runSetup();
  const cli = findCli();
  if (!cli) {
    printManualGuide();
    process.exit(0);
  }
  try {
    openDevtools(cli);
    console.log('[miniprogram:open] 已发送打开命令，请在微信开发者工具中查看');
    console.log('[miniprogram:open] 首次使用请在工具中：详情 → 本地设置 → 不校验合法域名');
  } catch (e) {
    console.error('[miniprogram:open] 打开失败:', e.message);
    printManualGuide();
  }
}

main();

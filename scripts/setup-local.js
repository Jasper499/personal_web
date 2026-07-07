#!/usr/bin/env node
/**
 * 方案 B：克隆完整仓库到本地，配置并打开微信开发者工具。
 *
 * 用法：
 *   node scripts/setup-local.js
 *   node scripts/setup-local.js --dir C:\Users\you\WeChatProjects\personal_web
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_URL = process.env.SHOP_REPO_URL || 'https://github.com/Jasper499/personal_web.git';
const BRANCH = process.env.SHOP_REPO_BRANCH || 'cursor/shop-miniprogram-mvp-383d';
const DEFAULT_DIR = path.join(
  os.homedir(),
  'WeChatProjects',
  'personal_web'
);

function parseArgs() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  return {
    targetDir: dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : DEFAULT_DIR,
  };
}

function run(cmd, cwd, silent = false) {
  execSync(cmd, {
    cwd,
    stdio: silent ? 'pipe' : 'inherit',
    shell: true,
  });
}

function hasCommand(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, {
      stdio: 'pipe',
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

function ensureRepo(targetDir) {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  if (fs.existsSync(path.join(targetDir, '.git'))) {
    console.log(`[setup-local] 更新已有仓库: ${targetDir}`);
    run('git fetch origin', targetDir);
    try {
      run(`git checkout ${BRANCH}`, targetDir);
    } catch {
      console.log(`[setup-local] 分支 ${BRANCH} 不存在，使用当前分支`);
    }
    run(`git pull origin ${BRANCH}`, targetDir, true);
  } else if (fs.existsSync(targetDir)) {
    console.error(`[setup-local] 目录已存在但不是 Git 仓库: ${targetDir}`);
    console.error('请删除该目录后重试，或使用 --dir 指定其他路径');
    process.exit(1);
  } else {
    console.log(`[setup-local] 克隆仓库 → ${targetDir}`);
    run(`git clone --branch ${BRANCH} ${REPO_URL} "${targetDir}"`, path.dirname(targetDir));
  }
}

function warnOldMiniprogramOnlyDir() {
  const legacy = path.join(os.homedir(), 'WeChatProjects', 'miniprogram');
  if (fs.existsSync(legacy) && !fs.existsSync(path.join(legacy, '.git'))) {
    console.log('');
    console.log('[setup-local] 提示: 检测到旧目录（仅 miniprogram 副本）:');
    console.log(`  ${legacy}`);
    console.log('  请改用完整仓库路径，旧目录可手动删除。');
    console.log('');
  }
}

function setupProject(targetDir) {
  console.log('[setup-local] 安装项目依赖...');
  run('npm run setup', targetDir);

  const previewFile = path.join(targetDir, '.cursor', 'preview-url.txt');
  if (!fs.existsSync(previewFile)) {
    console.log('');
    console.log('[setup-local] 未找到公网隧道地址，将使用本地 API (localhost:3000)');
    console.log('  请在另一个终端运行: npm run dev');
    console.log('  或在云端运行 npm run preview:tunnel 后重新执行本脚本');
    console.log('');
  }

  console.log('[setup-local] 配置微信小程序...');
  run('npm run miniprogram:setup', targetDir);
}

function openWechat(targetDir) {
  console.log('[setup-local] 打开微信开发者工具...');
  run('npm run miniprogram:open', targetDir);
}

function printSummary(targetDir) {
  const mpDir = path.join(targetDir, 'miniprogram');
  console.log('');
  console.log('========================================');
  console.log('  方案 B 本地环境已就绪');
  console.log('========================================');
  console.log(`  完整仓库: ${targetDir}`);
  console.log(`  小程序目录: ${mpDir}`);
  console.log('');
  console.log('  微信开发者工具请导入上述「小程序目录」');
  console.log('  （不是仓库根目录，也不是旧的 miniprogram 副本）');
  console.log('');
  console.log('  启动本地 API（若未使用公网隧道）:');
  console.log(`    cd "${targetDir}" && npm run dev`);
  console.log('');
  console.log('  管理后台: http://localhost:3000/admin/');
  console.log('  账号: admin / admin123');
  console.log('========================================');
}

function main() {
  const { targetDir } = parseArgs();

  console.log('[setup-local] 匠心小铺 - 本机一键配置（方案 B）');
  console.log(`[setup-local] 目标目录: ${targetDir}`);
  console.log('');

  if (!hasCommand('git')) {
    console.error('[setup-local] 未找到 git，请先安装: https://git-scm.com/');
    process.exit(1);
  }
  if (!hasCommand('node')) {
    console.error('[setup-local] 未找到 node，请先安装: https://nodejs.org/');
    process.exit(1);
  }

  warnOldMiniprogramOnlyDir();
  ensureRepo(targetDir);
  setupProject(targetDir);
  openWechat(targetDir);
  printSummary(targetDir);
}

main();

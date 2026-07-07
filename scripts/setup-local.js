#!/usr/bin/env node
/**
 * 方案 B：获取完整仓库到本地，配置并打开微信开发者工具。
 *
 * 用法：
 *   node scripts/setup-local.js
 *   node scripts/setup-local.js --use-zip          # 跳过 git，直接下载 ZIP（网络不稳定时）
 *   node scripts/setup-local.js --dir C:\path\to\personal_web
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

const REPO = 'Jasper499/personal_web';
const BRANCH = process.env.SHOP_REPO_BRANCH || 'cursor/shop-miniprogram-mvp-383d';
const REPO_URL = process.env.SHOP_REPO_URL || `https://github.com/${REPO}.git`;
const DEFAULT_DIR = path.join(os.homedir(), 'WeChatProjects', 'personal_web');

const ZIP_SOURCES = [
  process.env.SHOP_ZIP_URL,
  `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip`,
  `https://ghproxy.net/https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip`,
  `https://mirror.ghproxy.com/https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip`,
].filter(Boolean);

function parseArgs() {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');
  return {
    targetDir: dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : DEFAULT_DIR,
    useZip: args.includes('--use-zip'),
  };
}

function run(cmd, cwd, silent = false) {
  execSync(cmd, { cwd, stdio: silent ? 'pipe' : 'inherit', shell: true });
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

function configureGitNetwork() {
  const configs = [
    'git config --global http.postBuffer 524288000',
    'git config --global http.version HTTP/1.1',
  ];
  for (const c of configs) {
    try {
      execSync(c, { stdio: 'pipe', shell: true });
    } catch {
      /* ignore */
    }
  }
}

function tryGitClone(targetDir) {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  configureGitNetwork();
  console.log(`[setup-local] 尝试 git clone (${BRANCH})...`);
  run(`git clone --depth 1 --branch ${BRANCH} ${REPO_URL} "${targetDir}"`, path.dirname(targetDir));
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    const req = lib.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('下载超时'));
    });
  });
}

function extractZip(zipPath, destParent) {
  if (process.platform === 'win32') {
    run(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destParent.replace(/'/g, "''")}' -Force"`,
      destParent
    );
    return;
  }
  if (hasCommand('unzip')) {
    run(`unzip -q -o "${zipPath}" -d "${destParent}"`, destParent);
    return;
  }
  run(`tar -xf "${zipPath}" -C "${destParent}"`, destParent);
}

function findExtractedDir(destParent) {
  const entries = fs.readdirSync(destParent, { withFileTypes: true });
  const dir = entries.find((e) => e.isDirectory() && e.name.startsWith('personal_web'));
  return dir ? path.join(destParent, dir.name) : null;
}

async function ensureRepoFromZip(targetDir) {
  const parent = path.dirname(targetDir);
  const zipPath = path.join(os.tmpdir(), `personal_web-${Date.now()}.zip`);
  fs.mkdirSync(parent, { recursive: true });

  if (fs.existsSync(targetDir)) {
    console.log(`[setup-local] 目录已存在，跳过下载: ${targetDir}`);
    return;
  }

  let lastErr;
  for (const url of ZIP_SOURCES) {
    try {
      console.log(`[setup-local] 下载 ZIP: ${url}`);
      await downloadFile(url, zipPath);
      console.log('[setup-local] 解压中...');
      extractZip(zipPath, parent);
      const extracted = findExtractedDir(parent);
      if (!extracted) throw new Error('解压后未找到 personal_web 目录');
      fs.renameSync(extracted, targetDir);
      fs.unlinkSync(zipPath);
      console.log('[setup-local] ZIP 下载完成');
      return;
    } catch (e) {
      lastErr = e;
      console.log(`[setup-local] 失败: ${e.message}，尝试下一个源...`);
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    }
  }
  throw lastErr || new Error('所有 ZIP 源均失败');
}

function ensureRepoFromGit(targetDir) {
  if (fs.existsSync(path.join(targetDir, '.git'))) {
    console.log(`[setup-local] 更新已有仓库: ${targetDir}`);
    try {
      run('git fetch origin', targetDir);
      run(`git checkout ${BRANCH}`, targetDir, true);
      run(`git pull origin ${BRANCH}`, targetDir, true);
    } catch {
      console.log('[setup-local] git pull 失败，继续使用现有文件');
    }
    return;
  }
  if (fs.existsSync(targetDir)) {
    console.error(`[setup-local] 目录已存在但不是 Git 仓库: ${targetDir}`);
    process.exit(1);
  }
  tryGitClone(targetDir);
}

async function ensureRepo(targetDir, useZip) {
  if (useZip) {
    await ensureRepoFromZip(targetDir);
    return;
  }
  if (!hasCommand('git')) {
    console.log('[setup-local] 未找到 git，改用 ZIP 下载');
    await ensureRepoFromZip(targetDir);
    return;
  }
  try {
    ensureRepoFromGit(targetDir);
  } catch (e) {
    console.log('');
    console.log(`[setup-local] git clone 失败: ${e.message}`);
    console.log('[setup-local] 自动改用 ZIP 下载（无需 git）...');
    console.log('');
    await ensureRepoFromZip(targetDir);
  }
}

function warnOldMiniprogramOnlyDir() {
  const legacy = path.join(os.homedir(), 'WeChatProjects', 'miniprogram');
  if (fs.existsSync(legacy) && !fs.existsSync(path.join(legacy, '.git'))) {
    console.log('[setup-local] 提示: 旧目录可删除 → ' + legacy);
  }
}

function setupProject(targetDir) {
  run('npm run setup', targetDir);
  run('npm run miniprogram:setup', targetDir);
}

function openWechat(targetDir) {
  run('npm run miniprogram:open', targetDir);
}

function printSummary(targetDir) {
  console.log('');
  console.log('========================================');
  console.log('  本机环境已就绪');
  console.log('========================================');
  console.log(`  项目目录: ${targetDir}`);
  console.log(`  小程序:   ${path.join(targetDir, 'miniprogram')}`);
  console.log('');
  console.log('  启动 API: cd 项目目录 && npm run dev');
  console.log('========================================');
}

async function main() {
  const { targetDir, useZip } = parseArgs();

  if (!hasCommand('node')) {
    console.error('[setup-local] 请先安装 Node.js: https://nodejs.org/');
    process.exit(1);
  }

  console.log('[setup-local] 匠心小铺 - 本机一键配置');
  console.log(`[setup-local] 目标: ${targetDir}`);
  if (useZip) console.log('[setup-local] 模式: ZIP 下载（不依赖 git）');
  console.log('');

  warnOldMiniprogramOnlyDir();
  await ensureRepo(targetDir, useZip);
  setupProject(targetDir);
  openWechat(targetDir);
  printSummary(targetDir);
}

main().catch((e) => {
  console.error('[setup-local] 失败:', e.message);
  console.log('');
  console.log('手动下载 ZIP:');
  console.log(`  https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip`);
  console.log('解压到 WeChatProjects\\personal_web 后执行 npm run setup');
  process.exit(1);
});

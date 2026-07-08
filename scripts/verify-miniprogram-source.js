#!/usr/bin/env node
/**
 * 检查本机小程序源码是否为最新（含「模拟支付」按钮）
 * 用法: npm run miniprogram:verify
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const MARKERS = ['模拟支付', 'onSubmitAndPay', 'dev-tip'];

function checkDir(dir) {
  const file = path.join(dir, 'miniprogram/pages/checkout/checkout.wxml');
  if (!fs.existsSync(file)) {
    return { dir, status: 'missing', file };
  }
  const content = fs.readFileSync(file, 'utf8');
  const hits = MARKERS.filter((m) => content.includes(m));
  const isLatest = hits.length === MARKERS.length;
  return {
    dir,
    file,
    status: isLatest ? 'latest' : 'outdated',
    hits,
    preview: content.split('\n').slice(34, 48).join('\n'),
  };
}

function collectCandidates() {
  const home = os.homedir();
  const names = [
    ROOT,
    path.join(home, 'WeChatProjects', 'personal_web'),
    path.join(home, 'WeChatProjects', 'personal_web_git'),
    path.join(home, 'WeChatProjects', 'miniprogram'),
  ];
  const seen = new Set();
  return names.filter((dir) => {
    const key = path.resolve(dir);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  console.log('');
  console.log('========================================');
  console.log('  小程序源码版本检查');
  console.log('========================================');
  console.log('');

  const results = collectCandidates().map(checkDir);
  let latestDir = null;

  results.forEach((result, index) => {
    console.log(`[${index + 1}] ${result.dir}`);
    if (result.status === 'missing') {
      console.log('  ✗ 未找到 checkout.wxml');
      return;
    }
    if (result.status === 'latest') {
      console.log('  ✓ 最新版（含「模拟支付」按钮）');
      latestDir = result.dir;
    } else {
      console.log(`  ✗ 旧版（仅命中 ${result.hits.length}/${MARKERS.length} 个特征）`);
      console.log('  文件:', result.file);
    }
    console.log('');
  });

  console.log('========================================');
  if (latestDir) {
    console.log('请让微信开发者工具导入这个目录:');
    console.log(`  ${path.join(latestDir, 'miniprogram')}`);
    console.log('');
    console.log('若工具里打开的是其他目录，git pull 不会生效。');
  } else {
    console.log('未找到最新版源码，请重新 clone 或下载 ZIP。');
    console.log('分支: cursor/shop-miniprogram-mvp-383d');
  }
  console.log('========================================');
  console.log('');

  process.exit(latestDir ? 0 : 1);
}

main();

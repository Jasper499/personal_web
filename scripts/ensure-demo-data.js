#!/usr/bin/env node
/**
 * 检查并修复演示商品数据（各分类至少 1 个上架商品）
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

async function main() {
  const { PrismaClient } = require(path.join(BACKEND, 'node_modules/@prisma/client'));
  const prisma = new PrismaClient();

  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (categories.length === 0) {
      console.log('[ensure-demo-data] 无分类数据，执行 seed...');
      execSync('npm run db:seed', { cwd: BACKEND, stdio: 'inherit' });
      return;
    }

    const emptyCategories = [];
    for (const category of categories) {
      const count = await prisma.product.count({
        where: { categoryId: category.id, isActive: true },
      });
      if (count === 0) {
        emptyCategories.push(category.name);
      }
    }

    const demoProductCount = await prisma.product.count({
      where: { id: { lte: 16 } },
    });
    const inactiveDemoCount = await prisma.product.count({
      where: { id: { lte: 16 }, isActive: false },
    });

    if (emptyCategories.length > 0 || inactiveDemoCount > 0 || demoProductCount < 16) {
      console.log('[ensure-demo-data] 检测到演示数据异常，正在修复...');
      if (emptyCategories.length > 0) {
        console.log(`  空分类: ${emptyCategories.join('、')}`);
      }
      if (demoProductCount < 16) {
        console.log(`  演示商品不足: ${demoProductCount}/16`);
      }
      if (inactiveDemoCount > 0) {
        console.log(`  下架演示商品: ${inactiveDemoCount} 个`);
      }
      execSync('npm run db:seed', { cwd: BACKEND, stdio: 'inherit' });
      console.log('[ensure-demo-data] 演示数据已修复');
    } else {
      console.log('[ensure-demo-data] 演示数据正常');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[ensure-demo-data] 失败:', error.message);
  process.exit(1);
});

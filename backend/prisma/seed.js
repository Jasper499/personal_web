const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PLACEHOLDER = 'https://picsum.photos/seed';

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await prisma.admin.upsert({
    where: { username: process.env.ADMIN_USERNAME || 'admin' },
    update: {},
    create: {
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
      name: '店主',
    },
  });

  const categories = await Promise.all(
    [
      { name: '百货', icon: '🏠', sortOrder: 1 },
      { name: '文创', icon: '🎨', sortOrder: 2 },
      { name: '美食', icon: '🍜', sortOrder: 3 },
      { name: '生活', icon: '🌿', sortOrder: 4 },
    ].map((c) =>
      prisma.category.upsert({
        where: { id: c.sortOrder },
        update: c,
        create: { id: c.sortOrder, ...c },
      })
    )
  );

  const products = [
    {
      categoryId: categories[0].id,
      name: '匠心手作陶瓷杯',
      description: '手工拉坯，釉面温润，适合日常品茗。',
      price: 68,
      originalPrice: 88,
      stock: 56,
      coverImage: `${PLACEHOLDER}/cup/400/400`,
      salesCount: 328,
    },
    {
      categoryId: categories[1].id,
      name: '复古牛皮手账本',
      description: '头层牛皮封面，内页 120g 书写纸。',
      price: 45,
      originalPrice: 59,
      stock: 120,
      coverImage: `${PLACEHOLDER}/notebook/400/400`,
      salesCount: 256,
    },
    {
      categoryId: categories[2].id,
      name: '桂花乌龙茶礼盒',
      description: '当季新茶，独立小包装，送礼自用皆宜。',
      price: 99,
      originalPrice: 128,
      stock: 80,
      coverImage: `${PLACEHOLDER}/tea/400/400`,
      salesCount: 189,
    },
    {
      categoryId: categories[3].id,
      name: '天然藤编收纳篮',
      description: '环保材质，厨房卧室多场景适用。',
      price: 35,
      stock: 200,
      coverImage: `${PLACEHOLDER}/basket/400/400`,
      salesCount: 412,
    },
    {
      categoryId: categories[0].id,
      name: '极简陶瓷餐盘套装',
      description: '四件套，微波炉可用，易清洁。',
      price: 128,
      originalPrice: 168,
      stock: 40,
      coverImage: `${PLACEHOLDER}/plate/400/400`,
      salesCount: 95,
    },
    {
      categoryId: categories[1].id,
      name: '创意书签金属套装',
      description: '镂空工艺，附赠收纳铁盒。',
      price: 28,
      stock: 300,
      coverImage: `${PLACEHOLDER}/bookmark/400/400`,
      salesCount: 567,
    },
  ];

  for (const [i, p] of products.entries()) {
    await prisma.product.upsert({
      where: { id: i + 1 },
      update: {
        ...p,
        images: JSON.stringify([p.coverImage, `${PLACEHOLDER}/p${i + 1}b/400/400`]),
        isActive: true,
      },
      create: {
        ...p,
        images: JSON.stringify([p.coverImage, `${PLACEHOLDER}/p${i + 1}b/400/400`]),
        isActive: true,
      },
    });
  }

  await prisma.productSku.upsert({
    where: { id: 1 },
    update: {},
    create: {
      productId: 1,
      specName: '米白色',
      price: 68,
      stock: 30,
    },
  });
  await prisma.productSku.upsert({
    where: { id: 2 },
    update: {},
    create: {
      productId: 1,
      specName: '青瓷色',
      price: 72,
      stock: 26,
    },
  });

  await prisma.banner.upsert({
    where: { id: 1 },
    update: {},
    create: {
      imageUrl: `${PLACEHOLDER}/banner1/750/320`,
      linkType: 'none',
      sortOrder: 1,
    },
  });
  await prisma.banner.upsert({
    where: { id: 2 },
    update: {},
    create: {
      imageUrl: `${PLACEHOLDER}/banner2/750/320`,
      linkType: 'product',
      linkValue: '1',
      sortOrder: 2,
    },
  });

  console.log('Seed 完成：管理员 admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_IMG = '/uploads/demo';

function img(name) {
  return `${DEMO_IMG}/${name}.png`;
}

function productImages(productId) {
  const cover = img(`product-${productId}`);
  return JSON.stringify([cover, cover]);
}

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
      description: '手工拉坯，釉面温润，适合日常品茗。每只杯子纹理独一无二，是桌面上的温暖点缀。',
      price: 68,
      originalPrice: 88,
      stock: 56,
      coverImage: img('product-1'),
      salesCount: 328,
    },
    {
      categoryId: categories[0].id,
      name: '极简陶瓷餐盘套装',
      description: '四件套，微波炉可用，易清洁。简约线条搭配哑光釉面，让每一餐都更有仪式感。',
      price: 128,
      originalPrice: 168,
      stock: 40,
      coverImage: img('product-2'),
      salesCount: 95,
    },
    {
      categoryId: categories[0].id,
      name: '日式竹木筷子套装',
      description: '天然竹木，无漆无蜡，五双装附收纳盒。轻便耐用，适合家庭日常使用。',
      price: 39,
      originalPrice: 49,
      stock: 180,
      coverImage: img('product-3'),
      salesCount: 267,
    },
    {
      categoryId: categories[0].id,
      name: '纯棉厨房抹布三件套',
      description: '加厚纯棉，吸水性强，不易掉絮。三色区分用途，厨房清洁更卫生。',
      price: 25,
      stock: 320,
      coverImage: img('product-4'),
      salesCount: 512,
    },
    {
      categoryId: categories[1].id,
      name: '复古牛皮手账本',
      description: '头层牛皮封面，内页 120g 书写纸。记录灵感与待办，越用越有质感。',
      price: 45,
      originalPrice: 59,
      stock: 120,
      coverImage: img('product-5'),
      salesCount: 256,
    },
    {
      categoryId: categories[1].id,
      name: '创意书签金属套装',
      description: '镂空工艺，附赠收纳铁盒。六款造型，阅读爱好者的精致小物。',
      price: 28,
      stock: 300,
      coverImage: img('product-6'),
      salesCount: 567,
    },
    {
      categoryId: categories[1].id,
      name: '手绘帆布袋',
      description: '原创插画印花，大容量肩背设计。环保可重复使用，通勤购物两相宜。',
      price: 58,
      originalPrice: 78,
      stock: 88,
      coverImage: img('product-7'),
      salesCount: 143,
    },
    {
      categoryId: categories[1].id,
      name: '木质桌面摆件',
      description: '胡桃木底座搭配手工雕刻，适合书房与办公桌。送礼自用皆宜。',
      price: 88,
      stock: 45,
      coverImage: img('product-8'),
      salesCount: 76,
    },
    {
      categoryId: categories[2].id,
      name: '桂花乌龙茶礼盒',
      description: '当季新茶，独立小包装，送礼自用皆宜。花香与茶香交融，回味甘甜。',
      price: 99,
      originalPrice: 128,
      stock: 80,
      coverImage: img('product-9'),
      salesCount: 189,
    },
    {
      categoryId: categories[2].id,
      name: '手工曲奇礼盒',
      description: '黄油与坚果搭配，酥脆不腻。精美铁盒包装，节日伴手礼首选。',
      price: 68,
      originalPrice: 88,
      stock: 60,
      coverImage: img('product-10'),
      salesCount: 234,
    },
    {
      categoryId: categories[2].id,
      name: '天然蜂蜜土罐装',
      description: '深山蜜源，低温灌装保留活性酶。口感醇厚，温水冲泡或涂抹面包均可。',
      price: 78,
      stock: 95,
      coverImage: img('product-11'),
      salesCount: 156,
    },
    {
      categoryId: categories[2].id,
      name: '坚果混合装',
      description: '每日坚果配比，无添加蔗糖。独立小袋，办公室零食好选择。',
      price: 49,
      originalPrice: 59,
      stock: 150,
      coverImage: img('product-12'),
      salesCount: 398,
    },
    {
      categoryId: categories[3].id,
      name: '天然藤编收纳篮',
      description: '环保材质，厨房卧室多场景适用。透气防潮，收纳杂物更有条理。',
      price: 35,
      stock: 200,
      coverImage: img('product-13'),
      salesCount: 412,
    },
    {
      categoryId: categories[3].id,
      name: '香氛蜡烛',
      description: '大豆蜡基底，燃烧均匀无烟。雪松与柑橘调，营造放松居家氛围。',
      price: 59,
      originalPrice: 79,
      stock: 72,
      coverImage: img('product-14'),
      salesCount: 198,
    },
    {
      categoryId: categories[3].id,
      name: '亚麻抱枕套',
      description: '透气亚麻面料，隐形拉链设计。自然褶皱质感，沙发床品轻松焕新。',
      price: 42,
      stock: 110,
      coverImage: img('product-15'),
      salesCount: 167,
    },
    {
      categoryId: categories[3].id,
      name: '竹纤维毛巾套装',
      description: '柔软亲肤，吸水快干。两条装，洗脸洗澡分开使用更卫生。',
      price: 36,
      originalPrice: 46,
      stock: 240,
      coverImage: img('product-16'),
      salesCount: 289,
    },
  ];

  for (const [i, p] of products.entries()) {
    const productId = i + 1;
    const payload = {
      ...p,
      images: productImages(productId),
      isActive: true,
    };
    await prisma.product.upsert({
      where: { id: productId },
      update: payload,
      create: { id: productId, ...payload },
    });
  }

  await prisma.product.updateMany({
    where: { id: { in: products.map((_, i) => i + 1) } },
    data: { isActive: true },
  });

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

  const banners = [
    {
      id: 1,
      imageUrl: img('banner-1'),
      linkType: 'none',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 2,
      imageUrl: img('banner-2'),
      linkType: 'product',
      linkValue: '1',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 3,
      imageUrl: img('banner-3'),
      linkType: 'product',
      linkValue: '9',
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({
      where: { id: banner.id },
      update: banner,
      create: banner,
    });
  }

  console.log(`Seed 完成：${products.length} 个商品、${banners.length} 张 Banner，管理员 admin / admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

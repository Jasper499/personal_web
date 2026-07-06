const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success, fail } = require('../utils/response');
const { authAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return success(res, categories);
});

router.get('/products', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, parseInt(req.query.pageSize, 10) || 10);
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined;
  const keyword = req.query.keyword?.trim();
  const sort = req.query.sort || 'default';

  const where = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
    ...(keyword ? { name: { contains: keyword } } : {}),
  };

  const orderBy =
    sort === 'sales'
      ? { salesCount: 'desc' }
      : sort === 'price'
        ? { price: 'asc' }
        : { createdAt: 'desc' };

  const [list, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  const products = list.map((p) => ({
    ...p,
    images: JSON.parse(p.images || '[]'),
  }));

  return success(res, { list: products, total, page, pageSize });
});

router.get('/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, skus: true },
  });
  if (!product) {
    return fail(res, 404, 40400, '商品不存在');
  }
  return success(res, { ...product, images: JSON.parse(product.images || '[]') });
});

router.get('/banners', async (_req, res) => {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  return success(res, banners);
});

// Admin routes
const adminRouter = express.Router();
adminRouter.use(authAdmin);

adminRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  return success(res, categories);
});

adminRouter.post('/categories', async (req, res) => {
  const { name, icon, sortOrder } = req.body;
  const category = await prisma.category.create({
    data: { name, icon: icon || '', sortOrder: sortOrder || 0 },
  });
  return success(res, category);
});

adminRouter.put('/categories/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const category = await prisma.category.update({ where: { id }, data: req.body });
  return success(res, category);
});

adminRouter.get('/products', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const pageSize = parseInt(req.query.pageSize, 10) || 20;
  const [list, total] = await Promise.all([
    prisma.product.findMany({
      include: { category: true, skus: true },
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count(),
  ]);
  return success(res, {
    list: list.map((p) => ({ ...p, images: JSON.parse(p.images || '[]') })),
    total,
  });
});

adminRouter.post('/products', async (req, res) => {
  const { categoryId, name, description, price, originalPrice, stock, coverImage, images, skus } =
    req.body;
  const product = await prisma.product.create({
    data: {
      categoryId,
      name,
      description: description || '',
      price,
      originalPrice,
      stock: stock || 0,
      coverImage: coverImage || '',
      images: JSON.stringify(images || []),
      skus: skus?.length
        ? { create: skus.map((s) => ({ specName: s.specName, price: s.price, stock: s.stock })) }
        : undefined,
    },
    include: { skus: true },
  });
  return success(res, { ...product, images: JSON.parse(product.images) });
});

adminRouter.put('/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { images, skus, ...rest } = req.body;
  const data = { ...rest };
  if (images) data.images = JSON.stringify(images);
  const product = await prisma.product.update({ where: { id }, data, include: { skus: true } });
  return success(res, { ...product, images: JSON.parse(product.images) });
});

adminRouter.patch('/products/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: !!req.body.isActive },
  });
  return success(res, product);
});

adminRouter.get('/banners', async (_req, res) => {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  return success(res, banners);
});

adminRouter.post('/banners', async (req, res) => {
  const banner = await prisma.banner.create({ data: req.body });
  return success(res, banner);
});

adminRouter.put('/banners/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const banner = await prisma.banner.update({ where: { id }, data: req.body });
  return success(res, banner);
});

module.exports = { router, adminRouter };

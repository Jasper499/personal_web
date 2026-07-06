const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success, fail } = require('../utils/response');
const { authUser } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authUser);

async function formatCartItem(item) {
  const price = item.sku ? item.sku.price : item.product.price;
  const stock = item.sku ? item.sku.stock : item.product.stock;
  const specName = item.sku ? item.sku.specName : '';
  const available = item.product.isActive && stock >= item.quantity;
  return {
    id: item.id,
    productId: item.productId,
    skuId: item.skuId,
    quantity: item.quantity,
    price,
    stock,
    specName,
    available,
    product: {
      id: item.product.id,
      name: item.product.name,
      coverImage: item.product.coverImage,
      isActive: item.product.isActive,
    },
  };
}

router.get('/', async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.userId },
    include: { product: true, sku: true },
    orderBy: { id: 'desc' },
  });
  const list = await Promise.all(items.map(formatCartItem));
  const totalAmount = list
    .filter((i) => i.available)
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  return success(res, { list, totalAmount, count: list.length });
});

router.post('/', async (req, res) => {
  const { productId, skuId, quantity = 1 } = req.body;
  if (!productId) {
    return fail(res, 400, 40001, '缺少商品 ID');
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { skus: true },
  });
  if (!product || !product.isActive) {
    return fail(res, 404, 40400, '商品不存在或已下架');
  }

  const existing = await prisma.cartItem.findFirst({
    where: { userId: req.userId, productId, skuId: skuId || null },
  });

  let item;
  if (existing) {
    item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
      include: { product: true, sku: true },
    });
  } else {
    item = await prisma.cartItem.create({
      data: { userId: req.userId, productId, skuId: skuId || null, quantity },
      include: { product: true, sku: true },
    });
  }
  return success(res, await formatCartItem(item));
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = await prisma.cartItem.findFirst({ where: { id, userId: req.userId } });
  if (!item) {
    return fail(res, 404, 40400, '购物车项不存在');
  }
  const updated = await prisma.cartItem.update({
    where: { id },
    data: { quantity: req.body.quantity },
    include: { product: true, sku: true },
  });
  return success(res, await formatCartItem(updated));
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = await prisma.cartItem.findFirst({ where: { id, userId: req.userId } });
  if (!item) {
    return fail(res, 404, 40400, '购物车项不存在');
  }
  await prisma.cartItem.delete({ where: { id } });
  return success(res, null);
});

module.exports = router;

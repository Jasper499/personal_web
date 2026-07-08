const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success, fail } = require('../utils/response');
const { authUser, authAdmin } = require('../middleware/auth');
const { generateOrderNo, generatePickupCode } = require('../utils/order');
const { notifyOrderShipped, notifyPickupReady } = require('../utils/order-notify');

const prisma = new PrismaClient();
const router = express.Router();
const adminRouter = express.Router();

const FREIGHT_EXPRESS = 8;
const FREE_FREIGHT_THRESHOLD = 99;

async function resolveOrderItems(items) {
  const resolved = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { skus: true },
    });
    if (!product || !product.isActive) {
      throw new Error(`商品 ${item.productId} 不存在或已下架`);
    }

    let price = product.price;
    let specName = '';
    let stock = product.stock;
    const skuId = item.skuId || null;

    if (skuId) {
      const sku = product.skus.find((s) => s.id === skuId);
      if (!sku) throw new Error('规格不存在');
      price = sku.price;
      specName = sku.specName;
      stock = sku.stock;
    }

    if (stock < item.quantity) {
      throw new Error(`${product.name} 库存不足`);
    }

    totalAmount += price * item.quantity;
    resolved.push({
      productId: product.id,
      skuId,
      productName: product.name,
      specName,
      price,
      quantity: item.quantity,
      coverImage: product.coverImage,
    });
  }

  return { resolved, totalAmount };
}

router.use(authUser);

router.post('/', async (req, res) => {
  try {
    const { items, deliveryType = 'pickup', addressId, remark = '', fromCart = false } = req.body;
    if (!items?.length) {
      return fail(res, 400, 40001, '订单商品不能为空');
    }

    const { resolved, totalAmount } = await resolveOrderItems(items);

    let addressSnapshot = null;
    let freight = 0;

    if (deliveryType === 'express') {
      if (!addressId) {
        return fail(res, 400, 40001, '请选择收货地址');
      }
      const address = await prisma.address.findFirst({
        where: { id: addressId, userId: req.userId },
      });
      if (!address) {
        return fail(res, 404, 40400, '地址不存在');
      }
      addressSnapshot = JSON.stringify(address);
      freight = totalAmount >= FREE_FREIGHT_THRESHOLD ? 0 : FREIGHT_EXPRESS;
    }

    const payAmount = totalAmount + freight;
    const pickupCode = deliveryType === 'pickup' ? generatePickupCode() : null;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          userId: req.userId,
          status: 'pending',
          totalAmount,
          freight,
          payAmount,
          deliveryType,
          addressSnapshot,
          remark,
          pickupCode,
          items: { create: resolved },
        },
        include: { items: true },
      });

      for (const item of resolved) {
        if (item.skuId) {
          await tx.productSku.update({
            where: { id: item.skuId },
            data: { stock: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      if (fromCart) {
        await tx.cartItem.deleteMany({
          where: {
            userId: req.userId,
            OR: resolved.map((r) => ({
              productId: r.productId,
              skuId: r.skuId,
            })),
          },
        });
      }

      return created;
    });

    return success(res, {
      ...order,
      addressSnapshot: order.addressSnapshot ? JSON.parse(order.addressSnapshot) : null,
    });
  } catch (e) {
    return fail(res, 400, 50001, e.message);
  }
});

router.get('/', async (req, res) => {
  const status = req.query.status;
  const where = { userId: req.userId, ...(status ? { status } : {}) };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return success(
    res,
    orders.map((o) => ({
      ...o,
      addressSnapshot: o.addressSnapshot ? JSON.parse(o.addressSnapshot) : null,
    }))
  );
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.findFirst({
    where: { id, userId: req.userId },
    include: { items: true },
  });
  if (!order) {
    return fail(res, 404, 40400, '订单不存在');
  }
  return success(res, {
    ...order,
    addressSnapshot: order.addressSnapshot ? JSON.parse(order.addressSnapshot) : null,
  });
});

router.post('/:id/confirm', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.findFirst({ where: { id, userId: req.userId } });
  if (!order) {
    return fail(res, 404, 40400, '订单不存在');
  }
  if (order.status !== 'shipped') {
    return fail(res, 400, 50002, '当前状态不可确认收货');
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'completed', completedAt: new Date() },
  });
  return success(res, updated);
});

router.post('/:id/cancel', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.findFirst({ where: { id, userId: req.userId } });
  if (!order) {
    return fail(res, 404, 40400, '订单不存在');
  }
  if (order.status !== 'pending') {
    return fail(res, 400, 50002, '当前状态不可取消');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: 'cancelled' } });
    const items = await tx.orderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      if (item.skuId) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  });

  return success(res, { id, status: 'cancelled' });
});

// Admin
adminRouter.use(authAdmin);

adminRouter.get('/', async (req, res) => {
  const status = req.query.status;
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    include: { items: true, user: { select: { id: true, nickname: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return success(
    res,
    orders.map((o) => ({
      ...o,
      addressSnapshot: o.addressSnapshot ? JSON.parse(o.addressSnapshot) : null,
    }))
  );
});

adminRouter.get('/stats/overview', async (_req, res) => {
  const [pending, paid, todayOrders] = await Promise.all([
    prisma.order.count({ where: { status: 'pending' } }),
    prisma.order.count({ where: { status: 'paid' } }),
    prisma.order.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return success(res, { pending, paid, todayOrders });
});

adminRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: true },
  });
  if (!order) {
    return fail(res, 404, 40400, '订单不存在');
  }
  return success(res, {
    ...order,
    addressSnapshot: order.addressSnapshot ? JSON.parse(order.addressSnapshot) : null,
  });
});

adminRouter.post('/:id/ship', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { expressCompany, expressNo } = req.body;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!order || order.status !== 'paid') {
    return fail(res, 400, 50002, '订单状态不允许发货');
  }
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: 'shipped',
      expressCompany,
      expressNo,
      shippedAt: new Date(),
    },
    include: { user: true },
  });
  notifyOrderShipped(updated, updated.user).catch((err) => {
    console.warn('[orders/ship] 订阅消息发送失败:', err.message);
  });
  return success(res, updated);
});

adminRouter.post('/:id/complete-pickup', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!order || order.status !== 'paid' || order.deliveryType !== 'pickup') {
    return fail(res, 400, 50002, '订单状态不允许核销');
  }
  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'completed', completedAt: new Date() },
    include: { user: true },
  });
  await prisma.product.updateMany({
    where: { id: { in: (await prisma.orderItem.findMany({ where: { orderId: id } })).map((i) => i.productId) } },
    data: {},
  });
  const items = await prisma.orderItem.findMany({ where: { orderId: id } });
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { salesCount: { increment: item.quantity } },
    });
  }
  notifyPickupReady(updated, updated.user).catch((err) => {
    console.warn('[orders/pickup] 订阅消息发送失败:', err.message);
  });
  return success(res, updated);
});

module.exports = { router, adminRouter };

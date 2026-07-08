const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success, fail } = require('../utils/response');
const { authUser } = require('../middleware/auth');
const {
  isMockPay,
  createJsapiPrepay,
} = require('../utils/wechat-pay');
const { notifyOrderPaid } = require('../utils/order-notify');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/config', (_req, res) => {
  return success(res, {
    mockPay: isMockPay(),
    subscribeTemplates: {
      paid: process.env.WX_TMPL_ORDER_PAID || '',
      shipped: process.env.WX_TMPL_ORDER_SHIPPED || '',
      pickup: process.env.WX_TMPL_ORDER_PICKUP || '',
    },
  });
});

async function getOrderForPay(orderId, userId) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { user: true },
  });
}

async function completePayment(order, transactionId, prepayId) {
  if (order.status === 'paid') {
    return order;
  }
  if (order.status !== 'pending') {
    throw new Error('订单状态不允许支付');
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      paidAt: new Date(),
      transactionId: transactionId || order.transactionId,
      prepayId: prepayId || order.prepayId,
    },
    include: { user: true },
  });

  notifyOrderPaid(updated, updated.user).catch((err) => {
    console.warn('[pay] 订阅消息发送失败:', err.message);
  });

  return updated;
}

router.post('/prepay', authUser, async (req, res) => {
  const orderId = parseInt(req.body.orderId, 10);
  if (!orderId) {
    return fail(res, 400, 40001, '缺少有效 orderId');
  }

  const order = await getOrderForPay(orderId, req.userId);
  if (!order) {
    return fail(res, 404, 40400, '订单不存在');
  }
  if (order.status !== 'pending') {
    return fail(res, 400, 50002, '订单状态不允许支付');
  }

  if (isMockPay()) {
    return success(res, {
      mock: true,
      orderId: order.id,
      message: '开发环境将使用模拟支付',
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.openid) {
      return fail(res, 400, 50003, '用户 openid 缺失，请重新登录');
    }

    const { prepayId, payment } = await createJsapiPrepay({ order, openid: user.openid });
    await prisma.order.update({
      where: { id: order.id },
      data: { prepayId },
    });

    return success(res, {
      mock: false,
      orderId: order.id,
      payment,
    });
  } catch (e) {
    return fail(res, 500, 50000, e.message || '微信下单失败');
  }
});

router.post('/mock-success', authUser, async (req, res) => {
  const orderId = parseInt(req.body.orderId, 10);
  if (!orderId) {
    return fail(res, 400, 40001, '缺少有效 orderId');
  }

  const order = await getOrderForPay(orderId, req.userId);
  if (!order) {
    return fail(res, 404, 40400, '订单不存在或不属于当前用户，请重新登录后重试');
  }
  if (order.status !== 'pending') {
    return success(res, { id: order.id, status: order.status, message: '订单已处理' });
  }

  try {
    const updated = await completePayment(order, `mock_${Date.now()}`);
    return success(res, updated);
  } catch (e) {
    return fail(res, 400, 50002, e.message);
  }
});

module.exports = router;

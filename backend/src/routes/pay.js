const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { success, fail } = require('../utils/response');
const { authUser } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/prepay', authUser, async (req, res) => {
  const { orderId } = req.body;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.userId },
  });
  if (!order) {
    return fail(res, 404, 40400, '订单不存在');
  }
  if (order.status !== 'pending') {
    return fail(res, 400, 50002, '订单状态不允许支付');
  }

  // 生产环境应调用微信统一下单 API
  return success(res, {
    mock: true,
    orderId: order.id,
    message: '开发环境请调用 /api/pay/mock-success 模拟支付',
    payment: {
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: 'mock_nonce',
      package: 'prepay_id=mock_prepay_id',
      signType: 'RSA',
      paySign: 'mock_sign',
    },
  });
});

router.post('/mock-success', authUser, async (req, res) => {
  const orderId = parseInt(req.body.orderId, 10);
  if (!orderId) {
    return fail(res, 400, 40001, '缺少有效 orderId');
  }
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.userId },
  });
  if (!order) {
    return fail(res, 404, 40400, '订单不存在或不属于当前用户，请重新登录后重试');
  }
  if (order.status !== 'pending') {
    return success(res, { id: order.id, status: order.status, message: '订单已处理' });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'paid', paidAt: new Date() },
  });

  return success(res, updated);
});

router.post('/notify', async (req, res) => {
  // 生产环境：验证微信签名，解析 XML/JSON，更新订单
  res.json({ code: 'SUCCESS', message: '成功' });
});

module.exports = router;

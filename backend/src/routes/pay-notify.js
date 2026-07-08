const { PrismaClient } = require('@prisma/client');
const { verifyNotifySign, parseXml } = require('../utils/wechat-pay');
const { notifyOrderPaid } = require('../utils/order-notify');

const prisma = new PrismaClient();

async function completePayment(order, transactionId, prepayId) {
  if (order.status === 'paid') return order;
  if (order.status !== 'pending') throw new Error('订单状态不允许支付');

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
    console.warn('[pay/notify] 订阅消息发送失败:', err.message);
  });

  return updated;
}

module.exports = async function payNotifyHandler(req, res) {
  try {
    const xml = req.body?.toString?.() || '';
    const data = parseXml(xml);
    if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
      res.type('text/xml').send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
      return;
    }

    const key = process.env.WX_PAY_KEY;
    if (!key || !verifyNotifySign(data, key)) {
      res.type('text/xml').send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNo: data.out_trade_no },
      include: { user: true },
    });
    if (order) {
      await completePayment(order, data.transaction_id, data.prepay_id);
    }

    res.type('text/xml').send(
      '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
    );
  } catch (e) {
    console.error('[pay/notify]', e);
    res.type('text/xml').send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
  }
};

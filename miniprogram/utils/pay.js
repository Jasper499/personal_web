const { request } = require('./request');

let payConfigCache = null;

async function getPayConfig(force = false) {
  if (!payConfigCache || force) {
    payConfigCache = await request('/pay/config');
  }
  return payConfigCache;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollOrderPaid(orderId, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const order = await request(`/orders/${orderId}`);
    if (order.status === 'paid') return order;
    await sleep(600);
  }
  return request(`/orders/${orderId}`);
}

async function payOrder(orderId) {
  const id = Number(orderId);
  if (!id) throw new Error('订单 ID 无效');

  const prepay = await request('/pay/prepay', {
    method: 'POST',
    data: { orderId: id },
  });

  if (prepay.mock) {
    return request('/pay/mock-success', {
      method: 'POST',
      data: { orderId: id },
    });
  }

  if (!prepay.payment) {
    throw new Error('支付参数获取失败');
  }

  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: prepay.payment.timeStamp,
      nonceStr: prepay.payment.nonceStr,
      package: prepay.payment.package,
      signType: prepay.payment.signType || 'MD5',
      paySign: prepay.payment.paySign,
      success: async () => {
        try {
          const order = await pollOrderPaid(id);
          resolve(order);
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '支付已取消';
        reject(new Error(msg.includes('cancel') ? '支付已取消' : msg));
      },
    });
  });
}

async function mockPayOrder(orderId) {
  return payOrder(orderId);
}

module.exports = {
  payOrder,
  mockPayOrder,
  getPayConfig,
};

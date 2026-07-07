const { request } = require('./request');

async function mockPayOrder(orderId) {
  const id = Number(orderId);
  if (!id) {
    throw new Error('订单 ID 无效');
  }
  return request('/pay/mock-success', {
    method: 'POST',
    data: { orderId: id },
  });
}

module.exports = { mockPayOrder };

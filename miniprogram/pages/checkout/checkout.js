const { request } = require('../../utils/request');
const { mockPayOrder } = require('../../utils/pay');
const { track } = require('../../utils/analytics');

Page({
  data: {
    items: [],
    deliveryType: 'pickup',
    addresses: [],
    selectedAddress: null,
    remark: '',
    totalAmount: 0,
    freight: 0,
    payAmount: 0,
    fromCart: false,
  },

  onLoad(options) {
    const items = wx.getStorageSync('checkoutItems') || [];
    this.setData({ items, fromCart: options.fromCart === '1' });
    this.loadAddresses();
    this.calcAmount();
  },

  async loadAddresses() {
    try {
      const addresses = await request('/addresses');
      const selectedAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;
      this.setData({ addresses, selectedAddress });
    } catch {
      this.setData({ addresses: [], selectedAddress: null });
    }
  },

  async calcAmount() {
    let total = 0;
    for (const item of this.data.items) {
      const product = await request(`/products/${item.productId}`);
      const price = item.skuId
        ? product.skus.find((s) => s.id === item.skuId)?.price
        : product.price;
      total += price * item.quantity;
    }
    const freight =
      this.data.deliveryType === 'express' && total < 99 ? 8 : 0;
    this.setData({ totalAmount: total, freight, payAmount: total + freight });
  },

  onDeliveryChange(e) {
    this.setData({ deliveryType: e.detail.value });
    this.calcAmount();
  },

  onAddressTap() {
    wx.navigateTo({ url: '/pages/address/list?select=1' });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  async onSubmit() {
    const { items, deliveryType, selectedAddress, remark, fromCart, payAmount } = this.data;
    if (deliveryType === 'express' && !selectedAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中' });
    try {
      const order = await request('/orders', {
        method: 'POST',
        data: {
          items,
          deliveryType,
          addressId: selectedAddress?.id,
          remark,
          fromCart,
        },
      });
      track('begin_checkout', { orderId: order.id, payAmount });
      await mockPayOrder(order.id);
      track('purchase', { orderId: order.id, payAmount });
      wx.hideLoading();
      wx.removeStorageSync('checkoutItems');
      wx.showToast({ title: '支付成功', icon: 'success' });
      wx.redirectTo({ url: `/pages/order/detail?id=${order.id}` });
    } catch (e) {
      wx.hideLoading();
      const msg = (e && e.message) || '提交失败，请重试';
      wx.showModal({
        title: '下单失败',
        content: msg.includes('下架') || msg.includes('不存在')
          ? `${msg}\n\n演示商品可能已下架，请在项目根目录执行：\nnpm run db:reseed`
          : msg,
        showCancel: false,
      });
    }
  },
});

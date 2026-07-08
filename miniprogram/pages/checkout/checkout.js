const { request } = require('../../utils/request');
const { mockPayOrder } = require('../../utils/pay');
const { track } = require('../../utils/analytics');
const app = getApp();

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
    submitting: false,
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

  goOrderDetail(orderId, title, content) {
    wx.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '查看订单',
      success: () => {
        wx.redirectTo({ url: `/pages/order/detail?id=${orderId}` });
      },
    });
  },

  async onSubmit() {
    if (this.data.submitting) return;

    const { items, deliveryType, selectedAddress, remark, fromCart, payAmount } = this.data;
    if (!items.length) {
      wx.showToast({ title: '没有可结算商品', icon: 'none' });
      return;
    }
    if (deliveryType === 'express' && !selectedAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交订单' });

    try {
      const user = await app.ensureLogin();
      if (!user) {
        throw new Error('登录失败，请重新编译小程序');
      }

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
      wx.showLoading({ title: '模拟支付中' });

      try {
        await mockPayOrder(order.id);
        track('purchase', { orderId: order.id, payAmount });
        wx.hideLoading();
        wx.removeStorageSync('checkoutItems');
        this.setData({ submitting: false });
        this.goOrderDetail(
          order.id,
          '支付成功',
          deliveryType === 'pickup'
            ? '订单已支付，请在订单详情查看取货码。'
            : '订单已支付，商家将尽快发货。'
        );
      } catch (payError) {
        wx.hideLoading();
        wx.removeStorageSync('checkoutItems');
        this.setData({ submitting: false });
        const payMsg = (payError && payError.message) || '支付失败';
        this.goOrderDetail(
          order.id,
          '订单已创建',
          `${payMsg}\n\n订单已生成，请在订单详情点击「模拟支付」完成付款。`
        );
      }
    } catch (e) {
      wx.hideLoading();
      this.setData({ submitting: false });
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

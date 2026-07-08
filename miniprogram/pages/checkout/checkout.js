const { request } = require('../../utils/request');
const { payOrder, getPayConfig } = require('../../utils/pay');
const { requestOrderSubscribe } = require('../../utils/subscribe');
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
    submitting: false,
    mockPay: true,
    payLabel: '模拟支付',
  },

  onLoad(options) {
    const items = wx.getStorageSync('checkoutItems') || [];
    this.setData({ items, fromCart: options.fromCart === '1' });
    this.loadPayConfig();
    this.loadAddresses();
    this.calcAmount();
  },

  onShow() {
    this.loadAddresses();
  },

  async loadPayConfig() {
    try {
      const config = await getPayConfig();
      const mockPay = config.mockPay !== false;
      this.setData({
        mockPay,
        payLabel: mockPay ? '模拟支付' : '微信支付',
      });
    } catch {
      this.setData({ mockPay: true, payLabel: '模拟支付' });
    }
  },

  async loadAddresses() {
    try {
      const addresses = await request('/addresses');
      const { selectedAddress } = this.data;
      const nextSelected =
        (selectedAddress && addresses.find((a) => a.id === selectedAddress.id)) ||
        addresses.find((a) => a.isDefault) ||
        addresses[0] ||
        null;
      this.setData({ addresses, selectedAddress: nextSelected });
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

  validateCheckout() {
    const { items, deliveryType, selectedAddress } = this.data;
    if (!items.length) {
      wx.showToast({ title: '没有可结算商品', icon: 'none' });
      return false;
    }
    if (deliveryType === 'express' && !selectedAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return false;
    }
    return true;
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

  async createOrder() {
    const { items, deliveryType, selectedAddress, remark, fromCart } = this.data;
    const app = getApp();
    const user = await app.ensureLogin();
    if (!user) {
      throw new Error('登录失败，请重新编译小程序');
    }
    return request('/orders', {
      method: 'POST',
      data: {
        items,
        deliveryType,
        addressId: selectedAddress?.id,
        remark,
        fromCart,
      },
    });
  },

  async onSubmitOnly() {
    if (this.data.submitting || !this.validateCheckout()) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交订单' });
    try {
      const order = await this.createOrder();
      wx.hideLoading();
      wx.removeStorageSync('checkoutItems');
      this.setData({ submitting: false });
      const payHint = this.data.mockPay ? '模拟支付' : '微信支付';
      this.goOrderDetail(
        order.id,
        '订单已创建',
        `订单已提交，请在订单详情点击「${payHint}」完成付款。`
      );
    } catch (e) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showModal({
        title: '下单失败',
        content: (e && e.message) || '提交失败，请重试',
        showCancel: false,
      });
    }
  },

  async onSubmitAndPay() {
    if (this.data.submitting || !this.validateCheckout()) return;

    const { deliveryType, payAmount, mockPay, payLabel } = this.data;
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交订单' });

    try {
      await requestOrderSubscribe();
      const order = await this.createOrder();
      track('begin_checkout', { orderId: order.id, payAmount });
      wx.showLoading({ title: mockPay ? '模拟支付中' : '调起支付' });

      try {
        await payOrder(order.id);
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
          `${payMsg}\n\n订单已生成，请在订单详情点击「${payLabel}」完成付款。`
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

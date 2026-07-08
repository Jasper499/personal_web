const { request } = require('../../utils/request');
const { mockPayOrder } = require('../../utils/pay');
const app = getApp();

const STATUS_MAP = {
  pending: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消',
};

Page({
  data: {
    order: null,
    statusMap: STATUS_MAP,
    loading: true,
  },

  onLoad(options) {
    this.orderId = options.id;
  },

  onShow() {
    this.loadOrder();
  },

  async loadOrder() {
    if (!this.orderId) {
      this.setData({ loading: false, order: null });
      return;
    }
    this.setData({ loading: true });
    try {
      await app.ensureLogin();
      const order = await request(`/orders/${this.orderId}`);
      this.setData({ order, loading: false });
    } catch (e) {
      this.setData({ order: null, loading: false });
      wx.showToast({ title: (e && e.message) || '订单加载失败', icon: 'none' });
    }
  },

  async onPay() {
    if (!this.data.order || this.data.order.status !== 'pending') return;
    try {
      wx.showLoading({ title: '支付中' });
      await app.ensureLogin();
      const updated = await mockPayOrder(this.data.order.id);
      wx.hideLoading();
      wx.showModal({
        title: '支付成功',
        content: this.data.order.deliveryType === 'pickup'
          ? '支付完成，请查看取货码到店自提。'
          : '支付完成，商家将尽快处理订单。',
        showCancel: false,
      });
      this.setData({
        order: {
          ...this.data.order,
          ...updated,
          status: updated.status || 'paid',
        },
      });
      await this.loadOrder();
    } catch (err) {
      wx.hideLoading();
      wx.showModal({
        title: '支付失败',
        content: (err && err.message) || '请确认已重启 API 并重新编译小程序',
        showCancel: false,
      });
    }
  },

  async onCancel() {
    if (!this.data.order || this.data.order.status !== 'pending') return;
    try {
      await request(`/orders/${this.data.order.id}/cancel`, { method: 'POST' });
      wx.showToast({ title: '已取消', icon: 'success' });
      await this.loadOrder();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '取消失败', icon: 'none' });
    }
  },
});

const { request } = require('../../utils/request');
const { mockPayOrder } = require('../../utils/pay');

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
  },

  onLoad(options) {
    this.orderId = options.id;
  },

  onShow() {
    this.loadOrder();
  },

  async loadOrder() {
    try {
      const order = await request(`/orders/${this.orderId}`);
      this.setData({ order });
    } catch (e) {
      wx.showToast({ title: '订单加载失败', icon: 'none' });
    }
  },

  async onPay() {
    if (!this.data.order) return;
    try {
      wx.showLoading({ title: '支付中' });
      const updated = await mockPayOrder(this.data.order.id);
      wx.hideLoading();
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.setData({ order: { ...this.data.order, ...updated, status: updated.status || 'paid' } });
    } catch (err) {
      wx.hideLoading();
      wx.showModal({
        title: '支付失败',
        content: (err && err.message) || '请重新编译小程序后重试',
        showCancel: false,
      });
    }
  },

  async onCancel() {
    if (!this.data.order) return;
    try {
      await request(`/orders/${this.data.order.id}/cancel`, { method: 'POST' });
      wx.showToast({ title: '已取消', icon: 'success' });
      this.loadOrder();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '取消失败', icon: 'none' });
    }
  },
});

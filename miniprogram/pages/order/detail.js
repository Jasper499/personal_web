const { request } = require('../../utils/request');
const { payOrder, getPayConfig } = require('../../utils/pay');
const { resolveImageUrl } = require('../../utils/media');

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
    mockPay: true,
    payLabel: '模拟支付',
  },

  onLoad(options) {
    this.orderId = options.id;
    this.loadPayConfig();
  },

  onShow() {
    this.loadOrder();
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

  async loadOrder() {
    if (!this.orderId) {
      this.setData({ loading: false, order: null });
      return;
    }
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.ensureLogin();
      const order = await request(`/orders/${this.orderId}`);
      const items = (order.items || []).map((item) => ({
        ...item,
        coverImage: resolveImageUrl(item.coverImage),
      }));
      this.setData({ order: { ...order, items }, loading: false });
    } catch (e) {
      this.setData({ order: null, loading: false });
      wx.showToast({ title: (e && e.message) || '订单加载失败', icon: 'none' });
    }
  },

  async onPay() {
    if (!this.data.order || this.data.order.status !== 'pending') return;
    try {
      wx.showLoading({ title: '支付中' });
      const app = getApp();
      await app.ensureLogin();
      const updated = await payOrder(this.data.order.id);
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

  async onConfirmReceive() {
    if (!this.data.order || this.data.order.status !== 'shipped') return;
    try {
      await request(`/orders/${this.data.order.id}/confirm`, { method: 'POST' });
      wx.showToast({ title: '已确认收货', icon: 'success' });
      await this.loadOrder();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
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

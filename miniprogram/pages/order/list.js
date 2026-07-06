const { request } = require('../../utils/request');

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
];

const STATUS_MAP = {
  pending: '待付款',
  paid: '待发货',
  shipped: '待收货',
  completed: '已完成',
  cancelled: '已取消',
};

Page({
  data: {
    tabs: TABS,
    activeTab: '',
    orders: [],
    statusMap: STATUS_MAP,
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ activeTab: options.status });
    }
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    const path = this.data.activeTab
      ? `/orders?status=${this.data.activeTab}`
      : '/orders';
    const orders = await request(path);
    this.setData({ orders });
  },

  onTabTap(e) {
    this.setData({ activeTab: e.currentTarget.dataset.key });
    this.loadOrders();
  },

  onOrderTap(e) {
    wx.navigateTo({ url: `/pages/order/detail?id=${e.currentTarget.dataset.id}` });
  },

  async onPay(e) {
    const id = e.currentTarget.dataset.id;
    await request('/pay/mock-success', { method: 'POST', data: { orderId: id } });
    this.loadOrders();
  },

  async onCancel(e) {
    const id = e.currentTarget.dataset.id;
    await request(`/orders/${id}/cancel`, { method: 'POST' });
    this.loadOrders();
  },
});

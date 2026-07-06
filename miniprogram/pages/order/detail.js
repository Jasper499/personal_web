const { request } = require('../../utils/request');

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
    const order = await request(`/orders/${this.orderId}`);
    this.setData({ order });
  },
});

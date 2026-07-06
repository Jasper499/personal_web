const app = getApp();

Page({
  data: {
    userInfo: null,
    orderShortcuts: [
      { status: 'pending', label: '待付款', icon: '💳' },
      { status: 'paid', label: '待发货', icon: '📦' },
      { status: 'shipped', label: '待收货', icon: '🚚' },
      { status: 'completed', label: '已完成', icon: '✅' },
    ],
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo });
  },

  onOrderTap(e) {
    const status = e.currentTarget.dataset.status;
    wx.navigateTo({ url: `/pages/order/list?status=${status}` });
  },

  onAllOrders() {
    wx.navigateTo({ url: '/pages/order/list' });
  },

  onAddress() {
    wx.navigateTo({ url: '/pages/address/list' });
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/legal/privacy' });
  },

  onContact() {
    wx.showModal({
      title: '联系客服',
      content: '请添加微信：shop-service 或拨打 400-000-0000',
      showCancel: false,
    });
  },
});

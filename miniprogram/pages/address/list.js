const { request } = require('../../utils/request');

Page({
  data: {
    addresses: [],
    selectMode: false,
  },

  onLoad(options) {
    this.setData({ selectMode: options.select === '1' });
  },

  onShow() {
    this.loadAddresses();
  },

  async loadAddresses() {
    const addresses = await request('/addresses');
    this.setData({ addresses });
  },

  onSelect(e) {
    if (!this.data.selectMode) return;
    const address = this.data.addresses.find((a) => a.id === e.currentTarget.dataset.id);
    const pages = getCurrentPages();
    const checkout = pages.find((p) => p.route === 'pages/checkout/checkout');
    if (checkout) {
      checkout.setData({ selectedAddress: address });
    }
    wx.navigateBack();
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address/edit' });
  },

  onEdit(e) {
    wx.navigateTo({ url: `/pages/address/edit?id=${e.currentTarget.dataset.id}` });
  },

  async onDelete(e) {
    await request(`/addresses/${e.currentTarget.dataset.id}`, { method: 'DELETE' });
    this.loadAddresses();
  },
});

const { request } = require('../../utils/request');

Page({
  data: {
    addresses: [],
    selectMode: false,
    loading: true,
  },

  onLoad(options) {
    this.setData({ selectMode: options.select === '1' });
  },

  onShow() {
    this.loadAddresses();
  },

  async loadAddresses() {
    this.setData({ loading: true });
    try {
      const addresses = await request('/addresses');
      this.setData({ addresses, loading: false });
    } catch {
      this.setData({ addresses: [], loading: false });
    }
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

  async onSetDefault(e) {
    const id = e.currentTarget.dataset.id;
    await request(`/addresses/${id}/default`, { method: 'PATCH' });
    wx.showToast({ title: '已设为默认', icon: 'success' });
    this.loadAddresses();
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const res = await wx.showModal({
      title: '删除地址',
      content: '确定删除该收货地址吗？',
    });
    if (!res.confirm) return;
    await request(`/addresses/${id}`, { method: 'DELETE' });
    this.loadAddresses();
  },
});

const { request } = require('../../utils/request');
const { track } = require('../../utils/analytics');
const app = getApp();

Page({
  data: {
    list: [],
    totalAmount: 0,
    allSelected: true,
    selectedIds: [],
  },

  onShow() {
    this.loadCart();
    app.updateCartBadge();
  },

  async loadCart() {
    const data = await request('/cart');
    const selectedIds = data.list.filter((i) => i.available).map((i) => i.id);
    this.setData({
      list: data.list,
      totalAmount: data.totalAmount,
      selectedIds,
      allSelected: selectedIds.length === data.list.filter((i) => i.available).length,
    });
  },

  getSelectedItems() {
    const { list, selectedIds } = this.data;
    return list.filter((i) => selectedIds.includes(i.id) && i.available);
  },

  onToggleItem(e) {
    const id = e.currentTarget.dataset.id;
    let { selectedIds, list } = this.data;
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter((i) => i !== id);
    } else {
      selectedIds.push(id);
    }
    const available = list.filter((i) => i.available);
    const totalAmount = list
      .filter((i) => selectedIds.includes(i.id))
      .reduce((s, i) => s + i.price * i.quantity, 0);
    this.setData({
      selectedIds,
      totalAmount,
      allSelected: selectedIds.length === available.length,
    });
  },

  onToggleAll() {
    const { list, allSelected } = this.data;
    const available = list.filter((i) => i.available);
    const selectedIds = allSelected ? [] : available.map((i) => i.id);
    const totalAmount = allSelected
      ? 0
      : available.reduce((s, i) => s + i.price * i.quantity, 0);
    this.setData({ selectedIds, totalAmount, allSelected: !allSelected });
  },

  async onQtyChange(e) {
    const { id, type } = e.currentTarget.dataset;
    const item = this.data.list.find((i) => i.id === id);
    let quantity = item.quantity;
    if (type === 'minus' && quantity > 1) quantity--;
    if (type === 'plus') quantity++;
    await request(`/cart/${id}`, { method: 'PUT', data: { quantity } });
    this.loadCart();
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id;
    await request(`/cart/${id}`, { method: 'DELETE' });
    this.loadCart();
  },

  onCheckout() {
    const items = this.getSelectedItems();
    if (!items.length) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    wx.setStorageSync(
      'checkoutItems',
      items.map((i) => ({
        productId: i.productId,
        skuId: i.skuId,
        quantity: i.quantity,
      }))
    );
    track('begin_checkout', { from: 'cart' });
    wx.navigateTo({ url: '/pages/checkout/checkout?fromCart=1' });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});

const { request } = require('../../utils/request');
const { track } = require('../../utils/analytics');

const HISTORY_KEY = 'search_history';

Page({
  data: {
    keyword: '',
    history: [],
    products: [],
  },

  onShow() {
    this.setData({ history: wx.getStorageSync(HISTORY_KEY) || [] });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  async onSearch() {
    const { keyword } = this.data;
    if (!keyword.trim()) return;
    let history = this.data.history.filter((h) => h !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 10);
    wx.setStorageSync(HISTORY_KEY, history);
    this.setData({ history });
    track('search', { keyword });
    const data = await request(`/products?keyword=${encodeURIComponent(keyword)}`);
    this.setData({ products: data.list });
  },

  onHistoryTap(e) {
    this.setData({ keyword: e.currentTarget.dataset.word });
    this.onSearch();
  },

  onClearHistory() {
    wx.removeStorageSync(HISTORY_KEY);
    this.setData({ history: [] });
  },

  onProductTap(e) {
    wx.navigateTo({ url: `/pages/product/detail?id=${e.currentTarget.dataset.id}` });
  },
});

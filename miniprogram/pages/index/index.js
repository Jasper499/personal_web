const { request, resolveWorkingApiBase } = require('../../utils/request');
const { track } = require('../../utils/analytics');
const app = getApp();

Page({
  data: {
    banners: [],
    categories: [],
    products: [],
    keyword: '',
    loading: true,
    loadError: '',
    apiBase: '',
  },

  onShow() {
    this.setData({ apiBase: getApp().globalData.apiBase || '' });
    this.loadData();
    app.updateCartBadge();
  },

  async loadData() {
    this.setData({ loading: true, loadError: '', apiBase: getApp().globalData.apiBase || '' });
    try {
      await resolveWorkingApiBase(true);
      this.setData({ apiBase: getApp().globalData.apiBase || '' });
      const [banners, categories, productData] = await Promise.all([
        request('/banners'),
        request('/categories'),
        request('/products?sort=sales&pageSize=6'),
      ]);
      this.setData({
        banners,
        categories: categories.slice(0, 8),
        products: productData.list,
        loading: false,
        loadError: '',
      });
    } catch (e) {
      const msg = (e && e.message) || '数据加载失败';
      this.setData({
        loading: false,
        loadError: `${msg}\n\n当前 API: ${getApp().globalData.apiBase || '未设置'}\n请确认 npm run dev 已运行，然后点重试`,
      });
      console.error(e);
    }
  },

  onRetry() {
    this.loadData();
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.switchTab({ url: '/pages/category/category' });
    wx.setStorageSync('selectedCategoryId', id);
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id;
    track('product_view', { productId: id, from: 'home' });
    wx.navigateTo({ url: `/pages/product/detail?id=${id}` });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },
});

const { request } = require('../../utils/request');
const app = getApp();

Page({
  data: {
    categories: [],
    activeId: null,
    products: [],
    page: 1,
    hasMore: true,
  },

  onShow() {
    const selectedId = wx.getStorageSync('selectedCategoryId');
    if (selectedId) {
      wx.removeStorageSync('selectedCategoryId');
      this.setData({ activeId: selectedId });
    }
    this.loadCategories();
    app.updateCartBadge();
  },

  async loadCategories() {
    try {
      const categories = await request('/categories');
      const activeId = Number(this.data.activeId) || categories[0]?.id;
      this.setData({ categories, activeId });
      await this.loadProducts(true);
    } catch (e) {
      console.error(e);
    }
  },

  async loadProducts(reset = false) {
    if (!this.data.activeId) return;
    const page = reset ? 1 : this.data.page;
    try {
      const data = await request(
        `/products?categoryId=${this.data.activeId}&page=${page}&pageSize=10`
      );
      const products = reset ? data.list : [...this.data.products, ...data.list];
      this.setData({
        products,
        page: page + 1,
        hasMore: products.length < data.total,
      });
    } catch (e) {
      console.error(e);
      if (reset) {
        this.setData({ products: [], hasMore: false });
      }
    }
  },

  onCategoryTap(e) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({ activeId: id, page: 1 });
    this.loadProducts(true);
  },

  onProductTap(e) {
    wx.navigateTo({ url: `/pages/product/detail?id=${e.currentTarget.dataset.id}` });
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadProducts();
  },
});

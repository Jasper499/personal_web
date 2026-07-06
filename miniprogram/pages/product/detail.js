const { request } = require('../../utils/request');
const { track } = require('../../utils/analytics');
const app = getApp();

Page({
  data: {
    product: null,
    selectedSku: null,
    quantity: 1,
    showSku: false,
    action: '',
  },

  onLoad(options) {
    this.productId = options.id;
    this.loadProduct();
  },

  async loadProduct() {
    const product = await request(`/products/${this.productId}`);
    const selectedSku = product.skus?.length ? product.skus[0] : null;
    this.setData({ product, selectedSku });
    track('product_view', { productId: product.id });
  },

  get displayPrice() {
    const { product, selectedSku } = this.data;
    if (!product) return 0;
    return selectedSku ? selectedSku.price : product.price;
  },

  onSkuTap(e) {
    const sku = this.data.product.skus.find((s) => s.id === e.currentTarget.dataset.id);
    this.setData({ selectedSku: sku });
  },

  onAddCart() {
    this.setData({ showSku: true, action: 'cart' });
  },

  onBuyNow() {
    this.setData({ showSku: true, action: 'buy' });
  },

  async onConfirmSku() {
    const { product, selectedSku, quantity, action } = this.data;
    if (product.skus?.length && !selectedSku) {
      wx.showToast({ title: '请选择规格', icon: 'none' });
      return;
    }
    const payload = {
      productId: product.id,
      skuId: selectedSku?.id || null,
      quantity,
    };
    if (action === 'cart') {
      await request('/cart', { method: 'POST', data: payload });
      track('add_to_cart', payload);
      wx.showToast({ title: '已加入购物车' });
      app.updateCartBadge();
      this.setData({ showSku: false });
    } else {
      wx.setStorageSync('checkoutItems', [payload]);
      track('begin_checkout', { from: 'detail' });
      wx.navigateTo({ url: '/pages/checkout/checkout' });
    }
  },

  onCloseSku() {
    this.setData({ showSku: false });
  },

  onQtyChange(e) {
    const type = e.currentTarget.dataset.type;
    let { quantity } = this.data;
    if (type === 'minus' && quantity > 1) quantity--;
    if (type === 'plus') quantity++;
    this.setData({ quantity });
  },
});

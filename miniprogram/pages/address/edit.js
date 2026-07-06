const { request } = require('../../utils/request');

Page({
  data: {
    id: null,
    form: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: false,
    },
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: parseInt(options.id, 10) });
      this.loadAddress();
    }
  },

  async loadAddress() {
    const addresses = await request('/addresses');
    const form = addresses.find((a) => a.id === this.data.id);
    if (form) this.setData({ form });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onDefaultChange(e) {
    this.setData({ 'form.isDefault': e.detail.value });
  },

  async onSave() {
    const { id, form } = this.data;
    if (!form.name || !form.phone || !form.detail) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    if (id) {
      await request(`/addresses/${id}`, { method: 'PUT', data: form });
    } else {
      await request('/addresses', { method: 'POST', data: form });
    }
    wx.navigateBack();
  },
});

const { request } = require('../../utils/request');

const PHONE_RE = /^1\d{10}$/;

Page({
  data: {
    id: null,
    region: [],
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
    if (form) {
      this.setData({
        form,
        region: [form.province, form.city, form.district].filter(Boolean),
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onRegionChange(e) {
    const [province, city, district] = e.detail.value;
    this.setData({
      region: e.detail.value,
      'form.province': province,
      'form.city': city,
      'form.district': district,
    });
  },

  onDefaultChange(e) {
    this.setData({ 'form.isDefault': e.detail.value });
  },

  onImportWechat() {
    wx.chooseAddress({
      success: (res) => {
        this.setData({
          form: {
            ...this.data.form,
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            detail: res.detailInfo,
          },
          region: [res.provinceName, res.cityName, res.countyName],
        });
      },
      fail: () => {
        wx.showToast({ title: '未导入地址', icon: 'none' });
      },
    });
  },

  validateForm() {
    const { form } = this.data;
    if (!form.name?.trim()) {
      wx.showToast({ title: '请填写收货人', icon: 'none' });
      return false;
    }
    if (!PHONE_RE.test(form.phone || '')) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' });
      return false;
    }
    if (!form.province || !form.city || !form.district) {
      wx.showToast({ title: '请选择省市区', icon: 'none' });
      return false;
    }
    if (!form.detail?.trim()) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' });
      return false;
    }
    return true;
  },

  async onSave() {
    if (!this.validateForm()) return;
    const { id, form } = this.data;
    if (id) {
      await request(`/addresses/${id}`, { method: 'PUT', data: form });
    } else {
      await request('/addresses', { method: 'POST', data: form });
    }
    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  },
});

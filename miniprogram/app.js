const { request, getToken } = require('./request');
const { track } = require('./analytics');

const PRIVACY_KEY = 'privacy_agreed';

App({
  globalData: {
    userInfo: null,
    apiBase: 'http://localhost:3000/api',
  },

  onLaunch() {
    const agreed = wx.getStorageSync(PRIVACY_KEY);
    if (!agreed) {
      wx.reLaunch({ url: '/pages/legal/privacy' });
      return;
    }
    this.login();
  },

  async login() {
    try {
      const { code } = await wx.login();
      const data = await request('/auth/wx-login', { method: 'POST', data: { code } });
      wx.setStorageSync('token', data.token);
      this.globalData.userInfo = data.user;
      track('app_launch', { userId: data.user.id });
    } catch (e) {
      console.error('登录失败', e);
    }
  },

  updateCartBadge() {
    const token = getToken();
    if (!token) return;
    request('/cart')
      .then((data) => {
        const count = data.list?.filter((i) => i.available).length || 0;
        if (count > 0) {
          wx.setTabBarBadge({ index: 2, text: String(count) });
        } else {
          wx.removeTabBarBadge({ index: 2 });
        }
      })
      .catch(() => {});
  },
});

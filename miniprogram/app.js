const { request, getToken, checkHealth, getApiRoot, normalizeApiBase } = require('./utils/request');
const { track } = require('./utils/analytics');

let env;
try {
  env = require('./config/env');
} catch {
  env = require('./config/env.example');
}

const PRIVACY_KEY = 'privacy_agreed';

App({
  globalData: {
    userInfo: null,
    apiBase: normalizeApiBase(env.apiBase),
  },

  onLaunch() {
    console.log('[匠心小铺] apiBase =', this.globalData.apiBase);
    this.checkApiConnection();
    const agreed = wx.getStorageSync(PRIVACY_KEY);
    if (!agreed) {
      wx.reLaunch({ url: '/pages/legal/privacy' });
      return;
    }
    this.login();
  },

  async checkApiConnection() {
    try {
      await checkHealth();
    } catch (e) {
      const apiRoot = getApiRoot();
      wx.showModal({
        title: '后端未连接',
        content: `无法访问 ${apiRoot}\n\n请在项目根目录打开终端运行：\nnpm run dev\n\n启动后回到微信开发者工具点击「编译」刷新。`,
        showCancel: false,
        confirmText: '知道了',
      });
    }
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
    request('/cart', { silent: true })
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

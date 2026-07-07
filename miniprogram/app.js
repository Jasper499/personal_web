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
    apiBaseCandidates: (env.apiBaseCandidates || [env.apiBase]).map((base) => normalizeApiBase(base)),
  },

  async onLaunch() {
    console.log('[匠心小铺] apiBase =', this.globalData.apiBase);
    console.log('[匠心小铺] apiBaseCandidates =', this.globalData.apiBaseCandidates);
    await this.ensureApiConnection();
    const agreed = wx.getStorageSync(PRIVACY_KEY);
    if (!agreed) {
      wx.reLaunch({ url: '/pages/legal/privacy' });
      return;
    }
    this.login();
  },

  async ensureApiConnection() {
    const candidates = this.globalData.apiBaseCandidates || [this.globalData.apiBase];
    for (const candidate of candidates) {
      this.globalData.apiBase = normalizeApiBase(candidate);
      try {
        await checkHealth();
        wx.setStorageSync('last_working_api_base', this.globalData.apiBase);
        console.log('[匠心小铺] 已连接 API =', this.globalData.apiBase);
        return true;
      } catch (error) {
        console.warn('[匠心小铺] API 健康检查失败 =', this.globalData.apiBase, error);
      }
    }

    const apiRoot = getApiRoot();
    wx.showModal({
      title: '后端未连接',
      content:
        `无法访问 ${apiRoot}\n\n` +
        '请按以下顺序处理：\n' +
        '1. 在项目根目录运行 npm run dev\n' +
        '2. 重新执行 npm run miniprogram:setup\n' +
        '3. 若是手机预览，请确保手机与电脑在同一 Wi-Fi，或改用公网隧道\n' +
        '4. 回到微信开发者工具点击「编译」刷新',
      showCancel: false,
      confirmText: '知道了',
    });
    return false;
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
      wx.showToast({ title: '登录失败，请重新编译', icon: 'none' });
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

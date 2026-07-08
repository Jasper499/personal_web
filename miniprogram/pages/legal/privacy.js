Page({
  onAgree() {
    wx.setStorageSync('privacy_agreed', true);
    const app = getApp();
    app.login();
    wx.switchTab({ url: '/pages/index/index' });
  },

  onDisagree() {
    wx.showModal({
      title: '提示',
      content: '需同意隐私协议后方可使用小程序',
      showCancel: false,
    });
  },
});

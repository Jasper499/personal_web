const app = getApp();

function getToken() {
  return wx.getStorageSync('token') || '';
}

function request(path, options = {}) {
  const base = app.globalData.apiBase;
  const token = getToken();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success(res) {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.data.code === 40100) {
          app.login();
          reject(new Error(res.data.message));
        } else {
          wx.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          reject(new Error(res.data.message));
        }
      },
      fail: reject,
    });
  });
}

module.exports = { request, getToken };

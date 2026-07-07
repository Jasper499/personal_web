const app = getApp();

function getApiRoot() {
  const base = app.globalData.apiBase || '';
  return base.replace(/\/api\/?$/, '');
}

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
        if (!res.data || typeof res.data.code === 'undefined') {
          const msg = 'API 响应异常，请确认后端已启动（npm run dev）';
          if (!options.silent) wx.showToast({ title: msg, icon: 'none', duration: 3000 });
          reject(new Error(msg));
          return;
        }
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.data.code === 40100) {
          app.login();
          reject(new Error(res.data.message));
        } else {
          if (!options.silent) {
            wx.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          }
          reject(new Error(res.data.message));
        }
      },
      fail() {
        const msg = '无法连接服务器，请先运行 npm run dev';
        if (!options.silent) {
          wx.showToast({ title: msg, icon: 'none', duration: 3000 });
        }
        reject(new Error(msg));
      },
    });
  });
}

function checkHealth() {
  const root = getApiRoot();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${root}/health`,
      method: 'GET',
      success(res) {
        if (res.statusCode === 200 && res.data && res.data.status === 'ok') {
          resolve(true);
        } else {
          reject(new Error('API 健康检查失败'));
        }
      },
      fail(err) {
        reject(err || new Error('无法连接服务器'));
      },
    });
  });
}

module.exports = { request, getToken, checkHealth, getApiRoot };

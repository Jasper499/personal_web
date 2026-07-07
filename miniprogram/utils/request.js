const app = getApp();

const DEFAULT_API_BASE = 'http://localhost:3000/api';

function normalizeApiBase(base) {
  let normalized = (base || DEFAULT_API_BASE).trim().replace(/\/$/, '');
  if (!normalized.endsWith('/api')) {
    normalized = `${normalized}/api`;
  }
  return normalized;
}

function getApiRoot() {
  return normalizeApiBase(app.globalData.apiBase).replace(/\/api$/, '');
}

function buildUrl(path) {
  const base = normalizeApiBase(app.globalData.apiBase);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function request(path, options = {}) {
  const url = buildUrl(path);
  const token = getToken();
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success(res) {
        console.log(`[API] ${options.method || 'GET'} ${url} → ${res.statusCode}`);
        if (res.statusCode === 404) {
          const msg = `接口不存在(404): ${url}`;
          console.error(msg);
          if (!options.silent) {
            wx.showToast({
              title: 'API 地址错误，请运行 miniprogram:setup',
              icon: 'none',
              duration: 3000,
            });
          }
          reject(new Error(msg));
          return;
        }
        if (!res.data || typeof res.data.code === 'undefined') {
          const msg = `API 响应异常(${res.statusCode})，请确认后端已启动（npm run dev）`;
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
        console.error(`[API] ${options.method || 'GET'} ${url} → 连接失败`);
        const msg = `无法连接服务器: ${url}`;
        if (!options.silent) {
          wx.showToast({ title: '请先运行 npm run dev', icon: 'none', duration: 3000 });
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
          reject(new Error(`API 健康检查失败(${res.statusCode}): ${root}/health`));
        }
      },
      fail(err) {
        reject(err || new Error(`无法连接服务器: ${root}/health`));
      },
    });
  });
}

module.exports = {
  request,
  getToken,
  checkHealth,
  getApiRoot,
  normalizeApiBase,
  buildUrl,
};

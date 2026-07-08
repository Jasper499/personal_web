const app = getApp();

const DEFAULT_API_BASE = 'http://127.0.0.1:3000/api';
const DEV_FALLBACK_BASES = [
  'http://127.0.0.1:3000/api',
  'http://localhost:3000/api',
];
let resolvingApiBasePromise = null;

function isBadCachedBase(base) {
  return /trycloudflare\.com|loca\.lt/i.test(base || '');
}

function getDevFallbackBases() {
  return DEV_FALLBACK_BASES.map((base) => normalizeApiBase(base));
}

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

function getApiCandidates() {
  const globalCandidates = app.globalData.apiBaseCandidates || [];
  const lastWorking = wx.getStorageSync('last_working_api_base');
  const seen = new Set();
  const result = [];

  function add(base) {
    if (!base || isBadCachedBase(base)) return;
    const normalized = normalizeApiBase(base);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  }

  getDevFallbackBases().forEach(add);
  add(lastWorking);
  add(app.globalData.apiBase);
  globalCandidates.forEach(add);
  getDevFallbackBases().forEach(add);

  if (result.length === 0) {
    result.push(DEFAULT_API_BASE);
  }

  return result;
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function updateActiveApiBase(base) {
  const normalized = normalizeApiBase(base);
  app.globalData.apiBase = normalized;
  wx.setStorageSync('last_working_api_base', normalized);
}

function shouldFallback(error, res) {
  if (res && (res.statusCode === 404 || res.statusCode >= 500)) {
    return true;
  }
  return /连接失败|超时|request:fail|Failed/i.test(String(error && error.message ? error.message : error || ''));
}

function requestOnce(base, path, options = {}) {
  const urlBase = normalizeApiBase(base);
  const url = `${urlBase}${path.startsWith('/') ? path : `/${path}`}`;
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
          reject({ error: new Error(msg), response: res, urlBase });
          return;
        }
        if (!res.data || typeof res.data.code === 'undefined') {
          const msg = `API 响应异常(${res.statusCode})，请确认后端已启动（npm run dev）`;
          reject({ error: new Error(msg), response: res, urlBase });
          return;
        }
        if (res.data.code === 0) {
          updateActiveApiBase(urlBase);
          resolve(res.data.data);
        } else if (res.data.code === 40100) {
          app.login();
          reject({ error: new Error(res.data.message), response: res, urlBase });
        } else {
          reject({ error: new Error(res.data.message), response: res, urlBase });
        }
      },
      fail(err) {
        console.error(`[API] ${options.method || 'GET'} ${url} → 连接失败`);
        reject({ error: err || new Error(`无法连接服务器: ${url}`), urlBase });
      },
    });
  });
}

async function resolveWorkingApiBase(force = false) {
  if (!force && resolvingApiBasePromise) {
    return resolvingApiBasePromise;
  }

  resolvingApiBasePromise = (async () => {
    const candidates = getApiCandidates();
    for (const candidate of candidates) {
      const previous = app.globalData.apiBase;
      app.globalData.apiBase = candidate;
      try {
        await checkHealth();
        updateActiveApiBase(candidate);
        return candidate;
      } catch {
        app.globalData.apiBase = previous;
      }
    }
    throw new Error('没有可用的 API 地址');
  })();

  try {
    return await resolvingApiBasePromise;
  } finally {
    resolvingApiBasePromise = null;
  }
}

function request(path, options = {}) {
  const candidates = getApiCandidates();

  return (async () => {
    let lastError = null;

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        return await requestOnce(candidate, path, options);
      } catch (failure) {
        lastError = failure.error || failure;
        if (!shouldFallback(lastError, failure.response) || i === candidates.length - 1) {
          break;
        }
        try {
          await resolveWorkingApiBase(true);
        } catch {
          /* ignore and continue trying next candidate */
        }
      }
    }

    if (!options.silent) {
      const message = lastError && lastError.message ? lastError.message : '请求失败';
      wx.showToast({
        title: /404/.test(message) ? 'API 地址错误，请重新执行 miniprogram:setup' : '请检查后端或预览网络',
        icon: 'none',
        duration: 3000,
      });
    }
    throw lastError || new Error('请求失败');
  })();
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
  getApiCandidates,
  resolveWorkingApiBase,
};

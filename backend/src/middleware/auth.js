const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

function authUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return fail(res, 401, 40100, '未登录');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'user') {
      return fail(res, 401, 40100, '无效令牌');
    }
    req.userId = payload.userId;
    next();
  } catch {
    return fail(res, 401, 40100, '登录已过期');
  }
}

function authAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return fail(res, 401, 40100, '未登录');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'admin') {
      return fail(res, 403, 40300, '无权限');
    }
    req.adminId = payload.adminId;
    next();
  } catch {
    return fail(res, 401, 40100, '登录已过期');
  }
}

module.exports = { authUser, authAdmin };

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const { success, fail } = require('../utils/response');

const prisma = new PrismaClient();
const router = express.Router();

async function wxCode2Session(code) {
  if (process.env.MOCK_WX_LOGIN === 'true') {
    return { openid: `mock_${code || 'dev_user'}` };
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APPID}&secret=${process.env.WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) {
    throw new Error(data.errmsg || '微信登录失败');
  }
  return data;
}

router.post('/wx-login', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return fail(res, 400, 40001, '缺少 code');
    }
    const session = await wxCode2Session(code);
    let user = await prisma.user.findUnique({ where: { openid: session.openid } });
    if (!user) {
      user = await prisma.user.create({
        data: { openid: session.openid, nickname: '微信用户' },
      });
    }
    const token = jwt.sign({ userId: user.id, type: 'user' }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
    return success(res, {
      token,
      user: { id: user.id, nickname: user.nickname, avatar: user.avatar, phone: user.phone },
    });
  } catch (e) {
    return fail(res, 500, 50000, e.message);
  }
});

router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return fail(res, 400, 40001, '用户名和密码不能为空');
  }
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return fail(res, 401, 40100, '用户名或密码错误');
  }
  const token = jwt.sign({ adminId: admin.id, type: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  return success(res, { token, admin: { id: admin.id, name: admin.name, username: admin.username } });
});

module.exports = router;

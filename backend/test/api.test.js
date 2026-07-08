const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.MOCK_WX_LOGIN = 'true';
process.env.MOCK_PAY = 'true';

let app;
let prisma;
let userToken;
let server;

before(async () => {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  process.env.DATABASE_URL = 'file:./test.db';
  const { execSync } = require('child_process');
  execSync('npx prisma db push --force-reset', {
    cwd: require('path').join(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
  execSync('node prisma/seed.js', {
    cwd: require('path').join(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  const mod = require('../src/index');
  server = await new Promise((resolve) => {
    const s = mod.app.listen(0, () => resolve(s));
  });
  process.env.PORT = String(server.address().port);
  userToken = jwt.sign({ userId: 1, type: 'user' }, process.env.JWT_SECRET);
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (prisma) await prisma.$disconnect();
});

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://localhost:${process.env.PORT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

test('wx-login mock', async () => {
  const res1 = await request('POST', '/api/auth/wx-login', { code: 'code_a' });
  const res2 = await request('POST', '/api/auth/wx-login', { code: 'code_b' });
  assert.equal(res1.code, 0);
  assert.equal(res2.code, 0);
  assert.equal(res1.data.user.id, res2.data.user.id, '开发模式应复用同一用户');
});

test('get products', async () => {
  const res = await request('GET', '/api/products');
  assert.equal(res.code, 0);
  assert.ok(res.data.list.length > 0);
});

test('create order and mock pay', async () => {
  const user = await prisma.user.upsert({
    where: { openid: 'test_openid' },
    update: {},
    create: { openid: 'test_openid', nickname: '测试用户' },
  });
  const token = jwt.sign({ userId: user.id, type: 'user' }, process.env.JWT_SECRET);

  const orderRes = await request(
    'POST',
    '/api/orders',
    {
      items: [{ productId: 1, quantity: 1 }],
      deliveryType: 'pickup',
    },
    token
  );
  assert.equal(orderRes.code, 0);
  assert.equal(orderRes.data.status, 'pending');

  const payRes = await request('POST', '/api/pay/mock-success', { orderId: orderRes.data.id }, token);
  assert.equal(payRes.code, 0);
  assert.equal(payRes.data.status, 'paid');
});

test('admin login', async () => {
  const res = await request('POST', '/api/auth/admin-login', {
    username: 'admin',
    password: 'admin123',
  });
  assert.equal(res.code, 0);
  assert.ok(res.data.token);
});

test('pay config returns mock mode', async () => {
  const res = await request('GET', '/api/pay/config');
  assert.equal(res.code, 0);
  assert.equal(res.data.mockPay, true);
});

test('confirm receive', async () => {
  const user = await prisma.user.upsert({
    where: { openid: 'confirm_user' },
    update: {},
    create: { openid: 'confirm_user', nickname: '收货用户' },
  });
  const token = jwt.sign({ userId: user.id, type: 'user' }, process.env.JWT_SECRET);

  const order = await prisma.order.create({
    data: {
      orderNo: `TEST${Date.now()}`,
      userId: user.id,
      status: 'shipped',
      totalAmount: 68,
      freight: 0,
      payAmount: 68,
      deliveryType: 'express',
      items: {
        create: [{
          productId: 1,
          productName: '测试商品',
          price: 68,
          quantity: 1,
          coverImage: '/uploads/demo/product-1.png',
        }],
      },
    },
  });

  const res = await request('POST', `/api/orders/${order.id}/confirm`, null, token);
  assert.equal(res.code, 0);
  assert.equal(res.data.status, 'completed');
});

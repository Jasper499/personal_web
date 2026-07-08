require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const { router: catalogRoutes, adminRouter: catalogAdminRoutes } = require('./routes/catalog');
const cartRoutes = require('./routes/cart');
const addressRoutes = require('./routes/addresses');
const { router: orderRoutes, adminRouter: orderAdminRoutes } = require('./routes/orders');
const payRoutes = require('./routes/pay');
const payNotifyHandler = require('./routes/pay-notify');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.post('/api/pay/notify', express.raw({ type: '*/*' }), payNotifyHandler);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../../admin')));

app.get('/', (_req, res) => res.redirect('/admin/'));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pay', payRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', catalogAdminRoutes);
app.use('/api/admin/orders', orderAdminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ code: 50000, message: '服务器错误', data: null });
});

let server = null;

if (require.main === module) {
  const HOST = process.env.HOST || '0.0.0.0';
  server = app.listen(PORT, HOST, () => {
    console.log(`匠心小铺 API 运行于 http://localhost:${PORT}`);
    console.log(`管理后台: http://localhost:${PORT}/admin`);
    if (process.env.CURSOR_AGENT) {
      console.log('Cursor Cloud: 请在 Ports 面板确认 3000 已转发到本机');
    }
  });
}

module.exports = { app, server, PORT };

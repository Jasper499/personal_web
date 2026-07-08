const https = require('https');

const TEMPLATES = {
  paid: process.env.WX_TMPL_ORDER_PAID || '',
  shipped: process.env.WX_TMPL_ORDER_SHIPPED || '',
  pickup: process.env.WX_TMPL_ORDER_PICKUP || '',
};

function isEnabled() {
  return Boolean(process.env.WX_APPID && process.env.WX_SECRET && Object.values(TEMPLATES).some(Boolean));
}

function postJson(url, body, accessToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      `${url}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getAccessToken() {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  if (!appid || !secret) return null;

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const res = await new Promise((resolve, reject) => {
    https
      .get(url, (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
      })
      .on('error', reject);
  });
  return res.access_token || null;
}

async function sendSubscribeMessage({ openid, templateId, page, data }) {
  if (!templateId || !openid) return { skipped: true };
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.log('[order-notify] 未配置微信凭证，跳过订阅消息');
    return { skipped: true };
  }

  const result = await postJson(
    'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
    {
      touser: openid,
      template_id: templateId,
      page: page || 'pages/order/list',
      miniprogram_state: process.env.NODE_ENV === 'production' ? 'formal' : 'developer',
      lang: 'zh_CN',
      data,
    },
    accessToken
  );

  if (result.errcode && result.errcode !== 0) {
    console.warn('[order-notify] 发送失败:', result);
  }
  return result;
}

async function notifyOrderPaid(order, user) {
  if (!TEMPLATES.paid || !user?.openid) return;
  await sendSubscribeMessage({
    openid: user.openid,
    templateId: TEMPLATES.paid,
    page: `pages/order/detail?id=${order.id}`,
    data: {
      character_string1: { value: order.orderNo },
      amount2: { value: `￥${order.payAmount}` },
      phrase3: { value: '支付成功' },
    },
  });
}

async function notifyOrderShipped(order, user) {
  if (!TEMPLATES.shipped || !user?.openid) return;
  await sendSubscribeMessage({
    openid: user.openid,
    templateId: TEMPLATES.shipped,
    page: `pages/order/detail?id=${order.id}`,
    data: {
      character_string1: { value: order.orderNo },
      thing2: { value: order.expressCompany || '快递' },
      character_string3: { value: order.expressNo || '-' },
    },
  });
}

async function notifyPickupReady(order, user) {
  if (!TEMPLATES.pickup || !user?.openid) return;
  await sendSubscribeMessage({
    openid: user.openid,
    templateId: TEMPLATES.pickup,
    page: `pages/order/detail?id=${order.id}`,
    data: {
      character_string1: { value: order.orderNo },
      character_string2: { value: order.pickupCode || '-' },
      thing3: { value: '匠心小铺默认门店' },
    },
  });
}

module.exports = {
  isEnabled,
  notifyOrderPaid,
  notifyOrderShipped,
  notifyPickupReady,
  TEMPLATES,
};

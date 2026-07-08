const crypto = require('crypto');
const https = require('https');

function isMockPay() {
  if (process.env.MOCK_PAY === 'false') return false;
  if (process.env.MOCK_PAY === 'true') return true;
  return !process.env.WX_MCH_ID || !process.env.WX_PAY_KEY || !process.env.WX_APPID;
}

function md5Sign(params, key) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'sign')
    .sort();
  const str = `${sorted.map((k) => `${k}=${params[k]}`).join('&')}&key=${key}`;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase();
}

function buildXml(params) {
  const body = Object.entries(params)
    .map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`)
    .join('');
  return `<xml>${body}</xml>`;
}

function parseXml(xml) {
  const result = {};
  const re = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/g;
  let match;
  while ((match = re.exec(xml))) {
    const key = match[1] || match[3];
    result[key] = match[2] || match[4];
  }
  return result;
}

function postXml(url, xml) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'text/xml' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
    req.write(xml);
    req.end();
  });
}

async function createJsapiPrepay({ order, openid }) {
  const appid = process.env.WX_APPID;
  const mchId = process.env.WX_MCH_ID;
  const key = process.env.WX_PAY_KEY;
  const notifyUrl = process.env.WX_PAY_NOTIFY_URL;

  const params = {
    appid,
    mch_id: mchId,
    nonce_str: crypto.randomBytes(16).toString('hex'),
    body: '匠心小铺订单',
    out_trade_no: order.orderNo,
    total_fee: Math.round(order.payAmount * 100),
    spbill_create_ip: '127.0.0.1',
    notify_url: notifyUrl,
    trade_type: 'JSAPI',
    openid,
  };
  params.sign = md5Sign(params, key);

  const xml = await postXml('https://api.mch.weixin.qq.com/pay/unifiedorder', buildXml(params));
  const data = parseXml(xml);
  if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
    throw new Error(data.err_code_des || data.return_msg || '微信下单失败');
  }

  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const pkg = `prepay_id=${data.prepay_id}`;
  const payment = {
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'MD5',
  };
  payment.paySign = md5Sign(
    {
      appId: appid,
      timeStamp: payment.timeStamp,
      nonceStr: payment.nonceStr,
      package: payment.package,
      signType: payment.signType,
    },
    key
  );

  return { prepayId: data.prepay_id, payment };
}

function verifyNotifySign(data, key) {
  const sign = data.sign;
  return sign && sign === md5Sign(data, key);
}

module.exports = {
  isMockPay,
  createJsapiPrepay,
  verifyNotifySign,
  parseXml,
  md5Sign,
};

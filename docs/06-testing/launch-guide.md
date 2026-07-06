# 上线提交指南

本文档说明如何将匠心小铺小程序提交微信审核。代码与测试已就绪，以下步骤需你在本地完成。

## 提交前自检

运行自动化测试：

```bash
cd backend && npm test
```

对照 [test-plan.md](./test-plan.md) 完成手动测试。

## 上传代码

1. 打开微信开发者工具，导入 `miniprogram/` 目录
2. 填写真实 AppID（替换 `project.config.json` 中的 `touristappid`）
3. 将 `app.js` 中 `apiBase` 改为生产 HTTPS 地址
4. 取消勾选「不校验合法域名」
5. 点击「上传」，填写版本号与备注

## 提交审核

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 版本管理 → 开发版本 → 提交审核
3. 填写功能页面：
   - 首页：`pages/index/index`
   - 商品详情：`pages/product/detail`
   - 购物车：`pages/cart/cart`
   - 订单：`pages/order/list`
   - 个人中心：`pages/profile/profile`
4. 提供测试账号说明（若需要登录）
5. 等待审核（通常 1-7 个工作日）

## 发布

审核通过后，在版本管理点击「发布」即可全量上线。

## 生产环境配置

```env
MOCK_WX_LOGIN=false
WX_APPID=你的AppID
WX_SECRET=你的AppSecret
WX_MCH_ID=商户号
WX_PAY_KEY=APIv3密钥
DATABASE_URL=postgresql://...
JWT_SECRET=强随机字符串
```

## 回滚方案

保留上一版本开发包，若线上异常可在版本管理中回退。

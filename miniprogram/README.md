# 微信小程序 - 开发指南

## 一键自动配置（推荐）

在项目根目录执行：

```bash
npm run miniprogram:setup   # 自动写入 API 地址与开发配置
npm run miniprogram:open    # 自动打开微信开发者工具（需本地已安装）
```

`miniprogram:setup` 会：
- 读取 `.cursor/preview-url.txt` 中的公网隧道地址
- 生成 `config/env.js`（API 地址）
- 生成 `project.private.config.json`（关闭域名校验）

## 手动导入（若自动打开失败）

1. 打开微信开发者工具
2. **导入项目** → 选择本目录 `miniprogram/`
3. AppID 选 **测试号** 或 **游客模式**
4. **详情 → 本地设置** → 勾选「不校验合法域名、web-view、TLS 版本」

## 体验购物流程

1. 同意隐私协议
2. 首页浏览商品 → 加购 → 结算
3. 选择「到店自提」→ 提交订单（开发环境自动模拟支付）
4. 在管理后台「订单管理」中核销

## API 地址变更

隧道重启后 URL 会变，重新执行：

```bash
npm run preview:tunnel
npm run miniprogram:setup
```

然后在微信开发者工具中点击 **编译** 刷新。

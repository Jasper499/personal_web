# 匠心小铺 - 商铺小程序

从零到一落地的微信小程序电商 MVP，包含完整产品设计文档、后端 API、小程序前端与商家管理后台。

## 项目结构

```
├── docs/                 # 七阶段设计文档
│   ├── 01-business/      # 商业定位
│   ├── 02-product/       # PRD、信息架构、用户流程
│   ├── 03-design/        # 设计规范、页面原型
│   ├── 04-architecture/  # 技术选型、数据库、API
│   ├── 05-registration/  # 账号与支付申请指南
│   ├── 06-testing/       # 测试与上线清单
│   └── 07-operations/    # 运营与迭代规划
├── backend/              # Node.js + Express + Prisma API
├── miniprogram/          # 原生微信小程序
├── admin/                # 商家 Web 管理后台
└── scripts/              # 工具脚本
```

## 快速开始

### 一键启动（推荐）

在项目根目录执行：

```bash
npm run dev
```

脚本会自动：创建 `.env`、安装依赖、初始化数据库、在后台启动 API。  
访问 http://localhost:3000 将自动跳转到管理后台。

停止服务：`npm run stop`

### 手动启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

API 地址：`http://localhost:3000`  
管理后台：`http://localhost:3000/admin`（账号 `admin` / `admin123`）

### 2. 启动小程序

```bash
node scripts/generate-icons.js
```

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入 `miniprogram/` 目录
3. 开发阶段勾选「不校验合法域名」
4. 确认 `miniprogram/app.js` 中 `apiBase` 指向后端地址

### 3. 核心功能

- 微信登录（开发模式 mock）
- 首页 / 分类 / 商品详情 / 搜索
- 购物车 / 下单结算（自提 + 快递）
- 模拟支付 / 订单管理
- 收货地址 CRUD
- 商家后台：商品上下架、订单发货/自提核销
- 数据埋点上报

## 文档索引

| 文档 | 说明 |
|------|------|
| [商业定位](docs/01-business/business-plan.md) | 用户画像、竞品、MVP 范围 |
| [PRD](docs/02-product/prd.md) | 功能清单与验收标准 |
| [设计规范](docs/03-design/design-system.md) | 品牌色、组件规范 |
| [API 文档](docs/04-architecture/api.md) | 接口说明 |
| [账号申请指南](docs/05-registration/account-setup-guide.md) | 微信小程序与支付资质 |
| [测试清单](docs/06-testing/test-plan.md) | 功能/安全/上线检查 |
| [运营规划](docs/07-operations/iteration-plan.md) | 埋点、版本路线图 |

## 测试

```bash
cd backend && npm test
```

## 上线前

1. 注册企业/个体户小程序并申请微信支付（见 [账号指南](docs/05-registration/account-setup-guide.md)）
2. 将 `MOCK_WX_LOGIN` 设为 `false`，配置真实 `WX_APPID` / `WX_SECRET`
3. 对接真实微信支付，移除 mock 支付逻辑
4. 配置 HTTPS 域名与隐私协议

## 技术栈

- 小程序：原生微信小程序
- 后端：Express + Prisma + SQLite
- 管理后台：Vue 3 CDN 单页

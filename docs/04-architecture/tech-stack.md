# 技术选型说明

## 决策摘要

| 维度 | 选择 | 理由 |
|------|------|------|
| 小程序框架 | **原生微信小程序** | 计划仅服务微信生态，性能与官方能力支持最好 |
| 后端 | **Node.js + Express** | 与前端同属 JS 生态，上手快，适合 MVP |
| ORM | **Prisma** | 类型安全、迁移方便 |
| 数据库 | **SQLite（开发）/ PostgreSQL（生产）** | 本地零配置，生产可切换 |
| 鉴权 | **JWT + 微信 code2session** | 标准做法 |
| 文件存储 | 本地 uploads（开发）/ 腾讯云 COS（生产） | 渐进式 |
| 管理后台 | **静态 HTML + Vue3 CDN** | 轻量，无需构建 |

## 项目结构

```
shop-miniprogram/
├── docs/                    # 产品与架构文档
├── backend/                 # API 服务
│   ├── prisma/              # 数据模型与种子数据
│   ├── src/
│   │   ├── routes/          # 路由
│   │   ├── middleware/      # 鉴权等
│   │   └── services/        # 业务逻辑
│   └── package.json
├── miniprogram/             # 微信小程序
│   ├── pages/
│   ├── components/
│   ├── utils/
│   └── app.json
├── admin/                   # 商家 Web 管理后台
└── README.md
```

## 环境要求

- Node.js >= 18
- 微信开发者工具
- 微信小程序 AppID（开发可用测试号）

## 配置项

| 变量 | 说明 |
|------|------|
| `WX_APPID` | 小程序 AppID |
| `WX_SECRET` | 小程序 AppSecret |
| `JWT_SECRET` | JWT 签名密钥 |
| `WX_MCH_ID` | 微信支付商户号 |
| `WX_PAY_KEY` | 微信支付 API 密钥 |
| `DATABASE_URL` | 数据库连接串 |

## 部署方案

**开发**：`backend` 本地 3000 端口 + 微信开发者工具联调  
**生产**：云服务器 Docker 部署 API + 腾讯云数据库 + HTTPS 域名 + ICP 备案

# AGENTS.md

## 项目概述

匠心小铺 — 微信小程序电商 MVP。技术栈：原生微信小程序 + Express/Prisma 后端 + Vue 管理后台。

```
backend/      API 服务（端口 3000）
miniprogram/  微信小程序
admin/        商家 Web 管理后台（由 backend 静态托管）
docs/         产品与架构文档
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 API（Cloud 下走 tmux，本地走后台进程） |
| `npm run dev:foreground` | 前台启动 API（Cloud 环境 terminals 使用此命令） |
| `npm run stop` | 停止 API |
| `npm run setup` | 安装依赖并初始化数据库 |
| `npm test` | 运行后端 API 测试 |

## Cursor Cloud specific instructions

在 Cursor Cloud Agent 中开发时，请遵循以下约定：

### 启动与端口转发

1. **环境自动配置**：`.cursor/environment.json` 会在 Agent 启动时执行 `npm run setup`，并在 `shop-api` 终端中运行 API。
2. **API 地址**：服务监听 `0.0.0.0:3000`。
3. **浏览器访问**：Cloud VM 内的 localhost 不会自动映射到你本机。必须通过 Cursor **Ports 面板**（插头图标）转发端口 **3000**，再用面板链接打开。
4. **若 API 未运行**：执行 `HOST=0.0.0.0 PORT=3000 npm run dev:foreground`，或 `npm run dev`。
5. **不要重复启动**：检查 `shop-api` 终端或 `curl http://127.0.0.1:3000/health` 后再启动。

### 验证清单

完成任务后，Agent 应验证：

```bash
curl -s http://127.0.0.1:3000/health          # 期望 {"status":"ok"}
curl -sI http://127.0.0.1:3000/ | head -1     # 期望 302 跳转 /admin/
cd backend && npm test                         # 期望 4/4 通过
```

### 管理后台与测试账号

- 管理后台：http://localhost:3000/admin/
- 账号：`admin` / `admin123`

### 小程序联调

- 微信开发者工具导入 `miniprogram/` 目录
- `miniprogram/app.js` 中 `apiBase` 默认为 `http://localhost:3000/api`
- 开发阶段勾选「不校验合法域名」

### Git 分支

- 功能分支命名：`cursor/<描述>-383d`
- 基础分支：`main`

### 参考文档

- 架构：docs/04-architecture/
- API：docs/04-architecture/api.md
- 上线：docs/05-registration/account-setup-guide.md

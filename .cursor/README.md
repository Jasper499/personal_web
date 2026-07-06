# Cursor Cloud Agent 配置说明

本目录包含 Cursor Cloud Agent 的环境配置，提交到仓库后团队成员可自动复用。

## 文件说明

| 文件 | 作用 |
|------|------|
| `environment.json` | Cloud Agent 环境定义（install、ports、terminals、env） |
| `../AGENTS.md` | Agent 行为说明与 Cloud 专用指令 |
| `rules/cursor-cloud.mdc` | 始终生效的 Cloud 开发规则 |

## 首次启用（一次性）

1. 打开 [Cloud Agents 控制台](https://cursor.com/dashboard/cloud-agents#environments)
2. 选择本仓库，确认已读取 `.cursor/environment.json`
3. 启动一次 Agent，等待 `install` 完成、**shop-api** 终端出现
4. 在 Agent 面板点击 **插头图标**，确认端口 **3000** 已转发
5. （推荐）环境验证通过后，在控制台 **保存快照（Snapshot）**，加速后续启动

## 自动行为

Agent 启动时会：

1. 运行 `npm run setup`（安装依赖、初始化数据库、生成图标）
2. 在 `shop-api` 终端执行 `npm run dev:foreground`（API 监听 0.0.0.0:3000）
3. 声明端口 3000 供 Cursor 转发

## 验证

```bash
node scripts/verify-agent-env.js
```

## 故障排查

| 现象 | 处理 |
|------|------|
| 浏览器 ERR_CONNECTION_REFUSED | 打开 Ports 面板，手动转发 3000 |
| API 未启动 | 查看 `shop-api` 终端日志，或运行 `npm run dev` |
| 依赖缺失 | `npm run setup` |
| 端口占用 | `npm run stop` 后重启 |

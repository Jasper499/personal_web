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
| **Unable to forward localhost:3000** | 见下方专节 |
| API 未启动 | 查看 `shop-api` 终端日志，或运行 `npm run dev` |
| 依赖缺失 | `npm run setup` |
| 端口占用 | `npm run stop` 后重启 |

### 报错：Unable to forward localhost:3000

该错误表示 **Cursor 无法在你电脑上建立 3000 转发**，常见原因：

1. **3000 已被转发过（最常见）**  
   - 打开底部 **PORTS** 面板  
   - 找到已有的 `3000` 条目 → 右键 **Close / Stop Forwarding**  
   - 等 5 秒后再重新 Forward

2. **你本机 3000 已被占用**（本地另开了 React/Next 等）  
   - Mac 终端执行：`lsof -i :3000`，结束占用进程  
   - 或在 PORTS 里把远程 3000 映射到本地 **3002**（不要填 3000）

3. **多个 Agent 会话冲突**  
   - 只保留一个 Agent 标签页活跃  
   - `Cmd/Ctrl + Shift + P` → **Reload Window** 后重试

4. **仍无法转发 → 用公网预览（推荐）**  
   ```bash
   npm run preview:tunnel
   ```  
   打开 `.cursor/preview-url.txt` 中的 `https://xxx.loca.lt/admin/` 链接

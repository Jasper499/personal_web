# 微信小程序 - 开发指南

## 一键自动配置（推荐）

### 本机完整仓库（方案 B，Windows）

```bash
npm run setup:local
```

或双击 `scripts/setup-local-windows.bat`。详见 [docs/setup-local-windows.md](../docs/setup-local-windows.md)。

默认克隆到：`%USERPROFILE%\WeChatProjects\personal_web`，导入其中的 `miniprogram\` 目录。

### 仅配置当前仓库

```bash
npm run miniprogram:setup   # 自动写入 API 地址
npm run miniprogram:open    # 自动打开微信开发者工具
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

1. **先启动后端**（必须）：在项目根目录 `personal_web` 执行 `npm run dev`
2. 同意隐私协议
3. 首页浏览商品 → 加购 → 结算
4. 选择「到店自提」→ 提交订单（开发环境自动模拟支付）
5. 在管理后台「订单管理」中核销

## 首页空白 / 功能不全？

常见原因：

| 现象 | 原因 | 解决 |
|------|------|------|
| 只有 Tab 栏，无 Banner/商品 | 后端 API 未运行 | 在项目根目录执行 `npm run dev` |
| 提示「无法连接服务器」 | API 地址错误或隧道过期 | 重新 `npm run miniprogram:setup` 后编译 |
| 调试器显示 **404 Not Found** | `env.js` 指向云端地址或缺少 `/api` | 见下方「404 排错」 |

### 404 排错（调试器 Network 面板）

1. 打开 `miniprogram/config/env.js`，确认内容为：
   ```js
   apiBase: 'http://localhost:3000/api',
   ```
   注意末尾必须有 **`/api`**，不能写成 `http://localhost:3000`。
2. 在项目根目录执行：
   ```bash
   npm run dev
   set MINIPROGRAM_API_BASE=http://localhost:3000   # Windows CMD
   # 或 PowerShell: $env:MINIPROGRAM_API_BASE="http://localhost:3000"
   npm run miniprogram:setup
   ```
3. 微信开发者工具点击 **编译**，在 Network 中确认请求 URL 形如：
   `http://localhost:3000/api/banners`（不是 `/banners`）
| 页面简陋，与设计稿差距大 | 当前为 **MVP 线框版**，非最终高保真 UI | 见 `docs/03-design/` 设计文档 |

Windows 方案一安装后，请保持 **API 窗口** 运行，再在微信开发者工具点 **编译**。

## API 地址变更

隧道重启后 URL 会变，重新执行：

```bash
npm run preview:tunnel
npm run miniprogram:setup
```

然后在微信开发者工具中点击 **编译** 刷新。

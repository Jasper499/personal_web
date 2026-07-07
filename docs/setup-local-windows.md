# Windows 本机一键配置（方案 B）

将**完整 Git 仓库**克隆到本机，自动配置小程序并打开微信开发者工具。

## 一键运行（推荐）

### 方式 1：双击批处理

1. 从 GitHub 下载或克隆本项目到任意目录
2. 双击运行：

```
scripts\setup-local-windows.bat
```

### 方式 2：PowerShell

```powershell
cd 你的仓库目录
.\scripts\setup-local-windows.ps1
```

### 方式 3：npm 命令

```powershell
npm run setup:local
```

## 自动完成的操作

1. 克隆/更新仓库到 `%USERPROFILE%\WeChatProjects\personal_web`
2. 安装后端依赖、初始化数据库
3. 生成 `miniprogram/config/env.js`（API 地址）
4. 尝试用 CLI 打开微信开发者工具，导入 `personal_web\miniprogram`

## 指定目录

```powershell
node scripts/setup-local.js --dir D:\dev\personal_web
```

## 前置条件

- 已安装 [Node.js](https://nodejs.org/)（LTS）
- 已安装 [Git](https://git-scm.com/)
- 已安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信开发者工具：**设置 → 安全 → 开启服务端口**（用于自动打开）

## 与旧目录的区别

| 错误做法 | 正确做法 |
|----------|----------|
| `WeChatProjects\miniprogram`（仅复制文件夹） | `WeChatProjects\personal_web\miniprogram`（完整仓库内） |

旧目录没有 `.git`，会出现「没有找到 Git 仓库」提示，可删除。

## 启动 API

**本地 API**（推荐本机开发）：

```powershell
cd %USERPROFILE%\WeChatProjects\personal_web
npm run dev
```

**公网隧道**（Cloud Agent 已启动时）：

在云端运行 `npm run preview:tunnel`，然后在本机：

```powershell
npm run miniprogram:setup
```

## 微信开发者工具内

导入目录必须是：

```
C:\Users\你的用户名\WeChatProjects\personal_web\miniprogram
```

然后点击 **编译** 即可预览。

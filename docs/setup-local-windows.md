# Windows 本机一键配置（方案 B）

将**完整 Git 仓库**克隆到本机，自动配置小程序并打开微信开发者工具。

## 一键运行（推荐）

### 方式 1：ZIP 下载（GitHub 连不上时用）

若 `git clone` 报错 `Connection was reset`，**双击运行**：

```
scripts\setup-local-zip-windows.bat
```

或命令行：

```powershell
npm run setup:local:zip
```

无需安装 Git，自动从 GitHub / 镜像下载 ZIP 并解压。

### 方式 2：Git 克隆（网络正常时）

双击 `scripts\setup-local-windows.bat` 或：

```powershell
npm run setup:local
```

git 失败时会**自动改用 ZIP 下载**。

## 自动完成的操作

1. 克隆/更新仓库到 `%USERPROFILE%\WeChatProjects\personal_web`
2. 安装后端依赖、初始化数据库
3. 生成 `miniprogram/config/env.js`（API 地址）
4. 尝试用 CLI 打开微信开发者工具，导入 `personal_web\miniprogram`

## 指定目录

```powershell
node scripts/setup-local.js --dir D:\dev\personal_web
```

## 网络问题：git clone 失败

### 错误：`Recv failure: Connection was reset`

国内访问 GitHub 不稳定导致，**与项目无关**。

**解决办法（任选其一）：**

#### A. 一键 ZIP 安装（推荐）

在能访问本仓库的前提下，先下载 ZIP 启动脚本，或从 Cursor 云端复制 `scripts` 文件夹后执行：

```powershell
npm run setup:local:zip
```

或双击 `scripts\setup-local-zip-windows.bat`

#### B. 浏览器手动下载 ZIP

1. 打开（可尝试镜像）：
   - https://github.com/Jasper499/personal_web/archive/refs/heads/cursor/shop-miniprogram-mvp-383d.zip
   - 或 https://ghproxy.net/https://github.com/Jasper499/personal_web/archive/refs/heads/cursor/shop-miniprogram-mvp-383d.zip
2. 解压到 `C:\Users\你的用户名\WeChatProjects\personal_web`
   - 注意：解压后若多一层 `personal_web-cursor-shop-miniprogram-mvp-383d`，把**里面文件**移到 `personal_web` 文件夹
3. 在该目录打开 CMD，执行：
   ```powershell
   npm run setup
   npm run miniprogram:setup
   npm run miniprogram:open
   ```

#### C. 配置 Git 代理（有 VPN 时）

```powershell
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

端口改成你的代理端口，然后再 `git clone`。

取消代理：

```powershell
git config --global --unset http.proxy
git config --global --unset https.proxy
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

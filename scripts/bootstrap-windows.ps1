# 零依赖安装：复制整段到 PowerShell 运行（无需 git clone）
# 解决: fatal: unable to access ... Connection was reset

$ErrorActionPreference = "Stop"
$dest = "$env:USERPROFILE\WeChatProjects"
$target = "$dest\personal_web"
$zip = "$dest\repo.zip"
$urls = @(
  "https://ghproxy.net/https://github.com/Jasper499/personal_web/archive/refs/heads/cursor/shop-miniprogram-mvp-383d.zip",
  "https://github.com/Jasper499/personal_web/archive/refs/heads/cursor/shop-miniprogram-mvp-383d.zip"
)

New-Item -ItemType Directory -Force -Path $dest | Out-Null

$ok = $false
foreach ($url in $urls) {
  try {
    Write-Host "下载: $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 120
    $ok = $true
    break
  } catch {
    Write-Host "失败，尝试下一个源..."
  }
}
if (-not $ok) { throw "所有下载源均失败，请浏览器手动下载 ZIP" }

Write-Host "解压..."
Expand-Archive -Path $zip -DestinationPath $dest -Force
Remove-Item $zip -Force

$inner = Get-ChildItem $dest -Directory | Where-Object { $_.Name -like "personal_web*" } | Select-Object -First 1
if ($inner -and $inner.FullName -ne $target) {
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  Move-Item $inner.FullName $target -Force
}

Set-Location $target
Write-Host "安装依赖..."
npm run setup

# 本机开发强制使用 localhost，避免 ZIP 内云端隧道地址导致 404
$env:MINIPROGRAM_API_BASE = "http://localhost:3000"
npm run miniprogram:setup

Write-Host ""
Write-Host "正在新窗口启动 API 服务（请勿关闭该窗口）..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$target'; Write-Host '匠心小铺 API 服务'; npm run dev"

Write-Host "等待 API 启动..."
Start-Sleep -Seconds 8
$env:MINIPROGRAM_API_BASE = "http://localhost:3000"
npm run miniprogram:setup
npm run miniprogram:open

Write-Host ""
Write-Host "=========================================="
Write-Host "  安装完成!"
Write-Host "  项目目录: $target"
Write-Host "  小程序目录: $target\miniprogram"
Write-Host ""
Write-Host "  若首页空白，请确认："
Write-Host "  1. 另一个 PowerShell 窗口中 API 正在运行"
Write-Host "  2. 微信开发者工具 -> 详情 -> 不校验合法域名"
Write-Host "  3. 点击「编译」刷新小程序"
Write-Host "=========================================="

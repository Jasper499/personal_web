# 一键修复小程序 404（Windows PowerShell）
# 用法: 在项目根目录执行  npm run fix:miniprogram

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot | Split-Path -Parent
Set-Location $root

Write-Host ""
Write-Host "=========================================="
Write-Host "  匠心小铺 - 小程序一键修复"
Write-Host "=========================================="
Write-Host ""

Write-Host "[1/4] 检查 API..."
$healthOk = $false
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
  if ($r.StatusCode -eq 200) { $healthOk = $true }
} catch {}

if (-not $healthOk) {
  Write-Host "  API 未运行，正在新窗口启动..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; Write-Host '匠心小铺 API - 请勿关闭'; npm run dev"
  Write-Host "  等待 10 秒..."
  Start-Sleep -Seconds 10
}

Write-Host "[2/5] 修复演示商品数据..."
npm run db:reseed

Write-Host "[3/5] 写入本机 API 配置（优先 127.0.0.1）..."
$env:MINIPROGRAM_API_BASE = "http://127.0.0.1:3000"
npm run miniprogram:setup

Write-Host "[4/5] 运行诊断..."
npm run miniprogram:doctor
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "诊断未通过，请把上方输出发给开发者。"
  exit 1
}

Write-Host "[5/5] 完成"
Write-Host ""
Write-Host "接下来请在微信开发者工具中："
Write-Host "  1. 确认导入目录: $root\miniprogram"
Write-Host "  2. 详情 -> 本地设置 -> 勾选「不校验合法域名」"
Write-Host "  3. 点击「编译」"
Write-Host "  4. 若用手机预览，将自动优先尝试局域网 IP / 隧道地址"
Write-Host ""

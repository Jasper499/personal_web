# 匠心小铺 - Windows 本机一键配置（方案 B）
# 用法: 右键「使用 PowerShell 运行」，或在 PowerShell 中执行:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
#   .\scripts\setup-local-windows.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================"
Write-Host "  匠心小铺 微信小程序 本机一键配置"
Write-Host "========================================"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[错误] 未找到 Node.js，请安装: https://nodejs.org/" -ForegroundColor Red
  Read-Host "按回车退出"
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "[错误] 未找到 Git，请安装: https://git-scm.com/" -ForegroundColor Red
  Read-Host "按回车退出"
  exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

node scripts/setup-local.js @args

Read-Host "按回车退出"

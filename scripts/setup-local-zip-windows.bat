@echo off
chcp 65001 >nul
title 匠心小铺 - ZIP 下载安装（无需 Git，解决 GitHub 连接失败）

echo.
echo ========================================
echo   使用 ZIP 下载（无需 git clone）
echo   适用于: Connection was reset 等网络错误
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [错误] 请先安装 Node.js: https://nodejs.org/
  pause
  exit /b 1
)

cd /d "%~dp0.."
node scripts/setup-local.js --use-zip %*

echo.
pause

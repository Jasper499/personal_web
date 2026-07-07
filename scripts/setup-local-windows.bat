@echo off
chcp 65001 >nul
title 匠心小铺 - 本机一键配置（方案 B）

echo.
echo ========================================
echo   匠心小铺 微信小程序 本机一键配置
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装: https://nodejs.org/
  pause
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 Git，请先安装: https://git-scm.com/
  pause
  exit /b 1
)

cd /d "%~dp0.."
node scripts/setup-local.js %*

echo.
pause

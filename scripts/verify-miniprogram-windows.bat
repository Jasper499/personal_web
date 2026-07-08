@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo.
echo 正在检查各目录的小程序源码版本...
echo.
npm run miniprogram:verify
echo.
echo 请确认微信开发者工具导入的是上面提示的 miniprogram 目录。
echo 如果当前项目路径不对，请关闭项目后重新导入。
pause

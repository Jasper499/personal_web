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
npm run miniprogram:setup
npm run miniprogram:open

Write-Host ""
Write-Host "完成! 小程序目录: $target\miniprogram"
Write-Host "启动 API: cd $target; npm run dev"

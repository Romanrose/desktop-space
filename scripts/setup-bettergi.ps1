<#
.SYNOPSIS
  BetterGI 一键下载安装脚本
.DESCRIPTION
  从 GitHub Releases 自动下载 BetterGI 便携版并解压到 game/bettergi/。
  已安装时跳过，使用 -Force 可强制重新安装。
.EXAMPLE
  powershell -ExecutionPolicy Bypass .\scripts\setup-bettergi.ps1
#>

param(
  [string]$Version = "",
  [switch]$Force
)

$gameDir = Split-Path -Parent $PSScriptRoot
$targetDir = Join-Path $gameDir "bettergi"
$exePath = Join-Path $targetDir "BetterGI\BetterGI.exe"

Write-Host "[BetterGI] 目标目录: $targetDir"

if ((Test-Path $exePath) -and -not $Force) {
  Write-Host "[BetterGI] 已安装: $exePath"
  exit 0
}

# 确定版本（默认取 GitHub 最新 Release）
if (-not $Version) {
  try {
    $release = Invoke-RestMethod "https://api.github.com/repos/babalae/better-genshin-impact/releases/latest"
    $Version = $release.tag_name
  }
  catch {
    $Version = "0.62.0"
    Write-Host "[BetterGI] 获取最新版本失败，回退到 $Version"
  }
}
Write-Host "[BetterGI] 安装版本: $Version"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# 下载 7z 压缩包
$archive = Join-Path $targetDir "BetterGI_v$Version.7z"
if (-not (Test-Path $archive)) {
  $url = "https://github.com/babalae/better-genshin-impact/releases/download/$Version/BetterGI_v$Version.7z"
  Write-Host "[BetterGI] 下载: $url"
  Invoke-WebRequest -Uri $url -OutFile $archive -UseBasicParsing
  Write-Host "[BetterGI] 下载完成: $archive"
}
else {
  Write-Host "[BetterGI] 压缩包已存在，直接解压"
}

# 查找 7-Zip：系统安装 > 下载 7zr.exe 到临时目录
$sevenZip = $null
$system7zCandidates = @(
  "$env:ProgramFiles\7-Zip\7z.exe",
  "${env:ProgramFiles(x86)}\7-Zip\7z.exe",
  "$env:LOCALAPPDATA\Programs\7-Zip\7z.exe"
)
foreach ($candidate in $system7zCandidates) {
  if (Test-Path $candidate) {
    $sevenZip = $candidate
    break
  }
}

if (-not $sevenZip) {
  $portable7zr = Join-Path $env:TEMP "7zr.exe"
  if (-not (Test-Path $portable7zr)) {
    Write-Host "[BetterGI] 下载便携版 7-Zip..."
    Invoke-WebRequest -Uri "https://www.7-zip.org/a/7zr.exe" -OutFile $portable7zr -UseBasicParsing
  }
  $sevenZip = $portable7zr
}

Write-Host "[BetterGI] 解压中..."
& $sevenZip x $archive "-o$targetDir" -y | Out-Host

if (-not (Test-Path $exePath)) {
  Write-Error "[BetterGI] 解压后未找到 BetterGI.exe，安装失败"
  exit 1
}

Write-Host "[BetterGI] 安装完成: $exePath"
exit 0

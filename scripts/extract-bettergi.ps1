<#
.SYNOPSIS
  BetterGI 7z 解压辅助脚本
.DESCRIPTION
  解压 BetterGI 便携版压缩包到项目目录
#>

param(
  [string]$ArchivePath = "",
  [string]$TargetDir = ""
)

if (-not $ArchivePath) {
  $scriptDir = Split-Path -Parent $PSScriptRoot
  $ArchivePath = Join-Path $scriptDir "bettergi\BetterGI_v0.62.0.7z"
}
if (-not $TargetDir) {
  $scriptDir = Split-Path -Parent $PSScriptRoot
  $TargetDir = Join-Path $scriptDir "bettergi"
}

if (-not (Test-Path $ArchivePath)) {
  Write-Error "压缩包未找到: $ArchivePath"
  exit 1
}

if (Get-Command 7z -ErrorAction SilentlyContinue) {
  Write-Output "[Extract] 使用 7-Zip 解压..."
  7z x "$ArchivePath" -o"$TargetDir" -y | Out-Host
  if ($LASTEXITCODE -eq 0) {
    Write-Output "[Extract] 解压完成"
    exit 0
  } else {
    Write-Error "[Extract] 7-Zip 解压失败"
    exit 1
  }
}
else {
  Write-Output @"
[Extract] 未找到 7-Zip 或其它解压工具。
请手动解压:

  1. 下载 7-Zip: https://7-zip.org/download.html
  2. 解压以下文件到 $TargetDir:
     $ArchivePath
  3. 确保 $TargetDir\BetterGI.exe 存在

或者安装 7-Zip 后重新运行此脚本。
"@
  exit 1
}
